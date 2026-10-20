# 个人简历网站 Skill（resume-portfolio-site）

把你已有的求职材料，变成一个**图文并茂、可交互、支持多语言**的个人简历网站，并发布成一个可以直接发给 HR 的链接。不需要会写代码，也不需要知道网站该写什么：AI 会先读你的材料，再像求职顾问一样采访你。

这是一个 **AI Skill**（技能包）：一个文件夹，里面是写给 AI 看的操作手册和一个网页模板。装进豆包电脑版（或其他支持 `SKILL.md` 的 AI 工具）后，跟 AI 说一句"帮我做一个个人简历网站"，它就会按这套流程带你做完。

> 作者：zmx1122 · 配套视频教程见小红书同名账号 @笨比本比

[English summary](#english-summary)

---

## 它能做什么

- **资料池**：一次性上传你的整套求职材料（Bewerbungsmappe）：
  - 不同版本的简历、LinkedIn 导出的 PDF
  - 求职信
  - Arbeitszeugnis / 实习证明、推荐信
  - 语言证书、成绩单、在读证明、获奖证书
  - 作品截图

  AI 会逐份读取、交叉比对，找出简历里没写的亮点、各份材料之间对不上的地方，以及缺证据的说法。
- **主动采访**：根据资料池的发现提问，每次最多 3 个问题。每个问题标注必填 / 推荐 / 可选，随时可以说"跳过""以后补""你帮我建议"。
- **会读德国工作证明**：解读 Arbeitszeugnis 里那套委婉评价语，从中挑出可以引用的评价。
- **只写有来源的事实**：网站上每一句话都能追溯到某份材料或某次回答，不编数字、不编经历。
- **专业的网站结构**：首页第一屏 30 秒讲清你是谁、找什么、何时能入职；每段重点经历都是一个图文故事页（背景 → 我做了什么 → 结果 → 证据）。技能由故事来证明，不用自评进度条。证书可以在线验证，敏感文件显示为"可按需提供"。
- **多语言**：最多三种，常用德语 + 英语 + 中文，也支持法语、西班牙语、日语、阿拉伯语等。阿拉伯语这类从右往左书写的语言会自动切换排版。
- **6 种风格可选**：瑞士极简、报纸编辑风、Bento 卡片、暗色科技、温暖作品集、学术简约。同一份内容随时换风格。
- **其他**：手机适配、深色模式、图片点击放大、一页纸速览（可以直接打印或存成 PDF）。
- **免费部署**：一步步带你发布到 EdgeOne Pages、Netlify、Cloudflare Pages 或 GitHub Pages。

## 开始前要准备什么

| | 内容 | 说明 |
|---|---|---|
| 必须 | 豆包电脑版（或其他支持 Skill 的 AI 工具） | 豆包需要在"工作任务"模式下使用技能 |
| 必须 | 一个部署平台账号 | 推荐 EdgeOne Pages 国际站，也可以用 Netlify、Cloudflare Pages。可以到最后一步再注册 |
| 可选 | 一个自己的域名 | 想让**国内**也能稳定打开时需要，每年几欧元到十几欧元 |
| 有就更好 | 简历（多个版本都可以） | PDF、Word、图片都行 |
| 有就更好 | LinkedIn 导出的 PDF | 在自己的主页点"更多 → 存为 PDF"。不要只给链接，AI 读不到 |
| 有就更好 | 求职信、Arbeitszeugnis / 实习证明、推荐信 | |
| 有就更好 | 证书、成绩单、在读证明、获奖证书 | |
| 有就更好 | 头像、项目照片或截图 | 截图记得先把公司内部数据遮住 |

材料不全也没关系，AI 会在采访里一点点问出来。

## 安装

### 豆包电脑版

1. 下载这个仓库：GitHub 页面右上角 **Code → Download ZIP**，解压。
2. 打开豆包电脑版，进入"工作任务"模式，在侧栏打开"技能"。
3. 选择"上传技能"，上传解压出来的整个文件夹（里面有 `SKILL.md` 的那一层）。
4. 新开一个对话，输入："帮我做一个个人简历网站"。

> 豆包的界面会更新，按钮名称可能略有不同。上传后没有被识别成技能的话，试试把 `SKILL.md` 改名为 `skill.md` 再上传。

### Claude Code 和其他支持 SKILL.md 的工具

把整个文件夹放进对应的技能目录，例如 Claude Code 的 `~/.claude/skills/resume-portfolio-site/`，然后在对话里说"帮我做一个个人简历网站"。

## 使用流程

```
开场清单 → 上传材料 → 资料池报告 → 采访（每次最多 3 问）→ 缺口报告
→ 内容确认 → 选布局和风格（看 3 个用你自己内容做的小样）→ 生成网站
→ 对话修改 → 自检 → 部署 → 拿到链接
```

每个阶段结束时，AI 会告诉你刚做了什么、接下来做什么。中途离开也没关系：AI 把进度记在项目文件夹的 `_work/` 里，下次可以接着做。

## 先看看效果

`assets/template/` 是网站模板，自带一个虚构人物"小林"的演示内容。用浏览器打开 `assets/template/index.html` 就能看到。

在网址后面加参数，可以切换风格和布局：

```
index.html?style=editorial
index.html?style=bento
index.html?style=terminal-dark
index.html?style=warm-portfolio
index.html?style=academic
index.html?layout=editorial
```

网址末尾加 `#/en/` 或 `#/zh/` 可以切换语言。

## 文件结构

```
resume-portfolio-site/
├── SKILL.md                     # 总流程（AI 首先读这个）
├── references/                  # AI 按需读取的详细规则
│   ├── material-pool.md         # 资料池：分类、资料卡、敏感度分级、交叉比对
│   ├── doc-types/               # 8 类材料的提取规则
│   ├── interview-guide.md       # 采访问题库和追问技巧
│   ├── content-model.md         # 网站内容的数据结构（基于 JSON Resume）
│   ├── information-architecture.md  # 页面、导航、网址规则
│   ├── design-principles.md     # 设计原则
│   ├── styles/                  # 6 种风格的说明
│   ├── components.md            # 模板组件和修改方法
│   └── deploy.md                # 部署指南
├── assets/template/             # 网页模板，生成网站时复制成 site/
└── scripts/check_content.js     # 内容检查脚本（需要 Node.js，可选）
```

## 隐私与免责

- 这个项目只是教程和工具，**免费开源**。
- 你上传给 AI 的个人信息（简历、证书、成绩单等）会被你使用的 AI 服务处理。上传什么、公开什么，**由你自己判断，你自己负责**。
- AI 会默认建议不公开敏感信息（出生日期、住址、证件号、学号、签证信息、签名等），也会提醒你检查公开的文件。但发布前请你自己再检查一遍网站内容。
- 引用推荐信里的评价之前，建议先征得推荐人同意。
- 公司内部的截图和数据，请确认可以公开后再使用。

## 已知限制

- **国内访问**：各平台的默认链接在国内都不稳定（`vercel.app` 基本打不开，EdgeOne Pages 的默认域名在中国大陆只能通过 3 小时有效的预览链接访问）。要让国内稳定打开，需要绑定自己的域名，详见 `references/deploy.md`。
- **AI 能力差异**：不同的 AI 工具（以及同一工具的不同版本）读取 PDF 和图片、读写本地文件、运行脚本、操作浏览器的能力不一样。做不到的步骤，AI 会改为让你手动完成，比如自己把文件夹拖到部署平台。
- **翻译**：AI 翻译的版本，最好请母语者看一遍，尤其是你自己不熟练的语言。
- **德国工作证明的解读**是业界惯例，不是法律规定，仅供参考。

## 参与改进

欢迎提 Issue 和 Pull Request，比如：新的风格、更多材料类型的提取规则（例如其他国家的工作证明）、更多语言的界面文字、对豆包以外工具的适配说明。

修改模板后，请至少用浏览器打开 `assets/template/index.html`，检查手机宽度、深色模式和每种语言。修改内容结构后，运行：

```bash
node scripts/check_content.js assets/template/content.js
```

## 致谢与许可证

本项目以 [MIT 许可证](LICENSE) 开源。内容结构参考了 [JSON Resume](https://jsonresume.org)，设计思路参考了 Anthropic 的 frontend-design skill，信息架构参考了 [ylkhayat.vercel.app](https://ylkhayat.vercel.app)。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

## English summary

**resume-portfolio-site** is an AI skill (a `SKILL.md` folder) that turns a job seeker's existing application materials into a multilingual, interactive personal resume website, then walks them through publishing it as a public link. It is designed for non-technical users, with a focus on international students in Germany, but works for anyone.

- **Material pool**: ingests multiple CV versions, cover letters, German employer references (Arbeitszeugnis, including decoding of their coded rating language), recommendation letters, certificates, transcripts, enrolment certificates, awards and work samples. It cross-checks them for hidden highlights, conflicts and unsupported claims.
- **Guided interview**: at most three questions per turn, each labelled required, recommended or optional. Users can always skip, defer, or ask for suggestions.
- **Evidence-based content**: every statement on the site traces back to a source document or an interview answer.
- **Static template**: a single `index.html` plus `content.js`, with no build step and no external CDN. It includes hash routing with the language in the URL, up to three languages with RTL support, six swappable styles, dark mode, a lightbox, document viewers with visibility levels, and a printable one-page CV.
- **Deployment guide** for EdgeOne Pages, Netlify, Cloudflare Pages and GitHub Pages, including notes on access from mainland China.

Install by uploading the folder as a skill in Doubao desktop (work-task mode), or by copying it into your agent's skills directory (for example `~/.claude/skills/`). Then ask: *"Help me build a personal resume website."* Licensed under MIT; see `THIRD_PARTY_NOTICES.md` for credits.
