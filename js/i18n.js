// i18n.js —— 国际化：默认英语，可切换中文（localStorage 记忆）
// 用法：
//   I18N.t(key[, vars])  取翻译文案（支持 {var} 插值）
//   I18N.pick(v)         取 data.json 中双语字段 {en, zh} 或纯字符串的当前语言值
//   I18N.getLang() / I18N.setLang('en'|'zh')
// 静态元素：加 data-i18n（纯文本）/ data-i18n-html（HTML）/ data-i18n-lang（切换按钮）

(function () {
  "use strict";

  var STORE = "rr_lang";
  var DICT = {
    en: {
      // ---------- 全局 ----------
      "app.title": "Reset Radar · AI Quota Reset Radar",
      "nav.home": "Overview",
      "nav.status": "Service Status",
      "nav.about": "About",
      "meta.loading": "Loading…",
      "meta.lastUpdated": "Last updated: ",
      "meta.source": "Source: Official API",

      // ---------- 首页 ----------
      "home.loading": "Loading prediction data…",
      "card.expected": "Expected reset: ",
      "card.countdown": "Countdown: ",
      "card.confidence": "Confidence: ",
      "card.view": "View details →",
      "home.fail": "Failed to load data: ",

      // ---------- 通用标签 ----------
      "sig.high": "🔴 High probability",
      "sig.medium": "🟡 Medium probability",
      "sig.low": "🟢 Cooling / observing",
      "badge.seed": "seed / fallback data",
      "st.normal": "Normal",
      "st.operational": "Operational",
      "st.recovered": "Recovered",
      "st.degraded": "Degraded",
      "lvl.observing": "Observing",
      "lvl.cooling": "Cooling",
      "lvl.other": "Watching",
      "cd.window": "Window reached",
      "cd.fmtDays": "{d}d {h}h {m}m",
      "cd.fmtHours": "{h}h {m}m",
      "cd.clockWindow": "Window reached",
      "quota.noData": "No weekly quota data (manual maintenance required).",
      "quota.tier20x": "Pro·20×: ",
      "quota.tier5x": "Pro·5×: ",
      "quota.plus": "Plus: ",
      "kw.join": ", ",

      // ---------- 详情页 ----------
      "detail.back": "← Back",
      "detail.title": "Details",
      "detail.loading": "Loading…",
      "detail.windowReached": "Window reached",
      "g.expected": "Expected reset",
      "g.countdown": "Countdown",
      "g.confidence": "Confidence",
      "g.signal": "Signal",
      "d.lastResetTitle": "📋 Last reset reason",
      "d.judgmentTitle": "📋 Judgment",
      "d.summaryTitle": "📝 Summary",
      "d.modelTitle": "📡 Model signals",
      "d.communityTitle": "💬 Community signals",
      "d.cycleTitle": "⏱️ Quota cycle",
      "d.eventsTitle": "🎯 Candidate events",
      "d.historyTitle": "📜 Reset history",
      "d.quotaTitle": "📊 Weekly quota trend",
      "d.speakerTitle": "🗣️ Speech radar",
      "d.noSignals": "No signals.",
      "d.noEvents": "No candidate events.",
      "d.noRecords": "No records.",
      "d.noLastReset": "No reset record.",
      "d.regularReset": "Regular reset",
      "d.extraReset": "✨ Extra reset · not counted in regular cycle",
      "d.extraSuffix": " · Extra reset",
      "d.noRecentPosts": "No recent posts.",
      "d.noSpeaker": "No tracked speaker for this platform (configure SPEAKERS in config.py).",
      "d.active": "Active",
      "d.quiet": "Quiet recently",
      "d.kwHit": "⚠️ Keywords: ",
      "d.kwNone": "🔍 No keywords",
      "d.today": "Today",
      "d.postsToday": "posts",
      "d.notFound": "Platform not found.",
      "d.fail": "Failed to load data: ",

      // ---------- 服务状态页 ----------
      "status.title": "📊 Service Status",
      "status.loading": "Loading service status…",
      "status.okBadge": "✅ Operational",
      "status.event": "Incident",
      "status.duration": "lasted",
      "status.official": "Official status",
      "status.empty": "No service status data.",
      "status.fail": "Failed to load data: ",

      // ---------- 关于页 ----------
      "about.back": "← Back",
      "about.title": "ℹ️ About Reset Radar",
      "about.whatTitle": "⚡ What is this",
      "about.what": "Reset Radar is an intelligence aggregation and prediction tool for AI developers. It turns vague \"quota anxiety\" into quantifiable probabilities: it predicts quota reset timing for AI coding platforms (Codex, Claude Code, Grok Build, Kimi, MiniMax, etc.) in real time, helping you pace your work and avoid development interruptions from quota exhaustion.",
      "about.methodTitle": "🧮 Prediction method",
      "about.methodIntro": "A rules engine of \"cycle baseline + signal weighting\" (no machine learning):",
      "about.method1": "<b>Cycle baseline</b>: derive the average cycle from recent reset intervals, combine with \"time since last reset\" → baseline probability (cap 70%).",
      "about.method2": "<b>Signal weighting</b>: scan last-24h signals — official reset announcement +30%, limit increase −20%, model/CLI release +10%, community recovery feedback +5%, service incident recovered 0%.",
      "about.method3": "<b>Final probability</b> = baseline + signal adjustment, clamped to 0–100%.",
      "about.relTitle": "📊 Percentage vs. confidence",
      "about.relIntro": "The two are <b>not the same</b>:",
      "about.rel1": "<b>Reset probability (progress %)</b>: the <b>likelihood</b> of a quota reset within the next 24 hours.",
      "about.rel2": "<b>Confidence (%)</b>: how <b>reliable</b> this prediction is, determined by the <b>stability</b> of historical cycles — the more regular the cycle, the higher the confidence.",
      "about.relExample": "Example: <b>high probability + low confidence</b> = \"looks like a reset is near, but the historical cycle is irregular — reference only\"; <b>low probability + high confidence</b> = \"fairly certain there won't be a reset soon\".",
      "about.srcTitle": "🔌 Data sources",
      "about.src1": "Official status APIs (OpenAI / Anthropic / xAI etc.), direct connection preferred, no proxy needed.",
      "about.src2": "Public signals: official announcements, model releases, community feedback.",
      "about.src3": "Scheduled task refreshes every 30 minutes (GitHub Actions).",
      "about.disTitle": "⚠️ Disclaimer",
      "about.dis": "This tool is an <b>unofficial</b> estimation and intelligence aggregation; all data is <b>for reference only</b> and is not a guarantee. Actual quota policy is subject to each platform's official terms. Logos belong to their respective owners."
    },

    zh: {
      "app.title": "Reset Radar · AI额度重置雷达",
      "nav.home": "概览",
      "nav.status": "服务状态",
      "nav.about": "关于",
      "meta.loading": "加载中…",
      "meta.lastUpdated": "最后更新: ",
      "meta.source": "数据来源: 官方API",

      "home.loading": "正在加载预测数据…",
      "card.expected": "预计重置: ",
      "card.countdown": "倒计时: ",
      "card.confidence": "置信度: ",
      "card.view": "查看详情 →",
      "home.fail": "数据加载失败：",

      "sig.high": "🔴 高概率",
      "sig.medium": "🟡 中等概率",
      "sig.low": "🟢 冷却观察",
      "badge.seed": "回退数据",
      "st.normal": "正常",
      "st.operational": "正常",
      "st.recovered": "已恢复",
      "st.degraded": "降级",
      "lvl.observing": "持续观察",
      "lvl.cooling": "冷却观察",
      "lvl.other": "观察中",
      "cd.window": "已到预测窗口",
      "cd.fmtDays": "{d}天{h}小时{m}分",
      "cd.fmtHours": "{h}小时{m}分",
      "cd.clockWindow": "窗口已到",
      "quota.noData": "暂无周额度数据（需人工维护）。",
      "quota.tier20x": "Pro·20×：",
      "quota.tier5x": "Pro·5×：",
      "quota.plus": "Plus：",
      "kw.join": "、",

      "detail.back": "← 返回",
      "detail.title": "详情",
      "detail.loading": "加载中…",
      "detail.windowReached": "窗口已到",
      "g.expected": "预计重置",
      "g.countdown": "倒计时",
      "g.confidence": "置信度",
      "g.signal": "信号",
      "d.lastResetTitle": "📋 重置原因（上次）",
      "d.judgmentTitle": "📋 判断",
      "d.summaryTitle": "📝 摘要",
      "d.modelTitle": "📡 模型信号",
      "d.communityTitle": "💬 社区信号",
      "d.cycleTitle": "⏱️ 额度周期",
      "d.eventsTitle": "🎯 候选事件",
      "d.historyTitle": "📜 历史重置记录",
      "d.quotaTitle": "📊 周额度趋势",
      "d.speakerTitle": "🗣️ 发言雷达",
      "d.noSignals": "暂无信号。",
      "d.noEvents": "无候选事件。",
      "d.noRecords": "暂无记录。",
      "d.noLastReset": "暂无重置记录。",
      "d.regularReset": "常规重置",
      "d.extraReset": "✨ 额外重置 · 不计入常规周期",
      "d.extraSuffix": " · 额外重置",
      "d.noRecentPosts": "暂无近期发言。",
      "d.noSpeaker": "暂无追踪该平台的关键人物发言（可在 config.py 的 SPEAKERS 中配置）。",
      "d.active": "发言中",
      "d.quiet": "近期安静",
      "d.kwHit": "⚠️ 含关键词：",
      "d.kwNone": "🔍 无关键词",
      "d.today": "今日",
      "d.postsToday": "条动态",
      "d.notFound": "未找到该平台。",
      "d.fail": "数据加载失败：",

      "status.title": "📊 服务状态",
      "status.loading": "正在加载服务状态…",
      "status.okBadge": "✅ 正常",
      "status.event": "事件",
      "status.duration": "持续",
      "status.official": "官方状态",
      "status.empty": "暂无服务状态数据。",
      "status.fail": "数据加载失败：",

      "about.back": "← 返回",
      "about.title": "ℹ️ 关于 Reset Radar",
      "about.whatTitle": "⚡ 这是什么",
      "about.what": "Reset Radar 是一个面向 AI 开发者的情报聚合与预测工具。它把模糊的\"额度焦虑\"转化成可量化的概率：实时预测各 AI 编码平台（Codex、Claude Code、Grok Build、Kimi、MiniMax 等）的额度重置时间，帮你合理安排工作节奏，避免开发被额度耗尽打断。",
      "about.methodTitle": "🧮 预测方法",
      "about.methodIntro": "采用\"周期基线 + 信号加权\"的规则引擎（无需机器学习）：",
      "about.method1": "<b>周期基线</b>：根据最近多次重置间隔推算平均周期，结合\"距上次重置多久\"给出基础概率（上限 70%）。",
      "about.method2": "<b>信号加权</b>：扫描近 24 小时信号——官方重置公告 +30%、限额上调 −20%、模型/CLI 发布 +10%、社区恢复反馈 +5%、服务故障已恢复 0%。",
      "about.method3": "<b>最终概率</b> = 基础概率 + 信号调整，裁剪到 0–100%。",
      "about.relTitle": "📊 百分比 与 置信度 的关系",
      "about.relIntro": "两者<b>不是一回事</b>：",
      "about.rel1": "<b>重置概率（进度条 %）</b>：未来 24 小时内发生额度重置的<b>可能性</b>。",
      "about.rel2": "<b>置信度（%）</b>：模型对这一次预测有多<b>靠谱</b>，由历史周期的<b>稳定性</b>决定——周期越规律，置信度越高。",
      "about.relExample": "举例：<b>高概率 + 低置信度</b> = \"看着快重置了，但历史周期很乱，仅供参考\"；<b>低概率 + 高置信度</b> = \"基本可以确定近期不会重置\"。",
      "about.srcTitle": "🔌 数据来源",
      "about.src1": "官方状态 API（OpenAI / Anthropic / xAI 等），优先直连，无需代理。",
      "about.src2": "官方公告、模型发布、社区反馈等公开信号。",
      "about.src3": "定时任务每 30 分钟刷新一次（GitHub Actions）。",
      "about.disTitle": "⚠️ 免责声明",
      "about.dis": "本工具为<b>非官方</b>的推算与情报聚合，所有数据仅为<b>参考预测</b>，不构成任何承诺。实际额度策略以各平台官方为准。Logo 版权归各自所有者所有。"
    }
  };

  var lang = "en";
  try { lang = localStorage.getItem(STORE) || "en"; } catch (e) {}
  if (!DICT[lang]) lang = "en";

  function t(key, vars) {
    var v = (DICT[lang] || {})[key];
    var s = (v === undefined || v === null) ? key : v;
    if (vars) {
      for (var k in vars) {
        s = s.split("{" + k + "}").join(vars[k]);
      }
    }
    return s;
  }

  // 双语字段 {en, zh} 或纯字符串 → 当前语言值
  function pick(v) {
    if (v && typeof v === "object") {
      if (typeof v[lang] === "string") return v[lang];
      if (typeof v.en === "string") return v.en;
      if (typeof v.zh === "string") return v.zh;
      return "";
    }
    return (v === null || v === undefined) ? "" : String(v);
  }

  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-lang]").forEach(function (el) {
      el.textContent = lang === "zh" ? "EN" : "中文";
    });
  }

  function setLang(l) {
    if (!DICT[l]) l = "en";
    if (l === lang) return;
    lang = l;
    try { localStorage.setItem(STORE, l); } catch (e) {}
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t("app.title");
    applyStatic();
    // 通知页面重新渲染动态内容（当前页面定义了全局 init 时会触发）
    if (typeof window.init === "function") {
      try { window.init(); } catch (e) { console.warn("i18n rerender:", e); }
    }
    window.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }

  function init() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t("app.title");
    applyStatic();
    document.querySelectorAll("[data-i18n-lang]").forEach(function (el) {
      el.addEventListener("click", function () { setLang(lang === "zh" ? "en" : "zh"); });
    });
    document.addEventListener("langchange", function () {
      if (typeof window.init === "function") window.init();
    });
  }

  window.I18N = { t: t, pick: pick, getLang: function () { return lang; }, setLang: setLang };
  document.addEventListener("DOMContentLoaded", init);
})();
