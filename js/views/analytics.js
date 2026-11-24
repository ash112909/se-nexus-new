/* Fleet Analytics (B-AN; fleet view, not supplier analytics).
   Metrics: parts spend trend, avg cost per WO, open orders, avg days to close,
   pending approvals, overnight shipping %; mechanic spend, vendor concentration,
   top parts by qty, spend by asset, order type mix, approval pipeline.
   State: #/analytics */
SE.titles.analytics = 'Analytics';
SE.views.analytics = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;

  // Persist filter state across navigations
  var ST = SE.state.analytics || (SE.state.analytics = {});
  if (!ST.period) ST.period = '30D';
  if (!ST.locs) ST.locs = D.locations.map(function (l) { return l.id; });
  if (!ST.hkpi) ST.hkpi = 'parts_spend';

  // ── Accent colors per location index ────────────────────────────────────
  var LC = ['#1A1A1A', '#3B6D11', '#534AB7', '#A32D2D', '#B87A00'];

  // ── Synthetic monthly spend base (12 months, last = most recent) ─────────
  var LOC_BASE = {
    austin:    [4200,5100,3800,6200,5400,4800,7100,6300,5900,8200,7400,6850],
    sanmarcos: [2100,2800,1900,3400,2900,2600,3800,3200,3000,4100,3700,3420],
    kyle:      [1600,2100,1400,2600,2200,1900,2900,2400,2200,3100,2800,2580],
    monterrey: [1800,2300,1600,2800,2400,2100,3100,2600,2400,3300,3000,2780],
  };
  var MONTH_LABELS = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul'];

  function selLocs() {
    return D.locations.filter(function (l) { return ST.locs.indexOf(l.id) >= 0; });
  }

  function locLabel() {
    var n = ST.locs.length, total = D.locations.length;
    return n === total ? 'All locations' : n + ' location' + (n === 1 ? '' : 's');
  }

  function getSpend() {
    var sel = selLocs();
    var base = {};
    sel.forEach(function (l) { base[l.id] = LOC_BASE[l.id] || LOC_BASE.austin.map(function (v) { return Math.round(v * 0.7); }); });

    if (ST.period === '12M') {
      var combined = MONTH_LABELS.map(function (_, mi) {
        return sel.reduce(function (s, l) { return s + (base[l.id][mi] || 0); }, 0);
      });
      return { labels: MONTH_LABELS, values: combined };
    }
    if (ST.period === '90D') {
      var labels3 = ['May', 'Jun', 'Jul'];
      var vals3 = [9, 10, 11].map(function (mi) { return sel.reduce(function (s, l) { return s + (base[l.id][mi] || 0); }, 0); });
      return { labels: labels3, values: vals3 };
    }
    if (ST.period === '30D') {
      var base30 = sel.reduce(function (s, l) { return s + (base[l.id][11] || 0); }, 0);
      return { labels: ['Wk 1','Wk 2','Wk 3','Wk 4'], values: [0.22,0.28,0.24,0.26].map(function (r) { return Math.round(base30 * r); }) };
    }
    // 7D
    var base7 = sel.reduce(function (s, l) { return s + Math.round((base[l.id][11] || 0) / 4.3); }, 0);
    return { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values: [0.14,0.18,0.16,0.22,0.17,0.08,0.05].map(function (r) { return Math.round(base7 * r); }) };
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  var s = SE.shell(el, {
    nav: 'analytics', title: 'Analytics', crumbs: [['Home', 'home']],
    sub: 'Fleet parts spend and work order health.',
    body: filterBarHtml() + '<div id="an-body" class="an-content"></div>',
  });

  renderContent();

  // ── Filter bar ──────────────────────────────────────────────────────────
  function filterBarHtml() {
    return '<div class="an-filter-bar" id="an-filter-bar">' +
      '<span class="an-filter-label">Period</span>' +
      '<div class="an-period-pills">' +
        ['7D','30D','90D','12M'].map(function (p) {
          return '<button type="button" class="an-period-pill' + (ST.period === p ? ' on' : '') + '" data-anperiod="' + p + '">' + p + '</button>';
        }).join('') +
      '</div>' +
      '<div class="an-filter-sep"></div>' +
      '<div class="an-loc-wrap" id="an-loc-wrap">' +
        '<button type="button" class="an-loc-btn" id="an-loc-btn" data-anloc-toggle>' +
          icon('map-marker') + '<span id="an-loc-lbl">' + locLabel() + '</span>' + icon('angle-small-down') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function buildLocPanel() {
    var all = D.locations, allSel = ST.locs.length === all.length;
    var panel = document.createElement('div');
    panel.id = 'an-loc-panel';
    panel.className = 'an-loc-panel';
    panel.innerHTML =
      '<div class="an-loc-panel-head"><span>Locations</span>' +
        '<button type="button" data-anloc-all>' + (allSel ? 'Deselect all' : 'Select all') + '</button>' +
      '</div>' +
      '<div class="an-loc-list">' +
        all.map(function (l, i) {
          return '<label class="an-loc-item"><input type="checkbox" data-anloc-id="' + esc(l.id) + '"' + (ST.locs.indexOf(l.id) >= 0 ? ' checked' : '') + '>' +
            '<div class="an-loc-dot" style="background:' + LC[i % LC.length] + '"></div>' + esc(l.name) + '</label>';
        }).join('') +
      '</div>';
    return panel;
  }

  function closeLocPanel() {
    var p = document.getElementById('an-loc-panel'), b = document.getElementById('an-loc-btn');
    if (p) p.remove();
    if (b) b.classList.remove('open');
  }

  function syncLocLabel() {
    var lbl = document.getElementById('an-loc-lbl');
    if (lbl) lbl.textContent = locLabel();
  }

  // ── Event delegation ────────────────────────────────────────────────────
  var _locOutside = null;

  el.addEventListener('click', function (e) {
    // period pill
    var pill = e.target.closest('[data-anperiod]');
    if (pill) {
      ST.period = pill.dataset.anperiod;
      el.querySelectorAll('[data-anperiod]').forEach(function (p) { p.classList.toggle('on', p.dataset.anperiod === ST.period); });
      renderContent();
      return;
    }
    // location toggle button
    if (e.target.closest('[data-anloc-toggle]')) {
      var wrap = document.getElementById('an-loc-wrap'), btn = document.getElementById('an-loc-btn');
      var existing = document.getElementById('an-loc-panel');
      if (existing) { closeLocPanel(); return; }
      btn.classList.add('open');
      wrap.appendChild(buildLocPanel());
      if (_locOutside) document.removeEventListener('click', _locOutside, true);
      _locOutside = function (ev) {
        if (!wrap || !wrap.contains(ev.target)) {
          closeLocPanel();
          document.removeEventListener('click', _locOutside, true);
          _locOutside = null;
        }
      };
      setTimeout(function () { document.addEventListener('click', _locOutside, { capture: true, once: false }); }, 0);
      return;
    }
    // select/deselect all
    var allBtn = e.target.closest('[data-anloc-all]');
    if (allBtn) {
      var allSel2 = ST.locs.length === D.locations.length;
      ST.locs = allSel2 ? [D.locations[0].id] : D.locations.map(function (l) { return l.id; });
      closeLocPanel();
      syncLocLabel();
      renderContent();
      return;
    }
    // heatmap KPI
    var hkBtn = e.target.closest('[data-anhkpi]');
    if (hkBtn) { ST.hkpi = hkBtn.dataset.anhkpi; renderContent(); return; }
    // approvals nav
    if (e.target.closest('[data-an-go-approvals]')) { SE.go('approvals', {}); return; }
  });

  el.addEventListener('change', function (e) {
    var cb = e.target.closest('[data-anloc-id]');
    if (cb) {
      var id = cb.dataset.anlocId;
      if (!cb.checked && ST.locs.length === 1) { cb.checked = true; return; }
      if (cb.checked) {
        if (ST.locs.indexOf(id) < 0) ST.locs.push(id);
      } else {
        ST.locs = ST.locs.filter(function (x) { return x !== id; });
      }
      syncLocLabel();
      renderContent();
    }
  });

  // ── Content renderer ─────────────────────────────────────────────────────
  function renderContent() {
    var body = el.querySelector('#an-body');
    if (!body) return;
    body.innerHTML = renderDashboard();
  }

  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function ibar(pct, color) {
    return '<div class="an-inline-bar"><div class="an-inline-fill" style="width:' + Math.max(2, Math.round(pct * 100)) + '%;background:' + color + ';"></div></div>';
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  function renderDashboard() {
    var sel = selLocs();
    var selNames = sel.map(function (l) { return l.name.split(' ')[0]; }).join(', ');
    var spend = getSpend();
    var totalSpend = spend.values.reduce(function (s, v) { return s + v; }, 0);
    var priorSpend = totalSpend * (0.82 + 0.24 * 0.5); // deterministic "prior"
    var spendDelta = ((totalSpend - priorSpend) / priorSpend * 100).toFixed(1);
    var maxSpendVal = Math.max.apply(null, spend.values.concat([1]));

    // WO metrics from real data
    var allWOs = SE.workOrders();
    var openWOs    = allWOs.filter(function (w) { return w.status === 'Open'; });
    var awaitWOs   = allWOs.filter(function (w) { return w.status === 'Awaiting approval'; });
    var closedWOs  = allWOs.filter(function (w) { return w.status === 'Closed'; });
    var highPri    = openWOs.filter(function (w) { return w.priority === 'High'; }).length;
    var overdueWOs = openWOs.filter(function (w) {
      if (!w.due) return false;
      return new Date(w.due + ', 2026') < new Date('2026-11-01');
    }).length;

    var periodMult = { '7D':0.065, '30D':0.28, '90D':0.78, '12M':1 }[ST.period] || 0.28;
    var avgClose = (2.4 + sel.length * 0.3).toFixed(1);
    var overnightPct = Math.min(99, Math.round(31 + sel.length * 3));
    var overnightPrior = Math.round(overnightPct * 0.92);
    var pendCount = SE.pendingApprovals().length + 1;
    var pendValue = 1840 + sel.length * 620;

    // mechanics
    var MECHS = [
      { name:'James W.',  av:'JW', c:'#1A1A1A', tc:'#FFF' },
      { name:'Marcus T.', av:'MT', c:'#3B6D11', tc:'#FFF' },
      { name:'Lena R.',   av:'LR', c:'#534AB7', tc:'#FFF' },
      { name:'Darius K.', av:'DK', c:'#A32D2D', tc:'#FFF' },
      { name:'Priya N.',  av:'PN', c:'#B87A00', tc:'#FFF' },
    ];
    var mechData = MECHS.map(function (m, i) {
      var base = [6800,5200,4100,3800,2900][i] * periodMult * Math.max(sel.length, 1) * 0.55;
      var orders = Math.round([14,11,9,8,6][i] * periodMult);
      return { name:m.name, av:m.av, c:m.c, tc:m.tc, spend:Math.round(base), orders:orders };
    }).sort(function (a, b) { return b.spend - a.spend; });
    var maxMech = Math.max.apply(null, mechData.map(function (m) { return m.spend; }).concat([1]));

    // vendors
    var VSEED = [
      { name:'Skyjack',     pct:0.38, c:'#1A1A1A' },
      { name:'Caterpillar', pct:0.24, c:'#3B6D11' },
      { name:'Toyota',      pct:0.16, c:'#534AB7' },
      { name:'Bobcat',      pct:0.12, c:'#A32D2D' },
      { name:'Parker',      pct:0.06, c:'#B87A00' },
      { name:'Grainger',    pct:0.04, c:'#55565C' },
    ];
    var vData = VSEED.map(function (v) { return { name:v.name, pct:v.pct, c:v.c, amount:Math.round(totalSpend * v.pct) }; });
    var topVendorPct = Math.round(VSEED[0].pct * 100);
    var concRisk = topVendorPct >= 40;

    // top parts
    var TOP_PARTS = [
      { pn:'SKJ-103100',   desc:'Hydraulic lift cylinder seal kit',  qty:Math.round(18*periodMult), trend:'up' },
      { pn:'CAT-1R0716',   desc:'Engine oil filter — Cat 320 C7.1', qty:Math.round(14*periodMult), trend:'flat' },
      { pn:'TOY-MCH-114',  desc:'Mast chain set — Toyota 8FGU25',   qty:Math.round(11*periodMult), trend:'up' },
      { pn:'SKJ-HF046-1G', desc:'Hydraulic fluid — ISO 46 · 1 gal', qty:Math.round(28*periodMult), trend:'up' },
      { pn:'BOB-QC-520',   desc:'Quick coupler seal kit — S650',     qty:Math.round(9*periodMult),  trend:'down' },
      { pn:'SKJ-BAT-500',  desc:'Battery — 6V 220Ah deep cycle',     qty:Math.round(7*periodMult),  trend:'up' },
      { pn:'SKJ-PAD-601',  desc:'Wear pad — UHMW polyethylene',      qty:Math.round(22*periodMult), trend:'up' },
    ].filter(function (p) { return p.qty > 0; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 7);
    var maxPart = Math.max.apply(null, TOP_PARTS.map(function (p) { return p.qty; }).concat([1]));

    // asset spend
    var ASSETS = [
      { id:'FL-031', name:'FL-031 — Toyota 8FGU25',     maker:'Toyota',      c:'#3B6D11', pct:0.28 },
      { id:'FL-017', name:'FL-017 — Cat 320',            maker:'Caterpillar', c:'#1A1A1A', pct:0.22 },
      { id:'FL-044', name:'FL-044 — Skyjack SJIII 3219', maker:'Skyjack',     c:'#534AB7', pct:0.18 },
      { id:'KY-001', name:'KY-001 — Bobcat S650',        maker:'Bobcat',      c:'#A32D2D', pct:0.15 },
      { id:'FL-078', name:'FL-078 — Skyjack SJIII 4632', maker:'Skyjack',     c:'#B87A00', pct:0.10 },
      { id:'Other',  name:'All other assets',             maker:'',            c:'#9CA3AF', pct:0.07 },
    ].map(function (a) { return { id:a.id, name:a.name, maker:a.maker, c:a.c, pct:a.pct, amount:Math.round(totalSpend * a.pct) }; });
    var maxAsset = Math.max.apply(null, ASSETS.map(function (a) { return a.amount; }).concat([1]));

    // WO type mix
    var WO_TYPES = [
      { label:'Corrective / repair',     pct:52, c:'#A32D2D' },
      { label:'Preventive maintenance',  pct:31, c:'#1A1A1A' },
      { label:'Inspection / safety',     pct:12, c:'#3B6D11' },
      { label:'Stock replenishment',     pct:5,  c:'#9CA3AF' },
    ];

    // approval pipeline preview
    var APPRV = [
      { wo:'Order #100094', mech:'James W.',  items:4, value:612, age:'2d' },
      { wo:'Order #100110', mech:'Marcus T.', items:2, value:388, age:'4d' },
      { wo:'Order #100102', mech:'Lena R.',   items:3, value:840, age:'6h' },
    ].slice(0, Math.min(pendCount, 3));

    // insights
    var INSIGHTS = [
      {
        icon:'truck-side', iconBg:'#FEF3C7', iconColor:'#111318',
        title:'FL-031 & FL-017 driving 50% of parts spend',
        body:'The Toyota 8FGU25 (FL-031) and Cat 320 (FL-017) together account for half of total parts spend this period. Both have open WOs with active parts orders.',
        tag:'Top assets', tagBg:'#EAF1FB', tagColor:'#111318',
      },
      {
        icon:'exclamation', iconBg:'#FCEBE8', iconColor:'#C42F1C',
        title:pendCount + ' order' + (pendCount === 1 ? '' : 's') + ' pending approval',
        body:fmt(pendValue) + ' in parts orders are awaiting sign-off — oldest is ' + (APPRV[1] ? APPRV[1].age : '4d') + ' old. Delays may impact WO due dates.',
        tag:'Action needed', tagBg:'#FCEBE8', tagColor:'#C42F1C',
      },
      {
        icon:'building', iconBg: concRisk ? '#FCEBE8' : '#E8F5F0', iconColor: concRisk ? '#C42F1C' : '#00745E',
        title: concRisk ? topVendorPct + '% spend with Skyjack' : 'Vendor mix is healthy',
        body: concRisk
          ? 'High vendor concentration with Skyjack may limit your negotiating position. Consider qualifying OEM-equivalent suppliers for seal kits and filters.'
          : 'Spend is distributed across 6 vendors. Your top supplier (Skyjack) is under 40%, reducing supply chain risk.',
        tag: concRisk ? 'Supply risk' : 'Healthy', tagBg: concRisk ? '#FCEBE8' : '#E8F5F0', tagColor: concRisk ? '#C42F1C' : '#00745E',
      },
    ];

    // trend bars
    var trendBars = spend.labels.map(function (lbl, i) {
      var h = Math.max(4, Math.round((spend.values[i] / maxSpendVal) * 90));
      var isLast = i === spend.labels.length - 1;
      var amt = spend.values[i] >= 1000 ? '$' + (spend.values[i] / 1000).toFixed(1) + 'k' : '$' + spend.values[i];
      return '<div class="an-bar-col">' +
        '<div class="an-bar-amt">' + (isLast || spend.labels.length <= 5 ? amt : '') + '</div>' +
        '<div class="an-bar-seg" style="height:' + h + 'px;background:' + (isLast ? 'var(--ink)' : 'var(--line)') + ';"></div>' +
        '<div class="an-bar-lbl">' + lbl + '</div>' +
      '</div>';
    }).join('');

    var totalWOs = allWOs.length;

    return '' +
    // KPI strip
    '<div class="an-kpi-row">' +
      kpi(fmt(totalSpend), 'Parts spend · ' + ST.period, (parseFloat(spendDelta) >= 0 ? 'up' : 'down'), (parseFloat(spendDelta) >= 0 ? '↑' : '↓') + ' ' + Math.abs(parseFloat(spendDelta)) + '% vs prior') +
      kpi(fmt(totalSpend / Math.max(closedWOs.length + 2, 1)), 'Avg cost per WO closed', 'neutral', closedWOs.length + ' WOs closed') +
      kpi(openWOs.length + awaitWOs.length, 'Open orders', highPri > 0 ? 'down' : 'neutral', highPri > 0 ? highPri + ' high priority' : 'None high priority') +
      kpi(avgClose + 'd', 'Avg days to close WO', overdueWOs > 0 ? 'down' : 'up', overdueWOs > 0 ? overdueWOs + ' overdue' : 'None overdue') +
      kpi(pendCount, 'Pending approvals', 'down', fmt(pendValue) + ' at risk') +
      kpi(overnightPct + '%', 'Shipped overnight', overnightPct >= overnightPrior ? 'down' : 'up', (overnightPct >= overnightPrior ? '↑' : '↓') + ' ' + Math.abs(overnightPct - overnightPrior) + 'pp vs prior') +
    '</div>' +

    // Smart insights
    '<div class="an-grid-insight">' +
      INSIGHTS.map(function (ins) {
        return '<div class="an-insight">' +
          '<div style="display:flex;align-items:flex-start;gap:9px;">' +
            '<div class="an-insight-icon" style="background:' + ins.iconBg + ';color:' + ins.iconColor + ';">' + icon(ins.icon) + '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="an-insight-title">' + esc(ins.title) + '</div>' +
              '<div class="an-insight-body">' + esc(ins.body) + '</div>' +
              '<div class="an-insight-tag" style="background:' + ins.tagBg + ';color:' + ins.tagColor + ';">' + esc(ins.tag) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +

    // Spend trend (2/3) + Order health (1/3)
    '<div class="an-grid-3">' +
      '<div class="an-card" style="grid-column:1/3;">' +
        '<div class="an-card-hdr">' +
          '<div class="an-card-title">' + icon('chart-histogram') + ' Parts spend trend</div>' +
          '<span class="an-card-sub">' + esc(selNames) + ' · ' + ST.period + '</span>' +
        '</div>' +
        '<div class="an-card-body">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">' +
            '<div style="font-size:20px;font-weight:700;color:var(--ink);letter-spacing:-0.5px;">' + fmt(totalSpend) + '</div>' +
            '<div style="font-size:11px;color:' + (parseFloat(spendDelta) >= 0 ? 'var(--success)' : 'var(--danger)') + ';font-weight:600;">' + (parseFloat(spendDelta) >= 0 ? '↑' : '↓') + ' ' + Math.abs(parseFloat(spendDelta)) + '% vs prior period</div>' +
          '</div>' +
          '<div class="an-trend-wrap">' + trendBars + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('clipboard-list') + ' Order health</div></div>' +
        '<div class="an-card-body" style="padding:9px 15px;">' +
          woStat('Open', openWOs.length, 'var(--tint-danger)', 'var(--danger)') +
          woStat('Awaiting approval', awaitWOs.length, '#FFF8EC', '#A8480A') +
          woStat('Closed', closedWOs.length, 'var(--tint-success)', 'var(--success)') +
          woStat('Overdue', overdueWOs, overdueWOs > 0 ? 'var(--tint-danger)' : 'var(--sunken)', overdueWOs > 0 ? 'var(--danger)' : 'var(--muted)') +
          woStat('High priority', highPri, highPri > 0 ? 'var(--tint-danger)' : 'var(--sunken)', highPri > 0 ? 'var(--danger)' : 'var(--muted)') +
          woStat('Pending approvals', pendCount, 'var(--tint-info)', 'var(--info)') +
        '</div>' +
      '</div>' +
    '</div>' +

    // Mechanic spend + Vendor concentration
    '<div class="an-grid-2">' +
      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('user') + ' Parts spend by mechanic</div><span class="an-card-sub">' + ST.period + '</span></div>' +
        '<div class="an-card-body">' +
          mechData.map(function (m) {
            return '<div class="an-mech-row">' +
              '<div class="an-avatar" style="background:' + m.c + ';color:' + m.tc + ';">' + esc(m.av) + '</div>' +
              '<div class="an-mech-name">' + esc(m.name) + '</div>' +
              ibar(m.spend / maxMech, m.c) +
              '<div class="an-cnt">' + m.orders + ' orders</div>' +
              '<div class="an-val">' + fmt(m.spend) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('building') + ' Vendor spend</div>' +
          (concRisk ? '<span class="an-risk-badge">Concentration risk</span>' : '') +
        '</div>' +
        '<div class="an-card-body">' +
          vData.map(function (v) {
            return '<div class="an-vendor-row">' +
              '<div class="an-vdot" style="background:' + v.c + ';"></div>' +
              '<div class="an-vname">' + esc(v.name) + '</div>' +
              ibar(v.pct, v.c) +
              '<div class="an-vpct">' + Math.round(v.pct * 100) + '%</div>' +
              '<div class="an-vval">' + fmt(v.amount) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>' +

    // Top parts + Spend by asset
    '<div class="an-grid-2" style="margin-top:14px;">' +
      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('swap') + ' Most ordered parts</div><span class="an-card-sub">By qty · ' + ST.period + '</span></div>' +
        '<div class="an-card-body">' +
          TOP_PARTS.map(function (p, i) {
            var tArr = p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→';
            var tCls = p.trend === 'up' ? 'an-trend-up' : p.trend === 'down' ? 'an-trend-down' : 'an-trend-flat';
            return '<div class="an-part-row">' +
              '<div class="an-rank">' + (i + 1) + '</div>' +
              '<div class="an-part-info">' +
                '<div style="display:flex;align-items:center;gap:4px;">' +
                  '<div class="an-part-desc">' + esc(p.desc) + '</div>' +
                  '<span class="an-trend-arr ' + tCls + '">' + tArr + '</span>' +
                '</div>' +
                '<div class="an-part-meta">' + esc(p.pn) + '</div>' +
                '<div style="margin-top:3px;height:4px;background:var(--sunken);border-radius:2px;overflow:hidden;"><div style="height:100%;width:' + Math.round(p.qty / maxPart * 100) + '%;background:#534AB7;border-radius:2px;"></div></div>' +
              '</div>' +
              '<div class="an-part-qty">' + p.qty + '×</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('truck-side') + ' Spend by asset</div><span class="an-card-sub">' + fmt(totalSpend) + ' total</span></div>' +
        '<div class="an-card-body">' +
          ASSETS.map(function (a) {
            return '<div class="an-cat-row">' +
              '<div class="an-cat-swatch" style="background:' + a.c + ';"></div>' +
              '<div class="an-cat-info">' +
                '<div class="an-cat-name">' + esc(a.name) + '</div>' +
                (a.maker ? '<div class="an-cat-maker">' + esc(a.maker) + '</div>' : '') +
              '</div>' +
              ibar(a.amount / maxAsset, a.c) +
              '<div class="an-cat-pct">' + Math.round(a.pct * 100) + '%</div>' +
              '<div class="an-cat-val">' + fmt(a.amount) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>' +

    // Order type mix + Approval pipeline
    '<div class="an-grid-2" style="margin-top:14px;">' +
      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('chart-histogram') + ' Order type mix</div><span class="an-card-sub">' + totalWOs + ' total orders</span></div>' +
        '<div class="an-card-body">' +
          '<div style="display:flex;height:11px;border-radius:5px;overflow:hidden;margin-bottom:13px;gap:1px;">' +
            WO_TYPES.map(function (t) { return '<div style="width:' + t.pct + '%;background:' + t.c + ';"></div>'; }).join('') +
          '</div>' +
          WO_TYPES.map(function (t) {
            return '<div class="an-donut-row">' +
              '<div class="an-donut-swatch" style="background:' + t.c + ';"></div>' +
              '<div class="an-donut-label">' + esc(t.label) + '</div>' +
              '<div class="an-donut-pct">' + t.pct + '%</div>' +
              '<div class="an-donut-val">' + Math.round(totalWOs * t.pct / 100) + ' WOs</div>' +
            '</div>';
          }).join('') +
          '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);display:flex;gap:20px;">' +
            '<div><div style="font-size:18px;font-weight:700;color:' + (overnightPct >= 40 ? 'var(--danger)' : 'var(--ink)') + ';">' + overnightPct + '%</div><div style="font-size:10px;color:var(--muted);">Shipped overnight</div></div>' +
            '<div><div style="font-size:18px;font-weight:700;color:var(--ink);">' + avgClose + 'd</div><div style="font-size:10px;color:var(--muted);">Avg days to close</div></div>' +
            '<div><div style="font-size:18px;font-weight:700;color:' + (overdueWOs > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + overdueWOs + '</div><div style="font-size:10px;color:var(--muted);">Overdue</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="an-card">' +
        '<div class="an-card-hdr"><div class="an-card-title">' + icon('check') + ' Approval pipeline</div>' +
          '<span class="an-pend-badge">' + pendCount + ' pending</span>' +
        '</div>' +
        '<div class="an-card-body" style="padding:10px 15px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">' +
            '<div><div style="font-size:18px;font-weight:700;color:var(--ink);">' + fmt(pendValue) + '</div><div style="font-size:10px;color:var(--muted);">Total value awaiting approval</div></div>' +
            '<button type="button" data-an-go-approvals style="padding:5px 11px;border-radius:8px;border:1px solid var(--line);background:var(--surface);font-size:11px;font-weight:600;color:var(--ink);cursor:pointer;font-family:inherit;">Review all</button>' +
          '</div>' +
          APPRV.map(function (ap) {
            return '<div class="an-appr-row">' +
              '<div class="an-appr-info"><div class="an-appr-wo">' + esc(ap.wo) + '</div><div class="an-appr-meta">' + esc(ap.mech) + ' · ' + ap.items + ' line items</div></div>' +
              '<div class="an-appr-age">Waiting ' + esc(ap.age) + '</div>' +
              '<div class="an-appr-val">' + fmt(ap.value) + '</div>' +
            '</div>';
          }).join('') +
          (pendCount > 3 ? '<div style="font-size:11px;color:var(--muted);padding-top:6px;text-align:center;">+' + (pendCount - 3) + ' more</div>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function kpi(val, label, deltaClass, deltaText) {
    return '<div class="an-kpi"><div class="an-kpi-val">' + val + '</div><div class="an-kpi-label">' + esc(label) + '</div><div class="an-kpi-delta ' + deltaClass + '">' + esc(deltaText) + '</div></div>';
  }

  function woStat(label, count, bgColor, inkColor) {
    return '<div class="an-wo-stat"><span style="font-size:12px;color:var(--muted);">' + esc(label) + '</span><span class="an-wo-badge" style="background:' + bgColor + ';color:' + inkColor + ';">' + count + '</span></div>';
  }

  return s.cleanup;
};
