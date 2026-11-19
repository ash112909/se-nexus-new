/* Company Catalog — internal parts, supplies, and equipment stocked by the operator.
   Not tied to a supplier or machine model; browsable by internal category.
   #/company-catalog   #/company-catalog?cat=shop-supplies */
SE.titles['company-catalog'] = 'Company Catalog';
SE.views['company-catalog'] = function (el, p) {
  var esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');

  var CATS = [
    { id: 'shop-supplies',   name: 'Shop Supplies',         icon: 'box',              count: 48,  desc: 'Consumables, lubricants, fluids, cleaning agents' },
    { id: 'safety',          name: 'Safety Equipment',      icon: 'shield-check',     count: 32,  desc: 'PPE, inspection tags, fall protection harnesses' },
    { id: 'standard-parts',  name: 'Standard Stock Parts',  icon: 'grid-alt',         count: 124, desc: 'High-turn wear parts kept on-hand for fast repair' },
    { id: 'tools',           name: 'Tools & Equipment',     icon: 'settings',         count: 67,  desc: 'Service tools, test equipment, special tooling' },
    { id: 'hardware',        name: 'Fasteners & Hardware',  icon: 'settings-sliders', count: 211, desc: 'Nuts, bolts, pins, clips, and retaining hardware' },
    { id: 'docs',            name: 'Internal Documents',    icon: 'document',         count: 18,  desc: 'Inspection forms, checklists, internal specs' }
  ];

  var totalItems = CATS.reduce(function (n, c) { return n + c.count; }, 0);

  var catCards = CATS.map(function (c) {
    return '<a class="sup-pf-card card" href="#/company-catalog?cat=' + esc(c.id) + '">' +
      '<span class="sup-pf-icon">' + icon(c.icon) + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(c.name) + '</b><small>' + esc(c.desc) + '</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');

  var RECENT = [
    { pn: 'MC-FLT-5W30-1Q',    name: 'Motor oil 5W-30, 1 qt',           cat: 'Shop Supplies', added: 'Nov 2026' },
    { pn: 'MC-HAR-M12-50',      name: 'Hex bolt M12 × 1.75 × 50 mm',    cat: 'Fasteners',     added: 'Oct 2026' },
    { pn: 'MC-SAF-VEST-HV',     name: 'Hi-vis safety vest, class 2',     cat: 'Safety',        added: 'Oct 2026' },
    { pn: 'MC-FLT-HYD-ISO46',   name: 'Hydraulic fluid ISO 46, 5 gal',  cat: 'Shop Supplies', added: 'Sep 2026' },
    { pn: 'MC-STD-FILT-AIR-01', name: 'Air filter, universal pre-clean', cat: 'Stock Parts',   added: 'Sep 2026' }
  ];

  var recentRows = RECENT.map(function (r) {
    return '<tr>' +
      '<td><b>' + esc(r.pn) + '</b><span class="pn-name">' + esc(r.name) + '</span></td>' +
      '<td><span class="chip t-neutral">' + esc(r.cat) + '</span></td>' +
      '<td class="muted">' + esc(r.added) + '</td>' +
    '</tr>';
  }).join('');

  var body =
    UI.sec('Categories',
      '<span class="muted">' + CATS.length + ' categories · ' + totalItems + ' items</span>',
      '<div class="sup-pf-grid">' + catCards + '</div>', 'h-cats') +
    UI.sec('Recently added', '',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th scope="col">Part</th><th scope="col">Category</th><th scope="col">Added</th>' +
      '</tr></thead><tbody>' + recentRows + '</tbody></table></div>', 'h-recent');

  var s = SE.shell(el, {
    nav: 'catalog', title: 'Company Catalog', wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Internal parts, supplies, and equipment stocked by your operation',
    body: C.layout({ extra: 'company-catalog' }, p.wo, body)
  });

  return s.cleanup;
};
