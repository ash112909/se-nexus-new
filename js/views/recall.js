/* Recall impact (1017, V3 emergency recall response), web: from 1 asset to the fleet segment. Same rules as the
   iPhone (shared/ops.js): the recall's lot is queried across every unit of the recalled model; units with the lot
   fitted are replaced, units with no lot recorded are checked, other lots are clear; a unit whose open work order
   already carries the part is covered. Main column: the query, 3 counts, the remediation table with a checkbox per
   unit, the clear units. Aside: what will be created and Create work orders (1 per unit, in 1 action). Afterwards
   the page lists what was scheduled.
   State: #/recall?id=nb-recall-103322   #/recall?id=nb-recall-103322&done=1 (remediation already created) */
SE.titles.recall = 'Knowledge Base';
SE.views.recall = function (el, p) {
  var UI = SE.ui, esc = SE.esc, icon = SE.icon, O = SE.ops, crumbs = [['Home', 'home'], ['Knowledge Base', 'kb']];
  if (p.done && !O.done(p.id)) O.remediate(p.id);
  var im = O.impact(p.id);
  if (!im) {
    var s0 = SE.shell(el, { nav: 'kb', title: 'Recall not found', crumbs: crumbs,
      body: UI.empty({ icon: 'document', tone: 'neutral', title: 'Recall not found', text: 'It may have been withdrawn, or the link is out of date.', action: '<a class="btn btn-secondary" href="#/kb">Knowledge Base</a>' }) });
    return s0.cleanup;
  }
  var n = im.item, m = SE.machine(n.machine), sel = {}, busy = false;
  crumbs.push([n.title.replace(/^Part recall: /, ''), 'article?id=' + n.id]);
  im.todo.forEach(function (r) { sel[r.equip] = true; });

  function what(r) { return r.status === 'affected' ? 'Replace the valve' : r.status === 'unknown' ? 'Check the valve lot' : 'Not affected'; }
  function lotChip(r) { return SE.chip(r.status === 'affected' ? 'Lot ' + r.lot : r.status === 'unknown' ? 'Not recorded' : 'Lot ' + r.lot, r.status === 'affected' ? 'danger' : r.status === 'unknown' ? 'warning' : 'neutral'); }
  function table(rows, pick) {
    return UI.table([[pick ? 'Include' : 'Status'], ['Unit'], ['Branch'], ['Fitted lot'], ['Action']], rows.map(function (r) {
      var a = r.asset;
      var c = r.todo && pick ? '<label class="lv-check"><input type="checkbox" data-pick="' + esc(r.equip) + '"' + (sel[r.equip] ? ' checked' : '') + ' aria-label="Include ' + esc(r.equip) + '"><span class="ck">' + icon('check') + '</span></label>'
        : '<span class="ri-lead" aria-hidden="true">' + icon(r.wo ? 'check' : 'shield-check') + '</span>';
      return [c, '<a href="#/asset?id=' + encodeURIComponent(a.equip) + '"><b>' + esc(a.equip) + '</b></a><span class="sub">' + esc(a.serial) + '</span>', esc(a.location), lotChip(r),
        r.wo ? 'Covered by <a href="#/work-order?id=' + r.wo.id + '" class="ri-wo">#' + esc(r.wo.id) + '</a>' : esc(what(r))];
    }), { cls: 'ri-tbl' });
  }
  function main() {
    var done = O.done(n.id), act = im.rows.filter(function (r) { return r.status !== 'clear'; }), clear = im.rows.filter(function (r) { return r.status === 'clear'; });
    var h = '<section class="card ri-q"><p class="ri-query">' + icon('search') + '<span>Searched <b>' + im.rows.length + ' ' + esc(m.name) + '</b> units for the lot of the fitted ' + esc(im.part.name.toLowerCase()) + ' ' + esc(im.part.pn) + '. Notice ' + esc(n.date) + '.</span></p>' +
      '<div class="ri-stats" role="list"><div class="ri-stat t-danger" role="listitem"><b>' + im.affected + '</b><span>Lot ' + esc(n.lot) + ' fitted</span></div>' +
      '<div class="ri-stat t-warning" role="listitem"><b>' + im.unknown + '</b><span>No lot recorded</span></div>' +
      '<div class="ri-stat t-neutral" role="listitem"><b>' + im.clear + '</b><span>Other lots</span></div></div></section>';
    if (done) {
      var made = done.wos.map(SE.wo).filter(Boolean);
      h += UI.sec('Scheduled', '<span class="muted">' + made.length + ' work order' + (made.length === 1 ? '' : 's') + '</span>', UI.table([['Work order'], ['Unit'], ['Work'], ['Assignee'], ['Due']], made.map(function (w) {
        return ['<b>#' + esc(w.id) + '</b>', esc(w.equip), esc(w.issue.replace(/^Recall: /, '')), esc(w.assignee), esc(w.due)];
      }), { cls: 'ri-tbl', rowAttrs: function (i) { return 'data-go="work-order" data-id="' + made[i].id + '"'; } }), 'h-ri-done');
      var cov = act.filter(function (r) { return r.wo && r.wo.recall !== n.id; });
      if (cov.length) h += UI.sec('Already covered', '', table(cov, false), 'h-ri-cov');
    } else {
      var k = im.todo.filter(function (r) { return sel[r.equip]; }).length;
      h += UI.sec('Remediation list', '<span class="muted">' + k + ' of ' + im.todo.length + ' selected</span>', table(act, true), 'h-ri-list');
    }
    return h + UI.sec('Not affected', '', table(clear, false), 'h-ri-clear');
  }
  function aside() {
    var done = O.done(n.id);
    if (done) {
      var made = done.wos.map(SE.wo).filter(Boolean), rep = made.filter(function (w) { return w.parts && w.parts.length; });
      return '<h2 class="oc-aside-h">Remediation</h2>' + UI.banner('<b>' + made.length + ' work order' + (made.length === 1 ? '' : 's') + ' scheduled ' + (done.on === SE.tx.iso(SE.tx.today()) ? 'today' : SE.tx.short(done.on)) + ', ' + O.lagText(n.id) + '.</b>', 'success', 'check') +
        UI.kv([['Replacements', rep.length + (rep.length ? ', due ' + esc(rep[0].due) : '')], ['Lot checks', (made.length - rep.length) + (made.length > rep.length ? ', due ' + esc(made.filter(function (w) { return !(w.parts && w.parts.length); })[0].due) : '')], ['Covered already', String(im.covered - made.length)]]) +
        '<a class="btn btn-primary oc-cta" href="#/work-orders">View work orders' + icon('arrow-small-right') + '</a>';
    }
    var pick = im.todo.filter(function (r) { return sel[r.equip]; }), rep2 = pick.filter(function (r) { return r.status === 'affected'; }).length;
    return '<h2 class="oc-aside-h">Create work orders</h2>' +
      UI.kv([['Replace the valve', String(rep2)], ['Check the valve lot', String(pick.length - rep2)], ['Covered already', String(im.covered)]]) +
      '<button type="button" class="btn btn-primary oc-cta" data-remediate' + (pick.length ? '' : ' disabled') + '>' + icon('clipboard-list') + 'Create ' + pick.length + ' work order' + (pick.length === 1 ? '' : 's') + '</button>' +
      '<p class="oc-note">1 work order per unit at its branch: replacements due in 2 business days, lot checks in 5. A unit with an open work order for this part is left as it is.</p>';
  }
  var s = SE.shell(el, { nav: 'kb', title: 'Fleet impact: ' + im.part.name + ', lot ' + n.lot, crumbs: crumbs, sub: esc('Recall · ' + m.name + ' · ' + im.part.pn),
    body: '<div class="oc-grid ri-grid"><div class="oc-main" id="ri-main"></div><aside class="card oc-aside" id="ri-aside" aria-label="Remediation"></aside></div>' });
  var mainEl = el.querySelector('#ri-main'), asideEl = el.querySelector('#ri-aside');
  function render() { im = O.impact(n.id); mainEl.innerHTML = main(); asideEl.innerHTML = aside(); }
  el.addEventListener('change', function (e) { var t = e.target; if (t.dataset.pick) { sel[t.dataset.pick] = t.checked; render(); var f = el.querySelector('[data-pick="' + t.dataset.pick + '"]'); if (f && !SE.capture) f.focus(); } });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled || !t.hasAttribute('data-remediate') || busy) return;
    busy = true;
    var made = O.remediate(n.id, Object.keys(sel).filter(function (k) { return sel[k]; }));
    SE.toast(made.length + ' work order' + (made.length === 1 ? '' : 's') + ' created', 'check');
    render(); s.refresh(); busy = false;
  });
  render();
  return s.cleanup;
};
