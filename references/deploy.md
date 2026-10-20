# 发布：把网站变成一个公开链接

`site/` 文件夹是纯静态网站，不需要构建、不需要服务器。这份文件帮你和用户选方案，并完成发布。

平台的界面和规则经常变。按钮名称以写作时（2026 年 10 月）各平台官方文档为准；和用户看到的不一致时，按用户屏幕上的实际情况引导。

## 目录

1. 先选方案：给谁看
2. 发布前检查
3. 账号、登录和"交给 AI 的东西"
4. 默认方式：GitHub Pages
5. 没有 GitHub：EdgeOne Pages
6. 三种方案的详细说明
7. 自定义域名
8. 发布后检查
9. 以后更新网站
10. 对用户怎么说
11. 参考

---

## 1. 先选方案：给谁看

发布前问用户一个问题：

> 这个网站主要给谁看？
> ① 主要是德国或其他国家的 HR
> ② 国外和国内的人都要能打开（比如也想给家人或中资企业看）
> ③ 主要给国内的人看

| 方案 | 适合 | 用什么 | 要花钱吗 | 难度 |
|---|---|---|---|---|
| **① 海外为主**（默认） | 在德国、欧洲或其他国家求职 | **GitHub Pages**；没有 GitHub 就用 EdgeOne Pages | 免费 | 低 |
| **② 全球都能打开** | 海外求职，但也想让国内的人稳定打开 | 自己的域名 + EdgeOne Pages（全球可用区，不含中国大陆） | 域名每年约几欧元到十几欧元 | 中 |
| **③ 国内为主** | 主要投国内岗位 | 自己的域名 + 国内服务器 + **ICP 备案** | 域名费用；备案本身一般不收费 | 高，备案通常要几周 |

几条要先跟用户说清楚的事实：

- **免费平台给的默认网址，在中国大陆都不稳定**：`github.io`、`pages.dev`、`netlify.app` 时好时坏，`vercel.app` 基本打不开；EdgeOne Pages 的默认网址在中国大陆只能通过 3 小时后失效的预览链接访问；腾讯云 CloudBase 的默认网址官方定位为开发测试用，有访问频率限制，访客还会先看到一个提醒页面。
- 所以**想让国内稳定打开，一定需要自己的域名**（方案 ② 或 ③）。
- 用户选 ①、又想给国内家人看：网站照常发布；另外打开网站的"速览"页，点"打印 / 存为 PDF"，把 PDF 发给家人。

不要承诺"国内一定能打开"。选了 ② 或 ③ 的，发布后请国内的人实际打开试一次。

## 2. 发布前检查

- [ ] 运行过 `node scripts/check_content.js 我的简历网站/site/content.js`，没有错误（不能运行时按 `content-model.md` 第 5 节人工检查）
- [ ] `site/` 的**最外层**直接就是 `index.html`
- [ ] `site/` 里没有不公开的文件、`preview-*.html` 预览文件、`_work/`
- [ ] 文件名只用英文字母、数字和连字符
- [ ] `index.html` 里的标题、描述、分享预览标签已经改成用户的内容
- [ ] 需要用户手动上传时，告诉用户要上传的文件夹的**完整位置**（例如 `/Users/xxx/我的简历网站/site`），能替用户打开就直接打开；提醒用户**只拖 `site` 这一个文件夹，不要拖外面的 `我的简历网站`**

## 3. 账号、登录和"交给 AI 的东西"

- **注册和登录由用户自己完成。** 不要替用户输入密码、验证码，也不要替用户点"同意条款"。
- **不要让用户把密码、令牌（token）、验证码发到对话里。** 需要命令行登录时，请用户自己在终端里运行登录命令（`gh auth login` 或 `edgeone login`），登录信息会安全地保存在用户电脑上，之后你就能用命令发布。
- 用户手动上传时，**唯一需要交给你的是最后的网址**，你用它做第 8 节的检查。

## 4. 默认方式：GitHub Pages

