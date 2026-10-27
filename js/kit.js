/* Web component kit: HTML builders shared by every page, styled by css/kit.css.
   Same vocabulary as the mobile kit (mobile/ui/kit.js) at web density: Inter 14/20 body, 12px caps
   section labels, cards radius 12 to 16 with a 1px line, 44px controls, chips on tints.
   Every builder returns an HTML string. Routing hooks are data-go attributes handled by the shell. */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon;
  var UI = SE.ui = {};

  UI.sec = function (title, right, body, id) {
    return '<section class="sec"' + (id ? ' aria-labelledby="' + id + '"' : '') + '><div class="sec-head"><h2' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2>' + (right || '') + '</div>' + body + '</section>';
  };
  UI.card = function (body, cls) { return '<div class="card ' + (cls || '') + '">' + body + '</div>'; };
  // image stand-ins (parts, machines, systems) are plain hatched grey, no icon; a type glyph (orders,
  // manuals) is drawn as a bare symbol
  var IMG = ['box', 'truck-side', 'layers', 'settings-sliders', 'picture'];
  UI.thumb = function (ic, size) { return !ic || IMG.indexOf(ic) >= 0 ? '<span class="pthumb ph' + (size ? ' ' + size : '') + '" aria-hidden="true"></span>' : '<span class="sym' + (size ? ' ' + size : '') + '" aria-hidden="true">' + icon(ic) + '</span>'; };
  // 1016 (review F09): no photo yet, so a small hatched thumbnail beside the name instead of a large empty plate
  UI.thumb = function (label) { return '<div class="img-slot ph thumb" role="img" aria-label="' + esc(label) + '"></div>'; };
  UI.imgSlot = function (label, h) {
    return '<div class="img-slot ph" style="height:' + (h || 180) + 'px" role="img" aria-label="' + esc(label) + '"></div>';
  };
  UI.stock = function (p) { return '<span class="stock t-' + SE.tone(p.stock) + '">' + esc(p.stock) + '</span>'; };
  // table: cols [[label, cls]], rows of cell html; o.rowAttrs(i) adds attributes per row (clickable rows use data-go)
  UI.table = function (cols, rows, o) {
    o = o || {};
    return '<div class="tbl-wrap"><table class="tbl' + (o.cls ? ' ' + o.cls : '') + '"><thead><tr>' + cols.map(function (c) { return '<th scope="col" class="' + (c[1] || '') + '">' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + (rows.length ? rows.map(function (r, i) {
        return '<tr' + (o.rowAttrs ? ' ' + o.rowAttrs(i) : '') + '>' + r.map(function (cell, j) { return '<td class="' + (cols[j][1] || '') + '">' + cell + '</td>'; }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + cols.length + '" class="tbl-empty">' + esc(o.empty || 'Nothing to show') + '</td></tr>') + '</tbody></table></div>';
  };
  UI.kv = function (pairs) {
    return '<dl class="kv">' + pairs.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
  };
  UI.empty = function (o) {
    return '<div class="empty-state"><span class="es-ico t-' + (o.tone || 'success') + '">' + icon(o.icon || 'check') + '</span><b>' + esc(o.title) + '</b>' +
      (o.text ? '<p>' + esc(o.text) + '</p>' : '') + (o.action || '') + '</div>';
  };
  // 1017: masonry. The grid's children sit in its columns in reading order, each spanning as many 8px rows as its own
  // height needs (UI Elements grid: "Primary rhythm: 8 px"), so panels of different heights pack without holes. A
  // ResizeObserver re-spans a panel whose content changes (a carousel slide, a dismissed card); a MutationObserver
  // picks up panels added or removed. Each panel is its own size container, so what is inside adapts to the column.
  UI.masonry = function (grid) {
    if (!grid || grid.dataset.masonry === 'on') return;
    grid.dataset.masonry = 'on';
    var queued = false;
    // each panel goes to the column that is shortest so far, in reading order (true masonry, so the columns end
    // level), placed explicitly by column and row so the browser's auto-placement cannot reorder or leave holes
    function layout() {
      queued = false;
      var st = getComputedStyle(grid), row = parseFloat(st.gridAutoRows) || 8;
      var cols = st.gridTemplateColumns.split(' ').filter(Boolean).length || 1, tops = [];
      for (var i = 0; i < cols; i++) tops.push(0);
      [].forEach.call(grid.children, function (c) {
        if (c.hidden || getComputedStyle(c).display === 'none') return;
        var h = c.getBoundingClientRect().height + (parseFloat(getComputedStyle(c).marginBottom) || 0);
        var span = Math.max(1, Math.ceil(h / row)), col = tops.indexOf(Math.min.apply(null, tops));
        var gc = String(col + 1), gr = (tops[col] + 1) + ' / span ' + span;
        if (c.style.gridColumn !== gc) c.style.gridColumn = gc;
        if (c.style.gridRow !== gr) c.style.gridRow = gr;
        tops[col] += span;
      });
    }
    function soon() { if (!queued) { queued = true; requestAnimationFrame(layout); } }
    var ro = new ResizeObserver(soon);
    function watch() { ro.disconnect(); ro.observe(grid); [].forEach.call(grid.children, function (c) { ro.observe(c); }); soon(); }
    new MutationObserver(watch).observe(grid, { childList: true });
    watch();
    layout();
  };
  UI.banner = function (html, tone, ic) { return '<div class="banner t-' + (tone || 'info') + '">' + icon(ic || 'info') + '<p>' + html + '</p></div>'; };
  // segmented filter (single choice): items [[value, label, count]]
  UI.seg = function (name, items, value) {
    return '<div class="seg" role="tablist" aria-label="' + esc(name) + '">' + items.map(function (it) {
      var on = it[0] === value;
      return '<button type="button" role="tab" aria-selected="' + on + '" data-seg="' + esc(it[0]) + '">' + esc(it[1]) + (it[2] != null ? '<span class="n">' + it[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  };
  UI.stepper = function (val, label, attrs) {
    return '<div class="stepper" role="group" aria-label="' + esc(label || 'Quantity') + '"' + (attrs || '') + '>' +
      '<button type="button" data-step="-1" aria-label="Decrease">' + icon('minus-small') + '</button><output aria-live="polite">' + val + '</output>' +
      '<button type="button" data-step="1" aria-label="Increase">' + icon('plus-small') + '</button></div>';
  };
  UI.timeline = function (steps) {
    var cur = steps.findIndex(function (s) { return !s[1]; });
    return '<ol class="timeline">' + steps.map(function (s, i) {
      var st = s[1] ? 'done' : i === cur ? 'now' : 'todo';
      return '<li class="' + st + '"><span class="tl-dot">' + (st === 'done' ? icon('check') : '') + '</span><b>' + esc(s[0]) + '</b><small>' + esc(s[1] || (i === cur ? 'Next' : 'Pending')) + '</small></li>';
    }).join('') + '</ol>';
  };
  // modal dialog on a scrim; returns { el, close }. o.title, o.body, o.foot, o.onClose, o.wide
  UI.dialog = function (o) {
    var host = document.createElement('div');
    host.className = 'dlg-host';
    host.innerHTML = '<div class="dlg-scrim" data-dlg-close></div><div class="dlg' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="dlg-t">' +
      '<header class="dlg-head"><h2 id="dlg-t">' + esc(o.title) + '</h2><button type="button" class="dlg-x" aria-label="Close" data-dlg-close>' + icon('cross-small') + '</button></header>' +
      '<div class="dlg-body">' + o.body + '</div>' + (o.foot ? '<footer class="dlg-foot">' + o.foot + '</footer>' : '') + '</div>';
    document.body.appendChild(host);
    var last = document.activeElement;
    var d = host.querySelector('.dlg');
    SE.animate(d, [{ opacity: 0, transform: 'translateY(8px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
    var first = d.querySelector('[data-autofocus]') || d.querySelector('input, textarea, select, button:not(.dlg-x)');
    if (first && !SE.capture) first.focus();
    function key(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        var f = [].slice.call(d.querySelectorAll('button, [href], input, select, textarea')).filter(function (x) { return !x.disabled && x.offsetParent; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    function close() {
      document.removeEventListener('keydown', key, true);
      host.remove();
      if (last && document.contains(last)) last.focus();
      if (o.onClose) o.onClose();
    }
    document.addEventListener('keydown', key, true);
    host.addEventListener('click', function (e) { if (e.target.closest('[data-dlg-close]')) close(); });
    return { el: d, close: close };
  };
  // action menu anchored to a button (cart actions): items [{ label, icon, run }]; arrows move, Enter runs,
  // Escape or a click outside closes and returns focus to the button. Returns { close }.
  UI.menu = function (btn, items) {
    var host = document.createElement('div');
    host.className = 'mn';
    host.setAttribute('role', 'menu');
    host.setAttribute('aria-label', btn.getAttribute('aria-label') || btn.textContent.trim());
    host.innerHTML = items.map(function (it, i) { return '<button type="button" role="menuitem" class="mn-i" data-mi="' + i + '" tabindex="-1">' + icon(it.icon) + '<span>' + esc(it.label) + '</span></button>'; }).join('');
    document.body.appendChild(host);
    var r = btn.getBoundingClientRect();
    host.style.top = (r.bottom + window.scrollY + 6) + 'px';
    host.style.left = Math.max(16, Math.min(window.innerWidth - host.offsetWidth - 16, r.right - host.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    var opts = [].slice.call(host.querySelectorAll('.mn-i')), at = 0;
    function focus(i) { at = (i + opts.length) % opts.length; opts[at].focus(); }
    if (!SE.capture) focus(0);
    function close(back) {
      document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', key, true);
      host.remove(); btn.setAttribute('aria-expanded', 'false');
      if (back) btn.focus();
    }
    function outside(e) { if (!host.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(false); }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); focus(at + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focus(at - 1); }
      else if (e.key === 'Tab') close(false);
    }
    host.addEventListener('click', function (e) { var b = e.target.closest('[data-mi]'); if (!b) return; close(true); items[+b.dataset.mi].run(); });
    document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', key, true);
    SE.animate(host, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 140 });
    return { close: close, el: host };
  };
  // ---------------------------------------------------------------- carousel (web-full marketing kit)
  // UI.carousel(o) returns the html; UI.carousel.bind(root) wires every carousel inside root and returns a
  // cleanup. o: { label, slides: [html], cls, auto (ms between slides, 0 = no autoplay), id }
  // Slides sit on a scroll-snap track (swipe, trackpad, drag with the mouse); previous and next, 1 dot per
  // page; arrow keys while focus is inside; autoplay pauses on hover, on focus, in a hidden tab, and with the
  // pause button (WCAG 2.2.2), and never runs under reduced motion or in capture mode. The slides announce
  // themselves ("2 of 4") and the track becomes a polite live region while nothing plays.
  var cn = 0;
  UI.carousel = function (o) {
    var id = o.id || 'crsl-' + (++cn), n = o.slides.length;
    return '<section class="crsl ' + (o.cls || '') + '" id="' + id + '" data-carousel data-auto="0" aria-roledescription="carousel" aria-label="' + esc(o.label) + '">' +
      '<div class="crsl-track" tabindex="0" aria-live="polite">' + o.slides.map(function (h, i) {
        return '<div class="crsl-slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + n + '">' + h + '</div>';
      }).join('') + '</div>' +
      // 1021 (owner): the bars are the only control (no play, previous or next buttons); arrow keys on the track and
      // dragging still page. No autoplay: without a pause button moving slides would fail WCAG 2.2.2
      '<div class="crsl-ctl"' + (n < 2 ? ' hidden' : '') + '>' +
        '<div class="crsl-dots" role="group" aria-label="Choose a slide"></div>' +
      '</div></section>';
  };
  UI.carousel.bind = function (root) {
    var stops = [];
    root.querySelectorAll('[data-carousel]:not([data-bound])').forEach(function (c) {
      c.dataset.bound = '1';
      var track = c.querySelector('.crsl-track'), dots = c.querySelector('.crsl-dots'), play = c.querySelector('.crsl-play');
      var auto = +c.dataset.auto, timer = null, paused = !auto || SE.reducedMotion || SE.capture, hover = false, focus = false;
      function step() { var a = track.children[0], b = track.children[1]; return a ? (b ? b.offsetLeft - a.offsetLeft : a.offsetWidth) : 1; }
      function perView() { return Math.max(1, Math.round(track.clientWidth / step())); }
      function pages() { return Math.max(1, Math.ceil(track.children.length - perView() + 1)); }
      function at() { return Math.min(pages() - 1, Math.round(track.scrollLeft / step())); }
      function go(k, smooth) {
        var n = pages(); k = (k + n) % n;
        track.scrollTo({ left: k * step(), behavior: smooth === false || SE.reducedMotion ? 'auto' : 'smooth' });
        sync(k);
      }
      function sync(k) {
        if (k == null) k = at();
        var n = pages();
        if (dots.children.length !== n) dots.innerHTML = Array.from({ length: n }, function (_, i) { return '<button type="button" class="dot" data-crsl-dot="' + i + '" aria-label="Slide ' + (i + 1) + ' of ' + n + '"></button>'; }).join('');
        [].forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === k); if (i === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
        c.querySelector('.crsl-ctl').hidden = n < 2;
      }
      function tick() { clearTimeout(timer); if (!paused && !hover && !focus && !document.hidden) timer = setTimeout(function () { go(at() + 1); tick(); }, auto); }
      function setPaused(v) {
        paused = v;
        if (play) { play.innerHTML = icon(v ? 'play' : 'pause'); play.setAttribute('aria-label', v ? 'Play the slides' : 'Pause the slides'); }
        track.setAttribute('aria-live', v ? 'polite' : 'off');
        tick();
      }
      if (play && paused) setPaused(true);
      c.addEventListener('click', function (e) {
        var b = e.target.closest('[data-crsl], [data-crsl-dot]');
        if (!b || !c.contains(b)) return;
        if (b.dataset.crslDot != null) go(+b.dataset.crslDot);
        else if (b.dataset.crsl === 'prev') go(at() - 1);
        else if (b.dataset.crsl === 'next') go(at() + 1);
        else setPaused(!paused);
      });
      track.addEventListener('keydown', function (e) {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(at() + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at() - 1); }
      });
      var raf = 0;
      track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { sync(); }); }, { passive: true });
      c.addEventListener('mouseenter', function () { hover = true; tick(); });
      c.addEventListener('mouseleave', function () { hover = false; tick(); });
      c.addEventListener('focusin', function () { focus = true; tick(); });
      c.addEventListener('focusout', function (e) { if (!c.contains(e.relatedTarget)) { focus = false; tick(); } });
      // mouse drag on the track (touch and trackpads scroll natively)
      var x0 = null, s0 = 0, moved = false;
      track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button || e.target.closest('a, button, input')) return; x0 = e.clientX; s0 = track.scrollLeft; moved = false; track.classList.add('dragging'); });
      function mv(e) { if (x0 == null) return; var dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = s0 - dx; }
      function up() { if (x0 == null) return; var d = track.scrollLeft - s0, k = Math.round(s0 / step()); x0 = null; track.classList.remove('dragging'); go(k + (d > 40 ? 1 : d < -40 ? -1 : 0)); }
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      track.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
      var ro = new ResizeObserver(function () { sync(); });
      ro.observe(track);
      document.addEventListener('visibilitychange', tick);
      sync(0); tick();
      stops.push(function () { clearTimeout(timer); ro.disconnect(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.removeEventListener('visibilitychange', tick); });
    });
    return function () { stops.forEach(function (f) { f(); }); };
  };

  // side panel inside a page (part detail on the category page, approval detail)
  UI.panelHead = function (title, sub) {
    return '<header class="panel-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><button type="button" class="dlg-x" aria-label="Close panel" data-panel-close>' + icon('cross-small') + '</button></header>';
  };
})();
