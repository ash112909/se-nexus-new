/* Approvals (B5, legacy web 44 to 46). Pending / Approved / Returned with counts. Pending requests are
   approval cards: Review opens an order-detail-style dialog with Approve / Return actions. Approve signs
   off in place and places the PO. No pending requests: "All caught up". Approved and Returned rows also
   open the same dialog read-only.
   web-full desk (W5): each request says why it needs Sarah (a.why); amounts follow her line edits.
   State: #/approvals?filter=Pending|Approved|Returned */
SE.titles.approvals = 'Approvals';
SE.views.approvals = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, W = SE.work;
  var TABS = ['Pending', 'Approved', 'Returned'];
  var busy = {};
  var filter = TABS.indexOf(p.filter) >= 0 ? p.filter : 'Pending';
  var SPIN = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

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
      '<div class="ap-btns"><button type="button" class="btn btn-secondary" data-review="' + a.order + '">Review</button><button type="button" class="btn btn-primary" data-approve="' + a.order + '">Approve</button></div></article>';
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
    }), { cls: 'ap-tbl', rowAttrs: function (i) { return 'data-review="' + l[i].order + '" tabindex="0"'; } });
  }
  function render() {
    el.querySelector('#ap-seg').innerHTML = SE.ui.seg('Approval status', TABS.map(function (t) { return [t, t, list(t).length]; }), filter);
    el.querySelector('#ap-body').innerHTML = body();
    el.querySelector('#subline').textContent = sub();
  }
  var s = SE.shell(el, { nav: 'approvals', title: 'Approvals', sub: esc(sub()), crumbs: [['Home', 'home']],
    body: '<section class="sec"><div id="ap-seg"></div><div id="ap-body"></div></section>' });
  render();

  // ---- review dialog ---------------------------------------------------
  var openDlg = null;
  function openReviewDialog(orderId) {
    var a = SE.approval(orderId);
    if (!a) return;
    var K = SE.desk;
    var w = SE.wo(a.wo) || {}, unit = W.unit(w.equip) || {}, ship = SE.loc(a.shipTo);
    var REASONS = ['Wrong part', 'Quantity too high', 'Use stock on shelf', 'Other'];
    var dlgBusy = false, justApproved = false;

    function dlgTotal() { return K.apprTotal(a); }

    function dlgLines(st) {
      var items = K.apprItems(a), edit = st === 'pending' && !SE.twin;
      return '<div class="tbl-wrap"><table class="tbl ap-lines"><thead><tr>' +
        '<th scope="col">Part</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Line total</th>' +
        (edit ? '<th scope="col"><span class="sr-only">Remove</span></th>' : '') + '</tr></thead><tbody>' +
        items.map(function (it) {
          var pt = SE.part(it.pn), orig = a.items.find(function (x) { return x.pn === it.pn; }), was = orig && orig.qty !== it.qty;
          return '<tr><td><span class="cell-part">' + SE.ui.thumb() +
            '<span><a href="#/part?pn=' + encodeURIComponent(pt.pn) + '"><b>' + esc(pt.name) + '</b></a><span class="sub">' + esc(pt.pn) + ' · ' + esc(pt.stock) + '</span></span></span></td>' +
            '<td class="num">' + (edit ? SE.ui.stepper(it.qty, 'Quantity of ' + pt.name, ' data-ap-pn="' + pt.pn + '"').replace('class="stepper"', 'class="stepper sm"') : it.qty) + (was ? '<span class="sub ap-was">was ' + orig.qty + '</span>' : '') + '</td>' +
            '<td class="num">' + SE.money(pt.price) + '</td><td class="num"><b>' + SE.money(pt.price * it.qty) + '</b></td>' +
            (edit ? '<td><button type="button" class="btn btn-link ap-rm" data-ap-rm="' + pt.pn + '" aria-label="Remove ' + esc(pt.name) + '">' + icon('trash') + '</button></td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    function dlgChanges(st) {
      var log = K.apprLog(a);
      if (SE.twin) return '';
      if (!log.length) return st === 'pending' ? '<p class="ap-edit-hint">' + icon('pencil') + 'You can change quantities or remove lines before you approve. ' + esc(a.by) + ' sees every change on the work order.</p>' : '';
      return '<section class="card ap-changes" aria-labelledby="ap-ch-dlg"><div class="ap-ch-head"><h3 id="ap-ch-dlg">Your changes · ' + log.length + '</h3>' +
        (st === 'pending' ? '<button type="button" class="btn btn-link" data-ap-undo>' + icon('undo') + 'Undo changes</button>' : '') + '</div>' +
        '<ol>' + log.map(function (x) { return '<li>' + esc(x.text) + '</li>'; }).join('') + '</ol></section>';
    }

    function dlgDecision(st) {
      var po = W.poFor(a), next = SE.pendingApprovals()[0];
      if (st === 'pending') {
        return '<div class="ap-decide">' +
          '<button type="button" class="btn btn-primary" data-approve-dlg>' + icon('check') + 'Approve order for ' + esc(a.supplier) + '</button>' +
          '<button type="button" class="btn btn-secondary" data-return-dlg>' + icon('undo') + 'Return to technician</button>' +
        '</div>';
      }
      if (st === 'approved' && justApproved) {
        return '<div class="ap-done" role="status"><span class="ap-done-ico">' + icon('check') + '</span><h3>Approved</h3>' +
          '<p>' + (po ? '<b>' + po.po + '</b> sent to ' + esc(po.supplier) + ' for ' + SE.money(po.total) + '.' : 'Order placed.') + ' ' + esc(a.by) + ' sees it on work order #' + a.wo + '.</p>' +
          '<div class="ap-decide">' + (po ? '<button type="button" class="btn btn-secondary" data-go="order" data-po="' + po.po + '">View order</button>' : '') +
            '<button type="button" class="btn btn-primary" data-next-dlg>' + (next ? 'Next approval' : 'Done') + '</button>' +
          '</div>' +
          '<p class="ap-next">' + (next ? 'Next: Order #' + next.order + ' · ' + esc(next.machine) + ' · ' + SE.money(next.amount) : 'That was the last one. All caught up.') + '</p></div>';
      }
      if (st === 'approved') return SE.ui.banner('<b>Approved.</b> ' + (po ? po.po + ' sent to ' + esc(po.supplier) + '. <a href="#/order?po=' + po.po + '">View order</a>' : 'Order placed.'), 'success', 'check');
      var r = SE.state.returned[a.order];
      return SE.ui.banner('<b>Returned to ' + esc(a.by) + ':</b> ' + esc(r.reason) + (r.comment ? '. ' + esc(r.comment) : ''), 'warning', 'undo');
    }

    function dlgBody() {
      var st = W.apprState(a);
      var statusChip = st === 'pending' ? '<span class="ap-pill">Needs approval</span>' : SE.chip(st === 'approved' ? 'Approved' : 'Returned');
      return SE.recallNote((SE.wo(a.wo) || {}).equip, a.items) +
        '<div class="od-grid">' +
          '<section class="card od-status">' +
            '<div class="od-status-head">' +
              '<div><span class="od-lbl">Status</span>' + statusChip + '</div>' +
              '<p class="muted">' + esc(a.supplier) + ' · Requested ' + esc(a.when) + '</p>' +
            '</div>' +
            (a.note ? '<figure class="ap-note"><span class="ap-av" aria-hidden="true">' + esc(a.by.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</span>' +
              '<div class="ap-msg"><figcaption><b>' + esc(a.by) + '</b> · Technician</figcaption><blockquote class="ap-bubble">' + esc(a.note) + '</blockquote></div></figure>' : '') +
            (a.why ? '<div class="ap-why">' + SE.chip(a.why.label, 'warning') + '<p>' + esc(a.why.text) + '</p></div>' : '') +
          '</section>' +
          '<div class="od-side">' +
            '<section class="card"><h2 class="od-h">Request details</h2>' +
              SE.ui.kv([['Requested by', esc(a.by)], ['Needed by', esc(a.needBy)], ['Ship to', esc(ship ? ship.name : a.shipTo) + (ship ? '<span class="sub">' + esc(ship.address) + '</span>' : '')]]) +
            '</section>' +
            '<section class="card"><h2 class="od-h">Work order</h2>' +
              SE.ui.kv([['Number', '<a href="#/work-order?id=' + a.wo + '">#' + a.wo + '</a>'], ['Machine', esc(a.machine)], ['Asset', esc(w.equip || 'Unknown') + (unit.serial ? '<span class="sub">' + esc(unit.serial) + '</span>' : '')]]) +
            '</section>' +
            '<section class="card"><div id="ap-dlg-decision">' + dlgDecision(st) + '</div></section>' +
          '</div>' +
        '</div>' +
        SE.ui.sec('Line items', '<span class="muted">' + K.apprItems(a).length + ' lines · ' + SE.money(dlgTotal()) + '</span>',
          dlgLines(st) + dlgChanges(st) +
          '<dl class="kv ap-totals card"><div><dt>Subtotal</dt><dd>' + SE.money(dlgTotal()) + '</dd></div><div><dt>Shipping</dt><dd>Per supplier quote</dd></div><div class="grand"><dt>Total</dt><dd>' + SE.money(dlgTotal()) + (dlgTotal() !== a.amount ? '<span class="sub">Requested ' + SE.money(a.amount) + '</span>' : '') + '</dd></div></dl>',
          'h-lines');
    }

    function dlgRender() {
      openDlg.el.querySelector('.dlg-body').innerHTML = dlgBody();
    }

    openDlg = SE.ui.dialog({
      title: 'Order #' + a.order,
      wide: true,
      body: dlgBody(),
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Close</button>',
    });

    // qty steppers and remove
    openDlg.el.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || t.disabled || dlgBusy || W.apprState(a) !== 'pending') return;
      var host = t.closest('[data-ap-pn]');
      if (t.dataset.step && host) {
        var it = K.apprItems(a).find(function (x) { return x.pn === host.dataset.apPn; });
        K.apprChange(a, it.pn, Math.max(0, it.qty + +t.dataset.step));
        dlgRender();
        var again = openDlg.el.querySelector('[data-ap-pn="' + it.pn + '"] [data-step="' + t.dataset.step + '"]'); if (again && !SE.capture) again.focus();
        return;
      }
      if (t.dataset.apRm) {
        if (K.apprItems(a).length === 1) { SE.toast('Return it to the technician instead of removing the last line', 'undo'); return; }
        K.apprChange(a, t.dataset.apRm, 0); dlgRender(); SE.toast('Removed ' + t.dataset.apRm, 'trash'); return;
      }
      if (t.hasAttribute('data-ap-undo')) { K.apprReset(a); dlgRender(); SE.toast('Changes undone', 'undo'); return; }
      if (t.hasAttribute('data-approve-dlg')) { approveDlg(t); return; }
      if (t.hasAttribute('data-return-dlg')) { openReturnDlg(); return; }
      if (t.hasAttribute('data-next-dlg')) {
        openDlg.close();
        var next = SE.pendingApprovals()[0];
        if (next) { openReviewDialog(next.order); } else { render(); }
        return;
      }
    });

    function approveDlg(btn) {
      if (dlgBusy || W.apprState(a) !== 'pending') return;
      dlgBusy = true; btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = SPIN + 'Approving';
      var retBtn = openDlg.el.querySelector('[data-return-dlg]'); if (retBtn) retBtn.disabled = true;
      setTimeout(function () {
        if (W.apprState(a) !== 'pending') { dlgBusy = false; return; }
        try {
          var log = K.apprLog(a);
          K.place(K.apprItems(a).map(function (i) { return { id: 'approval-' + a.order + '-' + i.pn, pn: i.pn, qty: i.qty, wo: a.wo, unit: w.equip, serial: unit.serial, shipTo: a.shipTo, backorderAccepted: !!i.backorderAccepted }; }), { shipTo: a.shipTo, needBy: a.needBy, wo: a.wo, from: 'approval', idempotencyKey: 'approval:' + a.order, note: log.length ? 'Approved with changes by ' + D.user.name + ': ' + log.map(function (x) { return x.text; }).join('; ') : '' });
          SE.state.approved[a.order] = true; SE.save(); dlgBusy = false;
          justApproved = true;
          dlgRender();
          s.refresh();
          var d = openDlg.el.querySelector('.ap-done');
          SE.animate(d, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280 });
          if (!SE.capture) { var nb = d && d.querySelector('[data-next-dlg]'); if (nb) nb.focus({ preventScroll: true }); }
        } catch (err) { dlgBusy = false; dlgRender(); SE.toast('Approval needs review: ' + err.message, 'exclamation'); }
      }, SE.reducedMotion ? 0 : 650);
    }

    function openReturnDlg() {
      if (dlgBusy || W.apprState(a) !== 'pending') return;
      var pick = null;
      var retDlg = SE.ui.dialog({
        title: 'Return to technician',
        body: '<p class="muted">' + esc(a.by) + ' gets order #' + a.order + ' back with your reason. No supplier order is sent to ' + esc(a.supplier) + '.</p>' +
          '<div class="form-row" id="row-ret-dlg"><span class="lbl" id="ret-lbl-dlg">Reason</span>' +
            '<div class="ret-reasons" role="radiogroup" aria-labelledby="ret-lbl-dlg" aria-describedby="ret-err-dlg">' + REASONS.map(function (r) {
              return '<button type="button" class="ret-chip" role="radio" aria-checked="false" data-reason="' + esc(r) + '">' + esc(r) + '</button>';
            }).join('') + '</div>' +
            '<p class="form-err" id="ret-err-dlg" hidden>Choose a reason so ' + esc(a.by.split(' ')[0]) + ' knows what to change.</p></div>' +
          '<div class="form-row"><label for="ret-comment-dlg">Comment (optional)</label><div class="control area"><textarea id="ret-comment-dlg" rows="3" placeholder="For example: 2 filters are on the shelf in Austin"></textarea></div></div>',
        foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-send>Return order</button>',
      });
      retDlg.el.addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.reason) {
          pick = t.dataset.reason;
          retDlg.el.querySelectorAll('[data-reason]').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
          retDlg.el.querySelector('#row-ret-dlg').classList.remove('invalid'); retDlg.el.querySelector('#ret-err-dlg').hidden = true;
          return;
        }
        if (t.hasAttribute('data-send')) {
          if (!pick) { retDlg.el.querySelector('#row-ret-dlg').classList.add('invalid'); retDlg.el.querySelector('#ret-err-dlg').hidden = false; retDlg.el.querySelector('[data-reason]').focus(); return; }
          SE.state.returned[a.order] = { reason: pick, comment: retDlg.el.querySelector('#ret-comment-dlg').value.trim() };
          SE.save(); retDlg.close(); dlgRender();
          s.refresh();
          SE.toast('Returned to ' + a.by, 'undo');
        }
      });
    }
  }

  // ---- inline Approve (from card) -------------------------------------
  function approve(btn) {
    var a = SE.approval(btn.dataset.approve), c = btn.closest('.ap-card');
    if (!a || btn.disabled || busy[a.order] || W.apprState(a) !== 'pending') return;
    busy[a.order] = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = SPIN + 'Approving';
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
    var t = e.target.closest('button, tr[data-review]');
    if (!t || t.disabled) return;
    if (t.dataset.review) { openReviewDialog(t.dataset.review); return; }
    if (t.dataset.approve) { approve(t); return; }
    if (t.dataset.seg) {
      filter = t.dataset.seg;
      history.replaceState(null, '', '#/approvals' + (filter === 'Pending' ? '' : '?filter=' + filter));
      render();
    }
  });
  el.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('tr[data-review]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openReviewDialog(r.dataset.review); }
  });
  return function () { if (openDlg && document.contains(openDlg.el)) openDlg.close(); s.cleanup(); };
};
