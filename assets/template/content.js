// content.js 示例：一个虚构的用户"小林"。复制模板后，用用户的真实内容替换这个文件。
// 字段说明见 references/content-model.md。人名、公司、学校和数字都是虚构的。

window.SITE = {
  meta: {
    languages: ["de", "en", "zh"],
    review: ["de"],
    target: {
      role: { de: "Werkstudent Data Analytics", en: "Working student, data analytics", zh: "数据分析方向 Werkstudent" },
      type: "Werkstudent",
      city: "München"
    },
    style: "swiss-minimal",
    updated: "2026-10-20"
  },

  basics: {
    name: "Xiao Lin",
    label: {
      de: "M.Sc.-Student Data Science",
      en: "M.Sc. student in data science",
      zh: "数据科学硕士在读"
    },
    headline: {
      de: "Ich mache aus Vertriebs- und Betriebsdaten Dashboards und Prognosen, mit denen Teams wirklich arbeiten.",
      en: "I turn sales and operations data into dashboards and forecasts that teams actually use.",
      zh: "我把销售和运营数据做成团队真正会用的看板和预测。"
    },
    image: "assets/img/avatar.svg",
    email: { value: "xiao.lin@example.com" },
    location: { city: "München", countryCode: "DE" },
    profiles: [
      { network: "LinkedIn", url: "https://www.linkedin.com/in/example" },
      { network: "GitHub", url: "https://github.com/example" }
    ],
    availability: {
      type: "Werkstudent",
      from: "2027-04",
      hours: { de: "20 Std./Woche im Semester", en: "20 h/week during term", zh: "学期中每周 20 小时" },
      note: { de: "In den Semesterferien Vollzeit möglich", en: "Full-time possible during breaks", zh: "假期可全职" }
    },
    cv: { de: "assets/docs/cv-de.pdf", en: "assets/docs/cv-en.pdf" }
  },

  work: [
    {
      id: "muster",
      name: "Muster GmbH",
      url: "https://example.com",
      position: {
        de: "Werkstudent Data Analytics",
        en: "Werkstudent Data Analytics",   // 公司没有官方英文职位，保留德语原文
        zh: "Werkstudent 数据分析"
      },
      type: "Werkstudent",
      location: "München",
      startDate: "2024-04",
      endDate: "2025-09",
      summary: {
        de: "Datenanalyse und Reporting für Vertrieb, Controlling und Einkauf.",
        en: "Data analysis and reporting for sales, controlling and procurement.",
        zh: "为销售、财务和采购部门做数据分析和报表。"
      },
      highlights: [
        {
          de: "Vertriebs-Dashboard in Power BI aufgebaut, genutzt von drei Abteilungen",
          en: "Built a Power BI sales dashboard used by three departments",
          zh: "用 Power BI 搭建销售看板，三个部门在用"
        },
        {
          de: "Monatsreporting automatisiert, rund 10 Stunden Handarbeit pro Monat eingespart",
          en: "Automated monthly reporting, saving about 10 hours of manual work per month",
          zh: "月报自动化，每月节省约 10 小时人工"
        }
      ],
      skills: ["power-bi", "sql", "python"],
      stories: ["muster-dashboard"],
      evidence: ["doc-zeugnis-muster"],
      sources: ["M01", "M02", "M03", "I05"]
    }
  ],

  education: [
    {
      id: "msc",
      institution: "Technische Hochschule Beispielstadt",
      url: "https://example.org",
      studyType: { de: "Master of Science", en: "Master of Science", zh: "理学硕士" },
      area: { de: "Data Science", en: "Data Science", zh: "数据科学" },
      startDate: "2024-10",
      expectedEnd: "2027-03",
      score: { value: "1.7", scale: "DE" },
      courses: [
        { name: { de: "Maschinelles Lernen", en: "Machine Learning", zh: "机器学习" }, grade: "1.3", ects: 6 },
        { name: { de: "Zeitreihenanalyse", en: "Time Series Analysis", zh: "时间序列分析" }, grade: "1.7", ects: 6 }
      ],
      thesis: {
        title: {
          de: "Absatzprognose für Ersatzteile mit hierarchischen Zeitreihenmodellen",
          en: "Spare-parts demand forecasting with hierarchical time-series models",
          zh: "用层级时间序列模型预测备件需求"
        },
        story: "thesis-forecast"
      },
      stories: ["thesis-forecast"],
      evidence: ["doc-transcript-msc"],
      sources: ["M06", "M07", "I11"]
    }
  ],

  projects: [],

  stories: [
    {
      id: "muster-dashboard",
      parent: "muster",
      kind: "work",
      featured: true,
      title: {
        de: "Ein Vertriebs-Dashboard, das drei Abteilungen nutzen",
        en: "A sales dashboard used by three departments",
        zh: "一个三个部门都在用的销售数据看板"
      },
      standfirst: {
        de: "Aus verstreuten Excel-Listen wurde eine gemeinsame Sicht auf den Vertrieb.",
        en: "Scattered Excel lists became one shared view of sales.",
        zh: "把散落的 Excel 表变成了大家共用的一个视图。"
      },
      role: { de: "Konzeption und Umsetzung", en: "Design and build", zh: "设计和实现" },
      period: { start: "2024-06", end: "2025-01" },
      problem: {
        de: "Vertrieb, Controlling und Einkauf pflegten eigene Excel-Listen; Zahlen widersprachen sich in jedem Meeting.",
        en: "Sales, controlling and procurement each kept their own Excel lists, and the numbers disagreed in every meeting.",
        zh: "销售、财务、采购各自维护 Excel，每次开会数字都对不上。"
      },
      actions: [
        {
          de: "Anforderungen mit den drei Abteilungen gesammelt und gemeinsame Kennzahlen definiert",
          en: "Gathered requirements from the three departments and agreed on shared KPIs",
          zh: "和三个部门收集需求，统一了指标定义"
        },
        {
          de: "SQL-Datenmodell aufgebaut und das Dashboard in Power BI umgesetzt",
          en: "Built the SQL data model and the Power BI dashboard",
          zh: "搭建 SQL 数据模型，用 Power BI 做出看板"
        }
      ],
      outcome: {
        de: "Das Dashboard ist heute die Grundlage der monatlichen Vertriebsrunde.",
        en: "The dashboard is now the basis of the monthly sales meeting.",
        zh: "这个看板现在是每月销售例会的基础。"
      },
      metrics: [
        { value: "3", label: { de: "Abteilungen", en: "departments", zh: "个部门在用" }, sources: ["M03"] },
        { value: "~10 h", label: { de: "pro Monat eingespart", en: "saved per month", zh: "每月节省" }, sources: ["I05"] }
      ],
      media: [
        {
          src: "assets/img/muster-dashboard.svg",
          type: "image",
          alt: {
            de: "Dashboard-Übersicht mit Umsatz nach Region (Daten anonymisiert)",
            en: "Dashboard overview with revenue by region (data anonymised)",
            zh: "看板总览，按地区显示销售额（数据已脱敏）"
          },
          caption: {
            de: "Übersichtsseite, Daten anonymisiert",
            en: "Overview page, data anonymised",
            zh: "总览页，数据已脱敏"
          }
        }
      ],
      skills: ["power-bi", "sql"],
      evidence: ["doc-zeugnis-muster"],
      quotes: ["q-zeugnis-muster"],
      sources: ["M03", "I05", "I06"]
    },
    {
      id: "thesis-forecast",
      parent: "msc",
      kind: "thesis",
      featured: true,
      title: {
        de: "Wie viele Ersatzteile braucht ein Lager nächsten Monat?",
        en: "How many spare parts will a warehouse need next month?",
        zh: "仓库下个月需要多少备件？"
      },
      standfirst: {
        de: "Masterarbeit zu hierarchischen Prognosemodellen.",
        en: "Master's thesis on hierarchical forecasting models.",
        zh: "关于层级预测模型的硕士论文。"
      },
      role: { de: "Masterarbeit", en: "Master's thesis", zh: "硕士论文" },
      period: { start: "2026-04" },
      problem: {
        de: "Einzelprognosen pro Artikel sind für seltene Ersatzteile sehr ungenau.",
        en: "Per-item forecasts are very inaccurate for rarely ordered spare parts.",
        zh: "对很少被订购的备件，逐个预测非常不准。"
      },
      actions: [
        {
          de: "Hierarchische Modelle mit Einzelprognosen verglichen",
          en: "Compared hierarchical models with per-item forecasts",
          zh: "比较层级模型和逐个预测"
        }
      ],
      outcome: {
        de: "Arbeit läuft; erste Ergebnisse folgen.",
        en: "In progress; first results to follow.",
        zh: "进行中，初步结果待补充。"
      },
      skills: ["python", "forecasting"],
      evidence: ["doc-transcript-msc"],
      sources: ["M06", "I11", "I12"]
    }
  ],

  skills: [
    { id: "power-bi", name: "Power BI", category: "data" },
    { id: "sql", name: "SQL", category: "data" },
    { id: "python", name: "Python", category: "data" },
    { id: "forecasting", name: "Forecasting", category: "data" }
  ],

  languages: [
    { language: { de: "Chinesisch", en: "Chinese", zh: "中文" }, cefr: "native" },
    {
      language: { de: "Deutsch", en: "German", zh: "德语" },
      cefr: "C1",
      certificate: "cert-testdaf",
      use: { de: "Arbeitssprache bei Muster GmbH", en: "Working language at Muster GmbH", zh: "在 Muster GmbH 的工作语言" }
    },
    { language: { de: "Englisch", en: "English", zh: "英语" }, cefr: "C1" }
  ],

  certificates: [
    {
      id: "cert-testdaf",
      name: "TestDaF",
      issuer: "g.a.s.t. / TestDaF-Institut",
      date: "2023-11",
      level: "TDN 4×4",
      document: "doc-testdaf",
      sources: ["M05"]
    }
  ],

  awards: [],

  publications: [],

  quotes: [
    {
      id: "q-zeugnis-muster",
      text: {
        de: "„… überzeugte durch seine strukturierte und eigenständige Arbeitsweise.“",
        en: "“… impressed us with his structured and independent way of working.”",
        zh: "“……以条理清晰、独立自主的工作方式给我们留下了深刻印象。”"
      },
      original: "de",
      author: "Muster GmbH",
      authorTitle: { de: "Arbeitszeugnis", en: "Employer reference", zh: "工作证明" },
      document: "doc-zeugnis-muster",
      consent: "not-needed",
      sources: ["M03"]
    }
  ],

  documents: [
    {
      id: "doc-zeugnis-muster",
      material: "M03",
      title: { de: "Arbeitszeugnis Muster GmbH", en: "Employer reference, Muster GmbH", zh: "Muster GmbH 工作证明" },
      kind: "reference",
      date: "2025-09",
      visibility: "on-request",
      summary: {
        de: "Qualifiziertes Arbeitszeugnis, auf Anfrage erhältlich.",
        en: "Full employer reference, available on request.",
        zh: "完整工作证明，可按需提供。"
      }
    },
    {
      id: "doc-testdaf",
      material: "M05",
      title: { de: "TestDaF-Zeugnis", en: "TestDaF certificate", zh: "TestDaF 成绩证书" },
      kind: "certificate",
      date: "2023-11",
      visibility: "public",
      file: "assets/img/testdaf.svg",
      thumbnail: "assets/img/testdaf.svg"
    },
    {
      id: "doc-transcript-msc",
      material: "M06",
      title: { de: "Notenspiegel M.Sc.", en: "Transcript of records, M.Sc.", zh: "硕士成绩单" },
      kind: "transcript",
      date: "2026-09",
      visibility: "on-request",
      summary: {
        de: "Aktueller Notenspiegel, auf Anfrage erhältlich.",
        en: "Current transcript, available on request.",
        zh: "最新成绩单，可按需提供。"
      }
    }
  ],

  about: {
    text: {
      de: "Ich habe in China Statistik studiert und bin 2024 für den Master nach München gekommen. Mich interessiert, wie aus Daten Entscheidungen werden, die Menschen im Alltag tatsächlich treffen.",
      en: "I studied statistics in China and moved to Munich for my master's in 2024. I care about how data turns into decisions people actually make day to day.",
      zh: "我本科在国内读统计，2024 年来慕尼黑读硕士。我关心的是数据怎样变成人们日常真正会做的决定。"
    },
    interests: [
      { de: "Bouldern", en: "Bouldering", zh: "攀岩" }
    ],
    sources: ["M04", "I15"]
  },

  contact: {
    cta: {
      de: "Ich freue mich auf Ihre Nachricht.",
      en: "I'd be glad to hear from you.",
      zh: "期待你的消息。"
    },
    showEmail: true
  },

  ui: {}
};
