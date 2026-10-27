/* Parts catalog (B2, DES-44 fleet view), web. The models you own come first with their unit counts, then
   the suppliers in the network: JLG and Skyjack live (fleet units, Browse catalog), the 6 others greyed
   "Not connected" and not clickable.
   #/catalog   (+ &wo= from a work order: banner, wo kept on every link)
   Also defines SE.cat, the helpers the catalog pages share: supplier badge, work order banner, wo attribute,
   the unit in context and serial pricing (DES-47), the price cell, and the catalog tree panel with its
   page layout (DES-44: 4 levels at most, current node tinted, deeper levels continue on the breadcrumb). */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon;
  var C = SE.cat = {};
  C.badge = function (s, cls) { return '<span class="sup-badge' + (s.active ? '' : ' off') + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(s.id) + '</span>'; };
  C.wo = function (id) { return id && SE.wo(id) ? SE.wo(id) : null; };
  C.woAttr = function (id) { return id ? ' data-wo="' + esc(id) + '"' : ''; };
  C.woQ = function (id) { return id ? '&wo=' + encodeURIComponent(id) : ''; };
  C.woBanner = function (id) {
    var w = C.wo(id);
    if (!w) return '';
    return '<div class="wo-strip">' + icon('clipboard-list') + '<p>Finding parts for work order <a href="#/work-order?id=' + w.id + '"><b>#' + w.id + '</b></a> · ' + esc(w.machine) + ' ' + esc(w.equip) + '</p></div>';
  };
  C.units = function (s) { return s.machines.reduce(function (n, k) { return n + SE.machine(k).units.length; }, 0); };
  C.lines = function (sup) { return SE.data.enhancedCategories[sup] || []; };
  C.lineItems = function (sup, id) { return SE.data.parts.filter(function (x) { return !x.machine && x.supplier === sup && x.enhanced === id; }); };
  C.per = function (part) { return part.uom === 'each' ? 'each' : 'per ' + part.uom; };
  // the unit a part is being bought for: the work order's unit, else the unit chosen in the search context
  C.unit = function (wo) {
    var w = C.wo(wo);
    if (w) return SE.asset(w.equip) || null;
    var c = SE.ctx();
    return c.equip ? SE.asset(c.equip) || null : c.serial ? SE.asset(c.serial) || null : null;
  };
  // serial-priced parts show price and availability only with a serial of their own model in context
  // (a work order's unit counts: a WO-scoped route resolves the price)
  C.priceOk = function (part, unit) { return !part.serialPricing || !!(unit && unit.model === part.machine); };
  C.addable = function (part, unit) { return !part.supersededBy && C.priceOk(part, unit); };
  C.priceCell = function (part, unit) { return C.priceOk(part, unit) ? SE.money(part.price) : '<span class="need-serial">Serial needed</span>'; };
  C.quickBtn = function (part, unit) {
    if (!C.addable(part, unit)) return '<span class="q-none">' + (part.supersededBy ? 'Replaced' : 'Pick unit') + '</span>';
    return '<button class="btn btn-secondary q-add" type="button" data-quick="' + part.pn + '" aria-label="Add ' + esc(part.name) + ' to cart">' + icon('plus-small') + '<span class="q-add-l">Add</span></button>';
  };
  C.quickAdd = function (pn, wo) { var unit = C.unit(wo); SE.addToCart(pn, 1, wo || null, { unit: unit && unit.equip, serial: unit && unit.serial }); SE.toast('Added to cart', 'shopping-cart'); };

  // ---------- catalog tree (left panel). cur: { sup, m, cat, sub, line }. Only the current path is open
  // (opening a node closes its siblings); 4 levels at most: supplier, model, assembly group, sub-assembly.
  C.tree = function (cur, wo) {
    var D = SE.data, q = C.woQ(wo);
    function node(level, label, href, on, count, open, kids, off) {
      var inner = '<span class="tn-label">' + esc(label) + '</span>' + (count != null ? '<span class="tn-n">' + count + '</span>' : '');
      var exp = kids != null ? icon(open ? 'angle-small-down' : 'angle-small-right', 'tn-chev') : '<span class="tn-chev sp" aria-hidden="true"></span>';
      var el = off ? '<span class="tn off" aria-disabled="true">' + exp + inner + '<span class="tn-soon">Soon</span></span>'
        : '<a class="tn" href="' + href + '"' + (on ? ' aria-current="page"' : '') + (kids != null ? ' aria-expanded="' + open + '"' : '') + '>' + exp + inner + '</a>';
      return '<li class="lv' + level + '">' + el + (open && kids ? '<ul>' + kids + '</ul>' : '') + '</li>';
    }
    var sups = D.suppliers.filter(function (s) { return s.active; }).map(function (s) {
      var sOpen = s.id === cur.sup;
      var kids = '';
      if (sOpen) {
        kids += s.machines.map(function (k) {
          var m = SE.machine(k), mOpen = k === cur.m;
          var cats = !mOpen ? '' : m.categories.map(function (c) {
            if (!c.live) return node(3, c.name, '', false, null, false, null, true);
            var parts = D.parts.filter(function (x) { return x.machine === k && x.cat === c.id; }), subs = [];
            parts.forEach(function (x) { if (subs.indexOf(x.sub) < 0) subs.push(x.sub); });
            var cOpen = c.id === cur.cat;
            var subN = !cOpen ? '' : subs.map(function (sb) {
              return node(4, sb, '#/category?m=' + k + '&cat=' + c.id + '&sub=' + encodeURIComponent(sb) + q, sb === cur.sub, parts.filter(function (x) { return x.sub === sb; }).length);
            }).join('');
            return node(3, c.name, '#/category?m=' + k + '&cat=' + c.id + q, cOpen && !cur.sub, parts.length, cOpen, subN);
          }).join('');
          return node(2, m.model, '#/machine?m=' + k + q, mOpen && !cur.cat, m.units.length + ' units', mOpen, cats);
        }).join('');
        kids += '<li class="tn-group" aria-hidden="true">' + esc(s.name) + ' lines</li>' + C.lines(s.id).map(function (l) {
          return node(2, l[1], '#/supplier?sup=' + s.id + '&line=' + l[0] + q, l[0] === cur.line, C.lineItems(s.id, l[0]).length);
        }).join('');
      }
      return node(1, s.name, '#/supplier?sup=' + s.id + q, sOpen && !cur.m && !cur.line, null, sOpen, kids);
    }).join('');
    return '<nav class="ctree" aria-label="Catalog tree"><p class="ctree-h"><a href="#/catalog' + (wo ? '?wo=' + encodeURIComponent(wo) : '') + '">' + icon('grid-alt') + 'Parts catalog</a></p><ul>' + sups + '</ul></nav>';
  };
  // page body with the tree beside it; under 960px of content the tree folds away and the breadcrumb leads
  C.layout = function (cur, wo, main) {
    return '<div class="cat-layout"><aside class="ctree-col">' + C.tree(cur, wo) + '</aside><div class="cat-main">' + main + '</div></div>';
  };
})();

