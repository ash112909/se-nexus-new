/* Shopping list, quantity review (DES-51, USE-CASES 1 states 2 and 3), web. The list as authored, in its
   order, each member with the quantity the fleet recommends, editable for this order only. Members that
   went bad since the list was written are caught before the cart:
   - replaced: "Replaced by JLG-4120-329" with Use replacement (swaps it in for this order)
   - priced by unit (serialPricing, no serial in context): "Needs a unit for pricing" with a unit picker
   - backordered: ship time, Keep or Skip
   Every member has an include checkbox; "Add N items to cart" adds every included member in 1 action.
   Edit list (dialog) and Delete (confirmation dialog) are Sarah's, from the page actions.
   1017 (V2 proactive maintenance): Prepare for a unit (as on the iPhone, SE.ops.kit). The unit chosen for this order
   adjusts the template from its service history: a part the history points at and the list lacks is added with
   its reason. The unit also prices serial-priced parts and goes on every cart line.
   State: #/list?id=sl-insp-1930  #/list?id=..&dialog=edit|delete  #/list?id=sl-insp-1930&unit=FL-118 */
SE.titles.list = 'Shopping List';
SE.views.list = function (el, p) {
  var UI = SE.ui, esc = SE.esc, icon = SE.icon, money = SE.money, LX = SE.lx;
  var l = SE.list(p.id);
  if (!l) {
    var s0 = SE.shell(el, { nav: 'lists', title: 'List not found', crumbs: [['Home', 'home'], ['Shopping Lists', 'lists']],
      body: UI.empty({ icon: 'list', tone: 'neutral', title: 'This list was deleted', text: 'Parts already in a cart stay there.', action: '<a class="btn btn-secondary" href="#/lists">All lists</a>' }) });
    return s0.cleanup;
  }
  var lines = l.items.map(function (i) { var bad = LX.issue(SE.part(i.pn)); return { pn: i.pn, use: i.pn, qty: i.qty, on: bad !== 'superseded' && bad !== 'serial' }; });
  var added = 0;
  // V2: the unit this order is prepared for (the search context's unit when it fits the list's model)
  if (p.unit && SE.asset(p.unit)) SE.setContext({ equip: p.unit, wo: null });
  function kitUnit() { var c = SE.ctx(), a = c.equip && SE.asset(c.equip); return a && (!l.machine || a.model === l.machine) ? a : null; }
  function adjust() {
    lines = lines.filter(function (x) { return !x.extra; });
    var u = kitUnit(), k = u ? SE.ops.kit(l, u.equip) : null;
    if (k) k.adds.forEach(function (a) { lines.push({ pn: a.pn, use: a.pn, qty: a.qty, on: true, extra: true, because: SE.ops.because(a.events) }); });
    return k;
  }
  var kit = adjust();
  function prep() {
    if (!l.machine) return '';
    var opts = SE.assetsHere().filter(function (a) { return a.model === l.machine; }).sort(function (a, b) { return SE.ops.history(b.equip).length - SE.ops.history(a.equip).length || (a.equip < b.equip ? -1 : 1); });
    var pick = '<div class="control lv-prep-sel"><label class="sr-only" for="lv-prep">Prepare for a unit</label><select id="lv-prep" data-prep><option value="">' + (kit ? 'Change unit' : 'Choose a unit') + '</option>' +
      opts.map(function (a) { var h = SE.ops.history(a.equip).length; return '<option value="' + esc(a.equip) + '"' + (kit && kit.unit.equip === a.equip ? ' selected' : '') + '>' + esc(a.equip + ' · ' + a.location + ' · ' + (h ? h + ' service event' + (h === 1 ? '' : 's') : 'no service events')) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div>';
    if (!kit) return '<section class="card lv-for"><div class="lv-for-hd">' + icon('marker') + '<div><h2>Prepare for a unit</h2><p class="muted">The unit\'s service history adjusts this list for this order.</p></div>' + pick + '</div></section>';
    return '<section class="card lv-for"><div class="lv-for-hd">' + icon('marker') + '<div><h2>Prepared for ' + esc(kit.unit.equip) + '</h2><p class="muted">' + esc(kit.unit.serial + ' · ' + kit.unit.location) + '</p></div>' + pick + '</div>' +
      (kit.history.length ? '<ul class="lv-hist">' + kit.history.slice(0, 3).map(function (e) { return '<li><time>' + esc(e.date.replace(/, \d{4}$/, '')) + '</time><span>' + esc(e.event) + '</span></li>'; }).join('') + '</ul>' : '<p class="muted lv-hist-none">No service events recorded for this unit.</p>') +
      '<p class="muted lv-for-sum">' + (kit.adds.length ? kit.adds.length + ' part' + (kit.adds.length === 1 ? '' : 's') + ' added from its history, below.' : 'Its history adds nothing to this list.') + '</p></section>';
  }

  function kind(x) { var part = SE.part(x.use), unit = x.unit && SE.asset(x.unit); if (part.serialPricing && unit && unit.model === part.machine) return part.stock === 'Backordered' ? 'backordered' : (x.use !== x.pn ? 'swapped' : null); return x.use !== x.pn ? 'swapped' : LX.issue(SE.part(x.pn)); }
  function blocked(x) { var k = kind(x); return k === 'superseded' || k === 'serial'; }
  function included() { return lines.filter(function (x) { return x.on && !blocked(x); }); }
  function count() { return included().reduce(function (n, x) { return n + x.qty; }, 0); }
  function total() { return included().reduce(function (t, x) { return t + SE.part(x.use).price * x.qty; }, 0); }
  function units(model) {
    var open = {};
    SE.workOrders().forEach(function (w) { if (w.status !== 'Done' && !SE.state.cancelled[w.id]) open[w.equip] = w.id; });
    return SE.assetsHere().filter(function (a) { return a.model === model; })
      .sort(function (a, b) { return (open[b.equip] ? 1 : 0) - (open[a.equip] ? 1 : 0); })
      .map(function (a) { return [a.equip, a.equip + (open[a.equip] ? ' · WO #' + open[a.equip] : '') + ' · ' + a.location]; });
  }
  function issue(x, i) {
    var k = kind(x), part = SE.part(x.pn);
    if (x.extra) return '<div class="lv-issue t-info">' + icon('time-past') + '<div><b>Added for ' + esc(kit.unit.equip) + '</b><p>Its history: ' + esc(x.because) + '.</p></div></div>';
    if (k === 'superseded') {
      var rep = SE.part(part.supersededBy);
      return '<div class="lv-issue t-warning">' + icon('swap') + '<div><b>Replaced by ' + esc(part.supersededBy) + '</b><p>' + esc(rep.name) + ', ' + money(rep.price) + '. The old number cannot be ordered.</p></div>' +
        '<button type="button" class="btn btn-secondary" data-use="' + i + '">Use replacement</button></div>';
    }
    if (k === 'swapped') {
      return '<div class="lv-issue t-success">' + icon('check') + '<div><b>Using ' + esc(x.use) + ' for this order</b><p>Replaces ' + esc(x.pn) + '. The list keeps the old number until you edit it.</p></div>' +
        '<button type="button" class="btn btn-secondary" data-unuse="' + i + '">Undo</button></div>';
    }
    if (k === 'serial') {
      return '<div class="lv-issue t-warning">' + icon('lock') + '<div><b>Needs a unit for pricing</b><p>' + esc(SE.supplierOf(x.pn).name) + ' prices this part by serial number. Choose the unit it is for.</p></div>' +
        '<label class="sr-only" for="lv-unit-' + i + '">Unit for ' + esc(part.name) + '</label><div class="control lv-unit"><select id="lv-unit-' + i + '" data-unit="' + i + '"><option value="">Choose unit</option>' +
        units(part.machine).map(function (u) { return '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>';
    }
    if (k === 'backordered') {
      return '<div class="lv-issue t-warning">' + icon('time-past') + '<div><b>Backordered · ' + esc(part.eta) + '</b><p>Keep it on this order or skip it for now.</p></div>' +
        '<div class="seg lv-choice" role="radiogroup" aria-label="Backordered part"><button type="button" role="radio" aria-checked="' + x.on + '" aria-selected="' + x.on + '" data-keep="' + i + '">Keep</button>' +
        '<button type="button" role="radio" aria-checked="' + !x.on + '" aria-selected="' + !x.on + '" data-skip="' + i + '">Skip</button></div></div>';
    }
    return '';
  }
  function line(x, i) {
    var part = SE.part(x.use), b = blocked(x), on = x.on && !b;
    var step = UI.stepper(x.qty, 'Quantity of ' + part.name, ' data-i="' + i + '"').replace('class="stepper"', 'class="stepper sm"');
    if (x.qty <= 1) step = step.replace('data-step="-1"', 'data-step="-1" disabled');
    return '<li class="lv-line' + (on ? '' : ' skipped') + '" data-line="' + i + '">' +
      '<div class="lv-row">' +
        '<label class="lv-check"><input type="checkbox" data-toggle="' + i + '"' + (on ? ' checked' : '') + (b ? ' disabled' : '') + ' aria-label="Include ' + esc(part.name) + '"><span class="ck">' + icon('check') + '</span></label>' +
        UI.thumb() +
        '<div class="oc-info"><a class="oc-name" href="#/part?pn=' + encodeURIComponent(part.pn) + '">' + esc(part.name) + '</a><span class="oc-pn">' + esc(part.pn) + ' · ' + esc(part.uom) + '</span>' + UI.stock(part) + '</div>' +
        '<div class="oc-unit"><span class="oc-lbl">Unit</span>' + (SE.priceVisible(part) ? money(part.price) : '<span class="muted">No price</span>') + '</div>' +
        '<div class="oc-qty">' + step + '</div>' +
        '<div class="oc-total"><span class="oc-lbl">Total</span><b>' + (on ? money(part.price * x.qty) : b ? 'Not added' : 'Skipped') + '</b></div>' +
      '</div>' + issue(x, i) + '</li>';
  }
  function main() {
    if (!l.items.length) return UI.empty({ icon: 'list', tone: 'neutral', title: 'No parts on this list', text: 'Add parts from the same search you use to order.', action: '<button type="button" class="btn btn-primary" data-edit>Edit list</button>' });
    var n = LX.issues(l);
    return prep() + (n ? UI.banner('<b>' + n + ' part' + (n === 1 ? ' has' : 's have') + ' changed since this list was written.</b> Check ' + (n === 1 ? 'it' : 'them') + ' before ' + (n === 1 ? 'it goes' : 'they go') + ' to the cart.', 'warning', 'exclamation') : '') +
      '<section class="card flush lv-card" aria-labelledby="lv-h"><header class="oc-sup-head"><h2 id="lv-h">Quantity review</h2><span class="muted">' + included().length + ' of ' + lines.length + ' included</span></header>' +
      '<ol class="lv-lines">' + lines.map(line).join('') + '</ol>' +
      '<footer class="oc-sup-foot"><span>Quantities here are for this order only.</span><b>' + money(total()) + '</b></footer></section>';
  }
  function aside() {
    var n = count(), mach = LX.machineName(l.machine), c = SE.ctx();
    return '<h2 class="oc-aside-h">Add to cart</h2>' +
      UI.kv([['Tag', SE.chip(l.tag, 'neutral')], ['Machine', mach ? esc(mach) : 'Any'], ['Updated', esc(l.updatedBy) + '<br><span class="muted">' + esc(l.updatedAt) + '</span>']].concat(kit ? [['Prepared for', esc(kit.unit.equip)]] : c.serial ? [['Priced for', esc(c.equip || c.serial)]] : [])) +
      '<div class="oc-grand"><span>' + (n ? 'Estimated total' : 'Nothing included') + '</span><b>' + money(total()) + '</b></div>' +
      (added && n ? '<p class="lv-added" role="status">' + icon('check') + added + ' item' + (added === 1 ? '' : 's') + ' added to the cart</p><a class="btn btn-primary oc-cta" href="#/cart">View cart' + icon('arrow-small-right') + '</a>'
        : '<button type="button" class="btn btn-primary oc-cta" data-addall' + (n ? '' : ' disabled') + '>' + icon('shopping-cart') + 'Add ' + n + ' item' + (n === 1 ? '' : 's') + ' to cart</button>') +
      '<p class="oc-note">Skipped and unresolved parts stay off the order. Edit the list to change what your fleet recommends.</p>';
  }
  var s = SE.shell(el, {
    nav: 'lists', title: l.name, crumbs: [['Home', 'home'], ['Shopping Lists', 'lists']], sub: esc(l.description || ''),
    actions: '<button type="button" class="btn btn-secondary" data-edit>' + icon('pencil') + 'Edit list</button><button type="button" class="btn btn-danger" data-delete>' + icon('trash') + 'Delete</button>',
    body: '<div class="oc-grid lv-grid"><div class="oc-main" id="lv-main"></div><aside class="card oc-aside" id="lv-aside" aria-label="Add to cart"></aside></div>',
  });
  var mainEl = el.querySelector('#lv-main'), asideEl = el.querySelector('#lv-aside');
  if (!l.items.length) asideEl.hidden = true;
  function render(focusSel) {
    mainEl.innerHTML = main(); asideEl.innerHTML = aside();
    if (focusSel && !SE.capture) { var f = el.querySelector(focusSel); if (f && !f.disabled) f.focus(); }
  }
  function edit() { LX.editor(l, function () { SE.go('list', { params: { id: l.id }, fade: false }); }); }
  function del() { LX.confirmDelete(l, function () { SE.go('lists'); }); }
  function addAll() {
    var n = count();
    if (!n) return;
    included().forEach(function (x) { var u = (x.unit && SE.asset(x.unit)) || SE.cat.unit(null); SE.addToCart(x.use, x.qty, null, { unit: u && u.equip, serial: u && u.serial, backorderAccepted: !!x.backorderAccepted }); });
    added = n;
    s.refresh();
    SE.toast('Added ' + n + ' item' + (n === 1 ? '' : 's') + ' to the cart', 'shopping-cart');
    el.querySelectorAll('[data-qa="cart"]').forEach(function (b) { SE.animate(b, [{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 400 }); });
    render('.lv-aside .btn, #lv-aside .btn');
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    var d = t.dataset, row = t.closest('[data-line]'), i = row ? +row.dataset.line : -1;
    if (t.hasAttribute('data-edit')) { edit(); return; }
    if (t.hasAttribute('data-delete')) { del(); return; }
    if (t.hasAttribute('data-addall')) { addAll(); return; }
    if (d.step) { lines[i].qty = Math.max(1, lines[i].qty + (+d.step)); added = 0; render('[data-i="' + i + '"] [data-step="' + d.step + '"]'); return; }
    if (d.use != null) { var x = lines[+d.use]; x.use = SE.part(x.pn).supersededBy; x.on = true; added = 0; render('[data-unuse="' + d.use + '"]'); SE.toast('Using ' + x.use + ' for this order', 'swap'); return; }
    if (d.unuse != null) { var y = lines[+d.unuse]; y.use = y.pn; y.on = false; added = 0; render('[data-use="' + d.unuse + '"]'); return; }
    if (d.keep != null) { lines[+d.keep].on = true; lines[+d.keep].backorderAccepted = true; added = 0; render('[data-keep="' + d.keep + '"]'); return; }
    if (d.skip != null) { lines[+d.skip].on = false; added = 0; render('[data-skip="' + d.skip + '"]'); }
  });
  el.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-prep') && t.value) {
      SE.setContext({ equip: t.value, wo: null }); kit = adjust(); added = 0;
      lines.forEach(function (x) { var pt = SE.part(x.use); if (LX.issue(pt) === 'serial' && pt.machine === kit.unit.model) { x.unit = kit.unit.equip; x.on = true; } });
      render('#lv-prep');
      SE.toast(kit.adds.length ? 'Adjusted for ' + kit.unit.equip + ': ' + kit.adds.length + ' part' + (kit.adds.length === 1 ? '' : 's') + ' added' : 'Prepared for ' + kit.unit.equip, 'check');
      return;
    }
    if (t.dataset.toggle != null) { lines[+t.dataset.toggle].on = t.checked; added = 0; render('[data-toggle="' + t.dataset.toggle + '"]'); return; }
    if (t.dataset.unit != null && t.value) {
      var was = lines.map(function (x) { return kind(x) === 'serial'; });
      SE.setContext({ equip: t.value }); kit = adjust();
      lines.forEach(function (x, k) { if (was[k] && SE.part(x.use).machine === SE.asset(t.value).model) { x.unit = t.value; x.on = true; } });
      added = 0; render('[data-line="' + t.dataset.unit + '"] input');
      SE.toast('Priced for ' + t.value, 'check');
    }
  });
  render();
  if (p.dialog === 'edit') edit();
  if (p.dialog === 'delete') del();
  return s.cleanup;
};
