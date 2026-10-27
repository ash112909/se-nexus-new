/* Search (B1, DES-26 / 33 / 34 / 35 / 45 / 52), web. Stories: 0929/research/REPORT.md, use cases 3 and 7.
   Search is scoped to 1 type at a time (Parts, Fleet, Manuals, Orders); there is no search-everything field (T1).
   1. Header field (SE.searchBox, on every page): searches the type of the section it sits in (Fleet pages search
      fleet, Order history searches orders, Manuals search manuals, everything else parts). Decision: the field
      keeps its typeahead (recent searches of the type under 2 characters; live results of the type from 2,
      debounced 250 ms); arrows pick, Enter opens the pick or, with nothing picked, the full results page. On the
      results page itself the field drives the page live instead of a popover. The ⌘K hint opens the palette.
   2. Command palette (Cmd+K, Ctrl+K, or / outside a field; option A in T2): navigation only. Pages (every rail
      destination) and records (parts, assets, work orders, orders, manuals) that match; arrows move, Enter opens,
      Escape closes and returns focus; Enter with nothing picked goes to search?q=&type=<active type>.
   3. Results page #/search?q=&type=parts|fleet|manuals|orders (&sup= &ptype= &stock=1 facets on Parts, &ctx=1 for
      every part in the context): type tabs with counts, contextual filter bar, interpretation of described
      words, facets, 1 row per part identity with the supplier options nested (T4), merged empty state (T5).
   Each settled query is 1 search attempt (T3); Enter submits at once. Query, recent searches and words-made
   chips are kept per type in SE.state.search (sessionStorage: per tab).
   web-full: News & Bulletins and Knowledge Base are search types too (6 tabs; rows open the item); the palette
   finds articles; voice (T6) has its web twin: the microphone in the search field asks for the microphone once
   (browser bubble), then a dialog listens (js/support.js SE.voice).
     #/search?voice=ask  the permission bubble   #/search?voice=1  listening   #/search?voice=2  the words heard
   1026 (CR-05, PLAN-CR05-supplier-scope.md) replaces the model level below by a Supplier select: connected
   suppliers are choices, the others greyed labels; 1 is always chosen, so the words field is never locked.
   #/search?q=&supplier=; "Also from" links an identity sold by another connected supplier.
   1026 (CR-01, PLAN-CR01-scoped-search.md): the back end runs scoped searches only. The header bar starts with
   a scope select (the 6 types); for Parts a Model select follows, and the words field (and the microphone) take
   input only once a model is chosen. The model is the search context's model (SE.ctx), shared with the filter
   bar, the part card and pricing. 1 query = scope + model + words: #/search?q=&type=&model=. The results page
   has no type tabs (they ran 6 searches); parts that share an identity with a part that fits the model count as
   fitting, so the cross-supplier group (T4) survives the model scope. */
