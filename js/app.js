// 首页主逻辑：渲染平台概览卡片

function renderTopMeta(data) {
  const el = document.getElementById("meta");
  const upd = data.last_updated ? fmtWhen(data.last_updated).split(" ")[1] : nowClock();
  el.innerHTML =
    `<span class="dot">●</span> ${I18N.t("meta.lastUpdated")}${escapeHtml(upd)}` +
    `<span>·</span><span>${I18N.t("meta.source")}</span>`;
}

function renderTabs(platforms, activeId) {
  const wrap = document.getElementById("tabs");
  wrap.innerHTML = platforms
    .map(
      (p) =>
        `<div class="tab ${p.id === activeId ? "active" : ""}" data-id="${escapeHtml(p.id)}">${logoOrIcon(p)} ${escapeHtml(p.name)}</div>`
    )
    .join("");
  wrap.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      const id = t.dataset.id;
      wrap.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.id === id));
      renderCards(platforms, id);
    });
  });
}

function cardHtml(p) {
  const sm = signalMeta(p.signal_strength);
  const pred = p.prediction_time ? fmtWhen(p.prediction_time) : "—";
  const cd = fmtCountdown(p.countdown_seconds);
  const lvl = signalLevelLabel(p.signal_level);
  return `
  <a class="card card-link" href="detail.html?id=${encodeURIComponent(p.id)}">
    <div class="row1">
      <div class="pname">${logoOrIcon(p)}${escapeHtml(p.name)}${p.data_source === "seed" ? ` <i class="seed-badge">${I18N.t("badge.seed")}</i>` : ""}</div>
      <div class="prob" data-prob="${p.probability}">0<small>%</small></div>
    </div>
    <div class="divider"></div>
    <div class="bar"><i style="width:0%"></i></div>
    <div class="kv">
      <span>${I18N.t("card.expected")}<b>${escapeHtml(pred)}</b></span>
      <span>${I18N.t("card.countdown")}<b>${escapeHtml(cd)}</b></span>
    </div>
    <div class="kv">
      <span>${I18N.t("card.confidence")}<b>${p.confidence}%</b></span>
      <span class="badge ${sm.cls}">${sm.label}</span>
    </div>
    <div class="kv">
      <span><span class="status-dot ${escapeHtml(p.status)}"></span> ${escapeHtml(lvl)}</span>
      <span class="cta">${I18N.t("card.view")}</span>
    </div>
  </a>`;
}

function renderCards(platforms, activeId) {
  const list = activeId ? platforms.filter((p) => p.id === activeId) : platforms;
  const root = document.getElementById("cards");
  root.innerHTML = list.map(cardHtml).join("");
  // 动画：数字滚动 + 进度条
  root.querySelectorAll(".card").forEach((c) => {
    const probEl = c.querySelector(".prob");
    const target = parseInt(probEl.dataset.prob, 10) || 0;
    const small = "<small>%</small>";
    countUp(probEl, target);
    setTimeout(() => { probEl.innerHTML = target + small; }, 950);
    const bar = c.querySelector(".bar > i");
    bar.style.background = `linear-gradient(90deg, ${colorFor(target)}, var(--accent-2))`;
    requestAnimationFrame(() => { bar.style.width = target + "%"; });
  });
}

async function init() {
  const root = document.getElementById("cards");
  try {
    const data = await API.load();
    renderTopMeta(data);
    const platforms = data.platforms || [];
    renderTabs(platforms, null);
    renderCards(platforms, null);
    setActiveNav("home");
  } catch (e) {
    root.innerHTML = `<div class="empty">${I18N.t("home.fail")}${escapeHtml(e.message)}</div>`;
  }
}

function setActiveNav(key) {
  document.querySelectorAll(".bottomnav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === key);
  });
}

document.addEventListener("DOMContentLoaded", init);
