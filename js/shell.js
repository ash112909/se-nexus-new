/* Signed-in shell shared by every web page: rail (open 256, collapsed 88, drawer under 1024), app bar,
   page head (breadcrumbs, title, search and quick bar), account popover (locations, sign out).
   Extracted from the 1006 Home (Figma "Web / landing / light / xl 1280 · rail open | rail collapsed").

   Use from a view:
     var s = SE.shell(el, { nav: 'work-orders', title: 'Work orders', sub: '...', crumbs: [['Home', 'home']],
                            actions: '<button ...>', body: '<section>...</section>', head: null });
     s.content  -> the .content element (page body lives inside)
     s.cleanup  -> call from the view's cleanup
     s.refresh() -> re-render rail badges and quick bar counts (after cart or approval changes)
   o.search (html) replaces the global search field in the header with the page's own search.
   o.head replaces the standard head (Home uses its greeting head). Clicks on [data-go] anywhere in the
   page are routed: data-go="order" data-po="PO-7838" -> #/order?po=PO-7838. */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon;
  // [icon, label, route] ; '#' rows are group labels ; route null = deferred (shown, not clickable)
  SE.NAV = [
    ['home', 'Home', 'home'], ['clipboard-list', 'Orders', 'work-orders'],
    ['shopping-cart-check', 'Approvals', 'approvals'], ['time-past', 'Order History', 'orders'], ['truck-side', 'Fleet', 'fleet'],
    // Scan Asset Tag is parked on web (2026-10-14, client request): js/views/scan.js stays, with no entry point

    ['#', 'Parts'], ['search', 'Search Parts', 'search'], ['grid-alt', 'Parts Catalog', 'catalog'], ['star', 'Recommended Parts', 'recommended'], ['list', 'Shopping Lists', 'lists'], ['shopping-cart', 'Cart', 'cart'],
    ['#', 'Knowledge'], ['book-alt', 'Manuals & Docs', 'manuals'], ['notebook', 'Knowledge Base', 'kb'], ['bell', 'Notifications', 'notifications'], ['pulse', 'Diagnostics', null],
  ];
  function count(route) {
    if (route === 'approvals') return SE.pendingApprovals().length;
    if (route === 'notifications') return SE.unread();
    if (route === 'cart') return SE.cartCount();
    return 0;
  }
  // [data-go] routing shared by every page
  SE.goFrom = function (t) {
    var params = {};
    ['pn', 'wo', 'id', 'po', 'sup', 'm', 'cat', 'q', 'filter', 'page', 'type', 'from', 'kind', 'priority', 'state'].forEach(function (k) { if (t.dataset[k]) params[k] = t.dataset[k]; });
    SE.go(t.dataset.go, Object.keys(params).length ? { params: params } : {});
  };

  SE.shell = function (el, o) {
    var D = SE.data;
    var mqWide = window.matchMedia('(min-width: 1280px)'), mqDesk = window.matchMedia('(min-width: 1024px)');

    function railHtml() {
      return '<nav class="rail" id="rail" aria-label="Primary">' +
        '<div class="rail-brand">' +
          '<a class="rail-lockup" href="#/home" aria-label="' + esc(D.fleet.name) + ', Home">' + '<span class="rail-wordmark">' + SE.mcLogo('#FFFFFF', 'var(--brand)', D.fleet.name) + '</span><span class="rail-chev" aria-hidden="true">' + SE.mcMark('var(--brand)') + '</span></a>' +
          '<button class="rail-toggle" type="button" aria-controls="rail">' + icon('angle-small-left') + '</button>' +
        '</div>' +
        '<ul class="rail-nav">' + SE.NAV.map(function (r) {
          if (r[0] === '#') return '<li class="nav-group"><span>' + r[1].toUpperCase() + '</span></li>';
          var n = r[2] ? count(r[2]) : 0;
          var inner = icon(r[0]) + '<span class="nav-label">' + esc(r[1]) + '</span>' +
            (n ? '<span class="nav-count" data-count="' + r[2] + '">' + n + '</span>' : '<span class="nav-count" data-count="' + r[2] + '" hidden></span>');
          if (!r[2]) return '<li><span class="nav-item off" aria-disabled="true" data-tip="' + esc(r[1]) + ', coming soon">' + icon(r[0]) + '<span class="nav-label">' + esc(r[1]) + '</span><span class="nav-later">Soon</span></span></li>';
          var cur = r[2] === o.nav;
          return '<li><a class="nav-item" href="#/' + r[2] + '"' + (cur ? ' aria-current="page"' : '') + ' data-tip="' + esc(r[1]) + '">' + inner + '</a></li>';
        }).join('') + '</ul>' +
        // 1017: the new SmartEquip wordmark (negative, the rail is black in both themes); the collapsed rail shows the symbol
        '<div class="rail-powered"><span class="rp-full"><span>Powered by</span>' + SE.seLogo('dark') + '</span><span class="rp-wrench" title="Powered by SmartEquip">' + SE.seLogo('dark', 'Powered by SmartEquip', 'symbol') + '</span></div>' +
      '</nav>';
    }
    function quick(withSettings) {
      var u = SE.unread();
      var av = SE.store.getLocal('avatar');
      var avHtml = av ? '<img src="' + esc(av) + '" alt="" class="qa-av-img">'
                      : '<span class="qa-av-init">' + esc(D.user.initials) + '</span>';
      var parts = D.user.name.split(' ');
      var shortName = parts[0] + (parts.length > 1 ? ' ' + parts[parts.length - 1].charAt(0) + '.' : '');
      return '<a class="qa" href="#/notifications" aria-label="Notifications, ' + u + ' unread">' + icon('bell') + '<span class="qa-badge dot" data-qa="notes"' + (u ? '' : ' hidden') + '></span></a>' +
        '<span class="qa-div" aria-hidden="true"></span>' +
        '<button class="qa qa-user-btn" type="button" aria-label="Account and locations" aria-haspopup="dialog" aria-expanded="false" data-account>' +
          '<span class="qa-user-av">' + avHtml + '</span>' +
          '<span class="qa-user-text"><b>' + esc(shortName) + '</b><small>' + esc(SE.location().name) + '</small></span>' +
          icon('angle-small-down') +
        '</button>' +
        (withSettings ? '<a class="qa" href="#/profile" aria-label="Profile and notifications">' + icon('settings') + '</a>' : '');
    }
    SE.searchForm = function (value) {
      return '<form class="search" role="search" data-search><label class="sr-only" for="q">Search parts, machines, orders and manuals</label>' + icon('search') +
        '<input id="q" name="q" type="search" placeholder="Search parts, manuals…" autocomplete="off" enterkeyhint="search" value="' + esc(value || '') + '" aria-keyshortcuts="Control+K Meta+K /">' +
        '<button class="sf-mic" type="button" aria-label="Search by voice" data-voice>' + icon('microphone') + '</button>' +
        '<kbd class="kbd" aria-hidden="true">⌘K</kbd></form>';
    };
    SE.tools = function () {
      // a page with its own search (fleet, manuals, orders) shows it here, in the header's search slot
      return '<div class="tools">' + (o.search || SE.searchForm(o.q)) + '<div class="quickbar" role="toolbar" aria-label="Quick actions">' + quick(true) + '</div></div>';
    };
    function crumbs() {
      if (!o.crumbs || !o.crumbs.length) return '';
      return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + o.crumbs.map(function (c) {
        return '<li><a href="#/' + c[1] + '">' + esc(c[0]) + '</a>' + icon('angle-small-right') + '</li>';
      }).join('') + '<li aria-current="page">' + esc(o.title) + '</li></ol></nav>';
    }
    var head = o.head != null ? o.head :
      '<header class="page-head">' +
        '<div class="greeting">' + crumbs() + '<h1 tabindex="-1" data-focus>' + esc(o.title) + '</h1>' + (o.sub ? '<p id="subline">' + o.sub + '</p>' : '') + '</div>' +
        SE.tools() +
      '</header>' + (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '');

    el.innerHTML =
      '<div class="shell">' +
        '<a class="skip-link" href="#main">Skip to content</a>' +
        '<header class="appbar">' +
          '<button class="appbar-menu" type="button" aria-label="Open navigation" aria-controls="rail" aria-expanded="false">' + icon('menu-burger') + '</button>' +
          '<span class="appbar-org">' + SE.mc('mc-32') + '<b>' + esc(D.fleet.name) + '</b></span>' +
          '<span class="appbar-quick">' + quick(false) + '</span>' +
        '</header>' +
        railHtml() +
        '<div class="rail-scrim" hidden></div>' +
        '<main class="main" id="main" tabindex="-1"><div class="content' + (o.wide ? ' wide' : '') + '">' + (SE.mkt ? SE.mkt.announce() : '') + head + (o.body || '') + '</div></main>' +
        '<div class="account" id="account" role="dialog" aria-label="Account and locations" hidden></div>' +
      '</div>';

    var shell = el.querySelector('.shell'), rail = el.querySelector('.rail'), toggle = el.querySelector('.rail-toggle');
    var scrim = el.querySelector('.rail-scrim'), account = el.querySelector('#account'), menuBtn = el.querySelector('.appbar-menu');
    var pref = SE.store.getLocal('rail');
    var api = { el: el, content: el.querySelector('.content'), shell: shell };

    // ---------- rail modes
    function mode() { return !mqDesk.matches ? 'drawer' : (pref || (mqWide.matches ? 'open' : 'collapsed')); }
    function applyRail() {
      var m = mode();
      shell.dataset.rail = m;
      var open = m === 'open';
      toggle.setAttribute('aria-label', m === 'drawer' ? 'Close navigation' : open ? 'Collapse the rail' : 'Expand the rail');
      toggle.setAttribute('aria-expanded', String(m === 'drawer' ? shell.classList.contains('drawer-open') : open));
      toggle.innerHTML = icon(m === 'collapsed' ? 'angle-small-right' : 'angle-small-left');
      if (m !== 'drawer') closeDrawer(true);
      if (o.onLayout) o.onLayout(m);
    }
    function openDrawer() {
      shell.classList.add('drawer-open'); scrim.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-expanded', 'true');
      var f = rail.querySelector('[aria-current]'); if (f && !SE.capture) f.focus();
    }
    function closeDrawer(silent) {
      if (!shell.classList.contains('drawer-open')) return;
      shell.classList.remove('drawer-open'); scrim.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      if (!silent) menuBtn.focus();
    }
    toggle.addEventListener('click', function () {
      if (mode() === 'drawer') { closeDrawer(); return; }
      pref = mode() === 'open' ? 'collapsed' : 'open';
      SE.store.setLocal('rail', pref);
      applyRail();
    });
    menuBtn.addEventListener('click', openDrawer);
    scrim.addEventListener('click', function () { closeDrawer(); });
    mqWide.addEventListener('change', applyRail); mqDesk.addEventListener('change', applyRail);
    api.mode = mode;

    // ---------- account popover: who is signed in, locations, sign out
    var accBtn = null;
    function openAccount(btn) {
      accBtn = btn;
      var rows = [{ id: 'all', name: 'All locations', sub: 'Cross-location view' }].concat(D.locations.map(function (l) { return { id: l.id, name: l.name, sub: l.units + ' units · ' + l.address }; }));
      var accAv = SE.store.getLocal('avatar');
      var accAvHTML = accAv ? '<img src="' + esc(accAv) + '" alt="Profile photo">' : esc(D.user.initials);
      account.innerHTML =
        '<div class="acc-head"><span class="acc-avatar">' + accAvHTML + '</span><span><b>' + esc(D.user.name) + '</b><small>' + esc(D.user.role + ' · ' + D.fleet.name) + '</small></span></div>' +
        '<p class="acc-label" id="acc-loc">Locations</p>' +
        '<div role="radiogroup" aria-labelledby="acc-loc" class="acc-locs" data-select="manual">' + rows.map(function (r) {
          var on = SE.state.location === r.id;
          return '<button type="button" role="radio" class="acc-loc" aria-checked="' + on + '" data-loc="' + r.id + '">' + icon(r.id === 'all' ? 'apps' : 'marker') +
            '<span><b>' + esc(r.name) + '</b><small>' + esc(r.sub) + '</small></span>' + icon('check', 'tick') + '</button>';
        }).join('') + '</div>' +
        appearance() +
        (SE.mkt ? '<button type="button" class="acc-out acc-new" data-whatsnew>' + icon('star') + 'What’s new</button>' : '') +
        '<button type="button" class="acc-out" data-signout>' + icon('sign-out-alt') + 'Sign out</button>';
      window.ARATheme.bind(account.querySelector('.acc-theme'));
      var r = btn.getBoundingClientRect(), host = shell.getBoundingClientRect();
      account.style.top = (r.bottom - host.top + 8) + 'px';
      account.style.right = Math.max(16, host.right - r.right) + 'px';
      account.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      SE.animate(account, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 160 });
      var cur = account.querySelector('[aria-checked="true"]'); if (cur && !SE.capture) cur.focus();
    }
    // Appearance: System, Light, Dark; shared theme.js applies and saves the choice, the popover stays open
    function appearance() {
      var T = window.ARATheme;
      return '<p class="acc-label" id="acc-appearance">Appearance</p>' +
        '<div class="acc-theme" role="radiogroup" aria-labelledby="acc-appearance">' + T.prefs.map(function (p) {
          var on = T.pref() === p;
          return '<button type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-theme-pref="' + p + '">' + T.labels[p] + '</button>';
        }).join('') + '</div>';
    }
    function closeAccount(focusBack) {
      if (account.hidden) return;
      account.hidden = true;
      if (accBtn) { accBtn.setAttribute('aria-expanded', 'false'); if (focusBack) accBtn.focus(); }
    }
    api.openAccount = function () { openAccount(el.querySelector(mode() === 'drawer' ? '.appbar [data-account]' : '.quickbar [data-account]')); };

    api.refresh = function () {
      el.querySelectorAll('[data-count]').forEach(function (b) { var n = count(b.dataset.count); b.textContent = n || ''; b.hidden = !n; });
el.querySelectorAll('[data-qa="notes"]').forEach(function (b) { var n = SE.unread(); b.hidden = !n; b.parentNode.setAttribute('aria-label', 'Notifications, ' + n + ' unread'); });
    };
    SE.refreshShell = api.refresh;

    // ---------- events
    el.addEventListener('click', function (e) {
      var t = e.target.closest('button, a, [data-go]');
      if (!account.hidden && !e.target.closest('#account') && !(t && t.hasAttribute('data-account'))) closeAccount(false);
      if (!t) return;
      if (t.closest('.rail') && mode() === 'drawer' && t.matches('a')) closeDrawer(true);
      if (t.hasAttribute('data-account')) { if (account.hidden) openAccount(t); else closeAccount(true); return; }
      if (t.dataset.loc) {
        SE.setLocation(t.dataset.loc);
        account.querySelectorAll('.acc-loc').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
        SE.toast('Showing ' + SE.location().name, 'marker');
        if (o.onLocation) o.onLocation();
        setTimeout(function () { closeAccount(true); }, 160);
        return;
      }
      if (t.hasAttribute('data-signout')) { closeAccount(false); SE.confirmSignOut(); return; }
      if (t.hasAttribute('data-ann-x')) { SE.mkt.dismiss(t); return; }
      if (t.hasAttribute('data-whatsnew')) { closeAccount(false); if (SE.mkt) SE.mkt.whatsNew(); return; }
      if (t.hasAttribute('data-voice')) { e.preventDefault(); SE.voice.start(); return; }
      if (t.dataset.out) { SE.toast(t.dataset.out + ' is coming soon', 'time-past'); return; }
      if (t.dataset.go && !e.defaultPrevented) { e.preventDefault(); SE.goFrom(t); }
    });
    el.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-search]');
      if (!f) return;
      e.preventDefault();
      var q = f.querySelector('input').value.trim();
      SE.go('search', { params: q ? { q: q } : {} });
    });
    // search box suggestions (js/views/search.js adds SE.searchBox; without it the form just submits)
    var detachBox = [];
    el.querySelectorAll('[data-search]').forEach(function (f) { if (SE.searchBox) detachBox.push(SE.searchBox(f)); });
    function onKey(e) {
      var typing = /input|textarea|select/i.test(document.activeElement.tagName);
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        var q = el.querySelector('#q');
        if (q) { e.preventDefault(); q.focus(); q.select(); }
        return;
      }
      if (e.key === 'Escape') { if (!account.hidden) closeAccount(true); else if (shell.classList.contains('drawer-open')) closeDrawer(); }
    }
    document.addEventListener('keydown', onKey);
    applyRail();

    api.cleanup = function () {
      document.removeEventListener('keydown', onKey);
      mqWide.removeEventListener('change', applyRail); mqDesk.removeEventListener('change', applyRail);
      detachBox.forEach(function (f) { if (typeof f === 'function') f(); });
      if (SE.refreshShell === api.refresh) SE.refreshShell = null;
    };
    return api;
  };
})();
