/* Supplier (B2, DES-44 and DES-48/49 enhanced catalog), web. The supplier's marketing image slot (only on
   this page), name, line and fleet count, then its 2 halves side by side: Machines (the model tree) and the
   supplier's own lines (consumables, attachments, tires) that belong to no model. A line opens as a table of
   items with add to cart; those items never appear in a machine category. Catalog tree on the left.
   #/supplier?sup=JLG   #/supplier?sup=SKJ   #/supplier?sup=JLG&line=consumables   (+ &wo=) */
SE.titles.supplier = 'Supplier';
SE.views.supplier = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var s = SE.supplier(p.sup || 'JLG');
  if (!s || !s.active) s = SE.supplier('JLG');
  var lines = C.lines(s.id);
  var line = lines.find(function (l) { return l[0] === p.line; }) || null;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');

  if (line) {
    var list = C.lineItems(s.id, line[0]), unit = C.unit(p.wo);
    var rows = list.map(function (x) {
      return '<tr data-row data-pn="' + x.pn + '" tabindex="0"><td class="cell-pn"><span class="pn-link">' + esc(x.pn) + '</span><span class="pn-name">' + esc(x.name) + ' · ' + esc(C.per(x)) + '</span></td>' +
        '<td class="q-cell">' + C.quickBtn(x, unit) + '</td></tr>';
    }).join('');
    var sh = SE.shell(el, {
      nav: 'catalog', title: line[1], wide: true,
      crumbs: [['Parts catalog', catQ], [s.name, 'supplier?sup=' + s.id + C.woQ(p.wo)]],
      sub: esc(s.name) + '\'s own line: ' + esc(line[2].toLowerCase()) + '. Not tied to a model, so these items are not in any machine catalog.',
      body: C.layout({ sup: s.id, line: line[0] }, p.wo,
        UI.sec(s.name + ' ' + line[1].toLowerCase() + ' · ' + list.length + ' items', '', '<div class="tbl-wrap"><table class="tbl line-tbl"><thead><tr><th scope="col">Part</th><th scope="col" aria-label="Add to cart"></th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'h-line')),
    });
    function open(r) { SE.go('part', { params: p.wo ? { pn: r.dataset.pn, wo: p.wo } : { pn: r.dataset.pn } }); }
    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); return; }
      var r = e.target.closest('tr[data-row]');
      if (r) open(r);
    });
    el.addEventListener('keydown', function (e) {
      var r = e.target.closest && e.target.closest('tr[data-row]');
      if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(r); }
    });
    return sh.cleanup;
  }

  var docs = D.manuals.filter(function (m) { return s.machines.indexOf(m.machine) >= 0; });
  var orders = SE.orders().filter(function (o) { return o.supplier === s.name; });
  var machineNames = s.machines.map(function (k) { var m = SE.machine(k); return m ? m.name : ''; });
  var activeWos = SE.allWorkOrders().filter(function (w) {
    return w.status !== 'Done' && !SE.state.cancelled[w.id] && machineNames.indexOf(w.machine) >= 0;
  });
  var supNews = D.news.filter(function (n) { return s.machines.indexOf(n.machine) >= 0; });

  // capability tags: machine types + own line categories
  var features = [];
  s.machines.forEach(function (k) { var m = SE.machine(k); if (m && features.indexOf(m.type) < 0) features.push(m.type); });
  lines.forEach(function (l) { if (features.indexOf(l[1]) < 0) features.push(l[1]); });

  var lineCount = lines.reduce(function (n, l) { return n + C.lineItems(s.id, l[0]).length; }, 0);

  var hero = '<div class="sup-hero">' +
    UI.imgSlot(s.name + ' branding') +
    '<div class="card sup-info">' +
      '<div class="si-head">' + C.badge(s, 'lg') +
        '<div><h2>' + esc(s.name) + '</h2><p class="si-tagline">' + esc(s.tagline) + ' · ' + esc(s.status || 'OEM') + '</p></div>' +
      '</div>' +
      (features.length ? '<div class="si-features">' + features.map(function (f) { return '<span class="chip t-neutral">' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
      UI.kv([
        ['Models in your fleet', s.machines.length + ' model' + (s.machines.length !== 1 ? 's' : '') + ' · ' + C.units(s) + ' units'],
        ['Product lines', lines.length + ' line' + (lines.length !== 1 ? 's' : '') + ' · ' + lineCount + ' item' + (lineCount !== 1 ? 's' : '')],
        ['Orders placed', String(orders.length) + ' order' + (orders.length !== 1 ? 's' : '') + ' in history'],
        ['Documents', docs.length + ' manual' + (docs.length !== 1 ? 's' : '') + ' and bulletin' + (docs.length !== 1 ? 's' : '')]
      ]) +
      '<div class="si-actions">' +
        '<a class="btn btn-secondary" href="#/manuals?m=' + s.machines[0] + '">' + icon('book-alt') + 'Manuals</a>' +
        '<a class="btn btn-secondary" href="#/orders">' + icon('time-past') + 'Orders</a>' +
        (activeWos.length ? '<a class="btn btn-secondary" href="#/list">' + icon('settings-sliders') + 'Open WOs <span class="si-wo-ct">' + activeWos.length + '</span></a>' : '') +
        (supNews.length ? '<a class="btn btn-secondary" href="#/kb">' + icon('megaphone') + 'News & bulletins</a>' : '') +
      '</div>' +
    '</div>' +
  '</div>';

  var machines = s.machines.map(function (k) {
    var m = SE.machine(k), live = m.categories.filter(function (c) { return c.live; }).length;
    return '<li><a class="mach-card" href="#/machine?m=' + k + C.woQ(p.wo) + '">' + UI.thumb() + '<span><b>' + esc(m.name) + '</b><small>' + esc(m.type) + '</small><small>' + m.categories.length + ' assembly groups · ' + live + ' live · ' + (m.schematic ? 'diagram' : 'image with callouts') + '</small></span>' +
      '<span class="fc-count"><b>' + m.units.length + '</b><small>units</small></span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var own = lines.map(function (l) {
    var n = C.lineItems(s.id, l[0]).length;
    return '<li><a class="line-card" href="#/supplier?sup=' + s.id + '&line=' + l[0] + C.woQ(p.wo) + '"><span><b>' + esc(l[1]) + '</b><small>' + esc(l[2]) + '</small></span><span class="lc-n">' + n + ' item' + (n === 1 ? '' : 's') + '</span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var productFamilies = '<div class="sup-halves">' +
    '<section class="card half" aria-labelledby="h-sm"><h2 id="h-sm" class="half-h">Machines<span>' + s.machines.length + ' model in your fleet</span></h2><ul class="half-list">' + machines + '</ul></section>' +
    '<section class="card half" aria-labelledby="h-own"><h2 id="h-own" class="half-h">' + esc(s.name) + ' lines<span>Not tied to a model</span></h2>' +
      (own ? '<ul class="half-list">' + own + '</ul>' : UI.empty({ icon: 'package', title: 'No own lines', text: 'This supplier has no standalone product lines on file.', tone: 'neutral' })) +
    '</section></div>';

  var woRows = activeWos.length ? activeWos.map(function (w) {
    return '<a class="sup-wo-row" href="#/work-order?id=' + w.id + '">' +
      '<span class="sup-wo-id">#' + esc(w.id) + '</span>' +
      '<span class="sup-wo-body"><b>' + esc(w.issue) + '</b><small>' + esc(w.equip) + ' · ' + esc(w.machine) + '</small></span>' +
      SE.chip(w.status, w.tone) +
      '<span class="sup-wo-due">' + (w.due ? esc(w.due) : '') + '</span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('') : '';
  var woSection = UI.sec('Active work orders', '<span class="muted">' + (activeWos.length || 'None') + '</span>',
    activeWos.length
      ? '<div class="sup-wo-list">' + woRows + '</div>'
      : UI.empty({ icon: 'check', title: 'No open work orders', text: 'All work orders on ' + s.name + ' machines are closed.', tone: 'success' }),
    'h-wo');

  var TONE = { 'Recall': 'danger', 'Bulletin': 'warning', 'Article': 'info' };
  var newsCards = supNews.length ? supNews.map(function (n) {
    return '<a class="sr-browse card sup-news-card" href="#/article?id=' + encodeURIComponent(n.id) + '">' +
      SE.chip(n.kind, TONE[n.kind] || 'neutral') +
      '<span class="sup-news-body"><b>' + esc(n.title) + '</b><small>' + esc(n.date) + (n.machine ? ' · ' + esc(n.machine) : '') + '</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('') : '';
  var newsSection = supNews.length
    ? UI.sec('News & updates', '<span class="muted">' + supNews.length + ' item' + (supNews.length !== 1 ? 's' : '') + '</span>', '<div class="sup-news-list">' + newsCards + '</div>', 'h-news')
    : '';

  var s2 = SE.shell(el, {
    nav: 'catalog', title: s.name, wide: true, crumbs: [['Parts catalog', catQ]],
    sub: esc(s.tagline) + ' · ' + C.units(s) + ' units in your fleet',
    body: C.layout({ sup: s.id }, p.wo, hero + woSection + productFamilies + newsSection),
  });
  return s2.cleanup;
};
