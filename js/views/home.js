/* Home (Figma "Web / landing / light / xl 1280 · rail open" and "· rail collapsed").
   Brand slots carry Mid-County Rental and SmartEquip yellow (the frame's lockup and green accent belong
   to a prospect twin, which ARA excludes); layout, type, spacing and components follow the frame.
   1007: the shell (rail, quick bar, account) is js/shell.js; every card, tile and notification goes to
   its branch. Tiles the frame shows for areas outside ARA (Recommended Parts, Fleet Home) are replaced
   by in-scope ones (Approvals, Parts Catalog); Diagnostics stays visible as "Later".
   1008 (DES-41): Home stays the landing after sign in, with search by type (Parts, Fleet, Manuals,
   Orders) under the greeting and Shopping Lists and Fleet among the quick actions.
   web-full (parity with the iPhone Home and the marketing kit):
     - first sign in: "Get notified on this computer" (the phone's push permission), then the browser's bubble,
       then the What's new tour (M4); review links skip both
     - Updates hero carousel (M1); Waiting for your approval: approval cards that page sideways, Approve signs
       off in place (spinner, then the PO), All caught up folds the section away (the phone's approval cards)
     - Recommended for your fleet (M5), Request connection in the Supplier network (M6), Diagnostics early access (M7)
   1021: Updates carousel beside 4 quick actions; Fleet news and updates beside the Supplier network (web.svg)
   State: #/home?menu=account  #/home?nav=open  #/home?push=1 (prompt)  #/home?push=alert (browser bubble)
          #/home?whatsnew=1 */
