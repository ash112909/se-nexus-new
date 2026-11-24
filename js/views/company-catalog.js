/* Company Catalog — internal parts, supplies, and equipment stocked by the operator.
   Not tied to a supplier or machine model; browsable by internal category.
   #/company-catalog
   #/company-catalog?cat=shop-supplies
   #/company-catalog?cat=shop-supplies&sub=lubricants   (+ &wo=) */
SE.titles['company-catalog'] = 'Company Catalog';
SE.views['company-catalog'] = function (el, p) {
  var esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ  = 'catalog' + (p.wo ? '?wo=' + p.wo : '');
  var ccQ   = 'company-catalog' + (p.wo ? '?wo=' + p.wo : '');
  var woSfx = p.wo ? '&wo=' + encodeURIComponent(p.wo) : '';

  // category palette (bg / fg, no # prefix)
  var PALETTE = {
    'shop-supplies':  ['dde8dd', '3d6b3d'],
    'safety':         ['f5e8dc', '8c5a2f'],
    'standard-parts': ['dce7f5', '2f4f8c'],
    'tools':          ['ede0f5', '5c2f8c'],
    'hardware':       ['dcf0e8', '2f8c5a'],
    'docs':           ['f5f0dc', '8c792f']
  };
  function imgUrl(cat) {
    var pal = PALETTE[cat] || ['eeeeee', '888888'];
    return 'https://placehold.co/320x240/' + pal[0] + '/' + pal[1];
  }

  var CCATS = [
    { id: 'shop-supplies',  name: 'Shop Supplies',         icon: 'box',              desc: 'Lubricants, fluids, and consumables for routine maintenance',
      subs: [{id:'lubricants',name:'Lubricants & Fluids'},{id:'consumables',name:'Consumables'},{id:'cleaning',name:'Cleaning Agents'}] },
    { id: 'safety',         name: 'Safety Equipment',      icon: 'shield-check',     desc: 'PPE, fall protection, and inspection materials',
      subs: [{id:'ppe',name:'PPE'},{id:'fall-protection',name:'Fall Protection'},{id:'inspection',name:'Inspection & Tags'}] },
    { id: 'standard-parts', name: 'Standard Stock Parts',  icon: 'grid-alt',         desc: 'High-turn wear parts kept on-hand for fast repair',
      subs: [{id:'filters',name:'Filters'},{id:'belts-chains',name:'Belts & Chains'},{id:'bearings',name:'Bearings & Seals'}] },
    { id: 'tools',          name: 'Tools & Equipment',     icon: 'settings',         desc: 'Service tools, test equipment, and special tooling',
      subs: [{id:'hand-tools',name:'Hand Tools'},{id:'test-equip',name:'Test Equipment'},{id:'special-tooling',name:'Special Tooling'}] },
    { id: 'hardware',       name: 'Fasteners & Hardware',  icon: 'settings-sliders', desc: 'Nuts, bolts, pins, clips, and retaining hardware',
      subs: [{id:'bolts-nuts',name:'Bolts & Nuts'},{id:'pins-clips',name:'Pins & Clips'},{id:'washers',name:'Washers & Retaining'}] },
    { id: 'docs',           name: 'Internal Documents',    icon: 'document',         desc: 'Inspection forms, checklists, and internal specifications',
      subs: [{id:'inspection-forms',name:'Inspection Forms'},{id:'checklists',name:'Checklists'},{id:'specs',name:'Internal Specs'}] }
  ];

  var CPARTS = {
    'shop-supplies': {
      lubricants: [
        { pn:'MC-FLT-5W30-1Q',     name:'Motor oil 5W-30, 1 qt',            featured:true,
          desc:'Multi-viscosity engine oil for air-cooled and liquid-cooled platforms. API SN/CF certified. 1-quart bottle.',
          location:'Bin L-01', qty:24, price:'$6.50' },
        { pn:'MC-FLT-HYD-ISO46',   name:'Hydraulic fluid ISO 46, 5 gal',    featured:true,
          desc:'OEM-compatible all-season hydraulic fluid. Anti-wear, wide temperature range. 5-gallon pail.',
          location:'Rack H-04', qty:8, price:'$68.00' },
        { pn:'MC-FLT-HYD-ISO46-1G',name:'Hydraulic fluid ISO 46, 1 gal',
          desc:'Same OEM-spec formulation as 5-gallon pail. 1-gallon bottle for small top-offs.',
          location:'Bin L-02', qty:12, price:'$17.00' },
        { pn:'MC-LUB-GREASE-EP2',  name:'EP2 lithium grease, 400 g',        featured:true,
          desc:'NLGI 2 extreme-pressure lithium grease. Compatible with all grease zerks; use at every 250-hour PM.',
          location:'Bin L-03', qty:30, price:'$12.00' },
        { pn:'MC-LUB-GEAR-90',     name:'Gear oil SAE 90, 1L',
          desc:'API GL-5 gear oil for hub motor gearboxes. Change every 1,000 hours; check level every 250 hours.',
          location:'Bin L-04', qty:6, price:'$16.00' }
      ],
      consumables: [
        { pn:'MC-CONS-RAGS-10',    name:'Shop rags, 10-pack',               featured:true,
          desc:'Reusable cotton shop rags. Pre-washed, lint-free. 10-pack. Use for fluid wipe-down and surface prep.',
          location:'Shelf S-01', qty:50, price:'$8.00' },
        { pn:'MC-CONS-GLOVE-L',    name:'Nitrile gloves, L, 100ct',         featured:true,
          desc:'Blue nitrile disposable gloves, large. Powder-free, 4-mil thickness. 100-count box.',
          location:'Shelf S-02', qty:15, price:'$14.00' },
        { pn:'MC-CONS-GLOVE-XL',   name:'Nitrile gloves, XL, 100ct',
          desc:'Blue nitrile disposable gloves, extra-large. Powder-free, 4-mil thickness. 100-count box.',
          location:'Shelf S-03', qty:10, price:'$14.00' },
        { pn:'MC-CONS-TOWEL-BLUE', name:'Blue shop towels, 2-roll',
          desc:'Heavy-duty blue paper shop towels. 55 sheets per roll. Good for solvent cleaning and fluid absorption.',
          location:'Shelf S-04', qty:20, price:'$9.00' }
      ],
      cleaning: [
        { pn:'MC-CLN-DEGREASER',   name:'Parts degreaser, 1 gal',           featured:true,
          desc:'Fast-drying aqueous parts degreaser. Non-flammable, low VOC. For pre-paint cleaning and bearing removal.',
          location:'Bin C-01', qty:6, price:'$18.00' },
        { pn:'MC-CLN-BRAKE-CLEAN', name:'Brake cleaner, 14 oz aerosol',     featured:true,
          desc:'Chlorinated brake cleaner spray. Fast-drying, residue-free. For rotors, pads, and caliper cleaning.',
          location:'Bin C-02', qty:24, price:'$5.00' },
        { pn:'MC-CLN-CONTACT',     name:'Contact cleaner, 11 oz aerosol',
          desc:'Non-conductive electrical contact cleaner. For connectors, switches, and control boards.',
          location:'Bin C-03', qty:12, price:'$7.00' }
      ]
    },
    'safety': {
      ppe: [
        { pn:'MC-SAF-VEST-HV',    name:'Hi-vis safety vest, class 2',      featured:true,
          desc:'ANSI/ISEA 107 Class 2 high-visibility vest. Zipper front, 2 pockets. Yellow/green polyester mesh.',
          location:'Shelf P-01', qty:20, price:'$12.00' },
        { pn:'MC-SAF-GLASSES',    name:'Safety glasses, clear',             featured:true,
          desc:'ANSI Z87.1 rated clear lens safety glasses. Anti-scratch coating, side shields included.',
          location:'Bin P-02', qty:40, price:'$4.00' },
        { pn:'MC-SAF-EARPLUG',    name:'Foam earplugs, 50-pair',            featured:true,
          desc:'NRR 33 disposable foam earplugs. Required in compressor room and paint bay. 50 pairs per bag.',
          location:'Bin P-03', qty:10, price:'$9.00' },
        { pn:'MC-SAF-HARDHAT',    name:'Hard hat, type 1 class E',
          desc:'White polyethylene hard hat. Type 1, Class E (electrical). 4-point ratchet suspension.',
          location:'Shelf P-04', qty:8, price:'$18.00' }
      ],
      'fall-protection': [
        { pn:'MC-SAF-HARNESS-M',  name:'Full-body harness, M',              featured:true,
          desc:'ANSI Z359.11 full-body fall arrest harness, medium. Front and dorsal D-rings, tongue buckle legs.',
          location:'Shelf FP-01', qty:5, price:'$89.00' },
        { pn:'MC-SAF-HARNESS-L',  name:'Full-body harness, L',              featured:true,
          desc:'ANSI Z359.11 full-body fall arrest harness, large. Front and dorsal D-rings, tongue buckle legs.',
          location:'Shelf FP-02', qty:5, price:'$89.00' },
        { pn:'MC-SAF-LANYARD-6',  name:'Shock-absorbing lanyard, 6 ft',
          desc:'Twin-leg 6-ft energy-absorbing lanyard. ANSI A10.32 compliant. Inspect annually; replace after any arrest event.',
          location:'Shelf FP-03', qty:8, price:'$54.00' }
      ],
      inspection: [
        { pn:'MC-SAF-TAG-OUT',    name:'Out-of-service tags, 25-pack',      featured:true,
          desc:'Red "Do Not Operate" out-of-service tags. 5.75" x 3". Weatherproof card stock. 25-pack.',
          location:'Shelf I-01', qty:15, price:'$7.00' },
        { pn:'MC-SAF-TAG-INSP',   name:'Annual inspection tags, 100-pack',
          desc:'Annual inspection hang tags, pre-numbered. 2-part tear-off stub. 100-count pack.',
          location:'Shelf I-02', qty:5, price:'$22.00' },
        { pn:'MC-SAF-LOCK-RED',   name:'Safety lockout padlock, red',
          desc:'Standard red keyed-different lockout padlock. 1" shackle clearance. For LOTO procedures.',
          location:'Bin I-03', qty:20, price:'$9.00' }
      ]
    },
    'standard-parts': {
      filters: [
        { pn:'MC-STD-FILT-AIR-01', name:'Air filter, universal pre-cleaner',  featured:true,
          desc:'Foam pre-cleaner element, 3-4" ID range. Oil-wetted; wash and re-oil every 100 hours in dusty environments.',
          location:'Rack F-01', qty:12, price:'$8.00' },
        { pn:'MC-STD-FILT-OIL-10', name:'Oil filter, spin-on 10-micron',      featured:true,
          desc:'Standard spin-on engine oil filter. 10-micron cellulose element. Cross-references most Honda GX series.',
          location:'Rack F-02', qty:18, price:'$6.00' },
        { pn:'MC-STD-FILT-HYD-10', name:'Hydraulic return filter, 10-micron', featured:true,
          desc:'Spin-on hydraulic return-line filter. 10-micron, replace every 500 hours or annually.',
          location:'Rack F-03', qty:10, price:'$32.00' },
        { pn:'MC-STD-FILT-FUEL',   name:'Fuel filter, inline',
          desc:'Inline gasoline fuel filter, 1/4" barb fittings. Replace annually or on fuel flow restriction.',
          location:'Bin F-04', qty:20, price:'$5.00' }
      ],
      'belts-chains': [
        { pn:'MC-STD-BELT-AV54',   name:'V-belt, A-section 54"',             featured:true,
          desc:'Standard A-section V-belt, 54-inch OD. Cross-references A54 / 4L560. Check tension every 250 hours.',
          location:'Rack B-01', qty:6, price:'$12.00' },
        { pn:'MC-STD-BELT-BV68',   name:'V-belt, B-section 68"',
          desc:'B-section V-belt, 68-inch OD. Cross-references B68 / 5L700. For high-torque drive applications.',
          location:'Rack B-02', qty:4, price:'$16.00' },
        { pn:'MC-STD-CHAIN-50-10', name:'Roller chain #50, 10-ft',           featured:true,
          desc:'ANSI #50 roller chain, 10-foot box with connecting link. 5/8" pitch. For conveyor and sprocket drives.',
          location:'Rack B-03', qty:3, price:'$38.00' }
      ],
      bearings: [
        { pn:'MC-STD-BRG-6204',   name:'Ball bearing 6204 2RS',             featured:true,
          desc:'Deep-groove ball bearing 6204 2RS, 20x47x14 mm. Double-sealed, pre-greased. Common in wheel and pulley applications.',
          location:'Bin BR-01', qty:15, price:'$8.00' },
        { pn:'MC-STD-BRG-6205',   name:'Ball bearing 6205 2RS',             featured:true,
          desc:'Deep-groove ball bearing 6205 2RS, 25x52x15 mm. Double-sealed, pre-greased.',
          location:'Bin BR-02', qty:12, price:'$9.00' },
        { pn:'MC-STD-SEAL-30X52', name:'Shaft seal 30x52x7 mm',
          desc:'Lip seal for rotating shaft, 30mm ID x 52mm OD x 7mm width. Nitrile rubber, single lip.',
          location:'Bin BR-03', qty:10, price:'$6.00' }
      ]
    },
    'tools': {
      'hand-tools': [
        { pn:'MC-TOOL-TQWRENCH-3/8', name:'Torque wrench 3/8" dr, 10-80 ft-lb',  featured:true,
          desc:'Click-type torque wrench, 3/8" drive. 10-80 ft-lb range. Calibrate annually. Store at minimum setting.',
          location:'Tool Crib TC-01', qty:3, price:'$89.00' },
        { pn:'MC-TOOL-TQWRENCH-1/2', name:'Torque wrench 1/2" dr, 20-150 ft-lb', featured:true,
          desc:'Click-type torque wrench, 1/2" drive. 20-150 ft-lb range. Calibrate annually.',
          location:'Tool Crib TC-02', qty:2, price:'$124.00' },
        { pn:'MC-TOOL-PUNCH-KIT',    name:'Punch and chisel set, 9-piece',
          desc:'9-piece drive punch and cold chisel set. Hardened chrome vanadium. For pin driving and rivets.',
          location:'Tool Crib TC-03', qty:2, price:'$38.00' }
      ],
      'test-equip': [
        { pn:'MC-TOOL-MULTIMETER',  name:'Digital multimeter, CAT III 600V',    featured:true,
          desc:'True-RMS digital multimeter. CAT III 600V rated. Measures AC/DC voltage, current, resistance, continuity, diode.',
          location:'Tool Crib TE-01', qty:4, price:'$78.00' },
        { pn:'MC-TOOL-HYD-GAUGE',   name:'Hydraulic test gauge kit, 5000 psi',  featured:true,
          desc:'4-piece hydraulic pressure gauge kit: 1000, 3000, 5000 psi gauges with test port adapters and hoses.',
          location:'Tool Crib TE-02', qty:1, price:'$212.00' },
        { pn:'MC-TOOL-CLAMP-METER', name:'Clamp meter, AC/DC 400A',
          desc:'Clamp-on AC/DC current meter to 400A. True-RMS, CAT IV rated. For battery and motor circuit diagnosis.',
          location:'Tool Crib TE-03', qty:2, price:'$134.00' }
      ],
      'special-tooling': [
        { pn:'MC-TOOL-BEARING-PRESS', name:'Bearing press set, 12-piece', featured:true,
          desc:'12-piece hydraulic bearing press / puller kit. 20-ton capacity. Cross-compatible with most hydraulic presses in shop.',
          location:'Bay 2 BT-01', qty:1, price:'$187.00' },
        { pn:'MC-TOOL-PIN-DRIVER',    name:'Hammer-action pin driver set',
          desc:'3-piece sliding hammer pin driver set, 1/2"-1" adapters. For pressed pins on scissor arm pivots.',
          location:'Tool Crib TC-10', qty:1, price:'$56.00' }
      ]
    },
    'hardware': {
      'bolts-nuts': [
        { pn:'MC-HAR-M12-50',  name:'Hex bolt M12 x 1.75 x 50 mm', featured:true,
          desc:'Grade 8.8 zinc-plated hex head bolt. M12 x 1.75 pitch x 50 mm. Box of 50.',
          location:'Bin HW-A1', qty:200, price:'$18.00' },
        { pn:'MC-HAR-M12-NUT', name:'Hex nut M12 x 1.75 mm',       featured:true,
          desc:'Grade 8 zinc hex nut, M12 x 1.75. Box of 100. Use with M12 bolts; replace at each disassembly.',
          location:'Bin HW-A2', qty:300, price:'$9.00' },
        { pn:'MC-HAR-M10-30',  name:'Hex bolt M10 x 1.5 x 30 mm',
          desc:'Grade 8.8 zinc hex bolt, M10 x 1.5 x 30. Box of 50. Common fastener for guard and cover plates.',
          location:'Bin HW-A3', qty:150, price:'$12.00' },
        { pn:'MC-HAR-M8-25',   name:'Hex bolt M8 x 1.25 x 25 mm',
          desc:'Grade 8.8 zinc hex bolt, M8 x 1.25 x 25. Box of 100. For electrical enclosures and bracket mounting.',
          location:'Bin HW-A4', qty:200, price:'$10.00' }
      ],
      'pins-clips': [
        { pn:'MC-HAR-PIN-1-150',   name:'Clevis pin 1" x 1.5", grade 5', featured:true,
          desc:'Grade 5 zinc-plated clevis pin, 1" diameter x 1.5" grip. With cotter hole.',
          location:'Bin HW-B1', qty:30, price:'$4.00' },
        { pn:'MC-HAR-PIN-3/4-120', name:'Clevis pin 3/4" x 1.2", grade 5', featured:true,
          desc:'Grade 5 zinc-plated clevis pin, 3/4" x 1.2" grip. Common scissor arm and cylinder pin size.',
          location:'Bin HW-B2', qty:40, price:'$3.00' },
        { pn:'MC-HAR-COTTER-3/16', name:'Cotter pin 3/16" x 1-1/2", 25-pack',
          desc:'Zinc-plated cotter pins, 3/16" x 1-1/2". 25-pack. Replace at every pin removal.',
          location:'Bin HW-B3', qty:20, price:'$5.00' }
      ],
      washers: [
        { pn:'MC-HAR-FLAT-M12',      name:'Flat washer M12, 100-pack',   featured:true,
          desc:'Grade F436 zinc flat washer for M12 bolts. 1-1/4" OD, 0.095" thick. 100-count bag.',
          location:'Bin HW-C1', qty:400, price:'$8.00' },
        { pn:'MC-HAR-LOCK-M12',      name:'Lock washer M12, 100-pack',   featured:true,
          desc:'Split lock washer for M12 bolts, zinc. 100-count bag. Required on all vibration-exposed fasteners.',
          location:'Bin HW-C2', qty:300, price:'$7.00' },
        { pn:'MC-HAR-RETAINING-EXT', name:'Ext. retaining ring, 25mm shaft, 10-pack',
          desc:'External spiral retaining ring for 25mm shafts. 10-pack. Use with flat-nose circlip pliers.',
          location:'Bin HW-C3', qty:30, price:'$6.00' }
      ]
    },
    'docs': {
      'inspection-forms': [
        { pn:'MC-DOC-ANNUAL-INS', name:'Annual inspection form, 25-pack',        featured:true,
          desc:'Tri-part ANSI compliant annual inspection form. Part 1 for tech, Part 2 for file, Part 3 for unit history. 25-pack.',
          location:'Office D-01', qty:5, price:'$14.00' },
        { pn:'MC-DOC-PRE-USE',    name:'Pre-use inspection checklist, 100ct',    featured:true,
          desc:'Daily pre-use inspection checklist. ANSI/SIA A92 format. Carbon-copy. 100-count book.',
          location:'Office D-02', qty:8, price:'$18.00' },
        { pn:'MC-DOC-30-DAY',     name:'Frequent (30-day) inspection form, 50ct',
          desc:'30-day frequent inspection form. Required for monthly checks under ANSI A92.20. 50-count pad.',
          location:'Office D-03', qty:6, price:'$12.00' }
      ],
      checklists: [
        { pn:'MC-DOC-PM-250',  name:'250-hr PM checklist',  featured:true,
          desc:'Preventive maintenance checklist for the 250-hour service interval. Covers fluid changes, filter inspection, and functional tests.',
          location:'Office D-04', qty:10, price:'$0.50' },
        { pn:'MC-DOC-PM-500',  name:'500-hr PM checklist',  featured:true,
          desc:'500-hour PM checklist. Covers all items from 250-hr plus hydraulic filter, brake inspection, and load test.',
          location:'Office D-05', qty:10, price:'$0.50' },
        { pn:'MC-DOC-PM-1000', name:'1000-hr PM checklist',
          desc:'Full 1000-hour PM checklist. Includes drive chain, cylinder inspection, and structural weld review.',
          location:'Office D-06', qty:10, price:'$0.50' }
      ],
      specs: [
        { pn:'MC-DOC-TORQUE-SPEC', name:'Torque spec reference card', featured:true,
          desc:'Laminated quick-reference torque specification card. Covers all common fastener grades and thread sizes in company fleet.',
          location:'Tool Crib TC-20', qty:5, price:'$2.00' },
        { pn:'MC-DOC-HYD-SPEC',    name:'Hydraulic fluid spec guide',
          desc:'OEM hydraulic fluid cross-reference and specification guide. Lists viscosity, change intervals, and mixing compatibility.',
          location:'Office D-10', qty:3, price:'$2.00' }
      ]
    }
  };

  function catPartsAll(catId) {
    var d = CPARTS[catId];
    if (!d) return [];
    return Object.keys(d).reduce(function (arr, subId) {
      return arr.concat(d[subId].map(function (x) { return { part: x, cat: catId }; }));
    }, []);
  }

  function partCard(x, cat, unit) {
    var search = [x.pn, x.name, x.desc].join(' ').toLowerCase();
    return '<div class="ecat-part-card card" data-search="' + esc(search) + '">' +
      (x.featured ? '<span class="ecat-feat-badge">Featured</span>' : '') +
      '<div class="ecat-part-img"><img src="' + imgUrl(cat) + '" alt="" loading="lazy"></div>' +
      '<div class="ecat-part-body">' +
        '<b class="ecat-part-pn">' + esc(x.pn) + '</b>' +
        '<span class="ecat-part-name">' + esc(x.name) + '</span>' +
        '<p class="ecat-part-desc">' + esc(x.desc) + '</p>' +
      '</div>' +
      '<div class="ecat-part-foot">' +
        '<div class="ecat-part-actions">' +
          '<span class="ecat-part-price">' + esc(x.price) + '</span>' +
          (x.location ? '<span class="ecat-part-loc muted">' + esc(x.location) + '</span>' : '') +
          C.quickBtn(x, unit) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- sub-category level: ?cat=shop-supplies&sub=lubricants ----
  if (p.cat && p.sub) {
    var catDef  = CCATS.find(function (c) { return c.id === p.cat; });
    var subDef  = catDef && catDef.subs ? catDef.subs.find(function (s) { return s.id === p.sub; }) : null;
    var parts   = CPARTS[p.cat] && CPARTS[p.cat][p.sub] ? CPARTS[p.cat][p.sub] : [];
    var featured = parts.filter(function (x) { return x.featured; });
    var unit    = C.unit(p.wo);
    var subName = subDef ? subDef.name : p.sub;
    var catName = catDef ? catDef.name : p.cat;

    var filterBar = '<div class="ecat-filter-bar">' +
      '<input class="ecat-filter-input" type="search" ' +
        'placeholder="Filter ' + parts.length + ' items by name or number..." ' +
        'autocomplete="off" spellcheck="false" aria-label="Filter items">' +
    '</div>';

    var fullGrid = '<div class="ecat-part-grid" id="cc-full-grid">' +
      parts.map(function (x) { return partCard(x, p.cat, unit); }).join('') +
    '</div>' +
    '<p class="ecat-no-results" hidden>No items match your filter.</p>';

    var body = C.layout(
      { extra: 'company-catalog' }, p.wo,
      UI.sec('Featured', '<span class="muted">' + featured.length + ' items</span>',
        '<div class="ecat-part-grid ecat-featured-grid">' +
          featured.map(function (x) { return partCard(x, p.cat, unit); }).join('') +
        '</div>', 'h-feat') +
      UI.sec('All items', '<span class="muted">' + parts.length + ' total</span>',
        filterBar + fullGrid, 'h-all')
    );

    var sh = SE.shell(el, {
      nav: 'catalog', title: subName + ' - Company Catalog', wide: true,
      crumbs: [
        ['Parts catalog', catQ],
        ['Company Catalog', ccQ],
        [catName, 'company-catalog?cat=' + p.cat + (p.wo ? '&wo=' + p.wo : '')]
      ],
      sub: catName + ' - ' + subName,
      body: body
    });

    var inp = el.querySelector('.ecat-filter-input');
    if (inp) {
      inp.addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        var cards = el.querySelectorAll('#cc-full-grid .ecat-part-card');
        var visible = 0;
        cards.forEach(function (card) {
          var match = !q || (card.dataset.search || '').indexOf(q) >= 0;
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        var noRes = el.querySelector('.ecat-no-results');
        if (noRes) noRes.hidden = !q || visible > 0;
      });
    }

    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
    });
    return sh.cleanup;
  }

  // ---- category level: ?cat=shop-supplies ----
  if (p.cat) {
    var catDef   = CCATS.find(function (c) { return c.id === p.cat; });
    var subs     = catDef && catDef.subs ? catDef.subs : [];
    var allItems = catPartsAll(p.cat);
    var featured = allItems.filter(function (item) { return item.part.featured; }).slice(0, 4);
    var unit     = C.unit(p.wo);

    var subCards = subs.map(function (sub) {
      var cnt = CPARTS[p.cat] && CPARTS[p.cat][sub.id] ? CPARTS[p.cat][sub.id].length : 0;
      return '<a class="sup-pf-card card" href="#/company-catalog?cat=' + esc(p.cat) + '&sub=' + esc(sub.id) + woSfx + '">' +
        '<span class="sup-pf-icon">' + icon(catDef ? catDef.icon : 'box') + '</span>' +
        '<span class="sup-pf-body"><b>' + esc(sub.name) + '</b><small>' + cnt + ' items</small></span>' +
        icon('angle-small-right') +
      '</a>';
    }).join('');

    var sh = SE.shell(el, {
      nav: 'catalog',
      title: (catDef ? catDef.name : p.cat) + ' - Company Catalog',
      wide: true,
      crumbs: [['Parts catalog', catQ], ['Company Catalog', ccQ]],
      sub: catDef ? catDef.desc : '',
      body: C.layout(
        { extra: 'company-catalog' }, p.wo,
        UI.sec(catDef ? catDef.name : p.cat,
          '<span class="muted">' + subs.length + ' sub-categories - ' + allItems.length + ' items</span>',
          '<div class="sup-pf-grid">' + subCards + '</div>', 'h-subs') +
        UI.sec('Featured items',
          '<span class="muted">' + allItems.length + ' total in this category</span>',
          '<div class="ecat-part-grid">' +
            featured.map(function (item) { return partCard(item.part, item.cat, unit); }).join('') +
          '</div>', 'h-feat'))
    });
    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
    });
    return sh.cleanup;
  }

  // ---- top level ----
  var allItems = CCATS.reduce(function (arr, cat) { return arr.concat(catPartsAll(cat.id)); }, []);
  var featured = allItems.filter(function (item) { return item.part.featured; }).slice(0, 4);
  var unit = C.unit(p.wo);

  var catCards = CCATS.map(function (cat) {
    var cnt = catPartsAll(cat.id).length;
    return '<a class="sup-pf-card card" href="#/company-catalog?cat=' + esc(cat.id) + woSfx + '">' +
      '<span class="sup-pf-icon">' + icon(cat.icon) + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(cat.name) + '</b><small>' + esc(cat.desc) + '</small></span>' +
      '<span class="tn-n">' + cnt + '</span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');

  var sh = SE.shell(el, {
    nav: 'catalog', title: 'Company Catalog', wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Internal parts, supplies, and equipment stocked by your operation - ' + allItems.length + ' items',
    body: C.layout({ extra: 'company-catalog' }, p.wo,
      UI.sec('Categories',
        '<span class="muted">' + CCATS.length + ' categories - ' + allItems.length + ' items</span>',
        '<div class="sup-pf-grid">' + catCards + '</div>', 'h-cats') +
      UI.sec('Featured items',
        '<span class="muted">' + allItems.length + ' total</span>',
        '<div class="ecat-part-grid">' +
          featured.map(function (item) { return partCard(item.part, item.cat, unit); }).join('') +
        '</div>', 'h-feat'))
  });
  el.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
  });
  return sh.cleanup;
};
