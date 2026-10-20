// 页面渲染：读取 content.js 里的 window.SITE，按 # 后面的路径显示对应页面。
// 一般不需要改这个文件。内容改 content.js，外观改 assets/styles/ 里的风格文件。
// 网址格式：#/<语言>/<页面>/<参数>，例如 #/de/story/muster-dashboard。

(function () {
  "use strict";

  var SITE = window.SITE || {};
  var META = SITE.meta || {};
  var LANGS = (META.languages && META.languages.length ? META.languages : ["en"]).slice(0, 3);
  var DEFAULT_LANG = LANGS[0];
  var RTL_LANGS = ["ar", "he", "fa", "ur"];
  var STYLES = ["editorial", "swiss-minimal", "bento", "terminal-dark", "warm-portfolio", "academic"];
  var LANG_LABELS = {
    de: "DE", en: "EN", zh: "中文", "zh-Hant": "繁中", fr: "FR", es: "ES", it: "IT", nl: "NL",
    pl: "PL", pt: "PT", tr: "TR", ru: "RU", uk: "UK", ja: "日本語", ko: "한국어",
    ar: "العربية", he: "עברית", fa: "فارسی", ur: "اردو"
  };

  var L = DEFAULT_LANG;
  var app = document.getElementById("app");
  var firstRender = true;

  // ---------- HTML 拼接与转义 ----------

  function Raw(s) { this.s = s; }
  function raw(s) { return new Raw(s); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function str(v) {
    if (v == null || v === false) return "";
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(str).join("");
    return esc(v);
  }
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < strings.length; i++) out += str(arguments[i]) + strings[i];
    return raw(out);
  }
  function safeUrl(u) {
    if (!u) return "";
    u = String(u).trim();
    return /^(https?:|mailto:|tel:|#|\.{0,2}\/|[\w-]+\/|[\w.-]+\.\w+$)/i.test(u) && !/^javascript:/i.test(u) ? u : "";
  }

  // ---------- 多语言 ----------

  function T(v) {
    if (v == null) return "";
    if (typeof v !== "object" || Array.isArray(v)) return v;
    if (v[L] != null) return v[L];
    if (v[DEFAULT_LANG] != null) return v[DEFAULT_LANG];
    var k = Object.keys(v)[0];
    return k ? v[k] : "";
  }
  function U(key, vars) {
    var base = L.split("-")[0];
    var pick = function (src) { return src && (src[L] && src[L][key] != null ? src[L][key] : src[base] && src[base][key] != null ? src[base][key] : null); };
    var s = pick(SITE.ui) || pick(window.UI) || (window.UI && window.UI.en && window.UI.en[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-").map(Number);
    var opts = { year: "numeric", timeZone: "UTC" };
    if (p[1]) opts.month = "short";
    if (p[2]) opts.day = "numeric";
    try { return new Intl.DateTimeFormat(L, opts).format(new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1))); }
    catch (e) { return d; }
  }
  function period(start, end, expected) {
    var b = end ? fmtDate(end) : expected ? U("expected_until", { date: fmtDate(expected) }) : U("present");
    return start ? fmtDate(start) + " – " + b : b;
  }
  function langName(code) {
    try { return new Intl.DisplayNames([code], { type: "language" }).of(code); } catch (e) { return code; }
  }

  // ---------- 数据索引 ----------

  function list(name) { return Array.isArray(SITE[name]) ? SITE[name] : []; }
  var INDEX = {};
  ["work", "education", "projects", "stories", "skills", "certificates", "awards", "publications", "quotes", "documents"].forEach(function (s) {
    INDEX[s] = {};
    list(s).forEach(function (x) { if (x && x.id) INDEX[s][x.id] = x; });
  });
  function get(section, id) { return id ? INDEX[section][id] : null; }
  function parentOf(id) { return get("work", id) || get("education", id) || get("projects", id); }
  function orgName(p) { return p ? (p.name != null ? T(p.name) : p.institution || "") : ""; }

  var stories = list("stories");
  var featured = stories.filter(function (s) { return s.featured; });
  var layout = paramOr("layout", ["compact", "editorial"], META.layout) || (stories.length >= 4 ? "editorial" : "compact");
  var visibleQuotes = list("quotes").filter(function (q) { return q.consent === "yes" || q.consent === "not-needed"; });
  var visibleDocs = list("documents").filter(function (d) { return d.visibility && d.visibility !== "private"; });

  function skillUses(skillId) {
    return {
      stories: stories.filter(function (s) { return (s.skills || []).indexOf(skillId) >= 0; }),
      entries: list("work").concat(list("projects")).filter(function (w) { return (w.skills || []).indexOf(skillId) >= 0; })
    };
  }

  var HAS = {
    experience: list("work").length + list("education").length + list("projects").length + list("publications").length > 0,
    skills: list("skills").length > 0,
    documents: list("certificates").length + list("awards").length + visibleDocs.length + list("languages").length > 0,
    about: !!SITE.about || visibleQuotes.length > 0
  };
  var DEFAULT_SECTIONS = ["stories", "experience", "publications", "skills", "documents", "about"];
  var SECTIONS = (Array.isArray(META.sections) && META.sections.length ? META.sections : DEFAULT_SECTIONS);

  function paramOr(name, allowed, fallback) {
    var v = new URLSearchParams(location.search).get(name);
    return v && allowed.indexOf(v) >= 0 ? v : fallback;
  }

  // ---------- 路由 ----------

  function parseHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    if (!parts.length || LANGS.indexOf(parts[0]) < 0) return { lang: DEFAULT_LANG, page: "home", param: null };
    return { lang: parts[0], page: parts[1] || "home", param: parts[2] || null };
  }
  function href(page, param, lang) {
    lang = lang || L;
    if (!page || page === "home") return "#/" + lang + "/";
    return "#/" + [lang, page, param].filter(Boolean).map(encodeURIComponent).join("/");
  }

  // ---------- 小组件 ----------

  function sectionTitle(id, text) { return html`<h2 class="section-title" id="${id}-title">${text}</h2>`; }

  function img(src, alt, cls, attrs) {
    var u = safeUrl(src);
    if (!u) return "";
    return html`<img class="${cls || ""}" src="${u}" alt="${alt || ""}" loading="lazy" decoding="async" ${raw(attrs || "")}>`;
  }

  function metricsList(ms, max) {
    ms = (ms || []).slice(0, max || 3);
    if (!ms.length) return "";
    return html`<dl class="metrics">${ms.map(function (m) {
      return html`<div class="metric"><dt class="metric-value">${m.value}</dt><dd class="metric-label">${T(m.label)}</dd></div>`;
    })}</dl>`;
  }

  function skillTags(ids) {
    var items = (ids || []).map(function (id) { return get("skills", id); }).filter(Boolean);
    if (!items.length) return "";
    return html`<ul class="tags">${items.map(function (s) {
      return html`<li><a class="tag" href="${href("skills", s.id)}">${s.name}</a></li>`;
    })}</ul>`;
  }

  function storyKicker(s) {
    var p = parentOf(s.parent);
    var bits = [orgName(p), s.kind ? U("kind_" + s.kind) : ""].filter(Boolean);
    return bits.join(" · ");
  }

  function firstImage(s) {
    return (s.media || []).filter(function (m) { return (m.type || "image") === "image"; })[0];
  }

  function storyCard(s, opts) {
    opts = opts || {};
    var im = opts.noImage ? null : firstImage(s);
    return html`<article class="card story-card${im ? " has-image" : ""}">
      <a class="card-link" href="${href("story", s.id)}">
        ${im ? html`<div class="card-media">${img(im.src, T(im.alt), "card-img")}</div>` : ""}
        <div class="card-body">
          <p class="kicker">${storyKicker(s)}</p>
          <h3 class="card-title">${T(s.title)}</h3>
          ${s.standfirst ? html`<p class="card-text">${T(s.standfirst)}</p>` : ""}
          ${metricsList(s.metrics, 2)}
          <span class="card-more">${U("view_story")} <span aria-hidden="true" class="arrow">→</span></span>
        </div>
      </a>
    </article>`;
  }

  function storyLinks(ids) {
    var items = (ids || []).map(function (id) { return get("stories", id); }).filter(Boolean);
    if (!items.length) return "";
    return html`<ul class="inline-links">${items.map(function (s) {
      return html`<li><a href="${href("story", s.id)}">${T(s.title)} <span aria-hidden="true" class="arrow">→</span></a></li>`;
    })}</ul>`;
  }

  // ---------- 页头和页脚 ----------

  function navItems() {
    var items = [];
    ["experience", "skills", "documents", "about"].forEach(function (p) { if (HAS[p]) items.push(p); });
    items.push("cv");
    return items;
  }

  function header(route) {
    var b = SITE.basics || {};
    return html`<header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" href="${href("home")}">${b.name || ""}</a>
        <nav class="site-nav" aria-label="${U("nav_label")}">
          <ul>${navItems().map(function (p) {
            var cur = route.page === p;
            return html`<li><a href="${href(p)}"${raw(cur ? ' aria-current="page"' : "")}>${U("nav_" + p)}</a></li>`;
          })}</ul>
        </nav>
        <div class="header-tools">
          ${LANGS.length > 1 ? html`<ul class="lang-switch" aria-label="${U("language")}">${LANGS.map(function (code) {
            return html`<li><a href="${href(route.page, route.param, code)}" hreflang="${code}" lang="${code}" title="${langName(code)}"${raw(code === L ? ' aria-current="true"' : "")}>${LANG_LABELS[code] || code.toUpperCase()}</a></li>`;
          })}</ul>` : ""}
          <button class="icon-btn theme-toggle" type="button" data-action="theme" aria-label="${U("theme_toggle")}" title="${U("theme_toggle")}">
            <span aria-hidden="true">◐</span>
          </button>
        </div>
      </div>
    </header>`;
  }

  function footer() {
    var b = SITE.basics || {};
    return html`<footer class="site-footer">
      <div class="wrap footer-inner">
        <span>© ${new Date().getFullYear()} ${b.name || ""}</span>
        ${META.updated ? html`<span>${U("updated")}: ${fmtDate(META.updated)}</span>` : ""}
      </div>
    </footer>`;
  }

  // ---------- 首页 ----------

  function hero() {
    var b = SITE.basics || {};
    var a = b.availability;
    var facts = [];
    if (b.location && b.location.city) facts.push({ k: U("location"), v: b.location.city });
    if (a) {
      var av = [a.type, a.from ? U("available_from", { date: fmtDate(a.from) }) : "", T(a.hours)].filter(Boolean).join(" · ");
      if (av) facts.push({ k: U("available"), v: av });
    }
    var langs = list("languages").map(function (l) {
      return T(l.language) + " " + (l.cefr === "native" ? U("native") : l.cefr || "");
    });
    if (langs.length) facts.push({ k: U("languages"), v: langs.join(" · ") });

    var cv = b.cv ? safeUrl(b.cv[L] || b.cv[DEFAULT_LANG] || b.cv[Object.keys(b.cv)[0]]) : "";
    var email = b.email && b.email.show !== false ? b.email.value : "";

    return html`<section class="hero" aria-labelledby="hero-name">
      <div class="wrap hero-inner">
        ${b.image ? html`<div class="hero-photo">${img(b.image, b.name, "avatar")}</div>` : ""}
        <div class="hero-text">
          <h1 class="hero-name" id="hero-name">${b.name || ""}</h1>
          ${b.label ? html`<p class="hero-label">${T(b.label)}</p>` : ""}
          ${b.headline ? html`<p class="hero-headline">${T(b.headline)}</p>` : ""}
          ${facts.length ? html`<dl class="facts">${facts.map(function (f) {
            return html`<div class="fact"><dt>${f.k}</dt><dd>${f.v}</dd></div>`;
          })}</dl>` : ""}
          ${a && a.note ? html`<p class="hero-note">${T(a.note)}</p>` : ""}
          <div class="actions">
            ${email ? html`<a class="btn btn-primary" href="${"mailto:" + email}">${U("contact_me")}</a>` : html`<a class="btn btn-primary" href="${href("home")}" data-scroll="contact">${U("contact_me")}</a>`}
            ${cv ? html`<a class="btn" href="${cv}" target="_blank" rel="noopener">${U("download_cv")}</a>` : ""}
            <a class="btn btn-quiet" href="${href("cv")}">${U("quick_view")}</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  function featuredSection() {
    var feat = featured.length ? featured : stories.slice(0, 3);
    if (!feat.length) return "";
    var rest = stories.filter(function (s) { return feat.indexOf(s) < 0; });
    return html`<section class="section section-stories" id="stories" aria-labelledby="stories-title">
      <div class="wrap">
        ${sectionTitle("stories", U("featured"))}
        <div class="cards cards-featured">${feat.map(function (s) { return storyCard(s); })}</div>
        ${rest.length ? html`<h3 class="subhead">${U("more_stories")}</h3>
          <div class="cards cards-compact">${rest.map(function (s) { return storyCard(s, { noImage: true }); })}</div>` : ""}
      </div>
    </section>`;
  }

  function timelineEntries(kinds) {
    var out = [];
    if (kinds.indexOf("work") >= 0) list("work").forEach(function (w) {
      out.push({ kind: "work", start: w.startDate, end: w.endDate, sortEnd: w.endDate || "9999", item: w });
    });
    if (kinds.indexOf("education") >= 0) list("education").forEach(function (e) {
      out.push({ kind: "education", start: e.startDate, end: e.endDate, expected: e.expectedEnd, sortEnd: e.endDate || "9999", item: e });
    });
    if (kinds.indexOf("projects") >= 0) list("projects").forEach(function (p) {
      out.push({ kind: "project", start: p.startDate, end: p.endDate, sortEnd: p.endDate || "9999", item: p });
    });
    if (kinds.indexOf("awards") >= 0) list("awards").forEach(function (a) {
      out.push({ kind: "award", start: null, end: a.date, sortEnd: a.date || "0000", item: a });
    });
    return out.sort(function (x, y) {
      return (y.sortEnd || "").localeCompare(x.sortEnd || "") || (y.start || "").localeCompare(x.start || "");
    });
  }

  function timelineItem(e) {
    var it = e.item;
    if (e.kind === "work") {
      return html`<li class="tl-item tl-work">
        <p class="tl-date">${period(it.startDate, it.endDate)}</p>
        <div class="tl-body">
          <h3 class="tl-title">${T(it.position)} <span class="tl-org">· ${it.url ? html`<a href="${safeUrl(it.url)}" target="_blank" rel="noopener">${it.name}</a>` : it.name}</span></h3>
          <p class="tl-meta">${[it.type, it.location].filter(Boolean).join(" · ")}</p>
          ${it.summary ? html`<p>${T(it.summary)}</p>` : ""}
          ${(it.highlights || []).length ? html`<ul class="tl-highlights">${it.highlights.map(function (h) { return html`<li>${T(h)}</li>`; })}</ul>` : ""}
          ${storyLinks(it.stories)}
        </div>
      </li>`;
    }
    if (e.kind === "education") {
      var score = it.score && it.score.show ? it.score.value : "";
      return html`<li class="tl-item tl-education">
        <p class="tl-date">${period(it.startDate, it.endDate, it.expectedEnd)}</p>
        <div class="tl-body">
          <h3 class="tl-title">${[T(it.studyType), T(it.area)].filter(Boolean).join(", ")} <span class="tl-org">· ${it.url ? html`<a href="${safeUrl(it.url)}" target="_blank" rel="noopener">${it.institution}</a>` : it.institution}</span></h3>
          ${score ? html`<p class="tl-meta">${U("grade")}: ${score}</p>` : ""}
          ${it.thesis ? html`<p><span class="label">${U("thesis")}:</span> ${it.thesis.story && get("stories", it.thesis.story) ? html`<a href="${href("story", it.thesis.story)}">${T(it.thesis.title)}</a>` : T(it.thesis.title)}${it.thesis.grade ? " (" + it.thesis.grade + ")" : ""}</p>` : ""}
          ${(it.courses || []).length ? html`<p><span class="label">${U("courses")}:</span> ${it.courses.map(function (c) { return T(c.name) + (c.grade ? " (" + c.grade + ")" : ""); }).join(" · ")}</p>` : ""}
          ${storyLinks((it.stories || []).filter(function (id) { return !(it.thesis && it.thesis.story === id); }))}
        </div>
      </li>`;
    }
    if (e.kind === "project") {
      return html`<li class="tl-item tl-project">
        <p class="tl-date">${period(it.startDate, it.endDate)}</p>
        <div class="tl-body">
          <h3 class="tl-title">${safeUrl(it.url) ? html`<a href="${safeUrl(it.url)}" target="_blank" rel="noopener">${T(it.name)}</a>` : T(it.name)} <span class="tl-org">· ${U("kind_project")}</span></h3>
          ${it.description ? html`<p>${T(it.description)}</p>` : ""}
          ${storyLinks(it.stories)}
        </div>
      </li>`;
    }
    return html`<li class="tl-item tl-award">
      <p class="tl-date">${fmtDate(it.date)}</p>
      <div class="tl-body">
        <h3 class="tl-title">${T(it.title)}${it.awarder ? html` <span class="tl-org">· ${it.awarder}</span>` : ""}</h3>
        ${it.summary ? html`<p>${T(it.summary)}</p>` : ""}
        ${it.story ? storyLinks([it.story]) : ""}
      </div>
    </li>`;
  }

  function experienceSection(asPage, kinds) {
    kinds = kinds || (SECTIONS.indexOf("education") >= 0 ? ["work", "projects", "awards"] : ["work", "education", "projects", "awards"]);
    var entries = timelineEntries(kinds);
    if (!entries.length) return "";
    var H = asPage ? "h1" : "h2";
    return html`<section class="section section-experience" id="experience" aria-labelledby="experience-title">
      <div class="wrap">
        ${raw("<" + H + ' class="section-title" id="experience-title">' + esc(U("experience")) + "</" + H + ">")}
        <ol class="timeline">${entries.map(timelineItem)}</ol>
      </div>
    </section>`;
  }

  function publicationsSection() {
    var pubs = list("publications").slice().sort(function (a, b) { return (b.releaseDate || "").localeCompare(a.releaseDate || ""); });
    if (!pubs.length) return "";
    return html`<section class="section section-publications" id="publications" aria-labelledby="publications-title">
      <div class="wrap">
        ${sectionTitle("publications", U("publications"))}
        <ul class="plain-list pub-list">${pubs.map(function (p) {
          var title = safeUrl(p.url) ? html`<a href="${safeUrl(p.url)}" target="_blank" rel="noopener">${T(p.name)}</a>` : T(p.name);
          return html`<li><strong>${title}</strong><br><span class="muted">${[p.publisher, fmtDate(p.releaseDate)].filter(Boolean).join(" · ")}</span>${p.summary ? html`<br>${T(p.summary)}` : ""}${p.story && get("stories", p.story) ? html` <a class="small-link" href="${href("story", p.story)}">${U("view_story")} →</a>` : ""}</li>`;
        })}</ul>
      </div>
    </section>`;
  }

  function educationSection() {
    var entries = timelineEntries(["education"]);
    if (!entries.length) return "";
    return html`<section class="section section-education" id="education" aria-labelledby="education-title">
      <div class="wrap">${sectionTitle("education", U("education"))}<ol class="timeline">${entries.map(timelineItem)}</ol></div>
    </section>`;
  }

  function skillsBlock() {
    var groups = {};
    list("skills").forEach(function (s) { (groups[s.category || "other"] = groups[s.category || "other"] || []).push(s); });
    return html`<div class="skill-groups">${Object.keys(groups).map(function (cat) {
      var label = U("cat_" + cat);
      return html`<div class="skill-group">
        <h3 class="skill-cat">${label === "cat_" + cat ? cat : label}</h3>
        <ul class="tags">${groups[cat].map(function (s) {
          var n = skillUses(s.id).stories.length;
          return html`<li><a class="tag" href="${href("skills", s.id)}">${s.name}${n ? html` <span class="tag-count" title="${U("stories_count", { n: n })}">${n}</span>` : ""}</a></li>`;
        })}</ul>
      </div>`;
    })}</div>`;
  }

  function skillsSection(asPage) {
    if (!HAS.skills) return "";
    var H = asPage ? "h1" : "h2";
    return html`<section class="section section-skills" id="skills" aria-labelledby="skills-title">
      <div class="wrap">
        ${raw("<" + H + ' class="section-title" id="skills-title">' + esc(U("skills")) + "</" + H + ">")}
        ${skillsBlock()}
      </div>
    </section>`;
  }

  function docKindLabel(d) { return d.kind ? U("doc_" + d.kind) : ""; }

  function docCard(d) {
    var isPublic = d.visibility === "public" && safeUrl(d.file);
    var isImage = isPublic && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(d.file);
    var badge = d.visibility === "on-request" ? U("on_request") : d.visibility === "summary" ? U("summary_only") : "";
    var thumb = d.thumbnail ? img(d.thumbnail, "", "doc-thumb" + (d.visibility === "public" ? "" : " is-muted")) : html`<span class="doc-icon" aria-hidden="true">▤</span>`;
    var inner = html`<span class="doc-media">${thumb}</span>
      <span class="doc-body">
        <span class="kicker">${docKindLabel(d)}${d.date ? " · " + fmtDate(d.date) : ""}</span>
        <span class="doc-title">${T(d.title)}</span>
        ${badge ? html`<span class="badge">${badge}</span>` : ""}
      </span>`;
    if (isImage) return html`<li class="doc-card"><button type="button" class="doc-link" data-lightbox="${d.file}" data-caption="${T(d.title)}" data-group="docs">${inner}</button></li>`;
    if (isPublic) return html`<li class="doc-card"><a class="doc-link" href="${d.file}" target="_blank" rel="noopener">${inner}</a></li>`;
    return html`<li class="doc-card"><button type="button" class="doc-link" data-sheet="${d.id}">${inner}</button></li>`;
  }

  function documentsSection(asPage) {
    if (!HAS.documents) return "";
    var H = asPage ? "h1" : "h2";
    var langs = list("languages"), certs = list("certificates"), awards = list("awards");
    return html`<section class="section section-documents" id="documents" aria-labelledby="documents-title">
      <div class="wrap">
        ${raw("<" + H + ' class="section-title" id="documents-title">' + esc(U("documents")) + "</" + H + ">")}
        <div class="doc-columns">
          ${langs.length ? html`<div class="doc-block"><h3 class="subhead">${U("languages")}</h3>
            <ul class="plain-list">${langs.map(function (l) {
              var c = get("certificates", l.certificate);
              return html`<li><strong>${T(l.language)}</strong> — ${l.cefr === "native" ? U("native") : l.cefr || ""}${c ? html` <span class="muted">(${c.name}${c.level ? " " + c.level : ""})</span>` : ""}${l.use ? html`<br><span class="muted">${T(l.use)}</span>` : ""}</li>`;
            })}</ul></div>` : ""}
          ${certs.length ? html`<div class="doc-block"><h3 class="subhead">${U("certificates")}</h3>
            <ul class="plain-list">${certs.map(function (c) {
              return html`<li><strong>${c.name}</strong>${c.level ? " · " + c.level : ""}<br><span class="muted">${[c.issuer, fmtDate(c.date)].filter(Boolean).join(" · ")}</span>${c.verifyUrl ? html` <a class="small-link" href="${safeUrl(c.verifyUrl)}" target="_blank" rel="noopener">${U("verify")} ↗</a>` : ""}</li>`;
            })}</ul></div>` : ""}
          ${awards.length ? html`<div class="doc-block"><h3 class="subhead">${U("awards")}</h3>
            <ul class="plain-list">${awards.map(function (a) {
              return html`<li><strong>${T(a.title)}</strong><br><span class="muted">${[a.awarder, fmtDate(a.date)].filter(Boolean).join(" · ")}</span>${a.summary ? html`<br>${T(a.summary)}` : ""}${a.story && get("stories", a.story) ? html` <a class="small-link" href="${href("story", a.story)}">${U("view_story")} →</a>` : ""}</li>`;
            })}</ul></div>` : ""}
        </div>
        ${visibleDocs.length ? html`<h3 class="subhead">${U("files")}</h3><ul class="doc-grid">${visibleDocs.map(docCard)}</ul>` : ""}
      </div>
    </section>`;
  }

  function quoteBlock(q) {
    return html`<figure class="quote">
      <blockquote lang="${q.original && T(q.text) === (q.text && q.text[q.original]) ? q.original : L}"><p>${T(q.text)}</p></blockquote>
      <figcaption>— ${q.author}${q.authorTitle ? html`, <span class="muted">${T(q.authorTitle)}</span>` : ""}</figcaption>
    </figure>`;
  }

  function paragraphs(text) {
    return String(T(text) || "").split(/\n\s*\n/).filter(Boolean).map(function (p) { return html`<p>${p}</p>`; });
  }

  function aboutSection(asPage) {
    if (!HAS.about) return "";
    var a = SITE.about || {};
    var H = asPage ? "h1" : "h2";
    return html`<section class="section section-about" id="about" aria-labelledby="about-title">
      <div class="wrap">
        ${raw("<" + H + ' class="section-title" id="about-title">' + esc(U("about")) + "</" + H + ">")}
        <div class="prose">${paragraphs(a.text)}</div>
        ${(a.interests || []).length ? html`<p class="interests"><span class="label">${U("interests")}:</span> ${a.interests.map(T).join(" · ")}</p>` : ""}
        ${visibleQuotes.length ? html`<h3 class="subhead">${U("testimonials")}</h3><div class="quotes">${visibleQuotes.map(quoteBlock)}</div>` : ""}
      </div>
    </section>`;
  }

  function contactSection() {
    var b = SITE.basics || {};
    var c = SITE.contact || {};
    var email = b.email && b.email.show !== false && c.showEmail !== false ? b.email.value : "";
    var phone = b.phone && b.phone.show ? b.phone.value : "";
    return html`<section class="section section-contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        ${sectionTitle("contact", U("contact"))}
        ${c.cta ? html`<p class="contact-cta">${T(c.cta)}</p>` : ""}
        <ul class="contact-list">
          ${email ? html`<li><a href="${"mailto:" + email}">${email}</a></li>` : ""}
          ${phone ? html`<li><a href="${"tel:" + phone.replace(/\s+/g, "")}">${phone}</a></li>` : ""}
          ${(b.profiles || []).map(function (p) {
            return safeUrl(p.url) ? html`<li><a href="${safeUrl(p.url)}" target="_blank" rel="noopener">${p.network} ↗</a></li>` : "";
          })}
        </ul>
      </div>
    </section>`;
  }

  var SECTION_RENDERERS = {
    stories: featuredSection,
    experience: function () { return experienceSection(false); },
    education: educationSection,
    publications: publicationsSection,
    skills: function () { return skillsSection(false); },
    documents: function () { return documentsSection(false); },
    about: function () { return aboutSection(false); }
  };

  function homePage() {
    var parts = [hero()];
    if (layout === "compact") {
      SECTIONS.forEach(function (s) { if (SECTION_RENDERERS[s]) parts.push(SECTION_RENDERERS[s]()); });
    } else {
      parts.push(featuredSection());
      var recent = timelineEntries(["work", "education"]).slice(0, 4);
      if (recent.length) parts.push(html`<section class="section section-experience is-short" aria-labelledby="recent-title">
        <div class="wrap">
          ${sectionTitle("recent", U("experience"))}
          <ol class="timeline">${recent.map(timelineItem)}</ol>
          <p><a class="small-link" href="${href("experience")}">${U("all_experience")} →</a></p>
        </div>
      </section>`);
    }
    parts.push(contactSection());
    return parts;
  }

  // ---------- 故事页 ----------

  function mediaFigure(m, group, isHero) {
    var type = m.type || "image";
    var cap = T(m.caption);
    if (type === "image") {
      return html`<figure class="figure${isHero ? " figure-hero" : ""}">
        <button type="button" class="figure-btn" data-lightbox="${safeUrl(m.src)}" data-caption="${cap}" data-group="${group}" aria-label="${T(m.alt) || cap}">
          ${img(m.src, T(m.alt), "figure-img")}
        </button>
        ${cap ? html`<figcaption>${cap}</figcaption>` : ""}
      </figure>`;
    }
    if (type === "video") {
      return html`<figure class="figure"><video class="figure-img" src="${safeUrl(m.src)}" controls preload="metadata"></video>${cap ? html`<figcaption>${cap}</figcaption>` : ""}</figure>`;
    }
    return html`<p class="media-link"><a href="${safeUrl(m.src)}" target="_blank" rel="noopener">${T(m.alt) || cap || m.src} ↗</a>${cap && T(m.alt) ? html`<br><span class="muted">${cap}</span>` : ""}</p>`;
  }

  function storyPage(id) {
    var s = get("stories", id);
    if (!s) return notFoundPage();
    var p = parentOf(s.parent);
    var idx = stories.indexOf(s);
    var prev = stories[idx - 1], next = stories[idx + 1];
    var media = s.media || [];
    var heroIdx = -1;
    media.some(function (m, i) { if ((m.type || "image") === "image") { heroIdx = i; return true; } return false; });
    var others = media.filter(function (m, i) { return i !== heroIdx; });
    var group = "story-" + s.id;
    var evidence = (s.evidence || []).map(function (d) { return get("documents", d); }).filter(function (d) { return d && d.visibility !== "private"; });
    var quotes = (s.quotes || []).map(function (q) { return get("quotes", q); }).filter(function (q) { return q && visibleQuotes.indexOf(q) >= 0; });
    var siblings = stories.filter(function (x) { return x !== s && x.parent && x.parent === s.parent; });
    var backTarget = layout === "compact" ? href("home") : href("experience");

    return html`<article class="story">
      <div class="wrap story-head">
        <p class="back"><a href="${backTarget}" data-back><span aria-hidden="true" class="arrow arrow-back">←</span> ${U("back")}</a></p>
        <p class="kicker">${storyKicker(s)}</p>
        <h1 class="story-title">${T(s.title)}</h1>
        ${s.standfirst ? html`<p class="story-standfirst">${T(s.standfirst)}</p>` : ""}
        <p class="story-meta">${[T(s.role), s.period ? period(s.period.start, s.period.end) : "", p ? orgName(p) : ""].filter(Boolean).join(" · ")}</p>
        ${metricsList(s.metrics, 3)}
      </div>
      ${heroIdx >= 0 ? html`<div class="wrap wrap-wide">${mediaFigure(media[heroIdx], group, true)}</div>` : ""}
      <div class="wrap story-body prose">
        ${s.problem ? html`<h2>${U("problem")}</h2>${paragraphs(s.problem)}` : ""}
        ${(s.actions || []).length ? html`<h2>${U("actions")}</h2><ul>${s.actions.map(function (a) { return html`<li>${T(a)}</li>`; })}</ul>` : ""}
        ${s.outcome ? html`<h2>${U("outcome")}</h2>${paragraphs(s.outcome)}` : ""}
      </div>
      ${others.length ? html`<div class="wrap wrap-wide gallery">${others.map(function (m) { return mediaFigure(m, group, false); })}</div>` : ""}
      <div class="wrap story-foot">
        ${quotes.length ? html`<div class="quotes">${quotes.map(quoteBlock)}</div>` : ""}
        ${evidence.length ? html`<div class="evidence"><h2 class="subhead">${U("evidence")}</h2><ul class="doc-grid doc-grid-small">${evidence.map(docCard)}</ul></div>` : ""}
        ${(s.skills || []).length ? html`<div class="story-skills"><h2 class="subhead">${U("skills_used")}</h2>${skillTags(s.skills)}</div>` : ""}
        ${siblings.length ? html`<div class="siblings"><h2 class="subhead">${U("more_in", { name: orgName(p) })}</h2>${storyLinks(siblings.map(function (x) { return x.id; }))}</div>` : ""}
        <nav class="pager" aria-label="${U("prev")} / ${U("next")}">
          ${prev ? html`<a class="pager-prev" href="${href("story", prev.id)}"><span class="kicker">← ${U("prev")}</span><span>${T(prev.title)}</span></a>` : html`<span></span>`}
          ${next ? html`<a class="pager-next" href="${href("story", next.id)}"><span class="kicker">${U("next")} →</span><span>${T(next.title)}</span></a>` : ""}
        </nav>
      </div>
    </article>`;
  }

  // ---------- 其他页面 ----------

  function skillPage(id) {
    if (!id) return skillsSection(true);
    var s = get("skills", id);
    if (!s) return notFoundPage();
    var uses = skillUses(id);
    return html`<section class="section section-skill">
      <div class="wrap">
        <p class="back"><a href="${href("skills")}"><span aria-hidden="true" class="arrow arrow-back">←</span> ${U("all_skills")}</a></p>
        <h1 class="section-title">${U("stories_with_skill", { name: s.name })}</h1>
        ${uses.stories.length ? html`<div class="cards cards-featured">${uses.stories.map(function (x) { return storyCard(x); })}</div>` : ""}
        ${uses.entries.length ? html`<h2 class="subhead">${U("used_in")}</h2><ul class="plain-list">${uses.entries.map(function (w) {
          return html`<li><strong>${w.position ? T(w.position) : T(w.name)}</strong>${w.position ? html` · ${w.name}` : ""} <span class="muted">${period(w.startDate, w.endDate)}</span></li>`;
        })}</ul>` : ""}
      </div>
    </section>`;
  }

  function cvPage() {
    var b = SITE.basics || {};
    var email = b.email && b.email.show !== false ? b.email.value : "";
    var phone = b.phone && b.phone.show ? b.phone.value : "";
    var contact = [b.location && b.location.city, email, phone].concat((b.profiles || []).map(function (p) { return p.url ? p.url.replace(/^https?:\/\/(www\.)?/, "") : ""; })).filter(Boolean);
    var groups = {};
    list("skills").forEach(function (s) { (groups[s.category || "other"] = groups[s.category || "other"] || []).push(s.name); });
    return html`<section class="cv">
      <div class="wrap cv-sheet">
        <div class="cv-tools no-print">
          <a href="${href("home")}"><span aria-hidden="true" class="arrow arrow-back">←</span> ${U("back")}</a>
          <button type="button" class="btn" data-action="print">${U("print")}</button>
        </div>
        <header class="cv-head">
          <h1>${b.name || ""}</h1>
          ${b.label ? html`<p class="cv-label">${T(b.label)}</p>` : ""}
          <p class="cv-contact">${contact.join(" · ")}</p>
          ${b.headline ? html`<p class="cv-headline">${T(b.headline)}</p>` : ""}
        </header>
        ${list("work").length ? html`<h2>${U("work")}</h2>${list("work").map(function (w) {
          return html`<div class="cv-entry"><p class="cv-when">${period(w.startDate, w.endDate)}</p><div><p><strong>${T(w.position)}</strong> · ${w.name}${w.location ? ", " + w.location : ""}</p>
            ${(w.highlights || []).length ? html`<ul>${w.highlights.map(function (h) { return html`<li>${T(h)}</li>`; })}</ul>` : ""}</div></div>`;
        })}` : ""}
        ${list("education").length ? html`<h2>${U("education")}</h2>${list("education").map(function (e) {
          return html`<div class="cv-entry"><p class="cv-when">${period(e.startDate, e.endDate, e.expectedEnd)}</p><div><p><strong>${[T(e.studyType), T(e.area)].filter(Boolean).join(", ")}</strong> · ${e.institution}${e.score && e.score.show ? " · " + U("grade") + " " + e.score.value : ""}</p>
            ${e.thesis ? html`<p class="muted">${U("thesis")}: ${T(e.thesis.title)}</p>` : ""}</div></div>`;
        })}` : ""}
        ${Object.keys(groups).length ? html`<h2>${U("skills")}</h2><dl class="cv-dl">${Object.keys(groups).map(function (cat) {
          var label = U("cat_" + cat);
          return html`<div><dt>${label === "cat_" + cat ? cat : label}</dt><dd>${groups[cat].join(", ")}</dd></div>`;
        })}</dl>` : ""}
        ${list("publications").length ? html`<h2>${U("publications")}</h2><ul>${list("publications").map(function (p) { return html`<li>${T(p.name)}${p.publisher ? ", " + p.publisher : ""} ${fmtDate(p.releaseDate)}</li>`; })}</ul>` : ""}
        ${list("languages").length ? html`<h2>${U("languages")}</h2><p>${list("languages").map(function (l) { return T(l.language) + " " + (l.cefr === "native" ? "(" + U("native") + ")" : l.cefr ? "(" + l.cefr + ")" : ""); }).join(" · ")}</p>` : ""}
        ${list("certificates").length + list("awards").length ? html`<h2>${U("certificates")} / ${U("awards")}</h2><ul>${list("certificates").map(function (c) { return html`<li>${c.name}${c.level ? " " + c.level : ""}, ${c.issuer || ""} ${fmtDate(c.date)}</li>`; })}${list("awards").map(function (a) { return html`<li>${T(a.title)}, ${a.awarder || ""} ${fmtDate(a.date)}</li>`; })}</ul>` : ""}
      </div>
    </section>`;
  }

  function notFoundPage() {
    return html`<section class="section"><div class="wrap"><h1 class="section-title">404</h1><p>${U("not_found")}</p><p><a class="btn" href="${href("home")}">${U("back_home")}</a></p></div></section>`;
  }

  // ---------- 渲染 ----------

  function pageTitle(route) {
    var b = SITE.basics || {};
    var name = b.name || "";
    if (route.page === "story") { var s = get("stories", route.param); if (s) return T(s.title) + " – " + name; }
    if (route.page !== "home" && route.page) { var label = U("nav_" + route.page); if (label !== "nav_" + route.page) return label + " – " + name; }
    return [name, T(b.label)].filter(Boolean).join(" – ");
  }

  function render() {
    var route = parseHash();
    L = route.lang;
    var root = document.documentElement;
    root.lang = L;
    root.dir = RTL_LANGS.indexOf(L.split("-")[0]) >= 0 ? "rtl" : "ltr";

    var view, scrollTo = null;
    var compactSection = layout === "compact" && ["experience", "skills", "documents", "about"].indexOf(route.page) >= 0 && !route.param;
    if (route.page === "home" || compactSection) { view = homePage(); scrollTo = compactSection ? route.page : null; }
    else if (route.page === "story") view = storyPage(route.param);
    else if (route.page === "experience" && HAS.experience) view = [experienceSection(true, ["work", "education", "projects", "awards"]), publicationsSection()];
    else if (route.page === "skills") view = skillPage(route.param);
    else if (route.page === "documents" && HAS.documents) view = documentsSection(true);
    else if (route.page === "about" && HAS.about) view = aboutSection(true);
    else if (route.page === "cv") view = cvPage();
    else view = notFoundPage();

    document.body.className = "layout-" + layout + " style-" + currentStyle + " page-" + (route.page || "home");
    app.innerHTML = str(html`<button type="button" class="skip-link" data-action="skip">${U("skip")}</button>
      ${header(route)}<main id="main" tabindex="-1">${view}</main>${footer()}`);
    document.title = pageTitle(route);
    var desc = document.querySelector('meta[name="description"]');
    if (desc && SITE.basics && SITE.basics.headline) desc.setAttribute("content", T(SITE.basics.headline));

    if (scrollTo) {
      var el = document.getElementById(scrollTo);
      if (el) el.scrollIntoView();
    } else if (!firstRender) {
      window.scrollTo(0, 0);
    }
    if (!firstRender) document.getElementById("main").focus({ preventScroll: true });
    firstRender = false;
  }

  // ---------- 风格与主题 ----------

  var styleLink = document.getElementById("style-css");
  var currentStyle = paramOr("style", STYLES, META.style && STYLES.indexOf(META.style) >= 0 ? META.style : null) ||
    (styleLink && (styleLink.getAttribute("href").match(/styles\/([\w-]+)\.css/) || [])[1]) || "swiss-minimal";
  if (styleLink && styleLink.getAttribute("href") !== "assets/styles/" + currentStyle + ".css") {
    styleLink.setAttribute("href", "assets/styles/" + currentStyle + ".css");
  }

  function effectiveTheme() {
    // 读页面实际生效的配色，而不是系统设置：有的风格（terminal-dark）默认就是深色
    var cs = getComputedStyle(document.documentElement).colorScheme || "";
    return cs.indexOf("dark") >= 0 ? "dark" : "light";
  }
  function toggleTheme() {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) { /* 无痕模式下可能不可用，忽略 */ }
  }

  // ---------- 图片放大与文件详情 ----------

  var lightbox = document.getElementById("lightbox");
  var sheet = document.getElementById("sheet");
  var lbItems = [], lbIndex = 0;

  function showLightbox() {
    var it = lbItems[lbIndex];
    if (!it) return;
    lightbox.querySelector(".lb-img").src = it.src;
    lightbox.querySelector(".lb-img").alt = it.caption || "";
    lightbox.querySelector(".lb-caption").textContent = it.caption || "";
    lightbox.querySelector(".lb-count").textContent = lbItems.length > 1 ? (lbIndex + 1) + " / " + lbItems.length : "";
    lightbox.querySelectorAll(".lb-nav").forEach(function (b) { b.hidden = lbItems.length < 2; });
  }
  function openLightbox(trigger) {
    var group = trigger.getAttribute("data-group");
    var nodes = group ? Array.prototype.slice.call(document.querySelectorAll('[data-lightbox][data-group="' + group + '"]')) : [trigger];
    lbItems = nodes.map(function (n) { return { src: n.getAttribute("data-lightbox"), caption: n.getAttribute("data-caption") }; });
    lbIndex = Math.max(0, nodes.indexOf(trigger));
    lightbox.querySelector(".lb-close").setAttribute("aria-label", U("close"));
    lightbox.querySelector(".lb-prev").setAttribute("aria-label", U("previous_image"));
    lightbox.querySelector(".lb-next").setAttribute("aria-label", U("next_image"));
    showLightbox();
    lightbox.showModal();
  }
  function stepLightbox(d) { if (lbItems.length > 1) { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; showLightbox(); } }

  function openSheet(docId) {
    var d = get("documents", docId);
    if (!d) return;
    var b = SITE.basics || {};
    var email = b.email && b.email.show !== false ? b.email.value : "";
    var quotes = list("quotes").filter(function (q) { return q.document === d.id && visibleQuotes.indexOf(q) >= 0; });
    var subject = encodeURIComponent(T(d.title));
    sheet.querySelector(".sheet-content").innerHTML = str(html`
      <p class="kicker">${docKindLabel(d)}${d.date ? " · " + fmtDate(d.date) : ""}</p>
      <h2 class="sheet-title">${T(d.title)}</h2>
      ${d.visibility === "on-request" ? html`<p><span class="badge">${U("on_request")}</span></p>` : ""}
      ${d.summary ? html`<p>${T(d.summary)}</p>` : ""}
      ${quotes.map(quoteBlock)}
      <div class="actions">
        ${d.visibility === "public" && d.file ? html`<a class="btn btn-primary" href="${safeUrl(d.file)}" target="_blank" rel="noopener">${U("open_document")}</a>` : ""}
        ${d.visibility === "on-request" && email ? html`<a class="btn btn-primary" href="${"mailto:" + email + "?subject=" + subject}">${U("request_document")}</a>` : ""}
      </div>`);
    sheet.querySelector(".sheet-close").setAttribute("aria-label", U("close"));
    sheet.showModal();
  }

  document.addEventListener("click", function (e) {
    // 再次点击当前页面的链接（例如紧凑型布局里的导航）：重新渲染，滚动到对应版块
    var same = e.target.closest('a[href^="#/"]');
    if (same && same.getAttribute("href") === location.hash && !same.hasAttribute("data-back")) { e.preventDefault(); render(); return; }
    var t = e.target.closest("[data-lightbox],[data-sheet],[data-action],[data-scroll],[data-back]");
    if (!t) {
      if (e.target === lightbox) lightbox.close();
      if (e.target === sheet) sheet.close();
      return;
    }
    if (t.hasAttribute("data-lightbox")) { e.preventDefault(); openLightbox(t); }
    else if (t.hasAttribute("data-sheet")) { e.preventDefault(); openSheet(t.getAttribute("data-sheet")); }
    else if (t.hasAttribute("data-scroll")) {
      var el = document.getElementById(t.getAttribute("data-scroll"));
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
    } else if (t.hasAttribute("data-back")) {
      // 从站内点进来的，"返回"回到上一页原来的位置；直接打开链接进来的，按链接去首页或经历页
      if (navigatedInSite) { e.preventDefault(); history.back(); }
    } else {
      var a = t.getAttribute("data-action");
      if (a === "theme") toggleTheme();
      else if (a === "print") window.print();
      else if (a === "skip") { var m = document.getElementById("main"); if (m) m.focus(); }
      else if (a === "lb-close") lightbox.close();
      else if (a === "lb-prev") stepLightbox(-1);
      else if (a === "lb-next") stepLightbox(1);
      else if (a === "sheet-close") sheet.close();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox.open) return;
    var rtl = document.documentElement.dir === "rtl";
    if (e.key === "ArrowRight") stepLightbox(rtl ? -1 : 1);
    if (e.key === "ArrowLeft") stepLightbox(rtl ? 1 : -1);
  });
  // 图片加载失败时不显示破图标
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && !t.closest("dialog")) {
      var box = t.closest(".card-media, .hero-photo, .figure, .doc-media");
      if (box && box.classList.contains("doc-media")) t.remove(); else if (box) box.remove(); else t.remove();
    }
  }, true);

  var navigatedInSite = false;
  window.addEventListener("hashchange", function () { navigatedInSite = true; render(); });

  if (!app) return;
  render();
})();
