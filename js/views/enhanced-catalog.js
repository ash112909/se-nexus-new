/* Enhanced Catalog — alternative catalog structure for suppliers whose parts don't map
   to the machine → category hierarchy. Parts carry richer data (images, full descriptions,
   cross-references, fitment ranges, specs) and are organized by the supplier's own categories.
   #/enhanced-catalog
   #/enhanced-catalog?sup=JLG
   #/enhanced-catalog?sup=JLG&cat=hydraulics   (+ &wo=) */
SE.titles['enhanced-catalog'] = 'Enhanced Catalog';
SE.views['enhanced-catalog'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');
  var eQ   = 'enhanced-catalog' + (p.wo ? '?wo=' + p.wo : '');

  // per-supplier category definitions
  var ECATS = {
    JLG: [
      { id: 'drive',      name: 'Drive & Mobility',      icon: 'settings-sliders', desc: 'Motors, wheels, drive assemblies, brakes' },
      { id: 'hydraulics', name: 'Hydraulic Systems',     icon: 'pulse',            desc: 'Pumps, cylinders, valves, hoses, fittings' },
      { id: 'electrical', name: 'Electrical & Controls', icon: 'dashboard',        desc: 'Controllers, wiring, sensors, switches' },
      { id: 'platform',   name: 'Structural & Platform', icon: 'grid-alt',         desc: 'Platform, guardrails, pins, structural hardware' }
    ],
    SKJ: [
      { id: 'drive',     name: 'Drive Components',    icon: 'settings-sliders', desc: 'Drive motors, wheels, hub assemblies' },
      { id: 'structure', name: 'Platform & Structure', icon: 'grid-alt',         desc: 'Scissor arms, decks, guardrails, pins' },
      { id: 'electrical',name: 'Electrical Systems',  icon: 'dashboard',        desc: 'Control boards, cables, sensors, valves' },
      { id: 'fluids',    name: 'Consumables & Fluids', icon: 'box',              desc: 'Hydraulic fluid, lubricants, return filters' }
    ]
  };

  // per-supplier enhanced parts by category
  var EPARTS = {
    JLG: {
      drive: [
        { pn: 'JLG-1001097838', name: 'Drive motor, front',
          desc: 'OEM front drive motor for 1930ES and 2030ES platforms. 24V DC, 500W continuous duty, IP65 rated. Direct bolt-on replacement, no adapters.',
          model: '1930ES / 2030ES', xrefs: 2, price: '$342.00' },
        { pn: 'JLG-1001092441', name: 'Drive wheel, foam-filled',
          desc: 'Non-marking foam-filled 15×5 drive wheel on OEM hub. No flat risk; identical footprint to pneumatic.',
          model: '1930ES', xrefs: 1, price: '$187.00' },
        { pn: 'JLG-4320282', name: 'Brake assembly, rear axle',
          desc: 'Spring-applied, electrically released rear brake assembly. Complete unit with hardware. No field calibration required.',
          model: '3246R', xrefs: 1, price: '$512.00' }
      ],
      hydraulics: [
        { pn: 'JLG-4821477', name: 'Hydraulic pump assembly',
          desc: 'OEM gear pump, SAE B 2-bolt flange. 2.8 cc/rev, rated to 3,000 psi. Ships with new shaft seal and O-ring kit.',
          model: '3246R', xrefs: 2, price: '$1,241.00' },
        { pn: 'JLG-4821398', name: 'Lift cylinder, main',
          desc: 'Single-acting main lift cylinder. Chrome-plated bore, integrated end cushioning. Tested to 1.5× rated pressure before shipment.',
          model: '1930ES', xrefs: 0, price: '$867.00' },
        { pn: 'JLG-4820991', name: 'Counterbalance valve kit',
          desc: 'OEM counterbalance valve set for primary and secondary circuits. Required for annual inspection compliance on 1930ES.',
          model: '1930ES / 2030ES', xrefs: 1, price: '$214.00' }
      ],
      electrical: [
        { pn: 'JLG-5700098', name: 'Platform control module (rev B)',
          desc: 'CAN bus platform controller, second-generation. Replaces discontinued JLG-5700034. Firmware included, no laptop required for swap.',
          model: '1930ES / 2030ES', xrefs: 1, price: '$887.00' },
        { pn: 'JLG-1001144870', name: 'Battery charger 24V',
          desc: 'On-board 24V 30A DIN-mount charger. 110–240V AC auto-sensing input, three-stage charge profile, thermal shutdown protection.',
          model: '1930ES', xrefs: 1, price: '$198.00' },
        { pn: 'JLG-1001100204', name: 'Joystick controller',
          desc: 'Proportional joystick assembly with wrist-strap deadman. Replaces the discontinued single-axis version. Hall-effect sensing, sealed to IP67.',
          model: '1930ES / 3246R', xrefs: 0, price: '$312.00' }
      ],
      platform: [
        { pn: 'JLG-1001209944', name: 'Platform extension, slide-out',
          desc: 'OEM slide-out extension deck, 610 mm width gain. Rated 113 kg. Ships with locking pin and step-plate hardware.',
          model: '3246R2', xrefs: 0, price: '$2,105.00' },
        { pn: 'JLG-4318009', name: 'Guardrail section, mid-rail',
          desc: 'Bolt-on aluminum mid-rail replacement. OEM extrusion profile; powder-coated safety yellow.',
          model: '1930ES / 2030ES / 3246R', xrefs: 1, price: '$144.00' }
      ]
    },
    SKJ: {
      drive: [
        { pn: 'SKJ-153899', name: 'Drive wheel assembly (rev)',
          desc: 'Updated drive wheel assembly with improved bearing seal. Direct replacement for discontinued SKJ-153721. Longer service interval.',
          model: 'SJIII 3219', xrefs: 1, price: '$312.00' },
        { pn: 'SKJ-156024', name: 'Hub motor, 24V',
          desc: 'Brushless DC in-wheel hub motor, IP54. Plug-and-play harness connector. 20% higher continuous torque vs. prior generation.',
          model: 'SJIII 3219', xrefs: 2, price: '$428.00' }
      ],
      structure: [
        { pn: 'SKJ-158432', name: 'Scissor arm pin kit',
          desc: 'Full set of 4 grade-8 steel arm pivot pins with cotter pins and flat washers. Recommended replacement interval every 2,000 hours.',
          model: 'SJIII 3219 / 3220', xrefs: 1, price: '$89.00' },
        { pn: 'SKJ-162990', name: 'Platform extension deck',
          desc: 'Aluminum slide-out extension, 1.8 m. 160 kg working load. OEM locking mechanism; no field modifications needed.',
          model: 'SJIII 3219', xrefs: 2, price: '$1,756.00' },
        { pn: 'SKJ-159102', name: 'Folding guardrail set',
          desc: '3-piece folding guardrail. Slots into OEM mid-rail channel without tools. Ships as a complete set with all hardware.',
          model: 'SJIII 3219 / 3220', xrefs: 0, price: '$341.00' }
      ],
      electrical: [
        { pn: 'SKJ-168504', name: 'Control board, ground (rev B)',
          desc: 'Updated ground-station control board with extended CAN bus diagnostics. Replaces SKJ-168450. Firmware pre-loaded at factory.',
          model: 'SJIII 3219', xrefs: 1, price: '$432.00' },
        { pn: 'SKJ-171003', name: 'Emergency lowering valve',
          desc: 'Normally-closed solenoid valve, 24V coil, manual override. Installed with no special tooling; O-ring kit included.',
          model: 'SJIII 3219 / 3220', xrefs: 0, price: '$98.00' }
      ],
      fluids: [
        { pn: 'SKJ-FLUID-HYD-5G', name: 'Hydraulic fluid ISO 46, 5 gal',
          desc: 'OEM-spec all-season hydraulic fluid. Anti-wear, anti-foam, wide-temperature range. 5-gallon pail with tamper-evident lid.',
          model: 'All Skyjack models', xrefs: 2, price: '$74.00' },
        { pn: 'SKJ-FILTER-HYD-01', name: 'Hydraulic return filter',
          desc: 'Spin-on return-line filter, 10-micron cellulose element. OEM thread pattern. Replace every 500 hours or annually.',
          model: 'SJIII 3219 / 3220', xrefs: 1, price: '$38.00' }
      ]
    }
  };

  function partCard(x, unit) {
    return '<div class="ecat-part-card card">' +
      '<div class="ecat-part-img">' + UI.thumb() + '</div>' +
      '<div class="ecat-part-body">' +
        '<b class="ecat-part-pn">' + esc(x.pn) + '</b>' +
        '<span class="ecat-part-name">' + esc(x.name) + '</span>' +
        '<p class="ecat-part-desc">' + esc(x.desc) + '</p>' +
        '<span class="ecat-part-model">' + icon('grid-alt') + esc(x.model) + '</span>' +
      '</div>' +
      '<div class="ecat-part-foot">' +
        '<div class="ecat-part-badges">' +
          (x.xrefs > 0 ? SE.chip(x.xrefs + (x.xrefs > 1 ? ' alternates' : ' alternate'), 'neutral') : '') +
        '</div>' +
        '<div class="ecat-part-actions">' +
          '<span class="ecat-part-price">' + esc(x.price) + '</span>' +
          C.quickBtn(x, unit) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- category-level view: ?sup=JLG&cat=hydraulics ----
  if (p.sup && p.cat) {
    var sup = SE.supplier(p.sup);
    var edata = sup && EPARTS[sup.id] ? EPARTS[sup.id] : null;
    if (!sup || !edata) { SE.go('enhanced-catalog'); return function () {}; }
    var catList = ECATS[sup.id] || [];
    var cat = catList.find(function (c) { return c.id === p.cat; });
    var parts = edata[p.cat] || [];
    var unit = C.unit(p.wo);
    var sh = SE.shell(el, {
      nav: 'catalog', title: (cat ? cat.name : p.cat) + ' · ' + sup.name, wide: true,
      crumbs: [['Parts catalog', catQ], ['Enhanced Catalog', eQ], [sup.name, 'enhanced-catalog?sup=' + sup.id + (p.wo ? '&wo=' + p.wo : '')]],
      sub: sup.name + (cat ? ' · ' + cat.desc : ''),
      body: C.layout({ extra: 'enhanced-catalog', esup: sup.id, ecat: p.cat }, p.wo,
        UI.sec(cat ? cat.name : p.cat, '<span class="muted">' + parts.length + ' parts</span>',
          '<div class="ecat-part-grid">' + parts.map(function (x) { return partCard(x, unit); }).join('') + '</div>', 'h-parts'))
    });
    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
    });
    return sh.cleanup;
  }

  // ---- supplier-level view: ?sup=JLG ----
  if (p.sup) {
    var sup = SE.supplier(p.sup);
    var catList = sup && ECATS[sup.id] ? ECATS[sup.id] : null;
    if (!sup || !catList) { SE.go('enhanced-catalog'); return function () {}; }
    var allParts = EPARTS[sup.id] ? Object.keys(EPARTS[sup.id]).reduce(function (a, k) { return a.concat(EPARTS[sup.id][k]); }, []) : [];
    var unit = C.unit(p.wo);
    var catCards = catList.map(function (cat) {
      var cnt = EPARTS[sup.id] && EPARTS[sup.id][cat.id] ? EPARTS[sup.id][cat.id].length : 0;
      return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(sup.id) + '&cat=' + cat.id + (p.wo ? '&wo=' + p.wo : '') + '">' +
        '<span class="sup-pf-icon">' + icon(cat.icon) + '</span>' +
        '<span class="sup-pf-body"><b>' + esc(cat.name) + '</b><small>' + esc(cat.desc) + '</small></span>' +
        '<span class="tn-n">' + cnt + '</span>' +
        icon('angle-small-right') +
      '</a>';
    }).join('');
    var featured = allParts.slice(0, 4);
    var sh = SE.shell(el, {
      nav: 'catalog', title: sup.name + ' Enhanced Catalog', wide: true,
      crumbs: [['Parts catalog', catQ], ['Enhanced Catalog', eQ]],
      sub: sup.name + ' · ' + allParts.length + ' parts with enhanced data across ' + catList.length + ' categories',
      body: C.layout({ extra: 'enhanced-catalog', esup: sup.id }, p.wo,
        UI.sec('Categories', '<span class="muted">' + catList.length + ' categories</span>',
          '<div class="sup-pf-grid">' + catCards + '</div>', 'h-cats') +
        UI.sec('Featured parts', '<span class="muted">' + allParts.length + ' total</span>',
          '<div class="ecat-part-grid">' + featured.map(function (x) { return partCard(x, unit); }).join('') + '</div>', 'h-feat'))
    });
    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
    });
    return sh.cleanup;
  }

  // ---- top-level view ----
  var connSups = D.suppliers ? D.suppliers.filter(function (s) { return s.active && s.status === 'Connected' && ECATS[s.id]; }) : [];
  var allFeatured = [];
  connSups.forEach(function (s) {
    if (!EPARTS[s.id]) return;
    Object.keys(EPARTS[s.id]).forEach(function (k) {
      EPARTS[s.id][k].slice(0, 1).forEach(function (x) {
        allFeatured.push({ sup: s, pn: x.pn, name: x.name, desc: x.desc, model: x.model, xrefs: x.xrefs, price: x.price });
      });
    });
  });
  var unit = C.unit(p.wo);
  var supCards = '<div class="sup-pf-grid">' + connSups.map(function (s) {
    var total = EPARTS[s.id] ? Object.keys(EPARTS[s.id]).reduce(function (n, k) { return n + EPARTS[s.id][k].length; }, 0) : 0;
    return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(s.id) + (p.wo ? '&wo=' + p.wo : '') + '">' +
      '<span class="sup-pf-icon">' + icon('building') + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(s.name) + '</b><small>' + total + ' parts · ' + (ECATS[s.id] ? ECATS[s.id].length : 0) + ' categories</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('') + '</div>';
  var sh = SE.shell(el, {
    nav: 'catalog', title: 'Enhanced Catalog', wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Parts with richer data — full descriptions, images, cross-references — organized by supplier category',
    body: C.layout({ extra: 'enhanced-catalog' }, p.wo,
      UI.sec('Suppliers', '', supCards, 'h-sups') +
      UI.sec('Featured parts', '<span class="muted">across all suppliers</span>',
        '<div class="ecat-part-grid">' + allFeatured.map(function (x) { return partCard(x, unit); }).join('') + '</div>', 'h-feat'))
  });
  el.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
  });
  return sh.cleanup;
};
