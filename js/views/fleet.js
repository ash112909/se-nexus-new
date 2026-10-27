/* Fleet (DES-28 Fleet Asset Search, DES-26 scoped entry). The units at the chosen location (the account
   menu's location; "Change location" opens it), a search field scoped to the fleet, a status filter
   (All, In service, Service due, Down) with counts for the current query, recent fleet searches, and a
   table; a row opens the asset page. Under 640px the table becomes stacked rows.
   Search matches equipment number, serial (exact and partial: JL1930-044 finds every JL1930-044xx),
   model, make and location; every word must match; exact equipment or serial matches sort first.
   Query and filter are kept for the session (SE.state.search.fleet).
   State: #/fleet?q=JL1930-044&status=Down */
SE.titles.fleet = 'Fleet';
SE.views.fleet = function (el, p) {
  var D = SE.data, UI = SE.ui, esc = SE.esc, icon = SE.icon;
  var STATUS = ['All', 'In service', 'Service due', 'Down'];
  var S = SE.state.search || (SE.state.search = {});
  var mem = S.fleet || (S.fleet = { q: '', status: 'All', recent: [] });
  var q = p.q != null ? p.q : (mem.q || '');
  var status = STATUS.indexOf(p.status) >= 0 ? p.status : (STATUS.indexOf(mem.status) >= 0 ? mem.status : 'All');

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
  function hay(a) { return [a.equip, a.serial, a.model, a.machine, a.make, a.location].join(' ').toLowerCase(); }
  function rank(a, query) {
    var s = query.trim().toLowerCase();
    if (a.equip.toLowerCase() === s || a.serial.toLowerCase() === s) return 0;
    if (a.equip.toLowerCase().indexOf(s) === 0 || a.serial.toLowerCase().indexOf(s) === 0) return 1;
    return 2;
  }
  function search(list, query) {
    var t = tokens(query);
    if (!t.length) return list.slice();
    return list.filter(function (a) { var h = hay(a); return t.every(function (w) { return h.indexOf(w) >= 0; }); })
      .sort(function (a, b) { return rank(a, query) - rank(b, query); });
  }
  function matches(st) { return search(SE.assetsHere(), q).filter(function (a) { return st === 'All' || a.status === st; }); }
  function seg() { return UI.seg('Filter by status', STATUS.map(function (s) { return [s, s, matches(s).length]; }), status); }
  function sub() {
    var l = SE.location();
    return icon('marker') + '<b>' + esc(l.name) + '</b> · ' + SE.assetsHere().length + ' units <button type="button" class="btn-link fl-chg" data-loc-open>Change location</button>';
  }
  function recents() {
    var seen = {}, list = (mem.recent || []).concat(D.recentSearches.fleet || []).filter(function (r) { var k = r.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 5);
    if (!list.length) return '';
    return '<div class="sx-recent"><span class="sx-recent-l">' + icon('time-past') + 'Recent fleet searches</span>' + list.map(function (r) {
      return '<button type="button" class="sx-chip" data-recent="' + esc(r) + '">' + esc(r) + '</button>';
    }).join('') + '</div>';
  }
  function table() {
    var rows = matches(status);
    if (!rows.length) {
      var elsewhere = SE.state.location !== 'all' ? search(SE.assets(), q).filter(function (a) { return status === 'All' || a.status === status; }).length : 0;
      return UI.empty({ icon: 'search', tone: 'neutral', title: q.trim() ? 'No units match "' + q.trim() + '"' : 'No ' + status.toLowerCase() + ' units',
        text: (q.trim() ? 'Check the equipment number or try part of the serial, for example JL1930-044.' : 'Nothing has this status.') + (SE.state.location !== 'all' ? ' Showing ' + SE.location().name + ' only.' : ''),
        action: elsewhere ? '<button type="button" class="btn btn-secondary" data-all-loc>Show all locations (' + elsewhere + ' more)</button>'
          : status !== 'All' ? '<button type="button" class="btn btn-secondary" data-seg="All">Show all statuses</button>'
          : q.trim() ? '<button type="button" class="btn btn-secondary" data-qx>Clear search</button>' : '' });
    }
    return '<p class="sx-count">' + (q.trim() || status !== 'All' ? rows.length + ' of ' + SE.assetsHere().length + ' units' : rows.length + ' units') + '</p>' +
      UI.table([['Equipment'], ['Make and model'], ['Serial', 'nowrap'], ['Year', 'num'], ['Location'], ['Status'], ['Hours', 'num']], rows.map(function (a) {
        return ['<a class="fl-eq" href="#/asset?id=' + encodeURIComponent(a.equip) + '">' + hl(a.equip, q) + '</a>', hl(a.make, q) + ' ' + hl(a.machine.replace(a.make + ' ', ''), q),
          '<span class="fl-serial">' + hl(a.serial, q) + '</span>', String(a.year), hl(a.location, q), SE.chip(a.status), a.hours.toLocaleString('en-US') + ' h'];
      }), { cls: 'fl-tbl', rowAttrs: function (i) { return 'data-row="' + esc(rows[i].equip) + '"'; } });
  }

  var s = SE.shell(el, { search: '<div class="search page-search" role="search"><label class="sr-only" for="fl-q">Search fleet by equipment, serial, model</label>' + icon('search') + '<input type="text" id="fl-q" value="' + esc(q) + '" placeholder="Search fleet by equipment, serial or model" autocomplete="off" spellcheck="false" enterkeyhint="search">' + '<button type="button" class="sx-x" data-qx aria-label="Clear search"' + (q ? '' : ' hidden') + '>' + icon('cross-small') + '</button></div>',
    nav: 'fleet', title: 'Fleet', sub: '<span id="fl-sub" class="fl-sub">' + sub() + '</span>', crumbs: [['Home', 'home']],
    onLocation: function () { render(); },
    body: '<section class="sec fl" aria-label="Fleet assets">' +
      '<div class="sx-bar">' +
        
        '<div id="fl-seg">' + seg() + '</div>' +
      '</div>' +
      '<div id="fl-recent">' + (q.trim() ? '' : recents()) + '</div>' +
      '<div id="fl-table">' + table() + '</div></section>',
  });
  var input = el.querySelector('#fl-q'), timer;
  function save() { mem.q = q; mem.status = status; SE.save(); }
  function sync() {
    var h = [];
    if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    if (status !== 'All') h.push('status=' + encodeURIComponent(status));
    history.replaceState(null, '', '#/fleet' + (h.length ? '?' + h.join('&') : ''));
  }
  function render() {
    el.querySelector('#fl-sub').innerHTML = sub();
    el.querySelector('#fl-seg').innerHTML = seg();
    el.querySelector('#fl-recent').innerHTML = q.trim() ? '' : recents();
    el.querySelector('#fl-table').innerHTML = table();
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
    var t = e.target.closest('button, tr[data-row], a.fl-eq');
    if (!t || !t.closest('.fl, .page-head')) return;
    if (t.matches('tr[data-row]') || t.matches('a.fl-eq')) { e.preventDefault(); remember(); SE.go('asset', { params: { id: t.closest('tr').dataset.row } }); return; }
    if (t.dataset.seg) { status = t.dataset.seg; render(); return; }
    if (t.hasAttribute('data-qx')) { q = ''; input.value = ''; render(); input.focus(); return; }
    if (t.dataset.recent) { q = t.dataset.recent; input.value = q; render(); remember(); return; }
    if (t.hasAttribute('data-loc-open')) { s.openAccount(); return; }
    if (t.hasAttribute('data-all-loc')) { SE.setLocation('all'); render(); SE.toast('Showing All locations', 'marker'); }
  });
  return function () { clearTimeout(timer); s.cleanup(); };
};
