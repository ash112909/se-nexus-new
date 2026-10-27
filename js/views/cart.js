/* Cart (B3, legacy web 22). Lines grouped by supplier (1 purchase order each), summary aside with
   Checkout. Sarah has full permissions, so she submits directly. Empty state offers catalog and search.
   Cart actions (legacy mobile 19 tools sheet; web-full): a menu with Save as shopping list (a new list in B10
   with these lines), Share cart (copies a link) and Export as CSV (downloads cart.csv).
   Supervisor desk (web-full, js/desk.js):
     W2 review   "Before checkout": each line that needs a change or a decision, with its 1-click fix: a replaced
                 part (Swap to the replacement), a serial-priced part (choose the unit), a backordered part (use the
                 alternate, take it from a branch shelf, or accept the wait). Checkout waits until it is clear.
     W3 branches a line whose part sits on other branch shelves offers "Branch stock": a dialog with 1 stepper
                 per branch (capped at its shelf, with the distance), "x of y from branches, n to buy"; the line
                 then buys only the rest, and checkout adds 1 Branch Transfer order per source branch.
   State: #/cart (content comes from SE.state.cart)   #/cart?tools=1 (the actions menu open)
          #/cart?fill=review (review link: a cart with a replaced, a serial-priced and a backordered line)
          #/cart?fill=review&stock=JLG-4120-204 (the branch stock dialog open)
   1017 (V4 global branch): Compare sources (SE.ops.sources) costs every shelf transfer against the supplier
   purchase in the destination branch's currency and recommends 1; the summary shows how many items come from
   the fleet's own shelves.   #/cart?fill=monterrey (2 seal kits for FL-117 at Monterrey)   &sources=1 (dialog open) */
