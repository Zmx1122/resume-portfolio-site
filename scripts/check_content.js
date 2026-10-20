// 用法：node scripts/check_content.js site/content.js
// 按 references/content-model.md 第 5 节的规则检查 content.js。
// 同时检查 content.js 所在的网站文件夹：引用的文件是否存在、有没有不该公开的多余文件、风格设置是否一致。
// "错误"必须修好；"提醒"请看一眼，确认没问题即可。有错误时退出码为 1。

const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");
const vm = require("vm");

const file = process.argv[2];
if (!file) { console.log("用法：node scripts/check_content.js site/content.js"); process.exit(2); }
const siteDir = path.dirname(path.resolve(file));
const ctx = { window: {} };
try {
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
} catch (e) {
  console.log("错误：content.js 有语法错误，网页会一片空白。\n  " + e.message);
  process.exit(1);
}
const S = ctx.window.SITE;
if (!S) { console.log("错误：content.js 里没有 window.SITE = { ... }"); process.exit(1); }
// 测试用：第二个参数是一段修改 S 的代码，用来验证检查器能不能发现问题
if (process.argv[3]) new Function("S", process.argv[3])(S);

const meta = S.meta || {};
const langs = meta.languages || [];
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

if (!langs.length) err("meta.languages 为空");
if (langs.length > 3) err(`meta.languages 有 ${langs.length} 种语言，最多 3 种`);

// ---------- 多语言、占位内容、隐藏字段 ----------

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const isLangObj = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => LANG_RE.test(k));

