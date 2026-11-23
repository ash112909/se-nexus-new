/* Work orders (B4, legacy web 17, 56, 57). Filter All / Open / In progress / Awaiting approval / Done with
   counts, at the chosen location; cancelled ones show as Cancelled and sort last. Table rows open the
   detail. "New work order" opens a dialog (also by deep link #/work-orders?new=1, and ?new=error shows
   the validation branch). Also defines SE.work, the status helpers shared by the work order and approval
   pages (this file loads before work-order.js, approvals.js and approval.js).
   Supervisor desk (web-full W4): the table sorts by any column (the header buttons, aria-sort), a search field
   finds work orders by number, machine, asset, issue, assignee or branch, and the Due column shows what is
   overdue. Archive is a tab of its own: done and cancelled work orders archived from their page, read only.
   State: #/work-orders?filter=Open  #/work-orders?new=1  &q=carter  &sort=due&dir=asc  #/work-orders?tab=archive */
(function () {
  'use strict';
  var W = SE.work = {};
  W.approvalFor = function (woId) { return SE.data.approvals.find(function (a) { return a.wo === woId; }); };
  W.apprState = function (a) { return SE.state.approved[a.order] ? 'approved' : SE.state.returned[a.order] ? 'returned' : 'pending'; };
  W.poFor = function (a) { return SE.state.placed.find(function (o) { return o.from === 'approval' && o.wo === a.wo; }); };
  W.status = function (w) {
    if (SE.state.cancelled[w.id]) return 'Cancelled';
    var a = W.approvalFor(w.id);
    if (a && w.status === 'Awaiting approval') { var s = W.apprState(a); if (s === 'approved') return 'In progress'; if (s === 'returned') return 'Open'; }
    return w.status;
  };
  W.machineKey = function (w) { return Object.keys(SE.data.machines).find(function (k) { return SE.data.machines[k].name === w.machine; }); };
  W.units = function () {
    var D = SE.data, u = [];
    Object.keys(D.machines).forEach(function (k) { var m = D.machines[k]; m.units.forEach(function (x) { u.push({ equip: x.equip, serial: x.serial, location: x.location, machine: m.name, make: m.supplier, model: m.model }); }); });
    return u;
  };
  W.unit = function (equip) { return W.units().find(function (u) { return u.equip === equip; }); };
  // work orders at the chosen location, including ones created in this session (SE.workOrders reads the seed only)
  W.archived = function (w) { return !!(SE.state.archived || {})[w.id]; };
  W.list = function (archive) {
    var all = SE.allWorkOrders().filter(function (w) { return W.archived(w) === !!archive; });
    var name = SE.location().name;
    all = all.filter(function (w) { var u = W.unit(w.equip); return u && u.location === name; });
    return all.filter(function (w) { return !SE.state.cancelled[w.id]; }).concat(all.filter(function (w) { return SE.state.cancelled[w.id]; }));
  };
  W.FILTERS = ['All', 'Open', 'In progress', 'Awaiting approval', 'Done'];
  W.priority = function (p) { return '<span class="wo-pri p-' + p.toLowerCase() + '">' + SE.esc(p) + '</span>'; };

  // New order dialog; onCreate(w) after it is saved
  W.newDialog = function (o) {
    o = o || {};
    var D = SE.data, esc = SE.esc;
    // Build equipment lookup from fleet data
    var EQUIP_DB = {};
    W.units().forEach(function (u) { EQUIP_DB[u.equip.toUpperCase()] = u; });

    var dlg = SE.ui.dialog({
      title: 'New order', wide: true,
      body:
        '<form id="wo-form" class="wo-form" novalidate autocomplete="off">' +
          '<div class="form-row span-2" id="row-type"><label for="f-type">Order Type <span aria-hidden="true">*</span></label>' +
            '<div class="control"><select id="f-type">' +
              '<option value="equipment">Equipment Repair</option>' +
              '<option value="pm">Scheduled PM</option>' +
              '<option value="stock">Stock / Parts</option>' +
              '<option value="other">Other / General</option>' +
            '</select>' + SE.icon('angle-small-down') + '</div></div>' +
          '<div class="form-row span-2" id="row-equip">' +
            '<label for="f-equip" id="lbl-equip">Equipment # <span class="req-star" aria-hidden="true">*</span> <span class="lbl-hint">(auto-populates make, model, serial)</span></label>' +
            '<div class="control"><input id="f-equip" type="text" placeholder="e.g. FL-094" aria-describedby="err-equip" autocomplete="off"></div>' +
            '<p class="form-err" id="err-equip" hidden>Equipment # is required.</p>' +
            '<p class="form-hint" id="f-autofill-banner" hidden></p>' +
          '</div>' +
          '<div class="form-row"><label for="f-make">Make</label>' +
            '<div class="control"><input id="f-make" type="text" placeholder="e.g. Skyjack"></div></div>' +
          '<div class="form-row"><label for="f-model">Model</label>' +
            '<div class="control"><input id="f-model" type="text" placeholder="e.g. SJIII 3219"></div></div>' +
          '<div class="form-row span-2"><label for="f-serial">Serial #</label>' +
            '<div class="control"><input id="f-serial" type="text" placeholder="e.g. SJ3219-00847"></div></div>' +
          '<div class="form-row span-2" id="row-issue">' +
            '<label for="f-issue" id="lbl-issue">Fault / Issue <span class="req-star" aria-hidden="true">*</span></label>' +
            '<div class="control"><input id="f-issue" type="text" placeholder="Describe the fault or maintenance task" aria-describedby="err-issue"></div>' +
            '<p class="form-err" id="err-issue" hidden>Please describe the issue.</p>' +
          '</div>' +
          '<div class="form-row"><label for="f-pri">Priority</label>' +
            '<div class="control"><select id="f-pri"><option value="High">High</option><option value="Medium" selected>Medium</option><option value="Normal">Low</option></select>' + SE.icon('angle-small-down') + '</div></div>' +
          '<div class="form-row" id="row-due">' +
            '<label for="f-due" id="lbl-due">Due Date <span class="req-star" aria-hidden="true">*</span></label>' +
            '<div class="control"><input id="f-due" type="date" aria-describedby="err-due"></div>' +
            '<p class="form-err" id="err-due" hidden>A due date is required.</p>' +
          '</div>' +
          '<div class="form-row"><label for="f-asg">Assignee</label>' +
            '<div class="control"><select id="f-asg"><option value="">Unassigned</option>' +
              D.techs.map(function (t) { return '<option' + (t === D.user.name ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') +
            '</select>' + SE.icon('angle-small-down') + '</div></div>' +
          '<div class="form-row"><label for="f-oid">Order ID <span class="lbl-hint">(RentalMan / ERP — optional)</span></label>' +
            '<div class="control"><input id="f-oid" type="text" placeholder="e.g. RM-10122"></div></div>' +
        '</form>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="submit" form="wo-form" class="btn btn-primary">Create Order</button>',
      onClose: o.onClose,
    });

    var d = dlg.el;

    function isEquipType() {
      var t = d.querySelector('#f-type').value;
      return t === 'equipment' || t === 'pm';
    }

    function updateLabels() {
      var eq = isEquipType();
      var star = '<span class="req-star" aria-hidden="true">*</span>';
      var hint = ' <span class="lbl-hint">(auto-populates make, model, serial)</span>';
      d.querySelector('#lbl-equip').innerHTML = 'Equipment #' + (eq ? ' ' + star + hint : ' <span class="lbl-hint">(optional)</span>');
      d.querySelector('#lbl-issue').innerHTML = (eq ? 'Fault / Issue ' + star : 'Fault / Issue / Description');
      d.querySelector('#lbl-due').innerHTML   = 'Due Date' + (eq ? ' ' + star : '');
    }

    function tryAutofill() {
      var val = d.querySelector('#f-equip').value.trim().toUpperCase();
      var u = EQUIP_DB[val];
      if (!u) return;
      d.querySelector('#f-make').value  = u.make  || '';
      d.querySelector('#f-model').value = u.model || '';
      d.querySelector('#f-serial').value= u.serial|| '';
      var banner = d.querySelector('#f-autofill-banner');
      banner.textContent = 'Auto-filled: ' + (u.make || '') + ' ' + (u.model || '') + ' \xb7 ' + (u.serial || '');
      banner.hidden = false;
    }

    function clearErr(rowId, errId) {
      d.querySelector(rowId).classList.remove('invalid');
      d.querySelector(errId).hidden = true;
    }

    function validate() {
      var eq = isEquipType();
      var okE = !eq || !!d.querySelector('#f-equip').value.trim();
      var okI = !eq || !!d.querySelector('#f-issue').value.trim();
      var okD = !eq || !!d.querySelector('#f-due').value;
      d.querySelector('#row-equip').classList.toggle('invalid', !okE); d.querySelector('#err-equip').hidden = okE;
      d.querySelector('#row-issue').classList.toggle('invalid', !okI); d.querySelector('#err-issue').hidden = okI;
      d.querySelector('#row-due').classList.toggle('invalid', !okD);   d.querySelector('#err-due').hidden = okD;
      return okE && okI && okD;
    }

    d.querySelector('#f-type').addEventListener('change', function () { updateLabels(); validate(); });
    d.querySelector('#f-equip').addEventListener('blur', function () { tryAutofill(); clearErr('#row-equip', '#err-equip'); });
    d.querySelector('#f-equip').addEventListener('input', function () {
      d.querySelector('#f-autofill-banner').hidden = true;
    });
    d.querySelector('#f-issue').addEventListener('input', function () {
      if (this.value.trim()) clearErr('#row-issue', '#err-issue');
    });
    d.querySelector('#f-due').addEventListener('change', function () { clearErr('#row-due', '#err-due'); });

    updateLabels();

    function addDays(n) { var x = SE.tx.today(); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

    d.querySelector('#wo-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) { var f = d.querySelector('.invalid input, .invalid select'); if (f) f.focus(); return; }
      var equipVal = d.querySelector('#f-equip').value.trim();
      var u = EQUIP_DB[equipVal.toUpperCase()] || W.unit(equipVal) || { equip: equipVal, machine: equipVal };
      var make  = d.querySelector('#f-make').value.trim()  || u.make  || '';
      var model = d.querySelector('#f-model').value.trim() || u.model || '';
      var machine = (make && model) ? make + ' ' + model : u.machine || equipVal;
      var asg    = d.querySelector('#f-asg').value;
      var pri    = d.querySelector('#f-pri').value;
      var dueRaw = d.querySelector('#f-due').value;
      var dueLabel = dueRaw ? new Date(dueRaw + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : addDays(pri === 'High' ? 2 : pri === 'Medium' ? 5 : 10);
      var typeVal  = d.querySelector('#f-type').value;
      var prior = D.workOrders.find(function (w) { return w.equip === (u.equip || equipVal); });
      var id = String(100120 + SE.state.newWOs.length);
      var w = { id: id, issue: d.querySelector('#f-issue').value.trim(),
        equip: u.equip || equipVal, machine: machine, status: 'Open', tone: 'danger', updated: 'Just now',
        assignee: asg || null, due: dueLabel, priority: pri, warranty: prior ? prior.warranty : null,
        opened: SE.tx.today().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), kind: typeVal,
        externalId: d.querySelector('#f-oid').value.trim() || null,
        desc: '', log: [['Today', 'Opened by ' + D.user.name + (asg ? ', assigned to ' + asg : '')]] };
      SE.state.newWOs.unshift(w);
      SE.save();
      dlg.close();
      SE.toast('Order #' + id + ' created', 'check');
      if (o.onCreate) o.onCreate(w);
    });
    if (o.showErrors) validate();
    return dlg;
  };
})();

SE.titles['work-orders'] = 'Orders';
SE.views['work-orders'] = function (el, p) {
  var esc = SE.esc, icon = SE.icon, W = SE.work, K = SE.desk;
  var FILTERS = ['All', 'Active', 'Pending', 'Closed', 'Archived'];
  var PO_FILTERS = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  var filter = FILTERS.indexOf(p.filter) >= 0 ? p.filter : 'All';
  var poFilter = 'All';
  var tab = p.tab === 'archive' && !SE.twin ? 'archive' : 'active', q = p.q || '';
  var dateMode = 'any', dateFrom = '', dateTo = '';
  var poDateMode = 'any', poDateFrom = '', poDateTo = '';
  var view = p.view === 'po' ? 'po' : 'wo';

  function displayStatus(w) {
    var st = W.status(w);
    if (st === 'Done' || st === 'Cancelled') return 'Closed';
    if (st === 'Awaiting approval') {
      var a = W.approvalFor(w.id);
      return (a && W.apprState(a) === 'pending') ? 'Parts ordered' : 'Pending';
    }
    if (st === 'In progress') return 'Active';
    return st;
  }
  var STATUS_CLS = { 'Parts ordered': 'ord-s-parts', 'Active': 'ord-s-active', 'Open': 'ord-s-open', 'Pending': 'ord-s-pending', 'Closed': 'ord-s-closed', 'Archived': 'ord-s-closed' };

  function inDateRange(w) {
    if (dateMode === 'any') return true;
    var due = K.parse(w.due);
    if (!due) return dateMode !== 'custom';
    if (dateMode === 'week') { var s = K.today(); s.setDate(s.getDate() - s.getDay()); var e = new Date(s); e.setDate(e.getDate() + 6); return due >= s && due <= e; }
    if (dateMode === 'month') { var n = K.today(); return due.getFullYear() === n.getFullYear() && due.getMonth() === n.getMonth(); }
    if (dateMode === 'custom') {
      if (dateFrom && due < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo   && due > new Date(dateTo   + 'T23:59:59')) return false;
      return true;
    }
    return true;
  }
  function matchFilter(w) {
    if (filter === 'Archived') return W.archived(w);
    if (W.archived(w)) return false;
    if (!inDateRange(w)) return false;
    if (filter === 'All') return true;
    var ds = displayStatus(w);
    if (filter === 'Active') return ds === 'Active' || ds === 'Open';
    if (filter === 'Pending') return ds === 'Pending' || ds === 'Parts ordered';
    if (filter === 'Closed') return ds === 'Closed';
    return true;
  }
  function hay(w) { return [w.id, w.machine, w.equip, w.issue, w.assignee || ''].join(' '); }
  function base() {
    var all = W.list(false).concat(W.list(true));
    return all.filter(function (w) { return !q.trim() || SE.hitTokens(hay(w), SE.qTokens(q)); });
  }
  function count(f) {
    if (f === 'Archived') return W.list(true).length;
    var list = W.list(false).filter(function (w) { return !q.trim() || SE.hitTokens(hay(w), SE.qTokens(q)); });
    if (f === 'All') return list.filter(inDateRange).length;
    return list.filter(function (w) {
      if (!inDateRange(w)) return false;
      var ds = displayStatus(w);
      if (f === 'Active') return ds === 'Active' || ds === 'Open';
      if (f === 'Pending') return ds === 'Pending' || ds === 'Parts ordered';
      if (f === 'Closed') return ds === 'Closed';
      return false;
    }).length;
  }
  function sub() { var n = W.list().length, a = W.list(true).length; return esc(SE.location().name) + ' \xb7 ' + n + ' order' + (n === 1 ? '' : 's') + (a ? ' \xb7 ' + a + ' archived' : ''); }
  function shortName(s) { if (!s) return '—'; var p = s.split(' '); return p.length > 1 ? p[0] + ' ' + p[1].charAt(0) + '.' : s; }

  function poInDateRange(o) {
    if (poDateMode === 'any') return true;
    var d = K.parse(o.placed);
    if (!d) return poDateMode !== 'custom';
    if (poDateMode === 'week') { var s = K.today(); s.setDate(s.getDate() - s.getDay()); var e = new Date(s); e.setDate(e.getDate() + 6); return d >= s && d <= e; }
    if (poDateMode === 'month') { var n = K.today(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); }
    if (poDateMode === 'custom') {
      if (poDateFrom && d < new Date(poDateFrom + 'T00:00:00')) return false;
      if (poDateTo   && d > new Date(poDateTo   + 'T23:59:59')) return false;
      return true;
    }
    return true;
  }
  function matchPoFilter(o) {
    if (!poInDateRange(o)) return false;
    if (poFilter === 'All') return true;
    return (o.status || 'Pending') === poFilter;
  }
  function countPo(f) {
    var orders = SE.orders().filter(function (o) { return !q.trim() || [o.po, o.wo || '', o.supplier || ''].join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    if (f === 'All') return orders.filter(poInDateRange).length;
    return orders.filter(function (o) { return poInDateRange(o) && (o.status || 'Pending') === f; }).length;
  }

  var PO_STATUS_CLS = { 'Shipped': 'ord-s-active', 'Delivered': 'ord-s-closed', 'Pending': 'ord-s-open', 'Confirmed': 'ord-s-parts', 'Cancelled': 'ord-s-closed' };
  function poRow(o) {
    var cls = PO_STATUS_CLS[o.status] || 'ord-s-open';
    var wo = o.wo ? SE.allWorkOrders().find(function (w) { return w.id === o.wo; }) : null;
    var itemCount = o.items ? o.items.length : 0;
    return '<tr class="ord-tr" data-go="order" data-po="' + esc(o.po) + '" tabindex="0" aria-label="' + esc(o.po) + '">' +
      '<td class="ord-col-id">' + esc(o.po) + '</td>' +
      '<td class="ord-col-equip"><b>' + (wo ? esc(wo.machine) : '—') + '</b><span class="ord-equip-sub">' + (o.wo ? '#' + esc(o.wo) : '—') + '</span></td>' +
      '<td class="ord-col-issue">' + esc(o.supplier || '—') + '</td>' +
      '<td class="ord-col-who">' + (itemCount ? itemCount + ' item' + (itemCount === 1 ? '' : 's') : '—') + '</td>' +
      '<td class="ord-col-due">' + esc(o.placed || '—') + '</td>' +
      '<td class="ord-col-status"><span class="ord-chip ' + cls + '">' + esc(o.status || 'Pending') + '</span></td>' +
      '<td class="ord-col-pri">' + (o.total ? '$' + o.total.toLocaleString() : '—') + '</td>' +
    '</tr>';
  }
  function renderPoList() {
    var host = el.querySelector('#wo-list');
    var orders = SE.orders().filter(function (o) {
      var matchQ = !q.trim() || [o.po, o.wo || '', o.supplier || ''].join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0;
      return matchQ && matchPoFilter(o);
    });
    if (!orders.length) {
      host.innerHTML = SE.ui.empty({ icon: 'shopping-cart', tone: 'neutral', title: 'No purchase orders', text: 'Purchase orders created from approved work orders appear here.' });
    } else {
      host.innerHTML =
        '<div class="tbl-wrap ord-tbl-wrap"><table class="tbl ord-tbl">' +
          '<thead><tr>' +
            '<th>PO #</th><th>Equipment / WO</th><th>Supplier</th><th>Items</th><th>Placed</th><th>Status</th><th>Total</th>' +
          '</tr></thead>' +
          '<tbody>' + orders.map(poRow).join('') + '</tbody>' +
        '</table></div>';
    }
  }

  function row(w) {
    var ds = W.archived(w) ? 'Archived' : displayStatus(w);
    var priKey = (w.priority || 'Normal').toLowerCase();
    var priLabel = w.priority === 'Normal' || !w.priority ? 'Low' : w.priority === 'Medium' ? 'Med' : w.priority;
    var isLate = K.parse(w.due) && K.parse(w.due) < K.today() && ds !== 'Closed';
    return '<tr class="ord-tr' + (ds === 'Closed' ? ' ord-tr-closed' : '') + '" data-go="work-order" data-id="' + w.id + '" tabindex="0" aria-label="Order ' + w.id + ', ' + esc(w.machine) + '">' +
      '<td class="ord-col-id">#' + SE.hl(w.id, q) + '</td>' +
      '<td class="ord-col-equip"><b>' + SE.hl(w.machine, q) + '</b><span class="ord-equip-sub">' + esc(w.equip) + '</span></td>' +
      '<td class="ord-col-issue">' + SE.hl(w.issue, q) + '</td>' +
      '<td class="ord-col-who">' + esc(shortName(w.assignee)) + '</td>' +
      '<td class="ord-col-due' + (isLate ? ' ord-date-late' : '') + '">' + esc(w.due || '—') + '</td>' +
      '<td class="ord-col-status"><span class="ord-chip ' + (STATUS_CLS[ds] || 'ord-s-open') + '">' + esc(ds) + '</span></td>' +
      '<td class="ord-col-pri"><span class="ord-pri p-' + priKey + '">● ' + esc(priLabel) + '</span></td>' +
    '</tr>';
  }

  function renderList() {
    if (view === 'po') { renderPoList(); return; }
    var list = base().filter(matchFilter);
    var host = el.querySelector('#wo-list');
    var hasFilter = q || filter !== 'All' || dateMode !== 'any';
    if (!list.length) {
      host.innerHTML = SE.ui.empty({ icon: 'clipboard-list', tone: 'neutral',
        title: 'No orders match' + (q.trim() ? ' "' + q.trim() + '"' : ''),
        text: 'Nothing at ' + SE.location().name + ' matches.',
        action: hasFilter ? '<button type="button" class="btn btn-secondary" data-clear>Clear search and filter</button>' : '' });
    } else {
      host.innerHTML =
        '<div class="tbl-wrap ord-tbl-wrap"><table class="tbl ord-tbl">' +
          '<thead><tr>' +
            '<th>Order</th><th>Equipment</th><th>Issue</th><th>Assignee</th><th>Due</th><th>Status</th><th>Priority</th>' +
          '</tr></thead>' +
          '<tbody>' + list.map(row).join('') + '</tbody>' +
        '</table></div>';
    }
  }
  function render() {
    var vt = el.querySelector('#wo-view-toggle');
    if (vt) {
      vt.querySelectorAll('[data-view]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.view === view);
      });
    }
    var panel = el.querySelector('#wo-date-panel');
    if (view === 'wo') {
      el.querySelector('#wo-seg').innerHTML =
        SE.ui.seg('Filter', FILTERS.map(function (f) { return [f, f, count(f)]; }), filter);
      el.querySelector('#wo-count').textContent = count(filter) + ' order' + (count(filter) === 1 ? '' : 's');
      el.querySelector('#wo-date-sel').value = dateMode;
      if (panel) panel.hidden = dateMode !== 'custom';
    } else {
      el.querySelector('#wo-seg').innerHTML =
        SE.ui.seg('Filter', PO_FILTERS.map(function (f) { return [f, f, countPo(f)]; }), poFilter);
      var np = countPo(poFilter);
      el.querySelector('#wo-count').textContent = np + ' PO' + (np === 1 ? '' : 's');
      el.querySelector('#wo-date-sel').value = poDateMode;
      if (panel) panel.hidden = poDateMode !== 'custom';
    }
    renderList();
    el.querySelector('#subline').innerHTML = sub();
    var o = {};
    if (view !== 'wo') o.view = view;
    if (filter !== 'All') o.filter = filter;
    if (q.trim()) o.q = q.trim();
    history.replaceState(null, '', '#/work-orders' + (Object.keys(o).length ? '?' + new URLSearchParams(o) : ''));
  }

  var body =
    '<section class="sec ord-sec">' +
      '<div class="ord-bar">' +
        '<div class="ord-view-toggle" id="wo-view-toggle" role="group" aria-label="View by">' +
          '<button type="button" class="ord-vbtn" data-view="wo">Work Orders</button>' +
          '<button type="button" class="ord-vbtn" data-view="po">Purchase Orders</button>' +
        '</div>' +
        '<button class="btn btn-primary ord-new-btn" type="button" data-new>' + icon('plus-small') + 'New Order</button>' +
      '</div>' +
      '<div class="ord-filters">' +
        '<div id="wo-seg" class="ord-pills"></div>' +
        '<div class="ord-extras">' +
          '<div class="control ord-sel-wrap"><select class="ord-ctl" id="wo-date-sel" aria-label="Filter by date">' +
            '<option value="any">Any date</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range…</option>' +
          '</select>' + icon('angle-small-down') + '</div>' +
          '<form class="ord-ctl ord-search" role="search" data-wo-form><label class="sr-only" for="wo-q">Search orders</label>' + icon('search') +
            '<input id="wo-q" type="search" value="' + esc(q) + '" placeholder="Search orders…" autocomplete="off"></form>' +
        '</div>' +
        '<span class="ord-count-label" id="wo-count"></span>' +
      '</div>' +
      '<div class="ord-date-panel" id="wo-date-panel" hidden>' +
        '<label class="ord-date-lbl" for="wo-df">From</label>' +
        '<input class="ord-ctl ord-date-in" id="wo-df" type="date" aria-label="Date range start">' +
        '<label class="ord-date-lbl" for="wo-dt">To</label>' +
        '<input class="ord-ctl ord-date-in" id="wo-dt" type="date" aria-label="Date range end">' +
      '</div>' +
      '<div id="wo-list"></div>' +
    '</section>';

  var s = SE.shell(el, {
    nav: 'work-orders', title: 'Orders', sub: sub(), crumbs: [['Home', 'home']],
    body: body,
    onLocation: function () { render(); },
  });
  render();

  var qIn = el.querySelector('#wo-q');
  qIn.addEventListener('input', function () { q = qIn.value; render(); });
  el.querySelector('[data-wo-form]').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); });

  el.querySelector('#wo-date-sel').addEventListener('change', function (e) {
    if (view === 'wo') {
      dateMode = e.target.value;
      if (dateMode !== 'custom') { dateFrom = ''; dateTo = ''; el.querySelector('#wo-df').value = ''; el.querySelector('#wo-dt').value = ''; }
    } else {
      poDateMode = e.target.value;
      if (poDateMode !== 'custom') { poDateFrom = ''; poDateTo = ''; el.querySelector('#wo-df').value = ''; el.querySelector('#wo-dt').value = ''; }
    }
    render();
  });
  el.querySelector('#wo-df').addEventListener('change', function (e) {
    if (view === 'wo') dateFrom = e.target.value; else poDateFrom = e.target.value; render();
  });
  el.querySelector('#wo-dt').addEventListener('change', function (e) {
    if (view === 'wo') dateTo = e.target.value; else poDateTo = e.target.value; render();
  });

  var open = null;
  function openNew(showErrors) {
    open = W.newDialog({ showErrors: showErrors,
      onClose: function () { if (/new=/.test(location.hash)) history.replaceState(null, '', '#/work-orders'); },
      onCreate: function (w) { SE.go('work-order', { params: { id: w.id } }); } });
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (t && t.hasAttribute('data-new')) { openNew(false); return; }
    if (t && t.dataset.view) { view = t.dataset.view; q = ''; el.querySelector('#wo-q').value = ''; el.querySelector('#wo-date-sel').value = view === 'wo' ? dateMode : poDateMode; render(); return; }
    if (t && t.hasAttribute('data-clear')) {
      q = ''; el.querySelector('#wo-q').value = '';
      if (view === 'wo') { filter = 'All'; dateMode = 'any'; dateFrom = ''; dateTo = ''; }
      else { poFilter = 'All'; poDateMode = 'any'; poDateFrom = ''; poDateTo = ''; }
      el.querySelector('#wo-date-sel').value = 'any'; render(); return;
    }
    if (t && t.dataset.seg) { if (view === 'wo') filter = t.dataset.seg; else poFilter = t.dataset.seg; render(); return; }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('tr[data-go]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SE.goFrom(r); }
  });
  if (p.new) openNew(p.new === 'error');
  return function () { if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
