/* Work order order review (supervisor desk, matches legacy web order-review flow).
   Groups cart items by source: local/branch transfer, then external vendor.
   One tab per PO group; each has items table, shipping rec, addresses, order options.
   Submit places orders, clears submitted items from WO cart.
   State: #/wo-order?id=100118 */
SE.titles['wo-order'] = 'Place order';
SE.views['wo-order'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, money = SE.money;
  var w = SE.wo(p.id);
  var crumbs = [['Home', 'home'], ['Work orders', 'work-orders'], ['Work order', 'work-order', { id: p.id }]];

  if (!w) {
    var s0 = SE.shell(el, { nav: 'work-orders', title: 'Work order not found', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'exclamation', tone: 'warning', title: 'Work order not found', text: 'Could not load work order.', action: '<a class="btn btn-secondary" href="#/work-orders">All work orders</a>' }) });
    return s0.cleanup;
  }

  // ── Shared item helpers (duplicated from work-order.js to keep this view self-contained) ─
  function itemStatus(c) {
    if (c.replacedBy) return 'replaced';
    if (c.replacesId) return (c.inStock !== false) ? 'orderable' : 'needs_attention';
    var hasMand = (c.crossRefs || []).some(function (r) { return r.mandatory; });
    if (!c.inStock && !(c.crossRefs || []).length) return 'unorderable';
    if (hasMand) return 'blocked';
    if (!c.inStock) return 'needs_attention';
    if ((c.localInventory || []).length && !c.selectedSource && !(c.selectedSources && c.selectedSources.length)) return 'needs_attention';
    return 'orderable';
  }

  function cartItems() {
    var wc = SE.state.woCart;
    if (!wc[w.id]) wc[w.id] = w.cart ? JSON.parse(JSON.stringify(w.cart)) : [];
    return wc[w.id];
  }

  // Filter to items that can be placed (orderable or needs_attention that aren't replaced)
  var allItems = cartItems().filter(function (c) {
    if (c.replacedBy) return false;
    var st = itemStatus(c);
    return st === 'orderable' || st === 'needs_attention';
  });

  if (!allItems.length) {
    var s1 = SE.shell(el, { nav: 'work-orders', title: 'Nothing to order', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'shopping-cart', tone: 'neutral', title: 'Nothing to order', text: 'All cart items have been submitted or removed.', action: '<a class="btn btn-secondary" href="#/work-order?id=' + esc(w.id) + '">Back to work order</a>' }) });
    return s1.cleanup;
  }

  // ── PO group split: local (selectedSources → branch transfer) vs vendor (external) ─
  function buildPoGroups(items) {
    var groups = [], externalItems = [];
    items.forEach(function (c) {
      var sources = c.selectedSources || (c.selectedSource ? [c.selectedSource] : []);
      if (sources.length) {
        sources.forEach(function (src) {
          var locKey = src.locationName || src.locationId || 'Local';
          var g = groups.filter(function (x) { return x.type === 'local' && x.key === locKey; })[0];
          if (!g) { g = { type: 'local', key: locKey, label: locKey, items: [] }; groups.push(g); }
          g.items.push(Object.assign({}, c, { qty: src.qty || c.qty || 1, selectedSources: [src], selectedSource: src }));
        });
        var srcTotal = sources.reduce(function (s, x) { return s + (x.qty || 0); }, 0);
        var remaining = (c.qty || 1) - srcTotal;
        if (remaining > 0) externalItems.push(Object.assign({}, c, { qty: remaining, selectedSources: [], selectedSource: null }));
      } else {
        externalItems.push(c);
      }
    });
    var vendorMap = {};
    externalItems.forEach(function (c) {
      var v = c.vendor || 'Unknown'; if (!vendorMap[v]) vendorMap[v] = []; vendorMap[v].push(c);
    });
    Object.keys(vendorMap).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (vendor) {
      groups.push({ type: 'vendor', key: vendor, label: vendor, items: vendorMap[vendor] });
    });
    return groups;
  }

  var groups = buildPoGroups(allItems);
  if (!groups.length) {
    var s2 = SE.shell(el, { nav: 'work-orders', title: 'Nothing to order', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'shopping-cart', tone: 'neutral', title: 'Nothing to order', text: 'No orderable items found.', action: '<a class="btn btn-secondary" href="#/work-order?id=' + esc(w.id) + '">Back to work order</a>' }) });
    return s2.cleanup;
  }

  // ── Shipping recommendation per group ─────────────────────────────────────
  function computeRec(g) {
    var dueDate = w.dueDate ? new Date(w.dueDate) : null;
    var today = new Date();
    var daysUntilDue = dueDate ? Math.ceil((dueDate - today) / 86400000) : 99;
    var priority = w.priority || 'medium';
    var allInStock = g.items.every(function (c) { return c.inStock !== false; });
    if (g.type === 'local') return { carrier: 'Internal', service: 'Branch Transfer', reason: 'Fulfilling from ' + g.label, badge: 'Transfer' };
    if (priority === 'high' || daysUntilDue <= 3) return { carrier: 'FedEx', service: 'Priority Overnight', reason: priority === 'high' ? 'High priority work order' : 'Due in ' + daysUntilDue + ' days', badge: 'Urgent' };
    if (daysUntilDue <= 7 || !allInStock) return { carrier: 'FedEx', service: '2-Day Air', reason: !allInStock ? 'Some items are backordered' : 'Due in ' + daysUntilDue + ' days', badge: 'Expedited' };
    return { carrier: 'UPS', service: 'Ground', reason: 'Adequate lead time for standard delivery', badge: 'Standard' };
  }

  // ── Per-group form state ───────────────────────────────────────────────────
  var user = D.user || {};
  var locId = SE.state.location !== 'all' ? SE.state.location : ((D.locations || [])[0] || {}).id;
  var loc = SE.loc(locId) || (D.locations || [])[0] || {};
  function parseAddr(s) {
    var str = (s || '').trim(), ci = str.lastIndexOf(',');
    var addr1 = ci >= 0 ? str.slice(0, ci).trim() : str;
    var rest = ci >= 0 ? str.slice(ci + 1).trim() : '';
    var m = rest.match(/^(.*?)\s+([A-Z]{2})(?:\s+(\d[\d-]*))?$/);
    return { addr1: addr1, city: m ? m[1].trim() : rest, state: m ? m[2] : '', zip: m ? (m[3] || '') : '' };
  }
  var pa = parseAddr(loc.address);
  function defaultGroupState(g) {
    var rec = computeRec(g);
    return {
      submitted: false,
      poNum: '', requestedDate: w.dueDate || '',
      fullName: user.name || '', orderedBy: user.name || '', email: user.email || '', phone: user.phone || '',
      notifyBy: 'email',
      carrier: rec.carrier, service: rec.service,
      shipOption: 'ship-complete', freightTerms: '', carrierAccount: '',
      comments: '', rec: rec,
      shipTo: { name: loc.name || '', attn: user.name || '', addr1: pa.addr1, addr2: '', city: pa.city, state: pa.state, zip: pa.zip, phone: '' },
      billTo: { name: loc.name || '', attn: 'Accounts Payable', addr1: pa.addr1, addr2: '', city: pa.city, state: pa.state, zip: pa.zip, phone: '' },
    };
  }
  var groupStates = groups.map(defaultGroupState);

  var activeTab = 0;

  // ── Render helpers ────────────────────────────────────────────────────────
  function recBadge(badge) {
    if (badge === 'Urgent')    return 'background:var(--chip-danger-bg,#FCEBEB);color:var(--chip-danger-fg,#A32D2D);';
    if (badge === 'Expedited') return 'background:var(--chip-warning-bg,#FEF3C7);color:var(--chip-warning-fg,#92400E);';
    if (badge === 'Transfer')  return 'background:var(--chip-info-bg,#EEF2FF);color:var(--chip-info-fg,#4F46E5);';
    return 'background:var(--chip-success-bg,#ECFDF5);color:var(--chip-success-fg,#065F46);';
  }

  function groupIcon(g) {
    return g.type === 'local' ? icon('map-marker') : icon('building');
  }

  function itemsTable(g, items) {
    var rows = items.map(function (c) {
      var src = c.selectedSources || (c.selectedSource ? [c.selectedSource] : []);
      var srcLbl = src.length ? src.map(function (s) { return esc(s.locationName || s.locationId); }).join(', ') : esc(c.vendor || '—');
      return [
        '<span class="or-pn">' + esc(c.partNum || c.id) + '</span><span class="or-desc">' + esc(c.description || '') + '</span>',
        esc(c.uom || 'EA'),
        srcLbl,
        String(c.qty || 1),
        money(c.price || 0),
        '<b>' + money((c.price || 0) * (c.qty || 1)) + '</b>',
        '<button class="btn btn-secondary q-add" type="button" data-rtc-id="' + esc(c.id) + '" title="Return to cart" aria-label="Return to cart">' + icon('shopping-cart') + '</button>',
      ];
    });
    var total = items.reduce(function (s, c) { return s + (c.price || 0) * (c.qty || 1); }, 0);
    var tfoot = g.type === 'local'
      ? '<tfoot><tr class="or-tfooter"><td colspan="6">Internal transfer — no purchase charge</td><td><b>No charge</b></td></tr></tfoot>'
      : '<tfoot><tr class="or-tfooter"><td colspan="6">Subtotal</td><td><b>' + money(total) + '</b></td></tr></tfoot>';
    return SE.ui.table([['Part / description'], ['UOM'], ['Source'], ['Qty', 'num'], ['Unit', 'num'], ['Total', 'num'], ['', 'num']], rows, { cls: 'or-tbl' }) + tfoot;
  }

  function recBanner(gs) {
    var r = gs.rec;
    return '<div class="or-rec-row">' +
      '<span class="or-rec-badge" style="' + recBadge(r.badge) + '">' + esc(r.badge) + '</span>' +
      '<span class="or-rec-txt">Recommended: <b>' + esc(r.carrier) + ' ' + esc(r.service) + '</b> — ' + esc(r.reason) + '</span>' +
      (r.badge !== 'Transfer'
        ? '<button type="button" class="btn btn-secondary btn-sm or-use-rec" data-use-rec>Use recommended</button>'
        : '') +
    '</div>';
  }

  function carrierOptions(gs) {
    var opts = [
      ['UPS', 'Ground'], ['UPS', '2-Day Air'], ['UPS', 'Next Day Air'],
      ['FedEx', 'Ground'], ['FedEx', '2-Day Air'], ['FedEx', 'Priority Overnight'],
      ['Internal', 'Branch Transfer'],
    ];
    return opts.map(function (o) {
      var val = o[0] + '|' + o[1];
      var cur = gs.carrier + '|' + gs.service;
      return '<option value="' + esc(val) + '"' + (val === cur ? ' selected' : '') + '>' + esc(o[0] + ' — ' + o[1]) + '</option>';
    }).join('');
  }

  function formRow(label, id, input) {
    var isArea = input.indexOf('<textarea') >= 0;
    return '<div class="form-row or-row"><label for="' + id + '">' + esc(label) + '</label><div class="control' + (isArea ? ' area' : '') + '">' + input + '</div></div>';
  }

  function addrRow(label, inner) {
    return '<div class="form-row or-row"><label>' + esc(label) + '</label><div class="control">' + inner + '</div></div>';
  }
  function addrInp(prefix, key, gi, obj, ph, type, style) {
    return '<input type="' + (type || 'text') + '" class="input" value="' + esc(obj[key] || '') + '" placeholder="' + esc(ph || '') + '"' + (style ? ' style="' + style + '"' : '') + ' data-or-addr="' + esc(prefix) + '" data-addr-key="' + esc(key) + '" data-gi="' + gi + '">';
  }
  function addrBlock(prefix, gi, obj) {
    return '<div class="or-addr-fields">' +
      addrRow('Company / location', addrInp(prefix, 'name', gi, obj, 'Company name')) +
      addrRow('Attn', addrInp(prefix, 'attn', gi, obj, 'Contact name')) +
      addrRow('Address', addrInp(prefix, 'addr1', gi, obj, 'Street address')) +
      addrRow('Line 2', addrInp(prefix, 'addr2', gi, obj, 'Suite, floor, PO Box')) +
      '<div class="form-row or-row"><label>City / State / ZIP</label><div class="control or-csz">' +
        addrInp(prefix, 'city', gi, obj, 'City', 'text', 'flex:1;') +
        addrInp(prefix, 'state', gi, obj, 'ST') +
        addrInp(prefix, 'zip', gi, obj, 'ZIP') +
      '</div></div>' +
      addrRow('Phone', addrInp(prefix, 'phone', gi, obj, 'Phone number')) +
    '</div>';
  }

  function renderGroupForm(gi) {
    var g = groups[gi], gs = groupStates[gi];
    if (gs.submitted) {
      return '<div class="or-submitted-banner">' + icon('check') + '<div><b>' + esc(gs.poNum) + ' submitted</b><p class="muted">Order placed successfully.</p></div></div>';
    }
    var total = g.items.reduce(function (s, c) { return s + (c.price || 0) * (c.qty || 1); }, 0);
    var local = g.type === 'local';
    var carriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Internal', 'Other'];
    var services = ['Priority Overnight', '2-Day Air', 'Express Saver', 'Ground', 'Branch Transfer', 'Freight / LTL'];
    return '<div class="or-group-form" data-group-form="' + gi + '">' +
      '<section class="card or-sec">' +
        '<h2 class="or-sec-h">' + groupIcon(g) + (local ? 'Branch transfer' : 'Purchase order') + ' · ' + esc(g.label) +
          ' <span class="or-item-cnt">' + g.items.length + ' item' + (g.items.length === 1 ? '' : 's') + '</span>' +
        '</h2>' +
        itemsTable(g, g.items) +
      '</section>' +
      '<section class="card or-sec">' +
        '<h2 class="or-sec-h">' + icon('map-marker') + 'Addresses</h2>' +
        '<div class="or-addr-cols">' +
          '<div><div class="or-addr-label">Ship to</div>' + addrBlock('shipTo', gi, gs.shipTo) + '</div>' +
          '<div><div class="or-addr-label">Bill to</div>' + addrBlock('billTo', gi, gs.billTo) + '</div>' +
        '</div>' +
      '</section>' +
      '<section class="card or-sec">' +
        '<h2 class="or-sec-h">' + icon('truck-side') + (local ? 'Transfer details' : 'Shipping') + '</h2>' +
        recBanner(gs) +
        '<div class="or-fields">' +
          formRow('Carrier', 'or-carrier-' + gi,
            '<select id="or-carrier-' + gi + '" class="select" data-or-field="carrier" data-gi="' + gi + '">' +
              carriers.map(function (c) { return '<option value="' + esc(c) + '"' + (c === gs.carrier ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
            '</select>') +
          formRow('Service level', 'or-service-' + gi,
            '<select id="or-service-' + gi + '" class="select" data-or-field="service" data-gi="' + gi + '">' +
              services.map(function (s) { return '<option value="' + esc(s) + '"' + (s === gs.service ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
            '</select>') +
          formRow('Ship option', 'or-shipoption-' + gi,
            '<select id="or-shipoption-' + gi + '" class="select" data-or-field="shipOption" data-gi="' + gi + '">' +
              '<option value="ship-complete"' + (gs.shipOption === 'ship-complete' ? ' selected' : '') + '>Ship complete</option>' +
              '<option value="ship-available"' + (gs.shipOption === 'ship-available' ? ' selected' : '') + '>Ship as available</option>' +
            '</select>') +
          formRow('Freight terms', 'or-freight-' + gi,
            '<select id="or-freight-' + gi + '" class="select" data-or-field="freightTerms" data-gi="' + gi + '">' +
              '<option value=""' + (!gs.freightTerms ? ' selected' : '') + '>— (blank)</option>' +
              '<option value="collect"' + (gs.freightTerms === 'collect' ? ' selected' : '') + '>Collect</option>' +
              '<option value="prepaid"' + (gs.freightTerms === 'prepaid' ? ' selected' : '') + '>Prepaid</option>' +
            '</select>') +
          formRow('Fleet carrier account # (optional)', 'or-acct-' + gi,
            '<input type="text" id="or-acct-' + gi + '" class="input" value="' + esc(gs.carrierAccount) + '" placeholder="Enter carrier account number" data-or-field="carrierAccount" data-gi="' + gi + '">') +
        '</div>' +
      '</section>' +
      '<section class="card or-sec">' +
        '<h2 class="or-sec-h">' + icon('document') + 'Order details</h2>' +
        '<div class="or-fields">' +
          formRow('Full name', 'or-fullname-' + gi,
            '<input type="text" id="or-fullname-' + gi + '" class="input" value="' + esc(gs.fullName) + '" data-or-field="fullName" data-gi="' + gi + '">') +
          formRow('Ordered by', 'or-ordered-' + gi,
            '<input type="text" id="or-ordered-' + gi + '" class="input" value="' + esc(gs.orderedBy) + '" readonly>') +
          formRow('Phone', 'or-phone-' + gi,
            '<input type="tel" id="or-phone-' + gi + '" class="input" value="' + esc(gs.phone) + '" placeholder="e.g. 512-555-0100" data-or-field="phone" data-gi="' + gi + '">') +
          formRow('Email', 'or-email-' + gi,
            '<input type="email" id="or-email-' + gi + '" class="input" value="' + esc(gs.email) + '" placeholder="notification email" data-or-field="email" data-gi="' + gi + '">') +
          formRow('Notify by', 'or-notify-' + gi,
            '<select id="or-notify-' + gi + '" class="select" data-or-field="notifyBy" data-gi="' + gi + '">' +
              '<option value="email"' + (gs.notifyBy === 'email' ? ' selected' : '') + '>Email</option>' +
              '<option value="sms"' + (gs.notifyBy === 'sms' ? ' selected' : '') + '>SMS</option>' +
              '<option value="both"' + (gs.notifyBy === 'both' ? ' selected' : '') + '>Email + SMS</option>' +
              '<option value="none"' + (gs.notifyBy === 'none' ? ' selected' : '') + '>None</option>' +
            '</select>') +
          formRow('Payment terms', 'or-pmt-' + gi,
            '<input type="text" id="or-pmt-' + gi + '" class="input" value="MQ Terms" readonly>') +
          formRow('Order type', 'or-otype-' + gi,
            '<input type="text" id="or-otype-' + gi + '" class="input" value="' + esc(local ? 'Branch Transfer' : 'Standard') + '" readonly>') +
          (!local ? formRow('PO reference (optional)', 'or-po-' + gi,
            '<input type="text" id="or-po-' + gi + '" class="input" placeholder="Leave blank to auto-assign" value="' + esc(gs.poNum) + '" data-or-field="poNum" data-gi="' + gi + '">') : '') +
          formRow('Needed by', 'or-date-' + gi,
            '<input type="date" id="or-date-' + gi + '" class="input" value="' + esc(gs.requestedDate) + '" data-or-field="requestedDate" data-gi="' + gi + '">') +
          formRow('Comments', 'or-comments-' + gi,
            '<textarea id="or-comments-' + gi + '" class="input" rows="3" placeholder="Notes for the supplier (optional)" data-or-field="comments" data-gi="' + gi + '">' + esc(gs.comments) + '</textarea>') +
        '</div>' +
      '</section>' +
      '<div class="or-group-foot">' +
        '<button type="button" class="btn btn-primary" data-or-submit-group="' + gi + '">' + icon('check') + (local ? 'Submit transfer' : 'Place order') + '</button>' +
        (gi < groups.length - 1
          ? '<button type="button" class="btn btn-secondary" data-or-next="' + gi + '">Skip to ' + esc(groups[gi + 1].label) + ' ' + icon('arrow-small-right') + '</button>'
          : '') +
        (gi > 0
          ? '<button type="button" class="btn btn-secondary" data-or-prev="' + gi + '">' + icon('arrow-small-left') + 'Back</button>'
          : '<a class="btn btn-secondary" href="#/work-order?id=' + esc(w.id) + '">Cancel</a>') +
        '<span class="or-total-lbl">' + (local ? 'No charge' : money(total)) + '</span>' +
      '</div>' +
    '</div>';
  }

  function renderTabs() {
    if (groups.length <= 1) return '';
    return '<div class="or-tabs" role="tablist" aria-label="Purchase orders">' +
      groups.map(function (g, i) {
        var gs = groupStates[i];
        return '<button type="button" role="tab" class="or-tab' + (i === activeTab ? ' or-tab-active' : '') + (gs.submitted ? ' or-tab-done' : '') + '" data-or-tab="' + i + '" aria-selected="' + (i === activeTab) + '">' +
          groupIcon(g) + esc(g.label) +
          '<span class="or-tab-cnt">' + g.items.length + '</span>' +
          (gs.submitted ? '<span class="or-tab-check">' + icon('check') + '</span>' : '') +
        '</button>';
      }).join('') +
    '</div>';
  }

  var grandTotal = allItems.reduce(function (s, c) { return s + (c.price || 0) * (c.qty || 1); }, 0);

  function renderSummaryAside() {
    var rows = groups.map(function (g, i) {
      var gs = groupStates[i];
      var t = g.items.reduce(function (s, c) { return s + (c.price || 0) * (c.qty || 1); }, 0);
      return '<div class="or-sum-row">' +
        '<div class="or-sum-lbl">' + groupIcon(g) + esc(g.label) + (gs.submitted ? ' <span class="or-sum-done">' + icon('check') + '</span>' : '') + '</div>' +
        '<div class="or-sum-val">' + (g.type === 'local' ? 'No charge' : money(t)) + '</div>' +
      '</div>';
    }).join('');
    var allSubmitted = groupStates.every(function (gs) { return gs.submitted; });
    return '<aside class="card oc-aside or-aside" aria-label="Order summary">' +
      '<h2 class="oc-aside-h">Summary</h2>' +
      '<div class="or-sum-wos"><span class="muted">' + icon('clipboard-list') + 'Work order #' + esc(w.id) + '</span><b>' + esc(w.issue || '') + '</b></div>' +
      rows +
      '<div class="oc-grand"><span>Estimated total</span><b>' + money(grandTotal) + '</b></div>' +
      '<p class="oc-note">Tax and freight added by supplier. Branch transfers carry no purchase cost.</p>' +
      (allSubmitted
        ? '<a class="btn btn-primary oc-cta" href="#/work-order?id=' + esc(w.id) + '">' + icon('check') + 'Back to work order</a>'
        : '') +
    '</aside>';
  }

  function fullBody() {
    return '<div class="or-layout">' +
      renderTabs() +
      '<div class="or-main">' +
        renderGroupForm(activeTab) +
      '</div>' +
      renderSummaryAside() +
    '</div>';
  }

  var unsubmitted = groups.filter(function (_, i) { return !groupStates[i].submitted; });
  var subLabel = unsubmitted.length === 1
    ? (groups[groups.indexOf(unsubmitted[0])] || {}).type === 'local' ? '1 branch transfer' : '1 purchase order'
    : unsubmitted.length + ' orders';

  var s = SE.shell(el, {
    nav: 'work-orders', title: 'Place order',
    sub: 'Work order #' + esc(w.id) + ' · ' + subLabel,
    crumbs: crumbs,
    body: fullBody(),
  });

  // ── Event handlers ────────────────────────────────────────────────────────
  el.addEventListener('click', function (e) {
    // Tab switch
    var tabBtn = e.target.closest('[data-or-tab]');
    if (tabBtn) { activeTab = parseInt(tabBtn.dataset.orTab, 10); rerender(); return; }

    // Use recommended shipping
    var recBtn = e.target.closest('[data-use-rec]');
    if (recBtn) {
      var form = recBtn.closest('[data-group-form]');
      var gi = form ? parseInt(form.dataset.groupForm, 10) : activeTab;
      var gs = groupStates[gi], r = gs.rec;
      gs.carrier = r.carrier; gs.service = r.service;
      var carrierSel = form && form.querySelector('[data-or-field="carrier"]');
      var serviceSel = form && form.querySelector('[data-or-field="service"]');
      if (carrierSel) carrierSel.value = r.carrier;
      if (serviceSel) serviceSel.value = r.service;
      return;
    }

    // Next tab
    var nextBtn = e.target.closest('[data-or-next]');
    if (nextBtn) { activeTab = parseInt(nextBtn.dataset.orNext, 10) + 1; rerender(); return; }

    // Prev tab
    var prevBtn = e.target.closest('[data-or-prev]');
    if (prevBtn) { activeTab = parseInt(prevBtn.dataset.orPrev, 10) - 1; rerender(); return; }

    // Submit group
    var subBtn = e.target.closest('[data-or-submit-group]');
    if (subBtn) {
      var gi2 = parseInt(subBtn.dataset.orSubmitGroup, 10);
      placeGroup(gi2);
      return;
    }

    // Return item to WO cart (remove from current order placement)
    var rtcBtn = e.target.closest('[data-rtc-id]');
    if (rtcBtn) {
      var rtcId = rtcBtn.dataset.rtcId;
      // Count items still active (in unsubmitted groups)
      var activeCount = groups.reduce(function (n, g, i) {
        return groupStates[i].submitted ? n : n + g.items.length;
      }, 0);
      function doReturn() {
        // Remove from allItems — item stays in SE.state.woCart for the WO page
        var idx = allItems.findIndex(function (c) { return c.id === rtcId; });
        if (idx >= 0) allItems.splice(idx, 1);
        // Rebuild groups, preserving any form state already entered
        var stateByKey = groups.reduce(function (m, g, i) { m[g.type + '|' + g.key] = groupStates[i]; return m; }, {});
        groups = buildPoGroups(allItems);
        groupStates = groups.map(function (g) { return stateByKey[g.type + '|' + g.key] || defaultGroupState(g); });
        if (activeTab >= groups.length) activeTab = Math.max(0, groups.length - 1);
        var layout = el.querySelector('.or-layout');
        if (layout) layout.outerHTML = fullBody();
        SE.toast('Item returned to work order cart', 'shopping-cart');
      }
      if (activeCount <= 1) {
        var dlg = SE.ui.dialog({
          title: 'Cancel this order?',
          body: '<p>This is the only item left. Removing it will cancel the order and return you to the work order.</p>',
          foot: '<button class="btn btn-secondary" type="button" data-dlg-close>Keep it</button>' +
                '<button class="btn btn-primary" type="button" data-rtc-confirm>Remove &amp; cancel</button>'
        });
        dlg.el.querySelector('[data-rtc-confirm]').addEventListener('click', function () {
          dlg.close();
          SE.go('work-order', { params: { id: w.id } });
        });
      } else {
        doReturn();
      }
      return;
    }
  });

  el.addEventListener('change', function (e) {
    var f = e.target.closest('[data-or-field]');
    if (!f) return;
    var field = f.dataset.orField, gi = parseInt(f.dataset.gi, 10);
    groupStates[gi][field] = f.value;
  });

  el.addEventListener('input', function (e) {
    var a = e.target.closest('[data-or-addr]');
    if (!a) return;
    var prefix = a.dataset.orAddr, key = a.dataset.addrKey, gi = parseInt(a.dataset.gi, 10);
    if (groupStates[gi] && groupStates[gi][prefix]) groupStates[gi][prefix][key] = a.value;
  });

  function rerender() {
    var main = el.querySelector('.or-main');
    if (main) main.innerHTML = renderGroupForm(activeTab);
    var tabsEl = el.querySelector('.or-tabs');
    if (tabsEl) tabsEl.outerHTML = renderTabs();
    // re-attach tabs after outerHTML replacement
    var newTabs = el.querySelector('.or-tabs');
    if (newTabs) newTabs.querySelectorAll('[data-or-tab]').forEach(function (btn) {
      btn.setAttribute('aria-selected', btn.dataset.orTab === String(activeTab));
    });
  }

  function placeGroup(gi) {
    var g = groups[gi], gs = groupStates[gi];
    var now = new Date();
    var n = SE.state.nextPO || D.nextPO || 7900;
    SE.state.nextPO = n + 1;
    var poNum = gs.poNum && gs.poNum.trim() ? gs.poNum.trim() : 'PO-' + n;
    gs.poNum = poNum;

    var total = g.items.reduce(function (s, c) { return s + (c.price || 0) * (c.qty || 1); }, 0);
    var placedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var placedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Add to global order history
    SE.state.placed = [{
      po: poNum, wo: w.id,
      supplier: g.type === 'local' ? 'Branch Transfer · ' + g.label : g.label,
      status: 'Submitted', tone: 'info',
      placed: placedDate, eta: 'Awaiting confirmation',
      carrier: gs.carrier, tracking: null,
      shipTo: gs.shipTo, billTo: gs.billTo, locId: locId, needBy: gs.requestedDate || null, note: gs.comments || '',
      fullName: gs.fullName, phone: gs.phone, notifyBy: gs.notifyBy, freightTerms: gs.freightTerms, carrierAccount: gs.carrierAccount,
      from: 'wo-cart', kind: g.type === 'local' ? 'transfer' : 'purchase',
      items: g.items.map(function (c) { return { pn: c.partNum || c.id, qty: c.qty || 1, wo: w.id }; }),
      steps: [['Submitted', placedTime], ['Confirmed', null], ['Shipped', null], ['Delivered', null]],
      total: Math.round(total * 100) / 100,
    }].concat(SE.state.placed);

    // Add to WO submitted orders
    var ed = SE.state.woEdits || (SE.state.woEdits = {});
    if (!ed[w.id]) ed[w.id] = { set: {}, log: [], notes: [] };
    var existingOrds = ed[w.id].set.submittedOrders || (w.submittedOrders ? w.submittedOrders.slice() : []);
    ed[w.id].set.submittedOrders = existingOrds.concat([{
      poNum: poNum, date: placedDate, status: 'submitted',
      items: g.items, total: Math.round(total * 100) / 100,
      carrier: gs.carrier, service: gs.service,
    }]);
    ed[w.id].set.updated = 'Just now';

    // Remove submitted item ids from WO cart
    var submittedIds = g.items.map(function (c) { return c.id; });
    var wc = SE.state.woCart;
    if (wc[w.id]) wc[w.id] = wc[w.id].filter(function (c) { return submittedIds.indexOf(c.id) < 0; });

    gs.submitted = true;
    SE.save();

    // Check if all groups are submitted
    var allDone = groupStates.every(function (x) { return x.submitted; });
    if (allDone) {
      SE.go('placed', { params: { po: groupStates.map(function (x) { return x.poNum; }).join(',') }, replace: true });
    } else {
      // Advance to next unsubmitted group
      var next = groupStates.findIndex(function (x, i) { return !x.submitted && i > gi; });
      if (next < 0) next = groupStates.findIndex(function (x) { return !x.submitted; });
      activeTab = next >= 0 ? next : activeTab;
      SE.toast(poNum + ' submitted', 'check');
      // Re-render the full view
      var body = el.querySelector('.or-layout');
      if (body) body.outerHTML = fullBody();
      else { var c2 = el.querySelector('.main-body, .shell-body, [class*="body"]'); if (c2) c2.innerHTML = fullBody(); }
    }
  }

  return s.cleanup;
};
