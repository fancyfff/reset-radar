// 详情页：研判日志

function section(title, inner) {
  return `<div class="block"><h3>${title}</h3>${inner}</div>`;
}

function listHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">${I18N.t("d.noSignals")}</p>`;
  return `<ul>${arr.map((x) => `<li>${escapeHtml(I18N.pick(x))}</li>`).join("")}</ul>`;
}

function eventsHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">${I18N.t("d.noEvents")}</p>`;
  return arr
    .map(
      (e) => `
      <div class="ev">
        <span>${escapeHtml(e.type)}</span>
        <span class="conf">${(e.confidence * 100).toFixed(0)}%</span>
      </div>
      <div class="block" style="margin:6px 0 10px;padding:10px 12px;"><p>${escapeHtml(I18N.pick(e.description))}</p></div>`
    )
    .join("");
}

// 历史重置记录：常规重置 / 额外重置 / 未重置 三种标记
// 只展示「实测确认」的真实记录（source = observed / manual）；种子(seed)与
// 自动判定(auto)的重置/未重置点属于推测或占位数据，不向用户展示。
function historyHtml(arr) {
  const real = (arr || []).filter((h) => h && h.source && h.source !== "seed" && h.source !== "auto");
  if (!real.length) return `<p style="color:var(--text-dim)">${I18N.t("d.noRecords")}</p>`;
  return `<div class="timeline">` + real.map((h) => {
    const isNo = h.type === "no_reset";
    const isExtra = h.is_extra;
    const cls = isNo ? "tl-no" : isExtra ? "tl-extra" : "tl-reset";
    const mark = isNo ? "○" : isExtra ? "✨" : "●";
    const baseReason = isNo ? h.reason : (h.reason || I18N.t("d.regularReset"));
    const reason = isExtra ? I18N.pick(baseReason) + I18N.t("d.extraSuffix") : I18N.pick(baseReason);
    return `<div class="tl-item ${cls}">
      <span class="tl-mark">${mark}</span>
      <span class="tl-time">${escapeHtml(fmtWhen(h.time))}</span>
      <span class="tl-reason">${escapeHtml(reason)}</span>
      <span class="src">· ${escapeHtml(h.source || "manual")}</span>
    </div>`;
  }).join("") + `</div>`;
}

// 上次重置原因块
function lastResetHtml(lr) {
  if (!lr) return `<p style="color:var(--text-dim)">${I18N.t("d.noLastReset")}</p>`;
  const extra = lr.is_extra_reset
    ? `<span class="badge medium">${I18N.t("d.extraReset")}</span>`
    : `<span class="badge low">● ${I18N.t("d.regularReset")}</span>`;
  return `<div class="lastreset">
    <div class="lr-reason">${escapeHtml(I18N.pick(lr.reason) || I18N.t("d.regularReset"))}</div>
    <div class="lr-meta">${extra}<span class="tl-time">${escapeHtml(fmtWhen(lr.time))}</span></div>
  </div>`;
}

// 上次重置区块：仅在确有「实测确认」重置记录时展示，种子/推测数据不展示
function lastResetBlockHtml(lr, title) {
  const src = lr && lr.source;
  if (!src || src === "seed" || src === "auto") return "";
  return section(title, lastResetHtml(lr));
}

// 历史重置区块：无「实测确认」记录时整块不展示，避免空标题或展示推测数据
function historyBlockHtml(d, title) {
  const real = (d.history || []).filter((h) => h && h.source && h.source !== "seed" && h.source !== "auto");
  if (!real.length) return "";
  return section(title, historyHtml(real));
}

