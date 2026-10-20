// 用法：node scripts/health_check.js <网站文件夹> [--url 线上网址] [--no-links]
// 例如：node scripts/health_check.js 我的简历网站/site --url https://zmx1122.github.io/
//
// 维护模式的"定期体检"（见 SKILL.md 的维护模式）。网站做好以后过了一段时间，内容会悄悄过时：
// 已经离职的工作还显示"至今"、毕业了还写"预计毕业"、链接失效、本地改了却忘了发布。
// 这个脚本把能自动发现的问题列出来：
//   1. 运行 check_content.js（内容规则）
//   2. 时效：多久没更新、预计毕业时间是否已过、哪些经历显示"至今"、日期是否在未来
//   3. 外部链接能不能打开（--no-links 跳过）
//   4. 给了 --url 时：线上的 content.js 和本地是否一致，线上的发布编号
// 有错误时退出码为 1。提醒需要和用户确认，不要自己猜着改。

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const urlFlag = args.indexOf("--url");
const liveUrl = urlFlag >= 0 ? args[urlFlag + 1] : null;
const siteArg = args.find((a, i) => !a.startsWith("--") && i !== urlFlag + 1);
if (!siteArg) { console.log("用法：node scripts/health_check.js <网站文件夹> [--url 线上网址] [--no-links]"); process.exit(2); }
const siteDir = path.resolve(siteArg);
const contentFile = path.join(siteDir, "content.js");
if (!fs.existsSync(contentFile)) { console.log(`${siteDir} 里没有 content.js。要检查的是 site 文件夹本身。`); process.exit(2); }

const errors = [], warnings = [], notes = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m), note = (m) => notes.push(m);

(async () => {
  // ---------- 1. 内容规则 ----------
  const checker = spawnSync(process.execPath, [path.join(__dirname, "check_content.js"), contentFile], { encoding: "utf8" });
  const checkerOut = (checker.stdout || "") + (checker.stderr || "");
  if (checker.status !== 0) err("内容检查有错误，见下面 check_content.js 的输出");

  const text = fs.readFileSync(contentFile, "utf8");
  const ctx = { window: {} };
  try { vm.runInNewContext(text, ctx); } catch (e) { console.log("content.js 有语法错误：" + e.message); process.exit(1); }
  const S = ctx.window.SITE || {};
  const meta = S.meta || {};

  // ---------- 2. 时效 ----------
  const now = new Date();
  const ym = (d) => { const p = String(d || "").split("-").map(Number); return p[0] ? p[0] * 12 + ((p[1] || 1) - 1) : null; };
  const nowYm = now.getFullYear() * 12 + now.getMonth();
  const label = (e) => {
    const v = e.position || e.studyType || e.name || e.institution || e.id;
    return typeof v === "object" && v ? Object.values(v)[0] : v;
  };

  if (!meta.updated) warn("meta.updated 没有写：每次更新内容后写上当天日期，页脚会显示\"更新于\"");
  else {
    const months = nowYm - ym(meta.updated);
    if (months >= 6) warn(`meta.updated 是 ${meta.updated}，已经 ${months} 个月没更新了。问用户最近有没有新的经历、项目、证书或照片`);
  }

  for (const e of S.education || []) {
    if (!e.endDate && e.expectedEnd && ym(e.expectedEnd) < nowYm) warn(`education.${e.id}：预计毕业时间 ${e.expectedEnd} 已经过了。毕业了就改成 endDate（问用户成绩要不要写），还没毕业就更新 expectedEnd`);
  }
  for (const sec of ["work", "education", "projects"]) {
    for (const e of S[sec] || []) {
      if (ym(e.startDate) > nowYm) warn(`${sec}.${e.id}：开始时间 ${e.startDate} 在未来。还没开始的工作，确认用户想不想现在就公开`);
      if (sec !== "education" && e.startDate && !e.endDate) note(`${sec}.${e.id}（${label(e)}）显示"至今"：问用户是不是还在做`);
    }
  }
  const target = meta.target || {};
  if (target.type || target.role) note(`求职目标是 ${[target.type, typeof target.role === "object" ? Object.values(target.role)[0] : target.role, target.city].filter(Boolean).join(" · ")}：问用户现在还找这个方向吗`);

  // ---------- 3. 外部链接 ----------
  if (!args.includes("--no-links")) {
    const urls = new Set();
    const walk = (v) => {
      if (typeof v === "string") { if (/^https?:\/\//.test(v)) urls.add(v); }
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(S);
    // 这些状态码通常是网站拦截了程序访问（比如 LinkedIn），不代表链接坏了
    const BLOCKED = new Set([401, 403, 405, 429, 999]);
    const check = async (u) => {
      for (const method of ["HEAD", "GET"]) {
        try {
          const r = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "user-agent": "Mozilla/5.0 (resume-portfolio-site health check)" } });
          if (r.ok) return null;
          if (method === "HEAD" && (r.status === 405 || r.status === 404 || r.status === 403)) continue;
          return BLOCKED.has(r.status) ? `blocked:${r.status}` : `status:${r.status}`;
        } catch (e) {
          if (method === "HEAD") continue;
          return "error:" + (e.name === "TimeoutError" ? "超时" : e.cause && e.cause.code || e.message);
        }
      }
      return null;
    };
    const list = [...urls];
    const results = await Promise.all(list.map(check));
    let blocked = [];
    list.forEach((u, i) => {
      const r = results[i];
      if (!r) return;
      if (r.startsWith("blocked:")) blocked.push(u);
      else warn(`链接打不开（${r.replace("status:", "HTTP ").replace("error:", "")}）：${u}`);
    });
    if (blocked.length) note(`这些网站不允许程序检查，请手动打开一次确认：${blocked.join("、")}`);
    note(`检查了 ${list.length} 个外部链接`);
  }

  // ---------- 4. 线上版本 ----------
  if (liveUrl) {
    const base = liveUrl.endsWith("/") ? liveUrl : liveUrl + "/";
    try {
      const r = await fetch(`${base}content.js?t=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) warn(`线上网站读不到 content.js（HTTP ${r.status}）：网址对吗？网站还在吗？`);
      else {
        const live = await r.text();
        if (live.trim() === text.trim()) note("线上的 content.js 和本地一致");
        else warn("线上的 content.js 和本地不一样：要么本地改了还没发布，要么有人在 GitHub 网页上改过。发布前先弄清楚是哪一种，别把线上的修改覆盖掉");
      }
      const p = await fetch(`${base}published.txt?t=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
      if (p.ok) note(`线上的发布编号：${(await p.text()).trim()}（可以和 _work/publish-log.md 的最后一行对照）`);
    } catch (e) {
      warn(`打不开线上网站 ${base}：${e.message}`);
    }
  }

  // ---------- 输出 ----------
  console.log("== 内容检查 ==\n" + checkerOut.trim() + "\n");
  console.log("== 体检 ==");
  if (errors.length) { console.log(`错误（${errors.length}）：`); errors.forEach((m) => console.log("  - " + m)); }
  if (warnings.length) { console.log(`提醒（${warnings.length}）：`); warnings.forEach((m) => console.log("  - " + m)); }
  if (notes.length) { console.log(`需要和用户确认（${notes.length}）：`); notes.forEach((m) => console.log("  - " + m)); }
  if (!errors.length && !warnings.length) console.log("没有发现问题。");
  process.exit(errors.length ? 1 : 0);
})();
