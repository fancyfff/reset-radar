function t(en, zh) { return I18N.getLang() === "zh" ? zh : en; }
function productName(p) { return escapeHtml(I18N.pick(p.name)); }
function countdownOf(p) { return (p.state.windows && p.state.windows[0] && p.state.windows[0].countdown_seconds) || 0; }
function hazardOf(p) { return ((p.hazard && p.hazard.prediction.probability) || 0) * 100; }

function renderTopMeta(data) {
  const when = data.generated_at ? fmtWhen(data.generated_at) : nowClock() + " " + tzAbbr();
  document.getElementById("meta").innerHTML = `<span class="dot">●</span> ${escapeHtml(t("Updated ", "更新于 "))}${escapeHtml(when)}`;
}
function availabilityCard(p) {
  const availability = p.state.availability === "available" ? t("Available", "可用") : t("Limited", "受限");
  return `<a class="answer-row" href="detail.html?id=${encodeURIComponent(p.id)}"><span class="answer-name">${logoOrIcon(p)}${productName(p)}</span><span><b class="availability">${availability}</b><small>${escapeHtml(fmtCountdown(countdownOf(p)))}</small></span></a>`;
}
function section(title, body) { return `<section class="dashboard-section"><h2>${title}</h2>${body}</section>`; }
function renderDashboard(products) {
  const available = products.filter((p) => p.state.availability === "available").length;
  const next = [...products].sort((a, b) => countdownOf(a) - countdownOf(b)).slice(0, 4);
  const recent = products.flatMap((p) => p.events.filter((e) => e.event_type === "global_reset").slice(0, 1).map((e) => [p, e])).sort((a, b) => b[1].effective_at.localeCompare(a[1].effective_at)).slice(0, 4);
  const nextRows = next.map((p) => `<a href="detail.html?id=${encodeURIComponent(p.id)}"><span>${productName(p)}</span><b>${escapeHtml(fmtCountdown(countdownOf(p)))}</b></a>`).join("");
  const eventRows = recent.length ? recent.map(([p, e]) => `<a class="event-row" href="detail.html?id=${encodeURIComponent(p.id)}"><span>⚡ ${productName(p)}</span><span>${escapeHtml(fmtWhen(e.effective_at))} · ${escapeHtml(e.status)}</span></a>`).join("") : `<p class="muted">${t("No confirmed global resets yet.", "暂无已确认的全局额外重置。")}</p>`;
  const radarRows = products.map((p) => { const chance = Math.round(hazardOf(p)); return `<a class="radar-row" href="detail.html?id=${encodeURIComponent(p.id)}"><span>${logoOrIcon(p)}${productName(p)}<small>${t("Extra reset in 24h", "24小时额外重置")}</small></span><b style="color:${colorFor(chance)}">${chance}%</b></a>`; }).join("");
  document.getElementById("cards").innerHTML = `<section class="hero"><p>${t("What can I use right now?", "现在可以用什么？")}</p><div class="answer-list">${products.map(availabilityCard).join("")}</div></section>` + section(`${t("AVAILABLE NOW", "当前可用")} <em>${available} / ${products.length}</em>`, "") + section(t("NEXT RECOVERIES", "下一次恢复"), `<div class="next-list">${nextRows}</div>`) + section(t("RECENT EXTRA RESETS", "近期额外重置"), eventRows) + section(t("RESET RADAR", "重置雷达"), `<p class="section-copy">${t("Probability of an extra global reset in the next 24 hours.", "未来24小时出现额外全局重置的概率。")}</p><div class="radar-list">${radarRows}</div>`);
}
async function init() {
  const root = document.getElementById("cards");
  try { const data = await API.load(); renderTopMeta(data); renderDashboard(await API.getProducts()); setActiveNav("home"); window.ICON.decorate(document.body); }
  catch (error) { root.innerHTML = `<div class="empty">${escapeHtml(t("Failed to load data: ", "数据加载失败："))}${escapeHtml(error.message)}</div>`; }
}
function setActiveNav(key) { document.querySelectorAll(".bottomnav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === key)); }
document.addEventListener("DOMContentLoaded", init);
