/* Knowledge Base item (B7; legacy web 60 news article, legacy mobile 58; DES-26), web: a recall, a service
   bulletin, a supplier notice or a how-to article. Main column: kind, machine and date, title, summary, body
   or numbered steps. Side column:
     recall      the affected units of your fleet (each opens the asset) and the part to replace
     bulletin    the units to inspect, the part, and the bulletin PDF (manual viewer)
     notice      text only
     article     the parts it uses (each opens the part card), the manual page
   1017 value walkthroughs (as on the iPhone):
     V1  opened for a work order (&wo=): a "For work order" strip; a step that uses a part deep-links to the catalog
         search filtered to that unit (SE.ops.findFor)
     V3  a recall shows what the fleet query found and opens the impact page (#/recall), or what was done
   State: #/article?id=kb-cylinder-drift   #/article?id=nb-recall-103322   #/article?id=kb-fault-42&wo=100118 */
SE.titles.article = 'Knowledge Base';
SE.views.article = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var news = D.news.find(function (n) { return n.id === p.id; });
  var art = D.kb.find(function (a) { return a.id === p.id; });
  var x = news || art, crumbs = [['Home', 'home'], ['Knowledge Base', 'kb']];
  if (!x) {
    var s0 = SE.shell(el, { nav: 'kb', title: 'Item not found', crumbs: crumbs,
      body: UI.empty({ icon: 'document', tone: 'neutral', title: 'Item not found', text: 'It may have been withdrawn, or the link is out of date.', action: '<a class="btn btn-secondary" href="#/kb">Knowledge Base</a>' }) });
    return s0.cleanup;
  }
  var kind = news ? news.kind : 'Article';
  var TONE = { Recall: 'danger', Bulletin: 'warning', Notice: 'neutral', Article: 'info' };
  var m = x.machine ? SE.machine(x.machine) : null;
  var units = (x.units || []).map(SE.asset).filter(Boolean);
  var parts = (x.parts || []).map(SE.part).filter(Boolean);
  var O = SE.ops, wo = p.wo ? SE.wo(p.wo) : null, im = kind === 'Recall' ? O.impact(x.id) : null, done = im && O.done(x.id);
  function recallBox() {
    if (done) return UI.banner('<b>' + done.wos.length + ' work order' + (done.wos.length === 1 ? '' : 's') + ' created ' + (done.on === SE.tx.iso(SE.tx.today()) ? 'today' : SE.tx.short(done.on)) + '.</b> Every unit with lot ' + esc(x.lot) + ' or an unrecorded lot is scheduled. <a href="#/recall?id=' + x.id + '">View the remediation</a>', 'success', 'check');
    return UI.banner('<b>' + im.affected + ' of your units ' + (im.affected === 1 ? 'has' : 'have') + ' lot ' + esc(x.lot) + ' fitted' + (im.unknown ? '; ' + im.unknown + ' ' + (im.unknown === 1 ? 'has' : 'have') + ' no lot recorded' : '') + '.</b> Replace lot ' + esc(x.lot) + ' valves at no charge.', 'danger', 'exclamation') +
      '<p class="ar-act"><a class="btn btn-primary ar-check" href="#/recall?id=' + x.id + '" data-go="recall" data-id="' + x.id + '">' + icon('search') + 'Check the fleet for lot ' + esc(x.lot) + '</a></p>';
  }

  var main = '<article class="card ar-main"><div class="ar-top">' + SE.chip(kind, TONE[kind]) + '<span>' + esc([m ? m.name : '', news ? news.date : art.topic + ' · ' + art.minutes + ' min read'].filter(Boolean).join(' · ')) + '</span></div>' +
    '<p class="ar-lede">' + esc(x.summary) + '</p>' +
    (wo ? '<p class="ar-for">' + icon('marker') + '<span>For work order <a href="#/work-order?id=' + wo.id + '"><b>#' + esc(wo.id) + '</b></a> · ' + esc(wo.equip) + ' · ' + esc(wo.issue) + '</span></p>' : '') +
    (news && kind === 'Recall' ? recallBox() : '') +
    (news ? '<div class="ar-body">' + news.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' : '') +
    (art ? '<h2 class="od-h">Steps</h2><ol class="ar-steps">' + art.steps.map(function (st, i) {
      var sp = O.stepPart(art, i);
      return '<li><span class="ar-n">' + (i + 1) + '</span><div class="ar-st"><p>' + esc(st) + '</p>' + (sp ? '<div class="ar-uses"><span class="muted">Uses ' + esc(sp.name) + ' · ' + esc(sp.pn) + '</span>' +
        '<button type="button" class="btn btn-secondary ar-find" data-find="' + esc(sp.pn) + '">' + icon('search') + (wo ? 'Find for ' + esc(wo.equip) : 'Find this part') + '</button></div>' : '') + '</div></li>';
    }).join('') + '</ol>' : '') +
  '</article>';

  var side = '';
  if (units.length) side += '<section class="card"><h2 class="od-h">' + (kind === 'Recall' ? 'Units to act on' : 'Units to inspect') + '</h2><ul class="ar-links">' + units.map(function (a) {
    return '<li><a href="#/asset?id=' + encodeURIComponent(a.equip) + '">' + UI.thumb() + '<span><b>' + esc(a.equip) + ' · ' + esc(a.machine) + '</b><small>' + esc(a.serial) + ' · ' + esc(a.location) + '</small></span>' + SE.chip(a.status) + '</a></li>';
  }).join('') + '</ul></section>';
  if (parts.length) side += '<section class="card"><h2 class="od-h">' + (art ? 'Parts this uses' : 'Part') + '</h2><ul class="ar-links">' + parts.map(function (pt) {
    return '<li><a href="#/part?pn=' + encodeURIComponent(pt.pn) + '">' + UI.thumb() + '<span><b>' + esc(pt.name) + '</b><small>' + esc(pt.pn) + ' · ' + esc(SE.supplierOf(pt.pn).name) + '</small></span><b class="ar-price">' + SE.money(pt.price) + '</b></a></li>';
  }).join('') + '</ul></section>';
  var man = news && news.manual ? [news.manual, 1] : art && art.manual;
  if (man) {
    var doc = D.manuals.find(function (d) { return d.id === man[0]; });
    side += '<section class="card"><h2 class="od-h">' + (news ? 'Bulletin' : 'Manual') + '</h2><ul class="ar-links"><li><a href="#/manual?id=' + doc.id + '&page=' + man[1] + '"><span class="sym">' + icon('book-alt') + '</span><span><b>' + esc(doc.title) + '</b><small>Opens at page ' + man[1] + '</small></span>' + icon('angle-small-right') + '</a></li></ul></section>';
  }
  var s = SE.shell(el, { nav: 'kb', title: x.title, crumbs: crumbs, sub: esc(kind + (m ? ' · ' + m.name : '')),
    body: '<div class="od-grid ar-grid">' + main + (side ? '<div class="od-side">' + side + '</div>' : '') + '</div>' });
  el.addEventListener('click', function (e) {
    var f = e.target.closest('[data-find]');
    if (!f) return;
    O.findFor(wo && wo.id);
    SE.go('search', { params: { q: f.dataset.find } });
  });
  return s.cleanup;
};
