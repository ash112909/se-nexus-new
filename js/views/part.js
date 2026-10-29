/* Part card (B2, DES-47), web. The standalone page (opened from search results, replacements, alternates,
   cross-references, supplier lines) and SE.partDetail, the same card in the category page's side panel.
   Anatomy: generic part graphic, OEM or non-OEM status, unit price with currency and unit of measure
   ("$96.40 USD per kit"), availability and ship time, branch shelf, cross-references (count and a link to
   each), the fleet units it fits (of all 28), manual page, work order, quantity and "Add to cart · $total".
   Conditions:
     serial pricing (JLG-4120-204, JLG-4120-311, SKJ-104210): without a unit of that model in context,
       "Requires serial context for pricing" replaces price and availability; the way out is choosing 1 of
       your units of that model (sets the search context), then price shows; Add to cart is blocked until then.
     unit in context (work order or chosen unit): "For FL-094 · SJ3219-00847" on the card.
     superseded (JLG-4120-327): the notice is a link to the replacement; "View replacement" replaces Add.
     replacement (JLG-4120-329): "Replaces JLG-4120-327", a link to the retired number.
     backordered (JLG-4120-204): "Backordered, ships in 5 days" and an optional alternate JLG-4120-204R.
     enhanced item (JLG-7000-032): path "JLG consumables" instead of a machine path, no "fits your units".
     branch locale (web-full, DES-47 state 2): at Monterrey Branch the price shows in MXN with a note that
       orders settle in USD; the Currency property names the branch.
     published comments (web-full, DES-47 state 5): notes technicians published on the part, newest first.
   The standalone page adds "Often ordered together" (web-full marketing kit, a carousel of parts that share
   its work orders) and, opened from Recommended Parts (&from=Recommended), a breadcrumb back to that list.
   #/part?pn=JLG-4120-118   &wo=100118   &from=Recommended */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon;
  function open(m) { return SE.allWorkOrders().filter(function (w) { return (!m || w.machine === m.name) && w.status !== 'Done' && !SE.state.cancelled[w.id]; }); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function lineOf(part) { return (SE.data.enhancedCategories[part.supplier] || []).find(function (l) { return l[0] === part.enhanced; }); }
  function href(pn, wo) { return '#/part?pn=' + encodeURIComponent(pn) + (wo ? '&wo=' + encodeURIComponent(wo) : ''); }

  // o: { wo, title (show name, number and path, for the standalone page) }
  SE.partDetail = function (part, o) {
    o = o || {};
    var D = SE.data, C = SE.cat, s = SE.supplierOf(part.pn), m = part.machine ? SE.machine(part.machine) : null;
    var line = m ? null : lineOf(part);
    var repl = part.supersededBy ? SE.part(part.supersededBy) : null, alt = part.alternate ? SE.part(part.alternate) : null;
    var replaces = D.parts.find(function (x) { return x.supersededBy === part.pn; });
    var manual = part.manualRef ? D.manuals.find(function (x) { return x.id === part.manualRef.id; }) : null;
    var w = C.wo(o.wo), unit = C.unit(o.wo), ok = C.priceOk(part, unit), mine = unit && (!m || unit.model === part.machine);
    var back = part.stock === 'Backordered', good = part.stock === 'In stock';
    var xrefs = (part.xrefs || []).map(SE.part).filter(Boolean);
    var facts = [];
    if (!repl && ok) facts.push('<li class="' + (good ? 'ok' : 'warn') + '">' + icon(good ? 'check' : 'clock') + '<span>' + (back ? '<b>Backordered, ' + esc(part.eta.toLowerCase()) + '</b>' : '<b>' + esc(part.stock) + ' at ' + esc(s.name) + '</b>') + '</span>' + (back ? '<small>At ' + esc(s.name) + '</small>' : '<small>' + esc(part.eta) + '</small>') + '</li>');
    if (part.shelf && !repl && ok) facts.push('<li>' + icon('marker') + '<span>' + esc(part.shelf) + '</span></li>');
    if (m) facts.push('<li>' + icon('truck-side') + '<span>Fits ' + m.units.length + ' of your ' + SE.assets().length + ' units</span><small>' + esc(m.name) + '</small></li>');
    else facts.push('<li>' + icon('grid-alt') + '<span>' + esc(s.name) + ' ' + esc(line ? line[1].toLowerCase() : 'line') + ', not tied to a model</span></li>');
    if (manual) facts.push('<li>' + icon('book-alt') + '<span><a href="#/manual?id=' + manual.id + '&page=' + part.manualRef.page + '">' + esc(part.manual || manual.title) + '</a></span><small>Page ' + part.manualRef.page + ' of the PDF</small></li>');

    var fx = SE.branchCurrency();
    var props = '<dl class="pd-props"><div><dt>Unit of measure</dt><dd>' + esc(cap(part.uom)) + '</dd></div><div><dt>Currency</dt><dd>' + (fx ? esc(fx.code) + ' (' + esc(fx.branch) + ')' : esc(part.currency)) + '</dd></div>' +
      '<div><dt>Status</dt><dd>' + (part.reman || part.oem === false ? 'Non-OEM, remanufactured' : 'OEM') + '</dd></div><div><dt>Cross-references</dt><dd>' + xrefs.length + '</dd></div></dl>';

    var wos = open(m);
    var woCtl = repl ? '' : '<div class="form-row"><label for="pd-wo-' + part.pn + '">Work order</label><div class="control pd-select"><select id="pd-wo-' + part.pn + '" data-pd-wo><option value="">No work order</option>' +
      wos.map(function (x) { return '<option value="' + x.id + '"' + (w && w.id === x.id ? ' selected' : '') + '>#' + x.id + ' · ' + esc(x.issue) + ' · ' + esc(x.equip) + '</option>'; }).join('') +
      (w && !wos.some(function (x) { return x.id === w.id; }) ? '<option value="' + w.id + '" selected>#' + w.id + ' · ' + esc(w.equip) + '</option>' : '') + '</select>' + icon('angle-small-down') + '</div></div>';
    var unitSel = function (label) {
      return '<div class="form-row"><label for="pd-unit-' + part.pn + '">' + label + '</label><div class="control pd-select"><select id="pd-unit-' + part.pn + '" data-pd-unit><option value="">Choose 1 of ' + m.units.length + ' ' + esc(m.model) + ' units</option>' +
        m.units.map(function (u) { return '<option value="' + esc(u.equip) + '"' + (mine && unit.equip === u.equip ? ' selected' : '') + '>' + esc(u.equip) + ' · ' + esc(u.serial) + ' · ' + esc(u.location) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>';
    };
    var price = !ok
      ? '<div class="serial-need" role="note">' + icon('lock') + '<div><b>Requires serial context for pricing</b><p>Price and availability for this ' + esc(part.type.toLowerCase()) + ' depend on the unit it goes on.</p>' + unitSel('Your unit') + '</div></div>'
      : fx ? '<p class="pd-price' + (repl ? ' old' : '') + '"><b>' + fx.fmt(part.price) + '</b><span>' + esc(fx.code) + ' ' + esc(C.per(part)) + '</span></p>' +
          '<p class="pd-fx">' + icon('info') + '<span>' + esc(fx.branch) + ' sees prices in ' + esc(fx.name) + ' (' + SE.money(part.price) + ' USD). Orders settle in USD.</span></p>'
      : '<p class="pd-price' + (repl ? ' old' : '') + '"><b>' + SE.money(part.price) + '</b><span>' + esc(part.currency) + ' ' + esc(C.per(part)) + '</span></p>';
    var cm = part.comments || [];
    var comments = cm.length ? '<div class="pd-cmts"><p class="pd-alt-l">Published comments · ' + cm.length + '</p>' + cm.map(function (x) {
      return '<article class="pd-cmt"><header><b>' + esc(x.by) + '</b><span>' + esc(x.role) + ' · ' + esc(x.date) + '</span><span class="pub">Published</span></header><p>' + esc(x.text) + '</p></article>';
    }).join('') + '</div>' : '';
    var path = m ? [s.name, m.model, (m.categories.find(function (c) { return c.id === part.cat; }) || {}).name, part.sub] : [s.name + ' ' + (line ? line[1].toLowerCase() : 'line')];

    return '<div class="pd' + (o.title ? ' pd-page' : '') + '" data-pd="' + part.pn + '">' +
      '<div class="pd-graphic ph thumb" role="img" aria-label="' + esc(part.name) + ' image"></div>' +
      '<div class="pd-info">' +
        (mine || w ? '<p class="pd-for">' + icon(w ? 'clipboard-list' : 'truck-side') + '<span>' + (mine ? 'For <b>' + esc(unit.equip) + '</b> · ' + esc(unit.serial) : '') + (w ? (mine ? ' · ' : '') + 'Work order <b>#' + w.id + '</b>' : '') + '</span></p>' : '') +
        (o.title ? '<div class="pd-name"><h2>' + esc(part.name) + '</h2><p>' + esc(part.pn) + '</p></div>' : '') +
        '<p class="pd-path">' + path.filter(Boolean).map(esc).join(' <span aria-hidden="true">›</span> ') + '</p>' +
        '<div class="chips">' + (part.reman ? SE.chip('Non-OEM', 'warning') : SE.chip('OEM', 'neutral')) + SE.chip(m ? 'Fits ' + m.name : s.name + ' ' + (line ? line[1] : 'line'), 'info') + (repl ? SE.chip('Superseded', 'warning') : '') + '</div>' +
        price +
        (repl ? '<a class="banner t-warning pd-sup" href="' + href(repl.pn, o.wo) + '" data-pick="' + repl.pn + '">' + icon('exclamation') + '<p><b>Superseded by ' + esc(repl.pn) + '.</b> The old number can no longer be ordered.</p>' + icon('arrow-small-right') + '</a>' : '') +
        (replaces ? '<a class="banner t-info pd-sup" href="' + href(replaces.pn, o.wo) + '" data-pick="' + replaces.pn + '">' + icon('swap') + '<p><b>Replaces ' + esc(replaces.pn) + '.</b> Order this number for the retired part.</p>' + icon('arrow-small-right') + '</a>' : '') +
        '<ul class="pd-facts">' + facts.join('') + '</ul>' + props +
        (xrefs.length ? '<div class="pd-xref"><p class="pd-alt-l">Cross-references · ' + xrefs.length + '</p><ul>' + xrefs.map(function (x) {
          return '<li><a href="' + href(x.pn, o.wo) + '" data-pick="' + x.pn + '"><b>' + esc(x.pn) + '</b><span>' + esc(x.name) + ' · ' + esc(SE.supplierOf(x.pn).name) + '</span>' + icon('angle-small-right') + '</a></li>';
        }).join('') + '</ul></div>' : '') +
        (alt ? '<div class="pd-alt"><p class="pd-alt-l">Optional alternate</p><div class="pd-alt-row">' + SE.ui.thumb() + '<span><b>' + esc(alt.name) + '</b><small>' + esc(alt.pn) + ' · ' + (alt.reman ? 'Non-OEM, remanufactured' : 'OEM') + ' · <span class="ok">' + esc(alt.stock) + ', ' + esc(alt.eta.toLowerCase()) + '</span></small></span><b>' + SE.money(alt.price) + '</b></div>' +
          '<p class="pd-note">' + (ok ? 'Ships 3 days sooner and costs ' + SE.money(part.price - alt.price) + ' less. You can still order the original.' : 'Ships 3 days sooner and is priced without a serial. You can still order the original.') + '</p>' +
          '<button class="btn btn-secondary pd-wide" type="button" data-pick="' + alt.pn + '">Use alternate</button></div>' : '') +
        (ok && mine && part.serialPricing && !w ? unitSel('Priced for') : '') +
        woCtl +
        (repl ? '<button class="btn btn-brand pd-wide" type="button" data-pick="' + repl.pn + '">View replacement' + icon('arrow-small-right') + '</button>'
          : !ok ? '<button class="btn btn-brand pd-wide" type="button" disabled>' + icon('lock') + 'Choose your unit to order</button>'
          : '<div class="pd-buy"><div class="form-row"><label>Quantity</label>' + SE.ui.stepper(1) + '</div><button class="btn btn-brand pd-add" type="button" data-add>Add to cart · ' + SE.money(part.price) + '</button></div>' +
            '<p class="pd-added" role="status" hidden></p>') +
        comments +
      '</div></div>';
  };
  // wire a rendered SE.partDetail; o.pick(pn, wo) opens another part, o.refresh(wo) re-renders after the
  // unit or work order changes (both change what the card may say)
  SE.partDetailBind = function (root, part, o) {
    o = o || {};
    var qty = 1, wo = o.wo && SE.wo(o.wo) ? o.wo : null;
    function label() { return 'Add to cart · ' + SE.money(part.price * qty); }
    function onClick(e) {
      var a = e.target.closest('a[data-pick]');
      if (a && root.contains(a)) { e.preventDefault(); o.pick(a.dataset.pick, wo); return; }
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;
      if (t.dataset.step) { qty = Math.max(1, Math.min(99, qty + +t.dataset.step)); root.querySelector('.stepper output').textContent = qty; root.querySelector('[data-add]').textContent = label(); return; }
      if (t.hasAttribute('data-add')) {
        var selectedUnit = SE.cat.unit(wo); SE.addToCart(part.pn, qty, wo, { unit: selectedUnit && selectedUnit.equip, serial: selectedUnit && selectedUnit.serial });
        SE.toast('Added to cart', 'shopping-cart');
        var msg = root.querySelector('.pd-added');
        var woCart = wo && SE.state.woCart && SE.state.woCart[wo];
        var woLine = woCart && woCart.find(function (l) { return l.id === part.pn; });
        var globLine = !wo && SE.state.cart.find(function (l) { return l.pn === part.pn; });
        var qtyShown = (woLine || globLine || {}).qty || qty;
        var viewLink = wo ? '<a class="btn btn-secondary" href="#/work-order?id=' + esc(wo) + '">View work order</a>' : '';
        msg.innerHTML = icon('check') + '<span>Added · ' + qtyShown + ' · for WO #' + esc(wo || '') + '</span>' + viewLink;
        msg.hidden = false;
        return;
      }
      if (t.dataset.pick) { o.pick(t.dataset.pick, wo); }
    }
    function onChange(e) {
      if (e.target.matches('[data-pd-wo]')) { wo = e.target.value || null; if (part.serialPricing && o.refresh) o.refresh(wo); return; }
      if (e.target.matches('[data-pd-unit]') && e.target.value) {
        SE.setContext({ equip: e.target.value });
        SE.toast('Priced for ' + e.target.value, 'check');
        if (o.refresh) o.refresh(wo);
      }
    }
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    return function () { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); };
  };
})();

