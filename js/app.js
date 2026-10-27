/* SmartEquip ARA web app runtime: routes, session, helpers.
   Classic script on purpose: it must run from file:// (double-click) as well as from GitHub Pages.
   Routes (hash): #/sign-in (start)  #/home  #/boot (review only: the app opens on sign in, no splash).
   Home needs a session; without one it goes to sign in.
   State can be deep-linked for review: #/boot?step=ready&hold=1  #/sign-in?state=error  #/home?menu=account
   Page flag: ?capture=1 switches motion off (screenshots). */
(function () {
  'use strict';
  var D = window.SE_DATA;
  var q = new URLSearchParams(location.search);
  var store = {
    get: function (k) { try { return sessionStorage.getItem('se-1015-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) sessionStorage.removeItem('se-1015-' + k); else sessionStorage.setItem('se-1015-' + k, v); } catch (e) { /* private mode */ } },
    getLocal: function (k) { try { return localStorage.getItem('se-1015-' + k); } catch (e) { return null; } },
    setLocal: function (k, v) { try { localStorage.setItem('se-1015-' + k, v); } catch (e) { /* private mode */ } },
  };
  var SE = window.SE = {
    data: D,
    views: {},
    store: store,
    state: Object.assign(fresh(), (function () { try { return JSON.parse(store.get('state')) || {}; } catch (e) { return {}; } })(),
      { location: store.get('location') || 'all', signedIn: store.get('session') === '1' }),
    titles: {},
    capture: q.has('capture'),
    reducedMotion: q.has('capture') || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  var current = null;
  function fresh() {
    return { cart: [], approved: {}, returned: {}, read: {}, placed: [], cancelled: {}, newWOs: [], nextPO: null, ctx: {}, lists: null, pushAsked: false, search: {},
      // web-full: notices added to the calendar, the microphone answer, and the marketing kit's memory
      // (announcement dismissed, What's new seen, early access joined, supplier connections requested)
      calendar: {}, micAsked: false, micAllowed: false, mkt: { dismissed: {}, whatsNew: false, early: false, requested: {} },
      // supervisor desk (js/desk.js): cart review decisions, approver edits, archived work orders, header edits
      cartAck: {}, apprEdits: {}, archived: {}, woEdits: {}, transfers: null, stockUsed: {}, submissions: {}, nextLine: 1, nextPick: 0, returnTo: null };
  }
  // demo state (cart, approvals, read notifications, placed orders) survives a reload within the tab
  // presenter: fresh demo data but still signed in (Back to root, walkthroughs)
  SE.resetDemo = function () { Object.assign(SE.state, fresh(), { pushAsked: true }); SE.state.mkt.whatsNew = true; SE.save(); SE.signIn(); };
  SE.save = function () {
    var s = {}; Object.keys(fresh()).forEach(function (k) { s[k] = SE.state[k]; });
    store.set('state', JSON.stringify(s));
  };


  // review links (hub, tests): ?review=1 opens signed in as Sarah; &cart=1 pre-fills 2 cart lines if empty
  // (review links skip the first-sign-in prompts: desktop notifications and What's new)
  if (q.has('review')) { SE.state.signedIn = true; store.set('session', '1'); SE.state.pushAsked = true; SE.state.mkt.whatsNew = true; }
  if (q.has('cart') && !SE.state.cart.length) { SE.state.cart = [{ pn: 'JLG-4120-118', qty: 2, wo: '100118' }, { pn: 'SKJ-103100', qty: 1, wo: null }]; }
  // ---------- data lookups shared by every view (same names as the mobile build's ARA.*)
  SE.part = function (pn) { return D.parts.find(function (p) { return p.pn === pn; }); };
  SE.machine = function (key) { return D.machines[key]; };
  SE.supplier = function (id) { return D.suppliers.find(function (s) { return s.id === id || s.name === id; }); };
  SE.supplierOf = function (pn) { var p = SE.part(pn); return SE.supplier(p.machine ? SE.machine(p.machine).supplier : p.supplier); };
  // 1016 (review F05): the recall that touches a unit or a part, with what is known about the unit's fitted lot.
  //   status 'affected' (the recalled lot is fitted), 'unknown' (lot not recorded), 'clear' (another lot is fitted)
  SE.recallFor = function (unit) {
    var n = (D.news || []).find(function (x) { return x.kind === 'Recall' && x.units && x.units.indexOf(unit) >= 0; });
    if (!n) return null;
    var lot = n.lots ? n.lots[unit] : null;
    return { item: n, unit: unit, lot: lot, status: !lot ? 'unknown' : lot === n.lot ? 'affected' : 'clear' };
  };
  SE.recallPart = function (pn) { return (D.news || []).find(function (x) { return x.kind === 'Recall' && x.parts && x.parts.indexOf(pn) >= 0; }) || null; };
  // the note for a unit (asset, work order) or for an order that carries a recalled part (approval)
  SE.recallNote = function (unit, items) {
    var link = function (n) { return ' <a href="#/article?id=' + n.id + '">Read the recall</a>'; };
    var r = unit && SE.recallFor(unit), part = items && items.map(function (it) { return SE.recallPart(it.pn); }).filter(Boolean)[0];
    if (part) {
      var pn = part.parts[0], st = r && r.item === part ? r.status : null;
      return SE.ui.banner('<b>Recall replacement in this order.</b> ' + '<span class="nw">' + SE.esc(pn) + '</span>' + (st === 'affected' ? ' replaces the lot ' + part.lot + ' valve fitted to <span class="nw">' + SE.esc(unit) + '</span>.' : st === 'unknown' ? ' is for <span class="nw">' + SE.esc(unit) + '</span>, whose fitted lot is not recorded.' : '.') +
        (part.replacementLot ? ' New stock ships from lot ' + part.replacementLot + ', which the recall does not cover.' : '') + link(part), 'warning', 'exclamation');
    }
    if (!r || r.status === 'clear') return '';
    var n = r.item;
    return SE.ui.banner('<b>Recall: ' + SE.esc(n.title.replace(/^Part recall: /, '')).replace(/([A-Z]{2,4}-\d+)/g, '<span class="nw">$1</span>') + '.</b> ' + (r.status === 'affected'
      ? 'The valve on <span class="nw">' + SE.esc(unit) + '</span> is from lot ' + n.lot + ', which may stick open. Replace it at no charge.'
      : 'The lot of the valve on <span class="nw">' + SE.esc(unit) + '</span> is not recorded. Check the number stamped on the valve body: lot ' + n.lot + ' needs replacing.') + link(n), 'danger', 'exclamation');
  };
  SE.loc = function (id) { return D.locations.find(function (l) { return l.id === id; }); };
  // header edits made on the work order page (status, priority, assignee, due) apply wherever it shows
  SE.allWorkOrders = function () {
    var ed = SE.state.woEdits || {};
    return SE.state.newWOs.concat(D.workOrders).map(function (w) { return ed[w.id] ? Object.assign({}, w, ed[w.id].set) : w; });
  };
  SE.wo = function (id) { return SE.allWorkOrders().find(function (w) { return w.id === id; }); };
  SE.approval = function (id) { return D.approvals.find(function (a) { return a.order === id; }); };
  SE.pendingApprovals = function () { return D.approvals.filter(function (a) { return !SE.state.approved[a.order] && !SE.state.returned[a.order]; }); };
  SE.orders = function () { return SE.state.placed.concat(D.orders); };
  SE.order = function (po) { return SE.orders().find(function (o) { return o.po === po; }); };
  SE.unread = function () { return D.notifications.filter(function (n) { return n.unread && !SE.state.read[n.id]; }).length; };
  SE.cartCount = function () { return SE.state.cart.reduce(function (n, l) { return n + l.qty; }, 0); };
  // what the cart buys: lines covered by branch shelves (js/desk.js) cost nothing to buy
  SE.cartTotal = function () { return SE.state.cart.reduce(function (n, l) { return n + SE.part(l.pn).price * (SE.desk ? SE.desk.alloc(l).buy : l.qty); }, 0); };
  SE.addToCart = function (pn, qty, wo) {
    var l = SE.state.cart.find(function (x) { return x.pn === pn; });
    if (l) l.qty += qty; else SE.state.cart.push({ pn: pn, qty: qty, wo: wo || null });
    SE.save();
    if (SE.refreshShell) SE.refreshShell();
  };

  // place an order: 1 PO per supplier from lines [{pn, qty, wo}], newest first in order history.
  // Used by checkout (Sarah orders directly) and by approvals (approving a technician's request).
  // o: { shipTo, needBy, note, wo, from } ; returns the new orders
  SE.placeOrder = function (lines, o) {
    o = o || {};
    var bySup = {};
    lines.forEach(function (l) { var s = SE.supplierOf(l.pn).name; (bySup[s] = bySup[s] || []).push({ pn: l.pn, qty: l.qty }); });
    var now = new Date(), when = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    var made = Object.keys(bySup).map(function (sup) {
      var n = (SE.state.nextPO || SE.data.nextPO); SE.state.nextPO = n + 1;
      var items = bySup[sup];
      return { po: 'PO-' + n, wo: o.wo || (lines.find(function (l) { return l.wo; }) || {}).wo || null, supplier: sup, status: 'Submitted', tone: 'info',
        placed: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), eta: 'Awaiting supplier confirmation', carrier: 'Pending', tracking: null,
        shipTo: o.shipTo || 'austin', needBy: o.needBy || null, note: o.note || '', from: o.from || 'cart', isNew: true,
        items: items, steps: [['Submitted', when], ['Confirmed by ' + sup, null], ['Shipped', null], ['Delivered', null]],
        total: Math.round(items.reduce(function (t, i) { return t + SE.part(i.pn).price * i.qty; }, 0) * 100) / 100 };
    });
    SE.state.placed = made.concat(SE.state.placed);
    SE.save();
    return made;
  };

  // ---------- 1008: fleet assets, search context, shopping lists (Design issues DES-28, DES-44 to 52)
  // every unit in the fleet with its model: { equip, serial, location, hours, status, year, lastService, warranty, model, machine, make }
  SE.assets = function () {
    var out = [];
    Object.keys(D.machines).forEach(function (k) { var m = D.machines[k]; m.units.forEach(function (u) { out.push(Object.assign({ model: k, machine: m.name, make: m.make }, u)); }); });
    return out;
  };
  SE.asset = function (equip) { return SE.assets().find(function (a) { return a.equip === equip || a.serial === equip; }); };
  // assets at the chosen location (fleet supervisor sees all; a branch choice scopes it)
  SE.assetsHere = function () {
    if (SE.state.location === 'all') return SE.assets();
    var name = SE.loc(SE.state.location).name;
    return SE.assets().filter(function (a) { return a.location === name; });
  };
  // search context (the filter bar): { wo, equip, serial, model }. A work order fills equip, serial and
  // model; a serial is what unlocks price and availability for serial-priced parts on the part card.
  SE.ctx = function () { return SE.state.ctx || {}; };
  SE.setContext = function (o) {
    var c = Object.assign({}, SE.ctx(), o);
    if (o.wo) { var w = SE.wo(o.wo); var a = w && SE.asset(w.equip); if (a) { c.equip = a.equip; c.serial = a.serial; c.model = a.model; } }
    if (o.equip && !o.wo) { var a2 = SE.asset(o.equip); if (a2) { c.serial = a2.serial; c.model = a2.model; } }
    Object.keys(c).forEach(function (k) { if (c[k] == null || c[k] === '') delete c[k]; });
    SE.state.ctx = c; SE.save(); return c;
  };
  SE.clearContext = function (key) {
    if (!key) SE.state.ctx = {};
    else { var c = Object.assign({}, SE.ctx()); delete c[key]; if (key === 'wo') { delete c.equip; delete c.serial; } if (key === 'equip') delete c.serial; SE.state.ctx = c; }
    SE.save();
  };
  // part card condition: serial-priced parts show price only with a serial in context
  // the serial must belong to a unit of the part's own model (a work order's unit counts)
  SE.priceVisible = function (p) { var c = SE.ctx(); return !p.serialPricing || (!!c.serial && (!p.machine || c.model === p.machine)); };
  // parts that share an identity across suppliers form 1 search group
  SE.partGroup = function (p) { return p.identity ? D.parts.filter(function (x) { return x.identity === p.identity; }) : [p]; };
  // shopping lists: the fleet's curated lists, editable by Sarah (full permissions); edits persist in the session
  SE.lists = function () {
    if (!SE.state.lists) SE.state.lists = JSON.parse(JSON.stringify(D.shoppingLists));
    return SE.state.lists;
  };
  SE.list = function (id) { return SE.lists().find(function (l) { return l.id === id; }); };
  SE.saveLists = function () { SE.save(); };
  // status words mapped to chip tones, shared by every list
  var TONES = {
    'In service': 'success', 'Done': 'success', 'Delivered': 'success', 'Approved': 'success', 'In stock': 'success',
    'Service due': 'warning', 'Awaiting approval': 'warning', 'Backordered': 'warning', 'Needs approval': 'warning', 'Returned': 'warning', 'Superseded': 'warning',
    'Down': 'danger', 'Open': 'danger', 'Cancelled': 'neutral', 'Requested': 'info', 'Archived': 'neutral', 'In progress': 'info', 'Shipped': 'info', 'Submitted': 'info', 'Scheduled': 'neutral',
  };
  SE.tone = function (s) { return TONES[s] || 'neutral'; };
  SE.chip = function (text, tone) { return '<span class="chip t-' + (tone || SE.tone(text)) + '">' + SE.esc(text) + '</span>'; };

  // ---------- helpers
  SE.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  SE.icon = function (name, cls) { return '<svg class="i ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>'; };
  // Mid-County Rental wordmark (midcnt/, A360Z's final mark): the fleet's identity on boot and in the
  // "Powered by" lines; mcMark is its roof chevron alone (the collapsed rail)
  SE.mcLogo = function (text, accent, label) {
    return '<svg class="logo mc-logo" viewBox="' + window.SE_MC.viewBox + '" role="img" aria-label="' + (label || 'Mid-County Rental') + '">' +
      window.SE_MC.paths.map(function (p) { return '<path d="' + p.d + '" fill="' + (p.accent ? accent : text) + '"/>'; }).join('') + '</svg>';
  };
  SE.mcMark = function (fill) {
    var c = window.SE_MC.paths.find(function (p) { return p.accent; });
    return '<svg viewBox="176 3 42 24" aria-hidden="true"><path d="' + c.d + '" fill="' + fill + '"/></svg>';
  };
  // 1017: SmartEquip artwork from the brand registry (_src/branding, built into window.SE_BRAND). on = the surface:
  // 'light' (positive art), 'dark' (negative art) or 'auto' (follows the theme, switches live). kind 'symbol' = the
  // compact mark where the full wordmark does not fit. Drawn straight on the surface with its clear space (theme.css
  // .se-logo); never recolored, dimmed or boxed (draft guideline 2340:5010).
  SE.seLogo = function (on, label, kind) {
    var B = window.SE_BRAND, keys = kind === 'symbol' ? ['symbol', 'symbolReverse'] : ['fullColor', 'negative'];
    function art(key, cls) { var a = B[key]; return '<svg class="se-art ' + cls + '" viewBox="' + a.viewBox + '" aria-hidden="true" focusable="false">' + a.svg + '</svg>'; }
    var inner = on === 'light' ? art(keys[0], 'v-light') : on === 'dark' ? art(keys[1], 'v-dark') : art(keys[0], 'v-light') + art(keys[1], 'v-dark');
    return '<span class="se-logo' + (kind === 'symbol' ? ' se-symbol' : '') + (on === 'auto' ? ' se-auto' : '') + '" role="img" aria-label="' + SE.esc(label || 'SmartEquip') + '">' + inner + '</span>';
  };
  // Mid-County Rental: "MC" monogram, placeholder until A360Z's final mark
  // Mid-County Rental icon tile: the roof chevron on the dark plate (was the "MC" placeholder)
  SE.mc = function (cls) { return '<span class="mc ' + (cls || '') + '" aria-hidden="true">' + SE.mcMark('var(--brand)') + '</span>'; };
  SE.money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  // branch locale (DES-47 use case 5 state 2, same rule as ARA.branchCurrency): a branch outside the US shows
  // catalog prices in its currency; orders still settle in USD
  SE.branchCurrency = function () {
    var l = SE.state.location !== 'all' && SE.loc(SE.state.location);
    if (!l || !l.currency || l.currency === 'USD') return null;
    return { code: l.currency, name: l.currencyName, branch: l.name, fmt: function (n) { return '$' + (n * l.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } };
  };
  SE.animate = function (el, frames, o) {
    if (SE.reducedMotion || !el || !el.animate) return Promise.resolve();
    return el.animate(frames, Object.assign({ duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'none' }, o)).finished.catch(function () {});
  };
  SE.location = function () {
    if (SE.state.location === 'all') return { id: 'all', name: 'All locations', sub: D.locations.length + ' branches' };
    var l = D.locations.find(function (x) { return x.id === SE.state.location; });
    return { id: l.id, name: l.name, sub: l.units + ' units' };
  };
  SE.setLocation = function (id) { SE.state.location = id; store.set('location', id); };
  // work orders at the chosen location (a unit's location comes from the machine records)
  SE.workOrders = function () {
    if (SE.state.location === 'all') return SE.allWorkOrders();
    var name = SE.location().name, where = {};
    Object.keys(D.machines).forEach(function (k) { D.machines[k].units.forEach(function (u) { where[u.equip] = u.location; }); });
    return SE.allWorkOrders().filter(function (w) { return where[w.equip] === name; });
  };

  var toastTimer;
  SE.toast = function (msg, icon) {
    var t = document.getElementById('toast');
    t.innerHTML = SE.icon(icon || 'info') + '<span>' + SE.esc(msg) + '</span>';
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
  };
  SE.notBuilt = function (what) { SE.toast(what + ' is in the next build', 'info'); };

  // ---------- session
  SE.signIn = function () { SE.state.signedIn = true; store.set('session', '1'); };
  SE.signOut = function () {
    SE.state.signedIn = false; store.set('session', null); SE.save();
  };

  // ---------- router
  var OPEN = { boot: 'Starting', 'sign-in': 'Sign in' };
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('?');
    var name = (i < 0 ? h : h.slice(0, i)) || 'sign-in', params = {};
    if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach(function (v, k) { params[k] = v; });
    if (!SE.views[name]) name = SE.state.signedIn ? 'home' : 'sign-in';
    if (!OPEN[name] && !SE.state.signedIn) { SE.state.returnTo = h; SE.save(); name = 'sign-in'; }
    if (SE.state.signedIn && name === 'home' && SE.state.returnTo) { var target = SE.state.returnTo; SE.state.returnTo = null; SE.save(); history.replaceState(null, '', '#/' + target); return parse(); }
    return { name: name, params: params };
  }
  function mount(fade) {
    var r = parse(), app = document.getElementById('app');
    var el = document.createElement('div');
    el.className = 'route';
    var old = current;
    if (old) { old.el.inert = true; if (old.cleanup) old.cleanup(); }
    app.appendChild(el);
    current = { el: el, name: r.name, cleanup: SE.views[r.name](el, r.params) || null };
    document.title = (OPEN[r.name] || SE.titles[r.name] || 'Home') + ' · Mid-County Rental';
    window.scrollTo(0, 0);
    document.documentElement.dataset.route = r.name;
    function done() {
      if (old) old.el.remove();
      app.dataset.view = r.name;
      // move focus to the new page's heading so keyboard and screen-reader users land in context
      var h = el.querySelector('[data-focus]');
      if (h && old && !SE.capture) h.focus({ preventScroll: true });
    }
    if (!old || !fade || SE.reducedMotion) { done(); return; }
    el.style.position = 'absolute'; el.style.inset = '0';
    SE.animate(old.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    SE.animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 60, fill: 'backwards' }).then(function () { el.style.position = ''; el.style.inset = ''; done(); });
  }
  var pendingFade = false;
  // replace: the step is not a page to go back to (boot, sign in, sign out)
  SE.go = function (name, opts) {
    opts = opts || {};
    var target = '#/' + name + (opts.params ? '?' + new URLSearchParams(opts.params) : '');
    if (opts.replace) { history.replaceState(null, '', target); mount(opts.fade !== false); return; }
    if (location.hash === target) { mount(false); return; }
    pendingFade = opts.fade !== false;
    location.hash = target;
  };
  SE.start = function () {
    document.body.insertAdjacentHTML('afterbegin', window.SE_SPRITE);
    window.addEventListener('hashchange', function () { var f = pendingFade; pendingFade = false; mount(f); });
    mount(false);
  };
})();