SE.titles.cart = 'Cart';
SE.views.cart = function (el, p) {
  if (p && p.fill === 'monterrey') {
    SE.state.location = 'monterrey';
    SE.state.cart = [{ pn: 'JLG-4120-118', qty: 2, wo: null, unit: 'FL-117', shipTo: 'monterrey' }];
    SE.save();
    history.replaceState(null, '', '#/cart' + (p.sources ? '?sources=1' : ''));
  }
  SE.tx.normalizeCart();
  if (p && p.import) {
    var incoming;
    try { incoming = SE.tx.readSnapshot(p.import); }
    catch (err) { SE.toast('Cart snapshot cannot be imported: ' + err.message, 'exclamation'); incoming = null; }
    if (incoming) {
      var importDialog = SE.ui.dialog({ title: 'Import cart snapshot?', body: '<p>This portable snapshot contains ' + incoming.length + ' lines. Import adds them to your local cart for review; it does not submit an order.</p>', foot: '<button class="btn btn-secondary" type="button" data-dlg-close>Cancel</button><button class="btn btn-primary" type="button" data-import-cart>Import for review</button>' });
      importDialog.el.querySelector('[data-import-cart]').addEventListener('click', function () { try { SE.tx.importCart(p.import); importDialog.close(); SE.go('cart', { replace: true }); } catch (err) { SE.toast(err.message, 'exclamation'); } });
    }
  }
  var UI = SE.ui, esc = SE.esc, icon = SE.icon, money = SE.money;
  function groups() {
    var list = [], by = {};
    SE.state.cart.forEach(function (l) { var s = SE.supplierOf(l.pn).name; if (!by[s]) { by[s] = { name: s, lines: [] }; list.push(by[s]); } by[s].lines.push(l); });
    return list;
  }
  function sum(lines) { return lines.reduce(function (t, l) { return t + (unpriced(l) ? 0 : SE.part(l.pn).price * SE.desk.alloc(l).buy); }, 0); }
  // W2: the review panel, 1 row per line that needs a change or a decision
  function review() {
    var list = K.issues();
    if (!list.length) return '';
    var block = list.filter(function (x) { return x.blocking; }).length;
    return '<section class="card rv" aria-labelledby="rv-h"><header class="rv-head"><span class="rv-ico">' + icon('shield-check') + '</span><div><h2 id="rv-h">Before checkout: ' + list.length + ' line' + (list.length === 1 ? '' : 's') + ' to sort out</h2>' +
      '<p class="muted">Checked against the catalog, your units and the branch shelves. ' + (block ? block + ' must change' + (list.length > block ? ', ' + (list.length - block) + ' need' + (list.length - block === 1 ? 's' : '') + ' a decision' : '') : 'Each needs a decision') + '.</p></div></header>' +
      '<ul class="rv-list">' + list.map(function (x) {
        var p = SE.part(x.pn), l = SE.tx.line(x.lineId), acts = '';
        if (x.kind === 'replaced') acts = '<button type="button" class="btn btn-primary" data-swap="' + esc(x.lineId) + '" data-to="' + x.to + '">' + icon('swap') + 'Swap to ' + esc(x.to) + '</button>';
        if (x.kind === 'serial') {
          var m = SE.machine(p.machine);
          acts = '<div class="control rv-unit"><label class="sr-only" for="rv-u-' + esc(x.lineId) + '">Unit for ' + esc(p.name) + '</label><select id="rv-u-' + esc(x.lineId) + '" data-unit="' + esc(x.lineId) + '"><option value="">Choose 1 of ' + m.units.length + ' ' + esc(m.model) + ' units</option>' +
            m.units.map(function (u) { return '<option value="' + esc(u.equip) + '">' + esc(u.equip + ' · ' + u.serial + ' · ' + u.location) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div>';
        }
        if (x.kind === 'backorder') acts = (x.alt ? '<button type="button" class="btn btn-primary" data-swap="' + esc(x.lineId) + '" data-to="' + x.alt + '">' + icon('swap') + 'Use alternate ' + esc(x.alt) + ' · ' + money(SE.part(x.alt).price) + '</button>' : '') +
          (x.near.length ? '<button type="button" class="btn btn-secondary" data-take="' + esc(x.lineId) + '" data-b="' + x.near[0].id + '" data-q="' + Math.min(x.near[0].qty, l.qty) + '">' + icon('marker') + 'Take ' + Math.min(x.near[0].qty, l.qty) + ' from ' + esc(x.near[0].name) + '</button>' : '') +
          '<button type="button" class="btn btn-link" data-ack="' + esc(x.lineId) + '">Accept the wait</button>';
        if (x.kind === 'stock') acts = '<button type="button" class="btn btn-secondary" data-stock="' + esc(x.lineId) + '">Review branch sources</button><button type="button" class="btn btn-link" data-clear-sources="' + esc(x.lineId) + '">Buy from supplier instead</button>';
        return '<li class="rv-row">' + SE.chip(x.blocking ? 'Must change' : 'Decide', x.blocking ? 'danger' : 'warning') +
          '<div class="rv-txt"><b>' + esc(p.name) + ' · ' + esc(x.pn) + (l.wo ? ' · WO #' + esc(l.wo) : '') + '</b><span><b>' + esc(x.title) + '.</b> ' + esc(x.text) + '</span></div><div class="rv-acts">' + acts + '</div></li>';
      }).join('') + '</ul></section>';
  }
  // W3: take the part from branch shelves
  function stockDialog(id) {
    var l = SE.tx.line(id);
    if (!l) return;
    var pn = l.pn, p = SE.part(pn), dest = K.destination([l]), src = K.sources(pn, dest), take = {};
    src.forEach(function (x) { take[x.id] = (l.from || {})[x.id] || 0; });
    function total() { return Object.keys(take).reduce(function (t, k) { return t + take[k]; }, 0); }
    function rows() {
      return src.map(function (x) {
        var dn = take[x.id] <= 0, up = take[x.id] >= x.qty || total() >= l.qty;
        return '<li class="bs-row"><span class="bs-name"><b>' + esc(x.name) + (x.own ? ' (this branch)' : '') + '</b><small>' + x.qty + ' on the shelf · ' + (x.own ? 'no transfer' : x.miles + ' mi, ' + (SE.ops.foreign(dest) ? 'customs broker' : 'branch van')) + '</small></span>' +
          '<div class="stepper sm" role="group" aria-label="Units from ' + esc(x.name) + '"><button type="button" data-bs="' + x.id + '" data-d="-1" aria-label="Fewer from ' + esc(x.name) + '"' + (dn ? ' disabled' : '') + '>' + icon('minus-small') + '</button><output aria-live="polite">' + take[x.id] + '</output>' +
          '<button type="button" data-bs="' + x.id + '" data-d="1" aria-label="More from ' + esc(x.name) + '"' + (up ? ' disabled' : '') + '>' + icon('plus-small') + '</button></div></li>';
      }).join('');
    }
    function summary() {
      var t = total(), buy = l.qty - t;
      return '<b>' + t + ' of ' + l.qty + ' from branch shelves</b>, ' + (buy ? buy + ' to buy from ' + esc(SE.supplierOf(pn).name) + (p.stock === 'Backordered' ? ' (backordered, ' + esc(p.eta.toLowerCase()) + ')' : '') : 'nothing to buy') + '. Saves ' + money(t * p.price) + '.';
    }
    var d = UI.dialog({
      title: 'Branch stock: ' + p.name,
      body: '<p class="muted">' + esc(pn) + ' · ' + l.qty + ' needed at ' + esc(SE.loc(dest).name) + (l.wo ? ' for work order #' + esc(l.wo) : '') + '. Units from another branch arrive today by the branch van, on a transfer order of their own.</p>' +
        '<ul class="bs-list">' + rows() + '</ul><p class="bs-sum" aria-live="polite">' + summary() + '</p>',
      foot: '<button type="button" class="btn btn-link" data-bs-clear>Clear</button><button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-bs-save>Save sources</button>',
    });
    d.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bs]');
      if (b && !b.disabled) { take[b.dataset.bs] = Math.max(0, take[b.dataset.bs] + +b.dataset.d); d.el.querySelector('.bs-list').innerHTML = rows(); d.el.querySelector('.bs-sum').innerHTML = summary(); var again = d.el.querySelector('[data-bs="' + b.dataset.bs + '"][data-d="' + b.dataset.d + '"]'); if (again && !again.disabled && !SE.capture) again.focus(); return; }
      if (e.target.closest('[data-bs-clear]')) { Object.keys(take).forEach(function (k) { take[k] = 0; }); d.el.querySelector('.bs-list').innerHTML = rows(); d.el.querySelector('.bs-sum').innerHTML = summary(); return; }
      if (e.target.closest('[data-bs-save]')) {
        var f = {}; Object.keys(take).forEach(function (k) { if (take[k]) f[k] = take[k]; });
        if (Object.keys(f).length) l.from = f; else delete l.from;
        SE.save(); d.close(); render();
        SE.toast(total() ? total() + ' from branch shelves, ' + (l.qty - total()) + ' to buy' : 'Buying all ' + l.qty + ' from ' + SE.supplierOf(pn).name, 'marker');
      }
    });
    return d;
  }
  // V4: shelf transfers against the supplier purchase, in the destination's currency
  function sourcesDialog(id) {
    var l = SE.tx.line(id), p = l && SE.part(l.pn);
    if (!p) return null;
    var O = SE.ops, opts = O.sources(l), dest = SE.loc(l.shipTo), fx = O.foreign(l.shipTo);
    var d = UI.dialog({
      title: 'Compare sources: ' + p.name, wide: true,
      body: '<p class="muted">' + l.qty + ' × ' + esc(p.pn) + ' to ' + esc(dest.name) + (l.wo ? ' for work order #' + esc(l.wo) : '') + (fx ? '. Amounts in ' + esc(dest.currencyName) + '; orders settle in USD.' : '.') + '</p>' +
        '<ul class="src-list" role="radiogroup" aria-label="Sources">' + opts.map(function (o) {
          return '<li><button type="button" class="src-row' + (o.recommended ? ' best' : '') + '" role="radio" aria-checked="' + o.current + '" data-src="' + esc(o.key) + '"><span class="ck" aria-hidden="true">' + icon('check') + '</span>' +
            '<span class="src-main"><b>' + esc(o.label) + (o.recommended ? ' ' + SE.chip('Lowest cost', 'success') : '') + '</b><small>' + esc(o.note) + '</small></span>' +
            '<span class="src-when">Arrives ' + esc(o.arriveText) + (o.meets ? '' : '<br><small>after the work order is due</small>') + '</span>' +
            '<span class="src-cost"><b>' + O.money(o.costUSD, l.shipTo) + '</b>' + (fx ? '<small>' + money(o.costUSD) + '</small>' : '') + '</span></button></li>';
        }).join('') + '</ul>' +
        '<p class="muted src-note">Transfers keep ' + ((SE.data.routing || {}).keepOnShelf || 0) + ' on each branch shelf. Cost is the purchase plus freight' + (fx ? ', customs broker and import' : '') + '.</p>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button>',
    });
    d.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-src]');
      if (!b) return;
      var o = O.useSource(SE.tx.line(id), b.dataset.src);
      d.close(); render();
      if (o) SE.toast(o.label + ': ' + O.money(o.costUSD, SE.tx.line(id).shipTo), 'marker');
    });
    return d;
  }
  function sub() {
    var n = SE.cartCount(), g = groups().length;
    return n ? n + ' item' + (n === 1 ? '' : 's') + ' from ' + g + ' supplier' + (g === 1 ? '' : 's') : 'No items yet';
  }
  var K = SE.desk;
  function deskRow(l, p) {
    var dest = K.destination([l]), a = K.alloc(l), src = K.sources(l.pn, dest), n = src.reduce(function (t, x) { return t + x.qty; }, 0), bits = [];
    if (a.own) bits.push(a.own + ' from your shelf');
    if (a.moved) bits.push(a.moved + ' by branch transfer');
    if (a.own || a.moved) bits.push(a.buy + ' to buy');
    var issue = K.issues().find(function (x) { return x.lineId === l.id; });
    var cmp = SE.ops.sources(l).length > 1 && !p.supersededBy ? '<button type="button" class="btn btn-link oc-src" data-sources="' + esc(l.id) + '">' + icon('marker') + 'Compare sources</button>' : '';
    if (!n && !bits.length && !issue && !cmp) return '';
    return '<div class="oc-desk">' + (issue ? '<span class="oc-flag t-' + (issue.blocking ? 'danger' : 'warning') + '">' + icon('exclamation') + esc(issue.title) + '</span>' : '') +
      (bits.length ? '<span class="oc-alloc">' + icon('marker') + esc(bits.join(' · ')) + '</span>' : '') +
      (n && !p.supersededBy ? '<button type="button" class="btn btn-link oc-stock" data-stock="' + esc(l.id) + '">' + icon('apps') + (bits.length ? 'Change branch stock' : 'Branch stock: ' + n + ' on ' + src.length + ' shel' + (src.length === 1 ? 'f' : 'ves')) + '</button>' : '') + cmp + '</div>';
  }
  function unpriced(l) { return K.issues().some(function (x) { return x.lineId === l.id && x.kind === 'serial'; }); }
  function line(l) {
    var p = SE.part(l.pn);
    if (unpriced(l)) return '<li class="oc-line" data-line="' + esc(l.id) + '">' + UI.thumb() +
      '<div class="oc-info"><a class="oc-name" href="#/part?pn=' + encodeURIComponent(p.pn) + '">' + esc(p.name) + '</a><span class="oc-pn">' + esc(p.pn) + '</span></div>' +
      '<div class="oc-unit"><span class="oc-lbl">Unit</span><span class="pr-gate">Needs a unit</span></div>' +
      '<div class="oc-qty">' + UI.stepper(l.qty, 'Quantity of ' + p.name, ' data-pn="' + esc(l.id) + '"').replace('class="stepper"', 'class="stepper sm"').replace(l.qty <= 1 ? 'data-step="-1"' : '@@', 'data-step="-1" disabled') + '</div>' +
      '<div class="oc-total"><span class="oc-lbl">Total</span><span class="pr-gate">Priced by unit</span></div>' +
      '<button class="btn btn-link oc-remove" type="button" data-remove="' + esc(l.id) + '" aria-label="Remove ' + esc(p.name) + '">' + icon('trash') + '<span>Remove</span></button>' + deskRow(l, p) + '</li>';
    var step = UI.stepper(l.qty, 'Quantity of ' + p.name, ' data-pn="' + esc(l.id) + '"').replace('class="stepper"', 'class="stepper sm"');
    if (l.qty <= 1) step = step.replace('data-step="-1"', 'data-step="-1" disabled');
    return '<li class="oc-line" data-line="' + esc(l.id) + '">' + UI.thumb() +
      '<div class="oc-info"><a class="oc-name" href="#/part?pn=' + encodeURIComponent(p.pn) + '">' + esc(p.name) + '</a>' +
        '<span class="oc-pn">' + esc(p.pn) + ' · ' + esc(SE.loc(l.shipTo).name) + (l.unit ? ' · ' + esc(l.unit) : '') + '</span>' +
        (SE.ops.foreign(l.shipTo) ? '<span class="oc-pn">' + SE.ops.money(p.price, l.shipTo) + ' per item at ' + esc(SE.loc(l.shipTo).name) + '</span>' : '') + (l.wo ? '<a class="oc-wo" href="#/work-order?id=' + esc(l.wo) + '">' + icon('clipboard-list') + 'WO #' + esc(l.wo) + '</a>' : '') + '</div>' +
      '<div class="oc-unit"><span class="oc-lbl">Unit</span>' + money(p.price) + '</div>' +
      '<div class="oc-qty">' + step + '</div>' +
      '<div class="oc-total"><span class="oc-lbl">' + (K.alloc(l).buy < l.qty ? 'To buy' : 'Total') + '</span><b>' + money(p.price * K.alloc(l).buy) + '</b></div>' +
      '<button class="btn btn-link oc-remove" type="button" data-remove="' + esc(l.id) + '" aria-label="Remove ' + esc(p.name) + '">' + icon('trash') + '<span>Remove</span></button>' +
      deskRow(l, p) +
    '</li>';
  }
  function body() {
    var g = groups();
    if (!g.length) {
      return UI.empty({ icon: 'shopping-cart', tone: 'neutral', title: 'Your cart is empty', text: 'Add parts from the catalog or from search. Parts you order for a work order keep its number.',
        action: '<div class="oc-empty-btns"><button class="btn btn-primary" type="button" data-go="catalog">Browse catalog</button><button class="btn btn-secondary" type="button" data-go="search">Search parts</button></div>' });
    }
    var issues = K.issues(), blocked = issues.length > 0;
    return '<div class="oc-grid"><div class="oc-main">' + review() + g.map(function (s, i) {
      return '<section class="card flush oc-sup" aria-labelledby="oc-s' + i + '"><header class="oc-sup-head"><h2 id="oc-s' + i + '">' + esc(s.name) + '</h2><span class="muted">Supplier group ' + (i + 1) + ' of ' + g.length + '</span></header>' +
        '<ul class="oc-lines">' + s.lines.map(line).join('') + '</ul>' +
        '<footer class="oc-sup-foot"><span>Subtotal, ' + esc(s.name) + '</span><b>' + money(sum(s.lines)) + '</b></footer></section>';
    }).join('') + '</div>' +
    '<aside class="card oc-aside" aria-label="Order summary"><h2 class="oc-aside-h">Summary</h2>' +
      UI.kv(g.map(function (s) { return [s.name, money(sum(s.lines))]; }).concat((function () { var sh = SE.ops.internalShare(SE.state.cart); return [['From your branch shelves', sh.internal + ' of ' + sh.items + ' item' + (sh.items === 1 ? '' : 's')]]; })())) +
      '<div class="oc-grand"><span>Estimated total</span><b>' + money(sum(SE.state.cart)) + '</b></div>' +
      (SE.state.cart.some(unpriced) ? '<p class="oc-note">Plus the lines priced by unit, once you choose the unit.</p>' : '') +
      '<p class="oc-note">Tax and freight are added by the supplier.</p>' +
      UI.banner('<b>You can approve your own orders.</b> Checkout sends them straight to the supplier.' + (g.length > 1 ? ' Purchase orders are split by supplier, destination and work order.' : ''), 'success', 'shield-check') +
      (blocked ? '<p class="oc-block" role="status">' + icon('exclamation') + 'Sort out ' + issues.length + ' line' + (issues.length === 1 ? '' : 's') + ' above to check out</p>' : '') +
      '<button class="btn btn-primary oc-cta" type="button" data-go="checkout"' + (blocked ? ' disabled' : '') + '>Checkout' + icon('arrow-small-right') + '</button>' +
    '</aside></div>';
  }
  // review link: a cart reordered from an old work order, with every kind of review line
  if (p && p.fill === 'review') {
    SE.state.cart = [{ pn: 'JLG-4120-118', qty: 2, wo: '100118' }, { pn: 'JLG-4120-327', qty: 1, wo: '100118' }, { pn: 'JLG-4120-204', qty: 1, wo: '100118' }, { pn: 'SKJ-104210', qty: 1, wo: null }];
    SE.state.cartAck = {}; SE.tx.normalizeCart(); SE.save();
    history.replaceState(null, '', '#/cart' + (p.stock ? '?stock=' + encodeURIComponent(p.stock) : ''));
  }
  // cart actions (legacy mobile 19 tools sheet, web-full): save as a shopping list, share, export as CSV
  var toolsBtn = '<button class="btn btn-secondary" type="button" data-tools aria-haspopup="menu" aria-expanded="false" aria-label="Cart actions"' + (SE.state.cart.length ? '' : ' hidden') + '>' + icon('share') + 'Cart actions' + icon('angle-small-down') + '</button>';
  var s = SE.shell(el, { nav: 'cart', title: 'Cart', sub: esc(sub()), crumbs: [['Home', 'home']], actions: toolsBtn, body: '<div id="oc-body">' + body() + '</div>' });
  function csv() { return SE.tx.exportCSV(SE.state.cart); }
  function tools(btn) {
    SE.ui.menu(btn, [
      { label: 'Save as shopping list', icon: 'list', run: function () {
        var lines = SE.state.cart.map(function (l) { return { pn: l.pn, qty: l.qty }; });
        var first = SE.part(lines[0].pn), id = 'sl-cart-' + (SE.lists().length + 1);
        SE.lists().unshift({ id: id, name: 'Saved cart, ' + lines.length + ' line' + (lines.length === 1 ? '' : 's'), description: 'Saved from the cart by Sarah Martinez.', tag: 'Repair', machine: first.machine || null, items: lines, updatedBy: 'Sarah Martinez', updatedAt: 'Today' });
        SE.saveLists();
        SE.toast('Saved as a shopping list', 'list');
        SE.go('list', { params: { id: id } });
      } },
      { label: 'Share cart', icon: 'share', run: function () {
        var link = SE.tx.shareCart(SE.state.cart);
        function showLink() { UI.dialog({ title: 'Portable cart snapshot', body: '<p>Copy this snapshot link. A recipient must confirm before importing its lines.</p><div class="control area"><textarea rows="5" readonly aria-label="Cart snapshot link">' + esc(link) + '</textarea></div>', foot: '<button type="button" class="btn btn-primary" data-dlg-close>Done</button>' }); }
        if (navigator.clipboard && !SE.capture) navigator.clipboard.writeText(link).then(function () { SE.toast('Cart snapshot link copied', 'share'); }, showLink); else showLink();
      } },
      { label: 'Export as CSV', icon: 'download', run: function () {
        SE.tx.download('cart.csv', csv(), 'text/csv;charset=utf-8');
        SE.toast('CSV downloaded', 'download');
      } },
    ]);
  }
  var host = el.querySelector('#oc-body');
  function render() { host.innerHTML = body(); var sl = el.querySelector('#subline'); if (sl) sl.textContent = sub(); var tb = el.querySelector('[data-tools]'); if (tb) tb.hidden = !SE.state.cart.length; s.refresh(); }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.hasAttribute('data-tools')) { tools(t); return; }
    if (t.dataset.clearSources) { var sourceLine = SE.tx.line(t.dataset.clearSources); sourceLine.from = {}; SE.save(); render(); return; }
    if (t.dataset.stock) { stockDialog(t.dataset.stock); return; }
    if (t.dataset.sources) { sourcesDialog(t.dataset.sources); return; }
    if (t.dataset.take) {
      var tl = SE.tx.line(t.dataset.take);
      tl.from = Object.assign({}, tl.from); tl.from[t.dataset.b] = +t.dataset.q; SE.tx.normalizeCart(); SE.save(); render();
      SE.toast(t.dataset.q + ' from ' + SE.loc(t.dataset.b).name + ' by branch transfer', 'marker'); return;
    }
    if (t.dataset.swap) { K.swap(t.dataset.swap, t.dataset.to); render(); SE.toast('Swapped to ' + t.dataset.to, 'swap'); return; }
    if (t.dataset.ack) { var ackLine = SE.tx.line(t.dataset.ack); ackLine.backorderAccepted = true; SE.tx.normalizeCart(); SE.save(); render(); SE.toast('Ordering it anyway: it ships when ' + SE.supplierOf(ackLine.pn).name + ' has it', 'clock'); return; }
    if (t.dataset.step) {
      var pn = t.closest('[data-pn]').dataset.pn, l = SE.tx.line(pn);
      l.qty = Math.max(1, l.qty + (+t.dataset.step)); SE.tx.normalizeCart(); SE.save(); render();
      var again = host.querySelector('[data-pn="' + pn + '"] [data-step="' + t.dataset.step + '"]');
      if (again && !again.disabled && !SE.capture) again.focus();
      return;
    }
    if (t.dataset.remove) {
      var name = SE.part(SE.tx.line(t.dataset.remove).pn).name;
      SE.state.cart = SE.state.cart.filter(function (x) { return x.id !== t.dataset.remove; });
      SE.tx.normalizeCart(); SE.save(); render(); SE.toast('Removed ' + name, 'trash');
    }
  });
  el.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-unit]');
    if (!sel || !sel.value) return;
    var l = SE.tx.line(sel.dataset.unit);
    l.unit = sel.value; l.serial = SE.asset(sel.value).serial; SE.tx.normalizeCart(); SE.save(); render();
    SE.toast('Priced for ' + sel.value, 'check');
  });
  if (p && p.tools && SE.state.cart.length) tools(el.querySelector('[data-tools]'));
  if (p && p.stock) stockDialog(p.stock);
  if (p && p.sources && SE.state.cart.length) sourcesDialog(SE.state.cart[0].id);
  return s.cleanup;
};
