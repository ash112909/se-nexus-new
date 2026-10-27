/* Approvals (B5, legacy web 44 to 46). Pending / Approved / Returned with counts. Pending requests are
   approval cards (the web form of iOS/ApprovalCard): Review opens the detail, Approve signs off in place
   and places the PO. No pending requests: "All caught up". Approved and Returned are tables whose rows
   open the read-only detail.
   web-full desk (W5): each request says why it needs Sarah (a.why); amounts follow her line edits.
   State: #/approvals?filter=Pending|Approved|Returned */
SE.titles.approvals = 'Approvals';
SE.views.approvals = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, W = SE.work;
  var TABS = ['Pending', 'Approved', 'Returned'];
  var busy = {};
  var filter = TABS.indexOf(p.filter) >= 0 ? p.filter : 'Pending';

  function list(f) {
    return D.approvals.filter(function (a) { var s = W.apprState(a); return f === 'Pending' ? s === 'pending' : f === 'Approved' ? s === 'approved' : s === 'returned'; });
  }
  function sub() {
    var l = list('Pending');
    return l.length ? l.length + ' waiting for your sign-off · ' + SE.money(l.reduce(function (t, a) { return t + SE.desk.apprTotal(a); }, 0)) : 'Nothing waiting for your sign-off';
  }
  function card(a) {
    var w = SE.wo(a.wo) || {};
    return '<article class="ap-card" aria-label="Order #' + a.order + ', needs approval">' +
      '<div class="ap-top"><span class="ap-pill">Needs approval</span><span class="ap-when">' + icon('clock') + esc(a.when) + '</span></div>' +
      '<div class="ap-title"><b>Order #' + a.order + '</b><b>' + SE.money(SE.desk.apprTotal(a)) + '</b></div>' +
      (a.why ? '<p class="ap-why-line">' + SE.chip(a.why.label, 'warning') + '</p>' : '') +
      '<p class="ap-meta">' + esc(a.machine) + ' · ' + esc(w.equip || '') + ', ' + a.lines + ' lines<br>' + esc(a.by) + ' · ' + esc((SE.loc(a.shipTo) || {}).name || '') + ' · Need by ' + esc(a.needBy) + '</p>' +
      '<p class="ap-note-line">' + esc(a.note) + '</p>' +
      '<div class="ap-btns"><button type="button" class="btn btn-secondary" data-go="approval" data-id="' + a.order + '">Review</button><button type="button" class="btn btn-primary" data-approve="' + a.order + '">Approve</button></div></article>';
  }
  function body() {
    var l = list(filter);
    if (filter === 'Pending') {
      if (!l.length) return SE.ui.empty({ icon: 'check', title: 'All caught up', text: 'No orders are waiting for your approval. New requests from your technicians land here.',
        action: list('Approved').length ? '<button type="button" class="btn btn-secondary" data-seg="Approved">See approved orders</button>' : '' });
      return '<div class="ap-grid">' + l.map(card).join('') + '</div>';
    }
    if (!l.length) return SE.ui.empty({ icon: filter === 'Approved' ? 'shopping-cart-check' : 'undo', tone: 'neutral', title: 'Nothing ' + filter.toLowerCase() + ' yet',
      text: filter === 'Approved' ? 'Orders you approve show here with their purchase order.' : 'Orders you send back to a technician show here with your reason.' });
    return SE.ui.table([['Order'], ['Machine'], ['Requested by'], ['Why it needed you'], [filter === 'Approved' ? 'Purchase order' : 'Reason'], ['Status'], ['Amount', 'num']], l.map(function (a) {
      var po = W.poFor(a), r = SE.state.returned[a.order];
      return ['<b>#' + a.order + '</b><span class="sub">WO #' + a.wo + '</span>', esc(a.machine), esc(a.by), a.why ? esc(a.why.label) : '',
        filter === 'Approved' ? (po ? esc(po.po) + '<span class="sub">' + esc(po.supplier) + '</span>' : 'Placed') : esc(r.reason) + (r.comment ? '<span class="sub">' + esc(r.comment) + '</span>' : ''),
        SE.chip(filter), SE.money(SE.desk.apprTotal(a)) + (SE.desk.apprLog(a).length ? '<span class="sub">Edited, requested ' + SE.money(a.amount) + '</span>' : '')];
    }), { cls: 'ap-tbl', rowAttrs: function (i) { return 'data-go="approval" data-id="' + l[i].order + '" tabindex="0"'; } });
  }
  function render() {
    el.querySelector('#ap-seg').innerHTML = SE.ui.seg('Approval status', TABS.map(function (t) { return [t, t, list(t).length]; }), filter);
    el.querySelector('#ap-body').innerHTML = body();
    el.querySelector('#subline').textContent = sub();
  }
  var s = SE.shell(el, { nav: 'approvals', title: 'Approvals', sub: esc(sub()), crumbs: [['Home', 'home']],
    body: '<section class="sec"><div id="ap-seg"></div><div id="ap-body"></div></section>' });
  render();

  function approve(btn) {
    var a = SE.approval(btn.dataset.approve), c = btn.closest('.ap-card');
    if (!a || btn.disabled || busy[a.order] || W.apprState(a) !== 'pending') return;
    busy[a.order] = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Approving';
    c.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    setTimeout(function () {
      if (W.apprState(a) !== 'pending') { delete busy[a.order]; render(); return; }
      try {
      var w = SE.wo(a.wo) || {}, unit = w.equip && SE.asset(w.equip), log = SE.desk.apprLog(a);
      var made = SE.desk.place(SE.desk.apprItems(a).map(function (i) { return { id: 'approval-' + a.order + '-' + i.pn, pn: i.pn, qty: i.qty, wo: a.wo, unit: w.equip, serial: unit && unit.serial, shipTo: a.shipTo, backorderAccepted: !!i.backorderAccepted }; }), { shipTo: a.shipTo, needBy: a.needBy, wo: a.wo, from: 'approval', idempotencyKey: 'approval:' + a.order, note: log.length ? 'Approved with changes by ' + D.user.name + ': ' + log.map(function (x) { return x.text; }).join('; ') : '' });
      SE.state.approved[a.order] = true; delete busy[a.order];
      SE.save();
      s.refresh();
      SE.toast('Approved. ' + made[0].po + ' sent to ' + made[0].supplier, 'check');
      SE.animate(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 220, fill: 'forwards' }).then(render);
      } catch (err) { delete busy[a.order]; render(); SE.toast('Approval needs review: ' + err.message, 'exclamation'); }
    }, SE.reducedMotion ? 0 : 600);
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.approve) { approve(t); return; }
    if (t.dataset.seg) {
      filter = t.dataset.seg;
      history.replaceState(null, '', '#/approvals' + (filter === 'Pending' ? '' : '?filter=' + filter));
      render();
    }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('tr[data-go]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SE.goFrom(r); }
  });
  return s.cleanup;
};
