/* Orders placed (B3, legacy web 25 and 27). Reached from checkout with replace, so Back skips the form.
   1 card per purchase order: supplier, items, total, ship-to, status, View order. Branch transfers (TR-NNNN,
   web-full desk W3) show their source branch and "No charge".
   State: #/placed?po=PO-7860,PO-7861 */
SE.titles.placed = 'Orders submitted';
SE.views.placed = function (el, p) {
  var UI = SE.ui, esc = SE.esc, icon = SE.icon, money = SE.money;
  var list = String(p.po || '').split(',').map(function (po) { return SE.order(po.trim()); }).filter(Boolean);
  function card(o) {
    var n = o.items.reduce(function (t, i) { return t + i.qty; }, 0), l = SE.loc(o.shipTo);
    return '<article class="card pl-card"><header class="pl-head"><div><h2>' + o.po + '</h2><p class="muted">' + esc(o.supplier) + '</p></div>' + SE.chip(o.status) + '</header>' +
      UI.kv([['Items', n + ' item' + (n === 1 ? '' : 's') + ', ' + o.items.length + ' line' + (o.items.length === 1 ? '' : 's')], ['Ship to', esc(l ? l.name : o.shipTo)]]
        .concat(o.needBy ? [['Needed by', esc(o.needBy)]] : []).concat([['Total', o.kind === 'transfer' || o.kind === 'pick' || o.kind === 'local-pick' ? '<b>No purchase charge</b>' : '<b>' + money(o.total) + '</b>']])) +
      '<button class="btn btn-secondary pl-btn" type="button" data-go="order" data-po="' + o.po + '">View order' + icon('arrow-small-right') + '</button></article>';
  }
  var n = list.length;
  var body = n
    ? '<section class="card pl-hero"><span class="pl-ok">' + icon('check') + '</span><div><h2>' + (function () {
          var t = list.filter(function (o) { return o.kind === 'transfer'; }).length, picks = list.filter(function (o) { return o.kind === 'pick' || o.kind === 'local-pick'; }).length, po = n - t - picks;
          return [po ? po + ' purchase order' + (po === 1 ? '' : 's') : '', t ? t + ' branch transfer' + (t === 1 ? '' : 's') : '', picks ? picks + ' shelf pick' + (picks === 1 ? '' : 's') : ''].filter(Boolean).join(' and ') + ' submitted';
        })() + '</h2>' +
        '<p class="muted">' + (list.some(function (o) { return o.kind === 'purchase' || !o.kind; }) ? 'Sent straight to the supplier' + (n === 1 ? '' : 's') + '. ' : '') + (list.some(function (o) { return o.kind === 'transfer'; }) ? 'The source branch picks the shelf stock for today’s van. ' : '') + 'You get a notification when each one is confirmed.</p></div></section>' +
      '<div class="pl-grid">' + list.map(card).join('') + '</div>' +
      '<div class="pl-actions"><button class="btn btn-primary" type="button" data-go="home">Back to Home</button><button class="btn btn-secondary" type="button" data-go="orders">Order history</button></div>'
    : UI.empty({ icon: 'receipt', tone: 'neutral', title: 'No orders to show', text: 'Open Order history to see every purchase order.', action: '<button class="btn btn-secondary" type="button" data-go="orders">Order history</button>' });
  var s = SE.shell(el, { nav: 'cart', title: 'Orders submitted', crumbs: [['Home', 'home']], body: body });
  if (n) SE.animate(el.querySelector('.pl-ok'), [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420 });
  return s.cleanup;
};
