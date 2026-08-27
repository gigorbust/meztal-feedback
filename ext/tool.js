(function () {
  // MezTal Feedback MVP — internal (George + Sarah).
  // Icon click = open: sidebar auto-shows, marking mode auto-on, no extra click needed.
  // Icon click again = close. All controls live INSIDE the sidebar — nothing floats over the site.
  // In-sidebar "Pause marking" toggle lets her click site links/nav without adding pins.
  if (window.__mzfb) { window.__mzfb.close(); return; }

  var KEY = 'mzfb_' + location.origin, C = '#f7903c', SIDEW = 300;
  var data = load(), commenting = true, dragStart = null, ghost = null, raf = 0;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function save() { saveLocal(); scheduleBackup(); }
  function path() { return location.pathname || '/'; }
  function notes() { return data[path()] || (data[path()] = []); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function selectorFor(el) {
    if (!el || el === document.body || el.nodeType !== 1) return 'body';
    if (el.id) return '#' + CSS.escape(el.id);
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 6) {
      var tag = el.tagName.toLowerCase(), sib = el, n = 1;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) n++;
      parts.unshift(tag + ':nth-of-type(' + n + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function resolve(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }
  function rectOf(sel) { var el = resolve(sel); return el ? el.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; }

  // Sidebar always occupies its lane while the tool is open (independent of pause/marking state)
  function scaleSite() {
    var s = (innerWidth - SIDEW) / innerWidth;
    document.body.style.transformOrigin = 'top left';
    document.body.style.transform = 'scale(' + s + ')';
    document.body.style.width = '100vw';
  }
  function unscaleSite() { document.body.style.transform = ''; document.body.style.width = ''; }

  // --- cloud backup via extension background (GitHub repo). Degrades to local-only if no extension. ---
  var hasBg = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  var backupT = 0;
  function scheduleBackup() { if (!hasBg) return; clearTimeout(backupT); setStatus('saving'); backupT = setTimeout(sendBackup, 1500); }
  function sendBackup() {
    chrome.runtime.sendMessage({ type: 'backup', data: data }, function (res) {
      if (chrome.runtime.lastError) { setStatus('error'); return; }
      setStatus(res && res.ok ? 'synced' : (res && res.configured === false ? 'notoken' : 'error'));
    });
  }
  function mergeCloud(cloud) {
    if (!cloud) return;
    Object.keys(cloud).forEach(function (p) {
      var byId = {}; (data[p] || []).forEach(function (n) { byId[n.id] = n; });
      cloud[p].forEach(function (cn) { var e = byId[cn.id]; if (!e || (cn.ts || 0) >= (e.ts || 0)) byId[cn.id] = cn; });
      data[p] = Object.keys(byId).map(function (k) { return byId[k]; });
    });
  }
  function restoreCloud(cb) {
    if (!hasBg) { cb(); return; }
    setStatus('loading');
    chrome.runtime.sendMessage({ type: 'restore' }, function (res) {
      if (chrome.runtime.lastError) { setStatus('error'); cb(); return; }
      if (res && res.ok && res.data) { mergeCloud(res.data); saveLocal(); }
      setStatus(res && res.ok ? (res.configured ? 'synced' : 'notoken') : 'error');
      cb();
    });
  }
  function setStatus(s) {
    var el = document.getElementById('mzfb-sync'); if (!el) return;
    var map = { saving: ['☁ saving…', '#93a3b8'], synced: ['☁ synced', '#4ade80'], loading: ['☁ loading…', '#93a3b8'], error: ['☁ sync error', '#f87171'], notoken: ['⚙ set token', C] };
    var m = map[s] || ['', '#93a3b8']; el.textContent = m[0]; el.style.color = m[1];
    el.style.cursor = s === 'notoken' ? 'pointer' : 'default';
    el.onclick = s === 'notoken' && hasBg ? function () { chrome.runtime.sendMessage({ type: 'options' }); } : null;
  }

  // --- styles ---
  var css = document.createElement('style');
  css.textContent = [
    '.mzfb-mk{position:fixed;z-index:2147483000;box-sizing:border-box;pointer-events:auto}',
    '.mzfb-pin{width:26px;height:26px;margin:-26px 0 0 -2px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + C + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.mzfb-pin b{transform:rotate(45deg);color:#fff;font:700 12px/1 system-ui}',
    '.mzfb-box{border:2px solid ' + C + ';background:rgba(247,144,60,.14);cursor:pointer}',
    '.mzfb-box b{position:absolute;top:-11px;left:-2px;background:' + C + ';color:#fff;font:700 12px/1.6 system-ui;padding:0 6px;border-radius:4px}',
    '.mzfb-box-txt{position:absolute;left:4px;right:4px;top:6px;bottom:4px;overflow:auto;font:12px/1.4 system-ui;color:#fff;background:rgba(17,24,39,.85);border-radius:4px;padding:4px 6px;pointer-events:none;white-space:pre-wrap}',
    '.mzfb-ghost{position:fixed;z-index:2147483005;border:2px dashed ' + C + ';background:rgba(247,144,60,.1);pointer-events:none}',
    '.mzfb-bub{position:fixed;z-index:2147483040;max-width:260px;background:#111827;color:#fff;font:13px/1.5 system-ui;padding:10px 12px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.5);white-space:pre-wrap}',
    '.mzfb-bub textarea{width:240px;min-height:56px;border:0;border-radius:6px;padding:6px;font:13px system-ui;resize:vertical}',
    '.mzfb-bub .r{margin-top:8px;text-align:right}.mzfb-bub button{font:600 12px system-ui;border:0;border-radius:5px;padding:5px 10px;cursor:pointer}',
    '.mzfb-save{background:' + C + ';color:#fff}.mzfb-del{background:transparent;color:#f88;margin-right:6px}',
    // sidebar: fixed, self-contained column. All controls live INSIDE it — nothing floats over the site.
    '#mzfb-side{position:fixed;top:0;right:0;width:' + SIDEW + 'px;height:100%;z-index:2147483030;background:#0b1220;color:#e5e7eb;font:13px system-ui;box-shadow:-4px 0 20px rgba(0,0,0,.4);display:flex;flex-direction:column;box-sizing:border-box}',
    '.mzfb-hdr{flex:0 0 auto;padding:16px 14px 12px;border-bottom:1px solid #1f2937}',
    '.mzfb-title-row{display:flex;align-items:center;justify-content:space-between}',
    '.mzfb-title{font:800 15px system-ui;color:#fff}',
    '#mzfb-sync{font:600 11px system-ui;white-space:nowrap}',
    '.mzfb-hint{color:#64748b;font-size:12px;margin-top:4px;line-height:1.5}',
    '.mzfb-ctrls{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}',
    '.mzfb-ctrls button{background:#1f2937;color:#fff;border:0;border-radius:6px;padding:7px 10px;font:600 12px system-ui;cursor:pointer}',
    '.mzfb-ctrls button.on{background:' + C + ';color:#111827}',
    '#mzfb-list{flex:1 1 auto;overflow:auto;padding:12px 14px 20px}',
    '.mzfb-empty{color:#64748b;font-size:13px;text-align:center;padding:34px 10px}',
    '#mzfb-list h3{font:700 11px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#93a3b8;margin:14px 0 6px}',
    '#mzfb-list h3:first-child{margin-top:0}',
    '.mzfb-li{background:#111827;border-radius:8px;padding:8px 10px;margin:6px 0;cursor:pointer;border-left:3px solid ' + C + '}',
    '.mzfb-li-row{display:flex;align-items:flex-start;gap:6px}',
    '.mzfb-li .n{color:' + C + ';font-weight:700;flex:0 0 auto}',
    '.mzfb-li .t{flex:1 1 auto;min-width:0;color:#cbd5e1;white-space:pre-wrap}.mzfb-li .t.clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mzfb-li-del{flex:0 0 auto;background:transparent;border:0;color:#64748b;cursor:pointer;font-size:13px;line-height:1;padding:2px 4px;border-radius:4px}',
    '.mzfb-li-del:hover{color:#f87171;background:rgba(248,113,113,.12)}',
    '.mzfb-hl{outline:3px solid ' + C + '!important;outline-offset:2px}'
  ].join('');
  document.documentElement.appendChild(css);

  // --- sidebar (header controls + scrollable list) ---
  var root = document.documentElement;
  var side = document.createElement('div'); side.id = 'mzfb-side';
  side.innerHTML =
    '<div class="mzfb-hdr">' +
      '<div class="mzfb-title-row"><span class="mzfb-title">MezTal Feedback</span><span id="mzfb-sync"></span></div>' +
      '<div class="mzfb-hint">Click the page to pin a note. Click and drag to mark an area.</div>' +
      '<div class="mzfb-ctrls">' +
        '<button data-a="mode">⏸ Pause marking</button>' +
        '<button data-a="restore" title="Pull latest notes from the cloud">⟳</button>' +
        '<button data-a="export">⤓ Export</button>' +
        '<button data-a="off">✕</button>' +
      '</div>' +
    '</div>' +
    '<div id="mzfb-list"></div>';
  root.appendChild(side);
  var list = side.querySelector('#mzfb-list');
  var layer = document.createElement('div'); layer.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none'; root.appendChild(layer);

  side.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'mode') { commenting = !commenting; syncCtrls(); }
    else if (b.dataset.a === 'restore') { restoreCloud(function () { renderList(); flash('Restored from cloud ✓'); }); }
    else if (b.dataset.a === 'export') { exportMd(); }
    else if (b.dataset.a === 'off') { close(); }
  });
  function syncCtrls() {
    var m = side.querySelector('[data-a="mode"]');
    m.classList.toggle('on', !commenting);
    m.textContent = commenting ? '⏸ Pause marking' : '▶ Resume marking';
    root.style.cursor = commenting ? 'crosshair' : '';
  }

  // --- capture clicks/drags only while marking is on ---
  document.addEventListener('mousedown', onDown, true);
  function onDown(e) {
    if (!commenting) return;
    if (e.target.closest('#mzfb-side,.mzfb-bub,.mzfb-mk')) return;
    e.preventDefault(); e.stopPropagation();
    dragStart = { x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }
  function onMove(e) {
    var x = Math.min(e.clientX, dragStart.x), y = Math.min(e.clientY, dragStart.y),
      w = Math.abs(e.clientX - dragStart.x), h = Math.abs(e.clientY - dragStart.y);
    if (!ghost && (w > 6 || h > 6)) { ghost = document.createElement('div'); ghost.className = 'mzfb-ghost'; layer.appendChild(ghost); }
    if (ghost) { ghost.style.left = x + 'px'; ghost.style.top = y + 'px'; ghost.style.width = w + 'px'; ghost.style.height = h + 'px'; }
  }
  function onUp(e) {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    if (ghost) { ghost.remove(); ghost = null; }
    var dx = Math.abs(e.clientX - dragStart.x), dy = Math.abs(e.clientY - dragStart.y);
    var tgt = topElAt(dragStart.x, dragStart.y);
    var sel = selectorFor(tgt), r = tgt ? tgt.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    function fr(cx, cy) { return { fx: (cx - r.left) / (r.width || 1), fy: (cy - r.top) / (r.height || 1) }; }
    if (dx < 7 && dy < 7) {
      var p = fr(dragStart.x, dragStart.y);
      addNote({ id: uid(), type: 'point', sel: sel, fx: p.fx, fy: p.fy, text: '', ts: Date.now() });
    } else {
      var a = fr(Math.min(e.clientX, dragStart.x), Math.min(e.clientY, dragStart.y));
      var b = fr(Math.max(e.clientX, dragStart.x), Math.max(e.clientY, dragStart.y));
      addNote({ id: uid(), type: 'box', sel: sel, fx: a.fx, fy: a.fy, fx2: b.fx, fy2: b.fy, text: '', ts: Date.now() });
    }
  }
  function topElAt(x, y) {
    var prev = layer.style.display; layer.style.display = 'none';
    var el = document.elementFromPoint(x, y); layer.style.display = prev; return el;
  }

  function addNote(n) { notes().push(n); save(); render(); openBubble(n.id, true); }
  function del(id) { data[path()] = notes().filter(function (n) { return n.id !== id; }); save(); render(); }

  function posOf(n) {
    var r = rectOf(n.sel);
    if (n.type === 'box') {
      var x1 = r.left + n.fx * r.width, y1 = r.top + n.fy * r.height, x2 = r.left + n.fx2 * r.width, y2 = r.top + n.fy2 * r.height;
      return { left: Math.min(x1, x2), top: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    return { left: r.left + n.fx * r.width, top: r.top + n.fy * r.height };
  }
  function render() {
    layer.innerHTML = '';
    notes().forEach(function (n, i) {
      var p = posOf(n), m = document.createElement('div');
      m.className = 'mzfb-mk ' + (n.type === 'box' ? 'mzfb-box' : 'mzfb-pin'); m.dataset.id = n.id;
      m.innerHTML = '<b>' + (i + 1) + '</b>' + (n.type === 'box' && n.text ? '<span class="mzfb-box-txt">' + esc(n.text) + '</span>' : '');
      m.style.left = p.left + 'px'; m.style.top = p.top + 'px';
      if (n.type === 'box') { m.style.width = p.w + 'px'; m.style.height = p.h + 'px'; }
      m.addEventListener('click', function (e) { e.stopPropagation(); openBubble(n.id); });
      layer.appendChild(m);
    });
    renderList();
  }
  function renderList() {
    var cur = path();
    var pages = Object.keys(data).filter(function (p) { return data[p].length; });
    if (!pages.length) { list.innerHTML = '<div class="mzfb-empty">Feedback items will collect here.</div>'; return; }
    pages.sort(function (a, b) { return a === cur ? -1 : b === cur ? 1 : a.localeCompare(b); });
    var html = '';
    pages.forEach(function (p) {
      html += '<h3>' + (p === cur ? '● ' : '') + esc(p) + '</h3>';
      data[p].forEach(function (n, i) {
        html += '<div class="mzfb-li" data-p="' + esc(p) + '" data-id="' + n.id + '"><div class="mzfb-li-row"><span class="n">' + (i + 1) +
          '</span><span class="t clip">' + (esc(n.text) || '<i>(empty)</i>') + '</span><button class="mzfb-li-del" title="Delete">✕</button></div></div>';
      });
    });
    list.innerHTML = html;
    list.querySelectorAll('.mzfb-li-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); del(btn.closest('.mzfb-li').dataset.id); });
    });
    list.querySelectorAll('.mzfb-li').forEach(function (li) {
      li.addEventListener('click', function (e) {
        var t = li.querySelector('.t');
        if (e.target === t) { t.classList.toggle('clip'); return; }
        if (li.dataset.p === cur) jumpTo(li.dataset.id); else location.assign(li.dataset.p);
      });
    });
  }
  function jumpTo(id) {
    var n = notes().find(function (x) { return x.id === id; }); if (!n) return;
    var el = resolve(n.sel); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function () {
      render();
      var m = layer.querySelector('.mzfb-mk[data-id="' + id + '"]');
      if (m) { m.classList.add('mzfb-hl'); setTimeout(function () { m.classList.remove('mzfb-hl'); }, 1600); }
      openBubble(id);
    }, 350);
  }

  var bub = null;
  function openBubble(id, edit) {
    closeBubble();
    var n = notes().find(function (x) { return x.id === id; }); if (!n) return;
    var p = posOf(n); bub = document.createElement('div'); bub.className = 'mzfb-bub';
    bub.style.left = Math.min(p.left + 14, innerWidth - SIDEW - 280) + 'px'; bub.style.top = (p.top + 14) + 'px';
    if (edit || !n.text) {
      bub.innerHTML = '<textarea placeholder="Feedback...">' + esc(n.text) + '</textarea><div class="r"><button class="mzfb-del">Delete</button><button class="mzfb-save">Save</button></div>';
      var ta = bub.querySelector('textarea'); ta.focus();
      ta.addEventListener('input', function () { n.text = ta.value; save(); }); // auto-save every keystroke
      bub.querySelector('.mzfb-save').onclick = function () { n.text = ta.value.trim(); save(); render(); closeBubble(); };
      bub.querySelector('.mzfb-del').onclick = function () { del(id); closeBubble(); };
    } else {
      bub.innerHTML = '<div>' + esc(n.text) + '</div><div class="r"><button class="mzfb-del">Delete</button><button class="mzfb-save">Edit</button></div>';
      bub.querySelector('.mzfb-del').onclick = function () { del(id); closeBubble(); };
      bub.querySelector('.mzfb-save').onclick = function () { openBubble(id, true); };
    }
    root.appendChild(bub);
  }
  function closeBubble() { if (bub) { bub.remove(); bub = null; } }

  function exportMd() {
    var out = '# MezTal feedback — ' + location.host + '\n\n';
    Object.keys(data).forEach(function (p) {
      if (!data[p].length) return; out += '## ' + p + '\n';
      data[p].forEach(function (n, i) { out += (i + 1) + '. [' + n.type + '] ' + (n.text || '(empty)') + '\n   - selector: `' + n.sel + '`\n'; });
      out += '\n';
    });
    navigator.clipboard.writeText(out).then(function () { flash('Copied feedback ✓'); }, function () { prompt('Copy:', out); });
  }
  function flash(msg) {
    var f = document.createElement('div'); f.textContent = msg;
    f.style.cssText = 'position:fixed;bottom:20px;right:' + (SIDEW + 20) + 'px;z-index:2147483060;background:' + C + ';color:#111827;font:700 13px system-ui;padding:10px 14px;border-radius:8px';
    root.appendChild(f); setTimeout(function () { f.remove(); }, 1700);
  }

  function reflow() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; render(); }); }
  function onResize() { scaleSite(); reflow(); }
  window.addEventListener('scroll', reflow, true);
  window.addEventListener('resize', onResize);

  function close() {
    [side, layer, css].forEach(function (e) { e.remove(); });
    document.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('scroll', reflow, true);
    window.removeEventListener('resize', onResize);
    unscaleSite(); root.style.cursor = '';
    window.__mzfb = null;
  }

  window.__mzfb = { toggle: close, close: close };
  syncCtrls(); scaleSite(); render();
  restoreCloud(function () { render(); });
})();
