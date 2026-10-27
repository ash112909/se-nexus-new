/* Checkout (B3, legacy web 23, 24 and 26): 1 page for every purchase order in the cart.
   Ship to (3 branches; the work order's branch when a line carries a WO), Needed by (required, nothing
   chosen at first), PO reference (auto-assigned), notes, summary per supplier. Submit places 1 PO per
   supplier and replaces this page with Placed, so Back does not return to the form.
   Supervisor desk (web-full, js/desk.js):
     W6 needed by  the shipping advice: the most urgent work order in the cart (priority, due date) against what
                   standard and next-day freight can do; "Recommended" marks the option, Use recommended picks it.
                   Pick date is a real date field. A choice that arrives after the work order is due cannot be
                   submitted (the legacy date rule): the field says why and what would work.
     W3 transfers  lines taken from branch shelves (cart, Branch stock) are listed apart: each source branch gets
                   a Branch Transfer order, and Ship to stays on the branch the stock is moving to.
   State: #/checkout   #/checkout?need=standard (a choice made, for review)   #/checkout?need=date&date=2026-10-12 */
SE.titles.checkout = 'Checkout';
SE.views.checkout = function (el, p) {
  p = p || {};
  var draft = p.restore === '1' && SE.state.checkoutDraft;
  if (draft) { p = Object.assign({}, p, { need: draft.need, date: draft.picked }); delete SE.state.checkoutDraft; }
  SE.tx.normalizeCart();
  var K = SE.desk;
  var UI = SE.ui, D = SE.data, esc = SE.esc, icon = SE.icon, money = SE.money;
  var T = K.today(), STD = K.window('standard'), NXT = K.window('next');
  var NEED = [
    ['standard', 'Standard', K.fmt(STD[0]) + ' to ' + K.fmt(STD[1]), 'Standard, ' + K.fmt(STD[0]) + ' to ' + K.fmt(STD[1])],
    ['next', 'Next day', K.fmt(NXT[0]) + ', expedited freight', 'Next day, ' + K.fmt(NXT[0])],
    ['date', 'Pick date', 'A day that suits the work', ''],
  ];
  var adv = null, picked = p.date || '';
  var cart = SE.state.cart, woLine = cart.find(function (l) { return l.wo; });
  var ship = K.destination(cart), busy = false;
  var mixedDest = cart.some(function (l) { return l.shipTo !== ship; });
  var moving = cart.some(function (l) { return K.alloc(l).moved > 0; });
  adv = K.advice(cart);
  var g = [], by = {};
  cart.forEach(function (l) { if (!K.alloc(l).buy) return; var s = SE.supplierOf(l.pn).name, key = [s, l.wo || '', l.shipTo].join('|'); if (!by[key]) { by[key] = { name: s, lines: [] }; g.push(by[key]); } by[key].lines.push(l); });
  var tr = {};
  cart.forEach(function (l) { var f = K.alloc(l).from || {}; Object.keys(f).forEach(function (b) { if (b === l.shipTo || !f[b]) return; var key = [b, l.shipTo, l.wo || ''].join('|'); if (!tr[key]) tr[key] = { from: b, shipTo: l.shipTo, wo: l.wo, items: [] }; tr[key].items.push({ pn: l.pn, qty: f[b] }); }); });
  var trKeys = Object.keys(tr);
  var next = SE.state.nextPO || D.nextPO, pos = g.map(function (s, i) { return 'PO-' + (next + i); });

  function radio(name, val, title, sub, on, ic, extra, dis) {
    return '<label class="ck-opt' + (dis ? ' off' : '') + '"><input type="radio" name="' + name + '" value="' + val + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '>' +
      '<span class="ck-dot" aria-hidden="true"></span>' + (ic ? icon(ic) : '') + '<span class="ck-txt"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small>' + (extra || '') + '</span></label>';
  }
  var backo = K.backordered(cart);
  var body;
  if (!cart.length) {
    body = UI.empty({ icon: 'shopping-cart', tone: 'neutral', title: 'Nothing to check out', text: 'Your cart is empty.', action: '<button class="btn btn-secondary" type="button" data-go="cart">Back to cart</button>' });
  } else if (K.issues().length) {
    body = UI.empty({ icon: 'exclamation', tone: 'warning', title: 'Review your cart before checkout', text: 'Resolve the part, unit, sourcing and backorder decisions before submitting.', action: '<a class="btn btn-primary" href="#/cart">Review cart</a>' });
  } else {
    body = '<form class="oc-grid" id="ck-form" novalidate>' +
      '<div class="oc-main">' +
        '<section class="card ck-sec"><fieldset><legend><h2>Ship to</h2></legend>' +
          (moving ? '<p class="ck-hint">' + icon('marker') + 'Branch stock destinations stay on each cart line. Showing ' + esc(SE.loc(ship).name) + '. Changing destination recalculates picks and transfers before submission.</p>'
            : woLine ? '<p class="ck-hint">' + icon('clipboard-list') + 'Each work order ships to its own branch; review line destinations in the cart</p>' : '') +
          (mixedDest ? '<p class="ck-hint">Multiple destinations: ' + cart.map(function (l) { return esc(l.pn + ' · ' + (l.wo ? 'WO #' + l.wo + ' · ' : '') + SE.loc(l.shipTo).name); }).join('; ') + '. Each line keeps its destination.</p>' : '') +
          '<div class="ck-opts">' + D.locations.map(function (l) { return radio('ship', l.id, l.name, l.address, l.id === ship, 'marker', '', (mixedDest || cart.some(function (x) { return x.wo; })) && l.id !== ship); }).join('') + '</div></fieldset></section>' +
        '<section class="card ck-sec" id="ck-need-sec"><fieldset aria-describedby="ck-need-err"><legend><h2>Needed by <span class="ck-req">Required</span></h2></legend>' +
          '<div class="ck-adv" role="note">' + icon('info') + '<p><b>Recommended: ' + (adv.rec === 'next' ? 'next day' : 'standard') + '.</b> ' + esc(adv.text) +
            (backo.length ? ' ' + esc(backo.map(function (l) { return l.pn; }).join(', ')) + ' ' + (backo.length === 1 ? 'is' : 'are') + ' backordered: no option brings ' + (backo.length === 1 ? 'it' : 'them') + ' sooner.' : '') + '</p>' +
            '<button type="button" class="btn btn-secondary" data-use-rec>Use recommended</button></div>' +
          '<div class="ck-opts ck-need">' + NEED.map(function (n) { return radio('need', n[0], n[1], n[2], p.need === n[0], n[0] === 'date' ? 'calendar' : 'truck-side', n[0] === adv.rec ? ' <span class="ck-rec">Recommended</span>' : ''); }).join('') + '</div>' +
          '<div class="form-row ck-date" id="ck-date-row"' + (p.need === 'date' ? '' : ' hidden') + '><label for="ck-date">Needed by date</label><div class="control"><input type="date" id="ck-date" min="' + K.iso(NXT[0]) + '" value="' + esc(picked) + '" aria-describedby="ck-need-err"></div></div>' +
          '<p class="form-err" id="ck-need-err" role="alert" hidden>Choose when you need the parts.</p></fieldset></section>' +
        (trKeys.length ? '<section class="card ck-sec"><h2>Branch transfers</h2><p class="muted">Each transfer keeps its source, destination and work order. No purchase cost.</p>' +
          UI.kv(trKeys.map(function (b) { return [SE.loc(tr[b].from).name + ' → ' + SE.loc(tr[b].shipTo).name + (tr[b].wo ? ' · WO #' + tr[b].wo : '') + ' · ' + K.miles(tr[b].from, tr[b].shipTo) + ' mi', tr[b].items.map(function (x) { return x.qty + ' x ' + esc(x.pn); }).join(', ')]; })) + '</section>' : '') +
        (cart.some(function (l) { return K.alloc(l).own > 0; }) ? '<section class="card ck-sec"><h2>Shelf picks</h2><p class="muted">Picked from the destination branch shelf. No purchase cost.</p><ul>' + cart.filter(function (l) { return K.alloc(l).own > 0; }).map(function (l) { return '<li>' + K.alloc(l).own + ' × ' + esc(l.pn) + ' · ' + esc(SE.loc(l.shipTo).name) + (l.wo ? ' · WO #' + esc(l.wo) : '') + '</li>'; }).join('') + '</ul></section>' : '') +
        (g.length ? '<section class="card ck-sec"><h2>Purchase order</h2>' + UI.kv([['PO reference', '<span class="ck-po">' + pos.join(', ') + '</span>'], ['Assigned', 'Automatically on submit']]) : '<section class="card ck-sec"><h2>Notes</h2>') +
          '<div class="form-row"><label for="ck-notes">Notes for the supplier (optional)</label><div class="control area"><textarea id="ck-notes" rows="3" placeholder="Dock hours, contact on site">' + esc(draft ? draft.note : '') + '</textarea></div></div></section>' +
      '</div>' +
      '<aside class="card oc-aside" aria-label="Order summary"><h2 class="oc-aside-h">Order summary</h2>' +
        g.map(function (s, i) {
          var sub = s.lines.reduce(function (t, l) { return t + SE.part(l.pn).price * K.alloc(l).buy; }, 0);
          return '<div class="ck-sum"><div class="ck-sum-head"><b>' + esc(s.name) + '</b><span class="muted">' + pos[i] + '</span></div><ul>' +
            s.lines.map(function (l) { var pt = SE.part(l.pn), q = K.alloc(l).buy; return '<li><span>' + esc(pt.name) + '<small>' + esc(pt.pn) + ' · ' + q + ' x ' + money(pt.price) + (q < l.qty ? ' · ' + (l.qty - q) + ' from shelves' : '') + '</small></span><b>' + money(pt.price * q) + '</b></li>'; }).join('') +
            '</ul><div class="ck-sub"><span>Subtotal</span><b>' + money(sub) + '</b></div></div>';
        }).join('') +
        '<div class="oc-grand"><span>Total</span><b>' + money(SE.cartTotal()) + '</b></div>' +
        (trKeys.length ? '<div class="ck-sum"><div class="ck-sum-head"><b>Branch transfers</b><span class="muted">' + trKeys.length + ' order' + (trKeys.length === 1 ? '' : 's') + '</span></div><ul>' + trKeys.map(function (b) {
          return '<li><span>From ' + esc(SE.loc(tr[b].from).name + ' → ' + SE.loc(tr[b].shipTo).name) + '<small>' + tr[b].items.map(function (x) { return x.qty + ' x ' + esc(x.pn); }).join(', ') + '</small></span><b>No charge</b></li>'; }).join('') + '</ul></div>' : '') +
        '<p class="oc-note">' + (g.length > 1 ? 'This creates ' + g.length + ' purchase orders, split by supplier, destination and work order' + (trKeys.length ? ', and ' + trKeys.length + ' branch transfer' + (trKeys.length === 1 ? '' : 's') : '') + '. ' : trKeys.length ? 'This creates ' + g.length + ' purchase order' + (g.length === 1 ? '' : 's') + ' and ' + trKeys.length + ' branch transfer' + (trKeys.length === 1 ? '' : 's') + '. ' : '') + 'Tax and freight are added by the supplier.</p>' +
        '<button class="btn btn-primary oc-cta" type="submit" data-submit>Submit order' + (g.length + trKeys.length > 1 ? 's' : '') + '</button>' +
        '<a class="btn btn-secondary oc-cta" href="#/cart">Back to cart</a>' +
      '</aside></form>';
  }
  var s = SE.shell(el, { nav: 'cart', title: 'Checkout', sub: cart.length ? g.length + ' purchase order' + (g.length === 1 ? '' : 's') + (trKeys.length ? ' · ' + trKeys.length + ' branch transfer' + (trKeys.length === 1 ? '' : 's') : '') + ' · ' + money(SE.cartTotal()) : '', crumbs: [['Home', 'home'], ['Cart', 'cart']], body: body });
  var form = el.querySelector('#ck-form');
  if (form) {
    form.addEventListener('change', function (e) {
      if (e.target.name === 'ship') {
        if (busy || cart.some(function (l) { return l.wo; })) return;
        var selectedNeed = form.querySelector('input[name="need"]:checked');
        SE.state.checkoutDraft = { need: selectedNeed ? selectedNeed.value : '', picked: form.querySelector('#ck-date').value, note: form.querySelector('#ck-notes').value };
        ship = e.target.value; cart.forEach(function (l) { l.shipTo = ship; });
        SE.tx.normalizeCart(); SE.save();
        SE.go('checkout', { params: { restore: '1' }, replace: true, fade: false }); return;
      }
      if (e.target.name === 'need') { el.querySelector('#ck-date-row').hidden = e.target.value !== 'date'; check(false); }
      if (e.target.id === 'ck-date') { picked = e.target.value; check(false); }
    });
    // W6: an option that arrives after the work order is due cannot be submitted
    function check(show) {
      var need = form.querySelector('input[name="need"]:checked'), sec = el.querySelector('#ck-need-sec'), err = el.querySelector('#ck-need-err');
      var msg = !need ? 'Choose when you need the parts.' : need.value === 'date' && !picked ? 'Choose the date you need the parts by.' : K.guard(cart, need.value, picked);
      var shown = msg && (show || (need && msg !== 'Choose the date you need the parts by.'));
      if (shown) { sec.classList.add('invalid'); err.hidden = false; err.textContent = msg; }
      else { sec.classList.remove('invalid'); err.hidden = true; }
      // the date field itself carries the error when the date is what is missing
      var dateBad = !!shown && need && need.value === 'date' && !picked;
      el.querySelector('#ck-date-row').classList.toggle('invalid', dateBad);
      form.querySelector('#ck-date').setAttribute('aria-invalid', String(dateBad));
      return !msg;
    }
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-use-rec]')) return;
      var r = form.querySelector('input[name="need"][value="' + adv.rec + '"]'); r.checked = true;
      el.querySelector('#ck-date-row').hidden = true; check(false); if (!SE.capture) r.focus();
    });
    if (p.need) check(true);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      try { SE.tx.validate(cart); } catch (err) { SE.toast(err.message, 'exclamation'); return; }
      var need = form.querySelector('input[name="need"]:checked');
      if (!check(true)) {
        var sec = el.querySelector('#ck-need-sec');
        sec.scrollIntoView({ block: 'center', behavior: SE.reducedMotion ? 'auto' : 'smooth' });
        if (!SE.capture) (need && need.value === 'date' ? form.querySelector('#ck-date') : need || form.querySelector('input[name="need"]')).focus({ preventScroll: true });
        return;
      }
      busy = true;
      var btn = form.querySelector('[data-submit]');
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linecap="round"/></svg><span>Submitting</span>';
      var label = need.value === 'date' ? K.fmt(K.parse(picked)) : NEED.find(function (n) { return n[0] === need.value; })[3], note = form.querySelector('#ck-notes').value.trim();
      setTimeout(function () {
        try {
        var made = K.place(SE.state.cart.slice(), { shipTo: ship, needBy: label, note: note, from: 'cart', need: need.value, picked: picked, idempotencyKey: 'cart:' + cart.map(function (l) { return l.id; }).join('|') });
        SE.state.cart = []; SE.state.cartAck = {}; SE.save();
        SE.go('placed', { params: { po: made.map(function (o) { return o.po; }).join(',') }, replace: true });
        } catch (err) { busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Submit order'; SE.toast(err.message, 'exclamation'); }
      }, 700);
    });
  }
  return s.cleanup;
};
