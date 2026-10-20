// 用法：node scripts/publish_github_pages.js <网站文件夹> [--repo 仓库名] [--account GitHub用户名] [--overwrite]
// 例如：node scripts/publish_github_pages.js 我的简历网站/site --account zmx1122
// 电脑上登录了多个 GitHub 账号时，用 --account 锁定发布到哪个账号；不一致就停止。
//
// 把网站文件夹发布到 GitHub Pages，最后打印公开网址。需要电脑上装好 git 和 gh（GitHub 命令行工具），
// 并且用户已经在终端里运行过一次 `gh auth login`。
//
// 做法和安全措施：
// - 发布前先运行 check_content.js，有错误就停止。
// - 每次发布都只推送"一个全新的提交"，覆盖仓库里的旧版本。这样以前发布过、后来删掉的内容
//   不会留在公开的历史记录里。
// - 只会覆盖由本脚本创建的仓库（仓库里有 .resume-portfolio-site 标记文件）。同名仓库不是本脚本
//   创建的，就停止，不碰它。
// - 提交使用 GitHub 提供的隐私邮箱，不会把用户的真实邮箱写进公开仓库。
// - 不会发布 _work/、preview-*.html 等工作文件。
// - 仓库里最新的提交不是本脚本发布的（比如用户在 GitHub 网页上直接改过文件），就停止，
//   免得把用户的修改覆盖掉。先把线上的修改合并进本地，再发布；确认可以覆盖时加 --overwrite。
// - 发布成功后，网站文件夹旁边有 _work/ 时，在 _work/publish-log.md 里记一行（日期、账号、仓库、网址），
//   维护模式下次回来时就知道网站发布在哪里。

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const MARKER = ".resume-portfolio-site";
const SKIP = [/^_work$/, /^preview-.*\.html$/i, /^\.DS_Store$/, /^Thumbs\.db$/, /^\.git$/];

