/* Supplier (B2, DES-44 and DES-48/49 enhanced catalog), web. Dark brand panel, inline active work
   orders table, product families grid, right-hand aside with capability checklist and news.
   A line opens as a table of items with add to cart; those items never appear in a machine category.
   #/supplier?sup=JLG   #/supplier?sup=SKJ   #/supplier?sup=JLG&line=consumables   (+ &wo=) */
SE.titles.supplier = 'Supplier';
SE.views.supplier = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var s = SE.supplier(p.sup || 'JLG');
  if (!s || !s.active) s = SE.supplier('JLG');
  var lines = C.lines(s.id);
  var line = lines.find(function (l) { return l[0] === p.line; }) || null;
  var catQ = 'catalog' + (p.wo ? '?wo=' + p.wo : '');

  if (line) {
    var list = C.lineItems(s.id, line[0]), unit = C.unit(p.wo);
    var rows = list.map(function (x) {
      return '<tr data-row data-pn="' + x.pn + '" tabindex="0"><td class="cell-pn"><span class="pn-link">' + esc(x.pn) + '</span><span class="pn-name">' + esc(x.name) + ' · ' + esc(C.per(x)) + '</span></td>' +
        '<td class="q-cell">' + C.quickBtn(x, unit) + '</td></tr>';
    }).join('');
    var sh = SE.shell(el, {
      nav: 'catalog', title: line[1], wide: true,
      crumbs: [['Parts catalog', catQ], [s.name, 'supplier?sup=' + s.id + C.woQ(p.wo)]],
      sub: esc(s.name) + '\'s own line: ' + esc(line[2].toLowerCase()) + '. Not tied to a model, so these items are not in any machine category.',
      body: C.layout({ sup: s.id, line: line[0] }, p.wo,
        UI.sec(s.name + ' ' + line[1].toLowerCase() + ' · ' + list.length + ' items', '', '<div class="tbl-wrap"><table class="tbl line-tbl"><thead><tr><th scope="col">Part</th><th scope="col" aria-label="Add to cart"></th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'h-line')),
    });
    function open(r) { SE.go('part', { params: p.wo ? { pn: r.dataset.pn, wo: p.wo } : { pn: r.dataset.pn } }); }
    el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quick]');
      if (q) { C.quickAdd(q.dataset.quick, p.wo); sh.refresh && sh.refresh(); return; }
      var r = e.target.closest('tr[data-row]');
      if (r) open(r);
    });
    el.addEventListener('keydown', function (e) {
      var r = e.target.closest && e.target.closest('tr[data-row]');
      if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(r); }
    });
    return sh.cleanup;
  }

  var docs = D.manuals.filter(function (m) { return s.machines.indexOf(m.machine) >= 0; });
  var orders = SE.orders().filter(function (o) { return o.supplier === s.name; });
  var machineNames = s.machines.map(function (k) { var m = SE.machine(k); return m ? m.name : ''; });
  var activeWos = SE.allWorkOrders().filter(function (w) {
    return w.status !== 'Done' && !SE.state.cancelled[w.id] && machineNames.indexOf(w.machine) >= 0;
  });
  var supNews = D.news.filter(function (n) { return s.machines.indexOf(n.machine) >= 0; });
  var totalUnits = C.units(s);
  var lineCount = lines.reduce(function (n, l) { return n + C.lineItems(s.id, l[0]).length; }, 0);

  // per-supplier dark brand palettes
  var BRAND = {
    JLG:  ['#1c1000', '#0e0800'],
    SKJ:  ['#0f0530', '#070218'],
    RDH:  ['#011526', '#000b14'],
    PRF:  ['#061506', '#030b03'],
    NGE:  ['#011826', '#000b14'],
    STT:  ['#160202', '#0a0101'],
    LKF:  ['#1a0e00', '#0e0700'],
    IWE:  ['#120808', '#080404']
  };
  var PALETTES = [
    ['#0a1020', '#050810'], ['#0d0820', '#070410'],
    ['#0a1808', '#050c04'], ['#140808', '#0a0404'],
    ['#081020', '#040810'], ['#100820', '#080410']
  ];
  function brandFor(id) {
    if (BRAND[id]) return BRAND[id];
    var h = id.split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0);
    return PALETTES[h % PALETTES.length];
  }
  var bp = brandFor(s.id);
  var shortStatus = s.status === 'Connected' ? 'Connected' : s.status ? 'Pending' : 'OEM';

  var brandPanel = '<div class="sup-brand-panel" style="background: linear-gradient(145deg, ' + bp[0] + ' 0%, ' + bp[1] + ' 100%)">' +
    '<div class="sbp-dots"></div>' +
    '<div class="sbp-glow"></div>' +
    '<div class="sbp-mark" aria-hidden="true">' + esc(s.name.split(' ')[0].toUpperCase()) + '</div>' +
    '<div class="sbp-badge" aria-hidden="true">' + esc(s.id) + '</div>' +
    '<div class="sbp-status">' + esc(shortStatus) + '</div>' +
    '<div class="sbp-label"><b>' + esc(s.name) + '</b><span>' + esc(s.tagline) + '</span></div>' +
  '</div>';

  // machine name → key (for WO Browse Parts links)
  var machNameToKey = {};
  s.machines.forEach(function (k) { var m = SE.machine(k); if (m) machNameToKey[m.name] = k; });

  // active work orders — inline table
  var woSection = '';
  if (activeWos.length) {
    var woRows = activeWos.map(function (w) {
      var machKey = machNameToKey[w.machine] || s.machines[0];
      return '<tr>' +
        '<td><a class="pn-link" href="#/work-order?id=' + esc(w.id) + '">#' + esc(w.id) + '</a></td>' +
        '<td>' + esc(w.machine) + '</td>' +
        '<td class="sup-wo-asset">' + esc(w.equip || '—') + '</td>' +
        '<td class="muted">' + esc(w.issue || '—') + '</td>' +
        '<td>' + SE.chip(w.status, w.tone) + '</td>' +
        '<td class="q-cell"><a class="btn btn-primary sup-wo-browse" href="#/machine?m=' + esc(machKey) + '&wo=' + esc(w.id) + '">Browse parts</a></td>' +
      '</tr>';
    }).join('');
    woSection = UI.sec('Active work orders', '<span class="muted">' + activeWos.length + '</span>',
      '<div class="tbl-wrap"><table class="tbl sup-wo-tbl"><thead><tr>' +
        '<th scope="col">WO #</th><th scope="col">Machine</th><th scope="col">Asset</th>' +
        '<th scope="col">Description</th><th scope="col">Status</th><th scope="col" aria-label="Browse parts"></th>' +
      '</tr></thead><tbody>' + woRows + '</tbody></table></div>', 'h-wo');
  }

  // product families — machines grouped by type, then supplier lines
  var typeMap = {};
  s.machines.forEach(function (k) {
    var m = SE.machine(k);
    if (!m) return;
    if (!typeMap[m.type]) typeMap[m.type] = { type: m.type, keys: [], models: [] };
    typeMap[m.type].keys.push(k);
    typeMap[m.type].models.push(m.name);
  });
  var pfMachCards = Object.keys(typeMap).map(function (t) {
    var g = typeMap[t];
    return '<a class="sup-pf-card card" href="#/machine?m=' + esc(g.keys[0]) + C.woQ(p.wo) + '">' +
      '<span class="sup-pf-icon">' + icon('grid-alt') + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(t + 's') + '</b><small>' + esc(g.models.join(', ')) + '</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');
  var pfLineCards = lines.map(function (l) {
    return '<a class="sup-pf-card card" href="#/supplier?sup=' + esc(s.id) + '&line=' + esc(l[0]) + C.woQ(p.wo) + '">' +
      '<span class="sup-pf-icon">' + icon('settings-sliders') + '</span>' +
      '<span class="sup-pf-body"><b>' + esc(l[1]) + '</b><small>' + esc(l[2]) + '</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');
  var pfSection = (pfMachCards || pfLineCards)
    ? UI.sec('Product families', '', '<div class="sup-pf-grid">' + pfMachCards + pfLineCards + '</div>', 'h-pf')
    : '';

  // aside — capabilities checklist
  var caps = [
    ['Parts lookup', true],
    ['Parts diagrams', docs.some(function (d) { return d.kind === 'diagram'; })],
    ['Support manuals', docs.length > 0],
    ['Service catalog', lineCount > 0],
    ['OEM ordering', s.status === 'Connected'],
    ['Digital delivery', s.status === 'Connected']
  ];
  var capList = '<ul class="sup-feat-list">' + caps.map(function (c) {
    return '<li class="' + (c[1] ? 'ok' : 'off') + '">' + icon(c[1] ? 'check' : 'cross-small') + '<span>' + esc(c[0]) + '</span></li>';
  }).join('') + '</ul>';

  // aside — description derived from fleet data
  var machTypes = Object.keys(typeMap);
  var descTypes = machTypes.length ? machTypes.map(function (t) { return t.toLowerCase() + 's'; }).join(', ') : 'industrial equipment';
  var desc = s.description || (s.name + ' manufactures ' + descTypes + '. ' +
    (totalUnits > 0
      ? 'Your fleet includes ' + totalUnits + ' unit' + (totalUnits !== 1 ? 's' : '') + ' covered by OEM parts.'
      : 'Parts and service documentation are available through the catalog.'));

  // aside — action buttons
  var asideActions = '<div class="si-actions">' +
    '<a class="btn btn-secondary" href="#/manuals?m=' + esc(s.machines[0]) + '">' + icon('book-alt') + 'Manuals</a>' +
    '<a class="btn btn-secondary" href="#/orders?q=' + encodeURIComponent(s.name) + '">' + icon('time-past') + 'Orders</a>' +
    '<a class="btn btn-secondary" href="#/catalog?q=' + encodeURIComponent(s.name) + C.woQ(p.wo) + '">' + icon('grid-alt') + 'Catalog</a>' +
  '</div>';

  // aside — external links (dummy placeholders per supplier)
  var SUP_LINKS = {
    JLG:  [['jlg.com', '#'], ['OEM parts portal', '#'], ['Service & manuals', '#'], ['Training academy', '#']],
    SKJ:  [['skyjack.com', '#'], ['Technical support', '#'], ['Parts & service', '#'], ['Warranty portal', '#']],
    RDH:  [['Redhead Equipment', '#'], ['OEM support', '#'], ['Service bulletins', '#'], ['Dealer locator', '#']],
    PRF:  [['primeforce.com', '#'], ['Technical docs', '#'], ['Parts ordering', '#'], ['Support center', '#']],
    NGE:  [['ngage.com', '#'], ['OEM catalog', '#'], ['Service portal', '#'], ['Training & certs', '#']],
    STT:  [['stratton.com', '#'], ['Dealer support', '#'], ['Parts & diagrams', '#'], ['Recall notices', '#']],
    LKF:  [['lakeforest.com', '#'], ['OEM parts', '#'], ['Service bulletins', '#'], ['Warranty claims', '#']],
    IWE:  [['ironwork.com', '#'], ['Technical support', '#'], ['Parts catalog', '#'], ['Dealer portal', '#']]
  };
  var defLinks = [[s.name.split(' ')[0].toLowerCase() + '.com', '#'], ['OEM support portal', '#'], ['Technical documentation', '#'], ['Parts ordering', '#']];
  var supLinks = SUP_LINKS[s.id] || defLinks;
  var linksHtml = '<div class="sup-asi-links-h">Resources &amp; links</div>' +
    '<ul class="sup-asi-links">' + supLinks.map(function (l) {
      return '<li><a class="sup-asi-link-item" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' +
        icon('external') + '<span>' + esc(l[0]) + '</span>' + icon('arrow-small-right') +
      '</a></li>';
    }).join('') + '</ul>';

  // aside — news
  var newsHtml = supNews.length
    ? '<div class="sup-asi-news-h">' + esc(s.name) + ' news</div>' +
      '<div class="sup-asi-news">' + supNews.slice(0, 4).map(function (n) {
        return '<a class="sup-asi-news-item" href="#/article?id=' + encodeURIComponent(n.id) + '">' +
          '<span class="sup-asi-news-date">' + esc(n.date) + '</span>' +
          '<span class="sup-asi-news-title">' + esc(n.title) + '</span>' +
        '</a>';
      }).join('') + '</div>'
    : '';

  var aside = '<aside class="card sup-aside">' +
    '<div class="sup-asi-id">' + C.badge(s, 'lg') +
      '<div><b class="sup-asi-name">' + esc(s.name) + '</b><span class="sup-asi-tagline">' + esc(s.tagline) + '</span></div>' +
    '</div>' +
    '<p class="sup-asi-desc">' + esc(desc) + '</p>' +
    capList +
    asideActions +
    linksHtml +
    newsHtml +
  '</aside>';

  var body = '<div class="sup-layout">' +
    '<div class="sup-main">' + brandPanel + woSection + pfSection + '</div>' +
    aside +
  '</div>';

  var s2 = SE.shell(el, {
    nav: 'catalog', title: s.name, wide: true, crumbs: [['Parts catalog', catQ]],
    sub: esc(s.tagline) + ' · ' + totalUnits + ' units in your fleet',
    body: C.layout({ sup: s.id }, p.wo, body),
  });

  return s2.cleanup;
};
