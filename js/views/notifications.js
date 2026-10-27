/* Notifications page (B6, legacy web 10 and 11). Segmented filter with counts, rows in the Home
   notification style (tinted icon, title, sub, time, unread dot). A row marks itself read and opens
   what it is about (n.go); Mark all read; the shell bell badge follows. News (notices: a milestone, a team
   visit) are about no record and open their own page (notice).
   State: #/notifications?filter=all|unread|approval|order|bulletin|notice */
SE.titles.notifications = 'Notifications';
SE.views.notifications = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon;
  var FILTERS = [['all', 'All'], ['unread', 'Unread'], ['approval', 'Approvals'], ['order', 'Orders'], ['bulletin', 'Bulletins'], ['notice', 'News']];
  var filter = FILTERS.some(function (f) { return f[0] === p.filter; }) ? p.filter : 'all';
  function isUnread(n) { return n.unread && !SE.state.read[n.id]; }
  function match(n, f) { return f === 'all' ? true : f === 'unread' ? isUnread(n) : n.kind === f; }
  function sub() { var u = SE.unread(); return u ? u + ' unread' : 'All caught up'; }
  function seg() { return SE.ui.seg('Filter notifications', FILTERS.map(function (f) { return [f[0], f[1], D.notifications.filter(function (n) { return match(n, f[0]); }).length]; }), filter); }
  function row(n) {
    var u = isUnread(n), tone = n.tone === 'neutral' ? 'success' : n.tone;
    return '<li><button type="button" class="note nf-note' + (u ? ' unread' : '') + '" data-note="' + n.id + '"><span class="note-mark ' + tone + '">' + icon(n.icon) + '</span>' +
      '<span class="note-text"><b>' + esc(n.title) + '</b><span>' + esc(n.sub) + '</span></span>' +
      '<time>' + esc(n.time) + '</time><span class="note-dot ' + tone + '" role="img" aria-label="' + (u ? 'Unread' : 'Read') + '"></span></button></li>';
  }
  function list() {
    var items = D.notifications.filter(function (n) { return match(n, filter); });
    if (!items.length) return filter === 'unread'
      ? SE.ui.empty({ icon: 'check', title: 'All caught up', text: 'You have read every notification.', action: '<button type="button" class="btn btn-card nf-show" data-seg="all">Show all</button>' })
      : SE.ui.empty({ icon: 'bell', tone: 'neutral', title: 'Nothing here yet', text: 'New items of this kind will show up here.' });
    return '<ul class="notes">' + items.map(row).join('') + '</ul>';
  }
  var s = SE.shell(el, {
    nav: 'notifications', title: 'Notifications', sub: esc(sub()), crumbs: [['Home', 'home']],
    body: '<section class="sec nf" aria-label="Notifications">' +
      '<div class="nf-bar"><div id="nf-seg">' + seg() + '</div><button type="button" class="sec-action nf-mark" data-markall>' + icon('check') + 'Mark all read</button></div>' +
      '<div id="nf-list">' + list() + '</div></section>',
  });
  function render() {
    el.querySelector('#nf-seg').innerHTML = seg();
    el.querySelector('#nf-list').innerHTML = list();
    el.querySelector('[data-markall]').disabled = !SE.unread();
    var sl = el.querySelector('#subline'); if (sl) sl.textContent = sub();
    s.refresh();
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.dataset.go) return;
    if (t.dataset.seg) {
      filter = t.dataset.seg;
      history.replaceState(null, '', '#/notifications' + (filter === 'all' ? '' : '?filter=' + filter));
      render();
      var sel = el.querySelector('#nf-seg [aria-selected="true"]'); if (sel && !SE.capture) sel.focus();
      return;
    }
    if (t.hasAttribute('data-markall')) {
      D.notifications.forEach(function (n) { SE.state.read[n.id] = true; });
      SE.save(); render();
      SE.toast('All notifications marked read', 'check');
      return;
    }
    if (t.dataset.note) {
      var n = D.notifications.find(function (x) { return x.id === t.dataset.note; });
      SE.state.read[n.id] = true; SE.save(); s.refresh();
      var parts = n.go.split('?'), params = {};
      new URLSearchParams(parts[1] || '').forEach(function (v, k) { params[k] = v; });
      SE.go(parts[0], { params: params });
    }
  });
  el.querySelector('[data-markall]').disabled = !SE.unread();
  return s.cleanup;
};
