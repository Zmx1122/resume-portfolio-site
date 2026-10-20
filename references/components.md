# 页面组件与网页模板

`assets/template/` 是一个已经能运行的网站骨架。生成网站时**复制整个文件夹**到 `site/`，然后替换内容和图片，而不是从零写代码。原因：模板已经处理好了多语言、从右往左排版、手机适配、深色模式、图片放大、键盘操作、打印和 404，从零写很容易漏掉其中几样。

## 目录

1. 文件结构
2. 生成网站的步骤
3. 组件清单
4. 预览和比较风格
5. 常见修改怎么做
6. 不要做的事

---

## 1. 文件结构

```
site/
├── index.html            # 页面外壳：标题、描述、分享预览、选定的风格文件
├── content.js            # 全部内容（见 content-model.md）
└── assets/
    ├── app.js            # 渲染逻辑：路由、组件、多语言、图片放大
    ├── ui.js             # 固定文字（导航、按钮），内置德语、英语、中文
    ├── base.css          # 所有风格共用的版式
    ├── styles/           # 6 个风格皮肤，只用其中一个
    ├── favicon.svg       # 网站图标
    ├── img/              # 头像、故事配图、证书缩略图
    └── docs/             # 可下载的 PDF（简历、公开的证书等）
```

模板自带的 `content.js`、`assets/img/` 和 `assets/docs/` 里是虚构的演示内容（"小林"），生成时全部替换掉。

## 2. 生成网站的步骤

1. **只在 `site/` 还不存在时**，把 `assets/template/` 整个复制成 `我的简历网站/site/`。`site/` 已经存在就跳过这一步，否则会把用户的内容覆盖成演示内容。
2. 删掉 `site/assets/img/` 和 `site/assets/docs/` 里的演示文件。
3. 用整理好的内容覆盖 `site/content.js`。
4. 放入用户的图片和**可以公开**的文件。文件名只用英文小写字母、数字和连字符，和 `content.js` 里的路径一致。图片宽度压缩到 1600px 以内。
5. 修改 `site/index.html` 里标了注释的几处：
   - `<html lang="…">` 改成默认语言
   - `<title>`、`description`、`og:title`、`og:description` 填默认语言的内容（姓名 – 一句话身份；定位语）。网页打开后标题会自动换成 `content.js` 里的名字，这几处主要影响发链接时的预览
   - `id="style-css"` 那一行改成选定的风格文件，并和 `content.js` 里的 `meta.style` 保持一致
6. 网站图标会自动用姓名首字母生成，不用改。想用自己的图标时，替换 `assets/favicon.svg` 并在 `content.js` 的 `meta` 里写 `favicon: true`。
7. 运行 `node scripts/check_content.js site/content.js`，然后在浏览器里打开 `site/index.html` 检查（见第 4 节）。

## 3. 组件清单

下表说明每个组件显示什么、数据从哪来。改内容时改 `content.js`，不用改组件。

| 组件 | 出现在 | 显示的内容 | 数据来源 |
|---|---|---|---|
| 页头 | 每页 | 姓名、导航、语言切换、深色模式按钮 | `basics.name`、`meta.languages`；导航只列出有内容的页面 |
| 第一屏 | 首页 | 头像、姓名、身份、定位语、快速信息、按钮（联系、速览） | `basics` |
| 路线小地图 | 首页第一屏右侧（手机上在下方） | S 形路线和红色图钉，每站显示名称、地点、年份、身份 | `journey`（至少两站才显示） |
| 里程碑路径 | 首页第一屏下方 | 按时间排列的节点，可以点进对应故事 | `milestones` |
| 论文列表 | 发表版块 | 参照 Google Scholar：题目链接、作者（自己的名字加粗）、出处和日期，最后是奖项和作者身份标签、故事链接；不放封面截图 | `publications` |
| 故事页的论文列表 | 故事页 | 所有 `story` 指向这个故事的论文，格式同上 | `publications` |
| 故事卡片 | 首页、技能筛选页 | 配图、所属机构和类型、标题、导语、最多 2 个关键数字 | `stories` |
| 时间线 | 经历版块或经历页 | 时间、职位或学位、机构、要点、相关故事链接 | `work`、`education`、`awards` |
| 核心技能卡片 | 技能页、首页技能版块 | 3–4 个核心技能：开始年份和使用时长、使用年限条、用过的经历路径、一句话说明 | `skills[].core`、`summary` + 自动统计 |
| 技能 × 经历矩阵 | 技能页 | 每行一项技能，每列一段经历，圆点链接到故事；最后一列是使用年限条和时长。手机上隐藏经历列，经历写在技能名下面 | 经历和故事的 `skills` + 自动统计 |
| 技能标签 | 首页技能版块 | 按类别分组的技能标签，不显示数字 | `skills` |
| 技能筛选 | `#/<语言>/skills/<技能 id>` | 用到这项技能的故事和经历 | 自动统计 |
| 证书与文件 | 证书与文件版块或页面 | 语言能力、证书（验证链接）、荣誉、文件墙 | `languages`、`certificates`、`awards`、`documents` |
| 文件卡片 | 文件墙、故事页的"证据" | 缩略图、类型、日期、标题、状态（"可按需提供"或"摘录"） | `documents`；`private` 不显示，`on-request` 的缩略图自动模糊 |
| 文件详情弹窗 | 点击非公开文件 | 摘要、相关引用、"发邮件索取"按钮 | `documents.summary`、`quotes` |
| 图片放大 | 点击故事配图或公开的图片文件 | 大图、说明、上一张/下一张；Esc 关闭，方向键切换 | `media`、`documents.file` |
| 故事页 | `#/<语言>/story/<id>` | 结构见 `information-architecture.md` 第 6 节 | `stories` 及其引用的条目 |
| 引用 | 故事页、关于我 | 引用文字、作者、身份 | `quotes`；只显示 `consent` 为 `yes` 或 `not-needed` 的 |
| 关于我 | 关于我版块或页面 | 文字、兴趣、推荐语 | `about`、`quotes` |
| 联系 | 首页底部 | 邀请语、邮箱、电话（如果公开）、个人主页链接 | `contact`、`basics` |
| 速览 | `#/<语言>/cv` | 一页纸简历，带"下载简历 PDF"（如果有 `basics.cv`）和"打印 / 存为 PDF"按钮。这是唯一提供简历下载的地方 | 自动从各版块汇总 |
| 404 | 网址写错时 | 提示和回首页的按钮 | — |

