/* Category (B2, DES-44 assembly group and sub-assembly, DES-46 diagram views), web. The parts of 1 assembly
   group in a table grouped by sub-assembly (part number, description, price, stock); a row opens the part
   card in the side panel (SE.partDetail, js/views/part.js). The panel's part is in the URL.
   View control: List is the default for every model. "Diagram" only where the model has schematic data
   (1930ES: generic schematic, numbered areas show their parts with quick add); a model without it (SJIII
   3219) offers "Image" instead: the supplier's static image (hatched slot) and the numbered callout list.
   Catalog tree on the left (4 levels); a sub-assembly (level 4) narrows the table and joins the breadcrumb.
   #/category?m=1930ES&cat=hyd   &view=diagram|image   &sub=Lift%20cylinder   &pn=JLG-4120-118 (panel)   &wo=100118 */
SE.titles.category = 'Category';
SE.views.category = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  if (!D.machines[p.m]) { var missing = SE.shell(el, { nav: 'catalog', title: 'Model not found', body: UI.empty({ icon: 'exclamation', title: 'Model not found', text: 'Choose a model from the catalog.', action: '<a class="btn btn-secondary" href="#/catalog">Browse catalog</a>' }) }); return missing.cleanup; }
  var key = p.m, m = SE.machine(key), s = SE.supplier(m.supplier);
  var cat = m.categories.find(function (c) { return c.id === p.cat && c.live; });
  if (!cat) { var missingCat = SE.shell(el, { nav: 'catalog', title: 'Category not found', body: UI.empty({ icon: 'exclamation', title: 'Category not found', text: 'This assembly group is unavailable for the selected model.', action: '<a class="btn btn-secondary" href="#/machine?m=' + esc(key) + '">Back to model</a>' }) }); return missingCat.cleanup; }
  var parts = D.parts.filter(function (x) { return x.machine === key && x.cat === cat.id; });
  var subs = [];
  parts.forEach(function (x) { if (subs.indexOf(x.sub) < 0) subs.push(x.sub); });
  var alt = m.schematic ? 'diagram' : 'image';
  var view = p.view === alt ? alt : 'list';
  var sub = subs.indexOf(p.sub) >= 0 ? p.sub : null;
  var sel = parts.some(function (x) { return x.pn === p.pn; }) ? p.pn : null, wo = p.wo || null, unbind = null;
  if ((p.pn && !sel) || (p.sub && !sub)) { var missingPart = SE.shell(el, { nav: 'catalog', title: 'Record not found', body: UI.empty({ icon: 'exclamation', title: 'Record not found', text: 'That part or subassembly is not in this category.', action: '<a class="btn btn-secondary" href="#/category?m=' + esc(key) + '&cat=' + esc(cat.id) + '">Back to category</a>' }) }); return missingPart.cleanup; }
  var unit = C.unit(wo);

  // compact table so it fits beside the tree and the part panel: part number over its name, price over stock
  function table(list, quick) {
    var num = quick && view === 'image', cols = 2 + (num ? 1 : 0) + (quick ? 1 : 0);
    var groups = subs.filter(function (sb) { return list.some(function (x) { return x.sub === sb; }); });
    return '<div class="tbl-wrap"><table class="tbl cat-tbl"><thead><tr>' + (num ? '<th scope="col" class="num">No.</th>' : '') + '<th scope="col">Part</th><th scope="col" class="num">Price and stock</th>' + (quick ? '<th scope="col" aria-label="Add to cart"></th>' : '') + '</tr></thead><tbody>' +
      (view === 'image' ? rows(list, quick) : groups.map(function (sb) {
        return '<tr class="grp"><th colspan="' + cols + '" scope="colgroup">' + esc(sb) + '</th></tr>' + rows(list.filter(function (x) { return x.sub === sb; }), quick);
      }).join('')) + '</tbody></table></div>';
  }
  function rows(list, quick) {
    return list.map(function (x) {
      var n = x._n, ok = C.priceOk(x, unit);
      return '<tr data-row data-pn="' + x.pn + '" tabindex="0" aria-selected="' + (x.pn === sel) + '">' + (n != null ? '<td class="num co-td"><span class="co-num">' + n + '</span></td>' : '') +
        '<td class="cell-pn"><span class="pn-link">' + esc(x.pn) + '</span><span class="pn-name">' + esc(x.name) + '</span></td>' +
        '<td class="num cell-price">' + (ok ? '<b>' + SE.money(x.price) + '</b>' + SE.ui.stock(x) : '<span class="need-serial">Serial needed</span><span class="pn-name">Pick a unit</span>') + '</td>' +
        (quick ? '<td class="q-cell">' + C.quickBtn(x, unit) + '</td>' : '') + '</tr>';
    }).join('');
  }
  // ---------- generic schematic (same drawing as the iPhone build)
  var FLOW = ['tank', 'pump', 'valve', 'hose'];
  var CELLS = [{ x: 10, y: 12 }, { x: 124, y: 12 }, { x: 10, y: 124 }, { x: 124, y: 124 }];
  function slotOf(name) {
    var n = name.toLowerCase();
    return /cylinder/.test(n) ? 'cyl' : /pump|motor/.test(n) ? 'pump' : /valve|pressure|control|manifold/.test(n) ? 'valve' : /tank|filt/.test(n) ? 'tank' : 'hose';
  }
  function wrap(label, max) {
    var out = [''];
    label.split(' ').forEach(function (w) { var l = out[out.length - 1]; if (l && (l + ' ' + w).length > max) out.push(w); else out[out.length - 1] = l ? l + ' ' + w : w; });
    return out;
  }
  function schematic() {
    var at = {}, rects = {};
    subs.forEach(function (sb, i) { at[slotOf(sb)] = { sub: sb, n: i + 1 }; });
    var cell = 0;
    FLOW.forEach(function (k) { if (at[k]) { var c = CELLS[cell++]; rects[k] = { x: c.x, y: c.y, w: 100, h: 100 }; } });
    if (at.cyl) rects.cyl = { x: 238, y: 12, w: 92, h: 212 };
    function mid(k) { var r = rects[k]; return [r.x + r.w / 2, r.y + r.h / 2]; }
    var lines = '';
    function link(a, b, dashed) { var A = mid(a), B = mid(b); lines += '<path d="M' + A[0] + ' ' + A[1] + ' L' + B[0] + ' ' + A[1] + ' L' + B[0] + ' ' + B[1] + '" class="dg-line' + (dashed ? ' dashed' : '') + '"/>'; }
    var chain = ['tank', 'pump', 'valve'].filter(function (k) { return at[k]; });
    for (var i = 1; i < chain.length; i++) link(chain[i - 1], chain[i]);
    if (at.cyl && chain.length) link(chain[chain.length - 1], 'cyl');
    if (at.hose && at.cyl) link('hose', 'cyl', true);
    var boxes = Object.keys(rects).map(function (k) {
      var r = rects[k], a = at[k], on = sub === a.sub, n = parts.filter(function (x) { return x.sub === a.sub; }).length;
      var lab = wrap(a.sub, k === 'cyl' ? 9 : 12), ty = r.y + r.h / 2 - (lab.length - 1) * 8 + 4;
      return '<g class="dg-box' + (on ? ' on' : '') + (sub && !on ? ' dim' : '') + '" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + a.n + ', ' + esc(a.sub) + ', ' + n + ' parts" data-sub="' + esc(a.sub) + '">' +
        '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="10"/>' +
        '<circle cx="' + (r.x + 17) + '" cy="' + (r.y + 17) + '" r="12" class="dg-num"/><text x="' + (r.x + 17) + '" y="' + (r.y + 21.5) + '" class="dg-num-t">' + a.n + '</text>' +
        lab.map(function (l, i) { return '<text x="' + (r.x + r.w / 2) + '" y="' + (ty + i * 16) + '" class="dg-lab">' + esc(l) + '</text>'; }).join('') +
        '<text x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h - 12) + '" class="dg-sub">' + n + ' part' + (n === 1 ? '' : 's') + '</text></g>';
    }).join('');
    return '<figure class="diagram"><svg viewBox="0 0 340 236" role="group" aria-label="' + esc(cat.name) + ' schematic, generic">' + lines + boxes + '</svg>' +
      '<figcaption>Generic schematic, not to scale. Select a numbered area to see its parts.</figcaption></figure>';
  }
  function body() {
    var seg = UI.seg('View', [['list', 'List'], [alt, m.schematic ? 'Diagram' : 'Image']], view);
    var head = '<div class="cat-bar">' + seg + '<span class="cat-meta">' + subs.length + ' sub-assemblies · ' + parts.length + ' parts</span>' +
      (sub && view !== 'image' ? '<span class="sub-on">' + esc(sub) + '<a href="' + url({ sub: null, pn: null }) + '" aria-label="Show all sub-assemblies">' + icon('cross-small') + '</a></span>' : '') + '</div>';
    var list = sub ? parts.filter(function (x) { return x.sub === sub; }) : parts;
    if (view === 'diagram') {
      return head + '<div class="dg-split">' + schematic() + '<div class="dg-parts">' +
        (sub ? '<p class="dg-title">' + esc(sub) + ' · ' + list.length + ' parts</p>' + table(list, true) : '<div class="panel-empty dg-empty"><b>Select an area</b><p>Its parts open here with price and stock, ready to add to the cart.</p></div>') + '</div></div>';
    }
    if (view === 'image') {
      var calls = (m.callouts || []).map(function (c) { var x = SE.part(c[1]); return x ? Object.assign({ _n: c[0] }, x) : null; }).filter(Boolean);
      return head + '<div class="co-split"><figure class="co-figure">' + UI.imgSlot(m.name + ' ' + cat.name.toLowerCase() + ' exploded view (from ' + s.name + ')', 280) +
        '<figcaption>' + esc(s.name) + ' exploded view. The numbers on the image match the callout list.</figcaption></figure>' +
        '<div class="co-list"><p class="dg-title">Callouts · ' + calls.length + '</p>' + table(calls, true) + '</div></div>';
    }
    return head + table(list, false);
  }
  function panel() {
    if (!sel) return '';
    var part = SE.part(sel);
    return UI.panelHead(part.name, esc(part.pn)) + '<div class="panel-body">' + SE.partDetail(part, { wo: wo }) + '<a class="pd-full" href="#/part?pn=' + part.pn + C.woQ(wo) + '">Open as a page' + icon('arrow-small-right') + '</a></div>';
  }
  function url(o) {
    var q = { m: key, cat: cat.id }, st = Object.assign({ view: view === 'list' ? null : view, sub: sub, pn: sel, wo: wo }, o || {});
    Object.keys(st).forEach(function (k) { if (st[k]) q[k] = st[k]; });
    return '#/category?' + new URLSearchParams(q);
  }
  var crumbs = [['Parts catalog', 'catalog' + (wo ? '?wo=' + wo : '')], [s.name, 'supplier?sup=' + s.id + C.woQ(wo)], [m.model, 'machine?m=' + key + C.woQ(wo)]];
  if (sub) crumbs.push([cat.name, 'category?m=' + key + '&cat=' + cat.id + C.woQ(wo)]);
  var sh = SE.shell(el, {
    nav: 'catalog', title: sub || cat.name, wide: true, crumbs: crumbs,
    sub: esc(m.name) + ' · ' + (sub ? 'sub-assembly of the ' + esc(cat.name.toLowerCase()) + ' · ' : '') + parts.length + ' parts',
    body: C.woBanner(wo) + C.layout({ sup: s.id, m: key, cat: cat.id, sub: sub }, wo,
      '<div class="split cat-split"><div class="cat-list" id="cat-body">' + body() + '</div><aside class="panel" id="cat-panel" aria-label="Part detail"></aside></div>'),
  });
  var panelEl = el.querySelector('#cat-panel'), bodyEl = el.querySelector('#cat-body');
  function renderPanel(scroll) {
    if (unbind) { unbind(); unbind = null; }
    unit = C.unit(wo);
    panelEl.innerHTML = panel();
    panelEl.hidden = !sel;
    el.querySelector('.cat-split').classList.toggle('no-sel', !sel);
    el.querySelectorAll('tr[data-row]').forEach(function (r) { r.setAttribute('aria-selected', String(r.dataset.pn === sel)); });
    if (sel) unbind = SE.partDetailBind(panelEl.querySelector('.pd'), SE.part(sel), {
      wo: wo,
      pick: function (pn, w) { if (w) wo = w; choose(pn, true); },
      refresh: function (w) { wo = w; history.replaceState(null, '', url()); renderBody(); renderPanel(); },
    });
    if (scroll && sel && sh.content.clientWidth < 1024) panelEl.scrollIntoView({ block: 'start', behavior: SE.reducedMotion ? 'auto' : 'smooth' });
  }
  function renderBody() { unit = C.unit(wo); bodyEl.innerHTML = body(); }
  function choose(pn, scroll) {
    var inCat = parts.some(function (x) { return x.pn === pn; });
    if (!inCat) { SE.go('part', { params: wo ? { pn: pn, wo: wo } : { pn: pn } }); return; }
    sel = pn;
    history.replaceState(null, '', url());
    renderPanel(scroll);
  }
  function pickSub(sb) {
    sub = sub === sb ? null : sb;
    history.replaceState(null, '', url());
    renderBody();
    el.querySelectorAll('tr[data-row]').forEach(function (r) { r.setAttribute('aria-selected', String(r.dataset.pn === sel)); });
  }
  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-panel-close]')) { sel = null; history.replaceState(null, '', url()); renderPanel(); return; }
    var q = e.target.closest('[data-quick]');
    if (q) { C.quickAdd(q.dataset.quick, wo); return; }
    var sg = e.target.closest('[data-seg]');
    if (sg && bodyEl.contains(sg)) { view = sg.dataset.seg; if (view !== 'diagram') sub = view === 'image' ? null : sub; history.replaceState(null, '', url()); renderBody(); return; }
    var g = e.target.closest('.dg-box[data-sub]');
    if (g) { pickSub(g.dataset.sub); return; }
    var r = e.target.closest('tr[data-row]');
    if (r) choose(r.dataset.pn, true);
  });
  el.addEventListener('keydown', function (e) {
    var t = e.target.closest && e.target.closest('tr[data-row], .dg-box[data-sub]');
    if (!t || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    if (t.matches('.dg-box')) pickSub(t.dataset.sub); else choose(t.dataset.pn, true);
  });
  renderPanel();
  return function () { if (unbind) unbind(); sh.cleanup(); };
};
