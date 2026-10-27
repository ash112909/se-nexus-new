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
  var s = SE.shell(el, { search: '<div class="search page-search" role="search"><label class="sr-only" for="oh-q">Search orders by PO, work order, part or supplier</label>' + icon('search') + '<input type="text" id="oh-q" value="' + esc(q) + '" placeholder="Search orders by PO, part or supplier" autocomplete="off" spellcheck="false" enterkeyhint="search">' + '<button type="button" class="sx-x" data-qx aria-label="Clear search"' + (q ? '' : ' hidden') + '>' + icon('cross-small') + '</button></div>', nav: 'orders', title: 'Order history', sub: SE.orders().length + ' orders · purchases, transfers and shelf picks · newest first', crumbs: [['Home', 'home']],
    body: '<section class="oh sec">' +
      '<div class="sx-bar">' +
        
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
    if (!t || !t.closest('.oh')) return;
    if (t.dataset.seg) { filter = t.dataset.seg; render(); return; }
    if (t.hasAttribute('data-qx')) { q = ''; input.value = ''; render(); input.focus(); return; }
    if (t.dataset.recent) { q = t.dataset.recent; input.value = q; render(); remember(); }
  });
  return function () { clearTimeout(timer); s.cleanup(); };
};
