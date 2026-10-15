import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('artifacts/verification/', root);
const names = ['index', 'about', 'products', 'products-chairs', 'materials', 'materials-leathers', 'magazine', 'professionals', 'sustainability', 'contact'];
const routes = Object.fromEntries(names.map(name => [name, name === 'index' ? 'index.html' : `pages/${name}.html`]));
const httpBase = process.env.TEST_BASE_URL || 'http://localhost:4174';
await mkdir(output, { recursive: true });

const report = {
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(root), encoding: 'utf8' }).trim(),
  workingTreeModified: !!execFileSync('git', ['status', '--porcelain'], { cwd: fileURLToPath(root), encoding: 'utf8' }).trim(),
  observedAt: new Date().toISOString(),
  environment: { node: process.version, primaryProtocol: 'file:', httpBase },
  checks: [],
  failures: [],
  browserErrors: [],
  failedLocalRequests: []
};
let browser;
let server;
let page;

function observe(pageToWatch) {
  pageToWatch.setDefaultTimeout(10000);
  pageToWatch.on('pageerror', error => report.browserErrors.push({ url: pageToWatch.url(), message: error.message }));
  pageToWatch.on('requestfailed', request => {
    if (request.url().startsWith(root.href) || request.url().startsWith(httpBase)) {
      report.failedLocalRequests.push({ url: request.url(), message: request.failure()?.errorText });
    }
  });
  pageToWatch.on('response', response => {
    if (response.url().startsWith(httpBase) && response.status() >= 400) {
      report.failedLocalRequests.push({ url: response.url(), status: response.status() });
    }
  });
}

async function check(name, action) {
  const errorsBefore = report.browserErrors.length;
  const requestsBefore = report.failedLocalRequests.length;
  try {
    await action();
    assert.deepEqual(report.browserErrors.slice(errorsBefore), [], 'Browser JavaScript errors');
    assert.deepEqual(report.failedLocalRequests.slice(requestsBefore), [], 'Failed local resources');
    report.checks.push({ name, result: 'pass' });
    console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, result: 'fail', message: error.message });
    report.failures.push(name);
    console.error('FAIL', name, error.message);
  }
}

async function open(name, query = '', targetPage = page) {
  await targetPage.goto(new URL(routes[name] + query, root).href);
}

async function checkMain(targetPage) {
  assert.equal(await targetPage.locator('main').count(), 1);
  assert.equal(await targetPage.locator('h1').count(), 1);
  assert.ok((await targetPage.locator('main').innerText()).trim().length > 100, 'Main content is missing');
  assert.ok(await targetPage.locator('main h2').count(), 'Main sections are missing');
}

async function checkImages(targetPage) {
  const broken = await targetPage.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(async image => {
      image.loading = 'eager';
      try { await image.decode(); } catch { /* Report all broken images together. */ }
    }));
    return images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src);
  });
  assert.deepEqual(broken, [], 'Broken images');
}

