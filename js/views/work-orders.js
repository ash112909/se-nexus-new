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
      title: 'New work order', wide: true,
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

SE.titles['work-orders'] = 'Work orders';
SE.views['work-orders'] = function (el, p) {
  var esc = SE.esc, icon = SE.icon, W = SE.work, K = SE.desk;
  var filter = W.FILTERS.indexOf(p.filter) >= 0 ? p.filter : 'All';
  var tab = p.tab === 'archive' && !SE.twin ? 'archive' : 'active', q = p.q || '';
  var PRI = { High: 0, Medium: 1, Normal: 2 };
  // [key, label, sort value]
  var COLS = [['id', 'Work order', function (w) { return +w.id; }], ['machine', 'Machine', function (w) { return w.machine + w.equip; }], ['issue', 'Issue', function (w) { return w.issue.toLowerCase(); }],
    ['status', 'Status', function (w) { return W.status(w); }], ['priority', 'Priority', function (w) { return PRI[w.priority]; }], ['assignee', 'Assignee', function (w) { return w.assignee; }],
    ['due', 'Due', function (w) { var d = K.parse(w.due); return d ? +d : Infinity; }]];
  var sort = COLS.some(function (c) { return c[0] === p.sort; }) ? p.sort : null, dir = p.dir === 'desc' ? 'desc' : 'asc';

  function hay(w) { var u = W.unit(w.equip) || {}; return [w.id, w.machine, w.equip, w.issue, w.assignee, u.location || '', W.status(w), w.priority].join(' '); }
  function base() { return W.list(tab === 'archive').filter(function (w) { return !q.trim() || SE.hitTokens(hay(w), SE.qTokens(q)); }); }
  function count(f) { return base().filter(function (w) { return f === 'All' || W.status(w) === f; }).length; }
  function sub() { var n = W.list().length, a = W.list(true).length; return esc(SE.location().name) + ' · ' + n + ' work order' + (n === 1 ? '' : 's') + (a ? ' · ' + a + ' archived' : ''); }
  function overdue(w) { var d = K.parse(w.due), st = W.status(w); return d && d < K.today() && st !== 'Done' && st !== 'Cancelled'; }
  function table() {
    var list = base().filter(function (w) { return tab === 'archive' || filter === 'All' || W.status(w) === filter; });
    if (sort) { var c = COLS.find(function (x) { return x[0] === sort; }); list = list.slice().sort(function (a, b) { var x = c[2](a), y = c[2](b); return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1); }); }
    if (!list.length) return tab === 'archive' && !q.trim()
      ? SE.ui.empty({ icon: 'clipboard-list', tone: 'neutral', title: 'Nothing archived', text: 'Done and cancelled work orders you archive from their page are kept here, read only.' })
      : SE.ui.empty({ icon: 'clipboard-list', tone: 'neutral', title: 'No work orders match' + (q.trim() ? ' "' + q.trim() + '"' : ''), text: 'Nothing matches at ' + SE.location().name + '.', action: '<button type="button" class="btn btn-secondary" data-clear>Clear search and filter</button>' });
    var head = COLS.map(function (c) {
      var on = sort === c[0];
      return '<th scope="col"' + (on ? ' aria-sort="' + (dir === 'asc' ? 'ascending' : 'descending') + '"' : '') + (c[0] === 'due' ? ' class="nowrap"' : '') + '><button type="button" class="th-sort' + (on ? ' on' : '') + '" data-sort="' + c[0] + '">' + esc(c[1]) +
        '<span class="th-ar" aria-hidden="true">' + (on ? (dir === 'asc' ? '↑' : '↓') : '↕') + '</span></button></th>';
    }).join('');
    return '<div class="tbl-wrap"><table class="tbl wo-tbl"><thead><tr>' + head + '</tr></thead><tbody>' + list.map(function (w) {
      var st = W.status(w), u = W.unit(w.equip) || {};
      return '<tr data-go="work-order" data-id="' + w.id + '" tabindex="0"' + (SE.state.cancelled[w.id] ? ' class="cancelled"' : '') + '>' +
        '<td><b>#' + SE.hl(w.id, q) + '</b></td><td>' + SE.hl(w.machine, q) + '<span class="sub">' + SE.hl(w.equip, q) + ' · ' + SE.hl(u.location || '', q) + '</span></td><td><span class="wo-issue">' + SE.hl(w.issue, q) + '</span></td>' +
        '<td>' + SE.chip(st) + '</td><td>' + W.priority(w.priority) + '</td><td>' + SE.hl(w.assignee, q) + '</td>' +
        '<td class="nowrap' + (overdue(w) ? ' wo-late' : '') + '">' + esc(w.due || 'Not set') + (overdue(w) ? '<span class="sub">Overdue</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function url() {
    var o = {};
    if (tab === 'archive') o.tab = 'archive'; else if (filter !== 'All') o.filter = filter;
    if (q.trim()) o.q = q.trim();
    if (sort) { o.sort = sort; o.dir = dir; }
    return '#/work-orders' + (Object.keys(o).length ? '?' + new URLSearchParams(o) : '');
  }
  function render() {
    // web-twin (SE.twin): no archive, so no tabs
    el.querySelector('#wo-tabs').innerHTML = SE.twin ? '' : SE.ui.seg('Work orders or archive', [['active', 'Work orders', W.list().length], ['archive', 'Archive', W.list(true).length]], tab).replace(/data-seg=/g, 'data-tab=');
    el.querySelector('#wo-seg').innerHTML = tab === 'archive' ? '' : SE.ui.seg('Filter work orders', W.FILTERS.map(function (f) { return [f, f, count(f)]; }), filter);
    el.querySelector('#wo-table').innerHTML = table();
    el.querySelector('#subline').innerHTML = sub();
    history.replaceState(null, '', url());
  }

  var s = SE.shell(el, {
    nav: 'work-orders', title: 'Work orders', sub: sub(), crumbs: [['Home', 'home']],
    actions: '<button type="button" class="btn btn-primary" data-new>' + icon('plus-small') + 'New work order</button>',
    search: '<form class="search mw-find wo-find" role="search" data-wo-form><label class="sr-only" for="wo-q">Search work orders</label>' + icon('search') +
      '<input id="wo-q" type="search" value="' + esc(q) + '" placeholder="Number, machine, asset, issue, assignee" autocomplete="off"></form>',
    body: '<section class="sec wo-sec"><div class="wo-bar"><div id="wo-tabs"></div><div id="wo-seg"></div></div><div id="wo-table"></div></section>',
    onLocation: function () { render(); },
  });
  render();
  var qIn = el.querySelector('#wo-q');
  qIn.addEventListener('input', function () { q = qIn.value; render(); });
  el.querySelector('[data-wo-form]').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); });

  var open = null;
  function openNew(showErrors) {
    open = W.newDialog({ showErrors: showErrors, onClose: function () { if (/new=/.test(location.hash)) history.replaceState(null, '', '#/work-orders'); }, onCreate: function (w) { SE.go('work-order', { params: { id: w.id } }); } });
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-new')) { openNew(false); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); return; }
    if (t.dataset.sort) {
      if (sort === t.dataset.sort) dir = dir === 'asc' ? 'desc' : 'asc'; else { sort = t.dataset.sort; dir = 'asc'; }
      render(); var b = el.querySelector('[data-sort="' + sort + '"]'); if (b && !SE.capture) b.focus(); return;
    }
    if (t.hasAttribute('data-clear')) { q = ''; el.querySelector('#wo-q').value = ''; filter = 'All'; render(); return; }
    if (t.dataset.seg) { filter = t.dataset.seg; render(); }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('tr[data-go]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SE.goFrom(r); }
  });
  if (p.new) openNew(p.new === 'error');
  // a dialog lives on <body>: close it when the route changes (browser Back while it is open)
  return function () { if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
