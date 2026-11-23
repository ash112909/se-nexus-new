/* Enhanced Catalog — alternative catalog structure for suppliers whose parts don't map
   to the machine → category hierarchy. Parts carry richer data (images, descriptions,
   cross-references) and are organized by the supplier's own categories.
   #/enhanced-catalog
   #/enhanced-catalog?sup=JLG
   #/enhanced-catalog?sup=JLG&cat=drive
   #/enhanced-catalog?sup=JLG&cat=drive&sub=motors   (+ &wo=) */
SE.titles['enhanced-catalog'] = 'Enhanced Catalog';
SE.views['enhanced-catalog'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ  = 'catalog' + (p.wo ? '?wo=' + p.wo : '');
  var eQ    = 'enhanced-catalog' + (p.wo ? '?wo=' + p.wo : '');
  var woSfx = p.wo ? '&wo=' + encodeURIComponent(p.wo) : '';

  // per-category image palette (bg / fg, no # prefix)
  var PALETTE = {
    drive:      ['dde8dd', '3d6b3d'],
    hydraulics: ['dce7f5', '2f4f8c'],
    electrical: ['ede0f5', '5c2f8c'],
    platform:   ['f5e8dc', '8c5a2f'],
    structure:  ['dcf0e8', '2f8c5a'],
    fluids:     ['f5f0dc', '8c792f']
  };
  function imgUrl(cat) {
    var pal = PALETTE[cat] || ['eeeeee', '888888'];
    return 'https://placehold.co/320x240/' + pal[0] + '/' + pal[1];
  }

  // category definitions with sub-categories
  var ECATS = {
    JLG: [
      { id: 'drive',      name: 'Drive & Mobility',      icon: 'settings-sliders', desc: 'Motors, wheels, drive assemblies, brakes',
        subs: [{id:'motors',name:'Drive Motors'},{id:'wheels',name:'Wheels & Tires'},{id:'brakes',name:'Brakes'}] },
      { id: 'hydraulics', name: 'Hydraulic Systems',     icon: 'pulse',            desc: 'Pumps, cylinders, valves, hoses, fittings',
        subs: [{id:'pumps',name:'Pumps & Motors'},{id:'cylinders',name:'Cylinders'},{id:'valves',name:'Valves & Fittings'}] },
      { id: 'electrical', name: 'Electrical & Controls', icon: 'dashboard',        desc: 'Controllers, wiring, sensors, switches',
        subs: [{id:'controllers',name:'Controllers & Modules'},{id:'sensors',name:'Sensors & Switches'},{id:'charging',name:'Charging Systems'}] },
      { id: 'platform',   name: 'Structural & Platform', icon: 'grid-alt',         desc: 'Platform, guardrails, pins, structural hardware',
        subs: [{id:'extensions',name:'Platform Extensions'},{id:'guardrails',name:'Guardrails & Safety'}] }
    ],
    SKJ: [
      { id: 'drive',     name: 'Drive Components',    icon: 'settings-sliders', desc: 'Drive motors, wheels, hub assemblies',
        subs: [{id:'motors',name:'Hub Motors'},{id:'wheels',name:'Wheels & Hubs'}] },
      { id: 'structure', name: 'Platform & Structure', icon: 'grid-alt',         desc: 'Scissor arms, decks, guardrails, pins',
        subs: [{id:'arms',name:'Scissor Arms & Pins'},{id:'deck',name:'Deck & Extensions'},{id:'guardrails',name:'Guardrails'}] },
      { id: 'electrical',name: 'Electrical Systems',  icon: 'dashboard',        desc: 'Control boards, cables, sensors, valves',
        subs: [{id:'boards',name:'Control Boards'},{id:'valves',name:'Solenoid Valves'}] },
      { id: 'fluids',    name: 'Consumables & Fluids', icon: 'box',              desc: 'Hydraulic fluid, lubricants, return filters',
        subs: [{id:'hydraulic',name:'Hydraulic Fluid & Filters'},{id:'lubricants',name:'Lubricants & Greases'}] }
    ]
  };

  // parts organized by sup → cat → sub
  var EPARTS = {
    JLG: {
      drive: {
        motors: [
          { pn:'JLG-1001097838', name:'Drive motor, front', featured:true,
            desc:'OEM front drive motor for 1930ES and 2030ES platforms. 24V DC, 500W continuous duty, IP65. Direct bolt-on replacement, no adapters required.',
            model:'1930ES / 2030ES', xrefs:2, price:'$342.00' },
          { pn:'JLG-1001097839', name:'Drive motor, rear', featured:true,
            desc:'OEM rear drive motor, identical spec to front unit. Sold individually. Recommend replacing as a pair when one fails.',
            model:'1930ES / 2030ES', xrefs:2, price:'$342.00' },
          { pn:'JLG-1001092450', name:'Drive motor, steer axle',
            desc:'Heavy-lift variant steer motor. Higher peak torque than standard 1001097838; check model tag before ordering.',
            model:'2032E2 / 2646E2', xrefs:1, price:'$389.00' },
          { pn:'JLG-4320110', name:'Motor brush set, 24V',
            desc:'OEM carbon brush set for brushed DC drive motors. Sold as a set of 4. Replace every 2,000 hours or on commutator wear.',
            model:'1930ES', xrefs:0, price:'$44.00' }
        ],
        wheels: [
          { pn:'JLG-1001092441', name:'Drive wheel, foam-filled', featured:true,
            desc:'Non-marking foam-filled 15×5 drive wheel on OEM hub. No flat risk; identical footprint to pneumatic. Suits indoor concrete.',
            model:'1930ES', xrefs:1, price:'$187.00' },
          { pn:'JLG-1001092442', name:'Steer wheel, foam-filled', featured:true,
            desc:'Matching steer wheel for foam-filled drive pair. 12×4.5 polyurethane tread; no adapters required.',
            model:'1930ES', xrefs:1, price:'$161.00' },
          { pn:'JLG-4318772', name:'Tire assembly, pneumatic 15×5',
            desc:'OEM replacement pneumatic tire and tube assembly. Vulcanized steel bead, 4-ply. Mount with standard bead-breaking equipment.',
            model:'1930ES / 2030ES', xrefs:0, price:'$98.00' },
          { pn:'JLG-4318773', name:'Hub cap kit',
            desc:'Four-piece plastic hub cap set with press-fit retention. OEM profile; replaces damaged or missing caps without tools.',
            model:'1930ES / 2030ES / 3246R', xrefs:0, price:'$22.00' }
        ],
        brakes: [
          { pn:'JLG-4320282', name:'Brake assembly, rear axle', featured:true,
            desc:'Spring-applied, electrically released rear brake assembly. Complete unit with hardware. No field calibration required.',
            model:'3246R', xrefs:1, price:'$512.00' },
          { pn:'JLG-4320283', name:'Brake pad set', featured:true,
            desc:'OEM semi-metallic brake pads for drum-style drive axle. Set of 4. Replace when thickness falls below 2 mm.',
            model:'1930ES / 2030ES', xrefs:1, price:'$78.00' },
          { pn:'JLG-4320285', name:'Spring pack, brake',
            desc:'Replacement spring pack for spring-applied disc brake. Required when spring force tests below 150 N at release.',
            model:'3246R', xrefs:0, price:'$134.00' }
        ]
      },
      hydraulics: {
        pumps: [
          { pn:'JLG-4821477', name:'Hydraulic pump assembly', featured:true,
            desc:'OEM gear pump, SAE B 2-bolt flange. 2.8 cc/rev, rated to 3,000 psi. Ships with new shaft seal and O-ring kit.',
            model:'3246R', xrefs:2, price:'$1,241.00' },
          { pn:'JLG-4821478', name:'Pump relief valve', featured:true,
            desc:'Internal direct-acting relief valve, pre-set to 2,750 psi at factory. Tamper-proof cap; adjust only with hydraulic test equipment.',
            model:'3246R', xrefs:1, price:'$187.00' },
          { pn:'JLG-4821399', name:'Gear motor, leveling',
            desc:'Dedicated bidirectional gear motor for auto-leveling circuit. Separate from main lift circuit; check pilot pressure before replacing.',
            model:'3246R2', xrefs:0, price:'$621.00' }
        ],
        cylinders: [
          { pn:'JLG-4821398', name:'Lift cylinder, main', featured:true,
            desc:'Single-acting main lift cylinder. Chrome-plated bore, integrated end cushioning. Tested to 1.5× rated pressure before shipment.',
            model:'1930ES', xrefs:0, price:'$867.00' },
          { pn:'JLG-4821400', name:'Steer cylinder', featured:true,
            desc:'Double-acting steer cylinder, 1-1/8" bore. Includes tie-rod ends and jam nuts. Flush and purge before install.',
            model:'1930ES / 2030ES', xrefs:1, price:'$412.00' },
          { pn:'JLG-4821401', name:'Level cylinder seal kit',
            desc:'Complete seal kit for single-acting level cylinder: piston seals, rod seal, wiper, and backup rings. Requires hone on reassembly.',
            model:'3246R', xrefs:0, price:'$56.00' }
        ],
        valves: [
          { pn:'JLG-4820991', name:'Counterbalance valve kit', featured:true,
            desc:'OEM counterbalance valve set for primary and secondary circuits. Required for annual inspection compliance on 1930ES.',
            model:'1930ES / 2030ES', xrefs:1, price:'$214.00' },
          { pn:'JLG-4820992', name:'Manifold block assembly', featured:true,
            desc:'Aluminum ported manifold block with pre-installed solenoids and pressure transducer ports. Pressure-tested before shipment.',
            model:'3246R', xrefs:0, price:'$1,890.00' },
          { pn:'JLG-4820993', name:'Hydraulic hose kit',
            desc:'OEM 7-piece hose kit for complete lift circuit replacement. Stainless JIC fittings, braided PTFE liner, 10,000 psi burst rating.',
            model:'1930ES', xrefs:0, price:'$312.00' }
        ]
      },
      electrical: {
        controllers: [
          { pn:'JLG-5700098', name:'Platform control module rev B', featured:true,
            desc:'CAN bus platform controller, second-generation. Replaces discontinued JLG-5700034. Firmware included, no laptop required for swap.',
            model:'1930ES / 2030ES', xrefs:1, price:'$887.00' },
          { pn:'JLG-5700120', name:'Drive controller', featured:true,
            desc:'Programmable motor controller for drive and steer axes. Load via JLG service tool; torque curve adjustable per application.',
            model:'2030ES / 3246R', xrefs:0, price:'$1,124.00' },
          { pn:'JLG-5700221', name:'Load management controller',
            desc:'Independent load cell amplifier and motion-cut controller. Calibration sticker shows tare date; recalibrate after replacement.',
            model:'3246R2', xrefs:0, price:'$654.00' }
        ],
        sensors: [
          { pn:'JLG-1001145001', name:'Tilt sensor assembly', featured:true,
            desc:'Dual-axis MEMS tilt sensor with CAN output. Plug-and-play harness connector; calibration auto-completes on first lift cycle.',
            model:'1930ES / 2030ES / 3246R', xrefs:1, price:'$218.00' },
          { pn:'JLG-1001145002', name:'Footswitch, platform', featured:true,
            desc:'Normally-open footswitch, mushroom-head actuator. Sealed to IP67. Required for all function enables in platform-control mode.',
            model:'1930ES / 2030ES', xrefs:0, price:'$87.00' },
          { pn:'JLG-1001145003', name:'Limit switch kit',
            desc:'Four-piece limit switch set covering pothole protection, steer lock, and elevation cut-out. Includes brackets and hardware.',
            model:'3246R', xrefs:0, price:'$134.00' }
        ],
        charging: [
          { pn:'JLG-1001144870', name:'Battery charger 24V', featured:true,
            desc:'On-board 24V 30A DIN-mount charger. 110–240V AC auto-sensing input, three-stage charge profile, thermal shutdown protection.',
            model:'1930ES', xrefs:1, price:'$198.00' },
          { pn:'JLG-1001144888', name:'Battery cable harness', featured:true,
            desc:'4-gauge welding-cable main harness, 48" loop. Anderson SB175 connectors factory-crimped. Replace entire harness on any charring.',
            model:'1930ES / 2030ES', xrefs:0, price:'$112.00' }
        ]
      },
      platform: {
        extensions: [
          { pn:'JLG-1001209944', name:'Platform extension, slide-out', featured:true,
            desc:'OEM slide-out extension deck, 610 mm width gain. Rated 113 kg. Ships with locking pin and step-plate hardware.',
            model:'3246R2', xrefs:0, price:'$2,105.00' },
          { pn:'JLG-1001209945', name:'Extension floor grating', featured:true,
            desc:'Anti-slip aluminium grating insert for slide-out platform extension. Click-retention; no hardware required.',
            model:'3246R2', xrefs:0, price:'$341.00' }
        ],
        guardrails: [
          { pn:'JLG-4318009', name:'Guardrail section, mid-rail', featured:true,
            desc:'Bolt-on aluminum mid-rail replacement. OEM extrusion profile; powder-coated safety yellow. Fits all 1930 and 2030 variants.',
            model:'1930ES / 2030ES / 3246R', xrefs:1, price:'$144.00' },
          { pn:'JLG-4318010', name:'Gate assembly, platform', featured:true,
            desc:'Pivot-chain gate assembly with spring-return latch. Full platform-width opening. Includes hinge pins and hardware.',
            model:'1930ES / 2030ES', xrefs:0, price:'$287.00' },
          { pn:'JLG-4318011', name:'Footrest bar',
            desc:'Welded steel kickplate with non-slip serrated surface. Bolts to inner toe-board channel. Replace when >3 mm deflection.',
            model:'1930ES', xrefs:0, price:'$54.00' }
        ]
      }
    },
    SKJ: {
      drive: {
        motors: [
          { pn:'SKJ-156024', name:'Hub motor, 24V brushless', featured:true,
            desc:'Brushless DC in-wheel hub motor, IP54. Plug-and-play harness connector. 20% higher continuous torque vs. prior generation.',
            model:'SJIII 3219', xrefs:2, price:'$428.00' },
          { pn:'SKJ-156025', name:'Motor controller, hub', featured:true,
            desc:'MOSFET controller for brushless hub motor. Torque limit programmable via USB; default 90 Nm. Replace as a pair with motor.',
            model:'SJIII 3219', xrefs:1, price:'$312.00' },
          { pn:'SKJ-156026', name:'Motor brush kit',
            desc:'Brush kit for legacy brushed SJIII motors. 4 brushes with springs. Replace when worn to 6 mm length.',
            model:'SJIII 3215 (legacy)', xrefs:0, price:'$38.00' }
        ],
        wheels: [
          { pn:'SKJ-153899', name:'Drive wheel assembly rev', featured:true,
            desc:'Updated drive wheel assembly with improved bearing seal. Direct replacement for discontinued SKJ-153721. Longer service interval.',
            model:'SJIII 3219', xrefs:1, price:'$312.00' },
          { pn:'SKJ-153902', name:'Steer wheel assembly', featured:true,
            desc:'Front steer wheel with kingpin bearing pre-installed. Grease fitting accessible without disassembly. 12×4.5 urethane tread.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$178.00' },
          { pn:'SKJ-153903', name:'Wheel hub, bare',
            desc:'Cast iron wheel hub for field repair when tire is good but hub is damaged. Machine-shop press-fit bearing required.',
            model:'SJIII 3219', xrefs:0, price:'$87.00' }
        ]
      },
      structure: {
        arms: [
          { pn:'SKJ-158432', name:'Scissor arm pin kit', featured:true,
            desc:'Full set of 4 grade-8 steel arm pivot pins with cotter pins and flat washers. Recommended replacement interval every 2,000 hours.',
            model:'SJIII 3219 / 3220', xrefs:1, price:'$89.00' },
          { pn:'SKJ-158433', name:'Arm roller assembly', featured:true,
            desc:'Nylon-on-steel arm roller for the lower scissors channel. Replace when visible flattening exceeds 1 mm.',
            model:'SJIII 3219', xrefs:0, price:'$54.00' },
          { pn:'SKJ-158441', name:'Pivot pin, upper',
            desc:'Single upper pivot pin, 32 mm × 142 mm. Hardened 4140 steel. Supply as a pair when replacing both sides.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$47.00' }
        ],
        deck: [
          { pn:'SKJ-162990', name:'Platform extension deck', featured:true,
            desc:'Aluminum slide-out extension, 1.8 m. 160 kg working load. OEM locking mechanism; no field modifications needed.',
            model:'SJIII 3219', xrefs:2, price:'$1,756.00' },
          { pn:'SKJ-162991', name:'Deck planking, 1-piece', featured:true,
            desc:'Aluminium anti-slip deck plank. Click-down installation; no hardware. Replace one plank without full deck removal.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$112.00' },
          { pn:'SKJ-162994', name:'Slide lock assembly',
            desc:'Spring-loaded slide-out lock mechanism. Includes handle, spring, and mount bracket. Replace entire assembly on any crack.',
            model:'SJIII 3219', xrefs:0, price:'$68.00' }
        ],
        guardrails: [
          { pn:'SKJ-159102', name:'Folding guardrail set', featured:true,
            desc:'3-piece folding guardrail. Slots into OEM mid-rail channel without tools. Ships as a complete set with all hardware.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$341.00' },
          { pn:'SKJ-159103', name:'Mid-rail latch kit', featured:true,
            desc:'Replacement latch set for folding mid-rail. 2 latches per kit. Replace when engagement force exceeds 25 N.',
            model:'SJIII 3219', xrefs:0, price:'$44.00' }
        ]
      },
      electrical: {
        boards: [
          { pn:'SKJ-168504', name:'Control board, ground rev B', featured:true,
            desc:'Updated ground-station control board with extended CAN bus diagnostics. Replaces SKJ-168450. Firmware pre-loaded at factory.',
            model:'SJIII 3219', xrefs:1, price:'$432.00' },
          { pn:'SKJ-168510', name:'Platform control board', featured:true,
            desc:'Platform-mounted control PCB with sealed enclosure. Firmware matches ground board; update both simultaneously.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$398.00' },
          { pn:'SKJ-168520', name:'CAN bus harness',
            desc:'Full-length CAN bus cable assembly with sealed M12 connectors. Replace entire harness on any fault code 15 or 16.',
            model:'SJIII 3219', xrefs:0, price:'$134.00' }
        ],
        valves: [
          { pn:'SKJ-171003', name:'Emergency lowering valve', featured:true,
            desc:'Normally-closed solenoid valve, 24V coil, manual override. Installed with no special tooling; O-ring kit included.',
            model:'SJIII 3219 / 3220', xrefs:0, price:'$98.00' },
          { pn:'SKJ-171004', name:'Proportional control valve', featured:true,
            desc:'Proportional directional valve with analog command input. Factory-set null bias; fine-tune with field trim pot.',
            model:'SJIII 3219', xrefs:1, price:'$467.00' }
        ]
      },
      fluids: {
        hydraulic: [
          { pn:'SKJ-FLUID-HYD-5G', name:'Hydraulic fluid ISO 46, 5 gal', featured:true,
            desc:'OEM-spec all-season hydraulic fluid. Anti-wear, anti-foam, wide-temperature range. 5-gallon pail with tamper-evident lid.',
            model:'All Skyjack models', xrefs:2, price:'$74.00' },
          { pn:'SKJ-FILTER-HYD-01', name:'Hydraulic return filter', featured:true,
            desc:'Spin-on return-line filter, 10-micron cellulose element. OEM thread pattern. Replace every 500 hours or annually.',
            model:'SJIII 3219 / 3220', xrefs:1, price:'$38.00' },
          { pn:'SKJ-FLUID-HYD-1G', name:'Hydraulic fluid ISO 46, 1 gal',
            desc:'Same OEM-spec formulation as 5-gallon pail. 1-gallon bottle for small top-offs or remote service.',
            model:'All Skyjack models', xrefs:1, price:'$19.00' }
        ],
        lubricants: [
          { pn:'SKJ-GREASE-EP2-400', name:'EP2 lithium grease, 400 g', featured:true,
            desc:'NLGI 2 extreme-pressure lithium grease for all grease zerks. Compatible with Skyjack OEM-specified bearings and pins.',
            model:'All Skyjack models', xrefs:1, price:'$14.00' },
          { pn:'SKJ-OIL-GEAR-1L', name:'Gear oil SAE 90, 1L', featured:true,
            desc:'API GL-5 gear oil for hub motor gearboxes. Drain and refill every 1,000 hours; check level every 250 hours.',
            model:'SJIII 3219', xrefs:0, price:'$18.00' }
        ]
      }
    }
  };

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
          C.quickBtn(x, unit) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // flatten all parts in a category across its subs, keeping cat id
  function catPartsWithCat(supId, catId) {
    var d = EPARTS[supId] && EPARTS[supId][catId];
    if (!d) return [];
    return Object.keys(d).reduce(function (arr, subId) {
      return arr.concat(d[subId].map(function (x) { return { part: x, cat: catId }; }));
    }, []);
  }

  // ---- sub-category level: ?sup=JLG&cat=drive&sub=motors ----
  if (p.sup && p.cat && p.sub) {
    var sup = SE.supplier(p.sup);
    if (!sup) { SE.go('enhanced-catalog'); return function () {}; }
    var catList = ECATS[sup.id] || [];
    var cat     = catList.find(function (c) { return c.id === p.cat; });
    var subDef  = cat && cat.subs ? cat.subs.find(function (s) { return s.id === p.sub; }) : null;
    var parts   = EPARTS[sup.id] && EPARTS[sup.id][p.cat] && EPARTS[sup.id][p.cat][p.sub] ? EPARTS[sup.id][p.cat][p.sub] : [];
    var featured = parts.filter(function (x) { return x.featured; });
    var unit = C.unit(p.wo);
    var subName = subDef ? subDef.name : p.sub;
    var catName = cat ? cat.name : p.cat;

    var filterBar = '<div class="ecat-filter-bar">' +
      '<input class="ecat-filter-input" type="search" ' +
        'placeholder="Filter ' + parts.length + ' parts by part number, name, or model…" ' +
        'autocomplete="off" spellcheck="false" aria-label="Filter parts">' +
    '</div>';

    var fullGrid = '<div class="ecat-part-grid" id="ecat-full-grid">' +
      parts.map(function (x) { return partCard(x, p.cat, unit); }).join('') +
    '</div>' +
    '<p class="ecat-no-results" hidden>No parts match your filter.</p>';

    var body = C.layout(
      { extra: 'enhanced-catalog', esup: sup.id, ecat: p.cat, esub: p.sub }, p.wo,
      UI.sec('Featured', '<span class="muted">' + featured.length + ' parts</span>',
        '<div class="ecat-part-grid ecat-featured-grid">' +
          featured.map(function (x) { return partCard(x, p.cat, unit); }).join('') +
        '</div>', 'h-feat') +
      UI.sec('All parts', '<span class="muted">' + parts.length + ' total</span>',
        filterBar + fullGrid, 'h-all')
    );

    var sh = SE.shell(el, {
      nav: 'catalog',
      title: subName + ' · ' + sup.name,
      wide: true,
      crumbs: [
        ['Parts catalog', catQ],
        ['Enhanced Catalog', eQ],
        [sup.name, 'enhanced-catalog?sup=' + sup.id + (p.wo ? '&wo=' + p.wo : '')],
        [catName, 'enhanced-catalog?sup=' + sup.id + '&cat=' + p.cat + (p.wo ? '&wo=' + p.wo : '')]
      ],
      sub: catName + ' · ' + subName,
      body: body
    });

    var inp = el.querySelector('.ecat-filter-input');
    if (inp) {
      inp.addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        var cards = el.querySelectorAll('#ecat-full-grid .ecat-part-card');
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

  // ---- category level: ?sup=JLG&cat=drive ----
  if (p.sup && p.cat) {
    var sup = SE.supplier(p.sup);
    if (!sup) { SE.go('enhanced-catalog'); return function () {}; }
    var catList = ECATS[sup.id] || [];
    var cat = catList.find(function (c) { return c.id === p.cat; });
    var subs = cat && cat.subs ? cat.subs : [];
    var allItems = catPartsWithCat(sup.id, p.cat);
    var featured = allItems.filter(function (item) { return item.part.featured; }).slice(0, 4);
    var unit = C.unit(p.wo);

    var subCards = subs.map(function (sub) {
      var cnt = EPARTS[sup.id] && EPARTS[sup.id][p.cat] && EPARTS[sup.id][p.cat][sub.id] ? EPARTS[sup.id][p.cat][sub.id].length : 0;
      return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(sup.id) + '&cat=' + p.cat + '&sub=' + sub.id + woSfx + '">' +
        '<span class="sup-pf-icon">' + icon(cat ? cat.icon : 'box') + '</span>' +
        '<span class="sup-pf-body"><b>' + esc(sub.name) + '</b><small>' + cnt + ' parts</small></span>' +
        icon('angle-small-right') +
      '</a>';
    }).join('');

    var sh = SE.shell(el, {
      nav: 'catalog',
      title: (cat ? cat.name : p.cat) + ' · ' + sup.name,
      wide: true,
      crumbs: [
        ['Parts catalog', catQ],
        ['Enhanced Catalog', eQ],
        [sup.name, 'enhanced-catalog?sup=' + sup.id + (p.wo ? '&wo=' + p.wo : '')]
      ],
      sub: sup.name + (cat ? ' · ' + cat.desc : ''),
      body: C.layout(
        { extra: 'enhanced-catalog', esup: sup.id, ecat: p.cat }, p.wo,
        UI.sec(cat ? cat.name : p.cat,
          '<span class="muted">' + subs.length + ' sub-categories · ' + allItems.length + ' parts</span>',
          '<div class="sup-pf-grid">' + subCards + '</div>', 'h-subs') +
        UI.sec('Featured parts',
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

  // ---- supplier level: ?sup=JLG ----
  if (p.sup) {
    var sup = SE.supplier(p.sup);
    if (!sup || !ECATS[sup.id]) { SE.go('enhanced-catalog'); return function () {}; }
    var catList = ECATS[sup.id];
    var allItems = catList.reduce(function (arr, cat) {
      return arr.concat(catPartsWithCat(sup.id, cat.id));
    }, []);
    var featured = allItems.filter(function (item) { return item.part.featured; }).slice(0, 4);
    var unit = C.unit(p.wo);

    var catCards = catList.map(function (cat) {
      var cnt = catPartsWithCat(sup.id, cat.id).length;
      return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(sup.id) + '&cat=' + cat.id + woSfx + '">' +
        '<span class="sup-pf-icon">' + icon(cat.icon) + '</span>' +
        '<span class="sup-pf-body"><b>' + esc(cat.name) + '</b><small>' + esc(cat.desc) + '</small></span>' +
        '<span class="tn-n">' + cnt + '</span>' +
        icon('angle-small-right') +
      '</a>';
    }).join('');

    var sh = SE.shell(el, {
      nav: 'catalog',
      title: sup.name + ' Enhanced Catalog',
      wide: true,
      crumbs: [['Parts catalog', catQ], ['Enhanced Catalog', eQ]],
      sub: sup.name + ' · ' + allItems.length + ' parts with enhanced data across ' + catList.length + ' categories',
      body: C.layout(
        { extra: 'enhanced-catalog', esup: sup.id }, p.wo,
        UI.sec('Categories',
          '<span class="muted">' + catList.length + ' categories</span>',
          '<div class="sup-pf-grid">' + catCards + '</div>', 'h-cats') +
        UI.sec('Featured parts',
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
  }

  // ---- top level ----
  var connSups = D.suppliers ? D.suppliers.filter(function (s) { return s.active && s.status === 'Connected' && ECATS[s.id]; }) : [];

  var supCards = connSups.map(function (s) {
    var cnt = (ECATS[s.id] || []).reduce(function (n, cat) { return n + catPartsWithCat(s.id, cat.id).length; }, 0);
    return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(s.id) + woSfx + '">' +
      '<span class="sup-pf-icon">' + icon('building') + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(s.name) + '</b><small>' + cnt + ' parts · ' + (ECATS[s.id] ? ECATS[s.id].length : 0) + ' categories</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');

  var sh = SE.shell(el, {
    nav: 'catalog',
    title: 'Enhanced Catalog',
    wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Parts with richer data — full descriptions, images, cross-references — organized by supplier category',
    body: C.layout(
      { extra: 'enhanced-catalog' }, p.wo,
      UI.sec('Suppliers', '', '<div class="sup-pf-grid">' + supCards + '</div>', 'h-sups'))
  });
  el.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); }
  });
  return sh.cleanup;
};
