// icons.js —— 免费可商用（MIT/ISC 开源协议）的内联 SVG 图标库
// 设计目标：用矢量化图标替换全站 emoji，保持现有蓝紫风格、零外部依赖、
//          兼容 file:// 离线预览。图标路径取自开源图标集（Tabler/Lucide 等 MIT/ISC 协议）。

(function () {
  "use strict";

  // 图标体：viewBox 0 0 24 24，stroke 用 currentColor（跟随文字颜色，便于配色）
  var PATHS = {
    home:    '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    chart:   '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M3 20h18"/>',
    info:    '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>',
    zap:     '<path d="M13 2 3 14h7l-1 8 10-12h-7L13 2z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    clipboard:'<path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 2h6v4H9z"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/>',
    file:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    radar:   '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/><path d="M15.2 8.8 19 5"/>',
    timer:   '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M12 2"/><path d="M9 2h6"/>',
    target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2.5"/>',
    sparkle: '<path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 16l-1.9-5.1L5.5 9l4.6-1.4L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>',
    check:   '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
    alert:   '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    calc:    '<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 7h8"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M8 16h.01"/><path d="M12 16h.01"/><path d="M16 16h.01"/>',
    plug:    '<path d="M12 22v-6"/><path d="M9 12V5"/><path d="M15 12V5"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M7 12h10"/>',
    server:  '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 8h.01"/><path d="M7 17h.01"/>',
    bot:     '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V4"/><circle cx="12" cy="3" r="1"/><path d="M9 12h.01"/><path d="M15 12h.01"/>',
    wave:    '<path d="M2 12c1.5-4 4.5-4 6 0s4.5 4 6 0 4.5-4 6 0"/><path d="M2 17c1.5-4 4.5-4 6 0s4.5 4 6 0 4.5-4 6 0"/>',
    bird:    '<path d="M4 20c6-9 12-14 16-16-1 5-2 9-5 12-3 3-7 5-11 5-2-3-1-7 3-10-1 2-1 4 1 5-1-1-1-2-1-3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.1 5.3"/><path d="M20 4v6h-6"/>'
  };

  function svg(name, size) {
    var p = PATHS[name] || PATHS.info;
    var s = size || 16;
    return '<svg class="icon-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  // emoji 映射：页面出现的目标 emoji → 图标名（含可选 VS16 \uFE0F）
  var EMO = {
    '\uD83C\uDFE0': 'home',            // 🏠
    '\uD83D\uDCCA': 'chart',           // 📊
    '\u2139\uFE0F': 'info',            // ℹ️
    '\u2139':       'info',            // ℹ
    '\u26A1\uFE0F': 'zap',             // ⚡️
    '\u26A1':       'zap',             // ⚡
    '\uD83D\uDCAC': 'message',         // 💬
    '\uD83D\uDCCB': 'clipboard',       // 📋
    '\uD83D\uDCDD': 'file',            // 📝
    '\uD83D\uDCE1\uFE0F': 'radar',     // 📡
    '\u23F1\uFE0F': 'timer',           // ⏱️
    '\u23F1':       'timer',           // ⏱
    '\uD83C\uDFAF': 'target',          // 🎯
    '\uD83D\uDCDC': 'history',         // 📜
    '\uD83D\uDDE3\uFE0F': 'radar',     // 🗣️
    '\u2728':       'sparkle',         // ✨
    '\u2705':       'check',           // ✅
    '\u26A0\uFE0F': 'alert',           // ⚠️
    '\u26A0':       'alert',           // ⚠
    '\uD83D\uDD0D': 'search',          // 🔍
    '\uD83E\uDDEE': 'calc',            // 🧮
    '\uD83D\uDD0C': 'plug',            // 🔌
    '\uD83D\uDD04': 'refresh',         // 🔄
    '\uD83D\uDDA5\uFE0F': 'server',    // 🖥️
    '\uD83E\uDD16': 'bot',             // 🤖
    '\uD83C\uDF0A': 'wave',            // 🌊
    '\uD83C\uDF1F': 'sparkle'          // 🌟
  };

  // 彩色徽标用的彩色圆点（红/黄/绿，保持原信号语义）
  var COLORIZED = {
    '\uD83D\uDD34': 'var(--high)',      // 🔴
    '\uD83D\uDFE1': 'var(--medium)',    // 🟡
    '\uD83D\uDFE2': 'var(--ok)'         // 🟢
  };

  // 把已映射 emoji 的文本节点替换成内联图标，保留其余文本（节点级整体替换，可重复调用）
  function decorate(root) {
    root = root || document.body;

    // 1) 显式 data-icon 占位（导航/品牌等静态位），已填充则跳过
    root.querySelectorAll('[data-icon]').forEach(function (el) {
      if (el.querySelector('.icon-svg')) return;
      var name = el.getAttribute('data-icon');
      var size = parseInt(el.getAttribute('data-size'), 10) || 18;
      el.innerHTML = svg(name, size);
    });

    // 2) 文本节点 emoji → 图标
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var tns = [];
    while (walker.nextNode()) tns.push(walker.currentNode);
    tns.forEach(function (tn) {
      if (!tn.nodeValue) return;
      var chars = Array.from(tn.nodeValue);
      var frag = document.createDocumentFragment();
      var buffer = '';
      var changed = false;
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (chars[i + 1] === '\uFE0F') { ch = chars[i] + '\uFE0F'; i++; }
        var ic = EMO[ch];
        var col = COLORIZED[ch];
        if (ic || col) {
          if (buffer) { frag.appendChild(document.createTextNode(buffer)); buffer = ''; }
          var span = document.createElement('span');
          span.className = 'ic-inline';
          span.innerHTML = ic ? svg(ic, 14) : '<span class="ic-dot" style="background:' + col + '"></span>';
          frag.appendChild(span.firstChild); // svg 或彩色圆点
          changed = true;
        } else {
          buffer += ch;
        }
      }
      if (buffer) frag.appendChild(document.createTextNode(buffer));
      if (changed) tn.parentNode.replaceChild(frag, tn);
    });
  }

  window.ICON = { svg: svg, decorate: decorate };

  // 页面就绪 + 语言切换后自动装饰（i18n 应用后才执行，避免先填充被覆盖）
  document.addEventListener('DOMContentLoaded', function () { try { decorate(document.body); } catch (e) {} });
  document.addEventListener('langchange', function () { try { decorate(document.body); } catch (e) {} });
})();