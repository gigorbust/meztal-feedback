(function () {
  // MezTal Feedback MVP — internal tool for George + Sarah.
  // Runs ON the live page via bookmarklet. Point/box markers + page-grouped sidebar.
  // ponytail: localStorage only (per-browser). Shared backend = future, not built.
  if (window.__mzfb) { window.__mzfb.toggle(); return; }

  var KEY = 'mzfb_' + location.origin;
  var C = '#f7903c';            // MezTal orange
  var data = load();            // { "/path": [note, ...] }
  var mode = null;              // 'point' | 'box' | null
  var dragStart = null, dragEl = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function path() { return location.pathname || '/'; }
  function notes() { return data[path()] || (data[path()] = []); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // --- robust-ish CSS selector for an element (compact) ---
  function selectorFor(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + CSS.escape(el.id);
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 5) {
      var tag = el.tagName.toLowerCase();
      var sib = el, n = 1;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) n++;
      parts.unshift(tag + ':nth-of-type(' + n + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function resolve(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }

  // --- styles ---
  var css = document.createElement('style');
  css.textContent = [
    '.mzfb-mk{position:absolute;z-index:2147483000;box-sizing:border-box}',
    '.mzfb-pin{width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + C + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.mzfb-pin b{transform:rotate(45deg);color:#fff;font:700 12px/1 system-ui}',
    '.mzfb-box{border:2px solid ' + C + ';background:rgba(247,144,60,.12);cursor:pointer}',
    '.mzfb-box b{position:absolute;top:-11px;left:-2px;background:' + C + ';color:#fff;font:700 12px/1.6 system-ui;padding:0 6px;border-radius:4px}',
    '.mzfb-bub{position:absolute;z-index:2147483001;max-width:260px;background:#111827;color:#fff;font:13px/1.5 system-ui;padding:10px 12px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.4);white-space:pre-wrap}',
    '.mzfb-bub textarea{width:240px;min-height:56px;border:0;border-radius:6px;padding:6px;font:13px system-ui;resize:vertical}',
    '.mzfb-bub .r{margin-top:8px;text-align:right}',
    '.mzfb-bub button{font:600 12px system-ui;border:0;border-radius:5px;padding:5px 10px;cursor:pointer}',
    '.mzfb-save{background:' + C + ';color:#fff}',
    '.mzfb-del{background:transparent;color:#f88;margin-right:6px}',
    '#mzfb-bar{position:fixed;top:12px;right:12px;z-index:2147483020;background:#111827;color:#fff;font:600 13px system-ui;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;gap:4px;padding:6px}',
    '#mzfb-bar button{background:#1f2937;color:#fff;border:0;border-radius:6px;padding:6px 9px;font:600 12px system-ui;cursor:pointer}',
    '#mzfb-bar button.on{background:' + C + '}',
    '#mzfb-side{position:fixed;top:0;right:0;width:300px;height:100%;z-index:2147483010;background:#0b1220;color:#e5e7eb;font:13px system-ui;box-shadow:-4px 0 20px rgba(0,0,0,.4);overflow:auto;padding:56px 12px 20px;box-sizing:border-box}',
    '#mzfb-side h3{font:700 12px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#93a3b8;margin:14px 0 6px}',
    '.mzfb-li{background:#111827;border-radius:8px;padding:8px 10px;margin:6px 0;cursor:pointer;border-left:3px solid ' + C + '}',
    '.mzfb-li .n{color:' + C + ';font-weight:700;margin-right:6px}',
    '.mzfb-li .t{display:block;margin-top:4px;color:#cbd5e1;white-space:pre-wrap}',
    '.mzfb-li .t.clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mzfb-hl{outline:3px solid ' + C + '!important;outline-offset:2px}'
  ].join('');
  document.head.appendChild(css);

  // --- toolbar ---
  var bar = document.createElement('div');
  bar.id = 'mzfb-bar';
  bar.innerHTML =
    '<button data-m="point">📍 Point</button>' +
    '<button data-m="box">▢ Box</button>' +
    '<button data-a="side">☰ List</button>' +
    '<button data-a="export">⤓ Export</button>' +
    '<button data-a="off">✕</button>';
  document.body.appendChild(bar);

  var side = document.createElement('div');
  side.id = 'mzfb-side';
  document.body.appendChild(side);

  var layer = document.createElement('div'); // markers live here
  document.body.appendChild(layer);

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { mode = (mode === b.dataset.m) ? null : b.dataset.m; syncBar(); }
    else if (b.dataset.a === 'side') { side.style.display = side.style.display === 'none' ? 'block' : 'none'; }
    else if (b.dataset.a === 'export') { exportMd(); }
    else if (b.dataset.a === 'off') { destroy(); }
  });
  function syncBar() {
    bar.querySelectorAll('button[data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === mode); });
    document.body.style.cursor = mode ? 'crosshair' : '';
  }

  // --- capture clicks/drags in a mode ---
  document.addEventListener('mousedown', onDown, true);
  function onDown(e) {
    if (!mode) return;
    if (e.target.closest('#mzfb-bar,#mzfb-side,.mzfb-bub,.mzfb-mk')) return;
    e.preventDefault(); e.stopPropagation();
    if (mode === 'point') { addPoint(e.pageX, e.pageY, e.target); }
    else { startBox(e); }
  }
  function startBox(e) {
    dragStart = { x: e.pageX, y: e.pageY, tgt: e.target };
    dragEl = document.createElement('div');
    dragEl.className = 'mzfb-mk mzfb-box';
    place(dragEl, e.pageX, e.pageY, 0, 0);
    layer.appendChild(dragEl);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }
  function onMove(e) {
    var x = Math.min(e.pageX, dragStart.x), y = Math.min(e.pageY, dragStart.y);
    place(dragEl, x, y, Math.abs(e.pageX - dragStart.x), Math.abs(e.pageY - dragStart.y));
  }
  function onUp(e) {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    var x = Math.min(e.pageX, dragStart.x), y = Math.min(e.pageY, dragStart.y);
    var w = Math.abs(e.pageX - dragStart.x), h = Math.abs(e.pageY - dragStart.y);
    layer.removeChild(dragEl); dragEl = null;
    if (w < 8 || h < 8) return; // ignore stray clicks
    addNote({ id: uid(), type: 'box', sel: selectorFor(dragStart.tgt), x: x, y: y, w: w, h: h, text: '', ts: Date.now() }, true);
  }
  function place(el, x, y, w, h) { el.style.left = x + 'px'; el.style.top = y + 'px'; if (w != null) { el.style.width = w + 'px'; el.style.height = h + 'px'; } }
  function addPoint(x, y, tgt) {
    addNote({ id: uid(), type: 'point', sel: selectorFor(tgt), x: x, y: y, text: '', ts: Date.now() }, true);
  }

  function addNote(note, edit) { notes().push(note); save(); render(); if (edit) openBubble(note.id, true); mode = null; syncBar(); }
  function del(id) { data[path()] = notes().filter(function (n) { return n.id !== id; }); save(); render(); }

  // --- render markers + sidebar ---
  function render() {
    layer.innerHTML = '';
    notes().forEach(function (n, i) {
      var m = document.createElement('div');
      m.className = 'mzfb-mk ' + (n.type === 'box' ? 'mzfb-box' : 'mzfb-pin');
      m.dataset.id = n.id;
      m.innerHTML = '<b>' + (i + 1) + '</b>';
      place(m, n.x, n.y, n.type === 'box' ? n.w : null, n.type === 'box' ? n.h : null);
      m.addEventListener('click', function (e) { e.stopPropagation(); openBubble(n.id); });
      layer.appendChild(m);
    });
    renderSide();
  }
  function renderSide() {
    var cur = path(), html = '';
    var pages = Object.keys(data).filter(function (p) { return data[p].length; });
    pages.sort(function (a, b) { return a === cur ? -1 : b === cur ? 1 : a.localeCompare(a); });
    pages.forEach(function (p) {
      html += '<h3>' + (p === cur ? '● ' : '') + esc(p) + '</h3>';
      data[p].forEach(function (n, i) {
        html += '<div class="mzfb-li" data-p="' + esc(p) + '" data-id="' + n.id + '">' +
          '<span class="n">' + (i + 1) + '</span>' +
          '<span class="t clip">' + (esc(n.text) || '<i>(empty)</i>') + '</span></div>';
      });
    });
    side.innerHTML = html || '<h3>No feedback yet</h3><div style="color:#64748b">Pick Point or Box, then click the page.</div>';
    side.querySelectorAll('.mzfb-li').forEach(function (li) {
      li.addEventListener('click', function (e) {
        var t = li.querySelector('.t');
        if (e.target === t) { t.classList.toggle('clip'); return; } // expand text in list
        if (li.dataset.p === cur) jumpTo(li.dataset.id); else location.assign(li.dataset.p);
      });
    });
  }
  function jumpTo(id) {
    var m = layer.querySelector('.mzfb-mk[data-id="' + id + '"]'); if (!m) return;
    window.scrollTo({ top: parseFloat(m.style.top) - 120, behavior: 'smooth' });
    m.classList.add('mzfb-hl'); setTimeout(function () { m.classList.remove('mzfb-hl'); }, 1500);
    openBubble(id);
  }

  // --- edit bubble ---
  var bub = null;
  function openBubble(id, edit) {
    closeBubble();
    var n = notes().find(function (x) { return x.id === id; }); if (!n) return;
    bub = document.createElement('div'); bub.className = 'mzfb-bub';
    bub.style.left = (n.x + 16) + 'px'; bub.style.top = (n.y + 16) + 'px';
    if (edit || !n.text) {
      bub.innerHTML = '<textarea placeholder="Feedback...">' + esc(n.text) + '</textarea>' +
        '<div class="r"><button class="mzfb-del">Delete</button><button class="mzfb-save">Save</button></div>';
      var ta = bub.querySelector('textarea'); ta.focus();
      bub.querySelector('.mzfb-save').onclick = function () { n.text = ta.value.trim(); save(); render(); closeBubble(); };
      bub.querySelector('.mzfb-del').onclick = function () { del(id); closeBubble(); };
    } else {
      bub.textContent = n.text;
      bub.addEventListener('dblclick', function () { openBubble(id, true); });
    }
    layer.appendChild(bub);
  }
  function closeBubble() { if (bub) { bub.remove(); bub = null; } }

  // --- export ---
  function exportMd() {
    var out = '# MezTal feedback — ' + location.host + '\n\n';
    Object.keys(data).forEach(function (p) {
      if (!data[p].length) return;
      out += '## ' + p + '\n';
      data[p].forEach(function (n, i) {
        out += (i + 1) + '. [' + n.type + '] ' + (n.text || '(empty)') + '\n   - selector: `' + n.sel + '`\n';
      });
      out += '\n';
    });
    navigator.clipboard.writeText(out).then(function () { flash('Copied feedback to clipboard ✓'); }, function () { prompt('Copy:', out); });
  }
  function flash(msg) {
    var f = document.createElement('div'); f.textContent = msg;
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483030;background:' + C + ';color:#fff;font:600 13px system-ui;padding:10px 14px;border-radius:8px';
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1800);
  }

  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // reposition markers to element on scroll/resize (keeps pins near their component)
  window.addEventListener('resize', render);

  function destroy() {
    [bar, side, layer, css].forEach(function (e) { e.remove(); });
    document.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('resize', render);
    document.body.style.cursor = '';
    window.__mzfb = null;
  }

  window.__mzfb = { toggle: function () { var s = side.style.display === 'none'; side.style.display = s ? 'block' : 'none'; }, destroy: destroy };
  render();
  flash('Feedback tool on — pick Point or Box');
})();
