// 服务状态页

function eventHtml(ev) {
  if (!ev) return "";
  const ok = ev.status && ev.status.indexOf("已恢复") >= 0;
  return `
  <div class="svc-event">
    <div class="st ${ok ? "ok" : "warn"}">${escapeHtml(ev.status || "事件")}</div>
    ${ev.summary ? `<div class="desc">${escapeHtml(ev.summary)}</div>` : ""}
    <div class="time">${escapeHtml(ev.time || "")}${ev.duration ? " — 持续 " + escapeHtml(ev.duration) : ""}</div>
  </div>`;
}

function groupHtml(g) {
  const ok = g.status === "operational" || g.status === "normal";
  return `
  <div class="svc-group">
    <div class="head">
      <div>
        <div class="pname">${escapeHtml(g.platform_name || g.platform_id)}</div>
        <div class="src">${escapeHtml(g.source || "官方状态")}</div>
      </div>
      <span class="badge ${ok ? "low" : "medium"}">${ok ? "✅ 正常" : "⚠️ " + escapeHtml(STATUS_LABEL[g.status] || g.status)}</span>
    </div>
    ${g.summary && !g.events.length ? `<div class="svc-event"><div class="desc">${escapeHtml(g.summary)}</div></div>` : ""}
    ${(g.events || []).map(eventHtml).join("")}
  </div>`;
}

async function init() {
  const root = document.getElementById("svc");
  try {
    const list = await API.getServiceStatus();
    root.innerHTML = list.length ? list.map(groupHtml).join("") : `<div class="empty">暂无服务状态数据。</div>`;
    setActiveNav("status");
  } catch (e) {
    root.innerHTML = `<div class="empty">数据加载失败：${escapeHtml(e.message)}</div>`;
  }
}

function setActiveNav(key) {
  document.querySelectorAll(".bottomnav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === key);
  });
}

document.addEventListener("DOMContentLoaded", init);