SE.titles.home = 'Home';
SE.views.home = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon;
  // 1021 (branding reference, owner 2026-10-22): 4 quick actions with their counts replace the 8 shortcut tiles;
  // every one of those 8 destinations stays in the rail
  if (p.push) SE.state.pushAsked = false;
  var selected = null;

  function active() {
    var first = ['100094', '100102'];
    return SE.workOrders().filter(function (w) { return w.status !== 'Done' && !SE.state.cancelled[w.id]; })
      .sort(function (a, b) { var ia = first.indexOf(a.id), ib = first.indexOf(b.id); return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib); });
  }
  function subline() {
    var d = SE.tx.today(), n = active().length;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' · ' + SE.location().name + ' · ' + n + ' active work order' + (n === 1 ? '' : 's');
  }
  function machineKey(w) { return Object.keys(D.machines).find(function (k) { return D.machines[k].name === w.machine; }); }
  function orderCard(w) {
    var appr = D.approvals.find(function (a) { return a.wo === w.id; });
    var waiting = appr && !SE.state.approved[appr.order] && !SE.state.returned[appr.order];
    var pri = w.priority === 'High' ? '<span class="chip high">HIGH</span>' : w.priority === 'Medium' ? '<span class="chip">MEDIUM</span>' : '';
    var war = w.warranty ? '<span class="chip warranty">WARRANTY · ' + esc(w.warranty.toUpperCase()) + '</span>' : '<span class="chip">WARRANTY EXPIRED</span>';
    return '<article class="order' + (w.id === selected ? ' selected' : '') + '" data-wo-card="' + w.id + '" tabindex="0" aria-current="' + (w.id === selected) + '" aria-label="Work order ' + w.id + ', ' + esc(w.machine) + '">' +
      '<div class="order-sum"><span class="thumb ph" aria-hidden="true"></span>' +
        '<div class="order-det"><div class="chips"><span class="chip">' + esc(w.status.toUpperCase()) + '</span>' + pri + '</div>' +
          '<p class="wo-no"><a href="#/work-order?id=' + w.id + '" class="wo-link">#' + w.id + '</a></p><h3>' + esc(w.machine) + ' · Asset ' + esc(w.equip) + '</h3>' +
          '<p class="issue">' + esc(w.issue) + '</p><div class="warr">' + war + '</div></div></div>' +
      '<hr class="rule">' +
      '<div class="order-foot"><div class="meta"><span>' + icon('shopping-cart') + (waiting ? appr.lines + ' lines awaiting approval' : appr ? appr.lines + ' lines approved' : 'No parts ordered yet') + '</span>' +
        '<span>' + icon('calendar') + 'Opened ' + esc(w.opened) + '</span></div>' +
        (waiting ? '<div class="order-btns"><button class="btn btn-card" type="button" data-go="machine" data-m="' + machineKey(w) + '" data-wo="' + w.id + '">Search parts</button>' +
          '<button class="btn btn-primary" type="button" data-go="approval" data-id="' + appr.order + '">Review approval</button></div>'
          : '<button class="btn btn-card" type="button" data-go="machine" data-m="' + machineKey(w) + '" data-wo="' + w.id + '">Search parts</button>') + '</div>' +
    '</article>';
  }

  // ---------- quick actions (branding reference web.svg: 2 x 2 count tiles, the one that needs you in yellow)
  function qtiles() {
    var n = SE.pendingApprovals().length, sups = D.suppliers.filter(function (x) { return x.active; }).length;
    var T = [['shopping-cart-check', n, n === 1 ? 'Approval waiting' : 'Approvals waiting', 'approvals', n > 0],
      ['clipboard-list', active().length, 'Active work orders', 'work-orders'],
      ['building', D.locations.length, 'Branches', 'fleet'],
      ['box', sups, 'Suppliers connected', 'catalog']];
    return T.map(function (t) {
      return '<li><a class="qt' + (t[4] ? ' on' : '') + '" href="#/' + t[3] + '">' + icon(t[0]) + '<b>' + t[1] + '</b><span>' + esc(t[2]) + '</span></a></li>';
    }).join('');
  }
  // ---------- Fleet news and updates (web.svg): recalls, bulletins and notices, then the newest how-to, 2 a row
  function newsCards() {
    var K = { Recall: ['Recall', 'danger', 'exclamation'], Bulletin: ['Service bulletin', 'warning', 'exclamation'], Notice: ['Fleet update', 'neutral'] };
    var items = D.news.map(function (n) { return { id: n.id, k: K[n.kind] || ['Fleet update', 'neutral'], title: n.title, text: n.summary }; })
      .concat(D.kb.slice(0, 1).map(function (a) { return { id: a.id, k: ['Knowledge Base', 'neutral'], title: a.title, text: a.summary }; }));
    return items.map(function (x) {
      return '<li><a class="card news-card" href="#/article?id=' + encodeURIComponent(x.id) + '"><span class="news-k t-' + x.k[1] + '">' + (x.k[2] ? icon(x.k[2]) : '') + esc(x.k[0]) + '</span>' +
        '<b>' + esc(x.title) + '</b><span class="news-t">' + esc(x.text) + '</span></a></li>';
    }).join('');
  }
  // ---------- Supplier network (web.svg): search, then every supplier with its mark; web-full offers Request connection
  function supMark(x) { var w = x.name.split(' '); return w.length === 1 ? x.name.slice(0, 3) : w.slice(0, 2).map(function (y) { return y.charAt(0); }).join(''); }
  function supplierNet() {
    var on = D.suppliers.filter(function (x) { return x.active; }).length;
    return '<div class="sec-head"><h2 id="h-net">Supplier network</h2><span class="h-note">' + on + ' of ' + D.suppliers.length + ' connected</span></div>' +
      '<div class="card net' + (SE.mkt ? ' mk-net' : '') + '"><label class="search net-search">' + icon('search') + '<span class="sr-only">Search suppliers</span><input type="search" placeholder="Search network" autocomplete="off" data-net-q></label>' +
      '<ul class="net-list" data-net-list>' + D.suppliers.map(function (x) {
        var mark = '<span class="net-mark" aria-hidden="true">' + esc(supMark(x)) + '</span>';
        var row = x.active ? '<a class="net-row" href="#/supplier?sup=' + x.id + '">' + mark + '<span><b>' + esc(x.name) + '</b><small>Connected</small></span>' + icon('angle-small-right') + '</a>'
          : '<div class="net-row">' + mark + '<span><b>' + esc(x.name) + '</b><small>' + esc(x.tagline) + '</small></span>' + (SE.mkt ? SE.mkt.suppliers.req(x) : '') + '</div>';
        return '<li data-net-name="' + esc(x.name.toLowerCase()) + '">' + row + '</li>';
      }).join('') + '<li class="net-none" hidden>No supplier matches</li></ul></div>';
  }
  var s = SE.shell(el, {
    nav: 'home',
    head: '<header class="page-head">' +
      '<div class="greeting"><h1 tabindex="-1" data-focus>Welcome back, <span class="greet-name">' + esc(D.user.first) + '</span></h1><p id="subline">' + esc(subline()) + '</p>' + '</div>' +
      '__TOOLS__</header>',
    body:
      '<div id="push-slot">' + (SE.push.due() ? SE.push.card() : '') + '</div>' +
      // 1016 (review F07): operational work first; the Updates carousel follows the work orders
      // 1017 (owner): Home is a stack of full-width layers on a 12-column grid. 1021 (branding reference web.svg, owner
      // 2026-10-22, replaces review F07's operational-first order): on top the Updates carousel (8) beside 4 quick
      // actions in a 2 x 2 grid (4), then Fleet news and updates (8) beside the Supplier network (4), then the rest.
      // web-twin has no marketing kit: the quick actions run 4 across. Stacked below 1000px of content.
      '<div class="dash" id="dash">' +
      (SE.mkt ? SE.mkt.hero().replace('<section class="sec"', '<section class="sec lay-8 lay-hero"') : '') +
      '<section class="sec qa-sec' + (SE.mkt ? ' lay-4' : '') + '" aria-labelledby="h-quick">' +
        '<div class="sec-head"><h2 id="h-quick">Quick actions</h2></div><ul class="qtiles" id="qtiles"></ul>' +
      '</section>' +
      '<section class="sec news-sec" aria-labelledby="h-news">' +
        '<button class="news-toggle" type="button" data-news-toggle aria-expanded="false" aria-controls="news-grid">' +
          icon('newspaper') + '<span id="h-news">Fleet news &amp; updates</span>' +
          '<span class="news-toggle-right"><a class="sec-action news-toggle-viewall" href="#/kb" onclick="event.stopPropagation()">View all' + icon('arrow-small-right') + '</a>' + icon('chevron-right') + '</span>' +
        '</button>' +
        '<div class="news-body" id="news-grid" hidden><ul class="news-grid-inner">' + newsCards() + '</ul></div>' +
      '</section>' +
      '<section class="sec net-sec" aria-labelledby="h-net">' + supplierNet() + '</section>' +
      '<section class="sec wo-table-sec" aria-labelledby="h-wotable">' +
        '<div class="sec-head"><h2 id="h-wotable"><span id="wo-table-count">5</span> most recently updated work orders</h2><a class="sec-action" href="#/work-orders">View all' + icon('arrow-small-right') + '</a></div>' +
        '<div class="wo-table-wrap"><table class="wo-table"><thead><tr>' +
          '<th>WO #</th><th>Issue</th><th>Asset</th><th>Assignee</th><th>Due</th><th>Status</th><th></th>' +
        '</tr></thead><tbody id="orders-host"></tbody></table></div>' +
      '</section>' +
      '</div>',
    onLocation: function () { el.querySelector('#subline').textContent = subline(); renderOrders(); renderQuick(); },
  });
  // the Home head keeps the greeting layout of the frame, with the shared tools beside it
  var headEl = el.querySelector('.page-head');
  headEl.innerHTML = headEl.innerHTML.replace('__TOOLS__', SE.tools());
  if (SE.searchBox) { var f = headEl.querySelector('[data-search]'); if (f) SE.searchBox(f); }

  // ---------- active orders: table view (combined with pending approvals inline)
  var stopOrders = null;
  function orderTableRow(w) {
    var appr = D.approvals.find(function (a) { return a.wo === w.id; });
    var waiting = appr && !SE.state.approved[appr.order] && !SE.state.returned[appr.order];
    var dot = w.priority === 'High' ? 'high' : w.priority === 'Medium' ? 'med' : 'low';
    var st = w.status.toLowerCase();
    var statusCls = st === 'active' ? 'wo-s-active' : st === 'pending' || st === 'awaiting approval' ? 'wo-s-pending' : st === 'done' || st === 'closed' ? 'wo-s-closed' : 'wo-s-neutral';
    return '<tr class="wo-tr' + (waiting ? ' wo-tr-needs-appr' : '') + '">' +
      '<td class="wo-td-id"><span class="wo-dot wo-dot-' + dot + '"></span><a class="wo-link" href="#/work-order?id=' + w.id + '">WO #' + esc(w.id) + '</a></td>' +
      '<td class="wo-td-issue">' + esc(w.issue) + '</td>' +
      '<td class="wo-td-asset">' + esc(w.equip) + ' · ' + esc(w.machine) + '</td>' +
      '<td class="wo-td-who">' + esc(w.assignee || '—') + '</td>' +
      '<td class="wo-td-due">' + esc(w.due || '—') + '</td>' +
      '<td class="wo-td-status"><span class="wo-status-chip ' + statusCls + '">' + esc(w.status) + '</span></td>' +
      '<td class="wo-td-act">' + (waiting ? '<button class="btn btn-primary btn-sm" type="button" data-approve="' + appr.order + '">Approve</button>' : '') + '</td>' +
    '</tr>';
  }
  function renderOrders() {
    var list = active().slice(0, 5), body = el.querySelector('#orders-host');
    var countEl = el.querySelector('#wo-table-count');
    if (countEl) countEl.textContent = list.length;
    if (stopOrders) { stopOrders(); stopOrders = null; }
    body.innerHTML = list.length
      ? list.map(orderTableRow).join('')
      : '<tr><td colspan="7" class="wo-td-empty">No active work orders at this location.</td></tr>';
  }

  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.dataset.go || t.hasAttribute('data-news-toggle')) return;
  });

  // ---------- approvals (inline in the work orders table; these functions retained for the approve() flow)
  var foldTimer = null, stopAppr = null;
  function apprCard(a) {
    var branch = (SE.loc(a.shipTo) || {}).name || '';
    return '<li class="appr-row" data-order="' + a.order + '">' +
      '<div class="appr-row-info">' +
        '<div class="appr-row-head"><b>Order #' + a.order + '</b><span class="appr-total">' + SE.money(SE.desk.apprTotal(a)) + '</span><span class="muted appr-when">' + esc(a.when) + '</span></div>' +
        '<p class="appr-meta">' + esc(a.machine) + ' · ' + a.lines + ' line' + (a.lines === 1 ? '' : 's') + ' · ' + esc(a.by) + ' · ' + esc(branch) + '</p>' +
        (a.why ? '<p class="appr-reason">' + esc(a.why.label) + '</p>' : '') +
      '</div>' +
      '<div class="appr-row-acts"><button class="btn btn-secondary" type="button" data-go="approval" data-id="' + a.order + '">Review</button><button class="btn btn-primary" type="button" data-approve="' + a.order + '">Approve</button></div>' +
    '</li>';
  }
  function renderAppr() {
    var host = el.querySelector('#appr-host'), list = SE.pendingApprovals().slice(0, 5);
    if (stopAppr) { stopAppr(); stopAppr = null; }
    host.innerHTML = list.length
      ? '<ul class="appr-list">' + list.map(apprCard).join('') + '</ul>'
      : '<p class="empty">No orders waiting for your approval.</p>';
  }
  function approve(btn) {
    if (btn.disabled || SE.work.apprState(SE.approval(btn.dataset.approve)) !== 'pending') return;
    var order = btn.dataset.approve, row = btn.closest('.wo-tr');
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linecap="round"/></svg>Approving';
    setTimeout(function () {
      var ap = SE.approval(order);
      if (SE.work.apprState(ap) !== 'pending') return;
      try {
      var w = SE.wo(ap.wo), log = SE.desk.apprLog(ap);
      SE.desk.place(SE.desk.apprItems(ap).map(function (i) { return { id: 'approval-' + ap.order + '-' + i.pn, pn: i.pn, qty: i.qty, wo: ap.wo, unit: w && w.equip, shipTo: ap.shipTo, backorderAccepted: !!i.backorderAccepted }; }), { shipTo: ap.shipTo, needBy: ap.needBy, wo: ap.wo, from: 'approval', idempotencyKey: 'approval:' + ap.order, note: log.length ? 'Approved with changes by ' + D.user.name + ': ' + log.map(function (x) { return x.text; }).join('; ') : '' });
      SE.state.approved[order] = true; SE.save();
      } catch (err) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Approve'; SE.toast('Approval needs review: ' + err.message, 'exclamation'); return; }
      SE.toast('Order #' + order + ' approved', 'check');
      s.refresh();
      SE.animate(row, [{ opacity: 1 }, { opacity: 0 }], { duration: 240 }).then(function () { renderOrders(); renderQuick(); });
    }, SE.reducedMotion ? 0 : 650);
  }
  el.addEventListener('click', function (e) { var b = e.target.closest('[data-approve]'); if (b && !b.disabled) approve(b); });

  renderOrders();
  function renderQuick() { el.querySelector('#qtiles').innerHTML = qtiles(); }
  renderQuick();
  el.querySelector('[data-news-toggle]').addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var grid = el.querySelector('#news-grid'), open = grid.hidden;
    grid.hidden = !open;
    this.setAttribute('aria-expanded', String(open));
  });
  el.querySelector('[data-net-q]').addEventListener('input', function (e) {
    var q = e.target.value.trim().toLowerCase(), n = 0;
    el.querySelectorAll('[data-net-name]').forEach(function (li) { var hit = !q || li.dataset.netName.indexOf(q) >= 0; li.hidden = !hit; if (hit) n++; });
    el.querySelector('.net-none').hidden = n > 0;
  });
  var stopMkt = SE.mkt ? SE.mkt.bind(el) : null;
  SE.push.bind(el, function () { if (SE.mkt && !SE.state.mkt.whatsNew) SE.mkt.whatsNew(); });
  if (p.push === 'alert') SE.push.ask(function (msg, ic) { SE.state.pushAsked = true; SE.save(); var c = el.querySelector('[data-push-card]'); if (c) c.remove(); if (msg) SE.toast(msg, ic); });
  if (SE.mkt && p.whatsnew) SE.mkt.whatsNew();
  else if (SE.mkt && !SE.push.due() && !SE.state.mkt.whatsNew) SE.mkt.whatsNew();
  if (p.menu === 'account') s.openAccount();
  if (p.nav === 'open' && s.mode() === 'drawer') el.querySelector('.appbar-menu').click();

  return function () { if (stopOrders) stopOrders(); clearTimeout(foldTimer); if (stopAppr) stopAppr(); if (stopMkt) stopMkt(); s.cleanup(); };
};
