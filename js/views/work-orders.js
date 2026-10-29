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
    Object.keys(D.machines).forEach(function (k) { D.machines[k].units.forEach(function (x) { u.push({ equip: x.equip, serial: x.serial, location: x.location, machine: D.machines[k].name }); }); });
    return u;
  };
  W.unit = function (equip) { return W.units().find(function (u) { return u.equip === equip; }); };
  // work orders at the chosen location, including ones created in this session (SE.workOrders reads the seed only)
  W.archived = function (w) { return !!(SE.state.archived || {})[w.id]; };
  W.list = function (archive) {
    var all = SE.allWorkOrders().filter(function (w) { return W.archived(w) === !!archive; });
    if (SE.state.location !== 'all') {
      var name = SE.location().name;
      all = all.filter(function (w) { var u = W.unit(w.equip); return u && u.location === name; });
    }
    return all.filter(function (w) { return !SE.state.cancelled[w.id]; }).concat(all.filter(function (w) { return SE.state.cancelled[w.id]; }));
  };
  W.FILTERS = ['All', 'Open', 'In progress', 'Awaiting approval', 'Done'];
  W.priority = function (p) { return '<span class="wo-pri p-' + p.toLowerCase() + '">' + SE.esc(p) + '</span>'; };

  // New work order dialog; onCreate(w) after it is saved
  W.newDialog = function (o) {
    o = o || {};
    var D = SE.data, esc = SE.esc;
    var dlg = SE.ui.dialog({
      title: 'New order', wide: true,
      body:
        '<form id="wo-form" class="wo-form" novalidate autocomplete="off">' +
          '<div class="form-row span-2" id="row-asset"><label for="f-asset">Asset</label>' +
            '<div class="control"><select id="f-asset" aria-describedby="err-asset"><option value="">Choose an asset</option>' + W.units().map(function (u) {
              return '<option value="' + u.equip + '">' + esc(u.equip + ' · ' + u.machine + ' · ' + u.location) + '</option>';
            }).join('') + '</select>' + SE.icon('angle-small-down') + '</div>' +
            '<p class="form-err" id="err-asset" hidden>Choose the asset this work is for.</p></div>' +
          '<div class="form-row span-2" id="row-issue"><label for="f-issue">Issue</label>' +
            '<div class="control"><input id="f-issue" type="text" placeholder="For example: platform drifts down under load" aria-describedby="err-issue"></div>' +
            '<p class="form-err" id="err-issue" hidden>Describe the issue.</p></div>' +
          '<div class="form-row"><span class="lbl" id="lbl-pri">Priority</span>' +
            '<div class="seg wo-pri-seg" role="radiogroup" aria-labelledby="lbl-pri">' + ['Normal', 'Medium', 'High'].map(function (x, i) {
              return '<button type="button" role="radio" aria-checked="' + !i + '" aria-selected="' + !i + '" data-pri="' + x + '">' + x + '</button>';
            }).join('') + '</div></div>' +
          '<div class="form-row"><label for="f-asg">Assignee</label>' +
            '<div class="control"><select id="f-asg">' + D.techs.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>' + SE.icon('angle-small-down') + '</div></div>' +
          '<div class="form-row span-2"><label for="f-notes">Notes (optional)</label>' +
            '<div class="control area"><textarea id="f-notes" rows="3" placeholder="Fault codes, what the operator saw"></textarea></div></div>' +
        '</form>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="submit" form="wo-form" class="btn btn-primary">Create work order</button>',
      onClose: o.onClose,
    });
    var d = dlg.el, pri = 'Normal';
    function validate() {
      var okA = !!d.querySelector('#f-asset').value, okI = !!d.querySelector('#f-issue').value.trim();
      d.querySelector('#row-asset').classList.toggle('invalid', !okA); d.querySelector('#err-asset').hidden = okA;
      d.querySelector('#row-issue').classList.toggle('invalid', !okI); d.querySelector('#err-issue').hidden = okI;
      d.querySelector('#f-issue').setAttribute('aria-invalid', String(!okI));
      return okA && okI;
    }
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pri]');
      if (!t) return;
      pri = t.dataset.pri;
      d.querySelectorAll('[data-pri]').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); b.setAttribute('aria-selected', String(b === t)); });
    });
    d.addEventListener('input', function (e) { if (e.target.id === 'f-issue' && e.target.value.trim()) { d.querySelector('#row-issue').classList.remove('invalid'); d.querySelector('#err-issue').hidden = true; } });
    d.addEventListener('change', function (e) { if (e.target.id === 'f-asset' && e.target.value) { d.querySelector('#row-asset').classList.remove('invalid'); d.querySelector('#err-asset').hidden = true; } });
    function addDays(n) { var x = SE.tx.today(); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    d.querySelector('#wo-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) { var f = d.querySelector('.invalid select, .invalid input'); if (f) f.focus(); return; }
      var u = W.unit(d.querySelector('#f-asset').value), asg = d.querySelector('#f-asg').value;
      var prior = D.workOrders.find(function (w) { return w.equip === u.equip; });
      var id = String(100120 + SE.state.newWOs.length);
      var w = { id: id, issue: d.querySelector('#f-issue').value.trim(), equip: u.equip, machine: u.machine, status: 'Open', tone: 'danger', updated: 'Just now',
        assignee: asg, due: addDays(pri === 'High' ? 2 : pri === 'Medium' ? 5 : 10), priority: pri, warranty: prior ? prior.warranty : null,
        opened: SE.tx.today().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), kind: 'equipment',
        desc: d.querySelector('#f-notes').value.trim(), log: [['Today', 'Opened by ' + D.user.name + ', assigned to ' + asg]] };
      SE.state.newWOs.unshift(w);
      SE.save();
      dlg.close();
      SE.toast('Work order #' + id + ' created', 'check');
      if (o.onCreate) o.onCreate(w);
    });
    if (o.showErrors) validate();
    return dlg;
  };
})();

