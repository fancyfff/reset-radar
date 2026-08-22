// 工具函数：时间格式化、信号映射、安全转义、数字动画

const SIGNAL_META = {
  high:   { cls: "high" },
  medium: { cls: "medium" },
  low:    { cls: "low" },
};

function signalMeta(strength) {
  const key = SIGNAL_META[strength] ? strength : "low";
  return { cls: SIGNAL_META[key].cls, label: I18N.t("sig." + key) };
}

function statusText(s) {
  return I18N.t("st." + s) || I18N.t("st.normal");
}

// 双语字段 {en, zh} 或字符串是否表示「已恢复」
function isRecovered(v) {
  const s = (v && typeof v === "object") ? ((v.en || "") + " " + (v.zh || "")) : String(v || "");
  return s.indexOf("Recovered") >= 0 || s.indexOf("已恢复") >= 0;
}

function colorFor(prob) {
  if (prob >= 70) return "var(--high)";
  if (prob >= 40) return "var(--medium)";
  return "var(--low)";
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtProb(p) {
  return Math.max(0, Math.min(100, Math.round(p)));
}

// 数字滚动动画
function countUp(el, target, dur = 900) {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (target - from) * eased);
    el.textContent = val;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// 相对时间（基于 last_updated 的提示文案）
function nowClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 解析 ISO 时间字符串为本地可读
function fmtWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove("show"), 1600);
}

// 优先使用官方 logo（SVG），加载失败回退到 emoji
function logoOrIcon(p) {
  if (p && p.logo) {
    const fb = escapeHtml(p.icon || "⚡");
    return `<img class="logo" src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.name || "")}" ` +
      `onerror="this.outerHTML='<span class=\\'icon\\'>${fb}</span>'">`;
  }
  return `<span class="icon">${escapeHtml((p && p.icon) || "⚡")}</span>`;
}

// ---------- 信号等级（状态文字）----------
function signalLevelLabel(level) {
  return I18N.t("lvl." + level) || I18N.t("lvl.other");
}

// ---------- 倒计时格式化 ----------
// 短格式：X天X小时X分钟（用于卡片）
function fmtCountdown(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  if (sec <= 0) return I18N.t("cd.window");
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? I18N.t("cd.fmtDays", { d: d, h: h, m: m }) : I18N.t("cd.fmtHours", { h: h, m: m });
}
// 时钟格式：Xd HH:MM:SS（用于详情页，可逐秒跳动）
function fmtCountdownClock(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  if (sec <= 0) return I18N.t("cd.clockWindow");
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${d}d ${p(h)}:${p(m)}:${p(s)}`;
}

// ---------- 周额度趋势迷你图（纯 CSS 柱状）----------
function quotaChartHtml(wq) {
  if (!wq || !Array.isArray(wq.trend) || !wq.trend.length) {
    return `<p style="color:var(--text-dim)">${I18N.t("quota.noData")}</p>`;
  }
  const vals = wq.trend;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const labels = wq.labels || vals.map(() => "");
  const bars = vals.map((v, i) => {
    const pct = max > 0 ? Math.round((v / max) * 100) : 0;
    return `<div class="qbar">
      <div class="qbar-val">$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
      <div class="qbar-track"><i style="height:${pct}%"></i></div>
      <div class="qbar-lab">${escapeHtml(I18N.pick(labels[i] || ""))}</div>
    </div>`;
  }).join("");
  const tiers = [];
  if (wq.pro_20x != null) tiers.push(`<span>${I18N.t("quota.tier20x")}<b>$${Number(wq.pro_20x).toLocaleString("en-US", { maximumFractionDigits: 2 })}</b></span>`);
  if (wq.pro_5x != null) tiers.push(`<span>${I18N.t("quota.tier5x")}<b>$${Number(wq.pro_5x).toLocaleString("en-US", { maximumFractionDigits: 2 })}</b></span>`);
  if (wq.plus != null) tiers.push(`<span>${I18N.t("quota.plus")}<b>$${Number(wq.plus).toLocaleString("en-US", { maximumFractionDigits: 2 })}</b></span>`);
  return `<div class="qchart">${bars}</div>` +
    (tiers.length ? `<div class="qtiers">${tiers.join("")}</div>` : "");
}
