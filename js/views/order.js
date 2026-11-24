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
  var items = UI.table([['Part'], ['Unit', 'num'], ['Qty', 'num'], ['Total', 'num'], ['', 'num']], o.items.map(function (i) {
    var pt = SE.part(i.pn);
    return ['<div class="cell-part">' + UI.thumb() + '<span><a href="#/part?pn=' + encodeURIComponent(pt.pn) + '"><b>' + esc(pt.name) + '</b></a><span class="sub">' + esc(pt.pn) + (i.wo ? ' · WO #' + esc(i.wo) : '') + (i.unit ? ' · ' + esc(i.unit) : '') + '</span></span></div>', money(pt.price), String(i.qty), '<b>' + money(pt.price * i.qty) + '</b>',
      '<button class="btn btn-secondary q-add" type="button" data-rtc-pn="' + esc(i.pn) + '" data-rtc-qty="' + i.qty + '" title="Add to…" aria-label="Add to work order or list">' + icon('shopping-cart') + '</button>'];
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
        (SE.cms ? SE.cms.supplierMessages([o.supplier]) : '') +
      '</div>' +
    '</div>' +
    (SE.cms ? SE.cms.orderMessages('') : '') +
    UI.sec('Items · ' + n, '', items + '<div class="od-total"><span>Total</span><b>' + (pick ? 'No charge, branch shelf pick' : transfer ? 'No charge, internal transfer' : money(o.total)) + '</b></div>', 'od-items-h') +
    (o.note && !cancelled ? UI.sec('Notes', '', '<div class="card"><p>' + esc(o.note) + '</p></div>') : '');
  var s = SE.shell(el, { nav: 'orders', title: o.po, sub: esc(o.supplier) + ' · ' + (pick ? 'Shelf pick' : transfer ? 'No charge' : money(o.total)), crumbs: crumbs, body: body,
    actions: (cancelled || transfer || pick ? '' : '<button class="btn btn-primary" type="button" data-reorder>' + icon('shopping-cart') + 'Reorder</button>') +
      (o.wo ? '<button class="btn btn-secondary" type="button" data-go="work-order" data-id="' + esc(o.wo) + '">View work order</button>' : '') });
  function addItemsToWo(lineItems, woId) {
    lineItems.forEach(function (i) {
      SE.addToCart(i.pn, i.qty, woId, { unit: i.unit, serial: i.serial, shipTo: i.shipTo || o.shipTo });
    });
    s.refresh();
    var label = lineItems.length === 1 ? SE.part(lineItems[0].pn).name : lineItems.length + ' items';
    SE.toast(label + ' added to WO #' + woId, 'shopping-cart');
  }
  function addItemsToList(lineItems, listId) {
    var lst = SE.list(listId);
    if (!lst) return;
    lineItems.forEach(function (i) {
      var ex = lst.items.find(function (x) { return x.pn === i.pn; });
      if (ex) { ex.qty += i.qty; } else { lst.items.push({ pn: i.pn, qty: i.qty }); }
    });
    SE.saveLists();
    var label = lineItems.length === 1 ? SE.part(lineItems[0].pn).name : lineItems.length + ' items';
    SE.toast(label + ' added to "' + lst.name + '"', 'list');
  }
  function createListWithItems(lineItems, name) {
    var newList = {
      id: 'sl-' + Date.now(),
      name: name,
      description: '',
      tag: 'Custom',
      items: lineItems.map(function (i) { return { pn: i.pn, qty: i.qty }; }),
      updatedBy: SE.data.user.name,
      updatedAt: 'Today',
      ownerId: SE.data.user.id || 'me',
      pinned: false,
      public: false
    };
    SE.lists().unshift(newList);
    SE.saveLists();
    SE.toast('"' + name + '" list created', 'list');
  }

  function openReorderDialog(lineItems) {
    var wos = SE.allWorkOrders().filter(function (w) {
      var st = SE.work.status(w);
      return st !== 'Done' && st !== 'Cancelled' && !SE.state.cancelled[w.id];
    });
    var lists = SE.lists();
    var woOptions = wos.map(function (w) {
      return '<option value="' + esc(w.id) + '">#' + esc(w.id) + ' — ' + esc(w.machine) + (w.issue ? ' · ' + esc(w.issue.substring(0, 40)) : '') + '</option>';
    }).join('');
    var listOptions = lists.map(function (l) {
      return '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>';
    }).join('');

    var dlg = UI.dialog({
      title: lineItems.length === 1 ? 'Add ' + esc(SE.part(lineItems[0].pn).name) + ' to…' : 'Add ' + lineItems.length + ' items to…',
      body:
        '<div class="rod-sections">' +
          '<div class="rod-section">' +
            '<h3 class="rod-sh">Work Order</h3>' +
            '<div class="rod-row">' +
              '<label class="rod-lbl" for="rod-wo-sel">Add to existing WO</label>' +
              '<div class="rod-ctl">' +
                '<div class="control rod-sel-wrap"><select id="rod-wo-sel" class="rod-sel">' +
                  '<option value="">Select a work order…</option>' + woOptions +
                '</select>' + icon('angle-small-down') + '</div>' +
                '<button type="button" class="btn btn-secondary rod-btn" data-rod-add-wo>Add to WO</button>' +
              '</div>' +
            '</div>' +
            '<div class="rod-sep-or"><span>or</span></div>' +
            '<button type="button" class="btn btn-secondary rod-newbtn" data-rod-new-wo>' + icon('plus-small') + 'Create new work order</button>' +
          '</div>' +
          '<div class="rod-divider"></div>' +
          '<div class="rod-section">' +
            '<h3 class="rod-sh">Shopping List</h3>' +
            '<div class="rod-row">' +
              '<label class="rod-lbl" for="rod-list-sel">Add to existing list</label>' +
              '<div class="rod-ctl">' +
                '<div class="control rod-sel-wrap"><select id="rod-list-sel" class="rod-sel">' +
                  '<option value="">Select a list…</option>' + listOptions +
                '</select>' + icon('angle-small-down') + '</div>' +
                '<button type="button" class="btn btn-secondary rod-btn" data-rod-add-list>Add to list</button>' +
              '</div>' +
            '</div>' +
            '<div class="rod-sep-or"><span>or</span></div>' +
            '<div class="rod-newlist-row">' +
              '<input id="rod-list-name" class="rod-name-in" type="text" placeholder="New list name…" autocomplete="off">' +
              '<button type="button" class="btn btn-secondary rod-btn" data-rod-new-list>' + icon('plus-small') + 'Create list</button>' +
            '</div>' +
          '</div>' +
        '</div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button>',
    });

    dlg.el.addEventListener('click', function (e) {
      var t = e.target.closest('button[data-rod-add-wo], button[data-rod-new-wo], button[data-rod-add-list], button[data-rod-new-list]');
      if (!t) return;
      if (t.hasAttribute('data-rod-add-wo')) {
        var sel = dlg.el.querySelector('#rod-wo-sel').value;
        if (!sel) { dlg.el.querySelector('#rod-wo-sel').focus(); return; }
        addItemsToWo(lineItems, sel); dlg.close(); return;
      }
      if (t.hasAttribute('data-rod-new-wo')) {
        dlg.close();
        SE.work.newDialog({ onCreate: function (w) { addItemsToWo(lineItems, w.id); } });
        return;
      }
      if (t.hasAttribute('data-rod-add-list')) {
        var sel = dlg.el.querySelector('#rod-list-sel').value;
        if (!sel) { dlg.el.querySelector('#rod-list-sel').focus(); return; }
        addItemsToList(lineItems, sel); dlg.close(); return;
      }
      if (t.hasAttribute('data-rod-new-list')) {
        var name = dlg.el.querySelector('#rod-list-name').value.trim();
        if (!name) { dlg.el.querySelector('#rod-list-name').focus(); return; }
        createListWithItems(lineItems, name); dlg.close(); return;
      }
    });
  }

  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-reorder]')) {
      openReorderDialog(o.items);
      return;
    }
    var rtc = e.target.closest('[data-rtc-pn]');
    if (rtc) {
      var pn = rtc.dataset.rtcPn, qty = parseInt(rtc.dataset.rtcQty, 10) || 1;
      var item = o.items.find(function (i) { return i.pn === pn; }) || { pn: pn, qty: qty };
      openReorderDialog([item]);
    }
  });
  return s.cleanup;
};