SE.titles['work-orders'] = 'Orders';
SE.views['work-orders'] = function (el, p) {
  var esc = SE.esc, icon = SE.icon, W = SE.work, K = SE.desk;
  var FILTERS = ['All', 'Active', 'Pending', 'Closed'];
  var filter = FILTERS.indexOf(p.filter) >= 0 ? p.filter : 'All';
  var tab = p.tab === 'archive' && !SE.twin ? 'archive' : 'active', q = p.q || '';

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
  var STATUS_CLS = { 'Parts ordered': 'ord-s-parts', 'Active': 'ord-s-active', 'Open': 'ord-s-open', 'Pending': 'ord-s-pending', 'Closed': 'ord-s-closed' };

  function matchFilter(w) {
    if (filter === 'All') return true;
    var ds = displayStatus(w);
    if (filter === 'Active') return ds === 'Active' || ds === 'Open';
    if (filter === 'Pending') return ds === 'Pending' || ds === 'Parts ordered';
    if (filter === 'Closed') return ds === 'Closed';
    return true;
  }
  function hay(w) { return [w.id, w.machine, w.equip, w.issue, w.assignee || ''].join(' '); }
  function base() { return W.list(tab === 'archive').filter(function (w) { return !q.trim() || SE.hitTokens(hay(w), SE.qTokens(q)); }); }
  function count(f) {
    var list = base();
    if (f === 'All') return list.length;
    return list.filter(function (w) {
      var ds = displayStatus(w);
      if (f === 'Active') return ds === 'Active' || ds === 'Open';
      if (f === 'Pending') return ds === 'Pending' || ds === 'Parts ordered';
      if (f === 'Closed') return ds === 'Closed';
      return false;
    }).length;
  }
  function sub() { var n = W.list().length, a = W.list(true).length; return esc(SE.location().name) + ' \xb7 ' + n + ' order' + (n === 1 ? '' : 's') + (a ? ' \xb7 ' + a + ' archived' : ''); }
  function shortName(s) { if (!s) return '—'; var p = s.split(' '); return p.length > 1 ? p[0] + ' ' + p[1].charAt(0) + '.' : s; }

  function row(w) {
    var ds = displayStatus(w);
    var priKey = (w.priority || 'Normal').toLowerCase();
    var priLabel = w.priority === 'Normal' || !w.priority ? 'Low' : w.priority === 'Medium' ? 'Med' : w.priority;
    var isLate = K.parse(w.due) && K.parse(w.due) < K.today() && ds !== 'Closed';
    return '<li class="ord-row" data-go="work-order" data-id="' + w.id + '" tabindex="0" aria-label="Order ' + w.id + ', ' + esc(w.machine) + '">' +
      '<span class="ord-thumb" aria-hidden="true">' + icon('tractor') + '</span>' +
      '<div class="ord-body">' +
        '<div class="ord-head">' +
          '<b class="ord-machine">' + SE.hl(w.machine, q) + ' \xb7 ' + esc(w.equip) + '</b>' +
          '<span class="chip ord-kind-chip">' + esc(w.kind === 'pm' ? 'PM' : 'Repair') + '</span>' +
        '</div>' +
        '<div class="ord-meta">' +
          '<span class="ord-num">#' + SE.hl(w.id, q) + '</span>' +
          '<span class="ord-sep" aria-hidden="true">\xb7</span>' +
          '<span class="ord-issue">' + SE.hl(w.issue, q) + '</span>' +
          (w.assignee ? '<span class="ord-sep" aria-hidden="true">\xb7</span><span class="ord-who">' + esc(shortName(w.assignee)) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="ord-right">' +
        '<span class="ord-date' + (isLate ? ' ord-date-late' : '') + '">' + esc(w.due || '—') + '</span>' +
        '<span class="ord-chip ' + (STATUS_CLS[ds] || 'ord-s-open') + '">' + esc(ds) + '</span>' +
        '<span class="ord-pri p-' + priKey + '">● ' + esc(priLabel) + '</span>' +
      '</div>' +
      icon('angle-small-right') +
    '</li>';
  }

  function renderList() {
    var list = base().filter(matchFilter);
    var host = el.querySelector('#wo-list');
    if (!list.length) {
      host.innerHTML = SE.ui.empty({ icon: 'clipboard-list', tone: 'neutral',
        title: tab === 'archive' ? 'Nothing archived' : 'No orders match' + (q.trim() ? ' “' + q.trim() + '”' : ''),
        text: tab === 'archive' ? 'Archived orders from their detail page appear here.' : 'Nothing at ' + SE.location().name + ' matches.',
        action: (q || filter !== 'All') ? '<button type="button" class="btn btn-secondary" data-clear>Clear search and filter</button>' : '' });
    } else {
      host.innerHTML = '<ul class="ord-list">' + list.map(row).join('') + '</ul>';
    }
  }
  function render() {
    el.querySelector('#wo-tabs').innerHTML = SE.twin ? '' :
      SE.ui.seg('Orders or archive', [['active', 'Orders', W.list().length], ['archive', 'Archive', W.list(true).length]], tab).replace(/data-seg=/g, 'data-tab=');
    el.querySelector('#wo-seg').innerHTML = tab === 'archive' ? '' :
      SE.ui.seg('Filter', FILTERS.map(function (f) { return [f, f, count(f)]; }), filter);
    el.querySelector('#wo-count').textContent = count(filter) + ' order' + (count(filter) === 1 ? '' : 's');
    renderList();
    el.querySelector('#subline').innerHTML = sub();
    var o = {};
    if (tab !== 'active') o.tab = tab;
    if (filter !== 'All') o.filter = filter;
    if (q.trim()) o.q = q.trim();
    history.replaceState(null, '', '#/work-orders' + (Object.keys(o).length ? '?' + new URLSearchParams(o) : ''));
  }

  var body =
    '<section class="sec ord-sec">' +
      '<div class="ord-bar">' +
        '<div id="wo-tabs"></div>' +
        '<button class="btn btn-primary ord-new-btn" type="button" data-new>' + icon('plus-small') + 'New Order</button>' +
      '</div>' +
      '<div class="ord-filters">' +
        '<div id="wo-seg" class="ord-pills"></div>' +
        '<div class="ord-extras">' +
          '<div class="control ord-sel-wrap"><select class="ord-sel" aria-label="Filter by supplier"><option>All suppliers</option>' +
            SE.data.suppliers.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') +
          '</select>' + icon('angle-small-down') + '</div>' +
          '<div class="control ord-sel-wrap"><select class="ord-sel" aria-label="Filter by date"><option>Any date</option><option>This week</option><option>This month</option></select>' + icon('angle-small-down') + '</div>' +
          '<form class="search ord-search" role="search" data-wo-form><label class="sr-only" for="wo-q">Search orders</label>' + icon('search') +
            '<input id="wo-q" type="search" value="' + esc(q) + '" placeholder="Search…" autocomplete="off"></form>' +
        '</div>' +
        '<span class="ord-count-label" id="wo-count"></span>' +
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

  var open = null;
  function openNew(showErrors) {
    open = W.newDialog({ showErrors: showErrors,
      onClose: function () { if (/new=/.test(location.hash)) history.replaceState(null, '', '#/work-orders'); },
      onCreate: function (w) { SE.go('work-order', { params: { id: w.id } }); } });
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (t && t.hasAttribute('data-new')) { openNew(false); return; }
    if (t && t.dataset.tab) { tab = t.dataset.tab; render(); return; }
    if (t && t.hasAttribute('data-clear')) { q = ''; el.querySelector('#wo-q').value = ''; filter = 'All'; render(); return; }
    if (t && t.dataset.seg) { filter = t.dataset.seg; render(); return; }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('li[data-go]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SE.goFrom(r); }
  });
  if (p.new) openNew(p.new === 'error');
  return function () { if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
