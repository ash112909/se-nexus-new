/* Knowledge Base (B7; DES-26 Knowledge Base and News & Bulletins surfaces; legacy web 59 and 60, legacy
   mobile 58 and 59), web. 1 library for what the fleet should know: recalls, service bulletins, supplier
   notices and how-to articles. Featured carousel (marketing kit, M8) while nothing is searched; kind filter
   with counts; a search field in the header's search slot; rows open the item (article). Manuals keep their
   own library, linked at the foot.
   State: #/kb   #/kb?kind=Recall   #/kb?q=lowering */
SE.titles.kb = 'Knowledge Base';
SE.views.kb = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var KINDS = [['all', 'All'], ['Recall', 'Recalls'], ['Bulletin', 'Bulletins'], ['Notice', 'Notices'], ['Article', 'Articles']];
  var TONE = { Recall: 'danger', Bulletin: 'warning', Notice: 'neutral', Article: 'info' };
  var kind = KINDS.some(function (k) { return k[0] === p.kind; }) ? p.kind : 'all';
  var q = p.q || '';

  // news items and articles in 1 list: { id, kind, title, summary, meta }
  function items() {
    return D.news.map(function (n) {
      var m = n.machine ? SE.machine(n.machine) : null;
      return { id: n.id, kind: n.kind, title: n.title, summary: n.summary, meta: (m ? m.name + ' · ' : '') + n.date };
    }).concat(D.kb.map(function (a) {
      return { id: a.id, kind: 'Article', title: a.title, summary: a.summary, meta: a.topic + ' · ' + a.minutes + ' min read' };
    }));
  }
  function match(x, k) {
    if (k !== 'all' && x.kind !== k) return false;
    return !q.trim() || SE.hitTokens([x.title, x.summary, x.kind, x.meta].join(' '), SE.qTokens(q));
  }
  function seg() { return UI.seg('Kind', KINDS.map(function (k) { return [k[0], k[1], items().filter(function (x) { return match(x, k[0]); }).length]; }), kind); }
  function row(x) {
    return '<li><a class="kb-row card" href="#/article?id=' + encodeURIComponent(x.id) + '">' +
      '<span class="kb-kind">' + SE.chip(x.kind, TONE[x.kind]) + '<small>' + esc(x.meta) + '</small></span>' +
      '<b>' + SE.hl(x.title, q) + '</b><span class="kb-sum">' + SE.hl(x.summary, q) + '</span>' + icon('angle-small-right', 'chev') + '</a></li>';
  }
  function list() {
    var l = items().filter(function (x) { return match(x, kind); });
    if (!l.length) return UI.empty({ icon: 'search', tone: 'neutral', title: 'Nothing matches' + (q.trim() ? ' "' + q.trim() + '"' : ''), text: 'Try another word, or show every kind.',
      action: '<button type="button" class="btn btn-secondary" data-clear>Clear search and filters</button>' });
    return '<p class="sr-meta"><b>' + l.length + ' item' + (l.length === 1 ? '' : 's') + '</b></p><ul class="kb-list">' + l.map(row).join('') + '</ul>';
  }
  var field = '<form class="search mw-find kb-find" role="search" data-kb-form><label class="sr-only" for="kb-q">Search the knowledge base</label>' + icon('search') +
    '<input id="kb-q" type="search" value="' + esc(q) + '" placeholder="Search bulletins, recalls and articles" autocomplete="off"></form>';
  var s = SE.shell(el, {
    nav: 'kb', title: 'Knowledge Base', crumbs: [['Home', 'home']], search: field,
    sub: esc(D.news.length + ' bulletins, recalls and notices · ' + D.kb.length + ' how-to articles'),
    body: '<div id="kb-feat">' + (SE.mkt ? SE.mkt.featured() : '') + '</div>' +
      '<section class="sec kb" aria-label="Library"><div class="nf-bar"><div id="kb-seg">' + seg() + '</div></div><div id="kb-list">' + list() + '</div></section>' +
      UI.sec('Manuals', '', '<a class="sr-browse card" href="#/manuals">' + icon('book-alt') + '<span><b>Manuals & Docs</b><small>' + D.manuals.length + ' manuals and bulletins by machine</small></span>' + icon('angle-small-right') + '</a>'),
  });
  var input = el.querySelector('#kb-q');
  var stopMkt = SE.mkt ? SE.mkt.bind(el) : null;
  function render() {
    el.querySelector('#kb-seg').innerHTML = seg();
    el.querySelector('#kb-list').innerHTML = list();
    el.querySelector('#kb-feat').hidden = !!q.trim();
    var h = [];
    if (kind !== 'all') h.push('kind=' + kind);
    if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    history.replaceState(null, '', '#/kb' + (h.length ? '?' + h.join('&') : ''));
  }
  el.querySelector('#kb-feat').hidden = !!q.trim();
  input.addEventListener('input', function () { q = input.value; render(); });
  el.querySelector('[data-kb-form]').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); q = input.value; render(); });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.seg && t.closest('#kb-seg')) { kind = t.dataset.seg; render(); var b = el.querySelector('#kb-seg [aria-selected="true"]'); if (b && !SE.capture) b.focus(); return; }
    if (t.hasAttribute('data-clear')) { q = ''; input.value = ''; kind = 'all'; render(); }
  });
  return function () { if (stopMkt) stopMkt(); s.cleanup(); };
};