async function startHttpServer() {
  if (process.env.TEST_BASE_URL) return;
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: fileURLToPath(root),
    env: { ...process.env, PORT: '4174' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server did not start within 10 seconds')), 10000);
    server.stdout.on('data', data => {
      if (data.toString().includes('Local:')) { clearTimeout(timer); resolve(); }
    });
    server.stderr.on('data', data => { clearTimeout(timer); reject(new Error(data.toString())); });
    server.on('error', error => { clearTimeout(timer); reject(error); });
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Test server exited (${code})`)); });
  });
}

try {
  browser = await chromium.launch({ headless: true });
  report.environment.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page = await context.newPage();
  observe(page);

  await check('ten HTML pages use plain local scripts without modules or data requests', async () => {
    const scripts = new Set();
    for (const name of names) {
      const htmlUrl = new URL(routes[name], root);
      const html = await readFile(htmlUrl, 'utf8');
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        assert.ok(!/\btype\s*=\s*["']module["']/i.test(match[1]), `${routes[name]} loads a module`);
        assert.ok(!/\bfetch\s*\(/.test(match[2]), `${routes[name]} fetches runtime data`);
        const src = match[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
        if (src) {
          assert.ok(!/^(?:https?:|\/)/.test(src), `${routes[name]} has a non-relative script URL`);
          scripts.add(new URL(src, htmlUrl).href);
        }
      }
    }
    for (const script of scripts) {
      const source = await readFile(new URL(script), 'utf8');
      assert.ok(!/\b(?:fetch\s*\(|import\s*(?:\(|[{'"*])|import\.meta|export\s+)/.test(source), `${script} uses modules or a data request`);
    }
  });

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const name of names) {
      await check(`${name} renders directly from file at ${width}px`, async () => {
        await open(name);
        await checkMain(page);
        await checkImages(page);
        const layout = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
        assert.ok(layout.content <= layout.width, `Horizontal overflow: ${layout.content} > ${layout.width}`);
        const links = page.locator('.primary-nav a');
        assert.equal(await links.count(), 8);
        for (const link of await links.all()) assert.equal(await link.isVisible(), true, 'Navigation must stay visible');
        await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), fullPage: true });
      });
    }
  }

  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await staticContext.newPage();
  observe(staticPage);
  for (const name of names) {
    await check(`${name} has static main content with JavaScript disabled`, async () => {
      await open(name, '', staticPage);
      await checkMain(staticPage);
      assert.ok(await staticPage.locator('main img:visible').count(), 'Static content has no visible image');
      assert.equal(await staticPage.locator('.primary-nav a:visible').count(), 8);
    });
  }
  await staticContext.close();
  await page.setViewportSize({ width: 1440, height: 900 });

  await check('manual slideshow supports previous, next and wraparound', async () => {
    await open('index');
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Ayabi Chair');
    const firstImage = await page.locator('#bannerImage').getAttribute('src');
    await page.locator('#previousSlide').click();
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Molamisa Sofa');
    assert.equal(await page.locator('#slideNumber').innerText(), '3 / 3');
    assert.notEqual(await page.locator('#bannerImage').getAttribute('src'), firstImage);
    await page.locator('#nextSlide').click();
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Ayabi Chair');
    await page.locator('#nextSlide').click();
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Amorin Table');
    await page.locator('#nextSlide').click();
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Molamisa Sofa');
    await page.locator('#nextSlide').click();
    assert.equal(await page.locator('#bannerTitle').innerText(), 'Ayabi Chair');
    await checkImages(page);
  });

  await check('newsletter validates email and completes locally', async () => {
    await open('index');
    const requests = [];
    const listener = request => {
      if (request.isNavigationRequest() || request.method() !== 'GET' || ['fetch', 'xhr'].includes(request.resourceType())) requests.push(request);
    };
    page.on('request', listener);
    try {
      const email = page.locator('#newsletterEmail');
      const submit = page.locator('#newsletterForm button[type="submit"]');
      const status = page.locator('#newsletterForm .form-status');
      await submit.click();
      assert.equal(await email.evaluate(input => input.validity.valueMissing), true);
      assert.equal(await status.innerText(), '');
      await email.fill('not-an-email');
      await submit.click();
      assert.equal(await email.evaluate(input => input.validity.typeMismatch), true);
      assert.equal(await status.innerText(), '');
      await email.fill('visitor@example.com');
      await submit.click();
      assert.match(await status.innerText(), /No subscription was sent.*not saved/);
      assert.equal(await email.inputValue(), '');
      assert.deepEqual(requests.map(request => request.url()), [], 'The form made a network request');
    } finally { page.off('request', listener); }
  });

  await check('product category filter and linked table category work', async () => {
    await open('products');
    assert.equal(await page.locator('.product-card:visible').count(), 12);
    await page.locator('#categoryFilter').selectOption('tables');
    assert.equal(await page.locator('.product-card:visible').count(), 2);
    assert.deepEqual(await page.locator('.product-card:visible h3').allInnerTexts(), ['Amorin Table', 'Suti Table']);
    assert.match(await page.locator('#productCount').innerText(), /2 products/);
    await page.locator('#categoryFilter').selectOption('all');
    assert.equal(await page.locator('.product-card:visible').count(), 12);
    await open('products', '?category=tables');
    assert.equal(await page.locator('#categoryFilter').inputValue(), 'tables');
    assert.equal(await page.locator('.product-card:visible').count(), 2);
  });

  await check('chair pagination switches between two distinct groups of six', async () => {
    await open('products-chairs');
    const visibleTitles = () => page.locator('.product-card:visible h3').allInnerTexts();
    const first = await visibleTitles();
    assert.equal(first.length, 6);
    assert.equal(new Set(first).size, 6);
    assert.equal(await page.locator('[data-chair-page="1"]').getAttribute('aria-current'), 'page');
    await page.locator('[data-chair-page="2"]').click();
    const second = await visibleTitles();
    assert.equal(second.length, 6);
    assert.equal(new Set([...first, ...second]).size, 12, 'Pages contain repeated products');
    assert.match(await page.locator('#pageSummary').innerText(), /Page 2 of 2/);
    assert.equal(await page.locator('[data-chair-page="2"]').getAttribute('aria-current'), 'page');
    await page.locator('[data-chair-page="1"]').click();
    assert.deepEqual(await visibleTitles(), first);
  });

  await check('native material FAQ opens and closes', async () => {
    await open('materials');
    const detail = page.locator('details').first();
    assert.equal(await detail.evaluate(element => element.open), false);
    await detail.locator('summary').click();
    assert.equal(await detail.evaluate(element => element.open), true);
    assert.equal(await detail.locator('p').first().isVisible(), true);
    await detail.locator('summary').click();
    assert.equal(await detail.evaluate(element => element.open), false);
  });

  await check('leather swatch changes the image, caption and selected color', async () => {
    await open('materials-leathers');
    const before = await page.locator('#leatherPreview').getAttribute('src');
    await page.locator('[data-swatch="1217 atlantic"]').click();
    assert.notEqual(await page.locator('#leatherPreview').getAttribute('src'), before);
    assert.equal(await page.locator('#selectedColor').innerText(), '1217 atlantic');
    assert.equal(await page.locator('#colorCaption').innerText(), 'Elen: 1217 atlantic');
    assert.equal(await page.locator('#leatherTitle').innerText(), 'Elen: 1217 atlantic');
    assert.equal(await page.locator('[data-swatch][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('[data-swatch="1217 atlantic"]').getAttribute('aria-pressed'), 'true');
    await checkImages(page);
  });

  await check('magazine topics and incoming category links filter articles', async () => {
    await open('magazine');
    assert.equal(await page.locator('.article-card:visible').count(), 9);
    for (const topic of ['News', 'Stories', 'References']) {
      await page.locator(`[data-topic="${topic}"]`).click();
      assert.equal(await page.locator('.article-card:visible').count(), 3);
      assert.deepEqual(await page.locator('.article-card:visible .muted').allInnerTexts(), [topic, topic, topic]);
      assert.equal(await page.locator(`[data-topic="${topic}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#articleCount').innerText(), '3 articles');
    }
    await page.locator('[data-topic="All Topics"]').click();
    assert.equal(await page.locator('.article-card:visible').count(), 9);
    await open('magazine', '?category=References');
    assert.equal(await page.locator('.article-card:visible').count(), 3);
    assert.deepEqual(await page.locator('.article-card:visible .muted').allInnerTexts(), ['References', 'References', 'References']);
  });

  await check('showroom search finds London, handles no result and resets', async () => {
    await open('contact');
    await page.locator('#storeSearch').fill('London');
    assert.equal(await page.locator('.store-card:visible').count(), 1);
    assert.equal(await page.locator('.store-card:visible h3').innerText(), 'London');
    assert.match(await page.locator('#storeCount').innerText(), /^1 showrooms/);
    await page.locator('#storeSearch').fill('no such city 12345');
    assert.equal(await page.locator('.store-card:visible').count(), 0);
    assert.equal(await page.locator('#storeEmpty').isVisible(), true);
    await page.locator('#storeSearch').fill('');
    assert.equal(await page.locator('.store-card:visible').count(), 6);
    assert.equal(await page.locator('#storeEmpty').isVisible(), false);
  });

  await check('contact form uses native validation and a local demo result', async () => {
    await open('contact');
    const requests = [];
    const listener = request => {
      if (request.isNavigationRequest() || request.method() !== 'GET' || ['fetch', 'xhr'].includes(request.resourceType())) requests.push(request);
    };
    page.on('request', listener);
    try {
      const form = page.locator('#contactForm');
      const submit = form.locator('button[type="submit"]');
      const status = form.locator('.form-status');
      await submit.click();
      assert.equal(await page.locator('#contactName').evaluate(input => input.validity.valueMissing), true);
      assert.equal(await status.innerText(), '');
      await page.locator('#contactName').fill('Study visitor');
      await page.locator('#contactEmail').fill('not-an-email');
      await page.locator('#contactMessage').fill('A showroom enquiry for a learning exercise.');
      await form.locator('input[type="checkbox"]').check();
      await submit.click();
      assert.equal(await page.locator('#contactEmail').evaluate(input => input.validity.typeMismatch), true);
      assert.equal(await status.innerText(), '');
      await page.locator('#contactEmail').fill('visitor@example.com');
      await submit.click();
      assert.match(await status.innerText(), /message was not sent or saved/);
      assert.deepEqual(requests.map(request => request.url()), [], 'The form made a network request');
    } finally { page.off('request', listener); }
  });

  await check('HTTP root and shared navigation serve the static pages', async () => {
    await startHttpServer();
    const response = await page.goto(httpBase + '/');
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('h1').innerText(), 'Welcome to Walter Knoll');
    await page.locator('.primary-nav').getByRole('link', { name: 'Materials', exact: true }).click();
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/pages/materials.html');
    await page.locator('.site-footer').getByRole('link', { name: 'Chairs & Barstools', exact: true }).click();
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/pages/products-chairs.html');
    await page.locator('.logo').click();
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/index.html');
    await checkImages(page);
  });

  await check('professional guide downloads a nonempty local text file over HTTP', async () => {
    const response = await page.goto(httpBase + '/' + routes.professionals);
    assert.equal(response.status(), 200);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('a[download]').first().click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'project-guide.txt');
    assert.equal(await download.failure(), null);
    const downloadedPath = fileURLToPath(new URL('project-guide.txt', output));
    await download.saveAs(downloadedPath);
    const content = await readFile(downloadedPath, 'utf8');
    assert.ok(content.length > 100);
    assert.match(content, /WALTER KNOLL FRONTEND STUDY/);
  });
} catch (error) {
  report.checks.push({ name: 'test environment', result: 'fail', message: error.message });
  report.failures.push('test environment');
  console.error(error);
} finally {
  await browser?.close();
  server?.kill();
  await writeFile(new URL('results.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(`Results: ${report.checks.length - report.failures.length}/${report.checks.length} passed. Report: artifacts/verification/results.json`);
  if (report.failures.length) process.exitCode = 1;
}
