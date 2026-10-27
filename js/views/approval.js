/* Approval detail (B5, legacy web 44 and 45, mobile 29 to 37). Left: requester note, line items (each opens
   the part) and totals. Right panel: amount, request facts (work order, machine and asset, needed by,
   ship to) and the decision: Approve (places the PO, then a success state with View order and Next
   approval) or Return to technician (dialog, a reason is required). Approved and returned requests are
   read only.
   Supervisor desk (web-full W5): the panel says why the request needs Sarah (over the technician's limit, a
   warranty unit, a cart-only user). While it is pending she can change quantities and remove lines; each
   change is logged ("SKJ-105610 quantity 2 to 1"), the total follows, Undo changes restores the request, and
   Approve places the edited order. The technician sees the changes on the work order.
   State: #/approval?id=100094  #/approval?id=100118&dialog=return  #/approval?id=100094&edit=1 (review link: 2 changes made) */
SE.titles.approval = 'Approval';
SE.views.approval = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, W = SE.work;
  var a = SE.approval(p.id);
  var crumbs = [['Home', 'home'], ['Approvals', 'approvals']];
  if (!a) {
    var s0 = SE.shell(el, { nav: 'approvals', title: 'Approval not found', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'exclamation', tone: 'warning', title: 'Approval not found', text: 'This request may have been withdrawn.', action: '<a class="btn btn-secondary" href="#/approvals">All approvals</a>' }) });
    return s0.cleanup;
  }
  var w = SE.wo(a.wo) || {}, unit = W.unit(w.equip) || {}, ship = SE.loc(a.shipTo);
  var REASONS = ['Wrong part', 'Quantity too high', 'Use stock on shelf', 'Other'];
  var SPIN = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var justApproved = false, busy = false;
  var K = SE.desk;
  // web-twin (SE.twin): the iPhone approves or returns the request as submitted, no line edits
  if (p.edit && !SE.twin && W.apprState(a) === 'pending' && !K.apprEdit(a)) { K.apprChange(a, 'SKJ-105610', 1); K.apprChange(a, 'SKJ-103490', 0); }
  function total() { return K.apprTotal(a); }

  function decision() {
    var st = W.apprState(a), po = W.poFor(a), next = SE.pendingApprovals()[0];
    if (st === 'pending') return '<div class="ap-decide"><button type="button" class="btn btn-primary" data-approve>' + icon('check') + 'Approve order for ' + esc(a.supplier) + '</button>' +
      '<button type="button" class="btn btn-secondary" data-return>' + icon('undo') + 'Return to technician</button></div>';
    if (st === 'approved' && justApproved) return '<div class="ap-done" role="status"><span class="ap-done-ico">' + icon('check') + '</span><h3>Approved</h3>' +
      '<p>' + (po ? '<b>' + po.po + '</b> sent to ' + esc(po.supplier) + ' for ' + SE.money(po.total) + '.' : 'Order placed.') + ' ' + esc(a.by) + ' sees it on work order #' + a.wo + '.</p>' +
      '<div class="ap-decide">' + (po ? '<button type="button" class="btn btn-secondary" data-go="order" data-po="' + po.po + '">View order</button>' : '') +
        '<button type="button" class="btn btn-primary" data-next>' + (next ? 'Next approval' : 'Back to approvals') + '</button></div>' +
      '<p class="ap-next">' + (next ? 'Next: Order #' + next.order + ' · ' + esc(next.machine) + ' · ' + SE.money(next.amount) : 'That was the last one. All caught up.') + '</p></div>';
    if (st === 'approved') return SE.ui.banner('<b>Approved.</b> ' + (po ? po.po + ' sent to ' + esc(po.supplier) + '. <a href="#/order?po=' + po.po + '">View order</a>' : 'Order placed.'), 'success', 'check');
    var r = SE.state.returned[a.order];
    return SE.ui.banner('<b>Returned to ' + esc(a.by) + ':</b> ' + esc(r.reason) + (r.comment ? '. ' + esc(r.comment) : ''), 'warning', 'undo');
  }
  // line items: editable while pending (quantity, remove), read only after
  function lines(st) {
    var items = K.apprItems(a), edit = st === 'pending' && !SE.twin;
    return '<div class="tbl-wrap"><table class="tbl ap-lines"><thead><tr><th scope="col">Part</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Line total</th>' + (edit ? '<th scope="col"><span class="sr-only">Remove</span></th>' : '') + '</tr></thead><tbody>' +
      items.map(function (it) {
        var pt = SE.part(it.pn), orig = a.items.find(function (x) { return x.pn === it.pn; }), was = orig && orig.qty !== it.qty;
        return '<tr><td><span class="cell-part">' + SE.ui.thumb() + '<span><a href="#/part?pn=' + encodeURIComponent(pt.pn) + '"><b>' + esc(pt.name) + '</b></a><span class="sub">' + esc(pt.pn) + ' · ' + esc(pt.stock) + '</span></span></span></td>' +
          '<td class="num">' + (edit ? SE.ui.stepper(it.qty, 'Quantity of ' + pt.name, ' data-ap-pn="' + pt.pn + '"').replace('class="stepper"', 'class="stepper sm"') : it.qty) + (was ? '<span class="sub ap-was">was ' + orig.qty + '</span>' : '') + '</td>' +
          '<td class="num">' + SE.money(pt.price) + '</td><td class="num"><b>' + SE.money(pt.price * it.qty) + '</b></td>' +
          (edit ? '<td><button type="button" class="btn btn-link ap-rm" data-ap-rm="' + pt.pn + '" aria-label="Remove ' + esc(pt.name) + '">' + icon('trash') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function changes(st) {
    var log = K.apprLog(a);
    if (SE.twin) return '';
    if (!log.length) return st === 'pending' ? '<p class="ap-edit-hint">' + icon('pencil') + 'You can change quantities or remove lines before you approve. ' + esc(a.by) + ' sees every change on the work order.</p>' : '';
    return '<section class="card ap-changes" aria-labelledby="ap-ch"><div class="ap-ch-head"><h3 id="ap-ch">Your changes · ' + log.length + '</h3>' + (st === 'pending' ? '<button type="button" class="btn btn-link" data-ap-undo>' + icon('undo') + 'Undo changes</button>' : '') + '</div>' +
      '<ol>' + log.map(function (x) { return '<li>' + esc(x.text) + '</li>'; }).join('') + '</ol></section>';
  }
  function body() {
    var st = W.apprState(a);
    return SE.recallNote((SE.wo(a.wo) || {}).equip, a.items) + '<div class="split ap-split"><div class="ap-main">' +
        (a.note ? '<figure class="ap-note"><span class="ap-av" aria-hidden="true">' + esc(a.by.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</span>' +
          '<div class="ap-msg"><figcaption><b>' + esc(a.by) + '</b> · Technician · ' + esc(a.when) + '</figcaption><blockquote class="ap-bubble">' + esc(a.note) + '</blockquote></div></figure>' : '') +
        SE.ui.sec('Line items', '<span class="muted">' + K.apprItems(a).length + ' lines</span>',
          lines(st) + changes(st) +
          '<dl class="kv ap-totals card"><div><dt>Subtotal</dt><dd>' + SE.money(total()) + '</dd></div><div><dt>Shipping</dt><dd>Per supplier quote</dd></div><div class="grand"><dt>Total</dt><dd>' + SE.money(total()) + (total() !== a.amount ? '<span class="sub">Requested ' + SE.money(a.amount) + '</span>' : '') + '</dd></div></dl>', 'h-lines') +
      '</div>' +
      '<aside class="panel ap-panel" aria-label="Decision"><div class="panel-body">' +
        // 2 parts so a stacked page can read summary, line items, decision (layout review VR03)
        '<div class="ap-sum">' +
        '<div class="ap-top">' + (st === 'pending' ? '<span class="ap-pill">Needs approval</span>' : SE.chip(st === 'approved' ? 'Approved' : 'Returned')) + '<span class="ap-when">' + icon('clock') + esc(a.when) + '</span></div>' +
        '<p class="h-num ap-amount">' + SE.money(total()) + '</p>' +
        (a.why ? '<div class="ap-why">' + SE.chip(a.why.label, 'warning') + '<p>' + esc(a.why.text) + '</p></div>' : '') +
        '<p class="muted ap-by">' + K.apprItems(a).length + ' lines from ' + esc(a.supplier) + ' · Submitted by ' + esc(a.by) + '</p>' +
        '</div><div class="ap-rest">' +
        '<div id="ap-decision">' + decision() + '</div>' +
        SE.ui.kv([['Work order', '<a href="#/work-order?id=' + a.wo + '">#' + a.wo + '</a>'], ['Machine', esc(a.machine)], ['Asset', esc(w.equip || 'Unknown') + (unit.serial ? '<span class="sub">' + esc(unit.serial) + '</span>' : '')],
          ['Needed by', esc(a.needBy)], ['Ship to', esc(ship ? ship.name : a.shipTo) + (ship ? '<span class="sub">' + esc(ship.address) + '</span>' : '')]]) +
      '</div></div></aside></div>';
  }
  var s = SE.shell(el, { nav: 'approvals', title: 'Order #' + a.order, sub: esc(a.machine) + ' · Work order #' + a.wo + ' · Requested by ' + esc(a.by), crumbs: crumbs,
    body: '<div id="ap-body">' + body() + '</div>' });
  function render() { el.querySelector('#ap-body').innerHTML = body(); }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled || busy || W.apprState(a) !== 'pending') return;
    var host = t.closest('[data-ap-pn]');
    if (t.dataset.step && host) {
      var it = K.apprItems(a).find(function (x) { return x.pn === host.dataset.apPn; });
      K.apprChange(a, it.pn, Math.max(0, it.qty + +t.dataset.step));
      render(); var again = el.querySelector('[data-ap-pn="' + it.pn + '"] [data-step="' + t.dataset.step + '"]'); if (again && !SE.capture) again.focus();
      return;
    }
    if (t.dataset.apRm) {
      if (K.apprItems(a).length === 1) { SE.toast('Return it to the technician instead of removing the last line', 'undo'); return; }
      K.apprChange(a, t.dataset.apRm, 0); render(); SE.toast('Removed ' + t.dataset.apRm, 'trash'); return;
    }
    if (t.hasAttribute('data-ap-undo')) { K.apprReset(a); render(); SE.toast('Changes undone', 'undo'); }
  });

  function approve(btn) {
    if (busy || W.apprState(a) !== 'pending') return;
    busy = true; btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = SPIN + 'Approving';
    el.querySelector('[data-return]').disabled = true;
    setTimeout(function () {
      if (W.apprState(a) !== 'pending') { busy = false; return; }
      try {
      var log = K.apprLog(a);
      K.place(K.apprItems(a).map(function (i) { return { id: 'approval-' + a.order + '-' + i.pn, pn: i.pn, qty: i.qty, wo: a.wo, unit: w.equip, serial: unit.serial, shipTo: a.shipTo, backorderAccepted: !!i.backorderAccepted }; }), { shipTo: a.shipTo, needBy: a.needBy, wo: a.wo, from: 'approval', idempotencyKey: 'approval:' + a.order, note: log.length ? 'Approved with changes by ' + D.user.name + ': ' + log.map(function (x) { return x.text; }).join('; ') : '' });
      SE.state.approved[a.order] = true; SE.save(); busy = false;
      justApproved = true;
      render();
      if (SE.refreshShell) SE.refreshShell();
      var d = el.querySelector('.ap-done');
      SE.animate(d, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280 });
      if (!SE.capture) { var b = d.querySelector('[data-next]'); if (b) b.focus({ preventScroll: true }); }
      } catch (err) { busy = false; render(); SE.toast('Approval needs review: ' + err.message, 'exclamation'); }
    }, SE.reducedMotion ? 0 : 650);
  }
  var open = null;
  function openReturn() {
    if (busy || W.apprState(a) !== 'pending') return;
    var pick = null;
    var dlg = open = SE.ui.dialog({
      title: 'Return to technician',
      body: '<p class="muted">' + esc(a.by) + ' gets order #' + a.order + ' back with your reason. No supplier order is sent to ' + esc(a.supplier) + '.</p>' +
        '<div class="form-row" id="row-ret"><span class="lbl" id="ret-lbl">Reason</span>' +
          '<div class="ret-reasons" role="radiogroup" aria-labelledby="ret-lbl" aria-describedby="ret-err">' + REASONS.map(function (r) {
            return '<button type="button" class="ret-chip" role="radio" aria-checked="false" data-reason="' + esc(r) + '">' + esc(r) + '</button>';
          }).join('') + '</div>' +
          '<p class="form-err" id="ret-err" hidden>Choose a reason so ' + esc(a.by.split(' ')[0]) + ' knows what to change.</p></div>' +
        '<div class="form-row"><label for="ret-comment">Comment (optional)</label><div class="control area"><textarea id="ret-comment" rows="3" placeholder="For example: 2 filters are on the shelf in Austin"></textarea></div></div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-send>Return order</button>',
    });
    dlg.el.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.reason) {
        pick = t.dataset.reason;
        dlg.el.querySelectorAll('[data-reason]').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
        dlg.el.querySelector('#row-ret').classList.remove('invalid'); dlg.el.querySelector('#ret-err').hidden = true;
        return;
      }
      if (t.hasAttribute('data-send')) {
        if (!pick) { dlg.el.querySelector('#row-ret').classList.add('invalid'); dlg.el.querySelector('#ret-err').hidden = false; dlg.el.querySelector('[data-reason]').focus(); return; }
        SE.state.returned[a.order] = { reason: pick, comment: dlg.el.querySelector('#ret-comment').value.trim() };
        SE.save();
        dlg.close();
        render();
        if (SE.refreshShell) SE.refreshShell();
        SE.toast('Returned to ' + a.by, 'undo');
      }
    });
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.hasAttribute('data-approve')) { approve(t); return; }
    if (t.hasAttribute('data-return')) { openReturn(); return; }
    if (t.hasAttribute('data-next')) { var n = SE.pendingApprovals()[0]; if (n) SE.go('approval', { params: { id: n.order } }); else SE.go('approvals'); }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('tr[data-go]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SE.goFrom(r); }
  });
  if (p.dialog === 'return' && W.apprState(a) === 'pending') openReturn();
  return function () { if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