SE.titles.catalog = 'Parts catalog';
SE.views.catalog = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var total = SE.assets().length;
  var models = Object.keys(D.machines).sort(function (a, b) { return D.machines[b].units.length - D.machines[a].units.length; });
  var fleet = models.map(function (k) {
    var m = D.machines[k], s = SE.supplier(m.supplier);
    return '<li><a class="mach-card fleet-card" href="#/machine?m=' + k + C.woQ(p.wo) + '">' + UI.thumb() + '<span><b>' + esc(m.name) + '</b><small>' + esc(s.name) + ' · ' + esc(m.type) + '</small><small>' + (m.schematic ? 'Interactive diagram' : 'Image with callouts') + '</small></span>' +
      '<span class="fc-count"><b>' + m.units.length + '</b><small>units</small></span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var cards = D.suppliers.map(function (s) {
    if (!s.active) return '<li><div class="sup-card off" aria-disabled="true"><div class="sc-top">' + C.badge(s) + SE.chip('Not connected', 'neutral') + '</div><b>' + esc(s.name) + '</b><span>' + esc(s.tagline) + '</span></div></li>';
    return '<li><a class="sup-card" href="#/supplier?sup=' + s.id + C.woQ(p.wo) + '"><div class="sc-top">' + C.badge(s) + '<span class="sc-units">' + C.units(s) + ' units in fleet</span></div>' +
      '<b>' + esc(s.name) + '</b><span>' + esc(s.tagline) + ' · ' + s.machines.length + ' model, ' + C.lines(s.id).length + ' own lines</span><span class="sc-go">Browse catalog' + icon('arrow-small-right') + '</span></a></li>';
  }).join('');
  var s = SE.shell(el, {
    nav: 'catalog', title: 'Parts catalog', crumbs: [['Home', 'home']],
    sub: 'Your fleet first, then browse by supplier, model, assembly group and sub-assembly. 2 connected catalogs.',
    body: C.woBanner(p.wo) +
      UI.sec('Your fleet · ' + total + ' units', '', '<ul class="mach-grid fleet-grid">' + fleet + '</ul>', 'h-fleet') +
      UI.sec('Suppliers in your network · ' + D.suppliers.length, '<span class="sec-note">JLG and Skyjack are connected to Mid-County Rental</span>', '<ul class="sup-grid">' + cards + '</ul>', 'h-sups'),
  });
  return s.cleanup;
};
