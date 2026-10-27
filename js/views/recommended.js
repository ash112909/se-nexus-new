/* Recommended parts (B2; legacy web 63, legacy mobile 60 high, 61 medium, 62 part detail), web. Parts the
   fleet is likely to need soon, from its own records (service due, reported faults, hours, what is often
   ordered together), never from a model. Priority filter (All, High, Medium, Low) with counts; each card
   says why, names the units, opens the part card (with a breadcrumb back here) and adds 1 per unit to the cart.
   State: #/recommended   #/recommended?priority=Medium */
SE.titles.recommended = 'Recommended parts';
SE.views.recommended = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var PRI = ['All', 'High', 'Medium', 'Low'];
  var TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' };
  var pri = PRI.indexOf(p.priority) >= 0 ? p.priority : 'All';
  function list(f) { return D.recommended.filter(function (r) { return f === 'All' || r.priority === f; }); }
  function seg() { return UI.seg('Priority', PRI.map(function (f) { return [f, f, list(f).length]; }), pri); }
  function card(r) {
    var pt = SE.part(r.pn), n = Math.max(1, r.units.length);
    return '<li class="card rc-card">' +
      '<a class="rc-main" href="#/part?pn=' + encodeURIComponent(pt.pn) + '&from=Recommended">' + UI.thumb() +
        '<span class="rc-t">' + SE.chip(r.priority, TONE[r.priority]) + '<b>' + esc(pt.name) + '</b><small>' + esc(pt.pn) + ' · ' + esc(SE.supplierOf(pt.pn).name) + '</small></span>' +
        '<span class="rc-end"><b>' + SE.money(pt.price) + '</b>' + UI.stock(pt) + '</span></a>' +
      '<p class="rc-why">' + icon('info') + '<span>' + esc(r.reason) + (r.units.length ? ' <b>' + esc(r.units.join(', ')) + '</b>' : '') + '</span></p>' +
      '<div class="rc-acts"><a class="btn btn-secondary" href="#/part?pn=' + encodeURIComponent(pt.pn) + '&from=Recommended">View</a>' +
        '<button class="btn btn-brand" type="button" data-add="' + pt.pn + '" data-qty="' + n + '">' + icon('plus-small') + 'Add ' + n + '</button></div></li>';
  }
  function body() {
    var l = list(pri);
    if (!l.length) return UI.empty({ icon: 'check', title: 'Nothing at this priority', text: 'Your fleet has no ' + pri.toLowerCase() + ' priority recommendations right now.', action: '<button type="button" class="btn btn-secondary" data-seg="All">Show all</button>' });
    return '<ul class="rc-grid">' + l.map(card).join('') + '</ul>';
  }
  var s = SE.shell(el, {
    nav: 'recommended', title: 'Recommended parts', crumbs: [['Home', 'home']],
    sub: 'From your fleet records: service due, reported faults, hours and parts ordered together.',
    body: '<section class="sec rc" aria-label="Recommended parts"><div class="nf-bar"><div id="rc-seg">' + seg() + '</div></div><div id="rc-body">' + body() + '</div></section>',
  });
  function render() {
    el.querySelector('#rc-seg').innerHTML = seg();
    el.querySelector('#rc-body').innerHTML = body();
    history.replaceState(null, '', '#/recommended' + (pri === 'All' ? '' : '?priority=' + pri));
  }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.seg && PRI.indexOf(t.dataset.seg) >= 0) { pri = t.dataset.seg; render(); return; }
    if (t.dataset.add) {
      var q = +t.dataset.qty, pt = SE.part(t.dataset.add);
      SE.addToCart(pt.pn, q);
      SE.toast(q + ' x ' + pt.name + ' added to cart', 'shopping-cart');
      t.disabled = true; t.innerHTML = icon('check') + 'Added';
    }
  });
  return s.cleanup;
};
