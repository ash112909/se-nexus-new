/* Manual viewer (B7, legacy web 52 opened only a placeholder card). A PDF viewer built from page images:
   toolbar (back, title, page x of N with previous and next, zoom out, zoom in, fit width, Download PDF),
   a thumbnail column on wide screens, pages in a scrolling column.
   Keys: Arrow keys, PageUp, PageDown, Home, End move between pages; + and - zoom; 0 fits the width.
   Opening with &page=4 scrolls to page 4 and briefly highlights it.
   The title line names the edition, language and format (Text, Scanned, Mixed).
   State: #/manual?id=jlg-1930es-service&page=4 */
SE.titles.manual = 'Manual';
SE.views.manual = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon;
  var doc = D.manuals.find(function (d) { return d.id === p.id; });
  var BASE = 'manuals/';
  var LANG = { en: 'English', es: 'Spanish' }, FORMAT = { text: 'Text', scan: 'Scanned', mixed: 'Mixed' };
  if (!doc) {
    var s0 = SE.shell(el, { nav: 'manuals', title: 'Document not found', crumbs: [['Home', 'home'], ['Manuals & Docs', 'manuals']],
      body: SE.ui.empty({ icon: 'document', tone: 'neutral', title: 'Document not found', text: 'It may have been replaced by a newer edition.', action: '<a class="btn btn-card" href="#/manuals">All manuals</a>' }) });
    return s0.cleanup;
  }
  document.title = doc.title + ' · Mid-County Rental';
  var N = doc.pages, cur = Math.max(1, Math.min(N, parseInt(p.page, 10) || 1));
  var ZOOMS = [25, 50, 75, 100, 125, 150, 200], zoom = 'fit';
  var src = function (n) { return BASE + doc.id + '/p' + n + '.jpg'; };
  function readable(n) { var secs = (doc.sections || []).filter(function (sec) { return +sec.page === n; }); return '<details class="card" style="padding:16px;margin:12px 0"><summary>Readable text · page ' + n + '</summary>' + (secs.length ? secs.map(function (sec) { return '<h3>' + esc(sec.title) + '</h3><p>' + esc(sec.text || 'No transcription is available for this section.') + '</p>'; }).join('') : '<p>Download the PDF for the full page.</p>') + '</details>'; }
  var pages = '', thumbs = '';
  for (var n = 1; n <= N; n++) {
    pages += '<figure class="vw-page" id="vw-p' + n + '" data-n="' + n + '"><img src="' + src(n) + '" width="1275" height="1650" alt="' + esc(doc.title) + ', page ' + n + ' of ' + N + '" decoding="async">' + readable(n) + '</figure>';
    thumbs += '<li><button type="button" class="vw-thumb" data-jump="' + n + '" aria-label="Page ' + n + '"><img src="' + src(n) + '" width="1275" height="1650" alt=""><span>' + n + '</span></button></li>';
  }
  var s = SE.shell(el, {
    nav: 'manuals', wide: true,
    head: '<h1 class="sr-only" tabindex="-1" data-focus>' + esc(doc.title) + '</h1>',
    body: '<section class="vw" aria-label="Document viewer">' +
      '<div class="vw-bar" role="toolbar" aria-label="Viewer controls">' +
        '<a class="vw-btn vw-back" href="#/manuals?m=' + doc.machine + '" aria-label="Back to Manuals & Docs">' + icon('arrow-small-left') + '<span>Manuals</span></a>' +
        '<div class="vw-title"><b>' + esc(doc.title) + '</b><span>' + esc(doc.type + ' · ' + doc.edition + ' · ' + (LANG[doc.language] || 'English') + ' · ' + (FORMAT[doc.format] || 'Text') + ' · ' + doc.pages + ' pages') + '</span></div>' +
        '<div class="vw-group vw-nav"><button type="button" class="vw-btn" data-step="-1" aria-label="Previous page">' + icon('angle-small-left') + '</button>' +
          '<span class="vw-count" aria-live="polite"><span class="sr-only">Page </span><b id="vw-cur">' + cur + '</b> of ' + N + '</span>' +
          '<button type="button" class="vw-btn" data-step="1" aria-label="Next page">' + icon('angle-small-right') + '</button></div>' +
        '<div class="vw-group vw-zoom"><button type="button" class="vw-btn" data-zoom="-1" aria-label="Zoom out">' + icon('zoom-out') + '</button>' +
          '<button type="button" class="vw-btn vw-pct" data-fit aria-label="Fit width"><span id="vw-pct">Fit</span></button>' +
          '<button type="button" class="vw-btn" data-zoom="1" aria-label="Zoom in">' + icon('zoom-in') + '</button></div>' +
        '<a class="btn btn-primary vw-dl" href="' + BASE + doc.id + '.pdf" download="' + doc.id + '.pdf">' + icon('download') + '<span>Download PDF</span></a>' +
      '</div>' +
      '<div class="vw-body"><nav class="vw-side" aria-label="Pages"><ol>' + thumbs + '</ol></nav>' +
        '<div class="vw-stage" id="vw-stage" tabindex="0" aria-label="Pages, use arrow keys to move between pages"><div class="vw-col" id="vw-col">' + pages + '</div></div></div>' +
    '</section>',
  });
  var stage = el.querySelector('#vw-stage'), col = el.querySelector('#vw-col');
  function pageEl(k) { return el.querySelector('#vw-p' + k); }
  function topOf(k) { return pageEl(k).getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop - parseFloat(getComputedStyle(stage).paddingTop); }
  function fitPct() { return Math.max(25, Math.floor((stage.clientWidth - 48) / 816 * 100)); }
  function pct() { return zoom === 'fit' ? fitPct() : zoom; }
  function setCur(k) {
    cur = k;
    el.querySelector('#vw-cur').textContent = k;
    el.querySelector('[data-step="-1"]').disabled = k <= 1;
    el.querySelector('[data-step="1"]').disabled = k >= N;
    el.querySelectorAll('.vw-thumb').forEach(function (b) { if (+b.dataset.jump === k) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function applyZoom(keep) {
    col.style.width = Math.round(816 * pct() / 100) + 'px';
    el.querySelector('#vw-pct').textContent = zoom === 'fit' ? 'Fit' : zoom + '%';
    el.querySelector('[data-zoom="-1"]').disabled = pct() <= ZOOMS[0];
    el.querySelector('[data-zoom="1"]').disabled = pct() >= ZOOMS[ZOOMS.length - 1];
    if (keep) jump(cur, false, true);
  }
  function jump(k, smooth, quiet) {
    k = Math.max(1, Math.min(N, k));
    var t = pageEl(k);
    stage.scrollTo({ top: topOf(k), behavior: smooth && !SE.reducedMotion ? 'smooth' : 'auto' });
    setCur(k);
    if (quiet) return;
    t.classList.remove('hl'); void t.offsetWidth; t.classList.add('hl');
    setTimeout(function () { t.classList.remove('hl'); }, 1600);
  }
  function step(dz) {
    var now = pct(), next;
    if (dz > 0) next = ZOOMS.find(function (z) { return z > now; }); else next = ZOOMS.slice().reverse().find(function (z) { return z < now; });
    if (next) { zoom = next; applyZoom(true); }
  }
  stage.addEventListener('scroll', function () {
    requestAnimationFrame(function () {
      var mid = stage.scrollTop + stage.clientHeight * 0.4, k = 1;
      for (var i = 1; i <= N; i++) if (topOf(i) <= mid) k = i;
      if (k !== cur) setCur(k);
    });
  }, { passive: true });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !t.closest('.vw')) return;
    if (t.dataset.step) { jump(cur + +t.dataset.step, true); return; }
    if (t.dataset.zoom) { step(+t.dataset.zoom); return; }
    if (t.hasAttribute('data-fit')) { zoom = 'fit'; applyZoom(true); return; }
    if (t.dataset.jump) jump(+t.dataset.jump, true);
  });
  function onKey(e) {
    if (/input|textarea|select/i.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.dlg-host') || !el.isConnected) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); jump(cur + 1, true, true); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); jump(cur - 1, true, true); }
    else if (k === 'Home') { e.preventDefault(); jump(1, true, true); }
    else if (k === 'End') { e.preventDefault(); jump(N, true, true); }
    else if (k === '+' || k === '=') { e.preventDefault(); step(1); }
    else if (k === '-') { e.preventDefault(); step(-1); }
    else if (k === '0') { e.preventDefault(); zoom = 'fit'; applyZoom(true); }
  }
  document.addEventListener('keydown', onKey);
  var ro = new ResizeObserver(function () { if (zoom === 'fit') applyZoom(false); });
  ro.observe(stage);
  applyZoom(false);
  setCur(cur);
  if (cur > 1) requestAnimationFrame(function () { jump(cur, false); });
  return function () { document.removeEventListener('keydown', onKey); ro.disconnect(); s.cleanup(); };
};
