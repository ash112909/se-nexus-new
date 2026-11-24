/* Order history (B3, legacy web 31 and 32; DES-32 Orders Search, DES-26 scoped entry). A search field
   scoped to orders matches the PO number, work order number, the part numbers and names of its items, and
   the supplier; every word must match. Segmented status filter: All, Open (Submitted, Backordered,
   Shipped), Shipped, Delivered, Backordered, with counts for the current query; it narrows in place
   together with the query. Matches are highlighted and a matching item is named under its PO.
   Table, newest first (this session's orders, then history). Query and filter are kept for the session
   (SE.state.search.orders).
   State: #/orders?filter=Open&q=JLG-4120-415 */
SE.titles.orders = 'Order history';
SE.views.orders = function (el, p) {
  var D = SE.data, UI = SE.ui, esc = SE.esc, money = SE.money, icon = SE.icon;
  var F = { All: null, Open: ['Recorded', 'Submitted', 'Requested', 'Backordered', 'Shipped'], Shipped: ['Shipped'], Delivered: ['Delivered'], Backordered: ['Backordered'], Cancelled: ['Cancelled'] };
  var S = SE.state.search || (SE.state.search = {});
  var mem = S.orders || (S.orders = { q: '', filter: 'All', recent: [] });
  var fromUrl = p.filter != null || p.q != null;
  var filter = F.hasOwnProperty(p.filter) ? p.filter : fromUrl ? 'All' : (F.hasOwnProperty(mem.filter) ? mem.filter : 'All');
  var q = p.q != null ? p.q : fromUrl ? '' : (mem.q || '');

  function tokens(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean); }
  function hl(text, query) {
    text = String(text); var t = tokens(query);
    if (!t.length) return esc(text);
    var low = text.toLowerCase(), on = [];
    t.forEach(function (w) { var i = low.indexOf(w); while (i >= 0) { for (var k = i; k < i + w.length; k++) on[k] = 1; i = low.indexOf(w, i + w.length); } });
    var out = '', open = false;
    for (var i = 0; i < text.length; i++) {
      if (on[i] && !open) { out += '<mark class="mark-hl">'; open = true; }
      if (!on[i] && open) { out += '</mark>'; open = false; }
      out += esc(text[i]);
    }
    return out + (open ? '</mark>' : '');
  }
  function itemText(i) { var pt = SE.part(i.pn); return i.pn + ' ' + (pt ? pt.name : ''); }
  function found(o) { var t = tokens(q); if (!t.length) return true; var h = [o.po, o.wo || '', o.supplier].concat(o.items.map(itemText)).join(' ').toLowerCase(); return t.every(function (w) { return h.indexOf(w) >= 0; }); }
  function matchedItems(o) {
    var t = tokens(q);
    if (!t.length) return [];
    return o.items.filter(function (i) { var h = itemText(i).toLowerCase(); return t.some(function (w) { return h.indexOf(w) >= 0; }); });
  }
  function inFilter(o, f) { return !F[f] || F[f].indexOf(o.status) >= 0; }
  function rows(f) { return SE.orders().filter(function (o) { return inFilter(o, f) && found(o); }); }
  function seg() { return UI.seg('Filter orders', Object.keys(F).map(function (k) { return [k, k, rows(k).length]; }), filter); }
  function recents() {
    if (q.trim()) return '';
    var seen = {}, list = (mem.recent || []).concat(D.recentSearches.orders || []).filter(function (r) { var k = r.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 5);
    if (!list.length) return '';
    return '<div class="sx-recent"><span class="sx-recent-l">' + icon('time-past') + 'Recent order searches</span>' + list.map(function (r) {
      return '<button type="button" class="sx-chip" data-recent="' + esc(r) + '">' + esc(r) + '</button>';
    }).join('') + '</div>';
  }
  function table() {
    var r = rows(filter);
    if (!r.length) {
      var other = q.trim() && filter !== 'All' ? rows('All').length : 0;
      return UI.empty({ icon: 'receipt', tone: 'neutral',
        title: q.trim() ? 'No ' + (filter === 'All' ? '' : filter.toLowerCase() + ' ') + 'orders match "' + q.trim() + '"' : 'No ' + filter.toLowerCase() + ' orders',
        text: q.trim() ? 'Search by PO number, work order number, part number or supplier.' : 'Orders appear here once they are placed.',
        action: other ? '<button type="button" class="btn btn-secondary" data-seg="All">Show all statuses (' + other + ')</button>' : q.trim() ? '<button type="button" class="btn btn-secondary" data-qx>Clear search</button>' : '' });
    }
    return (q.trim() ? '<p class="sx-count">' + r.length + (r.length === 1 ? ' order matches' : ' orders match') + '</p>' : '') +
      UI.table([['PO'], ['Placed', 'nowrap'], ['Supplier'], ['Status'], ['Line items', 'num'], ['Total', 'num'], ['Work order', 'nowrap']], r.map(function (o) {
        var hit = matchedItems(o);
        return ['<a class="oh-po" href="#/order?po=' + o.po + '">' + hl(o.po, q) + '</a>' + (o.isNew ? ' <span class="oh-new">New</span>' : '') +
            hit.map(function (i) { var pt = SE.part(i.pn); return '<span class="oh-hit"><b>' + hl(i.pn, q) + '</b>' + (pt ? ' ' + hl(pt.name, q) : '') + ' · Qty ' + i.qty + '</span>'; }).join(''),
          esc(o.placed), hl(o.supplier, q), SE.chip(o.status), String(o.items.length), '<b>' + (o.kind === 'transfer' || o.kind === 'pick' || o.kind === 'local-pick' ? 'No purchase charge' : money(o.total)) + '</b>',
          o.wo ? '<a href="#/work-order?id=' + esc(o.wo) + '">#' + hl(o.wo, q) + '</a>' : '<span class="muted">None</span>'];
      }), { rowAttrs: function (i) { return 'data-go="order" data-po="' + r[i].po + '"'; }, cls: 'oh-tbl' });
  }
  var OH_PLACEMENTS = [
    { id: 'top',    label: 'Top of order summary' },
    { id: 'bottom', label: 'Bottom of order summary' },
  ];

  function openMsgManager() {
    if (!SE.cms) return;
    var msgs = SE.cms.getArticles('published').filter(function (a) { return !!a.orderMsg; });

    function buildRow(a) {
      var pl = OH_PLACEMENTS.filter(function (p) { return p.id === a.placement; })[0] || { label: a.placement || '—' };
      return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:0.5px solid #F0ECE8;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">' +
            '<span style="font-size:9px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.5px;background:#EEEDFE;padding:2px 6px;border-radius:3px;">' + esc(pl.label) + '</span>' +
            '<span style="font-size:11px;font-weight:600;color:#111318;">' + esc(a.title) + '</span>' +
          '</div>' +
          '<div style="font-size:11px;color:#7A7F8E;">' + esc(a.body ? a.body.slice(0, 120) + (a.body.length > 120 ? '…' : '') : '') + '</div>' +
          (a.postedDate ? '<div style="font-size:10px;color:#B0AAA3;margin-top:2px;">' + esc(a.postedDate) + '</div>' : '') +
        '</div>' +
        '<button data-oh-del="' + esc(a.id) + '" style="background:none;border:0.5px solid #E2DDD8;border-radius:6px;padding:4px 8px;font-size:11px;color:#D9534F;cursor:pointer;font-family:inherit;flex-shrink:0;">Remove</button>' +
      '</div>';
    }

    var listHtml = msgs.length
      ? msgs.map(buildRow).join('')
      : '<div style="font-size:13px;color:#9CA3AF;text-align:center;padding:20px 0;">No order messages yet.</div>';

    var dlg = UI.dialog({
      title: 'Order Messages',
      body: '<div style="max-height:480px;overflow-y:auto;margin:-16px;">' +
        '<div style="padding:14px 16px;border-bottom:0.5px solid #F0ECE8;">' +
          '<div style="font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#9CA3AF;margin-bottom:10px;">Add new message</div>' +
          '<div style="display:grid;gap:7px;">' +
            '<input id="oh-msg-title" type="text" placeholder="Message title *" style="width:100%;height:32px;border:0.5px solid #E2DDD8;border-radius:6px;padding:0 10px;font-size:12px;font-family:inherit;color:var(--ink);outline:none;background:var(--surface);" />' +
            '<textarea id="oh-msg-body" placeholder="Message content *" style="width:100%;min-height:56px;border:0.5px solid #E2DDD8;border-radius:6px;padding:7px 10px;font-size:12px;font-family:inherit;color:var(--ink);outline:none;resize:none;background:var(--surface);"></textarea>' +
            '<select id="oh-msg-placement" style="height:32px;border:0.5px solid #E2DDD8;border-radius:6px;padding:0 10px;font-size:12px;font-family:inherit;color:var(--ink);outline:none;background:var(--surface);">' +
              OH_PLACEMENTS.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.label) + '</option>'; }).join('') +
            '</select>' +
            '<button type="button" data-oh-add style="height:32px;background:var(--ink);border:none;border-radius:6px;font-size:12px;font-weight:600;color:var(--paper);font-family:inherit;cursor:pointer;">Add message</button>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div style="padding:10px 16px 4px;font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#534AB7;">Active messages (' + msgs.length + ')</div>' +
          listHtml +
        '</div>' +
      '</div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Done</button>',
    });

    dlg.el.addEventListener('click', function (e) {
      var del = e.target.closest('[data-oh-del]');
      if (del) {
        SE.cms.deleteArticle(del.dataset.ohDel);
        dlg.close();
        openMsgManager();
        return;
      }
      if (e.target.closest('[data-oh-add]')) {
        var titleEl = dlg.el.querySelector('#oh-msg-title');
        var bodyEl  = dlg.el.querySelector('#oh-msg-body');
        var placEl  = dlg.el.querySelector('#oh-msg-placement');
        var t = titleEl ? titleEl.value.trim() : '';
        var b = bodyEl  ? bodyEl.value.trim()  : '';
        var pl = placEl ? placEl.value : 'top';
        if (!t || !b) { SE.toast('Title and content are required', 'cross-small'); return; }
        SE.cms.saveArticle({
          id: 'oh-msg-' + Date.now(),
          type: 'notice', subtype: 'Administrative', status: 'published', postAs: 'news',
          title: t, body: b, placement: pl,
          orderMsg: true, showOnOrders: false, vendorName: '',
          poster: SE.data.user.name || '', postedDate: new Date().toISOString().slice(0, 10), expiryDate: '',
          language: 'en', tags: [], attachments: [], locations: ['all'],
          banner: false, bannerDismissible: true, bannerText: '', priority: 'low',
        });
        dlg.close();
        openMsgManager();
      }
    });
  }

  var s = SE.shell(el, { nav: 'orders', title: 'Order history', sub: SE.orders().length + ' orders · purchases, transfers and shelf picks · newest first', crumbs: [['Home', 'home']],
    actions: (SE.cms ? '<button class="btn btn-secondary" type="button" data-oh-manage-msgs>' + icon('megaphone') + 'Manage messages</button>' : ''),
    body: '<section class="oh sec">' +
      '<div class="sx-bar">' +
        '<div class="search page-search" role="search"><label class="sr-only" for="oh-q">Search orders</label>' + icon('search') + '<input type="text" id="oh-q" value="' + esc(q) + '" placeholder="Search by PO, part or supplier" autocomplete="off" spellcheck="false" enterkeyhint="search">' + '<button type="button" class="sx-x" data-qx aria-label="Clear search"' + (q ? '' : ' hidden') + '>' + icon('cross-small') + '</button></div>' +
        '<div class="oh-bar" id="oh-seg">' + seg() + '</div>' +
      '</div>' +
      '<div id="oh-recent">' + recents() + '</div>' +
      '<div id="oh-table">' + table() + '</div></section>' });
  var input = el.querySelector('#oh-q'), timer;
  function save() { mem.q = q; mem.filter = filter; SE.save(); }
  function sync() {
    var h = []; if (filter !== 'All') h.push('filter=' + filter); if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    history.replaceState(null, '', '#/orders' + (h.length ? '?' + h.join('&') : ''));
  }
  function render() {
    el.querySelector('#oh-seg').innerHTML = seg();
    el.querySelector('#oh-recent').innerHTML = recents();
    el.querySelector('#oh-table').innerHTML = table();
    el.querySelector('[data-qx]').hidden = !q;
    save(); sync();
  }
  function remember() {
    var v = q.trim();
    if (v.length < 2) return;
    mem.recent = [v].concat((mem.recent || []).filter(function (r) { return r.toLowerCase() !== v.toLowerCase(); })).slice(0, 5);
    SE.save();
  }
  input.addEventListener('input', function () { q = input.value; clearTimeout(timer); timer = setTimeout(render, 120); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); q = input.value; render(); remember(); }
    if (e.key === 'Escape' && q) { e.stopPropagation(); q = ''; input.value = ''; render(); }
  });
  input.addEventListener('blur', remember);
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-oh-manage-msgs')) { openMsgManager(); return; }
    if (!t.closest('.oh')) return;
    if (t.dataset.seg) { filter = t.dataset.seg; render(); return; }
    if (t.hasAttribute('data-qx')) { q = ''; input.value = ''; render(); input.focus(); return; }
    if (t.dataset.recent) { q = t.dataset.recent; input.value = q; render(); remember(); }
  });
  return function () { clearTimeout(timer); s.cleanup(); };
};