布局（紧凑型或编辑型）和首页版块顺序由 `meta.layout` 和 `meta.sections` 控制，见 `information-architecture.md`。

## 4. 预览和比较风格

- **直接双击 `site/index.html`** 就能在浏览器里打开，不需要服务器。很多 AI 工具的内置预览也是这样加载的。
- **比较风格**：给用户看风格时，在 `site/` 里生成预览文件，做法见 `styles/index.md`"怎么做小样"。自己检查时，也可以在网址后面加 `?style=风格名`（例如 `index.html?style=editorial`），但不要让用户去改网址。
- **比较布局**：加 `?layout=compact` 或 `?layout=editorial`。
- **看某种语言**：在网址末尾加 `#/en/`、`#/zh/` 等。
- **看手机效果**：浏览器开发者工具里切换到手机尺寸，或者直接在手机上打开部署后的链接。

## 5. 常见修改怎么做

| 用户说 | 改哪里 |
|---|---|
| 改一句话、一个数字、一张图 | `content.js` |
| 换风格 | `index.html` 里 `id="style-css"` 那一行 + `content.js` 的 `meta.style` |
| 换一个强调色或字体 | 在选定的风格文件开头改对应变量（`--accent`、`--font-head` 等）；浅色和深色两处都要改 |
| 版块顺序 | `content.js` 的 `meta.sections` |
| 单页还是多页 | `content.js` 的 `meta.layout` |
| 加一种模板没有内置的语言 | `content.js` 的 `ui` 里补这门语言的固定文字，键名照 `assets/ui.js` |
| 导航或按钮文字不满意 | `content.js` 的 `ui` 里覆盖对应的键，不要改 `ui.js` |
| 头像改成圆形或方形 | 风格文件里 `.avatar` 的 `border-radius` |
| 想要模板没有的新版块 | 先问清楚要放什么。大多数需求可以用现有组件表达（比如"志愿经历"用 `work` 加 `type: "Ehrenamt"`）。确实需要新组件时，在 `app.js` 里仿照现有版块添加，并在 `base.css` 里加样式 |

## 从"速览"页生成简历 PDF

用户的原始简历里有电话、住址等不公开信息时，可以把网站的"速览"页打印成 PDF，内容和网站一致。电脑上有 Chrome 时：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --virtual-time-budget=6000 --print-to-pdf=site/assets/docs/cv-en.pdf "file:///…/site/index.html#/en/cv"
```

（Windows 上 Chrome 通常在 `C:\Program Files\Google\Chrome\Application\chrome.exe`。）每种语言各生成一份，写进 `basics.cv`，然后运行检查脚本：它会读 PDF 里的文字，确认没有电话等信息。

## 6. 不要做的事

- **不要引用外部的字体、脚本或样式**（Google Fonts、CDN 上的库）。国内可能打不开，也会把访客信息发给第三方。需要特定字体时，把字体文件放进 `assets/fonts/`。
- **不要把内容写死在 `app.js` 或 `index.html` 里**（`<title>` 等分享预览标签除外）。内容只放在 `content.js`。
- **不要删掉 `lang`、`dir`、`alt`、`aria-*` 属性**，这些保证读屏软件和从右往左的语言正常工作。
- **不要把不公开的文件放进 `site/`**，哪怕网站上没有链接。部署后，知道路径的人就能直接下载。