下载这个 skill 的用户通常已经有 GitHub 账号。GitHub Pages 免费、稳定，网址是 `https://用户名.github.io/`。能运行命令的 AI 可以一条命令完成发布和以后的每次更新。

### 4.1 准备 GitHub（每台电脑只需一次）

先检查：在终端运行 `gh auth status`。显示已登录，就直接跳到 4.2。

否则请用户完成以下几步（你可以把命令发给用户，但**登录必须由用户自己做**）：

1. 有 GitHub 账号（没有就在 github.com 免费注册；不想注册就改用第 5 节）。
2. 安装 git 和 gh（GitHub 官方命令行工具）：
   - Mac：有 Homebrew 的话运行 `brew install git gh`；没有的话，从 `https://cli.github.com` 下载 gh 安装包，git 在第一次运行 `git` 时系统会提示安装
   - Windows：运行 `winget install --id Git.Git` 和 `winget install --id GitHub.cli`，或者从 `https://git-scm.com` 和 `https://cli.github.com` 下载安装包
3. 用户在终端运行 `gh auth login`，按提示选择：GitHub.com → HTTPS → 用浏览器登录（Login with a web browser）。终端会显示一个 8 位验证码，用户在打开的网页里输入它并授权。
4. 再运行 `gh auth status`，确认已登录。

### 4.2 自动发布

先确认要发布到哪个 GitHub 账号：`gh auth status` 会列出所有登录的账号和当前激活的账号。登录了多个账号时，问用户用哪个；需要切换时，请用户自己运行 `gh auth switch --user 用户名`。

然后在本技能文件夹里运行（`--account` 会确认当前账号就是这个，不一致就停止）：

```bash
node scripts/publish_github_pages.js 我的简历网站/site --account 用户名
```

（路径换成用户网站文件夹的实际位置。）脚本会：

1. 先运行内容检查，有错误就停止
2. 选仓库：优先用 `用户名.github.io`（网址最短：`https://用户名.github.io/`）。这个名字已经被用户别的网站占用时，改用 `resume`（网址：`https://用户名.github.io/resume/`）。也可以用 `--repo 名字` 指定
3. 只覆盖由这个脚本创建的仓库；同名仓库不是它创建的，就停止，不会碰
4. 用 GitHub 提供的隐私邮箱提交，不会把用户的真实邮箱写进公开仓库
5. 每次只上传一个全新的版本，覆盖旧版本，所以以前发布过、后来删掉的内容不会留在公开的历史记录里
6. 打开 GitHub Pages，等新版本真正上线后，打印网址（通常 1 分钟左右）

把打印出来的网址发给用户，然后做第 8 节的检查。

**能运行 git 和 gh、但没有 Node.js 时**，手动执行同样的步骤（把 `<用户名>`、`<仓库名>` 换掉，在 `site` 文件夹的一份**临时副本**里操作，不要在用户的 `site` 文件夹里直接初始化 git）：

```bash
gh api user --jq '.login, .id'                     # 拿到用户名和数字 id
git init -b main
git config user.name "<用户名>"
git config user.email "<id>+<用户名>@users.noreply.github.com"
touch .nojekyll .resume-portfolio-site
git add -A && git commit -m "Publish website"
gh repo create <用户名>/<仓库名> --public          # 仓库已存在就跳过
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -f https://github.com/<用户名>/<仓库名>.git HEAD:main
gh api -X POST repos/<用户名>/<仓库名>/pages -f 'source[branch]=main' -f 'source[path]=/'   # 第一次才需要
```

`push -f` 会覆盖仓库里原有的内容，执行前确认这个仓库是专门放这个网站的。

### 4.3 不能运行命令时：网页上传

1. 用户在 GitHub 网页上新建一个**公开**仓库，名字用 `用户名.github.io`。
2. 在仓库页面点 **Add file → Upload files**，把 `site` 文件夹**里面的**所有文件和文件夹拖进去（不是拖 `site` 本身），点 **Commit changes**。
3. 进入 **Settings → Pages**，Source 选 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`，保存。
4. 一两分钟后打开 `https://用户名.github.io/`。

