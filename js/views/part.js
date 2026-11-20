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
    var manual = part.manualRef ? D.manuals.find(function (x) { return x.id === part.manualRef.id; }) : null;
    var cat = m ? (m.categories.find(function (c) { return c.id === part.cat; }) || {}) : null;
    var back = part.stock === 'Backordered', good = part.stock === 'In stock';
    var cm = part.comments || [];

    var catLabel = cat ? cat.name : (line ? line[1] : s.name + ' line');
    var availDot = good ? 'g' : 'a';
    var availLabel = back ? 'Backordered' : part.stock;

    var pathParts = m
      ? [s.name, m.model, cat ? cat.name : '', part.sub]
      : [s.name + ' ' + (line ? line[1].toLowerCase() : 'line')];
    var pathStr = pathParts.filter(Boolean).map(esc).join(' › ');

    var manRefsHtml = '';
    if (manual) {
      manRefsHtml = '<div class="dp-sec-label">Manual References</div>' +
        '<div class="dp-manref">' + icon('book-alt') +
        '<a class="dp-manref-link" href="#/manual?id=' + esc(manual.id) + '&page=' + part.manualRef.page + '">' + esc(part.manual || manual.title) + '</a>' +
        '<span class="dp-manref-sec">p.' + part.manualRef.page + '</span>' +
        '</div>';
    }

    var notesHtml = '';
    if (cm.length) {
      notesHtml = '<div class="dp-sec-label">Supplier &amp; fleet notes</div>' +
        cm.map(function (x) {
          return '<div class="dp-note"><div class="dp-note-hd"><b>' + esc(x.by) + '</b><span>' + esc(x.role) + ' · ' + esc(x.date) + '</span></div><p>' + esc(x.text) + '</p></div>';
        }).join('');
    }

    return '<div class="pd' + (o.title ? ' pd-page' : '') + '" data-pd="' + esc(part.pn) + '">' +
      '<div class="dp-div"></div>' +
      '<div class="dp-field"><span class="dp-lbl">Vendor</span><span class="dp-val">' + esc(s.name) + '</span></div>' +
      '<div class="dp-field"><span class="dp-lbl">Category</span><span class="dp-val">' + esc(catLabel) + '</span></div>' +
      '<div class="dp-field"><span class="dp-lbl">Price</span><span class="dp-val" style="font-size:18px;font-weight:700;">$' + part.price.toFixed(2) + '</span></div>' +
      '<div class="dp-field"><span class="dp-lbl">Availability</span><span class="dp-avail ' + availDot + '"><span class="avdot ' + availDot + '"></span>' + esc(availLabel) + '</span></div>' +
      (part.weight ? '<div class="dp-field"><span class="dp-lbl">Weight</span><span class="dp-val">' + esc(part.weight) + '</span></div>' : '') +
      (part.dims   ? '<div class="dp-field"><span class="dp-lbl">Dimensions</span><span class="dp-val">' + esc(part.dims) + '</span></div>' : '') +
      '<div class="dp-div"></div>' +
      '<div class="dp-path">' + icon('sitemap') + '<span>' + pathStr + '</span></div>' +
      manRefsHtml +
      notesHtml +
      '<div class="dp-actions">' +
        '<button class="btn btn-brand pd-add" type="button" data-add>' + icon('shopping-cart') + 'Add to cart · ' + SE.money(part.price) + '</button>' +
        '<button class="btn btn-secondary pd-save-list" type="button" data-savelist>' + icon('star') + 'Save to list</button>' +
      '</div>' +
      '<p class="pd-added" role="status" hidden></p>' +
    '</div>';
  };
  // wire a rendered SE.partDetail; o.pick(pn, wo) opens another part, o.refresh(wo) re-renders after the
  // unit or work order changes (both change what the card may say)
  SE.partDetailBind = function (root, part, o) {
    o = o || {};
    var wo = o.wo || null;
    function onClick(e) {
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-savelist')) { if (SE.addToShoppingList) SE.addToShoppingList(part); return; }
      if (t.hasAttribute('data-add')) {
        SE.addToCart(part.pn, 1, wo, {});
        SE.toast('Added to cart', 'shopping-cart');
        var msg = root.querySelector('.pd-added');
        if (msg) {
          var viewLink = wo ? '<a class="btn btn-secondary" href="#/work-order?id=' + esc(wo) + '">View work order</a>' : '';
          msg.innerHTML = icon('check') + '<span>Added to cart</span>' + viewLink;
          msg.hidden = false;
        }
        return;
      }
    }
    root.addEventListener('click', onClick);
    return function () { root.removeEventListener('click', onClick); };
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
    host.innerHTML = SE.partDetail(part, { wo: wo, title: true });
    unbind = SE.partDetailBind(host.querySelector('.pd'), part, { wo: wo });
  }
  render();
  var stopTogether = SE.mkt ? SE.mkt.bind(el) : null;
  return function () { if (unbind) unbind(); if (stopTogether) stopTogether(); sh.cleanup(); };
};
