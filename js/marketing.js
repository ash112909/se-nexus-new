/* web-full marketing kit (branch M). Copy comes from SE.data.marketing (_src/seed.json); art is type and brand
   colour, never a photo. Every carousel is SE.ui.carousel (js/kit.js). Builders return html; SE.mkt.bind(root)
   wires the carousels and the buttons inside root and returns a cleanup.
     M1 hero(o)          Updates carousel on Home: recall, new search, shopping lists, team visit; autoplay 7 s
     M2 announce()       the site announcement bar above every page head (a recall); dismissed for the session
     (M3, the sign-in highlights carousel, was removed 2026-10-14: no carousel before Home; the sign-in brand panel
      is part of js/views/sign-in.js)
     M4 whatsNew()       the What's new tour (3 slides) in a dialog: after the first sign in, and from the
                         account menu; Back, Next, Done; remembers it was seen
     M5 recommendedRow() Recommended for your fleet (Home); together(part) Related catalog parts (part page)
     M6 suppliers()      the supplier network: 2 connected, 6 to request (Request connection, then Requested)
     M7 early()          Diagnostics early access (Join, then "You are on the early access list")
     M8 featured()       Featured in the Knowledge Base (carousel on the Knowledge Base page)
   State: #/home?whatsnew=1 (the tour open)   SE.state.mkt { dismissed, whatsNew, early, requested } */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var M = function () { return SE.data.marketing; };
  var mkt = SE.mkt = {};
  function href(r) { return '#/' + r; }

  // ---------- M2 announcement bar
  mkt.announce = function () {
    var a = M().announce;
    if (!a || SE.state.mkt.dismissed[a.id]) return '';
    return '<div class="ann t-' + a.tone + '" role="region" aria-label="Announcement" data-ann="' + a.id + '">' + icon(a.icon) +
      '<p>' + esc(a.text) + ' <a href="' + href(a.link[1]) + '">' + esc(a.link[0]) + '</a></p>' +
      '<button type="button" class="ann-x" data-ann-x aria-label="Dismiss the announcement">' + icon('cross-small') + '</button></div>';
  };
  mkt.dismiss = function (btn) {
    var bar = btn.closest('[data-ann]');
    SE.state.mkt.dismissed[bar.dataset.ann] = true; SE.save();
    SE.animate(bar, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).then(function () { bar.remove(); });
    var h = document.querySelector('#app .route:not([inert]) [data-focus]'); if (h && !SE.capture) h.focus();
  };

  // ---------- M1 hero
  mkt.hero = function () {
    return '<section class="sec" aria-labelledby="h-upd"><div class="sec-head"><h2 id="h-upd">Updates for your fleet</h2><a class="sec-action" href="#/kb">Knowledge Base' + icon('arrow-small-right') + '</a></div>' +
      UI.carousel({ id: 'mk-hero', label: 'Updates for your fleet', cls: 'crsl-1', auto: 7000, slides: M().hero.map(function (h) {
      // 1021 (owner's reference slide): each slide's photo (seed img, an inline background-image so it resolves against the page) under the reference gradient, a short headline,
      // 1 line of copy and a large yellow button; nothing in the top-right corner (the kicker is the slide's label)
      return '<article class="hero" style="background-image: url(img/' + esc(h.img || 'hero-site.webp') + ')" aria-label="' + esc(h.kicker) + '">' +
        '<div class="hero-copy"><h3>' + esc(h.title) + '</h3><p>' + esc(h.text) + '</p>' +
        // the app slide (owner's reference): Download beside a scannable code for the phone (seed qr: [image, its URL])
        '<div class="hero-act">' + (h.cta[1] === 'download' ? '<button type="button" class="btn btn-primary" data-mk-dl>' + esc(h.cta[0]) + '</button>'
          : '<a class="btn btn-primary" href="' + href(h.cta[1]) + '">' + esc(h.cta[0]) + icon('arrow-small-right') + '</a>') +
        (h.qr ? '<img class="hero-qr" src="' + esc(h.qr[0]) + '" width="64" height="64" alt="QR code: ' + esc(h.qr[1]) + '">' : '') + '</div></div></article>';
    }) }) + '</section>';
  };

  // ---------- M5 part carousels
  function partCard(pt, extra) {
    return '<article class="mk-part card"><a class="mk-part-a" href="#/part?pn=' + encodeURIComponent(pt.pn) + (extra && extra.from ? '&from=' + extra.from : '') + '">' + UI.thumb() +
      '<span>' + (extra && extra.chip ? extra.chip : '') + '<b>' + esc(pt.name) + '</b><small>' + esc(pt.pn) + ' · ' + esc(SE.supplierOf(pt.pn).name) + '</small></span></a>' +
      (extra && extra.why ? '<p class="mk-why">' + esc(extra.why) + '</p>' : '') +
      '<div class="mk-part-f"><b>' + (SE.priceVisible(pt) ? SE.money(pt.price) : 'Price needs a serial') + '</b>' +
      (SE.priceVisible(pt) && pt.stock !== 'Superseded' ? '<button type="button" class="btn btn-secondary mk-add" data-mk-add="' + pt.pn + '" data-qty="' + ((extra && extra.qty) || 1) + '" aria-label="Add ' + esc(pt.name) + ' to cart">' + icon('plus-small') + 'Add' + ((extra && extra.qty > 1) ? ' ' + extra.qty : '') + '</button>' : '') + '</div></article>';
  }
  mkt.recommendedRow = function () {
    var TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' };
    return '<section class="sec" aria-labelledby="h-rec"><div class="sec-head"><h2 id="h-rec">Recommended for your fleet</h2><a class="sec-action" href="#/recommended">View all' + icon('arrow-small-right') + '</a></div>' +
      UI.carousel({ id: 'mk-rec', label: 'Recommended for your fleet', cls: 'crsl-3', slides: SE.data.recommended.map(function (r) {
        return partCard(SE.part(r.pn), { chip: SE.chip(r.priority, TONE[r.priority]), why: r.reason, qty: Math.max(1, r.units.length), from: 'Recommended' });
      }) }) + '</section>';
  };
  // parts that go on the same assembly (same machine and assembly group), else the same supplier line
  mkt.together = function (part) {
    var list = SE.data.parts.filter(function (x) {
      if (x.pn === part.pn || x.supersededBy || x.pn === part.supersededBy || x.pn === part.alternate) return false;
      return part.machine ? x.machine === part.machine && x.cat === part.cat : x.supplier === part.supplier && x.enhanced === part.enhanced;
    }).slice(0, 8);
    if (list.length < 2) return '';
    return '<section class="sec mk-together" aria-labelledby="h-tog"><div class="sec-head"><h2 id="h-tog">Related catalog parts</h2></div>' +
      UI.carousel({ id: 'mk-tog', label: 'Related catalog parts', cls: 'crsl-3', slides: list.map(function (x) { return partCard(x); }) }) + '</section>';
  };

  // ---------- M6 supplier network: 1021, the Home panel (js/views/home.js, shared with web-twin) lists every supplier;
  // web-full adds Request connection to the ones that are not connected
  mkt.suppliers = {
    req: function (s) {
      var S = M().suppliers, req = !!SE.state.mkt.requested[s.id];
      return '<button type="button" class="btn ' + (req ? 'btn-link' : 'btn-secondary') + ' mk-req" data-mk-req="' + s.id + '" aria-label="' + esc((req ? S.done : S.cta) + ', ' + s.name) + '"' + (req ? ' disabled' : '') + '>' + (req ? icon('check') + esc(S.done) : 'Request') + '</button>';
    },
  };

  // ---------- M7 early access
  mkt.early = function () {
    var E = M().early, on = SE.state.mkt.early;
    return '<section class="sec" aria-labelledby="h-early"><div class="sec-head"><h2 id="h-early">Coming soon</h2></div><div class="card mk-early"><span class="mk-early-ico">' + icon('pulse') + '</span><div><h3>' + esc(E.title) + '</h3><p>' + esc(E.text) + '</p></div>' +
      '<button type="button" class="btn ' + (on ? 'btn-secondary' : 'btn-primary') + '" data-mk-early' + (on ? ' disabled' : '') + '>' + (on ? icon('check') + esc(E.done) : esc(E.cta)) + '</button></div></section>';
  };

  // ---------- M8 Knowledge Base featured
  mkt.featured = function () {
    var TONE = { Recall: 'danger', Bulletin: 'warning', Notice: 'neutral', Article: 'info' };
    var items = SE.data.news.filter(function (n) { return n.kind !== 'Notice'; }).map(function (n) { return { id: n.id, kind: n.kind, title: n.title, text: n.summary }; })
      .concat(SE.data.kb.map(function (a) { return { id: a.id, kind: 'Article', title: a.title, text: a.minutes + ' min read · ' + a.summary }; }));
    return '<section class="sec" aria-labelledby="h-feat"><div class="sec-head"><h2 id="h-feat">Featured</h2></div>' +
      UI.carousel({ id: 'mk-feat', label: 'Featured in the Knowledge Base', cls: 'crsl-3', slides: items.map(function (x) {
        return '<a class="card mk-feat" href="#/article?id=' + encodeURIComponent(x.id) + '">' + SE.chip(x.kind, TONE[x.kind]) + '<b>' + esc(x.title) + '</b><p>' + esc(x.text) + '</p><span class="mk-more">Read' + icon('arrow-small-right') + '</span></a>';
      }) }) + '</section>';
  };

  // ---------- M4 What's new
  mkt.whatsNew = function () {
    var W = M().whatsNew, k = 0;
    var d = UI.dialog({
      title: 'What’s new',
      body: '<div class="wn">' + W.map(function (w, i) {
        return '<section class="wn-step" data-wn="' + i + '"' + (i ? ' hidden' : '') + ' aria-label="' + (i + 1) + ' of ' + W.length + '"><div class="wn-art" aria-hidden="true">' + icon(w.icon) + '</div>' +
          '<h3>' + esc(w.title) + '</h3><p>' + esc(w.text) + '</p><a class="btn btn-link wn-go" href="#/' + w.go + '" data-wn-go>' + esc(w.cta) + icon('arrow-small-right') + '</a></section>';
      }).join('') + '<div class="wn-dots" aria-hidden="true">' + W.map(function (_, i) { return '<span class="dot' + (i ? '' : ' on') + '"></span>'; }).join('') + '</div><p class="sr-only" aria-live="polite" id="wn-live">1 of ' + W.length + '</p></div>',
      foot: '<button type="button" class="btn btn-secondary" data-wn-back hidden>Back</button><span class="wn-n" id="wn-n">1 of ' + W.length + '</span><button type="button" class="btn btn-primary" data-wn-next>Next</button>',
      onClose: function () { SE.state.mkt.whatsNew = true; SE.save(); },
    });
    function show(i) {
      k = i;
      d.el.querySelectorAll('[data-wn]').forEach(function (s, j) { s.hidden = j !== k; });
      d.el.querySelectorAll('.wn-dots .dot').forEach(function (s, j) { s.classList.toggle('on', j === k); });
      d.el.querySelector('[data-wn-back]').hidden = !k;
      d.el.querySelector('[data-wn-next]').textContent = k === W.length - 1 ? 'Done' : 'Next';
      d.el.querySelector('#wn-n').textContent = d.el.querySelector('#wn-live').textContent = (k + 1) + ' of ' + W.length;
    }
    d.el.addEventListener('click', function (e) {
      if (e.target.closest('[data-wn-back]')) show(k - 1);
      else if (e.target.closest('[data-wn-next]')) { if (k === W.length - 1) d.close(); else show(k + 1); }
      else if (e.target.closest('[data-wn-go]')) d.close();
    });
    return d;
  };

  // ---------- wiring
  mkt.bind = function (root) {
    var stop = UI.carousel.bind(root);
    function onClick(e) {
      var t = e.target.closest('button');
      if (!t || !root.contains(t) || t.disabled) return;
      if (t.dataset.mkAdd) {
        var pt = SE.part(t.dataset.mkAdd), q = +t.dataset.qty || 1;
        var u = SE.cat.unit(null); SE.addToCart(pt.pn, q, null, { unit: u && u.equip, serial: u && u.serial });
        SE.toast(q + ' x ' + pt.name + ' added to cart', 'shopping-cart');
        t.disabled = true; t.innerHTML = icon('check') + 'Added';
      } else if (t.dataset.mkReq) {
        SE.state.mkt.requested[t.dataset.mkReq] = true; SE.save();
        t.disabled = true; t.className = 'btn btn-link mk-req'; t.innerHTML = icon('check') + esc(M().suppliers.done);
        SE.toast('Connection requested from ' + SE.supplier(t.dataset.mkReq).name, 'envelope');
      } else if (t.hasAttribute('data-mk-dl')) {
        // a desk computer cannot install the iPhone app: the code beside the button is the way in
        SE.toast('Scan the code with your iPhone camera to get the app', 'scan-frame');
      } else if (t.hasAttribute('data-mk-early')) {
        SE.state.mkt.early = true; SE.save();
        t.disabled = true; t.className = 'btn btn-secondary'; t.innerHTML = icon('check') + esc(M().early.done);
        SE.toast('We will email you when Diagnostics opens', 'envelope');
      }
    }
    root.addEventListener('click', onClick);
    return function () { stop(); root.removeEventListener('click', onClick); };
  };
})();