function fail(msg, code = 1) { console.log("\n停止：" + msg); process.exit(code); }
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.error && r.error.code === "ENOENT") return { ok: false, missing: true, out: "", err: "" };
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
function must(cmd, args, what, opts) {
  const r = run(cmd, args, opts);
  if (!r.ok) fail(`${what}失败。\n${r.err || r.out}`);
  return r.out;
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (SKIP.some((re) => re.test(name))) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "Cache-Control": "no-cache" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", () => resolve({ status: 0, body: "" }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const args = process.argv.slice(2);
  const repoFlag = args.indexOf("--repo");
  const accountFlag = args.indexOf("--account");
  const wantAccount = accountFlag >= 0 ? (args[accountFlag + 1] || "").toLowerCase() : null;
  const overwrite = args.includes("--overwrite");
  const flagValues = new Set([repoFlag, accountFlag].filter((i) => i >= 0).map((i) => i + 1));
  const siteArg = args.find((a, i) => !a.startsWith("--") && !flagValues.has(i));
  if (!siteArg) fail("请给出网站文件夹，例如：node scripts/publish_github_pages.js 我的简历网站/site", 2);
  const siteDir = path.resolve(siteArg);
  if (!fs.existsSync(path.join(siteDir, "index.html"))) fail(`${siteDir} 里没有 index.html。要发布的是 site 文件夹本身。`, 2);

  // 1. 工具和登录
  if (run("git", ["--version"]).missing) fail("电脑上没有 git。安装方法见 references/deploy.md 的\"准备 GitHub\"。", 3);
  if (run("gh", ["--version"]).missing) fail("电脑上没有 gh（GitHub 命令行工具）。安装方法见 references/deploy.md 的\"准备 GitHub\"。", 3);
  if (!run("gh", ["auth", "status"]).ok) fail("还没有登录 GitHub。请用户在终端里运行：gh auth login（按提示用浏览器登录），完成后再运行本脚本。", 3);

  // 2. 内容检查
  const checker = path.join(__dirname, "check_content.js");
  if (fs.existsSync(path.join(siteDir, "content.js")) && fs.existsSync(checker)) {
    const c = run(process.execPath, [checker, path.join(siteDir, "content.js")]);
    console.log(c.out);
    if (!c.ok) fail("内容检查有错误，先修好再发布。");
  }

  // 3. 账号和仓库
  const [login, id] = must("gh", ["api", "user", "--jq", '.login + " " + (.id|tostring)'], "读取 GitHub 账号").split(" ");
  if (wantAccount && login.toLowerCase() !== wantAccount) {
    fail(`当前登录的 GitHub 账号是 ${login}，不是 ${args[accountFlag + 1]}。\n请用户在终端运行：gh auth switch --user ${args[accountFlag + 1]}，然后再发布。`, 3);
  }
  console.log(`发布到 GitHub 账号：${login}`);
  const userSite = `${login.toLowerCase()}.github.io`;
  const exists = (name) => run("gh", ["api", `repos/${login}/${name}`, "--jq", ".name"]).ok;
  const ours = (name) => run("gh", ["api", `repos/${login}/${name}/contents/${MARKER}`, "--jq", ".name"]).ok;

  let repo = repoFlag >= 0 ? args[repoFlag + 1] : null;
  if (!repo) {
    // 优先用 用户名.github.io（网址最短）；已经被别的网站占用时，改用 resume
    if (!exists(userSite) || ours(userSite)) repo = userSite;
    else repo = "resume";
  }
  if (exists(repo) && !ours(repo)) {
    fail(`GitHub 上已经有一个叫 ${repo} 的仓库，而且不是本脚本创建的，为了不覆盖它，停止发布。\n可以换一个名字：node scripts/publish_github_pages.js ${siteArg} --repo my-cv`);
  }
  if (exists(repo) && !overwrite) {
    const last = run("gh", ["api", `repos/${login}/${repo}/commits/main`, "--jq", ".commit.message"]);
    if (last.ok && !/^Publish website \(/.test(last.out.trim())) {
      fail(`仓库 ${login}/${repo} 里最新的提交不是本脚本发布的："${last.out.trim().split("\n")[0]}"。\n` +
        `可能有人在 GitHub 网页上直接改过网站。直接发布会覆盖这些修改，所以停止。\n` +
        `先看线上改了什么（https://github.com/${login}/${repo}/commits/main），把修改合并进本地的网站文件夹；\n` +
        `确认线上的修改可以丢掉时，加 --overwrite 再发布。`);
    }
  }
  const isUserSite = repo.toLowerCase() === userSite;
  const url = isUserSite ? `https://${userSite}/` : `https://${login.toLowerCase()}.github.io/${repo}/`;

  if (!exists(repo)) {
    console.log(`创建公开仓库 ${login}/${repo} …`);
    must("gh", ["repo", "create", `${login}/${repo}`, "--public", "--description", "Personal website · made with resume-portfolio-site"], "创建仓库");
  }

  // 4. 在临时文件夹里准备一个全新的提交
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-site-"));
  copyDir(siteDir, tmp);
  fs.writeFileSync(path.join(tmp, MARKER), "Published by resume-portfolio-site. Do not delete: the publish script uses this file to recognise the repo.\n");
  fs.writeFileSync(path.join(tmp, ".nojekyll"), "");
  // 每次发布写一个唯一编号，用来确认网上显示的已经是这次的新版本，而不是旧版本
  const publishId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(path.join(tmp, "published.txt"), publishId + "\n");
  // 给 index.html 里引用的脚本和样式加上版本号，访客的浏览器就不会继续用旧版本的缓存
  const indexPath = path.join(tmp, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8")
    .replace(/((?:src|href)="(?:content\.js|assets\/[^"?#]+\.(?:js|css)))(?:\?v=[^"]*)?"/g, `$1?v=${publishId}"`);
  fs.writeFileSync(indexPath, indexHtml);
  const g = (a, what) => must("git", a, what, { cwd: tmp });
  g(["init", "-q", "-b", "main"], "初始化");
  g(["config", "user.name", login], "设置提交者");
  g(["config", "user.email", `${id}+${login}@users.noreply.github.com`], "设置隐私邮箱");
  g(["add", "-A"], "添加文件");
  g(["commit", "-q", "-m", `Publish website (${new Date().toISOString().slice(0, 10)})`], "提交");
  console.log("上传网站文件 …");
  g(["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "push", "-q", "-f",
     `https://github.com/${login}/${repo}.git`, "HEAD:main"], "上传");
  fs.rmSync(tmp, { recursive: true, force: true });

  // 5. 打开 GitHub Pages
  if (!run("gh", ["api", `repos/${login}/${repo}/pages`, "--jq", ".html_url"]).ok) {
    must("gh", ["api", "-X", "POST", `repos/${login}/${repo}/pages`, "-f", "source[branch]=main", "-f", "source[path]=/"], "开启 GitHub Pages");
  }

  // 6. 等网站上线（通常 1 分钟左右）
  process.stdout.write("等待网站上线");
  for (let i = 0; i < 40; i++) {
    const r = await httpGet(`${url}published.txt?t=${Date.now()}`);
    if (r.status === 200 && r.body.trim() === publishId) {
      console.log(`\n\n发布成功：${url}\n仓库：https://github.com/${login}/${repo}`);
      logPublish(siteDir, `${new Date().toISOString().slice(0, 16).replace("T", " ")} · 账号 ${login} · 仓库 ${login}/${repo} · ${url} · 发布编号 ${publishId}`);
      return;
    }
    process.stdout.write(".");
    await sleep(6000);
  }
  console.log(`\n\n文件已经上传，但网站还没生效。通常几分钟内会好，稍后打开：${url}`);
  logPublish(siteDir, `${new Date().toISOString().slice(0, 16).replace("T", " ")} · 账号 ${login} · 仓库 ${login}/${repo} · ${url} · 发布编号 ${publishId}（上传后还没确认生效）`);
})().catch((e) => fail(String(e && e.message || e)));

// 在网站文件夹旁边的 _work/publish-log.md 里记一行；没有 _work/（比如直接发布 demo）就不记
function logPublish(siteDir, line) {
  const work = path.join(path.dirname(siteDir), "_work");
  if (!fs.existsSync(work)) return;
  const log = path.join(work, "publish-log.md");
  if (!fs.existsSync(log)) fs.writeFileSync(log, "# 发布记录\n\n由 publish_github_pages.js 自动写入。维护模式下次发布时，用这里记录的账号和仓库。\n\n");
  fs.appendFileSync(log, `- ${line}\n`);
  console.log(`已记录到 ${path.relative(process.cwd(), log)}`);
}
