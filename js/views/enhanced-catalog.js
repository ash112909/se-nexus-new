/* Enhanced Catalog — richer parts data: cross-references, supersessions, fitment guides,
   technical specs, and reliability data from connected suppliers.
   #/enhanced-catalog */
SE.titles['enhanced-catalog'] = 'Enhanced Catalog';
SE.views['enhanced-catalog'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');

  var FEATURES = [
    { icon: 'swap',           title: 'Cross-references',    desc: 'Find alternate part numbers across OEM, aftermarket, and house brand sources. Identify substitutes when a part is backordered.' },
    { icon: 'layers',         title: 'Supersession chains', desc: 'Track part number changes and replacements across model years so you never order an obsolete number.' },
    { icon: 'chart-histogram',title: 'Fitment guide',       desc: 'Filter parts by machine model, production year, and serial range. Confirm fit before placing an order.' },
    { icon: 'star',           title: 'Enhanced specs',      desc: 'Technical data sheets, material specs, dimensional tolerances, and application notes direct from the OEM.' },
    { icon: 'pulse',          title: 'Reliability data',    desc: 'Failure rates, recommended replacement intervals, and field service bulletins from connected suppliers.' },
    { icon: 'shield-check',   title: 'OEM certification',   desc: 'Know which parts carry OEM warranty coverage and which are approved substitutes for each application.' }
  ];

  var featureCards = FEATURES.map(function (f) {
    return '<div class="ecat-feature card">' +
      '<span class="sup-pf-icon">' + icon(f.icon) + '</span>' +
      '<b>' + esc(f.title) + '</b>' +
      '<p>' + esc(f.desc) + '</p>' +
    '</div>';
  }).join('');

  var connSups = D.suppliers
    ? D.suppliers.filter(function (s) { return s.active && s.status === 'Connected'; }).slice(0, 4)
    : [];

  var supSection = connSups.length
    ? UI.sec('Connected suppliers with enhanced data', '',
        '<div class="sup-pf-grid">' + connSups.map(function (s) {
          return '<a class="sup-pf-card card" href="#/supplier?sup=' + esc(s.id) + '">' +
            '<span class="sup-pf-icon">' + icon('building') + '</span>' +
            '<span class="sup-pf-body"><b>' + esc(s.name) + '</b><small>' + esc(s.tagline) + '</small></span>' +
            icon('angle-small-right') +
          '</a>';
        }).join('') + '</div>', 'h-sups')
    : '';

  var body =
    UI.sec('What\'s included', '',
      '<div class="ecat-features">' + featureCards + '</div>', 'h-features') +
    supSection;

  var s = SE.shell(el, {
    nav: 'catalog', title: 'Enhanced Catalog', wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Cross-references, supersessions, fitment guides, and technical specs',
    body: C.layout({ extra: 'enhanced-catalog' }, p.wo, body)
  });

  return s.cleanup;
};
