async function init() {
  const root = document.getElementById("history");
  try {
    const products = await API.getProducts();
    root.innerHTML = products.map((p) => `<section class="block"><h3>${escapeHtml(I18N.pick(p.name))}</h3>${p.events.length ? p.events.map((e) => `<div class="ev"><span>${escapeHtml(fmtWhen(e.effective_at))} · ${escapeHtml(e.event_type)}</span><span class="conf">${escapeHtml(e.status)}</span></div>`).join("") : `<p class="muted">No events recorded.</p>`}</section>`).join("");
  } catch (error) { root.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}
document.addEventListener("DOMContentLoaded", init);
