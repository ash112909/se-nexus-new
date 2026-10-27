/* Order detail (B3, legacy web 32 and 33). Status and timeline, shipment (carrier, tracking, ETA),
   ship-to branch, line items, work order link, Reorder (adds the same lines to the cart).
   PO-7845 carries the backorder banner with the alternate part. New orders show only Submitted done.
   A cancelled order (PO-7812, DES-32) shows who cancelled it and why, and offers no Reorder.
   A branch transfer (TR-NNNN, web-full desk W3) moves shelf stock between branches: no charge, no Reorder.
   State: #/order?po=PO-7838   #/order?po=PO-7812 (cancelled) */
SE.titles.order = 'Order';
SE.views.order = function (el, p) {
  var UI = SE.ui, esc = SE.esc, icon = SE.icon, money = SE.money;
  var o = SE.order(p.po), crumbs = [['Home', 'home'], ['Order history', 'orders']];
  if (!o) {
    var s0 = SE.shell(el, { nav: 'orders', title: 'Order not found', crumbs: crumbs,
      body: UI.empty({ icon: 'receipt', tone: 'neutral', title: 'Order not found', text: 'This purchase order could not be found.', action: '<button class="btn btn-secondary" type="button" data-go="orders">Order history</button>' }) });
    return s0.cleanup;
  }
  document.title = o.po + ' · Mid-County Rental';
  var l = SE.loc(o.shipTo), n = o.items.reduce(function (t, i) { return t + i.qty; }, 0), w = o.wo ? SE.wo(o.wo) : null;
  var items = UI.table([['Part'], ['Unit', 'num'], ['Qty', 'num'], ['Total', 'num']], o.items.map(function (i) {
    var pt = SE.part(i.pn);
    return ['<div class="cell-part">' + UI.thumb() + '<span><a href="#/part?pn=' + encodeURIComponent(pt.pn) + '"><b>' + esc(pt.name) + '</b></a><span class="sub">' + esc(pt.pn) + (i.wo ? ' · WO #' + esc(i.wo) : '') + (i.unit ? ' · ' + esc(i.unit) : '') + '</span></span></div>', money(pt.price), String(i.qty), '<b>' + money(pt.price * i.qty) + '</b>'];
  }), { cls: 'od-items' });
  var cancelled = o.status === 'Cancelled', pick = o.kind === 'pick' || o.kind === 'local-pick', transfer = o.kind === 'transfer';
  var body =
    (cancelled ? UI.banner('<b>Cancelled.</b> ' + esc(o.note || 'This purchase order was cancelled.'), 'neutral', 'cross') : '') +
    (o.po === 'PO-7845' ? UI.banner('<b>JLG-4120-204 backordered</b>, new ETA Oct 9. <a href="#/part?pn=JLG-4120-204">See alternate part</a>', 'warning', 'exclamation') : '') +
    '<div class="od-grid">' +
            '<section class="card od-status"><div class="od-status-head"><div><span class="od-lbl">Status</span>' + SE.chip(o.status) + '</div><p class="muted">' + esc(o.supplier) + ' · Placed ' + esc(o.placed) + '</p></div>' +
        UI.timeline(o.steps) + '</section>' +
      '<div class="od-side">' +
        '<section class="card"><h2 class="od-h">Shipment</h2>' + UI.kv([['Carrier', esc(o.carrier || 'Pending')], ['Tracking', o.tracking ? '<span class="od-mono">' + esc(o.tracking) + '</span>' : 'Pending'], ['ETA', esc(o.eta || 'Pending')]]
          .concat(o.needBy ? [['Needed by', esc(o.needBy)]] : [])) + '</section>' +
        '<section class="card"><h2 class="od-h">Ship to</h2>' + UI.kv([['Branch', esc(l ? l.name : o.shipTo)], ['Address', esc(l ? l.address : '')]]) + '</section>' +
        (o.wo ? '<section class="card"><h2 class="od-h">Work order</h2>' + UI.kv([['Number', '<a href="#/work-order?id=' + esc(o.wo) + '">#' + esc(o.wo) + '</a>']].concat(w ? [['Issue', esc(w.issue)], ['Unit', esc(w.equip + ', ' + w.machine)]] : [])) + '</section>' : '') +
      '</div>' +
    '</div>' +
    UI.sec('Items · ' + n, '', items + '<div class="od-total"><span>Total</span><b>' + (pick ? 'No charge, branch shelf pick' : transfer ? 'No charge, internal transfer' : money(o.total)) + '</b></div>', 'od-items-h') +
    (o.note && !cancelled ? UI.sec('Notes', '', '<div class="card"><p>' + esc(o.note) + '</p></div>') : '');
  var s = SE.shell(el, { nav: 'orders', title: o.po, sub: esc(o.supplier) + ' · ' + (pick ? 'Shelf pick' : transfer ? 'No charge' : money(o.total)), crumbs: crumbs, body: body,
    actions: (cancelled || transfer || pick ? '' : '<button class="btn btn-primary" type="button" data-reorder>' + icon('shopping-cart') + 'Reorder</button>') +
      (o.wo ? '<button class="btn btn-secondary" type="button" data-go="work-order" data-id="' + esc(o.wo) + '">View work order</button>' : '') });
  el.addEventListener('click', function (e) {
    if (!e.target.closest('[data-reorder]')) return;
    o.items.forEach(function (i) { SE.addToCart(i.pn, i.qty, i.wo || o.wo, { unit: i.unit, serial: i.serial, shipTo: i.shipTo || o.shipTo }); });
    s.refresh();
    SE.toast(n + ' item' + (n === 1 ? '' : 's') + ' added to cart', 'shopping-cart');
  });
  return s.cleanup;
};
