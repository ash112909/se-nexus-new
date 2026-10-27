/* Contextual filter bar (DES-52, use case 3), web. Same context rules as the mobile build (mobile/ui/filterbar.js).
   The search context lives in SE.state.ctx (SE.ctx / setContext / clearContext in app.js) and persists for the
   session, across pages. This file adds:
     SE.matchPartType, SE.partHay, SE.qTokens, SE.hitTokens, SE.ctxModel, SE.partInContext, SE.ctxChips,
     SE.ctxPrimary, SE.ctxRemove        (see the mobile file for each rule)
     SE.ui.filterBar(o)                 the chip row (html); o.note: false hides the "filled from" caption
     SE.ui.filterBar.click(e, o)        handles the row's buttons (o.onChange re-runs results); true when handled
     SE.ui.filterBar.open(o)            the Filters dialog: work order, equipment, serial, model, part type, keyword
   Any page can embed the bar: render SE.ui.filterBar() and call SE.ui.filterBar.click first in its click handler. */
(function () {
  'use strict';
  var X = window.SE, D = X.data;

  // ---------------------------------------------------------------- context rules (same code on mobile)
  var TYPE_RX = { Seal: /seal|o-ring/i, Filter: /filter/i, Fluid: /\boil\b|fluid/i, Valve: /valve/i, Hose: /hose/i, Cylinder: /cylinder/i };
  X.PART_TYPES = ['Seal', 'Filter', 'Fluid', 'Valve', 'Hose', 'Cylinder', 'Assembly', 'Component', 'Consumable', 'Accessory'];
  X.SEARCH_STOP = { for: 1, the: 1, on: 1, a: 1, an: 1, of: 1, to: 1, with: 1, in: 1, my: 1, from: 1, and: 1, at: 1, fits: 1, fit: 1, that: 1, i: 1, need: 1, find: 1, me: 1, show: 1, unit: 1 };
  X.matchPartType = function (p, t) { return p.type === t || !!(TYPE_RX[t] && TYPE_RX[t].test(p.name)); };
  X.lineName = function (p) {
    if (!p.enhanced) return '';
    var l = (D.enhancedCategories[p.supplier] || []).find(function (x) { return x[0] === p.enhanced; });
    return l ? l[1] : p.enhanced;
  };
  X.partHay = function (p) {
    var m = p.machine && X.machine(p.machine), s = X.supplierOf(p.pn);
    return [p.name, p.pn, p.pn.replace(/-/g, ''), (p.xrefs || []).join(' '), m ? m.name + ' ' + m.model + ' ' + m.make : '', p.sub || '', p.type || '', s ? s.name : '', X.lineName(p), p.identity || ''].join(' ').toLowerCase();
  };
  X.qTokens = function (q) {
    return String(q || '').toLowerCase().replace(/[“”"?!,;:]/g, ' ').split(/\s+/).filter(function (t) { return t && !X.SEARCH_STOP[t]; });
  };
  function tokHit(hay, t) {
    if (hay.indexOf(t) >= 0) return true;
    var bare = t.replace(/[-\s]/g, '');
    if (bare !== t && bare.length > 2 && hay.indexOf(bare) >= 0) return true;
    return t.length > 3 && /s$/.test(t) && hay.indexOf(t.slice(0, -1)) >= 0; // plurals: seals, hoses
  }
  X.hitTokens = function (hay, tk) { hay = hay.toLowerCase(); return tk.every(function (t) { return tokHit(hay, t); }); };

  function woAsset(c) { var w = c.wo && X.wo(c.wo); return w ? X.asset(w.equip) : null; }
  function unitAsset(c) { return (c.equip && X.asset(c.equip)) || (c.serial && X.asset(c.serial)) || null; }
  X.ctxModel = function (c) {
    c = c || X.ctx();
    if (c.model) return c.model;
    var a = unitAsset(c);
    return a ? a.model : null;
  };
  X.partInContext = function (p, c) {
    c = c || X.ctx();
    var m = X.ctxModel(c);
    if (m) {
      if (p.machine && p.machine !== m) return false;
      if (!p.machine && p.supplier !== X.machine(m).supplier) return false; // a supplier line fits that supplier's machines
    }
    if (c.type && !X.matchPartType(p, c.type)) return false;
    if (c.keyword && !X.hitTokens(X.partHay(p), X.qTokens(c.keyword))) return false;
    return true;
  };
  var LABEL = { wo: 'Work order', equip: 'Equipment', serial: 'Serial', model: 'Model', type: 'Part type', keyword: 'Keyword' };
  X.ctxLabel = function (k) { return LABEL[k]; };
  X.ctxValue = function (k, v) {
    if (k === 'wo') return '#' + v;
    if (k === 'model') { var m = X.machine(v); return m ? m.name : v; }
    if (k === 'keyword') return '"' + v + '"';
    return v;
  };
  X.ctxChips = function (c) {
    c = c || X.ctx();
    var wa = woAsset(c), ua = unitAsset(c), out = [];
    ['wo', 'equip', 'serial', 'model', 'type', 'keyword'].forEach(function (k) {
      if (!c[k]) return;
      var from = null;
      if (k === 'equip' && wa && wa.equip === c.equip) from = 'Work order #' + c.wo;
      if (k === 'serial' && wa && wa.serial === c.serial) from = 'Work order #' + c.wo;
      else if (k === 'serial' && !wa && c.equip && ua && ua.serial === c.serial) from = 'Equipment ' + c.equip;
      if (k === 'model' && wa && wa.model === c.model) from = 'Work order #' + c.wo;
      else if (k === 'model' && !from && ua && ua.model === c.model) from = c.equip ? 'Equipment ' + c.equip : 'Serial ' + c.serial;
      out.push({ key: k, label: LABEL[k], value: X.ctxValue(k, c[k]), derived: !!from, from: from });
    });
    return out;
  };
  // the chips that are not filled from another: what a person chose
  X.ctxPrimary = function (c) { return X.ctxChips(c).filter(function (x) { return !x.derived; }); };
  X.ctxRemove = function (key) {
    var c = Object.assign({}, X.ctx()), wa = woAsset(c), ua = unitAsset(c);
    if (key === 'wo') {
      if (wa) { if (c.equip === wa.equip) delete c.equip; if (c.serial === wa.serial) delete c.serial; if (c.model === wa.model) delete c.model; }
      delete c.wo;
    } else if (key === 'equip') {
      if (ua) { if (c.serial === ua.serial) delete c.serial; if (c.model === ua.model) delete c.model; }
      delete c.equip; delete c.wo;
    } else if (key === 'model') {
      delete c.model; delete c.equip; delete c.serial; delete c.wo;
    } else delete c[key];
    X.state.ctx = c;
    var mem = X.state.search && X.state.search.parts;
    if (mem && mem.fromWords) mem.fromWords = mem.fromWords.filter(function (k) { return c[k]; });
    X.save();
  };

  // ---------------------------------------------------------------- the bar (web)
  var esc = X.esc, icon = X.icon;
  function chip(c) {
    return '<span class="fb-chip' + (c.derived ? ' derived' : '') + '"' + (c.from ? ' title="Filled from ' + esc(c.from) + '"' : '') + '><span class="k">' + esc(c.label) + '</span><b>' + esc(c.value) + '</b>' +
      '<button class="fb-x" type="button" data-fb-remove="' + c.key + '" aria-label="Remove ' + esc(c.label + ' ' + c.value) + (c.from ? ', filled from ' + esc(c.from) : '') + '">' + icon('cross-small') + '</button></span>';
  }
  X.ui.filterBar = function (o) {
    o = o || {};
    var chips = X.ctxChips(), prim = chips.filter(function (c) { return !c.derived; }).length;
    var wo = X.ctx().wo, filled = chips.filter(function (c) { return c.derived; });
    return '<div class="fbar-wrap"><div class="fbar" role="group" aria-label="Search context">' +
      '<button class="fb-add' + (chips.length ? ' on' : '') + '" type="button" data-fb-open aria-haspopup="dialog">' + icon('settings-sliders') +
        '<span>' + (chips.length ? 'Filters' : 'Add filters') + '</span>' + (prim ? '<span class="n">' + prim + '</span>' : '') + '</button>' +
      chips.map(chip).join('') +
      (prim > 1 ? '<button class="fb-clear btn-link" type="button" data-fb-clear>Clear all</button>' : '') +
      (o.note !== false && filled.length ? '<span class="fb-note">' + esc((wo ? 'Work order #' + wo : filled[0].from) + ' filled ' + filled.map(function (c) { return c.label.toLowerCase(); }).join(', ').replace(/, ([^,]*)$/, ' and $1')) + '</span>' : '') +
      '</div></div>';
  };

  // ---------------------------------------------------------------- the dialog: 6 facets as fields
  function options(k) {
    if (k === 'wo') return X.allWorkOrders().filter(function (w) { return w.status !== 'Done' && !(X.state.cancelled || {})[w.id]; }).map(function (w) { return [w.id, '#' + w.id + ' · ' + w.equip + ' · ' + w.machine]; });
    if (k === 'equip') return X.assetsHere().map(function (a) { return [a.equip, a.equip + ' · ' + a.machine + ' · ' + a.location]; });
    if (k === 'serial') return X.assetsHere().map(function (a) { return [a.serial, a.serial + ' · ' + a.equip]; });
    if (k === 'model') return Object.keys(D.machines).map(function (m) { return [m, D.machines[m].name]; });
    if (k === 'type') return X.PART_TYPES.filter(function (t) { return D.parts.some(function (p) { return X.matchPartType(p, t); }); }).map(function (t) { return [t, t]; });
    return [];
  }
  X.ui.filterBar.open = function (o) {
    o = o || {};
    var c = X.ctx();
    function sel(k) {
      return '<div class="field fbd-f"><label for="fbd-' + k + '">' + esc(LABEL[k]) + '</label><select class="fbd-sel" id="fbd-' + k + '" data-fk="' + k + '"><option value="">Any</option>' +
        options(k).map(function (r) { return '<option value="' + esc(r[0]) + '"' + (c[k] === r[0] ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('') + '</select></div>';
    }
    var d = X.ui.dialog({
      title: 'Filters',
      body: '<p class="fbd-lead">Scope parts search to the work you are doing. A work order fills in its equipment, serial and model; a serial shows the price of serial-priced parts.</p>' +
        '<div class="fbd-grid">' + sel('wo') + sel('equip') + sel('serial') + sel('model') + sel('type') +
        '<div class="field fbd-f"><label for="fbd-keyword">Keyword</label><input class="fbd-sel" id="fbd-keyword" data-fk="keyword" type="text" autocomplete="off" value="' + esc(c.keyword || '') + '"></div></div>' +
        '<p class="fbd-derived" aria-live="polite"></p>',
      foot: '<button class="btn btn-link fbd-clear" type="button" data-fbd-clear>Clear all</button><button class="btn btn-secondary" type="button" data-dlg-close>Cancel</button><button class="btn btn-primary" type="button" data-fbd-apply>Apply filters</button>',
    });
    var root = d.el, f = function (k) { return root.querySelector('[data-fk="' + k + '"]'); };
    function note(msg) { root.querySelector('.fbd-derived').textContent = msg || ''; }
    // a work order fills equipment, serial and model; equipment fills serial and model
    root.addEventListener('change', function (e) {
      var k = e.target.dataset.fk, v = e.target.value, a;
      if (k === 'wo' && v) { var w = X.wo(v); a = w && X.asset(w.equip); if (a) { f('equip').value = a.equip; f('serial').value = a.serial; f('model').value = a.model; note('Work order #' + v + ' filled equipment ' + a.equip + ', serial ' + a.serial + ' and model ' + a.machine + '.'); } }
      else if (k === 'equip' && v) { a = X.asset(v); f('wo').value = ''; if (a) { f('serial').value = a.serial; f('model').value = a.model; note('Equipment ' + v + ' filled serial ' + a.serial + ' and model ' + a.machine + '.'); } }
      else if (k === 'serial' && v) { a = X.asset(v); f('wo').value = ''; f('equip').value = ''; if (a) { f('model').value = a.model; note('Serial ' + v + ' filled model ' + a.machine + '.'); } }
      else if (k === 'model') { var cur = X.asset(f('serial').value || f('equip').value); if (cur && cur.model !== v) { f('wo').value = ''; f('equip').value = ''; f('serial').value = ''; note(''); } }
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-fbd-clear]')) { root.querySelectorAll('[data-fk]').forEach(function (x) { x.value = ''; }); note('Every filter cleared. Apply to search the whole catalog.'); return; }
      if (!e.target.closest('[data-fbd-apply]')) return;
      var v = {}; root.querySelectorAll('[data-fk]').forEach(function (x) { v[x.dataset.fk] = x.value.trim(); });
      X.clearContext();
      var next = { type: v.type || null, keyword: v.keyword || null };
      if (v.wo) next.wo = v.wo;
      else if (v.equip) next.equip = v.equip;
      else if (v.serial) { next.serial = v.serial; next.model = v.model || null; }
      else if (v.model) next.model = v.model;
      X.setContext(next);
      var mem = X.state.search && X.state.search.parts; if (mem) mem.fromWords = [];
      X.save();
      d.close();
      o.onChange && o.onChange();
    });
    return d;
  };
  X.ui.filterBar.click = function (e, o) {
    var t = e.target.closest('[data-fb-open],[data-fb-remove],[data-fb-clear]');
    if (!t || t.closest('[inert]')) return false;
    e.preventDefault();
    if (t.hasAttribute('data-fb-open')) { X.ui.filterBar.open(o); return true; }
    if (t.hasAttribute('data-fb-clear')) { X.clearContext(); var m = X.state.search && X.state.search.parts; if (m) m.fromWords = []; X.save(); }
    else X.ctxRemove(t.dataset.fbRemove);
    o.onChange && o.onChange();
    return true;
  };
})();
