// The cards are in the HTML. JavaScript only hides cards when needed.
const productCategorySelect = document.querySelector('#categoryFilter');
const productCategoryCards = document.querySelectorAll('[data-category]');

if (productCategorySelect) {
  productCategorySelect.addEventListener('change', function () {
    let visibleProducts = 0;

    for (let i = 0; i < productCategoryCards.length; i++) {
      const category = productCategoryCards[i].getAttribute('data-category');
      const matches = this.value === 'all' || this.value === category;
      productCategoryCards[i].hidden = !matches;

      if (matches) {
        visibleProducts++;
      }
    }

    document.querySelector('#productCount').textContent = 'Showing ' + visibleProducts + ' products.';
  });

  const requestedCategory = new URLSearchParams(window.location.search).get('category');
  productCategorySelect.value = requestedCategory || 'all';

  if (productCategorySelect.value === '') {
    productCategorySelect.value = 'all';
  }

  productCategorySelect.dispatchEvent(new Event('change'));
}

// The chair page has twelve cards, split into two groups of six.
const chairCards = document.querySelectorAll('[data-product-page]');
const chairPageButtons = document.querySelectorAll('[data-chair-page]');

function showChairPage(pageNumber) {
  for (let i = 0; i < chairCards.length; i++) {
    chairCards[i].hidden = chairCards[i].getAttribute('data-product-page') !== pageNumber;
  }

  for (let i = 0; i < chairPageButtons.length; i++) {
    if (chairPageButtons[i].getAttribute('data-chair-page') === pageNumber) {
      chairPageButtons[i].setAttribute('aria-current', 'page');
    } else {
      chairPageButtons[i].removeAttribute('aria-current');
    }
  }

  document.querySelector('#pageSummary').textContent = 'Page ' + pageNumber + ' of 2. Showing 6 products.';
}

for (let i = 0; i < chairPageButtons.length; i++) {
  chairPageButtons[i].addEventListener('click', function () {
    showChairPage(this.getAttribute('data-chair-page'));
  });
}

if (chairCards.length > 0) {
  showChairPage('1');
}
