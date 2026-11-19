/* Supplier (B2, DES-44 and DES-48/49 enhanced catalog), web. The supplier's marketing image slot (only on
   this page), name, line and fleet count, then its 2 halves side by side: Machines (the model tree) and the
   supplier's own lines (consumables, attachments, tires) that belong to no model. A line opens as a table of
   items with add to cart; those items never appear in a machine category. Catalog tree on the left.
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
      sub: esc(s.name) + '\'s own line: ' + esc(line[2].toLowerCase()) + '. Not tied to a model, so these items are not in any machine catalog.',
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

  // capability tags: machine types + own line categories
  var features = [];
  s.machines.forEach(function (k) { var m = SE.machine(k); if (m && features.indexOf(m.type) < 0) features.push(m.type); });
  lines.forEach(function (l) { if (features.indexOf(l[1]) < 0) features.push(l[1]); });

  var lineCount = lines.reduce(function (n, l) { return n + C.lineItems(s.id, l[0]).length; }, 0);

  // per-supplier brand palettes: [gradient-start, gradient-end]
  var BRAND = {
    JLG:  ['#D97B00', '#8C4600'],
    SKJ:  ['#6B2FA0', '#3A1060'],
    RDH:  ['#1565C0', '#0A3A7A'],
    PRF:  ['#2E7D32', '#1B4D1E'],
    NGE:  ['#0277BD', '#01427A'],
    STT:  ['#B71C1C', '#6D0909'],
    LKF:  ['#EF6C00', '#B34700'],
    IWE:  ['#4E342E', '#2D1B17']
  };
  var PALETTES = [
    ['#1A6B4A', '#0D3D2A'], ['#1A3D7A', '#0A2050'], ['#6B2FA0', '#3A1060'],
    ['#8C2A00', '#4A1500'], ['#1E5C8A', '#0C2F47'], ['#5C3A8A', '#2D1A50']
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
    '<div class="sbp-mark" aria-hidden="true">' + esc(s.name.split(' ')[0]) + '</div>' +
    '<div class="sbp-badge" aria-hidden="true">' + esc(s.id) + '</div>' +
    '<div class="sbp-status">' + esc(shortStatus) + '</div>' +
    '<div class="sbp-label"><b>' + esc(s.name) + '</b><span>' + esc(s.tagline) + '</span></div>' +
  '</div>';

  // compact stats row: models · units · lines · orders · docs
  var statItems = [
    [String(s.machines.length), 'model' + (s.machines.length !== 1 ? 's' : '')],
    [String(totalUnits), 'unit' + (totalUnits !== 1 ? 's' : '') + ' in fleet'],
    [String(lines.length), 'product line' + (lines.length !== 1 ? 's' : '')],
    [String(orders.length), 'order' + (orders.length !== 1 ? 's' : '') + ' placed'],
    [String(docs.length), 'doc' + (docs.length !== 1 ? 's' : '')]
  ];
  var statsBar = '<div class="si-stats">' + statItems.map(function (it) {
    return '<span class="si-stat"><b>' + esc(it[0]) + '</b>' + esc(it[1]) + '</span>';
  }).join('<span class="si-stat-sep" aria-hidden="true">·</span>') + '</div>';

  // action buttons
  var woBtn = '<button type="button" class="btn btn-secondary" data-sup-wo-toggle aria-expanded="false" aria-controls="sup-wo-panel">' +
    icon('settings-sliders') + 'Work orders' +
    (activeWos.length ? ' <span class="si-wo-ct">' + activeWos.length + '</span>' : '') +
  '</button>';
  var actions = '<div class="si-actions">' +
    '<a class="btn btn-secondary" href="#/manuals?m=' + s.machines[0] + '">' + icon('book-alt') + 'Manuals</a>' +
    '<a class="btn btn-secondary" href="#/orders?q=' + encodeURIComponent(s.name) + '">' + icon('time-past') + 'Orders</a>' +
    '<a class="btn btn-secondary" href="#/catalog?q=' + encodeURIComponent(s.name) + C.woQ(p.wo) + '">' + icon('grid-alt') + 'Browse catalog</a>' +
    woBtn +
  '</div>';

  var hero = '<div class="sup-hero">' +
    brandPanel +
    '<div class="card sup-info">' +
      '<div class="si-head">' + C.badge(s, 'lg') +
        '<div><h2>' + esc(s.name) + '</h2><p class="si-tagline">' + esc(s.tagline) + '</p></div>' +
      '</div>' +
      (features.length ? '<div class="si-features">' + features.map(function (f) { return '<span class="chip t-neutral">' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
      statsBar +
      actions +
    '</div>' +
  '</div>';

  // work orders panel — hidden by default, toggled by the WO button
  var woRows = activeWos.map(function (w) {
    return '<a class="sup-wo-row" href="#/work-order?id=' + w.id + '">' +
      '<span class="sup-wo-id">#' + esc(w.id) + '</span>' +
      '<span class="sup-wo-body"><b>' + esc(w.issue) + '</b><small>' + esc(w.equip) + ' · ' + esc(w.machine) + '</small></span>' +
      SE.chip(w.status, w.tone) +
      '<span class="sup-wo-due">' + (w.due ? esc(w.due) : '') + '</span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');
  var woPanel = '<div id="sup-wo-panel" class="sup-wo-panel" hidden>' +
    UI.sec('Active work orders', '<span class="muted">' + (activeWos.length || 'None') + '</span>',
      activeWos.length
        ? '<div class="sup-wo-list">' + woRows + '</div>'
        : UI.empty({ icon: 'check', title: 'No open work orders', text: 'All work orders on ' + s.name + ' machines are closed.', tone: 'success' }),
      'h-wo') +
  '</div>';

  // own product lines (not machine catalog — no machine list)
  var own = lines.map(function (l) {
    var n = C.lineItems(s.id, l[0]).length;
    return '<li><a class="line-card" href="#/supplier?sup=' + s.id + '&line=' + l[0] + C.woQ(p.wo) + '"><span><b>' + esc(l[1]) + '</b><small>' + esc(l[2]) + '</small></span><span class="lc-n">' + n + ' item' + (n === 1 ? '' : 's') + '</span>' + icon('angle-small-right') + '</a></li>';
  }).join('');
  var linesSection = lines.length
    ? UI.sec(esc(s.name) + ' product lines', '<span class="muted">' + lines.length + ' line' + (lines.length !== 1 ? 's' : '') + '</span>', '<ul class="half-list">' + own + '</ul>', 'h-lines')
    : '';

  // models summary (compact — no per-asset list, just model cards linking to machine catalog)
  var modelCards = s.machines.map(function (k) {
    var m = SE.machine(k);
    return '<li><a class="mach-card" href="#/machine?m=' + k + C.woQ(p.wo) + '">' + UI.thumb() +
      '<span><b>' + esc(m.name) + '</b><small>' + esc(m.type) + ' · ' + m.units.length + ' unit' + (m.units.length !== 1 ? 's' : '') + ' in fleet</small></span>' +
      icon('angle-small-right') + '</a></li>';
  }).join('');
  var modelsSection = UI.sec('Models', '<span class="muted">' + s.machines.length + ' model · ' + totalUnits + ' units</span>', '<ul class="half-list">' + modelCards + '</ul>', 'h-models');

  var TONE = { 'Recall': 'danger', 'Bulletin': 'warning', 'Article': 'info' };
  var newsCards = supNews.map(function (n) {
    return '<a class="sr-browse card sup-news-card" href="#/article?id=' + encodeURIComponent(n.id) + '">' +
      SE.chip(n.kind, TONE[n.kind] || 'neutral') +
      '<span class="sup-news-body"><b>' + esc(n.title) + '</b><small>' + esc(n.date) + (n.machine ? ' · ' + esc(n.machine) : '') + '</small></span>' +
      icon('angle-small-right') +
    '</a>';
  }).join('');
  var newsSection = supNews.length
    ? UI.sec('News & updates', '<span class="muted">' + supNews.length + ' item' + (supNews.length !== 1 ? 's' : '') + '</span>', '<div class="sup-news-list">' + newsCards + '</div>', 'h-news')
    : '';

  var s2 = SE.shell(el, {
    nav: 'catalog', title: s.name, wide: true, crumbs: [['Parts catalog', catQ]],
    sub: esc(s.tagline) + ' · ' + totalUnits + ' units in your fleet',
    body: C.layout({ sup: s.id }, p.wo, hero + woPanel + modelsSection + linesSection + newsSection),
  });

  // WO panel toggle
  var woToggle = el.querySelector('[data-sup-wo-toggle]');
  var woPanelEl = el.querySelector('#sup-wo-panel');
  if (woToggle && woPanelEl) {
    woToggle.addEventListener('click', function () {
      var open = woPanelEl.hidden;
      woPanelEl.hidden = !open;
      woToggle.setAttribute('aria-expanded', String(open));
      woToggle.classList.toggle('btn-active', open);
    });
  }

  return s2.cleanup;
};
