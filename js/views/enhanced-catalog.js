/* Enhanced Catalog — richer parts data: cross-references, supersessions, fitment guides,
   technical specs. Three-level hierarchy: top → supplier → section.
   Featured parts panel at every level; section level shows the full table.
   #/enhanced-catalog
   #/enhanced-catalog?sup=JLG
   #/enhanced-catalog?sup=JLG&sec=cross-refs   (+ &wo=) */
SE.titles['enhanced-catalog'] = 'Enhanced Catalog';
SE.views['enhanced-catalog'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');
  var eQ   = 'enhanced-catalog' + (p.wo ? '?wo=' + p.wo : '');

  var ESECS = [
    { id: 'cross-refs',    icon: 'swap',            name: 'Cross-references',  desc: 'Alternate part numbers: OEM, aftermarket, and house brand.' },
    { id: 'supersessions', icon: 'layers',          name: 'Supersessions',     desc: 'Part number changes and replacements across model years.' },
    { id: 'fitment',       icon: 'chart-histogram', name: 'Fitment guide',     desc: 'Compatible models, production years, and serial ranges.' },
    { id: 'specs',         icon: 'star',            name: 'Enhanced specs',    desc: 'Technical data sheets, tolerances, and application notes.' }
  ];

  var EDATA = {
    JLG: {
      featured: [
        { pn: 'JLG-1001097838', name: 'Drive motor, front',              model: 'JLG 1930ES', xrefs: 2, superseded: false, price: '$342.00'   },
        { pn: 'JLG-4821477',    name: 'Hydraulic pump assembly',          model: 'JLG 3246R',  xrefs: 1, superseded: false, price: '$1,241.00' },
        { pn: 'JLG-5700034',    name: 'Platform control module',          model: 'JLG 1930ES', xrefs: 0, superseded: true,  price: '$887.00'   },
        { pn: 'JLG-1001144870', name: 'Battery charger 24V',             model: 'JLG 1930ES', xrefs: 1, superseded: false, price: '$198.00'   }
      ],
      'cross-refs': [
        { pn: 'JLG-1001097838', name: 'Drive motor, front',              model: '1930ES', alts: ['CAT-EQ-DM24-F', 'GEN-DM24-500W'], oem: true  },
        { pn: 'JLG-4821477',    name: 'Hydraulic pump assembly',          model: '3246R',  alts: ['BOS-HP-3246', 'CAT-HP-MED-01'],   oem: true  },
        { pn: 'JLG-5700034',    name: 'Platform control module',          model: '1930ES', alts: ['JLG-5700098'],                     oem: false },
        { pn: 'JLG-1001144870', name: 'Battery charger 24V',             model: '1930ES', alts: ['UNI-CHG-24V-30A'],                 oem: true  }
      ],
      'supersessions': [
        { pn: 'JLG-5700098',    name: 'Platform control module (rev B)', model: '1930ES', supersedes: 'JLG-5700034',    supersededBy: null             },
        { pn: 'JLG-1001100204', name: 'Joystick controller',             model: '1930ES', supersedes: 'JLG-1001099842', supersededBy: null             },
        { pn: 'JLG-1001099842', name: 'Joystick controller (prev gen)',  model: '1930ES', supersedes: null,              supersededBy: 'JLG-1001100204' },
        { pn: 'JLG-5700034',    name: 'Platform control module (orig)',  model: '1930ES', supersedes: null,              supersededBy: 'JLG-5700098'    }
      ],
      'fitment': [
        { pn: 'JLG-1001097838', name: 'Drive motor, front',              model: '1930ES', fits: ['1930ES (2019–)', '2030ES (2021–)', '2646ES (2020–)'] },
        { pn: 'JLG-4821477',    name: 'Hydraulic pump assembly',          model: '3246R',  fits: ['3246R (2018–)', '3246R2 (2022–)']                    },
        { pn: 'JLG-5700098',    name: 'Platform control module (rev B)', model: '1930ES', fits: ['1930ES (2022–)', '2030ES (2022–)']                    },
        { pn: 'JLG-1001144870', name: 'Battery charger 24V',             model: '1930ES', fits: ['1930ES (all years)', '2030ES (2019–)']                }
      ],
      'specs': [
        { pn: 'JLG-1001097838', name: 'Drive motor, front',              model: '1930ES', spec: 'DC 24V · 500W · IP65 · 12.4 kg' },
        { pn: 'JLG-4821477',    name: 'Hydraulic pump assembly',          model: '3246R',  spec: 'Gear pump · 2.8 cc/rev · 3,000 psi · SAE B flange' },
        { pn: 'JLG-5700098',    name: 'Platform control module (rev B)', model: '1930ES', spec: 'CAN bus · 24V · OBD diagnostics · 182 g' },
        { pn: 'JLG-1001144870', name: 'Battery charger 24V',             model: '1930ES', spec: 'Input 110–240V AC · Output 24V 30A · DIN mount' }
      ]
    },
    SKJ: {
      featured: [
        { pn: 'SKJ-158432', name: 'Scissor arm pin kit',          model: 'SJIII 3219', xrefs: 1, superseded: false, price: '$89.00'    },
        { pn: 'SKJ-162990', name: 'Platform extension deck',       model: 'SJIII 3219', xrefs: 2, superseded: false, price: '$1,756.00' },
        { pn: 'SKJ-153721', name: 'Drive wheel assembly',          model: 'SJIII 3219', xrefs: 1, superseded: true,  price: '$312.00'   },
        { pn: 'SKJ-168450', name: 'Control board, ground station', model: 'SJIII 3219', xrefs: 0, superseded: false, price: '$432.00'   }
      ],
      'cross-refs': [
        { pn: 'SKJ-158432', name: 'Scissor arm pin kit',          model: 'SJIII 3219', alts: ['CAT-PIN-SK32-KIT'],            oem: true  },
        { pn: 'SKJ-162990', name: 'Platform extension deck',       model: 'SJIII 3219', alts: ['CAT-EXT-SK32', 'GEN-EXT-19'], oem: true  },
        { pn: 'SKJ-168450', name: 'Control board, ground station', model: 'SJIII 3219', alts: ['SKJ-168504'],                  oem: false }
      ],
      'supersessions': [
        { pn: 'SKJ-153899', name: 'Drive wheel assembly (rev)',    model: 'SJIII 3219', supersedes: 'SKJ-153721', supersededBy: null         },
        { pn: 'SKJ-153721', name: 'Drive wheel assembly',          model: 'SJIII 3219', supersedes: null,          supersededBy: 'SKJ-153899' },
        { pn: 'SKJ-168504', name: 'Control board, ground (rev B)', model: 'SJIII 3219', supersedes: 'SKJ-168450', supersededBy: null         }
      ],
      'fitment': [
        { pn: 'SKJ-158432', name: 'Scissor arm pin kit',          model: 'SJIII 3219', fits: ['SJIII 3219 (all years)', 'SJIII 3220 (2020–)'] },
        { pn: 'SKJ-162990', name: 'Platform extension deck',       model: 'SJIII 3219', fits: ['SJIII 3219 (2018–)']                           },
        { pn: 'SKJ-168450', name: 'Control board, ground station', model: 'SJIII 3219', fits: ['SJIII 3219 (2016–2022)']                        }
      ],
      'specs': [
        { pn: 'SKJ-158432', name: 'Scissor arm pin kit',          model: 'SJIII 3219', spec: 'Steel grade 8 · M20 × 120 mm · Set of 4 · 1.2 kg'    },
        { pn: 'SKJ-162990', name: 'Platform extension deck',       model: 'SJIII 3219', spec: 'Aluminium · 1.8 m extension · 160 kg capacity · 42 kg' },
        { pn: 'SKJ-168450', name: 'Control board, ground station', model: 'SJIII 3219', spec: '24V DC · IP54 · CAN bus · 180 × 120 × 45 mm'          }
      ]
    }
  };

  function featCard(x, showSup) {
    return '<div class="ecat-fp-card card">' +
      '<div class="ecat-fp-top">' +
        '<b class="ecat-fp-pn">' + esc(x.pn) + '</b>' +
        (x.superseded ? SE.chip('Superseded', 'warning') : '') +
      '</div>' +
      '<span class="ecat-fp-name">' + esc(x.name) + '</span>' +
      '<span class="ecat-fp-model">' + esc(x.model) + (showSup && x.sup ? ' · ' + esc(x.sup) : '') + '</span>' +
      '<div class="ecat-fp-meta">' +
        (x.xrefs > 0 ? SE.chip(x.xrefs + (x.xrefs > 1 ? ' alts' : ' alt'), 'neutral') : '') +
        '<span class="ecat-fp-price">' + esc(x.price) + '</span>' +
      '</div>' +
    '</div>';
  }

  // ---- section-level view: ?sup=JLG&sec=cross-refs ----
  if (p.sup && p.sec) {
    var sup = SE.supplier(p.sup);
    var edata = sup && EDATA[sup.id] ? EDATA[sup.id] : null;
    if (!sup || !edata) { SE.go('enhanced-catalog'); return function () {}; }
    var sec = ESECS.find(function (x) { return x.id === p.sec; });
    var secData = edata[p.sec] || [];
    var tableHtml = '';
    if (p.sec === 'cross-refs') {
      tableHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Part</th><th>Model</th><th>Alternate numbers</th><th>Warranty</th>' +
        '</tr></thead><tbody>' +
        secData.map(function (x) {
          return '<tr>' +
            '<td><b>' + esc(x.pn) + '</b><span class="pn-name">' + esc(x.name) + '</span></td>' +
            '<td class="muted">' + esc(x.model) + '</td>' +
            '<td>' + x.alts.map(function (a) { return SE.chip(a, 'neutral'); }).join(' ') + '</td>' +
            '<td>' + (x.oem ? SE.chip('OEM', 'success') : SE.chip('Aftermarket', 'neutral')) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    } else if (p.sec === 'supersessions') {
      tableHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Part</th><th>Model</th><th>Supersedes</th><th>Replaced by</th>' +
        '</tr></thead><tbody>' +
        secData.map(function (x) {
          return '<tr>' +
            '<td><b>' + esc(x.pn) + '</b><span class="pn-name">' + esc(x.name) + '</span></td>' +
            '<td class="muted">' + esc(x.model) + '</td>' +
            '<td>' + (x.supersedes ? SE.chip(x.supersedes, 'neutral') : '<span class="muted">—</span>') + '</td>' +
            '<td>' + (x.supersededBy ? SE.chip(x.supersededBy, 'warning') : SE.chip('Current', 'success')) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    } else if (p.sec === 'fitment') {
      tableHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Part</th><th>Model</th><th>Compatible machines</th>' +
        '</tr></thead><tbody>' +
        secData.map(function (x) {
          return '<tr>' +
            '<td><b>' + esc(x.pn) + '</b><span class="pn-name">' + esc(x.name) + '</span></td>' +
            '<td class="muted">' + esc(x.model) + '</td>' +
            '<td class="ecat-fits">' + x.fits.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    } else { // specs
      tableHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Part</th><th>Model</th><th>Technical data</th>' +
        '</tr></thead><tbody>' +
        secData.map(function (x) {
          return '<tr>' +
            '<td><b>' + esc(x.pn) + '</b><span class="pn-name">' + esc(x.name) + '</span></td>' +
            '<td class="muted">' + esc(x.model) + '</td>' +
            '<td class="ecat-spec-cell">' + esc(x.spec) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    }
    var sh = SE.shell(el, {
      nav: 'catalog', title: (sec ? sec.name : p.sec) + ' · ' + sup.name, wide: true,
      crumbs: [['Parts catalog', catQ], ['Enhanced Catalog', eQ], [sup.name, 'enhanced-catalog?sup=' + sup.id + (p.wo ? '&wo=' + p.wo : '')]],
      sub: sup.name + ' · ' + (sec ? sec.desc : ''),
      body: C.layout({ extra: 'enhanced-catalog', esup: sup.id, esec: p.sec }, p.wo,
        UI.sec(sec ? sec.name : p.sec, '<span class="muted">' + secData.length + ' parts</span>', tableHtml, 'h-sec'))
    });
    return sh.cleanup;
  }

  // ---- supplier-level view: ?sup=JLG ----
  if (p.sup) {
    var sup = SE.supplier(p.sup);
    var edata = sup && EDATA[sup.id] ? EDATA[sup.id] : null;
    if (!sup || !edata) { SE.go('enhanced-catalog'); return function () {}; }
    var secCards = ESECS.map(function (sec) {
      return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(sup.id) + '&sec=' + sec.id + (p.wo ? '&wo=' + p.wo : '') + '">' +
        '<span class="sup-pf-icon">' + icon(sec.icon) + '</span>' +
        '<span class="sup-pf-body"><b>' + esc(sec.name) + '</b><small>' + esc(sec.desc) + '</small></span>' +
        icon('angle-small-right') +
      '</a>';
    }).join('');
    var sh = SE.shell(el, {
      nav: 'catalog', title: sup.name + ' Enhanced Catalog', wide: true,
      crumbs: [['Parts catalog', catQ], ['Enhanced Catalog', eQ]],
      sub: sup.name + ' · Cross-references, supersessions, fitment guides, and technical specs',
      body: C.layout({ extra: 'enhanced-catalog', esup: sup.id }, p.wo,
        UI.sec('Featured enhanced parts', '<span class="muted">' + edata.featured.length + ' highlighted</span>',
          '<div class="ecat-fp-grid">' + edata.featured.map(function (x) { return featCard(x, false); }).join('') + '</div>', 'h-feat') +
        UI.sec('Browse sections', '',
          '<div class="sup-pf-grid">' + secCards + '</div>', 'h-secs'))
    });
    return sh.cleanup;
  }

  // ---- top-level view ----
  var allFeat = [];
  ['JLG', 'SKJ'].forEach(function (supId) {
    var sup = SE.supplier(supId);
    if (!sup || !EDATA[supId]) return;
    EDATA[supId].featured.forEach(function (x) {
      allFeat.push({ sup: sup.name, pn: x.pn, name: x.name, model: x.model, xrefs: x.xrefs, superseded: x.superseded, price: x.price });
    });
  });
  var connSups = D.suppliers ? D.suppliers.filter(function (s) { return s.active && s.status === 'Connected'; }) : [];
  var supSection = connSups.length
    ? UI.sec('Suppliers with enhanced data', '',
        '<div class="sup-pf-grid">' + connSups.map(function (s) {
          return '<a class="sup-pf-card card" href="#/enhanced-catalog?sup=' + esc(s.id) + (p.wo ? '&wo=' + p.wo : '') + '">' +
            '<span class="sup-pf-icon">' + icon('building') + '</span>' +
            '<span class="sup-pf-body"><b>' + esc(s.name) + '</b><small>' + esc(s.tagline) + '</small></span>' +
            icon('angle-small-right') +
          '</a>';
        }).join('') + '</div>', 'h-sups')
    : '';
  var sh = SE.shell(el, {
    nav: 'catalog', title: 'Enhanced Catalog', wide: true,
    crumbs: [['Parts catalog', catQ]],
    sub: 'Cross-references, supersessions, fitment guides, and technical specs',
    body: C.layout({ extra: 'enhanced-catalog' }, p.wo,
      UI.sec('Featured enhanced parts', '<span class="muted">' + allFeat.length + ' across all suppliers</span>',
        '<div class="ecat-fp-grid">' + allFeat.map(function (x) { return featCard(x, true); }).join('') + '</div>', 'h-feat') +
      supSection)
  });
  return sh.cleanup;
};