注意：网页上传的方式会保留每一次修改的历史。以前上传过、后来删掉的内容（比如电话号码），别人仍然能在历史记录里找到。第一次上传前就要确认内容干净；万一传错了，最稳妥的做法是删掉整个仓库重新建。

## 5. 没有 GitHub：EdgeOne Pages

腾讯云的静态托管平台，国际站 `pages.edgeone.ai`。用户不想用 GitHub 时用它；方案 ② 也用它。

### 5.1 用户手动上传（最简单）

把下面的步骤发给用户：

1. 打开 EdgeOne Pages 国际站，用邮箱注册并登录。
2. 点 **Create Project**（创建项目），选 **Direct Upload**（直接上传）。
3. **Project Name**（项目名）填姓名，例如 `mei-chen`。
4. **Acceleration Region**（加速区域）选**全球可用区（不含中国大陆）**（界面是英文时，选名称里带 "Global" 和 "excluding Chinese mainland" 的那一项）。
5. 把 `site` 文件夹拖进上传区域（你告诉用户完整位置）。
6. 点 **Start Deployment**（开始部署），完成后**把网址复制发给 AI**。

用户需要交给你的只有第 6 步的网址。

### 5.2 用命令行发布（能运行终端的 AI）

EdgeOne 有官方命令行工具，可以像 GitHub 一样登录一次、之后由你发布。命令以官方说明为准，先运行 `edgeone -h` 确认：

1. 安装（需要 Node.js）：`npm install -g edgeone`
2. **用户自己**在终端运行：`edgeone login --site global`，在打开的网页里登录
3. 你运行：`edgeone makers deploy 我的简历网站/site -n <项目名> -e production`
4. 命令要求提供 API 令牌（`-t`）时：请用户自己在 EdgeOne 控制台创建令牌（建议设置过期时间），并自己把它设成环境变量 `EDGEONE_API_TOKEN`。**不要让用户把令牌粘贴到对话里**，它有账号级别的权限。

环境里接入了 EdgeOne Pages 的官方 MCP 工具时，也可以用它部署 `site` 文件夹，它会返回公开网址。

## 6. 三种方案的详细说明

### 方案 ①：海外为主（默认）

- 用 GitHub Pages（第 4 节）；没有 GitHub 用 EdgeOne Pages（第 5 节）。Netlify、Cloudflare Pages 也可以，但 Netlify 必须先注册登录再上传（不登录上传的网站会很快过期并被加密码）。
- 在德国、欧洲和大部分国家访问都很稳定。国内可能打不开或很慢。

### 方案 ②：全球都能打开

1. 用户买一个自己的域名（第 7 节）。
2. 用 EdgeOne Pages 发布（第 5 节），加速区域选**全球可用区（不含中国大陆）**。
3. 在项目设置里绑定这个域名（第 7 节）。

这样不需要 ICP 备案。国内的访客会连到中国大陆以外（比如香港）的节点，通常能打开，速度因地区和网络而异，所以一定要请国内的人实际试一次。

也可以用 GitHub Pages 加自定义域名，但国内访问的稳定性一般不如 EdgeOne Pages。

### 方案 ③：国内为主

在中国大陆的服务器上发布网站，**绑定域名前必须完成 ICP 备案**。这是中国的规定，所有在国内服务器上的网站都一样。

- **备案一般需要**：中国居民身份证、国内手机号、一个已经实名认证的域名、在提供备案服务的云服务商（比如腾讯云）那里有可用于备案的资源，按要求完成人脸核验等步骤。具体要求以服务商和各省通信管理局的最新规定为准。
- **时间**：审核通常要几周，期间网站不能用这个域名访问。
- **平台**：EdgeOne Pages 选择含中国大陆的加速区域，或者腾讯云 CloudBase 静态网站托管，然后绑定已备案的域名。
- 平台的默认网址在国内不能长期使用（见第 1 节），不要把它发给 HR。

用户觉得太麻烦，就改用方案 ②。

## 7. 自定义域名

