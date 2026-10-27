/* Manuals and documents (B7, legacy web 51; DES-31 Manuals Search, DES-26 scoped entry). Machine filter
   (segmented), a search field scoped to manuals, language (All, English, Spanish) and type filters,
   recent manual searches, document cards with Open and Download.
   Search matches titles, the machine, section headings and section text (sections[].text). Each card
   shows its document type badge (Text, Scanned, Mixed) and language. Text documents list up to 2 matching
   sections with a highlighted snippet and "Section 4.3 · page 4"; choosing one opens the viewer at that
   page. Scanned and mixed documents match at document level only and open at page 1.
   Query and filters are kept for the session (SE.state.search.manuals).
   State: #/manuals?m=1930ES&type=Service&lang=es&q=seal */
SE.titles.manuals = 'Manuals & Docs';
SE.views.manuals = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon;
  var MACHINES = [['all', 'All machines']].concat(Object.keys(D.machines).map(function (k) { return [k, D.machines[k].name]; }));
  var TYPES = ['Service', 'Operator', 'Bulletin', 'Parts'];
  var TONE = { Service: 'info', Operator: 'neutral', Bulletin: 'warning', Parts: 'success' };
  var LANGS = [['any', 'All languages'], ['en', 'English'], ['es', 'Spanish']];
  var LANG = { en: 'English', es: 'Spanish' };
  var FORMAT = { text: 'Text', scan: 'Scanned', mixed: 'Mixed' };
  var S = SE.state.search || (SE.state.search = {});
  var mem = S.manuals || (S.manuals = { q: '', m: 'all', type: null, lang: 'any', recent: [] });
  var fromUrl = p.m != null || p.type != null || p.lang != null || p.q != null;
  var m = D.machines[p.m] ? p.m : fromUrl ? 'all' : (mem.m || 'all');
  var type = TYPES.indexOf(p.type) >= 0 ? p.type : fromUrl ? null : mem.type;
  var lang = LANG[p.lang] ? p.lang : fromUrl ? 'any' : (mem.lang || 'any');
  var q = p.q != null ? p.q : fromUrl ? '' : (mem.q || '');

  function tokens(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean); }
  function hl(text, query) {
    text = String(text); var t = tokens(query);
    if (!t.length) return esc(text);
    var low = text.toLowerCase(), on = [];
    t.forEach(function (w) { var i = low.indexOf(w); while (i >= 0) { for (var k = i; k < i + w.length; k++) on[k] = 1; i = low.indexOf(w, i + w.length); } });
    var out = '', open = false;
    for (var i = 0; i < text.length; i++) {
      if (on[i] && !open) { out += '<mark class="mark-hl">'; open = true; }
      if (!on[i] && open) { out += '</mark>'; open = false; }
      out += esc(text[i]);
    }
    return out + (open ? '</mark>' : '');
  }
  function has(h, t) { h = h.toLowerCase(); return t.every(function (w) { return h.indexOf(w) >= 0; }); }
  var searchable = function (d) { return d.format === 'text'; };
  function hit(d) {
    var t = tokens(q), mc = D.machines[d.machine];
    if (!t.length) return { doc: d, sections: [], page: 1 };
    var secs = d.sections || [];
    var docHay = [d.title, mc.name, d.type, FORMAT[d.format], LANG[d.language]].concat(secs.map(function (s) { return s.title + ' ' + (searchable(d) ? s.text : ''); })).join(' ');
    if (!has(docHay, t)) return null;
    var found = searchable(d) ? secs.filter(function (s) { return has(s.title + ' ' + s.text, t); }) : [];
    return { doc: d, sections: found.slice(0, 2), page: found.length ? found[0].page : 1 };
  }
  function inMachine(d) { return m === 'all' || d.machine === m; }
  function inLang(d) { return lang === 'any' || d.language === lang; }
  function base() { return D.manuals.filter(function (d) { return inMachine(d) && inLang(d); }).map(hit).filter(Boolean); }
  function pick() { return base().filter(function (h) { return !type || h.doc.type === type; }); }
  function seg() { return SE.ui.seg('Machine', MACHINES.map(function (x) { return [x[0], x[1], D.manuals.filter(function (d) { return (x[0] === 'all' || d.machine === x[0]) && inLang(d); }).map(hit).filter(Boolean).length]; }), m); }
  function langs() {
    return LANGS.map(function (l) {
      var n = D.manuals.filter(function (d) { return inMachine(d) && (l[0] === 'any' || d.language === l[0]); }).map(hit).filter(Boolean).length;
      return '<button type="button" role="radio" class="mw-lang-b" aria-checked="' + (lang === l[0]) + '" data-lang="' + l[0] + '">' + l[1] + '<span>' + n + '</span></button>';
    }).join('');
  }
  function types() {
    var b = base();
    return TYPES.map(function (t) {
      var n = b.filter(function (h) { return h.doc.type === t; }).length;
      return '<button type="button" class="mw-type" aria-pressed="' + (type === t) + '" data-type="' + t + '"' + (n || type === t ? '' : ' disabled') + '>' + t + '<span>' + n + '</span></button>';
    }).join('');
  }
  function secLabel(s) { var n = /^(\d+(?:\.\d+)*)\s/.exec(s.title); return (n ? 'Section ' + n[1] : s.title) + ' · page ' + s.page; }
  function snippet(text) {
    var t = tokens(q), low = text.toLowerCase(), at = -1;
    t.forEach(function (w) { var i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
    if (at < 0) at = 0;
    var start = Math.max(0, at - 50);
    if (start > 0) { var sp = text.indexOf(' ', start); if (sp >= 0 && sp < at) start = sp + 1; }
    var end = Math.min(text.length, start + 160);
    if (end < text.length) { var sp2 = text.lastIndexOf(' ', end); if (sp2 > at) end = sp2; }
    return (start > 0 ? '…' : '') + hl(text.slice(start, end), q) + (end < text.length ? '…' : '');
  }
  function card(h) {
    var d = h.doc, qq = tokens(q).length, open = '#/manual?id=' + d.id + (searchable(d) && h.page > 1 ? '&page=' + h.page : '');
    return '<li class="mw-card"><a class="mw-open" href="' + open + '"><span class="mw-ico t-' + TONE[d.type] + '">' + icon(d.type === 'Bulletin' ? 'megaphone' : 'document') + '</span>' +
      '<span class="mw-txt"><b>' + hl(d.title, q) + '</b><span>' + hl(D.machines[d.machine].name, q) + ' · ' + esc(d.edition) + '</span></span></a>' +
      '<div class="mw-meta">' + SE.chip(d.type, TONE[d.type]) + '<span class="mw-fmt f-' + d.format + '">' + FORMAT[d.format] + '</span><span>' + LANG[d.language] + '</span><span>' + d.pages + ' pages · PDF ' + esc(d.size) + '</span></div>' +
      (qq && !searchable(d) ? '<p class="mw-scan">' + icon('picture') + (d.format === 'scan' ? 'Scanned' : 'Mixed') + ', opens at page 1</p>' : '') +
      (h.sections.length ? '<ul class="mw-secs">' + h.sections.map(function (s) {
        return '<li><a class="mw-sec" href="#/manual?id=' + d.id + '&page=' + s.page + '"><b>' + hl(s.title, q) + '</b><span class="mw-snip">' + snippet(s.text) + '</span><small>' + esc(secLabel(s)) + '</small></a></li>';
      }).join('') + '</ul>' : '') +
      '<div class="mw-acts"><a class="btn btn-primary" href="' + open + '">' + icon('eye') + 'Open</a>' +
      '<a class="btn btn-card" href="manuals/' + d.id + '.pdf" download="' + d.id + '.pdf">' + icon('download') + 'Download</a></div></li>';
  }
  function recents() {
    if (q.trim()) return '';
    var seen = {}, list = (mem.recent || []).concat(D.recentSearches.manuals || []).filter(function (r) { var k = r.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 5);
    if (!list.length) return '';
    return '<div class="sx-recent"><span class="sx-recent-l">' + icon('time-past') + 'Recent manual searches</span>' + list.map(function (r) {
      return '<button type="button" class="sx-chip" data-recent="' + esc(r) + '">' + esc(r) + '</button>';
    }).join('') + '</div>';
  }
  function list() {
    var items = pick();
    if (!items.length) return SE.ui.empty({ icon: 'document', tone: 'neutral', title: q.trim() ? 'No manuals match "' + q.trim() + '"' : 'No documents match',
      text: q.trim() ? 'Try a section name such as seal replacement, or another machine or language.' : 'Try another machine, language or type.', action: '<button type="button" class="btn btn-card" data-clear>Clear search and filters</button>' });
    var n = items.length + ' document' + (items.length === 1 ? '' : 's');
    return '<p class="mw-count">' + (q.trim() ? n + (items.length === 1 ? ' matches' : ' match') : n) + '</p><ul class="mw-grid">' + items.map(card).join('') + '</ul>';
  }
  var s = SE.shell(el, { search: '<div class="search page-search" role="search"><label class="sr-only" for="mw-q">Search manuals</label>' + icon('search') + '<input type="text" id="mw-q" value="' + esc(q) + '" placeholder="Search manuals by title or section" autocomplete="off" enterkeyhint="search">' + '<button type="button" class="sx-x" data-qx aria-label="Clear search"' + (q ? '' : ' hidden') + '>' + icon('cross-small') + '</button></div>',
    nav: 'manuals', title: 'Manuals & Docs', sub: 'Service and operator manuals, parts manuals and bulletins for your fleet.', crumbs: [['Home', 'home']],
    body: '<section class="sec mw" aria-label="Documents">' +
      '<div class="sx-bar">' +
        
        '<div class="mw-lang" role="radiogroup" aria-label="Language" id="mw-lang">' + langs() + '</div>' +
      '</div>' +
      '<div class="mw-filters"><div id="mw-seg">' + seg() + '</div>' +
        '<div class="mw-types" role="group" aria-label="Document type" id="mw-types">' + types() + '</div></div>' +
      '<div id="mw-recent">' + recents() + '</div>' +
      '<div id="mw-list">' + list() + '</div></section>',
  });
  function save() { mem.q = q; mem.m = m; mem.type = type; mem.lang = lang; SE.save(); }
  function sync() {
    var h = []; if (m !== 'all') h.push('m=' + m); if (type) h.push('type=' + type); if (lang !== 'any') h.push('lang=' + lang); if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    history.replaceState(null, '', '#/manuals' + (h.length ? '?' + h.join('&') : ''));
  }
  function render() {
    el.querySelector('#mw-seg').innerHTML = seg();
    el.querySelector('#mw-lang').innerHTML = langs();
    el.querySelector('#mw-types').innerHTML = types();
    el.querySelector('#mw-recent').innerHTML = recents();
    el.querySelector('#mw-list').innerHTML = list();
    el.querySelector('[data-qx]').hidden = !q;
    save(); sync();
  }
  function remember() {
    var v = q.trim();
    if (v.length < 2) return;
    mem.recent = [v].concat((mem.recent || []).filter(function (r) { return r.toLowerCase() !== v.toLowerCase(); })).slice(0, 5);
    SE.save();
  }
  var input = el.querySelector('#mw-q'), timer;
  input.addEventListener('input', function () { q = input.value; clearTimeout(timer); timer = setTimeout(render, 120); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); q = input.value; render(); remember(); }
    if (e.key === 'Escape' && q) { e.stopPropagation(); q = ''; input.value = ''; render(); }
  });
  input.addEventListener('blur', remember);
  el.addEventListener('click', function (e) {
    if (e.target.closest('.mw-grid a') && q.trim()) remember();
    var t = e.target.closest('button');
    if (!t || !t.closest('.mw')) return;
    if (t.dataset.seg) { m = t.dataset.seg; if (type && !base().some(function (h) { return h.doc.type === type; })) type = null; render(); return; }
    if (t.dataset.lang) { lang = t.dataset.lang; if (type && !base().some(function (h) { return h.doc.type === type; })) type = null; render(); return; }
    if (t.dataset.type) { type = type === t.dataset.type ? null : t.dataset.type; render(); return; }
    if (t.hasAttribute('data-qx')) { q = ''; input.value = ''; render(); input.focus(); return; }
    if (t.dataset.recent) { q = t.dataset.recent; input.value = q; render(); remember(); return; }
    if (t.hasAttribute('data-clear')) { m = 'all'; type = null; lang = 'any'; q = ''; input.value = ''; render(); }
  });
  return function () { clearTimeout(timer); s.cleanup(); };
};