function walk(node, p) {
  if (typeof node === "string") {
    if (node.trim() === "" || /^(n\/a|暂无|tbd|todo|xxx)$/i.test(node.trim())) err(`${p}：占位内容 "${node}"`);
    return;
  }
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${p}[${i}]`));
  if (node && typeof node === "object") {
    if (p !== "ui" && p !== "basics.cv" && isLangObj(node) && Object.keys(node).some((k) => langs.includes(k))) {
      for (const l of langs) if (!(l in node)) err(`${p}：缺少 "${l}" 的译文`);
    }
    if (node.show === false) err(`${p}：标了 show: false。content.js 是公开文件，隐藏的信息仍然能被下载到，不公开的内容请直接删掉`);
    for (const k of Object.keys(node)) walk(node[k], p ? `${p}.${k}` : k);
  }
}
walk(S, "");

// 需要翻译的字段：网站有多种语言时，写成普通字符串就只有一种语言
const I18N = {
  basics: ["label", "headline"],
  work: ["position", "summary", "highlights[]"],
  education: ["studyType", "area"],
  projects: ["name", "description"],
  stories: ["title", "standfirst", "role", "problem", "outcome", "actions[]", "media[].alt", "media[].caption", "metrics[].label"],
  languages: ["language", "use"],
  awards: ["title", "summary"],
  publications: ["summary"],
  quotes: ["text", "authorTitle"],
  documents: ["title", "summary"],
  about: ["text", "interests[]"],
  contact: ["cta"],
};
function checkI18n(obj, field, where) {
  const [head, ...rest] = field.split(".");
  const isArr = head.endsWith("[]");
  const key = isArr ? head.slice(0, -2) : head;
  const v = obj && obj[key];
  if (v == null) return;
  const items = isArr ? (Array.isArray(v) ? v : []) : [v];
  items.forEach((it, i) => {
    const w = isArr ? `${where}.${key}[${i}]` : `${where}.${key}`;
    if (rest.length) return checkI18n(it, rest.join("."), w);
    if (typeof it === "string") err(`${w}：网站有 ${langs.length} 种语言，这里应该写成 { ${langs.map((l) => l + ": …").join(", ")} }`);
  });
}
if (langs.length > 1) {
  for (const [sec, fields] of Object.entries(I18N)) {
    const val = S[sec];
    if (!val) continue;
    const entries = Array.isArray(val) ? val.map((x, i) => [x, `${sec}.${x && x.id ? x.id : i}`]) : [[val, sec]];
    for (const [obj, where] of entries) for (const f of fields) checkI18n(obj, f, where);
  }
}

// ---------- 译文是不是真的翻译了 ----------

// 1. 学校、城市、颁发机构这类名称，各语言通常有不同的正式写法，不应该只写一种
// 只有学校、协会、基金会、部委这类机构才通常有各语言的正式名称；公司、期刊、会议保持原文，不提醒
const ORG_RE = /(universit|hochschule|institut|akademie|academy|college|ministeri|ministry|stiftung|foundation|verband|verein|association|kammer|chamber|大学|学院|协会|基金会|研究所)/i;
const PLACE_FIELDS = [
  ["education", "institution", '学校名称各语言通常有正式写法，例如 { de: "Technische Universität München", en: "Technical University of Munich", zh: "慕尼黑工业大学" }'],
  ["work", "location", '城市名各语言写法不同，例如 { de: "München", en: "Munich", zh: "慕尼黑" }'],
  ["awards", "awarder", "颁发机构有其他语言的正式名称时，写成多语言对象", ORG_RE],
  ["certificates", "issuer", "颁发机构有其他语言的正式名称时，写成多语言对象", ORG_RE],
];
if (langs.length > 1) {
  for (const [sec, field, hint, only] of PLACE_FIELDS) {
    for (const x of S[sec] || []) {
      const v = x && x[field];
      if (typeof v === "string" && v.trim() && (!only || only.test(v))) warn(`${sec}.${x.id || "?"}.${field}："${v}" 只有一种写法，所有语言都会显示它。${hint}`);
    }
  }
  const city = S.basics && S.basics.location && S.basics.location.city;
  if (typeof city === "string" && city.trim()) warn(`basics.location.city："${city}" 只有一种写法。城市名各语言写法不同，例如 { de: "München", en: "Munich", zh: "慕尼黑" }`);
}

// 2. 内容看起来没有翻译：中文里没有汉字；德语和英语一字不差
const CJK = /[㐀-鿿぀-ヿ가-힯]/;
const SKIP_SAME = /^(skills|publications\.\d+\.name|stories\.[^.]+\.metrics|ui)|\.(courses\[\d+\]\.name|institution|thesis\.title|position|awarder|issuer)$/;
function checkLang(node, p) {
  if (Array.isArray(node)) return node.forEach((v, i) => checkLang(v, `${p}[${i}]`));
  if (!node || typeof node !== "object") return;
  if (isLangObj(node) && p !== "basics.cv" && !p.startsWith("ui")) {
    for (const l of langs.filter((l) => /^(zh|ja|ko)/.test(l))) {
      const v = node[l];
      if (typeof v === "string" && v.replace(/[\s\d.,:;·()\/–+%|-]/g, "").length > 12 && !CJK.test(v) && !p.startsWith("skills")) {
        warn(`${p}.${l}：中文译文里没有汉字，可能还没翻译："${v.slice(0, 60)}"`);
      }
    }
    if (node.de && node.en && node.de === node.en && node.de.length > 24 && /\s/.test(node.de) && !SKIP_SAME.test(p)) {
      warn(`${p}：德语和英语完全一样，可能有一种没翻译："${node.de.slice(0, 60)}"`);
    }
    return;
  }
  for (const k of Object.keys(node)) checkLang(node[k], p ? `${p}.${k}` : k);
}
if (langs.length > 1) {
  for (const sec of Object.keys(S)) {
    const val = S[sec];
    if (Array.isArray(val)) val.forEach((x, i) => checkLang(x, `${sec}.${(x && x.id) || i}`));
    else checkLang(val, sec);
  }
}

// ---------- id 引用 ----------

const ids = {};
for (const sec of ["work", "education", "projects", "stories", "skills", "certificates", "awards", "publications", "quotes", "documents"]) {
  ids[sec] = new Set((S[sec] || []).map((x) => x.id));
}
const parents = new Set([...ids.work, ...ids.education, ...ids.projects]);
const ref = (p, id, set, name) => { if (id && !set.has(id)) err(`${p}：找不到 ${name} "${id}"`); };
const needSources = (x, p) => { if (!x.sources || !x.sources.length) err(`${p}：没有 sources（来源）`); };

for (const sec of ["work", "education", "projects"]) {
  for (const e of S[sec] || []) {
    (e.stories || []).forEach((id) => ref(`${sec}.${e.id}.stories`, id, ids.stories, "故事"));
    (e.skills || []).forEach((id) => ref(`${sec}.${e.id}.skills`, id, ids.skills, "技能"));
    (e.evidence || []).forEach((id) => ref(`${sec}.${e.id}.evidence`, id, ids.documents, "文件"));
    if (e.thesis) ref(`${sec}.${e.id}.thesis.story`, e.thesis.story, ids.stories, "故事");
    needSources(e, `${sec}.${e.id}`);
  }
}
let featured = 0;
const storyOwners = {};
for (const s of S.stories || []) {
  ref(`stories.${s.id}.parent`, s.parent, parents, "所属经历");
  (s.skills || []).forEach((id) => ref(`stories.${s.id}.skills`, id, ids.skills, "技能"));
  (s.evidence || []).forEach((id) => ref(`stories.${s.id}.evidence`, id, ids.documents, "文件"));
  (s.quotes || []).forEach((id) => ref(`stories.${s.id}.quotes`, id, ids.quotes, "引用"));
  (s.metrics || []).forEach((m, i) => { if (!m.sources || !m.sources.length) err(`stories.${s.id}.metrics[${i}]：数字没有来源`); });
  (s.media || []).forEach((m, i) => { if (!m.caption) err(`stories.${s.id}.media[${i}]：图片没有说明文字`); });
  needSources(s, `stories.${s.id}`);
  if (s.featured) {
    featured++;
    if (!(s.media || []).length && !(s.evidence || []).length) warn(`stories.${s.id}：精选故事既没有图片也没有证据，考虑不设为精选`);
  }
}
if ((S.stories || []).length && featured === 0) warn("没有精选故事，首页会默认显示前 3 个故事");
if (featured > 4) warn(`有 ${featured} 个精选故事，建议不超过 4 个`);
// 同一个故事挂在两处会在时间线上出现两次
for (const sec of ["work", "education", "projects"]) for (const e of S[sec] || []) for (const id of e.stories || []) (storyOwners[id] = storyOwners[id] || []).push(`${sec}.${e.id}`);
for (const [id, owners] of Object.entries(storyOwners)) if (owners.length > 1) warn(`故事 "${id}" 同时挂在 ${owners.join("、")}，时间线上会出现两次`);

for (const c of S.certificates || []) { ref(`certificates.${c.id}.document`, c.document, ids.documents, "文件"); needSources(c, `certificates.${c.id}`); }
for (const a of S.awards || []) { ref(`awards.${a.id}.story`, a.story, ids.stories, "故事"); ref(`awards.${a.id}.document`, a.document, ids.documents, "文件"); }
for (const p of S.publications || []) ref(`publications.${p.name && typeof p.name === "string" ? p.name : p.id}.story`, p.story, ids.stories, "故事");
for (const l of S.languages || []) ref("languages.certificate", l.certificate, ids.certificates, "证书");
for (const q of S.quotes || []) {
  ref(`quotes.${q.id}.document`, q.document, ids.documents, "文件");
  if (!["yes", "pending", "no", "not-needed"].includes(q.consent)) err(`quotes.${q.id}：consent 只能是 yes / pending / no / not-needed`);
  needSources(q, `quotes.${q.id}`);
}
for (const d of S.documents || []) {
  if (!["public", "preview", "summary", "on-request", "private"].includes(d.visibility)) err(`documents.${d.id}：visibility 只能是 public / preview / summary / on-request / private`);
  if (d.visibility === "public") warn(`documents.${d.id}：public 的文件任何人都能下载原件。证书、Urkunde、获奖证书、推荐信这类文件建议改成 preview（只显示带水印的预览图，网站里不放原件），见 content-model.md 的"文件"`);
  if (d.visibility === "preview" && !d.preview && !d.thumbnail) err(`documents.${d.id}：preview 的文件需要 preview（带水印的预览图），用 split_pdf.py 的 ":preview" 生成`);
  if (d.visibility !== "public" && d.file) err(`documents.${d.id}：不公开的文件不能写 file，原件也不要放进网站文件夹`);
}
for (const s of S.skills || []) if (typeof s.name !== "string" && !isLangObj(s.name)) err(`skills.${s.id}.name：应该是文字或多语言对象`);

// ---------- 论文列表 ----------
for (const [i, p] of (S.publications || []).entries()) {
  if (p.image) warn(`publications.${i}.image：论文列表不再显示封面截图，删掉这个字段和对应的图片文件`);
  if (p.name && typeof p.name === "object") warn(`publications.${i}.name：论文题目在所有语言里都用正式题目原文，写成一个字符串`);
}
const myName = typeof (S.basics || {}).name === "string" ? S.basics.name : "";
if (myName && (S.publications || []).some((p) => p.authors) && !(S.publications || []).some((p) => String(p.authors || "").split(/,\s*/).includes(myName))) {
  warn(`publications：作者列表里找不到 "${myName}"（basics.name）。写法一致，列表里你的名字才会加粗`);
}

// ---------- 技能页：技能 × 经历矩阵 ----------
// 一段经历用到某项技能 = 条目自己的 skills 里有它，或者它下面的故事（parent 指向它）的 skills 里有它
{
  const entries = [].concat(S.work || [], S.education || [], S.projects || []).filter((e) => e.id && e.startDate);
  const uses = (e, id) => (e.skills || []).includes(id) || (S.stories || []).some((st) => st.parent === e.id && (st.skills || []).includes(id));
  for (const sk of S.skills || []) {
    if (!entries.some((e) => uses(e, sk.id))) warn(`skills.${sk.id}：没有挂在任何经历上，技能页矩阵里这一行是空的。把它加进用到它的每段经历（work / education / projects）的 skills`);
    if (sk.core && !sk.summary) warn(`skills.${sk.id}：标了 core，但没有 summary。核心技能卡片需要一句话说明在哪些经历里怎么用的`);
  }
  const core = (S.skills || []).filter((sk) => sk.core);
  if (core.length > 4) warn(`skills：有 ${core.length} 个 core，卡片只显示前 4 个。核心技能挑 3–4 个`);
  const cols = entries.filter((e) => (S.skills || []).some((sk) => uses(e, sk.id)));
  for (const e of cols) {
    const label = e.short != null ? e.short : e.name != null ? e.name : e.institution;
    const longest = Math.max(...langs.map((l) => String(typeof label === "object" && label ? label[l] || "" : label || "").length));
    if (longest > 22) warn(`${e.id}：在技能矩阵里当列名太长（${longest} 个字符）。加一个 short，比如 "TUM"、"M.Sc. Darmstadt"`);
  }
}

// ---------- 日期：已经结束的事情不能显示成"至今" ----------

for (const e of S.education || []) if (!e.endDate && !e.expectedEnd) warn(`education.${e.id}：没有 endDate 也没有 expectedEnd，页面会显示"至今"。已经毕业的写 endDate，在读的写 expectedEnd`);
const openWork = (S.work || []).filter((w) => !w.endDate);
if (openWork.length > 1) warn(`有 ${openWork.length} 段工作没有 endDate（${openWork.map((w) => w.id).join("、")}），都会显示"至今"。确认是否真的同时在做`);
for (const s of S.stories || []) {
  if (s.period && s.period.start && !s.period.end && !s.period.date && s.kind !== "work") warn(`stories.${s.id}：period 只有 start，会显示"至今"。已经结束的写 end，只有一个时间点的写 { date }；确实还在进行的可以忽略这条`);
}
for (const [i, m] of (S.milestones || []).entries()) {
  if (!m.date || !/^\d{4}(-\d{2})?$/.test(m.date)) err(`milestones[${i}]：date 要写成 "YYYY" 或 "YYYY-MM"（用于排序）`);
  if (m.story) ref(`milestones[${i}].story`, m.story, ids.stories, "故事");
}
if ((S.journey || []).length === 1) warn("journey 只有一站，路线小地图至少需要两站才会显示");
// 路线小地图的文字放不下时会被截断成"…"：名字写短一点（全名放在经历里）
const textUnits = (t) => [...String(t || "")].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
for (const [i, st] of (S.journey || []).entries()) {
  for (const [field, max] of [["name", 22], ["place", 30], ["label", 30]]) {
    const v = field === "place" && st.place && st.years
      ? Object.fromEntries((typeof st.place === "object" ? Object.entries(st.place) : [["", st.place]]).map(([l, t]) => [l, `${t} · ${st.years}`]))
      : st[field];
    const vals = v && typeof v === "object" ? Object.entries(v) : v ? [["", v]] : [];
    for (const [l, t] of vals) if (textUnits(t) > max) warn(`journey[${i}].${field}${l ? "." + l : ""}："${t}" 太长，路线小地图上会被截断成"…"。写一个短名字（例如 "TU Musterstadt"），全名留在经历里`);
  }
}

// 技能分类：只有内置的分类有现成的翻译；自己起的分类要在 ui 里给每种语言写上名字，否则页面和简历 PDF 上会直接显示英文 id
const BUILTIN_CATS = ["ai", "automation", "data", "engineering", "design", "business", "research", "tools", "other"];
for (const cat of new Set((S.skills || []).map((sk) => sk.category || "other"))) {
  if (BUILTIN_CATS.includes(cat)) continue;
  const missing = langs.filter((l) => !(S.ui && S.ui[l] && S.ui[l]["cat_" + cat]));
  if (missing.length) warn(`skills 分类 "${cat}" 不是内置分类，${missing.join("、")} 没有名字，页面上会直接显示 "${cat}"。改用内置分类（${BUILTIN_CATS.join("、")}），或者在 ui.<语言> 里写 cat_${cat}`);
}

// ---------- 设置 ----------

const SECTIONS = ["milestones", "stories", "experience", "education", "publications", "skills", "documents", "about"];
(meta.sections || []).forEach((x) => { if (!SECTIONS.includes(x)) err(`meta.sections 里的 "${x}" 不存在，可用：${SECTIONS.join(", ")}`); });
if (meta.layout && !["compact", "editorial"].includes(meta.layout)) err(`meta.layout 只能是 compact 或 editorial`);
const today = new Date().toISOString().slice(0, 7);
const from = S.basics && S.basics.availability && S.basics.availability.from;
if (from && from < today) warn(`basics.availability.from 是 ${from}，已经过去了。现在就能开始的话，删掉 from，在 note 里写"ab sofort / 随时"`);

// ---------- 网站文件夹 ----------

const isLocal = (u) => typeof u === "string" && u && !/^(https?:|mailto:|tel:|data:|#)/i.test(u);
const referenced = new Set();
function needFile(u, p) {
  if (!isLocal(u)) return;
  const clean = u.split(/[?#]/)[0];
  referenced.add(path.normalize(clean));
  if (!fs.existsSync(path.join(siteDir, clean))) err(`${p}：文件 "${u}" 不存在（相对于 ${path.basename(siteDir)}/）`);
}
const b = S.basics || {};
needFile(b.image, "basics.image");
if (b.cv) for (const [l, u] of Object.entries(b.cv)) needFile(u, `basics.cv.${l}`);
for (const s of S.stories || []) (s.media || []).forEach((m, i) => { if ((m.type || "image") !== "link") needFile(m.src, `stories.${s.id}.media[${i}]`); });
for (const d of S.documents || []) { needFile(d.file, `documents.${d.id}.file`); needFile(d.thumbnail, `documents.${d.id}.thumbnail`); needFile(d.preview, `documents.${d.id}.preview`); }

// 不公开原件的文件（on-request、summary）：网页上的模糊只是样式，图片文件本身谁都能下载。
// 所以缩略图必须本来就很小、看不清字（split_pdf.py 的 ":private" 会生成 48 像素宽的缩略图）
function imageWidth(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.slice(1, 4).toString() === "PNG") return buf.readUInt32BE(16);
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      for (let i = 2; i < buf.length - 9;) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return buf.readUInt16BE(i + 7);
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch (e) {}
  return null;
}
// preview 的文件：预览图和缩略图都应该带水印（split_pdf.py 生成的 PNG 里写了一个标记）
function hasWatermarkTag(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.slice(1, 4).toString() !== "PNG") return false;
    for (let i = 8; i < buf.length - 12;) {
      const len = buf.readUInt32BE(i), type = buf.slice(i + 4, i + 8).toString();
      if ((type === "tEXt" || type === "iTXt") && buf.slice(i + 8, i + 8 + len).toString("latin1").includes("resume-portfolio-site watermark")) return true;
      if (type === "IDAT" || type === "IEND") break;
      i += 12 + len;
    }
  } catch (e) {}
  return false;
}
for (const d of S.documents || []) {
  if (d.visibility !== "preview") continue;
  for (const key of ["preview", "thumbnail"]) {
    if (!d[key]) continue;
    const f = path.join(siteDir, String(d[key]).split(/[?#]/)[0]);
    if (!fs.existsSync(f)) continue;
    if (!hasWatermarkTag(f)) warn(`documents.${d.id}.${key}：看不出这张图带水印。preview 的文件用 split_pdf.py 的 ":preview" 和 --watermark 生成，水印画在图片里，别人另存也去不掉`);
    const w = imageWidth(f);
    if (w && w > 1400) warn(`documents.${d.id}.${key}：图片有 ${w} 像素宽，清晰到可以直接打印。预览图 1000 像素宽就够了`);
  }
}

for (const d of S.documents || []) {
  if (!d.thumbnail || d.visibility === "public" || d.visibility === "preview") continue;
  const f = path.join(siteDir, String(d.thumbnail).split(/[?#]/)[0]);
  if (!fs.existsSync(f)) continue;
  const w = imageWidth(f);
  if (w === null) warn(`documents.${d.id}.thumbnail：读不出图片尺寸。这份文件不公开原件，确认缩略图上看不清任何字（最好用 PNG，宽不超过 120 像素）`);
  else if (w > 120) err(`documents.${d.id}.thumbnail：这份文件不公开原件（${d.visibility}），但缩略图有 ${w} 像素宽，任何人都能下载下来看清上面的出生日期、学号等。用 split_pdf.py 在文件名后加 ":private" 重新生成（48 像素宽），或者删掉 thumbnail`);
}
(S.publications || []).forEach((p, i) => needFile(p.image || p.media, `publications[${i}].image`));

const indexHtml = path.join(siteDir, "index.html");
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, "utf8");
  const m = html.match(/id="style-css"[^>]*href="assets\/styles\/([\w-]+)\.css"|href="assets\/styles\/([\w-]+)\.css"[^>]*id="style-css"/);
  const linked = m && (m[1] || m[2]);
  if (meta.style && linked && linked !== meta.style) err(`index.html 引用的风格是 ${linked}，content.js 的 meta.style 是 ${meta.style}，两处要一致`);
  if (/Xiao Lin/.test(html) && b.name && b.name !== "Xiao Lin") err("index.html 里还是演示人物 Xiao Lin 的标题和描述，换成用户的");
  if (/Persönliche Website · Personal website/.test(html)) warn("index.html 的标题和分享预览还是模板默认文字，建议换成用户的名字和一句话介绍");
  const lang = (html.match(/<html[^>]*lang="([^"]+)"/) || [])[1];
  if (lang && langs[0] && lang !== langs[0]) warn(`index.html 的 lang 是 "${lang}"，默认语言是 "${langs[0]}"`);
}
// 放在 img/ 和 docs/ 里却没被引用的文件：部署后同样能被下载
function listFiles(dir) {
  const abs = path.join(siteDir, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).flatMap((f) => {
    if (f.startsWith(".")) return [];
    const rel = path.join(dir, f);
    return fs.statSync(path.join(siteDir, rel)).isDirectory() ? listFiles(rel) : [path.normalize(rel)];
  });
}
for (const rel of [...listFiles("assets/img"), ...listFiles("assets/docs")]) {
  if (!referenced.has(rel)) warn(`${rel} 没有被 content.js 用到，但部署后任何人都能下载。演示文件或不公开的文件请删掉`);
}
for (const f of fs.readdirSync(siteDir)) if (/^preview-.*\.html$/i.test(f)) warn(`${f} 是风格预览文件，选定风格后请删掉，不要发布`);
// ---------- 隐私：content.js 和要发布的 PDF 里不能有电话、出生日期、住址 ----------

const PRIVATE = [
  [/(\+\d{2}[\s\d/().-]{8,}\d|\b0\d{3,4}[\s/-]?\d{5,}\b)/, "电话号码"],
  [/(geboren am|geb\.\s*am|Geburtsdatum|date of birth|born on|出生日期|出生于)/i, "出生日期"],
  [/\b[A-ZÄÖÜ][\wäöüß-]*(straße|strasse|str\.|weg|allee|platz|gasse)\s*\d+/i, "街道地址"],
  [/(Matrikel(nummer|-?nr)|Steuer-?ID|身份证号|护照号|passport no)/i, "证件或学号"],
];
const scan = (text, where) => { for (const [re, what] of PRIVATE) { const m = text.match(re); if (m) err(`${where} 里好像有${what}："${m[0].trim().slice(0, 40)}"。不公开的信息不能出现在网站文件夹的任何文件里`); } };
scan(fs.readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, ""), "content.js");
function pdfText(p) {
  let r = spawnSync("pdftotext", ["-q", p, "-"], { encoding: "utf8" });
  if (!r.error && r.status === 0) return r.stdout;
  r = spawnSync("python3", ["-c", "import sys;from pypdf import PdfReader;print(' '.join((x.extract_text() or '') for x in PdfReader(sys.argv[1]).pages))", p], { encoding: "utf8" });
  if (!r.error && r.status === 0) return r.stdout;
  return null;
}
for (const rel of listFiles("assets").filter((f) => /\.pdf$/i.test(f))) {
  const text = pdfText(path.join(siteDir, rel));
  if (text === null) warn(`${rel}：没法读取 PDF 文字（需要 pdftotext 或 python3 + pypdf），请人工确认里面没有电话、出生日期、住址`);
  else if (!text.trim()) warn(`${rel}：是扫描件，读不到文字，请人工确认里面没有电话、出生日期、住址`);
  else scan(text, rel);
}

for (const bad of ["_work", "我的简历网站"]) if (fs.existsSync(path.join(siteDir, bad))) err(`网站文件夹里有 ${bad}/，里面是工作记录，部署时会被公开。把它移出 ${path.basename(siteDir)}/`);

// ---------- 输出 ----------

if (errors.length) console.log(`错误（${errors.length}）：\n` + errors.map((e) => "  - " + e).join("\n"));
if (warnings.length) console.log(`提醒（${warnings.length}）：\n` + warnings.map((w) => "  - " + w).join("\n"));
if (!errors.length && !warnings.length) console.log("OK：没有发现问题");
else if (!errors.length) console.log("没有错误，请看一下上面的提醒。");
process.exit(errors.length ? 1 : 0);