**怎么做**：

1. 用户在任意域名注册商买一个域名，比如 `meichen.de`、`meichen.com`。每年大约几欧元到十几欧元，以注册商实际价格为准。方案 ③ 的域名要在国内服务商实名认证。
2. 在发布平台里添加这个域名：
   - GitHub Pages：仓库 **Settings → Pages → Custom domain**，填域名，保存
   - EdgeOne Pages：项目设置里的 **Custom Domain**（自定义域名）
3. 平台会说明要添加的 DNS 记录（通常是一条 CNAME，比如 GitHub Pages 的 `www` 指向 `用户名.github.io`）。用户到域名注册商的 DNS 设置里添加。
4. 等待生效（几分钟到几小时），平台会自动配置 HTTPS。

## 8. 发布后检查

- [ ] 用手机打开网址，首页、一个故事页、速览页都看一遍
- [ ] 切换每种语言看一遍
- [ ] 点开一张图片、一个文件，确认能正常打开
- [ ] 把网址发到自己的邮箱或 LinkedIn 私信里，看分享预览的标题和描述对不对
- [ ] 由你来做：打开 `网址/content.js`，确认里面没有电话、住址、出生日期、成绩等用户不想公开的信息
- [ ] 方案 ② 和 ③：请国内的人用手机流量打开一次

## 9. 以后更新网站

发布脚本会给网站的脚本和样式加上版本号，访客通常马上就能看到新版本。用户说"怎么还是旧的"时，先请TA强制刷新（Mac：Cmd+Shift+R；Windows：Ctrl+F5），再检查是否真的发布成功。


1. 改 `site/` 里的内容（通常只改 `content.js` 和图片），再运行一次内容检查。
2. 重新发布到**同一个地方**，网址不变：
   - GitHub Pages：再运行一次 `node scripts/publish_github_pages.js 我的简历网站/site`（网页上传的，覆盖上传修改过的文件）
   - EdgeOne Pages：项目的 **Build & Deploy** 页面 → **New Deployment** → 拖入 `site` 文件夹；用命令行的，再运行一次部署命令
3. 告诉用户把网址放在：简历页眉、LinkedIn（精选栏和联系信息）、求职信签名、邮件签名。

## 10. 对用户怎么说

技术词尽量不说；非说不可时用这些说法：

| 词 | 对用户的说法 |
|---|---|
| 部署 / 发布 | 把网站放到网上，生成一个别人能打开的网址 |
| GitHub Pages / EdgeOne Pages | 免费帮你存放网站的服务 |
| 终端 | 电脑上输入命令的窗口（Mac 叫"终端"，Windows 叫"终端"或 PowerShell） |
| `gh auth login` | 在终端里登录 GitHub，只需要做一次，之后 AI 就能帮你发布 |
| 仓库 | GitHub 上存放网站文件的地方 |
| 域名 | 你自己的网址，比如 `meichen.de`，每年几欧元到十几欧元 |
| ICP 备案 | 中国对放在国内服务器上的网站的登记手续，需要身份证、国内手机号，通常要几周 |
| 加速区域 | 网站存放在哪些地区的服务器上 |
| 令牌（token） | 一种代替密码的登录凭证，和密码一样不能发给别人 |

## 11. 参考

- GitHub Pages：<https://docs.github.com/pages>
- GitHub CLI（gh）：<https://cli.github.com>
- EdgeOne Pages 直接上传：<https://pages.edgeone.ai/document/direct-upload>
- EdgeOne Pages 域名说明（中国大陆访问限制、备案要求）：<https://pages.edgeone.ai/document/domain-overview>
- EdgeOne 命令行工具：<https://www.npmjs.com/package/edgeone>
- EdgeOne Pages MCP：<https://github.com/TencentEdgeOne/edgeone-pages-mcp>
- 腾讯云 CloudBase 静态网站托管：<https://cloud.tencent.com/document/product/876/46900>
- Netlify Drop 的规则变化：<https://www.netlify.com/blog/thirteen-years-of-netlify-drop>
