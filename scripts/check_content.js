// 用法：node scripts/check_content.js site/content.js
// 按 references/content-model.md 第 5 节的规则检查 content.js，有问题逐条列出，没问题输出 OK。
// Checks a content.js against the self-check rules in references/content-model.md.
const fs = require("fs");
const vm = require("vm");

const file = process.argv[2];
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
const S = ctx.window.SITE;
// Optional: a mutation script (for testing the checker) that edits S in place.
if (process.argv[3]) new Function("S", process.argv[3])(S);
const langs = S.meta.languages;
const errors = [];

if (langs.length > 3) errors.push(`meta.languages has ${langs.length} languages (max 3)`);

// Every object whose keys are all language codes must cover every site language.
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
function walk(node, path) {
  if (typeof node === "string") {
    if (node.trim() === "" || /^(n\/a|暂无|tbd)$/i.test(node.trim())) errors.push(`${path}: placeholder value "${node}"`);
    return;
  }
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    if (path !== "ui" && path !== "basics.cv" && keys.length && keys.every(k => LANG_RE.test(k)) && keys.some(k => langs.includes(k))) {
      for (const l of langs) if (!(l in node)) errors.push(`${path}: missing language "${l}"`);
    }
    for (const k of keys) walk(node[k], path ? `${path}.${k}` : k);
  }
}
walk(S, "");

const ids = {};
for (const sec of ["work", "education", "projects", "stories", "skills", "certificates", "awards", "publications", "quotes", "documents"]) {
  ids[sec] = new Set((S[sec] || []).map(x => x.id));
}
const parents = new Set([...ids.work, ...ids.education, ...ids.projects]);
function ref(path, id, set, name) {
  if (id && !set.has(id)) errors.push(`${path}: unknown ${name} id "${id}"`);
}
for (const sec of ["work", "education", "projects"]) {
  for (const e of S[sec] || []) {
    (e.stories || []).forEach(id => ref(`${sec}.${e.id}.stories`, id, ids.stories, "story"));
    (e.skills || []).forEach(id => ref(`${sec}.${e.id}.skills`, id, ids.skills, "skill"));
    (e.evidence || []).forEach(id => ref(`${sec}.${e.id}.evidence`, id, ids.documents, "document"));
    if (e.thesis) ref(`${sec}.${e.id}.thesis.story`, e.thesis.story, ids.stories, "story");
    if (!e.sources || !e.sources.length) errors.push(`${sec}.${e.id}: no sources`);
  }
}
let featured = 0;
for (const s of S.stories || []) {
  ref(`stories.${s.id}.parent`, s.parent, parents, "parent");
  (s.skills || []).forEach(id => ref(`stories.${s.id}.skills`, id, ids.skills, "skill"));
  (s.evidence || []).forEach(id => ref(`stories.${s.id}.evidence`, id, ids.documents, "document"));
  (s.quotes || []).forEach(id => ref(`stories.${s.id}.quotes`, id, ids.quotes, "quote"));
  (s.metrics || []).forEach((m, i) => { if (!m.sources || !m.sources.length) errors.push(`stories.${s.id}.metrics[${i}]: no sources`); });
  (s.media || []).forEach((m, i) => { if (!m.caption) errors.push(`stories.${s.id}.media[${i}]: no caption`); });
  if (!s.sources || !s.sources.length) errors.push(`stories.${s.id}: no sources`);
  if (s.featured) {
    featured++;
    if (!(s.media || []).length && !(s.evidence || []).length) errors.push(`stories.${s.id}: featured but has no media or evidence`);
  }
}
if ((S.stories || []).length && (featured < 2 || featured > 4)) errors.push(`${featured} featured stories (want 2–4)`);
for (const c of S.certificates || []) { ref(`certificates.${c.id}.document`, c.document, ids.documents, "document"); if (!c.sources) errors.push(`certificates.${c.id}: no sources`); }
for (const l of S.languages || []) ref(`languages.certificate`, l.certificate, ids.certificates, "certificate");
for (const q of S.quotes || []) {
  ref(`quotes.${q.id}.document`, q.document, ids.documents, "document");
  if (!["yes", "pending", "no", "not-needed"].includes(q.consent)) errors.push(`quotes.${q.id}: bad consent "${q.consent}"`);
  if (!q.sources) errors.push(`quotes.${q.id}: no sources`);
}
for (const d of S.documents || []) {
  if (!["public", "summary", "on-request", "private"].includes(d.visibility)) errors.push(`documents.${d.id}: bad visibility`);
  if (d.visibility !== "public" && d.file) errors.push(`documents.${d.id}: non-public document must not have a file`);
}

console.log(errors.length ? errors.join("\n") : "OK: no problems found");
process.exit(errors.length ? 1 : 0);
