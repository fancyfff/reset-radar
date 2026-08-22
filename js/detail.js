// 详情页：研判日志

function section(title, inner) {
  return `<div class="block"><h3>${title}</h3>${inner}</div>`;
}

function listHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">暂无信号。</p>`;
  return `<ul>${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function eventsHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">无候选事件。</p>`;
  return arr
    .map(
      (e) => `
      <div class="ev">
        <span>${escapeHtml(e.type)}</span>
        <span class="conf">${(e.confidence * 100).toFixed(0)}%</span>
      </div>
      <div class="block" style="margin:6px 0 10px;padding:10px 12px;"><p>${escapeHtml(e.description)}</p></div>`
    )
    .join("");
}

// 历史重置记录：常规重置 / 额外重置 / 未重置 三种标记
function historyHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">暂无记录。</p>`;
  return `<div class="timeline">` + arr.map((h) => {
    const isNo = h.type === "no_reset";
    const isExtra = h.is_extra;
    const cls = isNo ? "tl-no" : isExtra ? "tl-extra" : "tl-reset";
    const mark = isNo ? "○" : isExtra ? "✨" : "●";
    const reason = isNo ? h.reason : (h.reason || "常规周期重置") + (isExtra ? " · 额外重置" : "");
    return `<div class="tl-item ${cls}">
      <span class="tl-mark">${mark}</span>
      <span class="tl-time">${escapeHtml(fmtWhen(h.time))}</span>
      <span class="tl-reason">${escapeHtml(reason)}</span>
      <span class="src">· ${escapeHtml(h.source || "manual")}</span>
    </div>`;
  }).join("") + `</div>`;
}

// 发言雷达：展示与当前平台关联的关键人物发言（每个账号一张卡片）
function speakerPostsHtml(sp) {
  const active = sp.is_active;
  const statusCls = active ? "low" : "medium";
  const statusTxt = active ? "发言中" : "近期安静";
  const posts = (sp.recent_posts || []).map((p) => {
    const kw = p.has_keywords;
    const kwHtml = kw
      ? `<div class="sp-kw">⚠️ 含关键词：${escapeHtml((p.keywords || []).join("、"))}</div>`
      : `<div class="sp-kw dim">🔍 无关键词</div>`;
    const url = p.url ? ` <a class="sp-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">↗</a>` : "";
    return `<div class="sp-post ${kw ? "hit" : ""}">
      <div class="sp-head"><b>${escapeHtml(sp.name)}</b> <span class="sp-handle">${escapeHtml(sp.handle)}</span> <span class="sp-time">${escapeHtml(fmtWhen(p.time))}</span></div>
      <div class="sp-content">${escapeHtml(p.content || "")}${url}</div>
      ${kwHtml}
    </div>`;
  }).join("") || `<p style="color:var(--text-dim)">暂无近期发言。</p>`;

  return `<div class="block sp-card">
    <div class="sp-top">
      <div>
        <div class="sp-title">${escapeHtml(sp.name)}</div>
        <div class="sp-sub">${escapeHtml(sp.handle)} · 今日 <b>${sp.post_count_today || 0}</b> 条动态</div>
      </div>
      <span class="badge ${statusCls}"><span class="status-dot ${active ? "operational" : "degraded"}"></span> ${statusTxt}</span>
    </div>
    <div class="sp-posts">${posts}</div>
  </div>`;
}

function speakersSectionHtml(speakers) {
  if (!speakers || !speakers.length) {
    return section("🗣️ 发言雷达", `<p style="color:var(--text-dim)">暂无追踪该平台的关键人物发言（可在 config.py 的 SPEAKERS 中配置）。</p>`);
  }
  return section("🗣️ 发言雷达", speakers.map(speakerPostsHtml).join(""));
}

// 上次重置原因块
function lastResetHtml(lr) {
  if (!lr) return `<p style="color:var(--text-dim)">暂无重置记录。</p>`;
  const extra = lr.is_extra_reset
    ? `<span class="badge medium">✨ 额外重置 · 不计入常规周期</span>`
    : `<span class="badge low">● 常规重置</span>`;
  return `<div class="lastreset">
    <div class="lr-reason">${escapeHtml(lr.reason || "常规周期重置")}</div>
    <div class="lr-meta">${extra}<span class="tl-time">${escapeHtml(fmtWhen(lr.time))}</span></div>
  </div>`;
}

