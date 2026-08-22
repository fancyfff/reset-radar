// 服务状态页

function eventHtml(ev) {
  if (!ev) return "";
  const ok = isRecovered(ev.status);
  return `
  <div class="svc-event">
    <div class="st ${ok ? "ok" : "warn"}">${escapeHtml(I18N.pick(ev.status) || I18N.t("status.event"))}</div>
    ${ev.summary ? `<div class="desc">${escapeHtml(I18N.pick(ev.summary))}</div>` : ""}
    <div class="time">${escapeHtml(ev.time || "")}${ev.duration ? " · " + I18N.t("status.duration") + " " + escapeHtml(I18N.pick(ev.duration)) : ""}</div>
  </div>`;
}

function groupHtml(g) {
  const ok = g.status === "operational" || g.status === "normal";
  return `
  <div class="svc-group">
    <div class="head">
      <div>
        <div class="pname">${escapeHtml(g.platform_name || g.platform_id)}</div>
        <div class="src">${escapeHtml(I18N.pick(g.source) || I18N.t("status.official"))}</div>
      </div>
      <span class="badge ${ok ? "low" : "medium"}">${ok ? I18N.t("status.okBadge") : "⚠️ " + escapeHtml(statusText(g.status) || g.status)}</span>
    </div>
    ${g.summary && !g.events.length ? `<div class="svc-event"><div class="desc">${escapeHtml(I18N.pick(g.summary))}</div></div>` : ""}
    ${(g.events || []).map(eventHtml).join("")}
  </div>`;
}

async function init() {
  const root = document.getElementById("svc");
  try {
    const list = await API.getServiceStatus();
    root.innerHTML = list.length ? list.map(groupHtml).join("") : `<div class="empty">${I18N.t("status.empty")}</div>`;
    setActiveNav("status");
  } catch (e) {
    root.innerHTML = `<div class="empty">${I18N.t("status.fail")}${escapeHtml(e.message)}</div>`;
  }
}

function setActiveNav(key) {
  document.querySelectorAll(".bottomnav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === key);
  });
}

document.addEventListener("DOMContentLoaded", init);