// 生成平台详情 HTML（gauge + 各分析区块），容器无关，供详情页与首页内联复用
function platformDetailInner(p) {
  const lvl = signalLevelLabel(p.signal_level);
  const pred = p.prediction_time ? fmtWhen(p.prediction_time) : "—";
  const d = p.detail || {};
  const blocks = [
    lastResetBlockHtml(p.last_reset, I18N.t("d.lastResetTitle")),
    section(I18N.t("d.judgmentTitle"), `<p>${escapeHtml(I18N.pick(d.judgment) || "—")}</p>`),
    section(I18N.t("d.summaryTitle"), `<p>${escapeHtml(I18N.pick(d.summary) || "—")}</p>`),
    section(I18N.t("d.modelTitle"), listHtml(d.model_signals)),
    section(I18N.t("d.communityTitle"), listHtml(d.community_signals)),
    section(I18N.t("d.cycleTitle"), `<p>${escapeHtml(I18N.pick(d.quota_cycle) || "—")}</p>`),
    section(I18N.t("d.eventsTitle"), eventsHtml(d.candidate_events)),
    historyBlockHtml(d, I18N.t("d.historyTitle")),
    section(I18N.t("d.quotaTitle"), quotaChartHtml(d.weekly_quota)),
  ].join("");
  return `
  <div class="gauge">
    <div class="big" data-prob="${p.probability}" style="color:${colorFor(p.probability)}">0%</div>
    <div class="bar"><i style="width:0%;background:linear-gradient(90deg,${colorFor(p.probability)},var(--accent-2))"></i></div>
    <div class="gauge-grid">
      <div><span class="gl">${I18N.t("g.expected")}</span><b>${escapeHtml(pred)}</b></div>
      <div><span class="gl">${I18N.t("g.countdown")}</span><b class="cd">${escapeHtml(fmtCountdownClock(p.countdown_seconds))}</b></div>
      <div><span class="gl">${I18N.t("g.confidence")}</span><b>${p.confidence}%</b></div>
      <div><span class="gl">${I18N.t("g.signal")}</span><b>${escapeHtml(lvl)}</b></div>
    </div>
  </div>
  <div class="blocks">${blocks}</div>`;
}

// 将平台详情渲染进指定容器 root（详情页 + 首页内联共用）
function renderPlatformDetail(root, p) {
  if (!root || !p) return;
  if (window.__cdTimer) { clearInterval(window.__cdTimer); window.__cdTimer = null; }
  root.innerHTML = platformDetailInner(p);
  const g = root.querySelector(".gauge");
  const bigEl = g.querySelector(".big");
  const tgt = p.probability;
  countUp(bigEl, tgt);
  setTimeout(() => { bigEl.innerHTML = tgt + "%"; }, 950);
  requestAnimationFrame(() => { g.querySelector(".bar > i").style.width = tgt + "%"; });
  // 倒计时跳动
  let remain = Math.max(0, Math.floor(p.countdown_seconds || 0));
  const cdEl = g.querySelector(".cd");
  if (cdEl && remain > 0) {
    window.__cdTimer = setInterval(() => {
      remain -= 1;
      if (remain <= 0) { cdEl.textContent = I18N.t("detail.windowReached"); clearInterval(window.__cdTimer); window.__cdTimer = null; return; }
      cdEl.textContent = fmtCountdownClock(remain);
    }, 1000);
  }
  window.ICON.decorate(root);
}

function render(p) {
  document.getElementById("ptitle").innerHTML = logoOrIcon(p);
  document.getElementById("dtitle").innerHTML = escapeHtml(p.name) + (p.data_source === "seed" ? ` <i class="seed-badge">${I18N.t("badge.seed")}</i>` : "");
  renderPlatformDetail(document.getElementById("detail"), p);
}

async function init() {
  // 首页内联复用时容器 #detail 不存在，直接跳过（由 app.js 调用 renderPlatformDetail）
  const root = document.getElementById("detail");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  try {
    const p = await API.getPlatform(id);
    if (!p) { root.innerHTML = `<div class="empty">${I18N.t("d.notFound")}</div>`; return; }
    document.title = `Reset Radar · ${p.name}`;
    render(p);
  } catch (e) {
    root.innerHTML = `<div class="empty">${I18N.t("d.fail")}${escapeHtml(e.message)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
