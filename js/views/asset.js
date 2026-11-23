/* Asset page (DES-28). A unit's record: hatched image stand-in, status, serial, model, year, hours,
   location, last service, warranty; its open work orders; Find parts for this unit (puts the unit in the
   parts search context, then opens its model's catalog page) and Manuals (the model's documents);
   recent purchase orders raised against the unit's work orders.
   State: #/asset?id=FL-094 (equipment number or serial) */
SE.titles.asset = 'Unit';
SE.views.asset = function (el, p) {
  var D = SE.data, UI = SE.ui, esc = SE.esc, icon = SE.icon;
  var a = SE.asset(p.id || '');
  if (!a) {
    var s0 = SE.shell(el, { nav: 'fleet', title: 'Unit not found', crumbs: [['Home', 'home'], ['Fleet', 'fleet']],
      body: UI.empty({ icon: 'exclamation', tone: 'warning', title: 'Unit not found', text: 'No unit in your fleet has this equipment number or serial.', action: '<a class="btn btn-secondary" href="#/fleet">All units</a>' }) });
    return s0.cleanup;
  }
  document.title = a.equip + ' · Mid-County Rental';
  var W = SE.work;
  var status = function (w) { return W && W.status ? W.status(w) : w.status; };
  var wos = SE.allWorkOrders().filter(function (w) { return w.equip === a.equip; });
  var open = wos.filter(function (w) { var st = status(w); return st !== 'Done' && st !== 'Cancelled'; });
  var woIds = wos.map(function (w) { return w.id; });
  var orders = SE.orders().filter(function (o) { return o.wo && woIds.indexOf(o.wo) >= 0; });
  var docs = D.manuals.filter(function (d) { return d.machine === a.model; });
  var model = a.machine.replace(a.make + ' ', '');
  var today = SE.tx.today(), wEnd = new Date(a.warranty);
  var warranty = isNaN(wEnd) ? esc(a.warranty) : wEnd >= today ? 'Until ' + esc(a.warranty) : 'Ended ' + esc(a.warranty);

  var woTable = open.length ? UI.table([['Work order', 'nowrap'], ['Issue'], ['Priority'], ['Assignee'], ['Due', 'nowrap'], ['Status']], open.map(function (w) {
    return ['<a href="#/work-order?id=' + w.id + '"><b>#' + w.id + '</b></a>', esc(w.issue), esc(w.priority), esc(w.assignee), esc(w.due), SE.chip(status(w))];
  }), { cls: 'fa-tbl', rowAttrs: function (i) { return 'data-go="work-order" data-id="' + open[i].id + '"'; } })
    : '<p class="fa-none">' + icon('check') + 'No open work orders for this unit.</p>';

  // "Recent orders": work orders (all, not just open) with their POs nested underneath
  var wosWithOrders = wos.filter(function (w) { return orders.some(function (o) { return o.wo === w.id; }); });
  var recentOrdersHtml;
  if (!wosWithOrders.length) {
    recentOrdersHtml = '<p class="fa-none">' + icon('receipt') + 'No purchase orders for this unit\'s work orders yet.</p>';
  } else {
    recentOrdersHtml = '<div class="fa-ro-list">' + wosWithOrders.map(function (w) {
      var woPos = orders.filter(function (o) { return o.wo === w.id; });
      var st = status(w);
      return '<div class="fa-ro-group">' +
        '<a class="fa-ro-wo" href="#/work-order?id=' + w.id + '" data-go="work-order" data-id="' + w.id + '">' +
          '<span class="fa-ro-wo-id">#' + esc(w.id) + '</span>' +
          '<span class="fa-ro-wo-issue">' + esc(w.issue) + '</span>' +
          SE.chip(st) +
        '</a>' +
        '<div class="fa-ro-pos">' + woPos.map(function (o) {
          return '<a class="fa-ro-po" href="#/order?po=' + o.po + '" data-go="order" data-po="' + esc(o.po) + '">' +
            '<span class="fa-ro-po-id">' + esc(o.po) + '</span>' +
            '<span class="fa-ro-po-sup">' + esc(o.supplier) + '</span>' +
            '<span class="fa-ro-po-date">' + esc(o.placed) + '</span>' +
            SE.chip(o.status) +
            '<span class="fa-ro-po-amt">' + SE.money(o.total) + '</span>' +
          '</a>';
        }).join('') + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  var s = SE.shell(el, {
    nav: 'fleet', title: a.equip, sub: esc(a.machine) + ' · ' + esc(a.serial) + ' · ' + esc(a.location), crumbs: [['Home', 'home'], ['Fleet', 'fleet']],
    actions: '<button type="button" class="btn btn-brand" data-find>' + icon('search') + 'Find parts for this unit</button>' +
      '<a class="btn btn-secondary" href="#/manuals?m=' + a.model + '">' + icon('book-alt') + 'Manuals (' + docs.length + ')</a>',
    body: SE.recallNote(a.equip) + '<div class="fa-grid">' +
      '<section class="card fa-card" aria-labelledby="fa-unit">' +
        '<div class="fa-head">' + UI.thumb(a.machine + ', unit ' + a.equip) + '<h2 id="fa-unit">' + esc(a.equip) + '</h2>' + SE.chip(a.status) + '</div>' +
        UI.kv([
          ['Serial', '<span class="fa-mono">' + esc(a.serial) + '</span>'],
          ['Model', esc(a.make + ' ' + model)],
          ['Year', String(a.year)],
          ['Hours', a.hours.toLocaleString('en-US') + ' h'],
          ['Location', esc(a.location)],
          ['Last service', esc(a.lastService)],
          ['Warranty', warranty],
        ]) + '</section>' +
      '<div class="fa-side">' +
        UI.sec('Open work orders', '<span class="fa-n">' + open.length + '</span>', woTable, 'fa-wo') +
        UI.sec('Recent orders', '', recentOrdersHtml, 'fa-po') +
      '</div></div>',
  });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('[data-find]');
    if (!t) return;
    SE.setContext({ equip: a.equip });
    SE.go('machine', { params: { m: a.model, equip: a.equip } });
  });
  return s.cleanup;
};
