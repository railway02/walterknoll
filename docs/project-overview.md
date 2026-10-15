# Walter Knoll 入门静态版项目说明

本项目是一套十页 HTML/CSS/JavaScript 练习，当前版本为 2.0.0。参考主题来自 Walter Knoll，页面语言为英文，说明文档为中文。

2026-10-15 按用户要求简化：从接近完整官网的复刻改为刚入门时容易读、容易改的静态网页。品牌和素材沿用旧版，代码以能直接看懂为目标。

## 页面与分工

| 成员代号 | 两个页面 | 主要修改入口 |
| --- | --- | --- |
| A | 首页、关于 | index.html、pages/about.html、js/pages/index.js |
| B | 产品、椅子 | pages/products.html、pages/products-chairs.html、js/pages/products.js |
| C | 材料、皮革 | pages/materials.html、pages/materials-leathers.html、js/pages/materials-leathers.js |
| D | 杂志、专业服务 | pages/magazine.html、pages/professionals.html、js/pages/magazine.js |
| E | 可持续、联系 | pages/sustainability.html、pages/contact.html、js/pages/contact.js |

每页都有 `css/pages/` 下的同名样式。这里的 A–E 是任务分工代号，不代表 Git 提交作者，实际作者和改动以提交记录为准。

## 怎样运行

直接双击 `index.html`，从导航打开其他页面即可。不需要安装依赖。图片、CSS 和 JavaScript 都使用相对路径；内容已经写在 HTML 中。

如需本地 HTTP，安装 Node.js 后在仓库目录运行：

```bash
npm run dev
```

然后访问 `http://localhost:4173`。这只是开发时的静态文件服务，不处理表单、不存储数据。

## 页面里做了什么

- 首页：三张图片通过 Previous/Next 手动切换；有产品、杂志、关于和门店入口，以及订阅表单练习。
- 关于：普通图片、历史列表、两个设计师卡片。
- 产品：12 张写在 HTML 中的产品卡片，一个 select 按类别隐藏/显示。支持首页的类别链接。
- 椅子：12 张卡片，点击 1/2 按钮切换，每页 6 款；无脚本时可读全部卡片。
- 材料：九类介绍，FAQ 使用浏览器自带的 details/summary。
- 皮革：15 个色卡按钮；点击后修改预览图、标题、色名。
- 杂志：九篇文章，按 All Topics/News/Stories/References 分类；文章详情链接去官网。
- 专业服务：八项列表，以及三份仓库内真实 TXT 学习资料下载。
- 可持续：纵向图文、普通文字及原官网来源入口。
- 联系：六家门店按输入文字筛选，联系表单通过 required/type=email 做基础检查。

联系和订阅表单用 `preventDefault()` 留在当前页面，显示本地练习结果，不发送邮件或创建订阅。

## 文件组织

| 位置 | 用途 |
| --- | --- |
| index.html、pages/ | 页面文字、图片、链接和卡片 |
| css/base.css | 字体、颜色、基础元素样式 |
| css/layout.css | 1000px 内容宽度、导航、页脚、三列/两列布局 |
| css/components.css | 卡片、按钮、输入框、FAQ 样式 |
| css/pages/ | 每页少量独立样式 |
| js/common.js | 标记当前导航、回到顶部 |
| js/pages/ | 对应页面的少量事件处理 |
| js/components/ | 公共导航和页脚的编辑源 |
| assets/images/ | 原有本地照片与材料纹理 |
| assets/data/catalog.json | 保留的旧资料索引，当前网页不读取 |
| assets/downloads/ | 可下载的学习资料 |
| scripts/ | 开发时使用的服务、同步、检查工具 |

不使用模块导入、fetch、动态卡片模板、收藏存储或弹窗系统。页面样式为展开的普通 CSS，交互用循环、条件和事件监听实现。

## 怎样修改

1. 找到要改的 HTML，直接改文字、图片路径和链接。
2. 全站样式改公共 CSS，某一页的细节改对应的页面 CSS。
3. 修改筛选、分页等行为时，阅读对应 js/pages 脚本。
4. 公共导航和页脚只改 js/components 里的两份片段，然后运行 `npm run sync:components`。该命令会写入十页，浏览时无需运行。
5. 检查页面和交互后再提交。

## 版本控制

原完整版本为 `81f3d46`，在 `backup/polished-20261015` 保留。入门版使用独立分支 `beginner-static-20261015`，以页面改动、验证、文档为单位提交。

比较两版：`git diff main...beginner-static-20261015`。查看原版文件时可以使用 `git show 81f3d46:index.html`。通过 PR 合并入门版，旧提交仍然可以恢复，不需要强制推送。

## 检查

先运行 `npm ci` 和 `npx playwright install chromium` 安装开发验证依赖，再运行 `npm run check`、`npm test`。这些步骤只服务于开发，普通浏览不需要。

实际执行记录见 [VERIFICATION.md](VERIFICATION.md)。测试截图在 artifacts/verification，首页示例在 docs/previews。Playwright 与检查脚本作为开发工具保留，不是网页运行时的一部分。

## 素材和边界

素材来源见 [references/README.md](references/README.md)。品牌、产品照片和纹理属于原权利人。文章、产品规格、门店最新地址通过官网链接查看；当前练习不是官方服务。没有在本轮发布网站。
