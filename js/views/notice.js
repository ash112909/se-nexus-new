/* Notice (B6; legacy web 11 notification detail, legacy mobile 65 milestone and 66 visit), web. A
   notification that is about no record of its own opens this page: kicker, image slot (hatched placeholder,
   no invented photo), title, lede, body and facts. A visit adds "Add to Calendar", which confirms with a toast
   and turns into "Added to Calendar". Notifications about a record (order, approval, bulletin) keep opening
   that record.
   State: #/notice?id=n7 (milestone)   #/notice?id=n8 (visit) */
SE.titles.notice = 'Notice';
SE.views.notice = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var n = D.notifications.find(function (x) { return x.id === p.id && x.detail; });
  var crumbs = [['Home', 'home'], ['Notifications', 'notifications']];
  if (!n) {
    var s0 = SE.shell(el, { nav: 'notifications', title: 'Notice not found', crumbs: crumbs,
      body: UI.empty({ icon: 'bell', tone: 'neutral', title: 'Notice not found', text: 'It may have expired.', action: '<a class="btn btn-secondary" href="#/notifications">Notifications</a>' }) });
    return s0.cleanup;
  }
  var d = n.detail, added = !!SE.state.calendar[n.id];
  SE.state.read[n.id] = true; SE.save();
  function calBtn() {
    return d.calendar ? '<button class="btn ' + (added ? 'btn-secondary' : 'btn-primary') + '" type="button" data-cal' + '' + '>' + icon(added ? 'check' : 'calendar') + (added ? 'Calendar file downloaded' : 'Download calendar event') + '</button>' : '';
  }
  var s = SE.shell(el, {
    nav: 'notifications', title: d.title, crumbs: crumbs, sub: esc(d.kicker + ' · ' + n.time),
    actions: '<span id="nc-act">' + calBtn() + '</span>',
    body: '<div class="od-grid nc-grid"><article class="card ar-main">' +
        '<p class="nc-kicker"><span class="note-mark ' + (n.tone === 'neutral' ? 'success' : n.tone) + '">' + icon(n.icon) + '</span>' + esc(d.kicker) + '</p>' +
        '<p class="ar-lede">' + esc(d.lede) + '</p><div class="ar-body">' + d.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div></article>' +
      '<div class="od-side"><section class="card"><h2 class="od-h">Details</h2>' + UI.kv(d.facts.map(function (f) { return [f[0], esc(f[1])]; })) + '</section></div></div>',
  });
  s.refresh();
  el.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cal]');
    if (!t || t.disabled) return;
    try { SE.tx.calendar(n); } catch (err) { SE.toast(err.message, 'exclamation'); return; }
    SE.state.calendar[n.id] = true; SE.save();
    added = true;
    el.querySelector('#nc-act').innerHTML = calBtn();
    SE.toast('Calendar file downloaded. Open it to add the event', 'calendar');
  });
  return s.cleanup;
};
