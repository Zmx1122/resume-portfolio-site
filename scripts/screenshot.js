// 用法：node scripts/screenshot.js <网站文件夹> [--out 截图文件夹] [--pages "de/,en/skills,zh/cv"] [--width 1280] [--mobile] [--cv] [--file preview-2.html]
// 例如：node scripts/screenshot.js 我的简历网站/site --out 我的简历网站/_work/screens --pages "de/,en/skills" --mobile
//
// 用无头 Chrome 给网站截全页图，检查页面是不是真的好看。比直接用 chrome --screenshot 可靠：
// - 先在本机起一个临时网页服务器，不用 file:// 打开（有些浏览器限制本地文件）
// - 等所有图片真正加载完再截图（模板的图片是懒加载，直接截图会是一个个灰框）
// - 宽度是真实的页面宽度（chrome --window-size=390 实际排版宽度并不是 390）
// --mobile    再按手机宽度 390 截一遍
// --cv        把"速览"页按每种语言打印成 PDF，放进 <网站文件夹>/assets/docs/cv-<语言>.pdf（不带页眉页脚）。
//             脚本不会改 content.js：生成后自己把 basics.cv 写好，再运行 check_content.js
// --file      截网站文件夹里的另一个页面（比如风格小样 preview-2.html），默认是 index.html
// 需要 Node.js 22 或更新版本（自带 WebSocket）和 Google Chrome / Chromium。

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const valueIdx = new Set(["--out", "--pages", "--width", "--file"].map((f) => args.indexOf(f)).filter((i) => i >= 0).map((i) => i + 1));
const siteArg = args.find((a, i) => !a.startsWith("--") && !valueIdx.has(i));
if (!siteArg) { console.log("用法：node scripts/screenshot.js <网站文件夹> [--out 截图文件夹] [--pages \"de/,en/skills\"] [--width 1280] [--mobile] [--cv]"); process.exit(2); }
const siteDir = path.resolve(siteArg);
if (!fs.existsSync(path.join(siteDir, "index.html"))) { console.log(`${siteDir} 里没有 index.html。要截图的是 site 文件夹本身。`); process.exit(2); }
const pageFile = flag("--file") || "index.html";
if (!fs.existsSync(path.join(siteDir, pageFile))) { console.log(`${siteDir} 里没有 ${pageFile}。`); process.exit(2); }
const filePrefix = pageFile === "index.html" ? "" : pageFile.replace(/\.html?$/, "") + "-";
if (typeof WebSocket === "undefined") { console.log("需要 Node.js 22 或更新版本（这个版本没有内置 WebSocket）。"); process.exit(3); }

const ctx = { window: {} };
try { vm.runInNewContext(fs.readFileSync(path.join(siteDir, "content.js"), "utf8"), ctx); } catch (e) { console.log("content.js 有错误：" + e.message); process.exit(1); }
const langs = (ctx.window.SITE && ctx.window.SITE.meta && ctx.window.SITE.meta.languages) || ["en"];
const outDir = path.resolve(flag("--out") || path.join(siteDir, "..", "_work", "screens"));
const width = Number(flag("--width") || 1280);
const pages = (flag("--pages") || langs.map((l) => l + "/").join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const sizes = [{ name: String(width), width, mobile: false }].concat(args.includes("--mobile") ? [{ name: "390", width: 390, mobile: true }] : []);

function findChrome() {
  const c = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"];
  return c.find((p) => p && fs.existsSync(p));
}

// 临时网页服务器：只提供网站文件夹里的文件
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf", ".json": "application/json" };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/^\/+/, "") || pageFile;
      const f = path.join(siteDir, rel);
      if (!f.startsWith(siteDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const chromePath = findChrome();
  if (!chromePath) { console.log("找不到 Google Chrome。装好 Chrome，或者用环境变量 CHROME 指定它的位置。"); process.exit(3); }
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "screenshot-chrome-"));
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
    setTimeout(() => reject(new Error("Chrome 没有启动")), 20000);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
    else if (msg.method) listeners.forEach((fn) => fn(msg));
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const waitEvent = (method, sessionId, ms = 15000) => new Promise((resolve) => {
    const fn = (msg) => { if (msg.method === method && msg.sessionId === sessionId) { listeners.splice(listeners.indexOf(fn), 1); resolve(msg); } };
    listeners.push(fn); setTimeout(resolve, ms);
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  // 等页面渲染完、所有图片加载完
  const settle = async () => {
    await send("Runtime.evaluate", { awaitPromise: true, expression: `(async () => {
      await new Promise((r) => setTimeout(r, 400));
      const imgs = [...document.images];
      imgs.forEach((i) => { i.loading = "eager"; });
      const wait = (list) => Promise.race([Promise.all(list.map((i) => i.complete && i.naturalWidth ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 8000))]);
      await wait(imgs);
      // 偶尔有图片没加载出来：重新加载一次再等
      const broken = imgs.filter((i) => !i.naturalWidth);
      broken.forEach((i) => { const s = i.src; i.src = ""; i.src = s; });
      if (broken.length) await wait(broken);
      await new Promise((r) => setTimeout(r, 300));
    })()` }, sessionId);
  };
  let navCount = 0;
  const open = async (hash, size) => {
    await send("Emulation.setDeviceMetricsOverride", { width: size.width, height: size.mobile ? 844 : 900, deviceScaleFactor: 1, mobile: size.mobile }, sessionId);
    const loaded = waitEvent("Page.loadEventFired", sessionId);
    // 每次带一个不同的 ?n=，保证是一次完整的页面加载（只改 # 后面的部分不会触发加载完成事件）
    await send("Page.navigate", { url: base + pageFile + "?n=" + (++navCount) + "#/" + hash.replace(/^#?\/?/, "") }, sessionId);
    await loaded;
    await settle();
  };

  fs.mkdirSync(outDir, { recursive: true });
  const saved = [];
  for (const size of sizes) {
    for (const pg of pages) {
      await open(pg, size);
      const { result } = await send("Runtime.evaluate", { expression: "Math.ceil(document.documentElement.scrollHeight)", returnByValue: true }, sessionId);
      const height = Math.min(result.value || 900, 16000);
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: size.width, height, scale: 1 } }, sessionId);
      const file = path.join(outDir, filePrefix + `${pg.replace(/\/+$/, "").replace(/\//g, "-") || "home"}${pg.endsWith("/") && pg.split("/").filter(Boolean).length === 1 ? "-home" : ""}-${size.name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
      saved.push(file);
    }
  }
  if (args.includes("--cv")) {
    const docs = path.join(siteDir, "assets", "docs");
    fs.mkdirSync(docs, { recursive: true });
    for (const l of langs) {
      await open(`${l}/cv`, sizes[0]);
      await send("Emulation.setEmulatedMedia", { media: "print" }, sessionId);
      const pdf = await send("Page.printToPDF", { printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false }, sessionId);
      await send("Emulation.setEmulatedMedia", { media: "" }, sessionId);
      const file = path.join(docs, `cv-${l}.pdf`);
      fs.writeFileSync(file, Buffer.from(pdf.data, "base64"));
      const pagesCount = (Buffer.from(pdf.data, "base64").toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
      saved.push(`${file}（${pagesCount} 页${pagesCount > 1 ? "：速览页最好只有 1 页，见 components.md" : ""}）`);
    }
  }
  ws.close(); srv.close();
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); setTimeout(r, 5000); });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* 临时文件夹删不掉不影响结果 */ }
  console.log("已保存：\n" + saved.map((f) => "  " + f).join("\n"));
})().catch((e) => { console.log("截图失败：" + (e && e.message || e)); process.exit(1); });