function render(p, speakers) {
  document.getElementById("ptitle").innerHTML = logoOrIcon(p);
  document.getElementById("dtitle").textContent = p.name;
  const sm = signalMeta(p.signal_strength);
  const stLabel = STATUS_LABEL[p.status] || p.status;
  const win = p.prediction_window ? `${escapeHtml(p.prediction_window.start)} ~ ${escapeHtml(p.prediction_window.end)}` : "—";
  const lvl = signalLevelLabel(p.signal_level);
  const pred = p.prediction_time ? fmtWhen(p.prediction_time) : "—";

  // gauge（含倒计时，逐秒跳动）
  const g = document.getElementById("gauge");
  g.innerHTML = `
    <div class="big" data-prob="${p.probability}" style="color:${colorFor(p.probability)}">0%</div>
    <div class="bar"><i style="width:0%;background:linear-gradient(90deg,${colorFor(p.probability)},var(--accent-2))"></i></div>
    <div class="gauge-grid">
      <div><span class="gl">预计重置</span><b>${escapeHtml(pred)}</b></div>
      <div><span class="gl">倒计时</span><b id="cd">${escapeHtml(fmtCountdownClock(p.countdown_seconds))}</b></div>
      <div><span class="gl">置信度</span><b>${p.confidence}%</b></div>
      <div><span class="gl">信号</span><b>${escapeHtml(lvl)}</b></div>
    </div>`;
  const bigEl = g.querySelector(".big");
  const tgt = p.probability;
  countUp(bigEl, tgt);
  setTimeout(() => { bigEl.innerHTML = tgt + "%"; }, 950);
  requestAnimationFrame(() => { g.querySelector(".bar > i").style.width = tgt + "%"; });

  // 倒计时跳动
  let remain = Math.max(0, Math.floor(p.countdown_seconds || 0));
  const cdEl = g.querySelector("#cd");
  if (cdEl && remain > 0) {
    clearInterval(window.__cdTimer);
    window.__cdTimer = setInterval(() => {
      remain -= 1;
      if (remain <= 0) { cdEl.textContent = "窗口已到"; clearInterval(window.__cdTimer); return; }
      cdEl.textContent = fmtCountdownClock(remain);
    }, 1000);
  }

  const d = p.detail || {};
  const blocks = [
    section("📋 重置原因（上次）", lastResetHtml(p.last_reset)),
    section("📋 判断", `<p>${escapeHtml(d.judgment || "—")}</p>`),
    section("📝 摘要", `<p>${escapeHtml(d.summary || "—")}</p>`),
    section("📡 模型信号", listHtml(d.model_signals)),
    section("💬 社区信号", listHtml(d.community_signals)),
    section("⏱️ 额度周期", `<p>${escapeHtml(d.quota_cycle || "—")}</p>`),
    section("🎯 候选事件", eventsHtml(d.candidate_events)),
    section("📜 历史重置记录", historyHtml(d.history)),
    section("📊 周额度趋势", quotaChartHtml(d.weekly_quota)),
    speakersSectionHtml(speakers),
  ].join("");

  document.getElementById("blocks").innerHTML = blocks;
  document.getElementById("statusline").innerHTML = `<span class="status-dot ${escapeHtml(p.status)}"></span> ${escapeHtml(stLabel)}`;
}

async function init() {
  const id = new URLSearchParams(location.search).get("id");
  const root = document.getElementById("blocks");
  try {
    const [p, allSpeakers] = await Promise.all([API.getPlatform(id), API.getSpeakers()]);
    if (!p) { root.innerHTML = `<div class="empty">未找到该平台。</div>`; return; }
    document.title = `Reset Radar · ${p.name}`;
    const speakers = (allSpeakers || []).filter((s) => s.platform === p.id);
    render(p, speakers);
  } catch (e) {
    root.innerHTML = `<div class="empty">数据加载失败：${escapeHtml(e.message)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
