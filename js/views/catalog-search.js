/* Catalog keyword search results (catalog-search view).
   Shows parts matching a keyword, optionally filtered to one supplier.
   #/catalog-search?q=&sup=JLG   &wo=100118 */
SE.titles['catalog-search'] = 'Parts search';
SE.views['catalog-search'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui, C = SE.cat;
  var q = (p.q || '').trim(), wo = p.wo || null;
  var sup = p.sup ? SE.supplier(p.sup) : null;

  // Sync the query from the URL so the sidebar search bar stays populated.
  // Don't override mode — SE.catMode manages that and re-renders this page.
  if (q) C.search.query = q;

  // filter parts by supplier (if given) and keyword
  var ql = q.toLowerCase();
  var results = D.parts.filter(function (x) {
    if (sup && SE.supplierOf(x.pn).id !== sup.id) return false;
    return x.pn.toLowerCase().indexOf(ql) >= 0 ||
           x.name.toLowerCase().indexOf(ql) >= 0 ||
           (x.desc && x.desc.toLowerCase().indexOf(ql) >= 0);
  });

  var unit = C.unit(wo);

  function rows(list) {
    return list.map(function (x) {
      return '<tr data-row data-pn="' + esc(x.pn) + '" tabindex="0" aria-selected="false">' +
        '<td class="cell-pn"><span class="pn-link">' + esc(x.pn) + '</span><span class="pn-name">' + esc(x.name) + '</span></td>' +
        '<td class="q-cell">' + C.quickBtn(x, unit) + '</td>' +
        '</tr>';
    }).join('');
  }

  var bodyHtml;
  if (!q) {
    bodyHtml = UI.empty({ icon: 'search', title: 'Enter a search term', text: 'Type a part name or number in the search bar above.' });
  } else if (!results.length) {
    bodyHtml = UI.empty({ icon: 'search', title: 'No parts found', text: 'No parts matched "' + esc(q) + '"' + (sup ? ' in ' + esc(sup.name) : '') + '.' });
  } else {
    bodyHtml = '<div class="tbl-wrap"><table class="tbl cat-tbl"><thead><tr>' +
      '<th scope="col">Part</th><th scope="col" aria-label="Add to cart"></th>' +
      '</tr></thead><tbody>' + rows(results) + '</tbody></table></div>';
  }

  var title = q ? ('"' + q + '"' + (sup ? ' · ' + sup.name : '')) : 'Parts search';
  var sub = results.length ? results.length + ' result' + (results.length === 1 ? '' : 's') : '';
  var crumbs = [['Parts catalog', 'catalog']];
  if (sup) crumbs.push([sup.name, 'supplier?sup=' + sup.id + C.woQ(wo)]);

  var cur = sup ? { sup: sup.id } : {};
  var sh = SE.shell(el, {
    nav: 'catalog', title: title, wide: true, crumbs: crumbs,
    sub: sub,
    body: C.layout(cur, wo, bodyHtml),
  });

  // row click → open part panel via navigate
  function onClick(e) {
    var row = e.target.closest('[data-row]');
    if (!row) return;
    var pn = row.dataset.pn;
    if (!pn) return;
    var t = e.target.closest('button[data-quick]');
    if (t) { C.quickAdd(t.dataset.quick, wo); return; }
    SE.go('part', { params: wo ? { pn: pn, wo: wo } : { pn: pn } });
  }
  el.addEventListener('click', onClick);

  return function () {
    el.removeEventListener('click', onClick);
    sh.cleanup();
  };
};
