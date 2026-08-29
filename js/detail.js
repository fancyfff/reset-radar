function local(en, zh) { return I18N.getLang() === "zh" ? zh : en; }
function productLabel(p) { return escapeHtml(I18N.pick(p.name)); }
function stateWindow(p) { return (p.state.windows || [])[0] || {}; }
function recovery(p) { return (p.recovery || {}).prediction || {}; }

function windowsHtml(p) {
  const current = stateWindow(p); const estimate = recovery(p);
  return `<div class="window-row"><div><b>${escapeHtml(I18N.pick((p.windows[0] || {}).name) || local("Usage cycle", "额度周期"))}</b><small>${local("Recovery", "恢复")} · ${escapeHtml(fmtCountdown(current.countdown_seconds))}</small></div><span class="window-confidence">${Math.round(((p.recovery || {}).confidence || 0) * 100)}%</span></div>`;
}
function historyHtml(p) {
  const confirmed = p.events.filter((event) => event.status === "confirmed");
  if (!confirmed.length) return `<p class="muted">${local("No confirmed reset events. Seed data is not shown as history.", "暂无已确认的重置事件；种子数据不会作为历史展示。")}</p>`;
  return `<div class="timeline">${confirmed.map((event) => `<div class="tl-item ${event.reset_kind === "extra" ? "tl-extra" : "tl-reset"}"><span class="tl-mark">${event.reset_kind === "extra" ? "⚡" : "●"}</span><span class="tl-time">${escapeHtml(fmtWhen(event.effective_at))}</span><span class="tl-reason">${escapeHtml(I18N.pick(event.reason) || event.event_type)}</span><span class="src">· ${escapeHtml(event.status)}</span></div>`).join("")}</div>`;
}
function whyHtml(p) {
  const evidence = (p.recovery || {}).evidence || {}; const estimate = recovery(p);
  return `<div class="why-grid"><span>${local("Observed cycles", "观测周期")}<b>${evidence.observed_cycles || 0}</b></span><span>${local("Median interval", "中位间隔")}<b>${evidence.median_cycle_hours || "—"}h</b></span><span>${local("Cycle variation", "周期波动")}<b>${evidence.mad_hours || "—"}h</b></span><span>${local("80% before", "80% 前恢复")}<b>${escapeHtml(fmtWhen((estimate.interval || {}).p80))}</b></span></div>`;
}
function render(p) {
  const current = stateWindow(p); const estimate = recovery(p); const chance = Math.round((((p.hazard || {}).prediction || {}).probability || 0) * 100);
  document.getElementById("ptitle").innerHTML = logoOrIcon(p); document.getElementById("dtitle").textContent = I18N.pick(p.name);
  const availability = p.state.availability === "available" ? local("AVAILABLE", "可用") : local("USAGE UNKNOWN", "额度状态未知");
  document.getElementById("detail").innerHTML = `<section class="detail-hero"><span class="availability ${escapeHtml(p.state.availability || "unknown")}">${availability}</span><h1>${productLabel(p)}</h1><p>${local("Next recovery estimate", "下次恢复估计")} · <b>${escapeHtml(fmtCountdown(current.countdown_seconds))}</b></p></section>
  <section class="block"><h3>${local("USAGE WINDOWS", "额度窗口")}</h3>${windowsHtml(p)}</section>
  <section class="block"><h3>${local("WHY THIS ESTIMATE?", "为何这样预测？")}</h3>${whyHtml(p)}<p class="muted">${local("Most likely", "最可能")} ${escapeHtml(fmtWhen(estimate.expected_at))} · ${local("95% before", "95% 前恢复")} ${escapeHtml(fmtWhen((estimate.interval || {}).p95))}</p></section>
  <section class="block"><h3>${local("RESET HISTORY", "重置历史")}</h3>${historyHtml(p)}</section>
  <section class="block"><h3>${local("RADAR", "雷达")}</h3><div class="hazard"><span>${local("Extra global reset in the next 24h", "未来24小时额外全局重置")}</span><b style="color:${colorFor(chance)}">${chance}%</b></div><p class="muted">${local("This is a separate event forecast, not your normal quota recovery.", "这是独立事件预测，并非正常额度恢复时间。")}</p></section>`;
  window.ICON.decorate(document.body);
}
async function init() { const root = document.getElementById("detail"); if (!root) return; try { const p = await API.getProduct(new URLSearchParams(location.search).get("id")); if (!p) throw new Error(local("Product not found", "未找到产品")); render(p); } catch (error) { root.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; } }
document.addEventListener("DOMContentLoaded", init);
