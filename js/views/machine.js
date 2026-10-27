/* Machine (B2, DES-44 model landing page), web. The model is a destination, not just a tree node: image
   slot and specs, a summary of your units (status, branches, the ones that need attention, all of them in
   Fleet), the assembly groups (only the hydraulic system is live, the others greyed "Coming soon") with how
   their parts can be viewed (interactive diagram or image with callouts), and the manuals. Tree on the left.
   #/machine?m=1930ES   #/machine?m=SJIII3219&wo=100094 (from a work order: banner, its unit first, wo kept on every link) */
SE.titles.machine = 'Machine';
SE.views.machine = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  if (!D.machines[p.m]) { var missing = SE.shell(el, { nav: 'catalog', title: 'Model not found', body: UI.empty({ icon: 'exclamation', title: 'Model not found', text: 'Choose a model from the catalog.', action: '<a class="btn btn-secondary" href="#/catalog">Browse catalog</a>' }) }); return missing.cleanup; }
  var key = p.m, m = SE.machine(key), s = SE.supplier(m.supplier);
  var w = C.wo(p.wo);
  var docs = D.manuals.filter(function (x) { return x.machine === key; });
  function count(c) { return D.parts.filter(function (x) { return x.machine === key && x.cat === c.id; }).length || c.parts; }
  function n(st) { return m.units.filter(function (u) { return u.status === st; }).length; }
  var where = {};
  m.units.forEach(function (u) { var l = u.location.replace(' Branch', ''); where[l] = (where[l] || 0) + 1; });
  var rank = { Down: 0, 'Service due': 1 };
  var show = m.units.filter(function (u) { return (w && w.equip === u.equip) || rank[u.status] != null; })
    .sort(function (a, b) { return ((w && w.equip === a.equip) ? -1 : rank[a.status]) - ((w && w.equip === b.equip) ? -1 : rank[b.status]); });

  var hero = '<div class="card mach-hero">' +
    '<div class="mh-info"><div class="mh-top"><div><h2>' + esc(m.name) + '</h2><p>' + esc(m.type) + ' · ' + esc(s.name) + '</p></div><span class="mh-units">' + m.units.length + ' units in your fleet</span></div>' +
      '<dl class="specs">' + m.specs.map(function (x) { return '<div><dd>' + esc(x[1]) + '</dd><dt>' + esc(x[0]) + '</dt></div>'; }).join('') + '</dl></div></div>';
  var sum = '<div class="card unit-sum"><dl class="us-stats">' +
      '<div><dd>' + m.units.length + '</dd><dt>Units</dt></div><div><dd>' + n('In service') + '</dd><dt>In service</dt></div><div class="warn"><dd>' + n('Service due') + '</dd><dt>Service due</dt></div><div class="bad"><dd>' + n('Down') + '</dd><dt>Down</dt></div></dl>' +
      '<p class="us-where">' + icon('marker') + Object.keys(where).map(function (l) { return esc(l) + ' ' + where[l]; }).join(' · ') + '</p></div>';
  var units = show.length ? UI.table([['Equip. #'], ['Serial #'], ['Location'], ['Hours', 'num'], ['Last service'], ['Status']], show.map(function (u) {
    return ['<b>' + esc(u.equip) + '</b>' + (w && w.equip === u.equip ? ' <span class="chip t-warning">WO #' + w.id + '</span>' : ''), esc(u.serial), esc(u.location), u.hours.toLocaleString('en-US') + ' h', esc(u.lastService), SE.chip(u.status)];
  }), { cls: 'unit-tbl' }) : '';
  var cats = '<ul class="cat-grid">' + m.categories.map(function (c) {
    if (!c.live) return '<li><div class="cat-card off" aria-disabled="true">' + SE.ui.thumb() + '<span><b>' + esc(c.name) + '</b><small>' + c.parts + ' parts</small></span>' + SE.chip('Coming soon', 'neutral') + '</div></li>';
    return '<li><a class="cat-card" href="#/category?m=' + key + '&cat=' + c.id + C.woQ(p.wo) + '">' + SE.ui.thumb() + '<span><b>' + esc(c.name) + '</b><small>' + count(c) + ' parts · ' + (m.schematic ? 'list or diagram' : 'list or image') + '</small></span>' + icon('angle-small-right') + '</a></li>';
  }).join('') + '</ul>' +
    '<p class="dg-avail">' + icon(m.schematic ? 'layers' : 'picture') + '<span>' + (m.schematic ? 'Diagram available: the schematic\'s numbered areas show their parts, ready to add to the cart.' : 'No interactive diagram for this model: parts are shown on a supplier image with a numbered callout list.') + '</span></p>';
  var docsCard = '<a class="sr-browse card" href="#/manuals?m=' + key + '">' + icon('book-alt') + '<span><b>Manuals</b><small>' + docs.length + ' documents for the ' + esc(m.model) + '</small></span>' + icon('angle-small-right') + '</a>';

  var sh = SE.shell(el, {
    nav: 'catalog', title: m.name, wide: true, crumbs: [['Parts catalog', 'catalog' + (p.wo ? '?wo=' + p.wo : '')], [s.name, 'supplier?sup=' + s.id + C.woQ(p.wo)]],
    sub: esc(m.type) + ' · ' + m.units.length + ' units in your fleet',
    body: C.woBanner(p.wo) + C.layout({ sup: s.id, m: key }, p.wo, hero +
      UI.sec('Your units · ' + m.units.length, '<a class="sec-link" href="#/fleet?q=' + encodeURIComponent(m.model) + '">All ' + m.units.length + ' units in Fleet' + icon('arrow-small-right') + '</a>', sum + (units ? '<p class="us-cap">' + (w ? 'The work order\'s unit and the units that need attention' : 'Units that need attention') + '</p>' + units : ''), 'h-units') +
      UI.sec('Parts catalog · ' + m.categories.length + ' assembly groups', '', cats, 'h-cats') +
      UI.sec('Documents', '', docsCard, 'h-docs')),
  });
  return sh.cleanup;
};
