# 在读证明（Immatrikulationsbescheinigung / Studienbescheinigung / 在读证明）

在读证明本身不上网站，但它决定了网站上一条很实用的信息：**用户什么时候、以什么身份可以开始工作**。找 Werkstudent 或实习的 HR 首先看的就是这个。

## 识别

学校出具，写明学生姓名、学号或 Matrikelnummer、专业、学位类型、当前学期（Semester）、专业学期数（Fachsemester）、证明有效期（学期起止日期）。

## 提取

| 字段 | 说明 |
|---|---|
| 学校、专业、学位类型 | 和成绩单交叉核对 |
| 当前学期和有效期 | 例如 Wintersemester 2026/27，至 2027-03-31 |
| 专业学期数 | 只用于推算，不上网站 |
| 在读状态 | 全日制、交换、休学（Urlaubssemester） |

## 推导出的信息

- **身份**：在读学生，可以找 Werkstudent、Praktikum、Abschlussarbeit。
- **预计毕业时间**：证明上通常没有，采访时问用户。
- **可工作时间**：采访时请用户确认，例如"学期中每周 20 小时，假期可全职"。学期中每周最多 20 小时是 Werkstudent 的常见做法，但具体规定和用户的签证情况相关，以用户自己确认的为准，不要替TA下结论。

这些信息写进 `content.js` 的 `basics.availability`（见 `content-model.md`），在首页"快速信息"里显示，例如："Werkstudent ab 04/2027 · 20 Std./Woche · München"。

## 网站用途

- 首页快速信息的可工作时间
- 教育条目的"在读"状态和预计毕业时间

## 敏感信息

原件默认不公开，也不放进文件墙：里面有学号、出生日期，有时还有住址。专业学期数不上网站：学期数偏多的用户可能不愿意被看到，而且对 HR 判断没什么帮助。
