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
      var ok = C.priceOk(x, unit);
      return '<tr data-row data-pn="' + x.pn + '" tabindex="0"><td class="cell-pn"><span class="pn-link">' + esc(x.pn) + '</span><span class="pn-name">' + esc(x.name) + ' · ' + esc(C.per(x)) + '</span></td>' +
        '<td class="num cell-price">' + (ok ? '<b>' + SE.money(x.price) + '</b>' + UI.stock(x) : '<span class="need-serial">Serial needed</span>') + '</td><td class="q-cell">' + C.quickBtn(x, unit) + '</td></tr>';
    }).join('');
    var sh = SE.shell(el, {
      nav: 'catalog', title: line[1], wide: true,
      crumbs: [['Parts catalog', catQ], [s.name, 'supplier?sup=' + s.id + C.woQ(p.wo)]],
      sub: esc(s.name) + '\'s own line: ' + esc(line[2].toLowerCase()) + '. Not tied to a model, so these items are not in any machine catalog.',
      body: C.woBanner(p.wo) + C.layout({ sup: s.id, line: line[0] }, p.wo,
        UI.sec(s.name + ' ' + line[1].toLowerCase() + ' · ' + list.length + ' items', '', '<div class="tbl-wrap"><table class="tbl line-tbl"><thead><tr><th scope="col">Part</th><th scope="col" class="num">Price, USD</th><th scope="col" aria-label="Add to cart"></th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'h-line')),
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
  var latest = docs.find(function (m) { return m.type === 'Bulletin'; }) || docs[0];
  var orders = SE.orders().filter(function (o) { return o.supplier === s.name; });

  var hero = '<div class="sup-hero">' +
    '<div class="card sup-info"><div class="si-head">' + C.badge(s, 'lg') + '<div><h2>' + esc(s.name) + '</h2><p>' + esc(s.tagline) + ' · OEM</p></div></div>' +
      UI.kv([['Machines in your fleet', s.machines.length + ' model, ' + C.units(s) + ' units'], ['Own lines', lines.length + ' lines, ' + lines.reduce(function (n, l) { return n + C.lineItems(s.id, l[0]).length; }, 0) + ' items'], ['Orders in history', String(orders.length)], ['Documents', docs.length + ' manuals and bulletins']]) +
      '<div class="si-actions"><a class="btn btn-secondary" href="#/manuals?m=' + s.machines[0] + '">' + icon('book-alt') + 'Manuals</a><a class="btn btn-secondary" href="#/orders">' + icon('time-past') + 'Orders</a></div>' +
    '</div></div>';
  var machines = s.machines.map(function (k) {
    var m = SE.machine(k), live = m.categories.filter(function (c) { return c.live; }).length;
    return '<li><a class="mach-card" href="#/machine?m=' + k + C.woQ(p.wo) + '">' + UI.thumb() + '<span><b>' + esc(m.name) + '</b><small>' + esc(m.type) + '</small><small>' + m.categories.length + ' assembly groups · ' + live + ' live · ' + (m.schematic ? 'diagram' : 'image with callouts') + '</small></span>' +
      '<span class="fc-count"><b>' + m.units.length + '</b><small>units</small></span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var own = lines.map(function (l) {
    var n = C.lineItems(s.id, l[0]).length;
    return '<li><a class="line-card" href="#/supplier?sup=' + s.id + '&line=' + l[0] + C.woQ(p.wo) + '"><span><b>' + esc(l[1]) + '</b><small>' + esc(l[2]) + '</small></span><span class="lc-n">' + n + ' item' + (n === 1 ? '' : 's') + '</span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var halves = '<div class="sup-halves">' +
    '<section class="card half" aria-labelledby="h-sm"><h2 id="h-sm" class="half-h">Machines<span>' + s.machines.length + ' model in your fleet</span></h2><ul class="half-list">' + machines + '</ul></section>' +
    '<section class="card half" aria-labelledby="h-own"><h2 id="h-own" class="half-h">' + esc(s.name) + ' lines<span>Not tied to a model</span></h2><ul class="half-list">' + own + '</ul></section></div>';
  var s2 = SE.shell(el, {
    nav: 'catalog', title: s.name, wide: true, crumbs: [['Parts catalog', catQ]],
    sub: esc(s.tagline) + ' · ' + C.units(s) + ' units in your fleet',
    body: C.woBanner(p.wo) + C.layout({ sup: s.id }, p.wo, hero + halves +
      (latest ? UI.sec('Latest from ' + s.name, '', '<a class="sr-browse card" href="#/manual?id=' + latest.id + '">' + icon(latest.type === 'Bulletin' ? 'megaphone' : 'book-alt') + '<span><b>' + esc(latest.title) + '</b><small>' + esc(latest.edition) + '</small></span>' + icon('angle-small-right') + '</a>', 'h-latest') : '')),
  });
  return s2.cleanup;
};
