/* Work order detail. Left: issue summary, active cart (part # / description / UOM / source+stock /
   qty controls / unit / total / remove, grouped by none|sourcing|status|vendor), submitted orders
   accordion (line-item table per PO), combined notes+activity timeline with add-note input.
   Right panel: details kv + editable fields for supervisor desk.
   Actions: Find parts, Cancel, Archive. Machine orders button shows prior POs for the same unit.
   State: #/work-order?id=100118  #/work-order?id=100106&dialog=cancel */
SE.titles['work-order'] = 'Work order';
SE.views['work-order'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, W = SE.work;
  var w = SE.wo(p.id);
  var crumbs = [['Home', 'home'], ['Work orders', 'work-orders']];
  if (!w) {
    var s0 = SE.shell(el, { nav: 'work-orders', title: 'Work order not found', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'exclamation', tone: 'warning', title: 'Work order not found', text: 'It may have been removed, or the link is out of date.', action: '<a class="btn btn-secondary" href="#/work-orders">All work orders</a>' }) });
    return s0.cleanup;
  }
  var unit = W.unit(w.equip) || {}, K = SE.desk;
  var ED = SE.state.woEdits || (SE.state.woEdits = {});
  // Group-by persists across renders within this view session
  var groupBy = 'none';
  // Accordion open state: map of submitted order index -> bool
  var ordOpen = {};

  function edits() { return ED[w.id] || (ED[w.id] = { set: {}, log: [], notes: [] }); }
  function cartItems() {
    var wc = SE.state.woCart;
    if (!wc[w.id]) wc[w.id] = w.cart ? JSON.parse(JSON.stringify(w.cart)) : [];
    return wc[w.id];
  }

  function change(field, label, value, shown) {
    var was = w[field];
    if (String(was) === String(value)) return;
    var e = edits(); e.set[field] = value; e.set.updated = 'Just now';
    e.log.push(['Today', label + ' ' + (was || 'not set') + ' to ' + shown + ', by ' + D.user.name]);
    SE.save(); w = SE.wo(w.id); render();
    SE.toast(label + ' saved: ' + shown, 'check');
    var f = el.querySelector('[data-edit="' + field + '"]'); if (f && !SE.capture) f.focus();
  }
  var REASONS = ['Duplicate work order', 'Fixed without parts', 'Unit sold or retired', 'Other'];

  function warranty() {
    if (!w.warranty) return '<span class="muted">Expired</span>';
    if (typeof w.warranty === 'object') {
      return w.warranty.active ? 'Active · Expires ' + esc(w.warranty.expiry) : 'Expired';
    }
    return 'Until ' + esc(w.warranty);
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function itemStatus(c) {
    if (c.replacedBy) return 'replaced';
    if (c.replacesId) return (c.inStock !== false) ? 'orderable' : 'needs_attention';
    var hasMand = (c.crossRefs || []).some(function (r) { return r.mandatory; });
    if (!c.inStock && !(c.crossRefs || []).length) return 'unorderable';
    if (hasMand) return 'blocked';
    if (!c.inStock) return 'needs_attention';
    if ((c.localInventory || []).length && !c.selectedSource && !(c.selectedSources && c.selectedSources.length)) return 'needs_attention';
    return 'orderable';
  }

  function statusIcon(c) {
    var st = itemStatus(c);
    if (st === 'replaced')      return '<span class="ci-st ci-rep">'  + icon('replace') + '</span>';
    if (st === 'blocked')       return '<span class="ci-st ci-err">'  + icon('lock') + '</span>';
    if (st === 'unorderable')   return '<span class="ci-st ci-err">'  + icon('cross-circle') + '</span>';
    if (st === 'needs_attention') return '<span class="ci-st ci-warn">' + icon('triangle-warning') + '</span>';
    return '<span class="ci-st ci-ok">' + icon('circle-check') + '</span>';
  }

  function xrefBadge(c) {
    if (c.replacedBy || c.replacesId) return '';
    var refs = c.crossRefs || [];
    if (!refs.length) return '';
    if (refs.some(function (r) { return r.mandatory; }))
      return '<span class="ci-xref ci-xref-mand">' + icon('switch') + ' Mandatory cross-ref</span>';
    return '<span class="ci-xref ci-xref-opt">' + icon('switch') + ' ' + refs.length + ' optional cross-ref' + (refs.length !== 1 ? 's' : '') + '</span>';
  }

  function stockCell(c) {
    if (c.replacedBy) return '<span class="ci-dash">—</span>';
    var src = c.selectedSources || (c.selectedSource ? [c.selectedSource] : []);
    if (src.length) {
      var qty = src.reduce(function (s, x) { return s + (x.qty || 0); }, 0);
      var lbl = src.length === 1 ? src[0].locationName : src.length + ' locations';
      return '<span class="ci-local ci-local-sel">' + icon('map-marker') + ' ' + esc(lbl) + (qty ? ' (' + qty + ')' : '') + '</span>';
    }
    var inv = c.localInventory || [];
    if (!inv.length) return '<span class="ci-dash">—</span>';
    var tot = inv.reduce(function (s, l) { return s + l.qty; }, 0);
    return '<span class="ci-local">' + icon('map-marker') + ' ' + tot + ' avail</span>';
  }

  // ── Review panel (before checkout) ───────────────────────────────────────
  function reviewPanel(items) {
    var issues = [];
    items.forEach(function (c) {
      if (c.replacedBy) return;
      var st = itemStatus(c);
      if (st === 'blocked') {
        var refs = c.crossRefs || [], mandIdx = refs.findIndex(function (r) { return r.mandatory; });
        var mand = mandIdx >= 0 ? refs[mandIdx] : null;
        issues.push({ blocking: true, title: 'Mandatory cross-ref', text: 'Must use an approved alternative before ordering.', c: c,
          act: mand ? '<button class="btn btn-primary btn-sm" data-ci-swap="' + esc(c.id) + '" data-ci-xref="' + mandIdx + '">' + icon('swap') + 'Swap to ' + esc(mand.partNum) + ' · ' + SE.money(mand.price) + '</button>' : '' });
      } else if (st === 'unorderable') {
        issues.push({ blocking: true, title: 'Cannot order', text: 'Out of stock with no available alternatives.', c: c, act: '' });
      } else if (st === 'needs_attention' && !c.inStock && (c.crossRefs || []).length) {
        issues.push({ blocking: false, title: 'Out of stock', text: 'Backordered from supplier. Use an alternative or wait.', c: c,
          act: '<button class="btn btn-primary btn-sm" data-ci-swap="' + esc(c.id) + '" data-ci-xref="0">' + icon('swap') + 'Use ' + esc((c.crossRefs || [])[0].partNum) + ' · ' + SE.money((c.crossRefs || [])[0].price) + '</button>' });
      } else if (st === 'needs_attention' && (c.localInventory || []).length) {
        issues.push({ blocking: false, title: 'Branch stock available', text: 'Nearby branches have stock. Review before ordering.', c: c,
          act: '<button class="btn btn-secondary btn-sm" data-ci-stock="' + esc(c.id) + '">' + icon('map-marker') + 'Review branch stock</button>' });
      }
    });
    if (!issues.length) return '';
    var blocking = issues.filter(function (x) { return x.blocking; }).length;
    return '<section class="card rv" aria-labelledby="ci-rv-h"><header class="rv-head">' +
      '<span class="rv-ico">' + icon('shield-check') + '</span>' +
      '<div><h2 id="ci-rv-h">Before checkout: ' + issues.length + ' line' + (issues.length === 1 ? '' : 's') + ' to sort out</h2>' +
      '<p class="muted">' + (blocking ? blocking + ' must change' + (issues.length > blocking ? ', ' + (issues.length - blocking) + ' need' + (issues.length - blocking === 1 ? 's' : '') + ' a decision' : '') : 'Each needs a decision') + '.</p></div></header>' +
      '<ul class="rv-list">' + issues.map(function (x) {
        return '<li class="rv-row">' + SE.chip(x.blocking ? 'Must change' : 'Decide', x.blocking ? 'danger' : 'warning') +
          '<div class="rv-txt"><b>' + esc(x.c.partNum) + '</b><span><b>' + esc(x.title) + '.</b> ' + esc(x.text) + '</span></div>' +
          '<div class="rv-acts">' + x.act + '</div></li>';
      }).join('') + '</ul></section>';
  }

  // ── Branch stock dialog (WO version using localInventory) ─────────────────
  function stockDialogWO(id) {
    var sitems = cartItems(), c = sitems.find(function (x) { return x.id === id; });
    if (!c) return;
    var inv = c.localInventory || [];
    if (!inv.length) return;
    var take = {};
    inv.forEach(function (l) { take[l.locationId] = (c.selectedSources || []).reduce(function (t, s) { return s.locationId === l.locationId ? s.qty : t; }, 0); });
    function sdTotal() { return Object.keys(take).reduce(function (t, k) { return t + take[k]; }, 0); }
    function sdRows() {
      return inv.map(function (loc) {
        var dn = take[loc.locationId] <= 0, up = take[loc.locationId] >= loc.qty || sdTotal() >= (c.qty || 1);
        return '<li class="bs-row"><span class="bs-name"><b>' + esc(loc.locationName) + '</b><small>' + loc.qty + ' on shelf · ' + esc(loc.distance) + '</small></span>' +
          '<div class="stepper sm" role="group" aria-label="Units from ' + esc(loc.locationName) + '">' +
          '<button type="button" data-bs="' + esc(loc.locationId) + '" data-d="-1"' + (dn ? ' disabled' : '') + '>' + icon('minus-small') + '</button>' +
          '<output aria-live="polite">' + take[loc.locationId] + '</output>' +
          '<button type="button" data-bs="' + esc(loc.locationId) + '" data-d="1"' + (up ? ' disabled' : '') + '>' + icon('plus-small') + '</button>' +
          '</div></li>';
      }).join('');
    }
    function sdSummary() {
      var t = sdTotal(), buy = (c.qty || 1) - t;
      return '<b>' + t + ' of ' + (c.qty || 1) + ' from branch shelves</b>, ' + (buy > 0 ? buy + ' to order from ' + esc(c.vendor || 'supplier') + (!c.inStock ? ' (backordered)' : '') : 'nothing to buy') + (t > 0 ? '. Saves ' + SE.money(t * c.price) + '.' : '.');
    }
    var d = open = SE.ui.dialog({
      title: 'Branch stock: ' + esc(c.description),
      body: '<p class="muted">' + esc(c.partNum) + ' · ' + (c.qty || 1) + ' needed. Units from another branch arrive via branch transfer.</p>' +
        '<ul class="bs-list">' + sdRows() + '</ul><p class="bs-sum" aria-live="polite">' + sdSummary() + '</p>',
      foot: '<button type="button" class="btn btn-link" data-bs-clear>Clear</button><button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-bs-save>Save sources</button>',
    });
    d.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bs]');
      if (b && !b.disabled) { take[b.dataset.bs] = Math.max(0, take[b.dataset.bs] + +b.dataset.d); d.el.querySelector('.bs-list').innerHTML = sdRows(); d.el.querySelector('.bs-sum').innerHTML = sdSummary(); return; }
      if (e.target.closest('[data-bs-clear]')) { Object.keys(take).forEach(function (k) { take[k] = 0; }); d.el.querySelector('.bs-list').innerHTML = sdRows(); d.el.querySelector('.bs-sum').innerHTML = sdSummary(); return; }
      if (e.target.closest('[data-bs-save]')) {
        var sel = inv.filter(function (l) { return take[l.locationId] > 0; }).map(function (l) { return { locationId: l.locationId, locationName: l.locationName, qty: take[l.locationId] }; });
        c.selectedSources = sel.length ? sel : undefined;
        SE.save(); d.close(); var cs = el.querySelector('#wo-cart-sec'); if (cs) cs.innerHTML = cart();
        SE.toast(sdTotal() > 0 ? sdTotal() + ' from branch shelves' : 'Ordering all from supplier', 'map-marker');
      }
    });
  }

  function cartRow(c, withRemove) {
    var replaced = !!c.replacedBy;
    var lineThru = replaced ? ' style="text-decoration:line-through;color:var(--muted);"' : '';
    var rowCls = replaced ? ' ci-row-dim' : '';
    var replOrig = c.replacesId ? cartItems().find(function (x) { return x.id === c.replacesId; }) : null;
    var qtyCtrl = replaced
      ? '<span class="ci-dash">—</span>'
      : '<div class="ci-qty"><button type="button" class="qty-btn" data-cart-dec="' + esc(c.id) + '">−</button><span class="qty-val">' + (c.qty || 1) + '</span><button type="button" class="qty-btn" data-cart-inc="' + esc(c.id) + '">+</button></div>';
    var removeBtn = withRemove && !replaced
      ? '<button type="button" class="ci-rm" data-cart-rm="' + esc(c.id) + '" title="Remove">' + icon('trash') + '</button>' : '';
    return '<tr class="ci-row' + rowCls + '">' +
      '<td class="col-st">' + statusIcon(c) + '</td>' +
      '<td class="col-pn"><div class="ci-pn"' + lineThru + '>' + esc(c.partNum) + '</div><div class="ci-vendor">' + esc(c.vendor || '') + (c.oemOnly ? ' <span class="oem-badge">OEM</span>' : '') + '</div></td>' +
      '<td class="col-desc"><div class="ci-desc"' + lineThru + '>' + esc(c.description) + '</div>' +
        (replOrig ? '<div class="ci-replaces">' + icon('arrows-exchange') + ' Replaces ' + esc(replOrig.partNum) + '</div>' : '') +
        (xrefBadge(c) ? '<div class="ci-xref-wrap">' + xrefBadge(c) + '</div>' : '') + '</td>' +
      '<td class="col-uom"><span class="uom-badge">' + esc(c.uom || 'EA') + '</span></td>' +
      '<td class="col-loc">' + stockCell(c) + '</td>' +
      '<td class="col-qty">' + qtyCtrl + '</td>' +
      '<td class="col-unit">' + (replaced ? '<span class="ci-dash">—</span>' : SE.money(c.price)) + '</td>' +
      '<td class="col-tot">' + (replaced ? '<span class="ci-dash">—</span>' : '<b>' + SE.money(c.price * (c.qty || 1)) + '</b>') + '</td>' +
      (withRemove ? '<td class="col-rm">' + removeBtn + '</td>' : '') +
    '</tr>';
  }

  function cartTableHead(withRemove) {
    return '<thead class="ci-thead"><tr>' +
      '<th class="col-st"></th><th class="col-pn">Part #</th><th class="col-desc">Description</th>' +
      '<th class="col-uom">UOM</th><th class="col-loc">Source / stock</th>' +
      '<th class="col-qty ci-center">Qty</th><th class="col-unit ci-right">Unit</th><th class="col-tot ci-right">Total</th>' +
      (withRemove ? '<th class="col-rm"></th>' : '') +
    '</tr></thead>';
  }

  function cartTableBody(items, withRemove) {
    // Group pairs: original + replacement side-by-side
    var rendered = {}, units = [];
    items.forEach(function (c) {
      if (rendered[c.id]) return;
      if (c.replacesId) return; // rendered with parent
      rendered[c.id] = true;
      if (c.replacedBy) {
        var rep = items.find(function (x) { return x.id === c.replacedBy; });
        if (rep) { rendered[rep.id] = true; units.push([c, rep]); return; }
      }
      units.push([c]);
    });
    items.forEach(function (c) { if (!rendered[c.id]) units.push([c]); });
    return units.map(function (u, idx) {
      var sep = idx > 0 ? '<tr class="ci-sep"><td colspan="' + (withRemove ? 9 : 8) + '"></td></tr>' : '';
      if (u.length === 2) {
        return sep + '<tbody class="ci-pair">' + cartRow(u[0], withRemove) +
          '<tr class="ci-xref-lbl"><td colspan="' + (withRemove ? 9 : 8) + '"><div class="ci-xref-lbl-inner">' + icon('arrows-exchange') + ' Cross-ref applied — replaced by</div></td></tr>' +
          cartRow(u[1], withRemove) + '</tbody>';
      }
      return sep + '<tbody>' + cartRow(u[0], withRemove) + '</tbody>';
    }).join('');
  }

  function groupedCartBody(items, withRemove) {
    var SOURCING = [
      { key: 'local',    label: 'In-location stock' },
      { key: 'nearby',   label: 'Nearby branches' },
      { key: 'external', label: 'External order' }
    ];
    var STATUS_GROUPS = [
      { key: 'available',     label: 'Available' },
      { key: 'backordered',   label: 'Backordered' },
      { key: 'not_orderable', label: 'Not orderable' },
      { key: 'replaced',      label: 'Replaced' }
    ];
    function sourcingOf(c) {
      var inv = c.localInventory || [];
      if (!inv.length) return 'external';
      return inv.some(function (l) { return l.locationName === (SE.location() || {}).name; }) ? 'local' : 'nearby';
    }
    function statusOf(c) {
      var st = itemStatus(c);
      if (st === 'blocked' || st === 'unorderable') return 'not_orderable';
      if (st === 'replaced') return 'replaced';
      if (!c.inStock) return 'backordered';
      return 'available';
    }
    var groups;
    if (groupBy === 'sourcing') groups = SOURCING;
    else if (groupBy === 'status') groups = STATUS_GROUPS;
    else { var vendors = []; items.forEach(function (c) { if (vendors.indexOf(c.vendor) < 0) vendors.push(c.vendor); }); vendors.sort(); groups = vendors.map(function (v) { return { key: v, label: v }; }); }
    return groups.map(function (g) {
      var subset = items.filter(function (c) {
        return groupBy === 'sourcing' ? sourcingOf(c) === g.key : groupBy === 'status' ? statusOf(c) === g.key : c.vendor === g.key;
      });
      if (!subset.length) return '';
      var grpTotal = subset.filter(function (c) { return !c.replacedBy; }).reduce(function (s, c) { return s + c.price * (c.qty || 1); }, 0);
      return '<tbody><tr><td colspan="' + (withRemove ? 9 : 8) + '" class="ci-group-hdr">' +
        esc(g.label) + '<span class="ci-grp-cnt">' + subset.length + '</span><span class="ci-grp-tot">' + SE.money(grpTotal) + '</span>' +
      '</td></tr>' +
      subset.map(function (c) { return cartRow(c, withRemove); }).join('') + '</tbody>';
    }).join('');
  }

  function cart() {
    var items = cartItems();
    var st = W.status(w), canEdit = editable(st);
    var submittable = items.filter(function (c) { return ['blocked', 'unorderable', 'replaced'].indexOf(itemStatus(c)) < 0; });
    var blocked = items.filter(function (c) { return ['blocked', 'unorderable'].indexOf(itemStatus(c)) >= 0; }).length;
    var total = submittable.reduce(function (s, c) { return s + c.price * (c.qty || 1); }, 0);
    var grpChips = ['none', 'sourcing', 'status', 'vendor'].map(function (g) {
      return '<button type="button" class="cart-grp-chip' + (groupBy === g ? ' cart-grp-chip-on' : '') + '" data-grp="' + g + '">' + (g === 'none' ? 'None' : g.charAt(0).toUpperCase() + g.slice(1)) + '</button>';
    }).join('');
    var hdr = '<div class="cart-hdr">' +
      '<div class="cart-title">' + icon('shopping-cart') + 'Active cart<span class="cart-badge">' + items.length + '</span></div>' +
      '<div class="cart-hdr-r"><span class="cart-grp-label">Group by</span>' + grpChips +
      (canEdit ? '<a class="btn btn-secondary btn-sm" href="#/machine?m=' + esc(W.machineKey(w) || '') + '&wo=' + esc(w.id) + '" data-go="machine" data-m="' + esc(W.machineKey(w) || '') + '" data-wo="' + esc(w.id) + '">' + icon('plus') + 'Add parts</a>' : '') +
      '</div></div>';
    if (!items.length) {
      return '<div class="card ci-cart-card">' + hdr + '<div class="cart-empty">' + icon('box') + '<span>No items in cart.</span></div></div>';
    }
    var rv = reviewPanel(items);
    var thead = cartTableHead(canEdit);
    var tbody = groupBy === 'none' ? cartTableBody(items, canEdit) : groupedCartBody(items, canEdit);
    var byVendor = {}, vOrder = [];
    items.filter(function (c) { return !c.replacedBy; }).forEach(function (c) {
      var v = c.vendor || 'Unknown';
      if (!byVendor[v]) { byVendor[v] = 0; vOrder.push(v); }
      byVendor[v] += c.price * (c.qty || 1);
    });
    var submitLabel = blocked > 0
      ? 'Submit orderable items<span class="ci-unord">' + icon('triangle-warning') + blocked + ' unorderable</span>'
      : icon('check') + 'Submit order';
    var aside = '<aside class="card oc-aside ci-cart-aside"><h2 class="oc-aside-h">Summary</h2>' +
      SE.ui.kv(vOrder.map(function (v) { return [v, SE.money(byVendor[v])]; })) +
      '<div class="oc-grand"><span>Estimated total</span><b>' + SE.money(total) + '</b></div>' +
      '<p class="oc-note">Tax and freight are added by the supplier.</p>' +
      (canEdit
        ? '<button type="button" class="btn btn-primary oc-cta" data-cart-submit' + (submittable.length === 0 ? ' disabled' : '') + '>' + submitLabel + '</button>' +
          '<button type="button" class="btn btn-secondary oc-cta" data-ci-tools>' + icon('share') + 'Cart actions' + icon('angle-small-down') + '</button>'
        : '') +
      '</aside>';
    return rv + '<div class="oc-grid ci-cart-grid"><div class="oc-main"><div class="card ci-cart-card">' +
      hdr + '<div class="cart-tbl-wrap"><table class="ci-table">' + thead + tbody + '</table></div></div></div>' +
      aside + '</div>';
  }

  // ── Submitted orders accordion ────────────────────────────────────────────
  function submittedOrders() {
    var ords = w.submittedOrders || [];
    if (!ords.length) return '<div class="card wo-none">' + icon('receipt') + '<span>No orders submitted yet.</span></div>';
    var STATUS_LABEL = { in_transit: 'In transit', backordered: 'Backordered', delivered: 'Delivered', submitted: 'Submitted' };
    var STATUS_CLS   = { in_transit: 'chip chip-info', backordered: 'chip chip-warning', delivered: 'chip chip-success', submitted: 'chip chip-neutral' };
    return ords.map(function (ord, i) {
      var open = ordOpen[i] !== false; // default open
      var thead = cartTableHead(false);
      var tbody = cartTableBody(ord.items || [], false);
      var ordTotal = (ord.items || []).filter(function (c) { return !c.replacedBy; }).reduce(function (s, c) { return s + c.price * (c.qty || 1); }, 0);
      var pill = '<span class="' + (STATUS_CLS[ord.status] || 'chip chip-neutral') + '">' + esc(STATUS_LABEL[ord.status] || esc(ord.status)) + '</span>';
      return '<div class="ord-acc" id="wo-ord-' + i + '">' +
        '<button type="button" class="ord-acc-hdr' + (open ? ' open' : '') + '" data-ord-toggle="' + i + '">' +
          icon('angle-small-right') +
          '<span class="ord-pn">' + esc(ord.poNum) + '</span>' +
          '<span class="ord-date">' + esc(ord.date) + '</span>' +
          pill +
          '<span class="ord-tot">' + SE.money(ord.total != null ? ord.total : ordTotal) + '</span>' +
        '</button>' +
        '<div class="ord-acc-body"' + (open ? '' : ' hidden') + '>' +
          '<div class="cart-tbl-wrap"><table class="ci-table">' + thead + tbody + '</table></div>' +
          '<div class="ord-acc-foot">' + (ord.items || []).filter(function (c) { return !c.replacedBy; }).length + ' items · <b>' + SE.money(ord.total != null ? ord.total : ordTotal) + '</b></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Machine orders button / dialog ────────────────────────────────────────
  function machineOrdersBtn() {
    var otherWOs = SE.allWorkOrders().filter(function (wo) { return wo.equip === w.equip && wo.id !== w.id && (wo.submittedOrders || []).length; });
    if (!otherWOs.length) return '';
    var total = otherWOs.reduce(function (s, wo) { return s + (wo.submittedOrders || []).length; }, 0);
    return '<button type="button" class="btn btn-secondary btn-sm" data-machine-orders>' + icon('history') + 'Orders on this machine <span class="chip chip-neutral" style="margin-left:4px;">' + total + '</span></button>';
  }

  // ── Combined notes + activity timeline ───────────────────────────────────
  function timeline() {
    var e = ED[w.id];
    var st = W.status(w);
    // Collect user notes (from data or session)
    var notes = (e && e.notes && e.notes.length) ? e.notes : (w.notes || []);
    // Collect activity log entries
    var logRows = w.log.concat(e ? e.log : []);
    var a = W.approvalFor(w.id);
    if (a) {
      var apprSt = W.apprState(a);
      if (apprSt === 'approved') { var po = W.poFor(a); logRows.push(['Today', 'Parts approved by ' + D.user.name + (po ? ', ' + po.po + ' sent to ' + po.supplier : '')]); }
      if (apprSt === 'returned') logRows.push(['Today', 'Parts returned to ' + a.by + ': ' + SE.state.returned[a.order].reason]);
    }
    if (SE.state.cancelled[w.id]) logRows.push(['Today', 'Cancelled by ' + D.user.name + ': ' + SE.state.cancelled[w.id]]);
    // Build unified list: notes first (newest top), then log (newest top)
    var noteItems = notes.slice().reverse().map(function (n) {
      return '<li class="tl-note now"><span class="dot" aria-hidden="true"></span><b>' + esc(n.text) + '</b><small>' + esc(n.author || D.user.name) + (n.time ? ' · ' + esc(n.time) : '') + '</small></li>';
    });
    var logItems = logRows.reverse().map(function (r, i) {
      return '<li' + (i === 0 && !notes.length ? ' class="now"' : '') + '><span class="dot" aria-hidden="true"></span><b>' + esc(r[1]) + '</b><small>' + esc(r[0]) + '</small></li>';
    });
    var list = (noteItems.length || logItems.length)
      ? '<ol class="wo-log card">' + noteItems.join('') + logItems.join('') + '</ol>'
      : '<div class="card wo-none">' + icon('history') + '<span>No activity yet.</span></div>';
    if (!editable(st)) return list;
    return list + '<div class="wo-note-row"><input type="text" id="wo-note-in" class="wo-note-input" placeholder="Add a note…" aria-label="Note text"><button type="button" class="btn btn-secondary" data-add-note>' + icon('comment-alt') + 'Add note</button></div>';
  }

  function actions(st) {
    if (SE.twin && (st === 'Done' || st === 'Cancelled')) return '';
    if (W.archived(w)) return '<button type="button" class="btn btn-secondary" data-unarchive>' + icon('undo') + 'Un-archive</button>';
    if (st === 'Done' || st === 'Cancelled') return '<button type="button" class="btn btn-secondary" data-archive>' + icon('box') + 'Archive</button>';
    return machineOrdersBtn() +
      '<button type="button" class="btn btn-danger" data-cancel>Cancel work order</button>';
  }
  function editable(st) { return !SE.twin && !W.archived(w) && st !== 'Cancelled'; }
  function sel(field, label, opts, cur) {
    return '<div class="form-row wo-ed"><label for="ed-' + field + '">' + label + '</label><div class="control"><select id="ed-' + field + '" data-edit="' + field + '">' +
      opts.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>';
  }
  function editor(st) {
    var STATUS = ['Open', 'In progress', 'Done'], due = K.parse(w.due);
    if (STATUS.indexOf(st) < 0) STATUS.unshift(st);
    return '<div class="wo-edit">' + sel('status', 'Status', STATUS, st) + sel('priority', 'Priority', ['Normal', 'Medium', 'High'], w.priority) + sel('assignee', 'Assignee', SE.data.techs, w.assignee) +
      '<div class="form-row wo-ed"><label for="ed-due">Due</label><div class="control"><input type="date" id="ed-due" data-edit="due" value="' + (due ? K.iso(due) : '') + '"></div></div>' +
      '<p class="wo-ed-note">' + icon('check') + 'Changes save as you make them and go into the activity log.</p></div>';
  }

  function body() {
    var st = W.status(w);
    var make = unit.make || w.make || '', model = unit.model || w.model || '';
    var kvEdit = [
      w.externalId ? ['ERP order', esc(w.externalId)] : null,
      ['Type', esc(w.kind || 'Equipment repair')],
      ['Machine', esc(w.machine)], ['Asset', esc(w.equip)],
      make  ? ['Make',   esc(make)]  : null,
      model ? ['Model',  esc(model)] : null,
      ['Serial', esc(unit.serial || 'Unknown')],
      ['Branch', esc(unit.location || 'Unknown')],
      ['Opened', esc(w.opened)], ['Warranty', warranty()]
    ].filter(Boolean);
    var kvFull = [
      w.externalId ? ['ERP order', esc(w.externalId)] : null,
      ['Type', esc(w.kind || 'Equipment repair')],
      ['Status', SE.chip(st)], ['Priority', W.priority(w.priority)],
      ['Machine', esc(w.machine)], ['Asset', esc(w.equip)],
      make  ? ['Make',   esc(make)]  : null,
      model ? ['Model',  esc(model)] : null,
      ['Serial', esc(unit.serial || 'Unknown')],
      ['Branch', esc(unit.location || 'Unknown')],
      ['Assignee', esc(w.assignee)],
      ['Opened', esc(w.opened)], ['Due', esc(w.due || 'Not set')], ['Warranty', warranty()]
    ].filter(Boolean);
    return SE.recallNote(w.equip) + '<div class="split wo-split"><div class="wo-main">' +
        '<section class="card wo-summary"><div class="chips">' + SE.chip(st) + W.priority(w.priority) + '</div>' +
          '<h2 class="wo-h">' + esc(w.issue) + '</h2><p class="muted">' + esc(w.machine) + ' · Asset ' + esc(w.equip) + '</p>' +
          (st === 'Cancelled' ? SE.ui.banner('<b>Cancelled.</b> ' + esc(SE.state.cancelled[w.id]), 'danger', 'cross-small') : '') +
          (w.desc ? '<p class="wo-desc">' + esc(w.desc) + '</p>' : '') + '</section>' +
        '<section class="sec ci-sec" id="wo-cart-sec">' + cart() + '</section>' +
        SE.ui.sec('Orders submitted', '', submittedOrders(), 'h-ord') +
        SE.ui.sec('Notes &amp; activity', '', timeline(), 'h-log') +
      '</div>' +
      '<aside class="panel wo-panel" aria-label="Work order details"><div class="panel-body">' +
        '<h2 class="wo-panel-h">Details</h2>' +
        (editable(st) ? editor(st) + SE.ui.kv(kvEdit)
          : (W.archived(w) ? SE.ui.banner('<b>Archived.</b> Read only. Un-archive it to make changes.', 'neutral', 'box') : '') +
            SE.ui.kv(kvFull)) +
      '</div></aside></div>';
  }

  var s = SE.shell(el, { nav: 'work-orders', title: 'Work order #' + w.id, sub: esc(w.machine) + ' · Asset ' + esc(w.equip) + ' · ' + esc(unit.location || ''), crumbs: crumbs,
    actions: '<span id="wo-actions" class="wo-actions">' + actions(W.status(w)) + '</span>', body: '<div id="wo-body">' + body() + '</div>' });
  function render() {
    el.querySelector('#wo-body').innerHTML = body();
    el.querySelector('#wo-actions').innerHTML = actions(W.status(w));
  }

  var open = null;
  function cancel() {
    var dlg = open = SE.ui.dialog({
      title: 'Cancel work order #' + w.id + '?',
      body: '<p class="muted">' + esc(w.assignee) + ' sees the cancellation on the work order. Parts already ordered stay ordered.</p>' +
        '<div class="form-row" id="row-reason"><label for="c-reason">Reason</label><div class="control"><select id="c-reason" aria-describedby="err-reason"><option value="">Choose a reason</option>' +
          REASONS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div>' +
          '<p class="form-err" id="err-reason" hidden>Choose why the work order is cancelled.</p></div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Keep work order</button><button type="button" class="btn btn-danger-solid" data-confirm>Cancel work order</button>',
    });
    dlg.el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-confirm]')) return;
      var r = dlg.el.querySelector('#c-reason').value;
      if (!r) { dlg.el.querySelector('#row-reason').classList.add('invalid'); dlg.el.querySelector('#err-reason').hidden = false; dlg.el.querySelector('#c-reason').focus(); return; }
      SE.state.cancelled[w.id] = r;
      SE.save(); dlg.close(); render();
      SE.toast('Work order #' + w.id + ' cancelled', 'check');
    });
  }

  function showMachineOrders() {
    var otherWOs = SE.allWorkOrders().filter(function (wo) { return wo.equip === w.equip && wo.id !== w.id && (wo.submittedOrders || []).length; });
    var rows = [];
    otherWOs.forEach(function (wo) {
      (wo.submittedOrders || []).forEach(function (ord) {
        var STATUS_LABEL = { in_transit: 'In transit', backordered: 'Backordered', delivered: 'Delivered', submitted: 'Submitted' };
        var STATUS_CLS   = { in_transit: 'chip chip-info', backordered: 'chip chip-warning', delivered: 'chip chip-success', submitted: 'chip chip-neutral' };
        rows.push(['<b>' + esc(ord.poNum) + '</b><span class="sub">' + esc(ord.date) + '</span>',
          'WO #' + wo.id + '<span class="sub">' + esc(wo.issue.slice(0, 40)) + '</span>',
          '<span class="' + (STATUS_CLS[ord.status] || 'chip chip-neutral') + '">' + esc(STATUS_LABEL[ord.status] || ord.status) + '</span>',
          SE.money(ord.total || 0)]);
      });
    });
    var dlg2 = open = SE.ui.dialog({
      title: 'Orders on ' + esc(w.machine) + ' · Asset ' + esc(w.equip),
      body: SE.ui.table([['Order'], ['Work order'], ['Status'], ['Total', 'num']], rows),
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Close</button>',
    });
    dlg2.el; // already shown
  }

  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-cancel]')) { cancel(); return; }
    if (e.target.closest('[data-machine-orders]')) { showMachineOrders(); return; }

    // Cart: group-by chips
    var grpBtn = e.target.closest('[data-grp]');
    if (grpBtn) { groupBy = grpBtn.dataset.grp; var cs = el.querySelector('#wo-cart-sec'); if (cs) cs.innerHTML = cart(); return; }

    // Cart: qty +/-
    var incBtn = e.target.closest('[data-cart-inc]');
    if (incBtn) {
      var items = cartItems(), c = items.find(function (x) { return x.id === incBtn.dataset.cartInc; });
      if (c) { c.qty = (c.qty || 1) + 1; SE.save(); var cs2 = el.querySelector('#wo-cart-sec'); if (cs2) cs2.innerHTML = cart(); } return;
    }
    var decBtn = e.target.closest('[data-cart-dec]');
    if (decBtn) {
      var items2 = cartItems(), c2 = items2.find(function (x) { return x.id === decBtn.dataset.cartDec; });
      if (c2 && (c2.qty || 1) > 1) { c2.qty = (c2.qty || 1) - 1; SE.save(); var cs3 = el.querySelector('#wo-cart-sec'); if (cs3) cs3.innerHTML = cart(); } return;
    }
    var rmBtn = e.target.closest('[data-cart-rm]');
    if (rmBtn) {
      var items3 = cartItems(), idx = items3.findIndex(function (x) { return x.id === rmBtn.dataset.cartRm; });
      if (idx >= 0) { items3.splice(idx, 1); SE.save(); var cs4 = el.querySelector('#wo-cart-sec'); if (cs4) cs4.innerHTML = cart(); } return;
    }

    // Review panel: swap item with a cross-ref
    var swapBtn2 = e.target.closest('[data-ci-swap]');
    if (swapBtn2) {
      var swapItems = cartItems(), swapId = swapBtn2.dataset.ciSwap;
      var swapOrig = swapItems.find(function (x) { return x.id === swapId; });
      if (swapOrig) {
        var xrefIdx = parseInt(swapBtn2.dataset.ciXref, 10);
        var xref = (swapOrig.crossRefs || [])[xrefIdx];
        if (xref) {
          swapOrig.replacedBy = xref.partNum;
          var newSwapItem = { id: xref.partNum, partNum: xref.partNum, description: xref.description, vendor: xref.vendor, price: xref.price, qty: swapOrig.qty || 1, uom: xref.uom || swapOrig.uom, inStock: true, oemOnly: false, localInventory: [], crossRefs: [], replacesId: swapId };
          var si = swapItems.indexOf(swapOrig);
          swapItems.splice(si + 1, 0, newSwapItem);
          SE.save(); var csSwap = el.querySelector('#wo-cart-sec'); if (csSwap) csSwap.innerHTML = cart();
          SE.toast('Swapped to ' + xref.partNum, 'check');
        }
      }
      return;
    }
    // Review panel: branch stock dialog
    var ciStockBtn = e.target.closest('[data-ci-stock]');
    if (ciStockBtn) { stockDialogWO(ciStockBtn.dataset.ciStock); return; }
    // Cart actions menu
    var ciToolsBtn = e.target.closest('[data-ci-tools]');
    if (ciToolsBtn) {
      SE.ui.menu(ciToolsBtn, [
        { label: 'Save as shopping list', icon: 'list', run: function () { SE.toast('Saved as a shopping list', 'list'); } },
        { label: 'Export as CSV', icon: 'download', run: function () {
          var csvItems = cartItems(), csvData = ['Part #,Description,UOM,Vendor,Unit price,Qty,Total'].concat(
            csvItems.filter(function (c) { return !c.replacedBy; }).map(function (c) {
              return [c.partNum, '"' + (c.description || '').replace(/"/g, '""') + '"', c.uom || 'EA', c.vendor || '', c.price || 0, c.qty || 1, ((c.price || 0) * (c.qty || 1))].join(',');
            })
          ).join('\n');
          if (SE.tx && SE.tx.download) SE.tx.download('wo-' + w.id + '-cart.csv', csvData, 'text/csv;charset=utf-8');
          SE.toast('CSV downloaded', 'download');
        } },
      ]);
      return;
    }
    // Cart: submit
    if (e.target.closest('[data-cart-submit]')) { SE.toast('Order submitted — check your orders list', 'check'); return; }

    // Submitted orders accordion
    var togBtn = e.target.closest('[data-ord-toggle]');
    if (togBtn) {
      var i = parseInt(togBtn.dataset.ordToggle, 10);
      ordOpen[i] = !togBtn.classList.contains('open');
      togBtn.classList.toggle('open', ordOpen[i]);
      var body2 = document.getElementById('wo-ord-' + i);
      if (body2) { var bd = body2.querySelector('.ord-acc-body'); if (bd) bd.hidden = !ordOpen[i]; }
      return;
    }

    // Note add
    if (e.target.closest('[data-add-note]')) {
      var inp = el.querySelector('#wo-note-in');
      var text = inp ? inp.value.trim() : '';
      if (!text) { if (inp) inp.focus(); return; }
      var now = new Date();
      var ed = edits();
      if (!ed.notes) ed.notes = [];
      ed.notes.push({ text: text, author: D.user.name, time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
      SE.save(); if (inp) inp.value = ''; render();
      SE.toast('Note added', 'check'); return;
    }

    // Archive / un-archive
    var ar = e.target.closest('[data-archive], [data-unarchive]');
    if (!ar) return;
    var on = ar.hasAttribute('data-archive');
    if (on) SE.state.archived[w.id] = true; else delete SE.state.archived[w.id];
    edits().log.push(['Today', (on ? 'Archived' : 'Un-archived') + ' by ' + D.user.name]);
    SE.save(); render();
    SE.toast('Work order #' + w.id + (on ? ' archived' : ' back in the list'), 'box');
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'wo-note-in') { var btn = el.querySelector('[data-add-note]'); if (btn) btn.click(); }
  });
  el.addEventListener('change', function (e) {
    var f = e.target.closest('[data-edit]');
    if (!f) return;
    var k = f.dataset.edit;
    if (k === 'status') change('status', 'Status', f.value, f.value);
    if (k === 'priority') change('priority', 'Priority', f.value, f.value);
    if (k === 'assignee') change('assignee', 'Assignee', f.value, f.value);
    if (k === 'due' && f.value) { var d = K.parse(f.value); if (!d) { SE.toast('Choose a valid date', 'exclamation'); return; } var lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); change('due', 'Due', lbl, lbl); }
  });
  if (p.dialog === 'cancel' && !/Done|Cancelled/.test(W.status(w))) cancel();
  SE._woCartRefresh = function (woId) {
    if (woId !== w.id) return;
    var cs = el.querySelector('#wo-cart-sec');
    if (cs) cs.innerHTML = cart();
  };
  return function () { SE._woCartRefresh = null; if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
