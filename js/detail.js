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
function historyHtml(arr) {
  if (!arr || !arr.length) return `<p style="color:var(--text-dim)">${I18N.t("d.noRecords")}</p>`;
  return `<div class="timeline">` + arr.map((h) => {
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

// 发言雷达：展示与当前平台关联的关键人物发言（每个账号一张卡片）
function speakerPostsHtml(sp) {
  const active = sp.is_active;
  const statusCls = active ? "low" : "medium";
  const statusTxt = active ? I18N.t("d.active") : I18N.t("d.quiet");
  const posts = (sp.recent_posts || []).map((p) => {
    const kw = p.has_keywords;
    const kwHtml = kw
      ? `<div class="sp-kw">${I18N.t("d.kwHit")}${escapeHtml((p.keywords || []).join(I18N.t("kw.join")))}</div>`
      : `<div class="sp-kw dim">${I18N.t("d.kwNone")}</div>`;
    const url = p.url ? ` <a class="sp-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">↗</a>` : "";
    return `<div class="sp-post ${kw ? "hit" : ""}">
      <div class="sp-head"><b>${escapeHtml(sp.name)}</b> <span class="sp-handle">${escapeHtml(sp.handle)}</span> <span class="sp-time">${escapeHtml(fmtWhen(p.time))}</span></div>
      <div class="sp-content">${escapeHtml(I18N.pick(p.content || ""))}${url}</div>
      ${kwHtml}
    </div>`;
  }).join("") || `<p style="color:var(--text-dim)">${I18N.t("d.noRecentPosts")}</p>`;

  return `<div class="block sp-card">
    <div class="sp-top">
      <div>
        <div class="sp-title">${escapeHtml(sp.name)}</div>
        <div class="sp-sub">${escapeHtml(sp.handle)} · ${I18N.t("d.today")} <b>${sp.post_count_today || 0}</b> ${I18N.t("d.postsToday")}</div>
      </div>
      <span class="badge ${statusCls}"><span class="status-dot ${active ? "operational" : "degraded"}"></span> ${statusTxt}</span>
    </div>
    <div class="sp-posts">${posts}</div>
  </div>`;
}

function speakersSectionHtml(speakers) {
  if (!speakers || !speakers.length) {
    return section(I18N.t("d.speakerTitle"), `<p style="color:var(--text-dim)">${I18N.t("d.noSpeaker")}</p>`);
  }
  return section(I18N.t("d.speakerTitle"), speakers.map(speakerPostsHtml).join(""));
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

function render(p, speakers) {
  document.getElementById("ptitle").innerHTML = logoOrIcon(p);
  document.getElementById("dtitle").innerHTML = escapeHtml(p.name) + (p.data_source === "seed" ? ` <i class="seed-badge">${I18N.t("badge.seed")}</i>` : "");
  const stLabel = statusText(p.status);
  const win = p.prediction_window ? `${escapeHtml(p.prediction_window.start)} ~ ${escapeHtml(p.prediction_window.end)}` : "—";
  const lvl = signalLevelLabel(p.signal_level);
  const pred = p.prediction_time ? fmtWhen(p.prediction_time) : "—";

  // gauge（含倒计时，逐秒跳动）
  const g = document.getElementById("gauge");
  g.innerHTML = `
    <div class="big" data-prob="${p.probability}" style="color:${colorFor(p.probability)}">0%</div>
    <div class="bar"><i style="width:0%;background:linear-gradient(90deg,${colorFor(p.probability)},var(--accent-2))"></i></div>
    <div class="gauge-grid">
      <div><span class="gl">${I18N.t("g.expected")}</span><b>${escapeHtml(pred)}</b></div>
      <div><span class="gl">${I18N.t("g.countdown")}</span><b id="cd">${escapeHtml(fmtCountdownClock(p.countdown_seconds))}</b></div>
      <div><span class="gl">${I18N.t("g.confidence")}</span><b>${p.confidence}%</b></div>
      <div><span class="gl">${I18N.t("g.signal")}</span><b>${escapeHtml(lvl)}</b></div>
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
      if (remain <= 0) { cdEl.textContent = I18N.t("detail.windowReached"); clearInterval(window.__cdTimer); return; }
      cdEl.textContent = fmtCountdownClock(remain);
    }, 1000);
  }

  const d = p.detail || {};
  const blocks = [
    section(I18N.t("d.lastResetTitle"), lastResetHtml(p.last_reset)),
    section(I18N.t("d.judgmentTitle"), `<p>${escapeHtml(I18N.pick(d.judgment) || "—")}</p>`),
    section(I18N.t("d.summaryTitle"), `<p>${escapeHtml(I18N.pick(d.summary) || "—")}</p>`),
    section(I18N.t("d.modelTitle"), listHtml(d.model_signals)),
    section(I18N.t("d.communityTitle"), listHtml(d.community_signals)),
    section(I18N.t("d.cycleTitle"), `<p>${escapeHtml(I18N.pick(d.quota_cycle) || "—")}</p>`),
    section(I18N.t("d.eventsTitle"), eventsHtml(d.candidate_events)),
    section(I18N.t("d.historyTitle"), historyHtml(d.history)),
    section(I18N.t("d.quotaTitle"), quotaChartHtml(d.weekly_quota)),
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
    if (!p) { root.innerHTML = `<div class="empty">${I18N.t("d.notFound")}</div>`; return; }
    document.title = `Reset Radar · ${p.name}`;
    const speakers = (allSpeakers || []).filter((s) => s.platform === p.id);
    render(p, speakers);
  } catch (e) {
    root.innerHTML = `<div class="empty">${I18N.t("d.fail")}${escapeHtml(e.message)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
