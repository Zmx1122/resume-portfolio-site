# 内容模型（content.js）

网站的全部内容都放在 `site/content.js` 这一个文件里，页面代码只负责展示。这样做有三个好处：换风格时内容不用动；用户要改一个数字，只改一处；内容可以单独检查、单独翻译。

结构以 [JSON Resume](https://jsonresume.org/schema) 为基础（它是简历数据的开放标准，以后可以用同一份数据生成 PDF 简历或套用社区主题），在它上面增加了故事、证据、文件、引用和多语言。

完整示例见 `assets/template/content.js`（同时也是模板自带的演示内容）。

## 目录

1. 文件格式
2. 通用规则
3. 多语言
4. 各版块字段
5. 写完后的自检
6. 和 JSON Resume 的对应关系

---

## 1. 文件格式

`content.js` 是一个普通的 JavaScript 文件，只做一件事：给 `window.SITE` 赋值。

```js
window.SITE = {
  meta: { ... },
  basics: { ... },
  work: [ ... ],
  // ...
};
```

用 `.js` 而不是 `.json`，是因为网页直接从本地文件打开（豆包预览、双击 `index.html`）时，浏览器不允许读取旁边的 `.json` 文件，而 `<script src="content.js">` 总能加载。另一个好处是可以写注释，方便用户自己看懂和修改。

## 2. 通用规则

- **日期**统一写成 `"YYYY-MM"`（需要精确到日时写 `"YYYY-MM-DD"`）。显示格式由页面按语言自动生成，例如德语显示 `04/2024`、中文显示 `2024 年 4 月`。还在进行中的经历，不写 `endDate`。
- **id** 用小写英文和连字符，例如 `"muster-dashboard"`。故事的 id 同时是网址的一部分（`#/de/story/muster-dashboard`），所以起一个看得懂的名字，起好之后不要改。
- **sources** 记录这一条内容的来源：`M` 开头是资料池里的材料，`I` 开头是采访回答，例如 `["M03", "I08"]`。每个经历、故事、证书、引用都要有 `sources`。它不会显示在网站上，但让你和用户随时能查"这句话是从哪来的"。
- **没有的信息就不写这个字段**，不要写空字符串、`"n/a"`、`"暂无"`。页面看到字段不存在，就不显示那一块。
- **不公开的信息不写进来。** `content.js` 本身就是网站的一部分，发布后任何人都能直接下载它。所以电话、成绩等用户不想公开的信息，**直接不写**，不要写进来再设成隐藏。文件用 `visibility` 控制（见第 4 节"文件"）。
- **引用其他条目用 id**：故事用 `parent` 指向它属于的经历或教育；经历用 `stories` 列出它的故事；证据用文件 id。不要在两个地方重复写同一段文字。

## 3. 多语言

网站最多支持三种语言，在 `meta` 里声明：

```js
meta: {
  languages: ["de", "en", "zh"],   // 第一个是默认语言
  ...
}
```

语言代码用标准代码：`de` 德语、`en` 英语、`zh` 简体中文、`zh-Hant` 繁体中文、`fr` 法语、`es` 西班牙语、`it` 意大利语、`nl` 荷兰语、`pl` 波兰语、`pt` 葡萄牙语、`tr` 土耳其语、`ja` 日语、`ko` 韩语、`ar` 阿拉伯语、`ru` 俄语、`uk` 乌克兰语等。阿拉伯语、希伯来语（`he`）、波斯语（`fa`）、乌尔都语（`ur`）是从右往左书写的，页面会自动切换方向。

### 怎么写需要翻译的字段

需要翻译的字段写成一个对象，每种语言一个键；**不需要翻译的字段**（人名、公司名、产品名、网址）直接写字符串：

```js
title: {
  de: "Ein Vertriebs-Dashboard, das drei Abteilungen nutzen",
  en: "A sales dashboard used by three departments",
  zh: "一个三个部门都在用的销售数据看板"
},
name: "Muster GmbH",
```

`meta.languages` 里的每种语言都必须有译文。页面遇到缺失的语言会退回默认语言，但这会让网站看起来没做完，所以自检时要查出来。

### 页面上的固定文字

导航、按钮、版块标题这些固定文字（"经历""联系我""下载简历"）由网页模板提供，模板内置了德语、英语、简体中文。选了其他语言时，在 `ui` 里补上这门语言的译文（键名见模板的 `ui` 默认值）：

```js
ui: {
  fr: { nav_work: "Expériences", nav_contact: "Contact", download_cv: "Télécharger le CV" }
}
```

### 翻译规则

- **先用材料的原始语言把事实写准，再翻译。** 例如 Arbeitszeugnis 是德语的，就先写德语版。
- **专有名词不翻译**：公司、学校、产品、项目名保持原样。学校有官方英文名的，英文版可以用官方英文名。
- **职位名称以正式职位为准**：德语版用证明上的德语职位；英语版用公司官方的英文职位，没有的话保留德语原文，不要自己"升级"成更高级的头衔。
- **引用保留原文**：推荐信、工作证明里的引用，原文语言版本照录，其他语言版本放译文。
- **德语的语气**：对读者用 Sie（"Schreiben Sie mir gern"）；经历要点可以用简洁的名词句或完整句，全站保持一致。
- **用户不熟练的语言**：在 `meta.review` 里标出来，提醒用户发布前请母语者看一遍。

## 4. 各版块字段

下面列出每个版块的字段。标"译"的字段要写成多语言对象。

### meta：网站设置

| 字段 | 说明 |
|---|---|
| `languages` | 最多 3 种，第一个是默认语言 |
| `review` | 需要母语者检查的语言，例如 `["de"]` |
| `target` | 求职目标，例如 `{ role: 译, type: "Werkstudent", city: "München" }`，供首页定位和设计说明使用 |
| `style` | 选定的风格 id，对应 `references/styles/` 里的文件；要和 `index.html` 里引用的风格文件一致 |
| `layout` | `"compact"`（紧凑型单页）或 `"editorial"`（编辑型多页）；不写时按故事数量自动选，见 `information-architecture.md` 第 3 节 |
| `sections` | 紧凑型首页的版块顺序，可选的值：`"stories"`、`"experience"`、`"education"`（写了它，教育会从经历里单独拿出来成为一个版块）、`"publications"`、`"skills"`、`"documents"`、`"about"`。不写时用 `["stories", "experience", "publications", "skills", "documents", "about"]`；没有内容的版块自动不显示 |
| `updated` | 内容更新日期 |

### basics：基本信息

| 字段 | 说明 |
|---|---|
| `name` | 姓名，按用户希望的写法（例如 "Xiao Lin" 或 "Lin Xiao"） |
| `label` | 译。一句话身份，例如"数据分析方向硕士生" |
| `headline` | 译。首页定位语，一到两句，围绕核心叙事 |
| `image` | 头像路径，例如 `"assets/img/avatar.jpg"`；用户不放头像就不写 |
| `email`、`phone` | 对象 `{ value }`。只写用户同意公开的；电话通常不写 |
| `location` | `{ city, countryCode }`，例如 `{ city: "München", countryCode: "DE" }` |
| `profiles` | `[{ network: "LinkedIn", url }]`，GitHub、个人博客等同理 |
| `availability` | `{ type: "Werkstudent", from: "2027-04", hours: 译, note: 译 }`，首页快速信息用 |
| `cv` | 可下载的 PDF 简历，按语言给：`{ de: "assets/docs/cv-de.pdf", en: "..." }`。**不需要每种语言都有**：当前语言没有对应简历时，页面提供默认语言的版本。没有就不写 |

### work：工作经历（同 JSON Resume，增加几个字段）

| 字段 | 说明 |
|---|---|
| `id` | |
| `name`、`url` | 公司名、官网 |
| `position` | 译。正式职位 |
| `type` | 写这些固定值之一，页面会自动翻译成每种语言：`"Vollzeit"`、`"Teilzeit"`、`"Werkstudent"`、`"Praktikum"`、`"HiWi"`、`"Abschlussarbeit"`、`"Freelance"`、`"Ehrenamt"`。需要特别的写法（比如德语用阴性 Werkstudentin）时，写成多语言对象 `{ de: "Werkstudentin", en: "Working student", zh: "Werkstudent" }` |
| `location` | 城市，远程写 `"Remote"` |
| `startDate`、`endDate` | |
| `summary` | 译。一句话说明这段经历 |
| `highlights` | 每一项译。2–4 条要点，用于时间线和概览；详细内容放进故事 |
| `skills` | 技能 id 列表 |
| `stories` | 属于这段经历的故事 id |
| `evidence` | 证据文件 id，例如这家公司的工作证明 |
| `sources` | |

### education：教育

| 字段 | 说明 |
|---|---|
| `id`、`institution`、`url` | |
| `studyType` | 译。例如 "Master of Science" |
| `area` | 译。专业 |
| `startDate`、`endDate` | 还在读的不写 `endDate`，写 `expectedEnd` |
| `score` | `{ value: "1.7", scale: "DE" }`。只有用户同意公开成绩时才写 |
| `courses` | `[{ name: 译, grade, ects }]`，4–8 门相关课程 |
| `thesis` | `{ title: 译, grade, story: "故事 id" }` |
| `stories`、`evidence`、`sources` | |

### projects：项目（课程项目、个人项目、比赛）

字段同 JSON Resume（`name` 译、`description` 译、`startDate`、`endDate`、`url`），另加 `stories`、`skills`、`evidence`、`sources`。

### stories：故事（网站的核心）

故事是网站上最有分量的内容：一段经历、一个项目或一篇论文的完整讲述，对应一个故事详情页。数量通常 3–8 个，其中 1–4 个设为精选。精选宁缺毋滥：内容单薄的故事不要为了凑数设成精选。

**一个故事只挂在一个地方**：只在它所属的经历（或教育、项目）的 `stories` 里列一次。比赛故事如果已经由 `awards` 的 `story` 指向，就不要再列进教育的 `stories`，否则时间线上会出现两次。

| 字段 | 说明 |
|---|---|
| `id` | 同时用于网址 |
| `parent` | 所属的经历、教育或项目 id |
| `kind` | `"work"`、`"project"`、`"research"`、`"thesis"`、`"competition"`、`"volunteer"`、`"personal"` |
| `featured` | 是否放在首页精选 |
| `title` | 译。用结果或问题来起标题，不要只写职位名 |
| `standfirst` | 译。一句话导语，卡片上也显示 |
| `role` | 译。用户在这件事里的角色 |
| `period` | `{ start, end }`；只有一个日期的（比如一次比赛）写 `{ date: "2021-02" }` |
| `problem` | 译。背景和要解决的问题 |
| `actions` | 每一项译。用户亲手做了什么，2–5 条 |
| `outcome` | 译。结果 |
| `metrics` | `[{ value: "~10 h", label: 译, sources }]`，只放有来源的数字，卡片上最多显示 1–2 个 |
| `media` | `[{ src, type: "image" \| "pdf" \| "video" \| "link", alt: 译, caption: 译 }]`；每张图都要有说明文字 |
| `skills` | 技能 id |
| `evidence` | 文件 id |
| `quotes` | 引用 id |
| `sources` | |

### skills：技能

```js
{ id: "power-bi", name: "Power BI", category: "data" }
{ id: "modelling", name: { de: "Mathematische Modellierung", en: "Mathematical modelling", zh: "数学建模" }, category: "data" }
```

工具和编程语言的名字（Python、Power BI）直接写；需要翻译的技能写成多语言对象。

技能**不写等级**。页面会自动统计每项技能出现在哪些故事里，用故事来证明能力。没有挂在任何故事或经历上的技能，问用户在哪里用过；实在没有，就放在次要位置或不放。

`category` 只用于分组显示，按用户的领域起名，例如 `"data"`、`"engineering"`、`"design"`、`"business"`、`"tools"`。

### languages：语言能力

```js
{ language: 译, cefr: "C1", certificate: "doc-testdaf", use: 译 }
```

`use` 写实际使用场景，例如"工作语言""日常交流"，比等级本身更有说服力。母语写 `cefr: "native"`。

### certificates：证书

| 字段 | 说明 |
|---|---|
| `id`、`name`、`issuer` | |
| `date`、`expires` | |
| `level` | 等级或分数，例如 "TDN 4×4" |
| `verifyUrl` | 验证链接，有就放 |
| `document` | 对应的文件 id |
| `sources` | |

### awards：荣誉

| 字段 | 说明 |
|---|---|
| `id`、`title`（译）、`awarder`、`date` | |
| `level` | `"international"`、`"national"`、`"regional"`、`"university"` |
| `summary` | 译。名次和分量说明，例如"一等奖，全国 N 支队伍参赛" |
| `story`、`document`、`sources` | |

### publications：论文与发表

同 JSON Resume（`name`、`publisher`、`releaseDate`、`url`、`summary` 译），另加 `story`、`sources`。

### quotes：引用（推荐语、工作证明摘录）

| 字段 | 说明 |
|---|---|
| `id` | |
| `text` | 译。原文语言版本照录原文，其他语言放译文 |
| `original` | 原文的语言代码，例如 `"de"` |
| `author` | 推荐人姓名；工作证明摘录写公司名 |
| `authorTitle` | 译。职位和关系，例如"硕士论文导师" |
| `document` | 来源文件 id |
| `consent` | `"yes"`、`"pending"`、`"no"`、`"not-needed"`。推荐信引用需要 `"yes"` 才显示；工作证明摘录一般是 `"not-needed"` |
| `sources` | |

### documents：文件（文件墙和证据）

| 字段 | 说明 |
|---|---|
| `id` | 例如 `"doc-zeugnis-muster"` |
| `material` | 资料池编号，例如 `"M03"` |
| `title` | 译 |
| `kind` | `"reference"`（工作证明）、`"recommendation"`、`"certificate"`、`"transcript"`、`"degree"`、`"award"`、`"work-sample"`、`"publication"` |
| `date` | |
| `visibility` | `"public"`、`"summary"`、`"on-request"`、`"private"`，含义见 `material-pool.md` 第 3 节 |
| `file` | 只有 `public` 才写，例如 `"assets/docs/testdaf.pdf"` |
| `thumbnail` | 缩略图，`public` 和 `on-request` 都可以有（`on-request` 的缩略图要模糊处理或用图标代替） |
| `summary` | 译。`summary` 和 `on-request` 的文件在卡片上显示这段话 |

`private` 的文件不出现在网站上；保留在 `content.js` 里，只是为了让证据关系完整。**`private` 和 `summary` 的原件不要复制进 `site/` 文件夹**，因为文件一旦上传到部署平台，知道路径的人就能下载。

### about：关于我

```js
about: {
  text: 译,              // 两三段：为什么选这个方向、为什么来德国、做事的方式
  interests: [译, 译],   // 兴趣爱好，可选
  sources: ["M04", "I15"]
}
```

### contact：联系

```js
contact: {
  cta: 译,          // 一句邀请，例如 "Ich freue mich auf Ihre Nachricht."
  showEmail: true
}
```

## 5. 写完后的自检

整理完 `content.js`，逐条检查，有问题就修好或者问用户。能运行 Node.js 时，`node scripts/check_content.js site/content.js` 会自动检查除第 3 条以外的全部项目，还会检查引用的图片和文件是否存在、网站文件夹里有没有多余的文件、风格设置是否一致；第 3 条要对照 `_work/facts.md` 人工看。

1. 每个需要翻译的字段都写成了多语言对象（不是普通字符串），`meta.languages` 里的每种语言都有内容。
2. 每个 `parent`、`stories`、`skills`、`evidence`、`document`、`quotes` 里的 id 都能找到对应条目。
3. 每个经历、故事、证书、引用都有 `sources`，而且这些来源在 `_work/facts.md` 里是"已确认"状态。
4. `metrics` 里的每个数字都有来源。
5. 精选故事 1–4 个，每个都有至少一张带说明的图，或者至少一份证据。
6. `consent` 不是 `"yes"` 的推荐信引用不会显示。
7. `visibility` 不是 `public` 的文件，`site/` 文件夹里没有它的原件；`site/assets/img/` 和 `site/assets/docs/` 里没有用不到的文件（比如模板的演示文件）。
9. 没有写进来再隐藏的信息（`show: false`），可以开始工作的日期不早于今天。
8. 没有空字符串、`"n/a"` 之类的占位内容。

## 6. 和 JSON Resume 的对应关系

`basics`、`work`、`education`、`projects`、`awards`、`certificates`、`publications`、`skills`、`languages` 和 JSON Resume 的同名版块对应，字段名尽量保持一致。导出成 JSON Resume 时：多语言字段取一种语言的文本；`stories` 合并进对应经历的 `highlights`；`quotes` 转成 `references`；`documents`、`meta`、`ui` 去掉。
