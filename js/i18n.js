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
      "tabs.all": "Overview",
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
      "quota.noData": "No weekly quota data available.",
      "quota.tier20x": "Pro·20×: ",
      "quota.tier5x": "Pro·5×: ",
      "quota.plus": "Plus: ",

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
      "d.noSignals": "No signals.",
      "d.noEvents": "No candidate events.",
      "d.noRecords": "No records.",
      "d.noLastReset": "No reset record.",
      "d.regularReset": "Regular reset",
      "d.extraReset": "✨ Extra reset · not counted in regular cycle",
      "d.extraSuffix": " · Extra reset",
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
      "about.what": "Reset Radar separates normal quota recovery from unexpected global reset events, so AI developers can see what is likely to recover next and what remains uncertain.",
      "about.methodTitle": "🧮 Prediction method",
      "about.methodIntro": "Two deliberately separate models (no claim of official quota guarantees):",
      "about.method1": "<b>Recovery forecast</b>: uses a weighted median of normal reset intervals and MAD variation to estimate a p50/p80/p95 recovery window.",
      "about.method2": "<b>Extra-reset hazard</b>: estimates the chance of a separate global reset in the next 24 hours from historical frequency and source-weighted evidence.",
      "about.method3": "<b>Evidence</b> records source reliability, freshness and independence; signals are not hard-coded as percentage-point adjustments.",
      "about.relTitle": "📊 Percentage vs. confidence",
      "about.relIntro": "The two are <b>not the same</b>:",
      "about.rel1": "<b>Extra-reset probability</b>: the likelihood of an unexpected global reset within the next 24 hours; it is not a normal recovery countdown.",
      "about.rel2": "<b>Recovery confidence</b>: combines cycle stability, sample size, source quality and calibration.",
      "about.relExample": "Example: <b>high probability + low confidence</b> = \"looks like a reset is near, but the historical cycle is irregular — reference only\"; <b>low probability + high confidence</b> = \"fairly certain there won't be a reset soon\".",
      "about.srcTitle": "🔌 Data sources",
      "about.src1": "Official status APIs (OpenAI / Anthropic / xAI etc.), direct connection preferred, no proxy needed.",
      "about.src2": "Public signals: official announcements, model releases, community feedback.",
      "about.src3": "Scheduled task refreshes every 30 minutes (GitHub Actions).",
      "about.disTitle": "⚠️ Disclaimer",
      "about.dis": "This tool is an <b>unofficial</b> estimation and intelligence aggregation; all data is <b>for reference only</b> and is not a guarantee. Actual quota policy is subject to each platform's official terms. Logos belong to their respective owners.",
      "about.followTitle": "📣 Follow & contact",
      "about.followIntro": "Follow Reset Radar for reset news, updates and signals:",
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
      "tabs.all": "总览",
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
      "quota.noData": "暂无周额度数据。",
      "quota.tier20x": "Pro·20×：",
      "quota.tier5x": "Pro·5×：",
      "quota.plus": "Plus：",

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
      "d.noSignals": "暂无信号。",
      "d.noEvents": "无候选事件。",
      "d.noRecords": "暂无记录。",
      "d.noLastReset": "暂无重置记录。",
      "d.regularReset": "常规重置",
      "d.extraReset": "✨ 额外重置 · 不计入常规周期",
      "d.extraSuffix": " · 额外重置",
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
      "about.what": "Reset Radar 将正常额度恢复与意外的全局重置事件分开呈现，帮助 AI 开发者看清下一次可能恢复什么，以及哪些事情仍不确定。",
      "about.methodTitle": "🧮 预测方法",
      "about.methodIntro": "两套相互独立的模型（不构成官方额度保证）：",
      "about.method1": "<b>恢复预测</b>：使用正常重置间隔的加权中位数和 MAD 波动，给出 p50/p80/p95 恢复区间。",
      "about.method2": "<b>额外重置风险</b>：根据历史频率和按来源加权的证据，估计未来 24 小时出现全局重置的概率。",
      "about.method3": "<b>证据</b>记录来源可靠性、新鲜度和独立性；信号不会被写死成百分点调整。",
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
      "about.dis": "本工具为<b>非官方</b>的推算与情报聚合，所有数据仅为<b>参考预测</b>，不构成任何承诺。实际额度策略以各平台官方为准。Logo 版权归各自所有者所有。",
      "about.followTitle": "📣 关注与联系",
      "about.followIntro": "关注 Reset Radar，获取重置动态、更新与信号：",
    }
  };

  var lang = "en";
  try { lang = localStorage.getItem(STORE) || "en"; } catch (e) {}
  if (!DICT[lang]) lang = "en";

  function t(key, vars, fallback) {
    var v = (DICT[lang] || {})[key];
    // 找不到 key 时：传了 fallback 用 fallback，否则用 key 本身
    var s = (v === undefined || v === null) ? (fallback === undefined ? key : fallback) : v;
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
      // 用 HTML 里的原始占位文本兜底，避免 key 缺失时显示成 "nav.*"
      var fb = el.getAttribute("data-i18n-fb");
      if (fb === null) { fb = el.textContent; el.setAttribute("data-i18n-fb", fb); }
      el.textContent = t(el.getAttribute("data-i18n"), null, fb);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var fb = el.innerHTML;
      el.innerHTML = t(el.getAttribute("data-i18n-html"), null, fb);
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
