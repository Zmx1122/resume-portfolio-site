# 第三方声明 / Third-party notices

本项目的全部代码、文档、样式和演示素材都是原创编写的，**没有复制任何第三方项目的代码或文字**。下面列出在设计上参考或借鉴过的项目，以示致谢，并附上相关的许可证信息。

All code, documentation, styles and demo assets in this repository were written from scratch. **No third-party code or text is included.** The projects below influenced the design and are credited here.

---

## JSON Resume Schema

- 项目 / Project: <https://github.com/jsonresume/resume-schema>
- 许可证 / License: MIT
- 用途 / How it is used: `references/content-model.md` 和 `assets/template/content.js` 的内容结构以 JSON Resume 的版块和字段命名为基础（`basics`、`work`、`education`、`projects`、`awards`、`certificates`、`publications`、`skills`、`languages` 等），并在此之上扩展了故事、证据、文件、引用和多语言。本项目不包含 JSON Resume 的任何源文件。
  The content model follows JSON Resume's section and field names and extends them. No JSON Resume source files are included.

JSON Resume Schema 的许可证原文 / License text:

```
The MIT License (MIT)

Copyright (c) 2024 JSON Resume

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Anthropic Skills: frontend-design

- 项目 / Project: <https://github.com/anthropics/skills/tree/main/skills/frontend-design>
- 许可证 / License: Apache License 2.0
- 用途 / How it is used: `references/design-principles.md` 借鉴了它"先确定明确的审美方向，再写代码，避免千篇一律的通用设计"的思路，并针对求职网站重新编写。没有复制原文。
  The idea of committing to a deliberate aesthetic direction before writing code informed `references/design-principles.md`, which was written independently for job-seeker websites. No text was copied.

## 其他参考 / Other references

以下项目和网站只作为思路参考，本项目没有使用它们的代码、文字或素材：
These were used as references for ideas only; none of their code, text or assets are included.

- **ylkhayat.vercel.app**（Youssef Elkhayat 的个人网站 / personal site）：报纸编辑风格和"故事页 + 技能统计"的信息架构 / the editorial style and the story-page + skill-count information architecture. <https://ylkhayat.vercel.app>
- **portfolio-skill**：先写设计说明、内容集中在一个数据文件、每个事实都要有来源的原则 / design brief first, single content module, facts traceable to sources. <https://github.com/PRABHUSIDDARTH/portfolio-skill>
- **EdgeOne Pages、Netlify、Cloudflare Pages、GitHub Pages 官方文档**：`references/deploy.md` 的部署步骤 / deployment steps in `references/deploy.md`.

## 字体 / Fonts

模板只使用访客设备上的系统字体，不包含、也不从网络加载任何字体文件。
The template uses system font stacks only and bundles or loads no font files.