SE.titles.part = 'Part';
SE.views.part = function (el, p) {
  var D = SE.data, C = SE.cat;
  var part = SE.part(p.pn);
  if (!part) { var missing = SE.shell(el, { nav: 'catalog', title: 'Part not found', body: SE.ui.empty({ icon: 'exclamation', title: 'Part not found', text: 'This part number is not in the catalog.', action: '<a href="#/catalog" class="btn btn-secondary">Browse catalog</a>' }) }); return missing.cleanup; }
  var s = SE.supplierOf(part.pn), m = part.machine ? SE.machine(part.machine) : null;
  var cat = m ? m.categories.find(function (c) { return c.id === part.cat; }) : null;
  var line = m ? null : (D.enhancedCategories[part.supplier] || []).find(function (l) { return l[0] === part.enhanced; });
  var wo = p.wo || null, unbind = null;
  // the breadcrumb carries the path past the tree's 4 levels: supplier, model, group, sub-assembly, part
  var crumbs = p.from === 'Recommended' ? [['Recommended parts', 'recommended']] : [['Parts catalog', 'catalog'], [s.name, 'supplier?sup=' + s.id + C.woQ(wo)]];
  if (p.from === 'Recommended') { /* the list it came from is the way back */ }
  else if (m) crumbs.push([m.model, 'machine?m=' + part.machine + C.woQ(wo)], [cat.name, 'category?m=' + part.machine + '&cat=' + cat.id + C.woQ(wo)], [part.sub, 'category?m=' + part.machine + '&cat=' + cat.id + '&sub=' + encodeURIComponent(part.sub) + C.woQ(wo)]);
  else if (line) crumbs.push([line[1], 'supplier?sup=' + s.id + '&line=' + line[0] + C.woQ(wo)]);
  var cur = m ? { sup: s.id, m: part.machine, cat: part.cat, sub: part.sub } : { sup: s.id, line: line ? line[0] : null };
  var sh = SE.shell(el, {
    nav: 'catalog', title: part.name, wide: true, crumbs: crumbs,
    sub: SE.esc(part.pn) + ' · ' + SE.esc(s.name) + (m ? ' · ' + SE.esc(m.name) : ' · ' + SE.esc(line ? line[1] : 'line')),
    body: C.layout(cur, wo, '<div class="card pd-card" id="pd-host"></div>' + (SE.mkt ? SE.mkt.together(part) : '')),
  });
  var host = el.querySelector('#pd-host');
  function render() {
    if (unbind) unbind();
    host.innerHTML = SE.partDetail(part, { wo: wo });
    unbind = SE.partDetailBind(host.querySelector('.pd'), part, {
      wo: wo,
      pick: function (pn, w) { SE.go('part', { params: w ? { pn: pn, wo: w } : { pn: pn } }); },
      refresh: function (w) { wo = w; render(); },
    });
  }
  render();
  var stopTogether = SE.mkt ? SE.mkt.bind(el) : null;
  return function () { if (unbind) unbind(); if (stopTogether) stopTogether(); sh.cleanup(); };
};
