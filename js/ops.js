/* Shared fleet-operations rules (1017, value walkthroughs V1 to V4). Packaged verbatim in each standalone build,
   after transactions.js. Attaches X.ops to ARA (iPhone) or SE (web).
     faultArticle(wo)        V1  the KB article written for the work order's fault code and model
     findFor(wo, equip)      V1  the deep link's context: search arrives filtered to the work order's unit
     kit(list, equip)        V2  a shopping list adjusted by the unit's service history
     impact(id)              V3  every unit of the recalled model, grouped by the lot fitted to it
     remediate(id, equips)   V3  1 work order per unit that needs action, in 1 action; idempotent
     sources(line)           V4  shelf transfers against the supplier purchase, costed and dated, 1 recommended
     useSource(line, key)    V4  applies a sourcing option to the cart line
     internalShare(lines)    V4  items sourced from own shelves out of all items
     money(usd, branch)      amounts in the branch's currency (MXN for Monterrey); orders settle in USD */
(function (global) {
  'use strict';
  function attach(X) {
    var D = X.data, ops = X.ops = {}, tx = X.tx;
    var LIVE = function (w) { return w.status !== 'Done' && !(X.state.cancelled || {})[w.id]; };

    // ---------- V1 fault to fix
    ops.faultCode = function (w) { var m = w && /fault code (\d+)/i.exec((w.desc || '') + ' ' + (w.issue || '')); return m ? m[1] : null; };
    ops.faultArticle = function (w) {
      if (!w) return null;
      var a = X.asset(w.equip), code = ops.faultCode(w);
      if (w.kb) return D.kb.find(function (k) { return k.id === w.kb; }) || null;
      return code && a ? D.kb.find(function (k) { return k.fault === code && k.machine === a.model; }) || null : null;
    };
    // the part a numbered step uses (null when the step uses none)
    ops.stepPart = function (art, i) { var pn = art && art.stepParts && art.stepParts[i]; return pn ? X.part(pn) : null; };
    ops.findFor = function (wo, equip) {
      if (wo && X.wo(wo)) X.setContext({ wo: wo });
      else if (equip && X.asset(equip)) X.setContext({ equip: equip, wo: null });
      return X.ctx();
    };

    // ---------- V2 kit adjusted per unit
    function date(s) { var d = tx.parse(s); return d ? d.getTime() : 0; }
    ops.history = function (equip) { return ((D.unitHistory || {})[equip] || []).slice().sort(function (a, b) { return date(b.date) - date(a.date); }); };
    ops.kit = function (list, equip) {
      var a = equip && X.asset(equip);
      if (!list || !a) return { unit: null, history: [], adds: [], flagged: [] };
      var have = {};
      list.items.forEach(function (i) { have[i.pn] = 1; var p = X.part(i.pn); if (p && p.supersededBy) have[p.supersededBy] = 1; });
      var adds = [], by = {}, flagged = [];
      ops.history(equip).slice().reverse().forEach(function (e) {
        var p = e.pn && X.part(e.pn);
        if (!p || (p.machine && p.machine !== a.model)) return;
        if (have[e.pn]) { flagged.push(e); return; }
        if (!by[e.pn]) { by[e.pn] = { pn: e.pn, qty: 1, events: [] }; adds.push(by[e.pn]); }
        by[e.pn].events.push(e);
      });
      return { unit: a, history: ops.history(equip), adds: adds, flagged: flagged };
    };
    // "drift reported on Sep 12 and a seep at the lift cylinder gland on Oct 1"
    ops.because = function (events) {
      var t = events.map(function (e) { return e.event.charAt(0).toLowerCase() + e.event.slice(1) + ' on ' + e.date.replace(/, \d{4}$/, ''); });
      return t.length > 1 ? t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1] : t[0] || '';
    };

    // ---------- V3 recall impact and bulk remediation
    ops.recall = function (id) { return (D.news || []).find(function (n) { return n.id === id && n.kind === 'Recall'; }) || null; };
    ops.done = function (id) { return ((X.state.recalls || {})[id]) || null; };
    // business days from the notice to the work orders: the outcome the recall flow is measured by
    ops.lag = function (id) {
      var n = ops.recall(id), d = ops.done(id), a = n && tx.parse(n.date), b = d && tx.parse(d.on), k = 0;
      if (!a || !b) return null;
      while (a < b) { a = tx.addBusiness(a, 1); k++; }
      return k;
    };
    ops.lagText = function (id) { var k = ops.lag(id); return k == null ? '' : k === 0 ? 'the day of the notice' : k === 1 ? '1 business day after the notice' : k + ' business days after the notice'; };
    ops.impact = function (id) {
      var n = ops.recall(id);
      if (!n) return null;
      var pn = (n.parts || [])[0], lots = n.lots || {};
      var rows = X.assets().filter(function (a) { return a.model === n.machine; }).map(function (a) {
        var lot = lots[a.equip] || null, status = !lot ? 'unknown' : lot === n.lot ? 'affected' : 'clear';
        var wo = status === 'clear' ? null : X.allWorkOrders().find(function (w) {
          if (w.equip !== a.equip || !LIVE(w)) return false;
          if (w.recall === n.id) return true;
          var ap = (D.approvals || []).find(function (x) { return x.wo === w.id; });
          return !!(ap && ap.items.some(function (i) { return i.pn === pn; }));
        }) || null;
        return { asset: a, equip: a.equip, lot: lot, status: status, wo: wo, todo: status !== 'clear' && !wo };
      });
      var order = { affected: 0, unknown: 1, clear: 2 };
      rows.sort(function (a, b) { return order[a.status] - order[b.status] || (a.todo === b.todo ? 0 : a.todo ? -1 : 1) || (a.equip < b.equip ? -1 : 1); });
      var count = function (s) { return rows.filter(function (r) { return r.status === s; }).length; };
      return { item: n, part: X.part(pn), rows: rows, affected: count('affected'), unknown: count('unknown'), clear: count('clear'),
        covered: rows.filter(function (r) { return r.wo; }).length, todo: rows.filter(function (r) { return r.todo; }) };
    };
    var TECH = { 'Austin Branch': 'J. Carter', 'San Marcos Branch': 'R. Kim', 'Kyle Branch': 'M. Torres' };
    ops.remediate = function (id, equips) {
      var im = ops.impact(id);
      if (!im) throw new Error('This recall is no longer available.');
      var n = im.item, today = tx.today(), made = [];
      im.todo.forEach(function (r) {
        if (equips && equips.indexOf(r.equip) < 0) return;
        var how = n.remedy[r.status === 'affected' ? 'replace' : 'inspect'], a = r.asset;
        var w = { id: String(100120 + X.state.newWOs.length), issue: how.issue, equip: a.equip, machine: a.machine, status: 'Scheduled', tone: 'info', updated: 'Just now',
          assignee: TECH[a.location] || D.techs[0], due: tx.short(tx.addBusiness(today, how.dueDays)), priority: how.priority, warranty: a.warranty || null,
          opened: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), kind: 'equipment', recall: n.id,
          parts: how.pn ? [{ pn: how.pn, qty: 1 }] : [],
          desc: r.status === 'affected'
            ? 'The lowering solenoid valve fitted to this unit is from lot ' + n.lot + ', which ' + X.supplierOf(how.pn).name + ' is recalling. Replace it with ' + how.pn + ' at no charge; the replacement ships with a return label.'
            : 'The lot of the lowering solenoid valve on this unit is not recorded. Read the number stamped on the valve body and record it; replace the valve if it is lot ' + n.lot + '.',
          log: [['Today', 'Created by ' + D.user.name + ' from the ' + X.supplierOf(n.parts[0]).name + ' recall of lot ' + n.lot + ', assigned to ' + (TECH[a.location] || D.techs[0])]] };
        X.state.newWOs.unshift(w);
        made.push(w);
      });
      if (made.length) {
        var rec = X.state.recalls = X.state.recalls || {}, prev = rec[id] || { wos: [] };
        rec[id] = { wos: prev.wos.concat(made.map(function (w) { return w.id; })), on: tx.iso(today) };
        X.save();
      }
      return made;
    };

    // ---------- V4 routing: shelf transfer against supplier purchase
    function loc(id) { return X.loc(id) || {}; }
    ops.money = function (usd, branch) {
      var l = loc(branch), f = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      return l.currency && l.currency !== 'USD' && l.rate ? 'MX$' + f(usd * l.rate) : '$' + f(usd);
    };
    ops.foreign = function (branch) { var l = loc(branch); return !!(l.currency && l.currency !== 'USD'); };
    function leadDays(p) {
      var m = /(\d+)\s*(day|week)/i.exec(p.eta || '');
      return m ? +m[1] * (/week/i.test(m[2]) ? 5 : 1) : p.stock === 'Backordered' ? 15 : 3;
    }
    ops.sources = function (l) {
      tx.normalizeCart();
      var R = D.routing || {}, dest = l.shipTo, p = X.part(l.pn), qty = +l.qty, keep = R.keepOnShelf || 0, cb = (R.crossBorder || {})[dest];
      if (!p || !qty) return [];
      var today = tx.today(), w = l.wo && X.wo(l.wo), due = w && tx.parse(w.due), out = [];
      var buyUSD = function (n) { return n ? p.price * n + ((R.importUSD || {})[dest] || 0) : 0; };
      var buyDays = leadDays(p) + (R.supplierTransitDays || 0) + ((R.importDays || {})[dest] || 0);
      function push(o) { o.arrive = tx.addBusiness(today, o.days); o.meets = !due || o.arrive <= due; out.push(o); }
      // own shelf at the destination: no cost, today
      var own = Math.min(qty, tx.stock(l.pn, dest));
      if (own) push({ key: 'own', kind: 'pick', source: dest, label: 'Own shelf, ' + loc(dest).name, take: own, buy: qty - own, from: (function () { var f = {}; f[dest] = own; return f; })(),
        costUSD: buyUSD(qty - own), days: qty - own ? buyDays : 0, note: own + ' on the shelf here' + (qty - own ? ', buy ' + (qty - own) : '') });
      D.locations.forEach(function (b) {
        if (b.id === dest || b.id === 'monterrey') return;
        var spare = Math.max(0, tx.stock(l.pn, b.id) - keep), take = Math.min(qty, spare);
        if (!take) return;
        var miles = cb ? cb.miles[b.id] : (D.branchMiles || {})[[b.id, dest].sort().join('|')];
        if (miles == null) return;
        var move = cb ? cb.freightUSD + cb.brokerUSD : (R.handlingUSD || 0) + miles * (R.perMileUSD || 0);
        var days = cb ? cb.days : miles <= (R.vanMiles || 0) ? 1 : 2, rest = qty - take, f = {}; f[b.id] = take;
        push({ key: 'tr-' + b.id, kind: 'transfer', source: b.id, label: 'Transfer from ' + loc(b.id).name, take: take, buy: rest, from: f, miles: miles, crossBorder: !!cb,
          moveUSD: move, costUSD: move + buyUSD(rest), days: rest ? Math.max(days, buyDays) : days,
          note: take + ' of ' + qty + ' · ' + miles + ' mi' + (cb ? ', customs broker included' : '') + ' · ' + loc(b.id).name.replace(' Branch', '') + ' keeps ' + (tx.stock(l.pn, b.id) - take) + (rest ? ' · buy ' + rest : '') });
      });
      push({ key: 'buy', kind: 'buy', source: null, label: 'Buy from ' + X.supplierOf(l.pn).name, take: 0, buy: qty, from: {}, costUSD: buyUSD(qty), days: buyDays,
        note: qty + ' × ' + ops.money(p.price, dest) + ((R.importUSD || {})[dest] ? ' · import freight ' + ops.money(R.importUSD[dest], dest) : '') });
      var pool = out.filter(function (o) { return o.meets; });
      (pool.length ? pool : out).slice().sort(function (a, b) { return a.costUSD - b.costUSD || a.days - b.days; })[0].recommended = true;
      var cur = JSON.stringify(l.from || {});
      out.forEach(function (o) { o.current = JSON.stringify(o.from) === cur; o.arriveText = tx.short(o.arrive); });
      return out;
    };
    ops.useSource = function (l, key) {
      var o = ops.sources(l).find(function (x) { return x.key === key; });
      if (!o) return null;
      l.from = JSON.parse(JSON.stringify(o.from));
      tx.normalizeCart(); X.save();
      return o;
    };
    ops.internalShare = function (lines) {
      lines = lines || X.state.cart || [];
      var all = 0, mine = 0;
      lines.forEach(function (l) { var a = tx.alloc(l); all += +l.qty || 0; mine += a.own + a.moved; });
      return { items: all, internal: mine, pct: all ? Math.round(mine * 100 / all) : 0 };
    };
  }
  global.ARA_OPS = { attach: attach };
  if (global.ARA && global.ARA.tx) attach(global.ARA); else if (global.SE && global.SE.tx) attach(global.SE);
})(typeof window !== 'undefined' ? window : globalThis);