(function () {
  'use strict';
  var X = window.SE;

  // ================================================================ search core (same code on mobile, ARA.*)
  var D = X.data;
  var TYPES = [['parts', 'Parts'], ['fleet', 'Fleet'], ['manuals', 'Manuals'], ['orders', 'Orders'], ['news', 'News & Bulletins'], ['kb', 'Knowledge Base']];
  X.SEARCH_TYPES = TYPES;
  X.searchLabel = function (t) { var r = TYPES.find(function (x) { return x[0] === t; }); return r ? r[1] : 'Parts'; };
  X.isSearchType = function (t) { return TYPES.some(function (x) { return x[0] === t; }); };
  // the section a screen belongs to decides which type its search field opens (T1)
  X.searchTypeFor = function (route) {
    if (/^(fleet|asset)$/.test(route)) return 'fleet';
    if (/^(manuals|manual)$/.test(route)) return 'manuals';
    if (/^(orders|order|placed)$/.test(route)) return 'orders';
    if (/^(kb|article)$/.test(route)) return 'kb';
    if (route === 'search' && X.state.search && X.isSearchType(X.state.search.type)) return X.state.search.type;
    return 'parts';
  };
  X.searchMem = function (type) {
    var S = X.state.search || (X.state.search = {});
    return S[type] || (S[type] = { q: '', recent: [] });
  };
  X.recentFor = function (type) {
    var seen = {}, seed = (D.recentSearches && D.recentSearches[type]) || [];
    return (X.searchMem(type).recent || []).concat(seed).filter(function (r) { var k = r.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 5);
  };
  X.addRecent = function (type, q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    var m = X.searchMem(type);
    m.recent = [q].concat((m.recent || []).filter(function (r) { return r.toLowerCase() !== q.toLowerCase(); })).slice(0, 6);
    X.save();
  };
  X.countAttempt = function (type) { var m = X.searchMem(type); m.attempts = (m.attempts || 0) + 1; X.save(); };

  // ---------- 1026 (CR-05, PLAN-CR05-supplier-scope.md): the scope of a query. Parts are scoped to 1 connected
  // supplier (the back end reads 1 supplier's catalog); the other types need only the type.
  X.connectedSuppliers = function () { return D.suppliers; };
  function supplierOfModel(m) { return m && D.machines[m] ? D.machines[m].supplier : null; }
  // the supplier a parts search reads: the model in the filters decides when there is one, else the pick,
  // else the first connected supplier (JLG)
  X.supplierFor = function (ctx) { return supplierOfModel(X.ctxModel(ctx || X.ctx())) || X.scopeSupplier(); };
  X.scopeSupplier = function () {
    var S = X.state.search || {}, s = S.supplier && X.supplier(S.supplier);
    if (s) return s.id;
    return supplierOfModel(X.ctxModel()) || X.connectedSuppliers()[0].id;
  };
  // the route params of a scoped query: q, type (not for parts) and supplier (parts)
  X.scopeParams = function (type, q) {
    var o = {};
    if (q) o.q = q;
    if (type !== 'parts') o.type = type; else o.supplier = X.supplierFor();
    return o;
  };
  // the scope in words: "JLG parts", "fleet", "knowledge base"
  X.scopeWords = function (type) { return type === 'parts' ? X.supplier(X.supplierFor()).name + ' parts' : X.searchLabel(type).toLowerCase(); };
  function filterSource(c) {
    var w = c.wo && X.wo(c.wo);
    if (c.wo) return 'Work order #' + c.wo + (w ? ' (' + w.equip + ')' : '');
    if (c.equip) return 'Equipment ' + c.equip;
    if (c.serial) return 'Serial ' + c.serial;
    return 'Model filter';
  }
  // a pick of the supplier. Filters of another make (work order, unit, serial, model) leave the context;
  // returns the sentence that says so ('' when nothing was removed)
  X.setScopeSupplier = function (id) {
    var sp = X.supplier(id);
    if (!sp) return '';
    var S = X.state.search || (X.state.search = {}), c = Object.assign({}, X.ctx()), m = X.ctxModel(c), gone = '';
    S.supplier = sp.id;
    if (m && supplierOfModel(m) !== sp.id) {
      gone = filterSource(c) + ' removed from filters: ' + (c.wo || (c.serial && !c.equip) ? 'its unit is a ' : 'it is a ') + X.machine(m).name + ', not a ' + sp.name + ' machine.';
      delete c.wo; delete c.equip; delete c.serial; delete c.model;
      X.state.ctx = c;
      var mem = S.parts; if (mem && mem.fromWords) mem.fromWords = mem.fromWords.filter(function (k) { return c[k]; });
    }
    X.save();
    return gone;
  };
  // after the filters changed (Filters dialog, described words): the supplier follows the model's make;
  // returns the sentence that says so ('' when the supplier stays)
  X.followSupplier = function () {
    var c = X.ctx(), m = X.ctxModel(c), want = supplierOfModel(m), S = X.state.search || (X.state.search = {});
    if (!want || want === X.scopeSupplier()) return '';
    S.supplier = want; X.save();
    return 'Searching ' + X.supplier(want).name + ' parts: ' + (c.wo || c.equip || c.serial ? filterSource(c) + ' is a ' : 'the model filter is a ') + X.machine(m).name + '.';
  };
  // every search bar on screen shows the context again (after the filter bar or the words changed it)
  X.searchBarSync = function () { document.querySelectorAll('#app [data-search]').forEach(function (f) { if (f._ssSync) f._ssSync(); }); };

  // ---------- highlight: escape, wrap every query word in <mark class="mark-hl">
  X.hl = function (text, q) {
    text = String(text == null ? '' : text);
    var low = text.toLowerCase(), on = [];
    for (var z = 0; z < text.length; z++) on.push(0);
    X.qTokens(q).forEach(function (t) {
      [t, t.replace(/-/g, '')].forEach(function (w) {
        if (w.length < 1) return;
        var i = low.indexOf(w);
        while (i >= 0) { for (var k = i; k < i + w.length; k++) on[k] = 1; i = low.indexOf(w, i + w.length); }
      });
    });
    for (var j = 1; j < text.length - 1; j++) if (text[j] === ' ' && on[j - 1] && on[j + 1]) on[j] = 1;
    var out = '', open = false;
    for (var n = 0; n < text.length; n++) {
      if (on[n] && !open) { out += '<mark class="mark-hl">'; open = true; }
      if (!on[n] && open) { out += '</mark>'; open = false; }
      out += X.esc(text[n]);
    }
    return out + (open ? '</mark>' : '');
  };

  // ---------- described part (NLQ), rule based
  var TYPE_WORDS = { seal: 'Seal', seals: 'Seal', 'o-ring': 'Seal', filter: 'Filter', filters: 'Filter', oil: 'Fluid', fluid: 'Fluid', valve: 'Valve', valves: 'Valve', hose: 'Hose', hoses: 'Hose', cylinder: 'Cylinder', cylinders: 'Cylinder' };
  var CONNECT = { for: 1, on: 1, fits: 1, fit: 1, with: 1 };
  function modelIndex() {
    var idx = {}, makes = {};
    Object.keys(D.machines).forEach(function (k) {
      var m = D.machines[k];
      idx[k.toLowerCase()] = k; idx[m.model.toLowerCase().replace(/\s+/g, '')] = k;
      var mk = (m.make || '').toLowerCase(); (makes[mk] = makes[mk] || []).push(k);
      String(m.model).split(/\s+/).forEach(function (w) { if (/\d{3,}/.test(w)) idx[w.toLowerCase()] = k; });
    });
    Object.keys(makes).forEach(function (mk) { if (mk && makes[mk].length === 1 && !idx[mk]) idx[mk] = makes[mk][0]; });
    return idx;
  }
  // returns { raw, text, ents: { wo, equip, serial, model, type }, described }
  X.parseQuery = function (raw) {
    raw = String(raw || '').trim();
    var toks = raw.split(/\s+/).filter(Boolean), used = [], ents = {}, typeWord = null, connect = false, idx = modelIndex();
    function clean(t) { return t.toLowerCase().replace(/^[("“]+|[)"”.,;:!?]+$/g, ''); }
    for (var i = 0; i < toks.length; i++) {
      var t = clean(toks[i]), nx = i + 1 < toks.length ? clean(toks[i + 1]) : '';
      var m;
      if ((t === 'wo' || t === '#' || t === 'order') && /^#?\d{5,6}$/.test(nx) && X.wo(nx.replace('#', ''))) { ents.wo = nx.replace('#', ''); used.push(i, i + 1); i++; continue; }
      if (t === 'work' && nx === 'order' && i + 2 < toks.length && X.wo(clean(toks[i + 2]).replace('#', ''))) { ents.wo = clean(toks[i + 2]).replace('#', ''); used.push(i, i + 1, i + 2); i += 2; continue; }
      if ((m = /^(?:wo)?#?(\d{6})$/.exec(t)) && X.wo(m[1])) { ents.wo = m[1]; used.push(i); continue; }
      if ((m = /^fl-?(\d{3})$/.exec(t)) && X.asset('FL-' + m[1])) { ents.equip = 'FL-' + m[1]; used.push(i); continue; }
      var a = X.assets().find(function (x) { return x.serial.toLowerCase() === t; });
      if (a) { ents.serial = a.serial; used.push(i); continue; }
      if (nx && idx[t + nx]) { ents.model = idx[t + nx]; used.push(i, i + 1); i++; continue; }
      if (idx[t]) { ents.model = idx[t]; used.push(i); continue; }
      if (CONNECT[t]) connect = true;
      if (!typeWord && TYPE_WORDS[t]) typeWord = TYPE_WORDS[t];
    }
    var hasEnt = Object.keys(ents).length > 0;
    var described = hasEnt || (connect && toks.length > 2);
    if (described && typeWord) ents.type = typeWord;
    // the words left: entity words out, connector words at the ends trimmed
    var rest = toks.filter(function (t, k) { return used.indexOf(k) < 0; });
    while (rest.length && X.SEARCH_STOP[clean(rest[rest.length - 1])]) rest.pop();
    while (rest.length && X.SEARCH_STOP[clean(rest[0])]) rest.shift();
    return { raw: raw, text: rest.join(' '), ents: ents, described: described };
  };
  // words-made chips: "on FL-094 (Skyjack SJIII 3219)"
  X.entPhrases = function (ents) {
    var out = [];
    if (ents.wo) { var w = X.wo(ents.wo); out.push(['wo', 'for work order #' + ents.wo + (w ? ' (' + w.equip + ')' : '')]); }
    if (ents.equip) { var a = X.asset(ents.equip); out.push(['equip', 'on ' + ents.equip + (a ? ' (' + a.machine + ')' : '')]); }
    if (ents.serial) { var b = X.asset(ents.serial); out.push(['serial', 'serial ' + ents.serial + (b ? ' (' + b.equip + ')' : '')]); }
    if (ents.model) out.push(['model', 'for the ' + X.machine(ents.model).name]);
    if (ents.type) out.push(['type', 'part type ' + ents.type]);
    return out;
  };
  // commit the words-made chips to the context; they replace the chips the previous described query made
  X.applyWords = function (parsed) {
    var e = parsed.ents, keys = Object.keys(e);
    if (!keys.length) return;
    var mem = X.searchMem('parts');
    (mem.fromWords || []).forEach(function (k) { if (!e[k] && X.ctx()[k]) X.ctxRemove(k); });
    if (e.wo) X.setContext({ wo: e.wo });
    else if (e.equip) X.setContext({ equip: e.equip, wo: null });
    else if (e.serial) { var a = X.asset(e.serial); X.setContext({ serial: e.serial, model: a ? a.model : null, equip: null, wo: null }); }
    else if (e.model && X.ctxModel() !== e.model) X.setContext({ model: e.model, equip: null, serial: null, wo: null });
    else if (e.model) X.setContext({ model: e.model });
    if (e.type) X.setContext({ type: e.type });
    mem.fromWords = keys;
    X.save();
  };

  // ---------- matching per type
  function rank(p, tk, q) {
    var pn = p.pn.toLowerCase(), name = p.name.toLowerCase(), ql = String(q || '').toLowerCase().trim();
    if (ql && pn === ql) return 0;
    if (ql && pn.indexOf(ql) === 0) return 1;
    if (tk.length && name.indexOf(tk[0]) === 0) return 2;
    return 3;
  }
  // parts: groups by identity; ctx scopes; returns { groups, outside, base }
  X.searchParts = function (q, ctx) {
    ctx = ctx || X.ctx();
    var tk = X.qTokens(q);
    var base = tk.length ? D.parts.filter(function (p) { return X.hitTokens(X.partHay(p), tk); }) : D.parts.slice();
    base.sort(function (a, b) { return rank(a, tk, q) - rank(b, tk, q); });
    // 1026 (CR-05): 1 supplier's catalog; the filters (model, unit, work order, part type, keyword) narrow inside it
    var sup = X.supplierFor(ctx), mine = base.filter(function (p) { return X.supplierOf(p.pn).id === sup; });
    var g = X.groupParts(mine.filter(function (p) { return X.partInContext(p, ctx); })), all = X.groupParts(mine);
    return { groups: g, outside: all.length - g.length, base: all.length, supplier: sup };
  };
  // the other connected suppliers that sell the same identity (AW32 oil from JLG and Skyjack): "Also from"
  X.alsoFrom = function (p) {
    if (!p.identity) return [];
    var mine = X.supplierOf(p.pn).id, seen = {};
    return D.parts.filter(function (x) { return x.identity === p.identity; }).map(function (x) { return X.supplierOf(x.pn); })
      .filter(function (s) { if (s.id === mine || seen[s.id]) return false; seen[s.id] = 1; return true; });
  };
  X.groupParts = function (list) {
    var map = {}, out = [];
    list.forEach(function (p) {
      var k = p.identity || p.pn;
      if (!map[k]) { map[k] = { id: k, parts: [] }; out.push(map[k]); }
      map[k].parts.push(p);
    });
    out.forEach(function (g) { g.lead = g.parts[0]; g.suppliers = g.parts.map(function (p) { return X.supplierOf(p.pn); }); });
    return out;
  };
  X.searchFleet = function (q) {
    var tk = X.qTokens(q);
    if (!tk.length) return [];
    return X.assetsHere().filter(function (a) { return X.hitTokens([a.equip, a.serial, a.model, a.machine, a.make, a.location, a.status].join(' '), tk); });
  };
  X.searchManuals = function (q) {
    var tk = X.qTokens(q), out = [];
    if (!tk.length) return out;
    D.manuals.forEach(function (m) {
      var mach = X.machine(m.machine), head = [m.title, m.type, mach ? mach.name : '', {text:'Text',scan:'Scanned',mixed:'Mixed'}[m.format], {en:'English',es:'Spanish'}[m.language]].join(' ');
      var sections = m.sections || [];
      function st(s) { return s.title + ' ' + (m.format === 'text' ? s.text || '' : ''); }
      if (!X.hitTokens(head + ' ' + sections.map(st).join(' '), tk)) return;
      var sec = m.format === 'text' ? sections.find(function (s) { return X.hitTokens(st(s), tk); }) : null;
      out.push({ m: m, sec: sec || null, page: sec ? sec.page : 1 });
    });
    return out;
  };
  X.searchOrders = function (q) {
    var tk = X.qTokens(q);
    if (!tk.length) return [];
    return X.orders().filter(function (o) {
      var items = (o.items || []).map(function (i) { var p = X.part(i.pn); return i.pn + ' ' + (p ? p.name : ''); }).join(' ');
      return X.hitTokens([o.po, o.wo || '', o.supplier, o.status, items].join(' '), tk);
    });
  };
  // News & Bulletins (recalls, service bulletins, supplier notices) and Knowledge Base articles: 1 row shape
  function newsItem(n) { var m = n.machine ? X.machine(n.machine) : null; return { id: n.id, kind: n.kind, title: n.title, summary: n.summary, meta: (m ? m.name + ' · ' : '') + n.date }; }
  function kbItem(a) { return { id: a.id, kind: 'Article', title: a.title, summary: a.summary, meta: a.topic + ' · ' + a.minutes + ' min read' }; }
  function searchItems(list, q) {
    var tk = X.qTokens(q);
    if (!tk.length) return [];
    return list.filter(function (x) { return X.hitTokens([x.title, x.summary, x.kind, x.meta].join(' '), tk); });
  }
  X.searchNews = function (q) { return searchItems(D.news.map(newsItem), q); };
  X.searchKb = function (q) { return searchItems(D.kb.map(kbItem), q); };
  // count or list per type (kept for other screens)
  // the context a described query would make, on top of the current one (preview, counts)
  X.ctxFromEnts = function (ents, base) {
    var c = Object.assign({}, base || X.ctx());
    if (ents.wo) { var w = X.wo(ents.wo), a = w && X.asset(w.equip); c = { wo: ents.wo, type: c.type, keyword: c.keyword }; if (a) { c.equip = a.equip; c.serial = a.serial; c.model = a.model; } }
    else if (ents.equip) { var b = X.asset(ents.equip); c = { equip: b.equip, serial: b.serial, model: b.model, type: c.type, keyword: c.keyword }; }
    else if (ents.serial) { var s = X.asset(ents.serial); c = { serial: s.serial, model: s.model, type: c.type, keyword: c.keyword }; }
    else if (ents.model) c = { model: ents.model, type: c.type, keyword: c.keyword };
    if (ents.type) c.type = ents.type;
    Object.keys(c).forEach(function (k) { if (!c[k]) delete c[k]; });
    return c;
  };
  X.find = function (q, type) {
    if (type === 'parts') { var pq = X.parseQuery(q); return Object.keys(pq.ents).length ? X.searchParts(pq.text, X.ctxFromEnts(pq.ents)).groups : X.searchParts(q).groups; }
    if (type === 'fleet' || type === 'machines') return X.searchFleet(q);
    if (type === 'manuals') return X.searchManuals(q);
    if (type === 'orders') return X.searchOrders(q);
    if (type === 'news') return X.searchNews(q);
    if (type === 'kb') return X.searchKb(q);
    return [];
  };
  // ---------- no results (T5): spelling and part-number suggestions
  var VOCAB = null;
  function lev(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  X.suggest = function (q, type) {
    var tk = X.qTokens(q), out = [];
    if (!VOCAB) {
      VOCAB = {};
      D.parts.forEach(function (p) { p.name.toLowerCase().split(/[^a-z0-9-]+/).forEach(function (w) { if (w.length > 2) VOCAB[w] = 1; }); });
      D.manuals.forEach(function (m) { (m.title + ' ' + (m.sections || []).map(function (s) { return s.title + ' ' + (m.format === 'text' ? s.text : ''); }).join(' ')).toLowerCase().split(/[^a-z0-9-]+/).forEach(function (w) { if (w.length > 2) VOCAB[w] = 1; }); });
    }
    // spelling: replace each unknown word by its nearest known word
    var fixed = tk.map(function (t) {
      if (/\d/.test(t) || VOCAB[t]) return t;
      var best = null, bd = 9;
      Object.keys(VOCAB).forEach(function (w) { var dd = lev(t, w); if (dd < bd) { bd = dd; best = w; } });
      return best && bd <= Math.max(1, Math.floor(t.length / 4)) ? best : t;
    });
    if (fixed.join(' ') !== tk.join(' ') && X.find(fixed.join(' '), type).length) out.push(['spell', fixed.join(' ')]);
    // part numbers: the closest numbers by shared prefix
    if (type === 'parts') {
      var num = tk.find(function (t) { return /\d/.test(t); });
      if (num) {
        var n = num.toUpperCase().replace(/[^A-Z0-9]/g, '');
        D.parts.map(function (p) { var b = p.pn.replace(/-/g, ''), k = 0; while (k < b.length && b[k] === n[k]) k++; return [k, p.pn]; })
          .filter(function (r) { return r[0] >= 3; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 3)
          .forEach(function (r) { out.push(['pn', r[1]]); });
      }
    }
    return out;
  };
  var TRY = { parts: ['JLG-4120-118', 'lift cylinder', 'seal kit for FL-094'], fleet: ['FL-094', 'JL1930-04', 'Kyle Branch'], manuals: ['lowering valve', 'seal replacement'], orders: ['PO-7838', '100094', 'JLG-4120-118'], news: ['recall', 'lowering valve'], kb: ['cylinder drift', 'battery'] };
  X.searchTry = function (type, q) { return TRY[type].filter(function (s) { return s.toLowerCase() !== String(q || '').toLowerCase() && X.find(s, type).length; }); };
  // where a part hit opens: the part card, or the supplier's own line for parts with no machine
  X.partRoute = function (p) { return p.machine ? ['part', { pn: p.pn }] : ['supplier', { sup: p.supplier, line: p.enhanced, pn: p.pn }]; };
  // ================================================================ end of core

  var esc = X.esc, icon = X.icon;
  function per(p) { return p.uom === 'each' ? 'each' : 'per ' + esc(p.uom); }
  function nParts(n) { return n + ' part' + (n === 1 ? ' matches' : 's match'); }
  function fits(p, short) {
    if (!p.machine) return (short ? '' : X.supplier(p.supplier).name + ' ') + X.lineName(p).toLowerCase() + ' line';
    var m = X.machine(p.machine); return short ? m.name : m.name + ' · ' + m.units.length + ' in fleet';
  }
  function hrefFor(r) { return '#/' + r[0] + (r[1] ? '?' + new URLSearchParams(r[1]) : ''); }
  function searchHref(q, type) { var o = { q: q }; if (type && type !== 'parts') o.type = type; return '#/search?' + new URLSearchParams(o); }
  function priceCell(p) {
    return X.priceVisible(p) ? '<b class="pr">' + X.money(p.price) + '</b> <span class="uom">' + per(p) + '</span>'
      : '<span class="pr-gate">Requires serial context for pricing</span><button type="button" class="pr-set" data-fb-open>Choose a serial</button>';
  }
  function tags(p) {
    var t = [p.oem ? '<span class="tag oem">OEM</span>' : '<span class="tag">' + (p.reman ? 'Reman' : 'Aftermarket') + '</span>'];
    if ((p.xrefs || []).length) t.push('<span class="tag">' + p.xrefs.length + ' cross-ref' + (p.xrefs.length === 1 ? '' : 's') + '</span>');
    return t.join('');
  }
  function goAttrs(p) {
    // 1017 (V1): a work order in the filter bar rides to the part page, so Add keeps it on the cart line
    var c = X.ctx(), w = c.wo && X.wo(c.wo), a = w && X.asset(w.equip), wo = a && a.model === p.machine ? ' data-wo="' + w.id + '"' : '';
    return p.machine ? ' data-go="part" data-pn="' + p.pn + '"' + wo : ' data-line="' + p.enhanced + '" data-sup="' + p.supplier + '" data-pn="' + p.pn + '"';
  }
  function interpHtml(q, ents, pending) {
    var parts = [];
    if (q) parts.push('<b>"' + esc(q) + '"</b>');
    if (pending) X.entPhrases(ents).forEach(function (e) { parts.push('<span class="ip-ent">' + esc(e[1]) + '</span>'); });
    else X.ctxPrimary().forEach(function (c) {
      var a = c.key === 'equip' ? X.asset(X.ctx().equip) : null;
      parts.push('<span class="ip-ent">' + esc(c.key === 'equip' ? 'on ' + c.value + (a ? ' (' + a.machine + ')' : '') : c.key === 'wo' ? 'for work order ' + c.value : c.key === 'model' ? 'for the ' + c.value : c.label.toLowerCase() + ' ' + c.value) + '</span>');
    });
    if (!parts.length) return '';
    return '<p class="s-interp" aria-live="polite">' + icon(pending ? 'comment' : 'search') + '<span><span class="ip-k">' + (pending ? 'Enter will search for' : 'Searching for') + '</span> ' + parts.join(' <span class="ip-sep">·</span> ') + '</span></p>';
  }
  // the route being mounted (the hash changes before the view renders; data-route only after)
  function routeName() { return location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'; }
  function activeType() { var b = X._barScope; return b && b.route === routeName() ? b.type : X.searchTypeFor(routeName()); }
  // records of a type as palette or typeahead options: [route, params, glyph, title html, sub html, kind]
  function records(type, q, n, ctx) {
    if (type === 'parts') return X.searchParts(q, ctx || {}).groups.slice(0, n).map(function (g) {
      var p = g.lead, r = X.partRoute(p);
      return [r[0], r[1], null, X.hl(p.name, q), X.hl(p.pn, q) + ' · ' + esc(g.parts.length > 1 ? g.parts.length + ' suppliers' : X.supplierOf(p.pn).name), 'Part'];
    });
    if (type === 'fleet') return X.searchFleet(q).slice(0, n).map(function (a) { return ['asset', { id: a.equip }, null, X.hl(a.equip + ' · ' + a.machine, q), X.hl(a.serial, q) + ' · ' + X.hl(a.location, q) + ' · ' + esc(a.status), 'Asset']; });
    if (type === 'manuals') return X.searchManuals(q).slice(0, n).map(function (x) { return ['manual', { id: x.m.id, page: x.page }, 'book-alt', X.hl(x.m.title, q), (x.sec ? X.hl(x.sec.title, q) + ' · page ' + x.page : 'Opens at page 1') + ' · ' + (x.m.format === 'scan' ? 'Scanned' : 'Text'), 'Manual']; });
    if (type === 'orders') return X.searchOrders(q).slice(0, n).map(function (o) { return ['order', { po: o.po }, 'receipt', X.hl(o.po, q), X.hl(o.supplier, q) + (o.wo ? ' · WO ' + X.hl(o.wo, q) : '') + ' · ' + esc(o.status), 'Order']; });
    if (type === 'news' || type === 'kb') return (type === 'news' ? X.searchNews(q) : X.searchKb(q)).slice(0, n).map(function (x) { return ['article', { id: x.id }, type === 'kb' ? 'notebook' : 'megaphone', X.hl(x.title, q), esc(x.kind) + ' · ' + esc(x.meta), x.kind === 'Article' ? 'Article' : x.kind]; });
    if (type === 'wo') {
      var tk = X.qTokens(q);
      return X.allWorkOrders().filter(function (w) { return X.hitTokens([w.id, w.equip, w.machine, w.issue || '', w.status].join(' '), tk); }).slice(0, n)
        .map(function (w) { return ['work-order', { id: w.id }, 'clipboard-list', X.hl('#' + w.id + ' · ' + w.equip, q), X.hl(w.machine, q) + ' · ' + esc(w.status), 'Work order']; });
    }
    return [];
  }
  function glyph(g) { return g ? '<span class="ta-ico">' + icon(g) + '</span>' : '<span class="ta-ico ph" aria-hidden="true"></span>'; }

  // ================================================================ 1. header field: typeahead of the section's type
  var seq = 0;
  X.searchBox = function (form) {
    var input = form.querySelector('input');
    if (!input || form.dataset.ta) return function () {};
    X._barScope = null; // a page arrives with the scope of its section (T1); a pick lasts on that page
    var id = 'ta-' + (++seq), type = activeType(), onPage = routeName() === 'search', route = routeName();
    form.dataset.ta = id;
    form.classList.add('has-ta', 'scoped');
    // 1026 (CR-05): scope select, then (parts) the Suppliers dropdown, then the words. They come first in the
    // form, so the reading and tab order is the order of the query: scope, supplier, words. A supplier is always
    // chosen, so the words field always takes input.
    // The Suppliers dropdown is a select-only combobox (WAI-ARIA APG): a button that opens a listbox headed
    // "Suppliers", with the connected suppliers as choices and the others greyed under "Not connected yet", so the
    // list says who else exists without offering a search the back end cannot run. A native select could not
    // carry the header, and its open list never reaches a screenshot or the .fig files.
    form.insertAdjacentHTML('afterbegin',
      '<span class="ss-pick ss-scope"><label class="sr-only" for="' + id + '-scope">Search in</label><select class="ss-sel" id="' + id + '-scope" data-scope>' +
        X.SEARCH_TYPES.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</span>' +
      '<span class="ss-pick ss-supplier" data-supplier-wrap><span class="sr-only" id="' + id + '-sup-l">Supplier</span>' +
        '<button type="button" class="ss-sel ss-btn" id="' + id + '-supplier" data-supplier role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '-sup-list" aria-labelledby="' + id + '-sup-l ' + id + '-supplier"></button>' + icon('angle-small-down') +
        '<div class="ss-list" id="' + id + '-sup-list" role="listbox" aria-label="Suppliers" tabindex="-1" hidden></div></span>' +
      '<span class="ss-div" aria-hidden="true"></span>');
    var sSel = form.querySelector('[data-scope]'), pBtn = form.querySelector('[data-supplier]'), pWrap = form.querySelector('[data-supplier-wrap]'), pList = pWrap.querySelector('.ss-list');
    var lbl = form.querySelector('label[for="q"]');
    var pOpts = [], pAct = -1;
    function supOption(x, sel) {
      var k = pOpts.length; pOpts.push({ id: x.id, on: true });
      return '<div class="ss-opt" role="option" id="' + id + '-sup-o' + k + '" data-sup-opt="' + x.id + '" aria-selected="' + sel + '">' +
        '<span class="ss-name">' + esc(x.name) + '</span>' + (sel ? icon('check') : '') + '</div>';
    }
    function supList(sup) {
      pOpts = [];
      pList.innerHTML = '<p class="ss-head" aria-hidden="true">Suppliers</p>' +
        D.suppliers.map(function (x) { return supOption(x, x.id === sup); }).join('');
    }
    function supMove(k) {
      if (!pOpts.length) return;
      pAct = Math.max(0, Math.min(pOpts.length - 1, k));
      pList.querySelectorAll('.ss-opt').forEach(function (o, n) { o.classList.toggle('act', n === pAct); });
      var cur = pList.querySelector('#' + id + '-sup-o' + pAct);
      pBtn.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    }
    function supOpen() {
      if (!pList.hidden) return;
      close(); // the typeahead and the list never show together
      pList.hidden = false; pBtn.setAttribute('aria-expanded', 'true');
      supMove(Math.max(0, pOpts.findIndex(function (o) { return o.id === pBtn.value; })));
      document.addEventListener('mousedown', supOutside, true);
    }
    function supClose() {
      if (pList.hidden) return;
      pList.hidden = true; pBtn.setAttribute('aria-expanded', 'false'); pBtn.removeAttribute('aria-activedescendant'); pAct = -1;
      document.removeEventListener('mousedown', supOutside, true);
    }
    function supOutside(e) { if (!pWrap.contains(e.target)) supClose(); }
    function supChoose(k) {
      var o = pOpts[k];
      if (!o) return;
      supClose();
      pBtn.focus();
      if (o.id === pBtn.value) return;
      var msg = X.setScopeSupplier(o.id);
      if (msg) X.toast(msg, 'filter');
      X.searchBarSync();
      if (onPage && X._srRefresh) X._srRefresh();
    }
    pBtn.addEventListener('click', function () { if (pList.hidden) supOpen(); else supClose(); });
    pBtn.addEventListener('keydown', function (e) {
      var open = !pList.hidden;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) supOpen(); else supMove(pAct + (e.key === 'ArrowDown' ? 1 : -1)); }
      else if (e.key === 'Home' && open) { e.preventDefault(); supMove(0); }
      else if (e.key === 'End' && open) { e.preventDefault(); supMove(pOpts.length - 1); }
      else if ((e.key === 'Enter' || e.key === ' ') && open) { e.preventDefault(); supChoose(pAct); }
      else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); supClose(); }
      else if (e.key === 'Tab' && open) supClose();
    });
    pList.addEventListener('mousedown', function (e) { e.preventDefault(); }); // focus stays on the button
    pList.addEventListener('click', function (e) { var o = e.target.closest('[data-sup-opt]'); if (o) supChoose(+o.id.split('-sup-o')[1]); });
    pList.addEventListener('mousemove', function (e) { var o = e.target.closest('[data-sup-opt]'); if (o) { var k = +o.id.split('-sup-o')[1]; if (k !== pAct) supMove(k); } });
    function sync() {
      var parts = type === 'parts', sup = parts ? X.supplierFor() : null;
      sSel.value = type;
      pWrap.hidden = !parts;
      if (!parts) supClose();
      if (sup) { pBtn.value = sup; pBtn.textContent = X.supplier(sup).name; supList(sup); }
      form.dataset.searchScope = type;
      // the selects say the scope; the placeholder says what to type (the label says both)
      input.placeholder = parts ? 'Part name or number' : 'Search ' + X.searchLabel(type).toLowerCase();
      if (lbl) lbl.textContent = 'Search ' + X.scopeWords(type) + '. Press Control K or Command K to jump to any page or record';
    }
    form._ssSync = sync;
    sync();
    sSel.addEventListener('change', function () {
      type = sSel.value;
      X._barScope = { route: route, type: type };
      sync();
      if (onPage && X._srScope) X._srScope(type);
      else if (!pop.hidden) build();
    });
    var kbd = form.querySelector('.kbd');
    if (kbd) { kbd.setAttribute('role', 'button'); kbd.removeAttribute('aria-hidden'); kbd.setAttribute('aria-label', 'Open the command palette'); kbd.title = 'Jump to any page or record'; kbd.addEventListener('mousedown', function (e) { e.preventDefault(); X.palette.open(); }); }
    var pop = document.createElement('div');
    pop.className = 'ta-pop';
    pop.hidden = true;
    form.appendChild(pop);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id + '-list');
    var items = [], active = -1, blurT, timer, settled = '';

    function build() {
      if (onPage) type = activeType();
      var q = input.value.trim(), html = '', lbl = X.searchLabel(type).toLowerCase();
      items = [];
      function opt(it, cls) {
        var i = items.length;
        items.push(it);
        return '<div class="ta-opt' + (cls ? ' ' + cls : '') + '" role="option" id="' + id + '-o' + i + '" data-ta="' + i + '" aria-selected="false">' +
          (it[2] === 'none' ? '' : glyph(it[2])) + '<span class="ta-main"><b>' + it[3] + '</b>' + (it[4] ? '<small>' + it[4] + '</small>' : '') + '</span>' +
          (it[5] ? '<span class="ta-end">' + it[5] + '</span>' : '') + '</div>';
      }
      if (q.length < 2) {
        var rec = X.recentFor(type);
        html = '<p class="ta-label">Recent ' + lbl + ' searches</p>' + rec.map(function (r) { return opt(['search', X.scopeParams(type, r), 'time-past', esc(r), '', '']); }).join('') +
          '<p class="ta-tip">Searching ' + esc(X.scopeWords(type)) + '. Type at least 2 characters to search.<span class="ta-tip-k"> <kbd class="kbd">⌘K</kbd> jumps to any page or record.</span></p>';
      } else {
        var pq = type === 'parts' ? X.parseQuery(q) : null, pending = pq && Object.keys(pq.ents).length;
        var useQ = pending ? pq.text : q, list = records(type, useQ, 5, type === 'parts' ? (pending ? X.ctxFromEnts(pq.ents) : X.ctx()) : null);
        var total = type === 'parts' ? X.searchParts(useQ, pending ? X.ctxFromEnts(pq.ents) : X.ctx()).groups.length : X.find(q, type).length;
        if (pending) html += interpHtml(useQ, pq.ents, true);
        html += '<p class="ta-label">' + esc(X.scopeWords(type).replace(/^./, function (c) { return c.toUpperCase(); })) + ' · ' + total + '</p>';
        html += list.map(function (it) { return opt([it[0], it[1], it[2], it[3], it[4], '']); }).join('');
        if (!list.length) html += '<p class="ta-none">No ' + lbl + ' match "' + esc(q) + '" yet</p>';
        html += opt(['search', X.scopeParams(type, q), 'none', 'See all ' + esc(X.scopeWords(type)) + ' results for "' + esc(q) + '"', '', '<kbd class="kbd">Enter</kbd>'], 'ta-all');
      }
      pop.innerHTML = '<div class="ta-list" role="listbox" id="' + id + '-list" aria-label="' + esc(X.searchLabel(type)) + ' suggestions">' + html + '</div>' +
        '<div class="ta-foot" aria-hidden="true"><span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> Move</span><span><kbd class="kbd">Enter</kbd> Open</span><span><kbd class="kbd">esc</kbd> Close</span></div>';
      active = -1;
      input.removeAttribute('aria-activedescendant');
    }
    function open() { supClose(); if (onPage) return; build(); pop.hidden = false; input.setAttribute('aria-expanded', 'true'); }
    function close() { pop.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function move(d) {
      if (pop.hidden) open();
      if (!items.length || pop.hidden) return;
      active = active < 0 ? (d > 0 ? 0 : items.length - 1) : (active + d + items.length) % items.length;
      pop.querySelectorAll('.ta-opt').forEach(function (o, i) { o.setAttribute('aria-selected', String(i === active)); });
      var cur = pop.querySelector('#' + id + '-o' + active);
      input.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    }
    function choose(i) {
      if (onPage) type = activeType();
      var it = items[i];
      close();
      input.blur();
      if (it[0] !== 'search') X.addRecent(type, input.value);
      X.go(it[0], { params: it[1] });
    }
    function submit() {
      if (onPage) type = activeType();
      clearTimeout(timer);
      var q = input.value.trim();
      close();
      if (!q) { X.go('search', { params: X.scopeParams(type, '') }); return; }
      X.addRecent(type, q); X.countAttempt(type);
      X.go('search', { params: X.scopeParams(type, q) });
    }
    function settle() {
      if (onPage) type = activeType();
      var q = input.value.trim();
      if (q.length >= 2 && q !== settled) { settled = q; X.countAttempt(type); }
      if (onPage && X._srLive) X._srLive(q); else open();
    }
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Escape') { if (!pop.hidden) { e.preventDefault(); e.stopPropagation(); close(); } }
      else if (e.key === 'Enter' && !pop.hidden && active >= 0) { e.preventDefault(); choose(active); }
    }
    function onInput() {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { settle(); return; }
      // debounce: the settled query is the attempt; a newer keystroke cancels the pending one
      timer = setTimeout(settle, X.reducedMotion && !X.capture ? 0 : 250);
    }
    // the search page's own focus on arrival (data-quiet) shows the caret, not the suggestions
    function onFocus() { clearTimeout(blurT); if (input.dataset.quiet) { delete input.dataset.quiet; return; } open(); }
    function onBlur() { blurT = setTimeout(close, 150); }
    function onDown(e) { e.preventDefault(); } // keep focus in the field while picking
    function onClick(e) { var o = e.target.closest('[data-ta]'); if (o) { e.stopPropagation(); choose(+o.dataset.ta); } }
    // the field's own submit: Enter with nothing picked opens the results page of the type (the shell's
    // generic handler would drop the type)
    function onSubmit(e) { e.preventDefault(); e.stopPropagation(); submit(); }
    input.addEventListener('keydown', onKey);
    input.addEventListener('input', onInput);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    pop.addEventListener('mousedown', onDown);
    pop.addEventListener('click', onClick);
    form.addEventListener('submit', onSubmit);
    return function () {
      clearTimeout(blurT); clearTimeout(timer); supClose();
      input.removeEventListener('keydown', onKey); input.removeEventListener('input', onInput);
      input.removeEventListener('focus', onFocus); input.removeEventListener('blur', onBlur);
      form.removeEventListener('submit', onSubmit);
      pop.remove(); delete form.dataset.ta;
    };
  };

  // ================================================================ 2. command palette (navigation, option A)
  X.palette = (function () {
    var host = null, input, list, items = [], active = -1, back = null, timer;
    function pages(q) {
      var tk = X.qTokens(q);
      return X.NAV.filter(function (r) { return r[0] !== '#' && r[2] && (!tk.length || X.hitTokens(r[1], tk)); })
        .map(function (r) { return [r[2], null, r[0], X.hl(r[1], q), '', 'Page']; });
    }
    function build() {
      var q = input.value.trim(), type = activeType(), html = '';
      items = [];
      function group(label, rows) {
        if (!rows.length) return '';
        return '<p class="pal-label" role="presentation">' + esc(label) + '</p>' + rows.map(function (it) {
          var i = items.length; items.push(it);
          return '<div class="pal-opt" role="option" id="pal-o' + i + '" data-pal="' + i + '" aria-selected="false">' + glyph(it[2]) +
            '<span class="ta-main"><b>' + it[3] + '</b>' + (it[4] ? '<small>' + it[4] + '</small>' : '') + '</span><span class="pal-kind">' + esc(it[5]) + '</span></div>';
        }).join('');
      }
      if (q.length < 2) {
        html += group('Pages', pages(''));
        html += group('Recent ' + X.searchLabel(type).toLowerCase() + ' searches', X.recentFor(type).slice(0, 3).map(function (r) { return ['search', X.scopeParams(type, r), 'time-past', esc(r), '', 'Search']; }));
      } else {
        html += group('Pages', pages(q));
        var recs = records('parts', q, 4).concat(records('fleet', q, 3), records('wo', q, 3), records('orders', q, 3), records('manuals', q, 3), records('news', q, 2), records('kb', q, 2));
        html += group('Records', recs);
        if (!items.length) html += '<p class="ta-none">No page or record matches "' + esc(q) + '"</p>';
      }
      list.innerHTML = html;
      host.querySelector('.pal-enter').innerHTML = q ? '<kbd class="kbd">Enter</kbd> with nothing picked: search ' + esc(X.searchLabel(type).toLowerCase()) + ' for "' + esc(q) + '"' : 'Search is per type: ' + esc(X.searchLabel(type).toLowerCase()) + ' on this page';
      active = -1;
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded', String(items.length > 0));
    }
    function move(d) {
      if (!items.length) return;
      active = active < 0 ? (d > 0 ? 0 : items.length - 1) : (active + d + items.length) % items.length;
      list.querySelectorAll('.pal-opt').forEach(function (o, i) { o.setAttribute('aria-selected', String(i === active)); });
      var cur = list.querySelector('#pal-o' + active);
      input.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    }
    function go(it) { close(false); X.go(it[0], { params: it[1] || undefined }); }
    function enter() {
      clearTimeout(timer);
      if (active >= 0) { go(items[active]); return; }
      var q = input.value.trim(), type = activeType();
      if (!q) return;
      X.addRecent(type, q); X.countAttempt(type);
      close(false);
      X.go('search', { params: X.scopeParams(type, q) });
    }
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Home' && active >= 0) { e.preventDefault(); active = -1; move(1); }
      else if (e.key === 'End' && active >= 0) { e.preventDefault(); active = -1; move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); enter(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') e.preventDefault(); // focus stays in the palette: it is a modal
    }
    function open() {
      if (host) { input.focus(); input.select(); return; }
      back = document.activeElement;
      host = document.createElement('div');
      host.className = 'pal-host';
      host.innerHTML = '<div class="pal-scrim" data-pal-close></div>' +
        '<div class="pal" role="dialog" aria-modal="true" aria-label="Go to a page or record">' +
          '<div class="pal-field">' + icon('search') + '<input id="pal-q" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="pal-list" autocomplete="off" spellcheck="false" placeholder="Go to a page or record" aria-label="Go to a page or record"><kbd class="kbd">esc</kbd></div>' +
          '<div class="pal-list" id="pal-list" role="listbox" aria-label="Pages and records"></div>' +
          '<div class="pal-foot"><span class="pal-keys" aria-hidden="true"><span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> Move</span><span><kbd class="kbd">Enter</kbd> Open</span><span><kbd class="kbd">esc</kbd> Close</span></span><span class="pal-enter"></span></div>' +
        '</div>';
      document.body.appendChild(host);
      input = host.querySelector('#pal-q'); list = host.querySelector('#pal-list');
      input.addEventListener('keydown', onKey);
      input.addEventListener('input', function () {
        clearTimeout(timer);
        if (input.value.trim().length < 2) { build(); return; }
        timer = setTimeout(build, X.reducedMotion && !X.capture ? 0 : 250);
      });
      list.addEventListener('mousedown', function (e) { e.preventDefault(); });
      list.addEventListener('mousemove', function (e) {
        var o = e.target.closest('[data-pal]'); if (!o || +o.dataset.pal === active) return;
        active = +o.dataset.pal - 1; move(1);
      });
      host.addEventListener('click', function (e) {
        var o = e.target.closest('[data-pal]');
        if (o) { go(items[+o.dataset.pal]); return; }
        if (e.target.closest('[data-pal-close]')) close(true);
      });
      build();
      X.animate(host.querySelector('.pal'), [{ opacity: 0, transform: 'translateY(-6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 160 });
      input.focus();
    }
    function close(returnFocus) {
      if (!host) return;
      clearTimeout(timer);
      host.remove(); host = null;
      if (returnFocus && back && document.contains(back)) back.focus();
      back = null;
    }
    // Cmd+K / Ctrl+K anywhere, / outside a text field; captured before the shell's own shortcut
    window.addEventListener('keydown', function (e) {
      var isK = (e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K');
      var a = document.activeElement, typing = a && (/input|textarea|select/i.test(a.tagName) || a.isContentEditable);
      if (!isK && !(e.key === '/' && !typing && !e.metaKey && !e.ctrlKey)) return;
      if (!X.state.signedIn || !document.querySelector('#app .shell') || document.querySelector('.dlg-host')) return;
      e.preventDefault(); e.stopPropagation();
      if (host && isK) { close(true); return; }
      open();
    }, true);
    return { open: open, close: close, isOpen: function () { return !!host; } };
  })();

  // ================================================================ 3. results page
  X.titles.search = 'Search';
  X.views.search = function (el, p) {
    var D = X.data, UI = X.ui;
    var type = X.isSearchType(p.type) ? p.type : (p.type === 'machines' ? 'fleet' : 'parts');
    var S = X.state.search || (X.state.search = {});
    S.type = type; X.save();
    var q = p.q != null ? p.q.trim() : '', ctxAll = !!p.ctx, words = null;
    var live = D.suppliers;
    var ptypes = p.ptype ? p.ptype.split(',') : [];
    var stockOnly = p.stock === '1';
    var pending = null;
    // 1026 (CR-05): a supplier in the link is the parts scope (a shared link runs the same scoped query)
    var notes = [];
    if (type === 'parts' && p.supplier) notes.push(X.setScopeSupplier(p.supplier));
    // a described query (by link, Enter or the palette): its words become chips, the rest stays the query
    if (q && type === 'parts') {
      var pq = X.parseQuery(q);
      if (Object.keys(pq.ents).length) { X.applyWords(pq); notes.push(X.followSupplier()); words = pq; q = pq.text; ctxAll = !q; history.replaceState(null, '', url()); }
    }
    if (q) X.searchMem(type).q = q;

    var s = X.shell(el, {
      nav: 'search', q: q, crumbs: [['Home', 'home']],
      title: q || ctxAll ? 'Search results' : 'Search',
      sub: '<span id="sr-sub"></span>',
      body: '<div class="sr" id="sr"></div>',
    });
    var root = el.querySelector('#sr'), sub = el.querySelector('#sr-sub');
    // 1019 (owner): on the search page the header search widens and takes the focus, caret at the end
    var hs = el.querySelector('.page-head [data-search]');
    if (hs) {
      hs.classList.add('on-page');
      var hin = hs.querySelector('input');
      if (hin && !p.voice) setTimeout(function () { if (!document.contains(hin) || el.closest('[inert]')) return; hin.dataset.quiet = '1'; hin.focus({ preventScroll: true }); var n = hin.value.length; try { hin.setSelectionRange(n, n); } catch (e) { /* type=search */ } }, 0);
    }

    function url() {
      var o = {};
      if (q) o.q = q; else if (ctxAll) o.ctx = '1';
      if (type !== 'parts') o.type = type; else o.supplier = X.supplierFor();
      if (type === 'parts' && ptypes.length) o.ptype = ptypes.join(',');
      if (type === 'parts' && stockOnly) o.stock = '1';
      return '#/search' + (Object.keys(o).length ? '?' + new URLSearchParams(o) : '');
    }
    // ---------- parts
    function optRow(x, inGroup) {
      return '<tr class="' + (inGroup ? 'sr-opt' : 'sr-one') + '"' + goAttrs(x) + ' tabindex="0">' +
        '<td>' + (inGroup ? '<span class="cell-opt">' + esc(X.supplierOf(x.pn).name) + ' option</span>' : '<span class="cell-part">' + UI.thumb() + '<span><b>' + X.hl(x.name, q) + '</b><span class="sr-tags">' + tags(x) + also(x) + '</span></span></span>') + '</td>' +
        '<td class="nowrap"><span class="pn">' + X.hl(x.pn, q) + '</span></td>' +
        '<td>' + esc(fits(x)) + '</td>' +
        '<td>' + esc(X.supplierOf(x.pn).name) + '</td>' +
        '<td class="num">' + priceCell(x) + '</td>' +
        '<td>' + X.chip(x.stock) + '</td></tr>';
    }
    // 1026 (CR-05): the same identity from another connected supplier: 1 click runs these words there
    function also(x) { return X.alsoFrom(x).map(function (sp) { return '<button type="button" class="tag also" data-also="' + sp.id + '">Also from ' + esc(sp.name) + '</button>'; }).join(''); }
    function partsTable(groups) {
      var rows = groups.map(function (g) {
        if (g.parts.length === 1) return optRow(g.parts[0], false);
        var p0 = g.lead, low = Math.min.apply(null, g.parts.map(function (x) { return x.price; }));
        return '<tr class="sr-grp"><td><span class="cell-part">' + UI.thumb() + '<span><b>' + X.hl(p0.name, q) + '</b><span class="sr-tags"><span class="tag sup">' + g.parts.length + ' suppliers</span>' + tags(p0) + '</span></span></span></td>' +
          '<td class="muted">' + g.parts.length + ' numbers</td><td class="muted">Per supplier option</td><td>' + g.parts.map(function (x) { return esc(X.supplierOf(x.pn).name); }).join(', ') + '</td>' +
          '<td class="num"><span class="from">From</span> <b class="pr">' + X.money(low) + '</b> <span class="uom">' + per(p0) + '</span></td><td></td></tr>' +
          g.parts.map(function (x) { return optRow(x, true); }).join('');
      }).join('');
      return '<div class="tbl-wrap"><table class="tbl sr-tbl"><thead><tr><th scope="col">Part</th><th scope="col" class="nowrap">Part number</th><th scope="col">Fits</th><th scope="col">Supplier</th><th scope="col" class="num">Price</th><th scope="col">Availability</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6" class="tbl-empty">No parts with these facets. Clear a facet on the left.</td></tr>') + '</tbody></table></div>';
    }
    function facetPass(x) { return (!ptypes.length || ptypes.some(function (t) { return X.matchPartType(x, t); })) && (!stockOnly || x.stock === 'In stock'); }
    function facets(groups) {
      var flat = []; groups.forEach(function (g) { flat = flat.concat(g.parts); });
      var types = X.PART_TYPES.filter(function (t) { return flat.some(function (x) { return X.matchPartType(x, t); }); });
      function box(attr, val, label, n, on) { return '<label class="sr-check"><input type="checkbox" ' + attr + '="' + esc(val) + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span><span class="n">' + n + '</span></label>'; }
      return '<aside class="sr-facets" aria-label="Narrow these results">' +
        // 1026 (CR-05): the supplier is the scope (search bar), not a facet
        '<p class="sr-more sr-scope-note">Searching the ' + esc(X.supplier(X.supplierFor()).name) + ' catalog. ' + (D.suppliers.length - live.length) + ' more suppliers, not connected.</p>' +
        (types.length ? '<fieldset class="sr-fs"><legend class="sr-flabel">Part type</legend>' + types.map(function (t) { return box('data-ptype', t, t, flat.filter(function (x) { return X.matchPartType(x, t); }).length, ptypes.indexOf(t) >= 0); }).join('') + '</fieldset>' : '') +
        '<fieldset class="sr-fs"><legend class="sr-flabel">Availability</legend>' + box('data-stock', '1', 'In stock only', flat.filter(function (x) { return x.stock === 'In stock'; }).length, stockOnly) + '</fieldset>' +
      '</aside>';
    }
    function hideNotice(r) {
      if (type !== 'parts' || !r.base) return '';
      var prim = X.ctxPrimary();
      if (!prim.length) return '';
      return '<div class="s-hide" role="status">' + icon('filter') + '<p><b>' + prim.length + ' filter' + (prim.length === 1 ? ' is' : 's are') + ' hiding results:</b> ' +
        esc(prim.map(function (c) { return c.label + ' ' + c.value; }).join(', ')) + '. ' + nParts(r.base) + ' outside this context.</p>' +
        '<button class="btn btn-secondary" type="button" data-fb-clear>Remove ' + (prim.length === 1 ? 'filter' : 'filters') + '</button></div>';
    }
    function noResults(qq, r) {
      var lbl = X.searchLabel(type).toLowerCase(), sug = X.suggest(qq, type), tries = X.searchTry(type, qq);
      var browse = type === 'parts' ? '<a class="btn btn-brand" href="#/catalog">' + icon('grid-alt') + 'Browse the parts catalog</a>'
        : '<a class="btn btn-secondary" href="#/' + ({ news: 'kb', kb: 'kb' }[type] || type) + '">' + icon({ fleet: 'truck-side', manuals: 'book-alt', orders: 'time-past', news: 'megaphone', kb: 'notebook' }[type]) + 'Open ' + ({ fleet: 'Fleet', manuals: 'the library', orders: 'order history', news: 'the Knowledge Base', kb: 'the Knowledge Base' }[type]) + '</a>';
      return hideNotice(r) + UI.empty({ icon: 'search', tone: 'neutral', title: 'No ' + lbl + ' match ' + (qq ? '"' + qq + '"' : 'these filters'),
        text: type === 'parts' ? 'Check the spelling or try a part number. Searched the ' + X.supplier(X.supplierFor()).name + ' catalog; another connected supplier is in the search bar.' : 'Check the spelling, or search another scope from the search bar.',
        action: (sug.length ? '<div class="sr-try sr-dym">' + sug.map(function (x) { return '<a class="sr-chip" href="' + searchHref(x[1], type) + '">' + (x[0] === 'spell' ? 'Did you mean <b>' + esc(x[1]) + '</b>' : '<b>' + esc(x[1]) + '</b>') + '</a>'; }).join('') + '</div>' : '') +
          (tries.length ? '<div class="sr-try"><span>Try instead</span>' + tries.map(function (t) { return '<a class="sr-chip" href="' + searchHref(t, type) + '">' + esc(t) + '</a>'; }).join('') + '</div>' : '') + browse });
    }
    function idle() {
      var rec = X.recentFor(type);
      var go = { parts: ['catalog', 'grid-alt', 'Parts catalog', 'JLG and Skyjack, by machine and system'], fleet: ['fleet', 'truck-side', 'Fleet', 'Every unit, by location and status'],
        manuals: ['manuals', 'book-alt', 'Manuals and docs', 'The library, by machine and document type'], orders: ['orders', 'time-past', 'Order history', 'Every order, with status filters'],
        news: ['kb', 'megaphone', 'Knowledge Base', 'Recalls, bulletins and notices'], kb: ['kb', 'notebook', 'Knowledge Base', 'How-to articles and bulletins'] }[type];
      return (rec.length ? UI.sec('Recent ' + X.searchLabel(type).toLowerCase() + ' searches', '', '<div class="sr-recent">' + rec.map(function (r) { return '<a class="sr-chip" href="' + searchHref(r, type) + '">' + icon('time-past') + esc(r) + '</a>'; }).join('') + '</div>') : '') +
        (type === 'parts' ? UI.sec('Describe the part', '', '<p class="sr-hint">Write it the way you would say it. Equipment numbers, serials, models, work orders and part types become filters.</p><div class="sr-recent">' + (D.nlqExamples || []).map(function (r) { return '<a class="sr-chip" href="' + searchHref(r, 'parts') + '">' + icon('comment') + esc(r) + '</a>'; }).join('') + '</div>' +
          (X.ctxChips().length ? '<p class="sr-ctxall"><a href="#/search?ctx=1">See every part in this context' + icon('arrow-small-right') + '</a></p>' : '')) : '') +
        UI.sec('Or browse', '', '<a class="sr-browse card" href="#/' + go[0] + '">' + icon(go[1]) + '<span><b>' + go[2] + '</b><small>' + go[3] + '</small></span>' + icon('angle-small-right') + '</a>');
    }
    function render() {
      var lbl = X.scopeWords(type);
      var head = type === 'parts' ? '<div class="sr-fbar">' + UI.filterBar() + '</div>' : '';
      if (!q && !ctxAll && !pending) {
        sub.textContent = 'Search ' + lbl + '. Each search looks in 1 scope; Cmd+K jumps to any page or record.';
        root.innerHTML = head + idle();
        return;
      }
      if (type === 'parts') {
        var useQ = pending ? pending.text : q, ctx = pending ? X.ctxFromEnts(pending.ents) : X.ctx();
        var r = X.searchParts(useQ, ctx);
        head += pending ? interpHtml(useQ, pending.ents, true) : (X.ctxPrimary().length ? interpHtml(useQ, {}, false) : '');
        var mName = X.supplier(r.supplier).name;
        sub.textContent = r.groups.length + ' ' + mName + ' part' + (r.groups.length === 1 ? '' : 's') + (useQ ? ' for "' + useQ + '"' : ' in this context');
        if (!r.groups.length) { root.innerHTML = head + noResults(useQ, r); return; }
        var shown = r.groups.map(function (g) { var ps = g.parts.filter(facetPass); return ps.length ? Object.assign({}, g, { parts: ps, lead: ps[0] }) : null; }).filter(Boolean);
        root.innerHTML = head + '<div class="sr-grid">' + facets(r.groups) + '<div class="sr-main"><p class="sr-meta"><b>' + shown.length + ' part' + (shown.length === 1 ? '' : 's') + '</b> from the ' + esc(mName) + ' catalog' +
          (r.outside ? ' · ' + r.outside + ' more outside this context' : '') + (pending ? ' · press Enter to search' : '') + '</p>' + partsTable(shown) +
          X.ui.banner('Results are parts from the supplier in the search bar; models, units, work orders and part types narrow them from the filter bar. <a href="#/catalog">Browse the parts catalog</a> to see every part for a machine.', 'info') + '</div></div>';
        return;
      }
      var list = X.find(q, type);
      sub.textContent = list.length + ' ' + lbl + ' for "' + q + '"';
      if (!list.length) { root.innerHTML = head + noResults(q, { base: 0 }); return; }
      var tbl;
      if (type === 'fleet') tbl = UI.table([['Equipment'], ['Model'], ['Serial', 'nowrap'], ['Location'], ['Status'], ['Hours', 'num']], list.map(function (a) {
        return ['<b>' + X.hl(a.equip, q) + '</b>', X.hl(a.machine, q), '<span class="pn">' + X.hl(a.serial, q) + '</span>', X.hl(a.location, q), X.chip(a.status), String(a.hours)];
      }), { cls: 'sr-oth', rowAttrs: function (i) { return 'data-go="asset" data-id="' + list[i].equip + '" tabindex="0"'; } });
      else if (type === 'manuals') tbl = UI.table([['Document'], ['Type'], ['Format'], ['Language'], ['Opens at', 'nowrap']], list.map(function (x) {
        var m = x.m;
        return ['<span class="cell-part">' + UI.thumb('book-alt') + '<span><b>' + X.hl(m.title, q) + '</b>' + (x.sec ? '<span class="sub">' + X.hl(x.sec.title, q) + '</span>' + (m.format === 'text' ? '<span class="snip">' + X.hl(x.sec.text, q) + '</span>' : '') : '') + '</span></span>',
          esc(m.type), '<span class="tag">' + (m.format === 'scan' ? 'Scanned' : 'Text') + '</span>', m.language === 'es' ? 'Spanish' : 'English', 'Page ' + x.page];
      }), { cls: 'sr-oth', rowAttrs: function (i) { return 'data-go="manual" data-id="' + list[i].m.id + '" data-page="' + list[i].page + '" tabindex="0"'; } });
      else if (type === 'news' || type === 'kb') tbl = UI.table([['Item'], ['Kind'], [type === 'kb' ? 'Topic' : 'Machine and date']], list.map(function (x) {
        return ['<span class="cell-part">' + UI.thumb(type === 'kb' ? 'notebook' : 'megaphone') + '<span><b>' + X.hl(x.title, q) + '</b><span class="snip">' + X.hl(x.summary, q) + '</span></span></span>', X.chip(x.kind, { Recall: 'danger', Bulletin: 'warning', Notice: 'neutral', Article: 'info' }[x.kind]), esc(x.meta)];
      }), { cls: 'sr-oth', rowAttrs: function (i) { return 'data-go="article" data-id="' + list[i].id + '" tabindex="0"'; } });
      else tbl = UI.table([['Order'], ['Work order'], ['Supplier'], ['Status'], ['Placed', 'nowrap'], ['Total', 'num']], list.map(function (o) {
        return ['<b>' + X.hl(o.po, q) + '</b>', o.wo ? '#' + X.hl(o.wo, q) : '<span class="muted">None</span>', X.hl(o.supplier, q), X.chip(o.status, o.tone), esc(o.placed), o.kind === 'transfer' ? 'No charge' : X.money(o.total)];
      }), { cls: 'sr-oth', rowAttrs: function (i) { return 'data-go="order" data-po="' + list[i].po + '" tabindex="0"'; } });
      root.innerHTML = head + '<p class="sr-meta"><b>' + list.length + ' ' + lbl + '</b>' + ({ fleet: ' in your fleet', manuals: ' · titles and section text; scanned documents open at page 1', orders: ' · PO, work order, part number and supplier', news: ' · recalls, bulletins and notices', kb: ' · how-to articles and bulletins' }[type]) + '</p>' + tbl;
    }
    function rerender() { history.replaceState(null, '', url()); render(); }
    // the header field drives this page live (debounced in SE.searchBox): each settled query is an attempt
    X._srLive = function (v) {
      v = (v || '').trim();
      if (type === 'parts') { var pq = X.parseQuery(v); pending = Object.keys(pq.ents).length ? pq : null; q = pending ? '' : v; }
      else { pending = null; q = v; }
      if (!pending) ctxAll = false;
      var o = X.scopeParams(type, v);
      history.replaceState(null, '', '#/search' + (Object.keys(o).length ? '?' + new URLSearchParams(o) : ''));
      render();
    };
    var fbCtl = { onChange: function () { var m = X.followSupplier(); if (m) X.toast(m, 'filter'); X.searchBarSync(); rerender(); } };
    // the search bar's scope and supplier drive the page (SE.searchBox)
    X._srScope = function (t) { type = t; S.type = t; X.save(); pending = null; rerender(); };
    X._srRefresh = function () { rerender(); };
    root.addEventListener('click', function (e) {
      if (UI.filterBar.click(e, fbCtl)) return;
      var b = e.target.closest('[data-also]');
      if (b) { e.preventDefault(); e.stopPropagation(); var msg = X.setScopeSupplier(b.dataset.also); if (msg) X.toast(msg, 'filter'); X.searchBarSync(); rerender(); return; }
      var ln = e.target.closest('[data-line]');
      if (ln) { e.preventDefault(); X.go('supplier', { params: { sup: ln.dataset.sup, line: ln.dataset.line, pn: ln.dataset.pn } }); }
    });
    root.addEventListener('change', function (e) {
      var c = e.target;
      if (c.matches('[data-ptype]')) ptypes = [].slice.call(root.querySelectorAll('[data-ptype]:checked')).map(function (x) { return x.dataset.ptype; });
      else if (c.matches('[data-stock]')) stockOnly = c.checked;
      else return;
      rerender();
      var again = root.querySelector('[' + (c.dataset.ptype ? 'data-ptype="' + c.dataset.ptype : 'data-stock="1') + '"]');
      if (again) again.focus();
    });
    root.addEventListener('keydown', function (e) {
      var r = e.target.closest && e.target.closest('tr[data-go], tr[data-line]');
      if (!r || e.key !== 'Enter') return;
      if (r.dataset.line) X.go('supplier', { params: { sup: r.dataset.sup, line: r.dataset.line, pn: r.dataset.pn } }); else X.goFrom(r);
    });
    render();
    notes.filter(Boolean).forEach(function (m) { X.toast(m, 'filter'); });
    if (p.voice === 'ask') X.voice.start({ ask: true });
    else if (p.voice === '1' || p.voice === '2') X.voice.start({ phase: +p.voice });
    return function () { X._srLive = null; X._srScope = null; X._srRefresh = null; s.cleanup(); };
  };
})();
