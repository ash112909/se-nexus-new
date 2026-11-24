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
  var date = p.date || 'all';
  var by = p.by || 'all';
  var q = p.q || '';

  function supName(machineId) {
    if (!machineId || !D.machines[machineId]) return null;
    var sup = SE.supplier(D.machines[machineId].supplier);
    return sup ? sup.name : null;
  }
  function dateGroup(d) {
    if (!d) return null;
    var m = d.match(/^(\w+)\s+\d+,?\s+(\d{4})$/);
    return m ? m[1] + ' ' + m[2] : d;
  }

  // news items and articles in 1 list
  function items() {
    return D.news.map(function (n) {
      var mc = n.machine ? SE.machine(n.machine) : null;
      return { id: n.id, kind: n.kind, title: n.title, summary: n.summary,
               meta: (mc ? mc.name + ' · ' : '') + n.date,
               dateGroup: dateGroup(n.date), by: supName(n.machine) };
    }).concat(D.kb.map(function (a) {
      return { id: a.id, kind: 'Article', title: a.title, summary: a.summary,
               meta: a.topic + ' · ' + a.minutes + ' min read',
               dateGroup: null, by: supName(a.machine) };
    }));
  }
  function match(x, k) {
    if (k !== 'all' && x.kind !== k) return false;
    if (date !== 'all' && x.dateGroup !== date) return false;
    if (by !== 'all' && x.by !== by) return false;
    return !q.trim() || SE.hitTokens([x.title, x.summary, x.kind, x.meta].join(' '), SE.qTokens(q));
  }

  function kindSel() {
    return '<select id="kb-kind-sel" aria-label="Type">' +
      KINDS.map(function (k) { return '<option value="' + esc(k[0]) + '"' + (kind === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
  function dateSel() {
    var seen = {}, dates = [];
    items().forEach(function (x) { if (x.dateGroup && !seen[x.dateGroup]) { seen[x.dateGroup] = 1; dates.push(x.dateGroup); } });
    return '<select id="kb-date-sel" aria-label="Date posted"><option value="all">All dates</option>' +
      dates.map(function (d) { return '<option value="' + esc(d) + '"' + (date === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
  function bySel() {
    var seen = {}, bys = [];
    items().forEach(function (x) { if (x.by && !seen[x.by]) { seen[x.by] = 1; bys.push(x.by); } });
    return '<select id="kb-by-sel" aria-label="Posted by"><option value="all">All sources</option>' +
      bys.map(function (b) { return '<option value="' + esc(b) + '"' + (by === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
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
    nav: 'kb', title: 'Knowledge Base', crumbs: [['Home', 'home']],
    sub: esc(D.news.length + ' bulletins, recalls and notices · ' + D.kb.length + ' how-to articles'),
    body: '<div id="kb-feat">' + (SE.mkt ? SE.mkt.featured() : '') + '</div>' +
      '<section class="sec kb" aria-label="Library"><div class="nf-bar">' + field + '</div>' +
      '<div class="kb-filter-row">' +
        '<div class="flt-sel" id="kb-kind-wrap">' + kindSel() + '</div>' +
        '<div class="flt-sel" id="kb-date-wrap">' + dateSel() + '</div>' +
        '<div class="flt-sel" id="kb-by-wrap">' + bySel() + '</div>' +
      '</div>' +
      '<div id="kb-list">' + list() + '</div></section>' +
      UI.sec('Manuals', '', '<a class="sr-browse card" href="#/manuals">' + icon('book-alt') + '<span><b>Manuals & Docs</b><small>' + D.manuals.length + ' manuals and bulletins by machine</small></span>' + icon('angle-small-right') + '</a>'),
  });
  var input = el.querySelector('#kb-q');
  var stopMkt = SE.mkt ? SE.mkt.bind(el) : null;
  function render() {
    el.querySelector('#kb-kind-sel').value = kind;
    el.querySelector('#kb-date-wrap').innerHTML = dateSel();
    el.querySelector('#kb-by-wrap').innerHTML = bySel();
    el.querySelector('#kb-list').innerHTML = list();
    el.querySelector('#kb-feat').hidden = !!q.trim();
    var h = [];
    if (kind !== 'all') h.push('kind=' + kind);
    if (date !== 'all') h.push('date=' + encodeURIComponent(date));
    if (by !== 'all') h.push('by=' + encodeURIComponent(by));
    if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    history.replaceState(null, '', '#/kb' + (h.length ? '?' + h.join('&') : ''));
  }
  el.querySelector('#kb-feat').hidden = !!q.trim();
  input.addEventListener('input', function () { q = input.value; render(); });
  el.querySelector('[data-kb-form]').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); q = input.value; render(); });
  el.querySelector('#kb-kind-sel').addEventListener('change', function (e) { kind = e.target.value; render(); });
  el.querySelector('#kb-date-sel').addEventListener('change', function (e) { date = e.target.value; render(); });
  el.querySelector('#kb-by-sel').addEventListener('change', function (e) { by = e.target.value; render(); });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-clear')) { q = ''; input.value = ''; kind = 'all'; date = 'all'; by = 'all'; render(); }
  });
  return function () { if (stopMkt) stopMkt(); s.cleanup(); };
};
