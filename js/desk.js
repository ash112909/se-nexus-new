/* web-full supervisor desk (W2 to W6 in ../WEB-ANALYSIS.md): the rules the legacy web prototype had on the
   desktop and ARA lacked on both builds. Views call these; nothing here draws a page.
     dates        SE.desk.today() is the prototype date checkout already assumes (Wed, Oct 7, 2026; seed
                  deskToday); parse('Oct 9'), fmt(date), addBusiness(date, n)
     W2 issues()  the cart review: per line, what must change before checkout (a replaced part, a serial-priced
                  part with no unit) and what must be decided (a backordered part: alternate, branch stock, or
                  accept the wait). Blocking issues stop checkout; a backorder needs a decision.
     W3 sources(pn, dest) branch shelves that hold the part (seed branchStock, miles in branchMiles; Monterrey is
                  across the border and never a source); alloc(line) splits a line into own shelf, transfers
                  and the remainder to buy; place(lines, o) places the supplier POs for the remainder plus 1
                  Branch Transfer order (TR-NNNN) per source branch
     W5 apprItems(a), apprTotal(a), apprLog(a)  the approver's edits: quantities changed and lines removed,
                  each logged as "quantity 2 to 1"
     W6 advice(lines), window(need, picked), guard(lines, need, picked)  the needed-by rule: the earliest due
                  date of the cart's work orders against what each shipping option can do
   State: SE.state.cartAck { pn: 'backorder' }, cart lines may carry unit and from { branch: qty },
          SE.state.apprEdits { order: { items, log } }, SE.state.transfers (counter) */
(function () {
  'use strict';
  var D = SE.data, esc = SE.esc;
  var desk = SE.desk = {};
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------------------------------------------------------------- dates
  desk.today = function () { return SE.tx.today(); };
  desk.parse = function (s) { return SE.tx.parse(s); };
  desk.fmt = function (d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
  desk.iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  desk.addBusiness = function (d, n) { var x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) n--; } return x; };

  // ---------------------------------------------------------------- branches
  desk.woBranch = function (id) {
    var w = SE.wo(id), name = null;
    if (!w) return null;
    Object.keys(D.machines).forEach(function (k) { D.machines[k].units.forEach(function (u) { if (u.equip === w.equip) name = u.location; }); });
    var l = D.locations.find(function (x) { return x.name === name; });
    return l ? l.id : null;
  };
  // where the cart ships: the first work order's branch, else the chosen branch, else Austin
  desk.destination = function (lines) { lines = lines || SE.state.cart; var l = lines[0]; return l && l.shipTo || (l && l.wo && desk.woBranch(l.wo)) || (SE.state.location !== 'all' ? SE.state.location : 'austin'); };
  // 1020: a cross-border pair (Monterrey) has its miles in the routing model, not in branchMiles
  desk.miles = function (a, b) {
    if (a === b) return 0;
    var cb = (D.routing && D.routing.crossBorder) || {}, x = cb[a] ? cb[a].miles[b] : cb[b] ? cb[b].miles[a] : null;
    return D.branchMiles[[a, b].sort().join('|')] || x || null;
  };
  desk.sources = function (pn, dest) {
    var st = D.branchStock[pn] || {};
    return D.locations.filter(function (l) { return l.id !== 'monterrey' && SE.tx.stock(pn, l.id) > 0; })
      .map(function (l) { return { id: l.id, name: l.name, qty: SE.tx.stock(pn, l.id), miles: desk.miles(dest, l.id), own: l.id === dest }; })
      .sort(function (a, b) { return a.miles - b.miles; });
  };
  desk.otherStock = function (pn, dest) { return desk.sources(pn, dest).reduce(function (t, s) { return t + s.qty; }, 0); };
  desk.alloc = function (line) { return SE.tx.alloc(line); };
  desk.issues = function () { return SE.tx.issues(SE.state.cart); };
  desk.swap = function (id, to) {
    var l = SE.tx.line(id); if (!l || !SE.part(to)) return;
    l.pn = to; delete l.from; l.backorderAccepted = false;
    var u = l.unit && SE.asset(l.unit); if (u && u.model !== SE.part(to).machine) { l.unit = null; l.serial = null; }
    SE.save();
  };
  desk.place = function (lines, o) { return SE.tx.fulfill(lines, o); };

  // ---------------------------------------------------------------- W5 approver edits
  desk.apprEdit = function (a) { var e = SE.state.apprEdits || (SE.state.apprEdits = {}); return e[a.order]; };
  desk.apprItems = function (a) { var e = desk.apprEdit(a); return e ? e.items : a.items; };
  desk.apprTotal = function (a) { return Math.round(desk.apprItems(a).reduce(function (t, it) { return t + SE.part(it.pn).price * it.qty; }, 0) * 100) / 100; };
  desk.apprLog = function (a) { var e = desk.apprEdit(a); return e ? e.log : []; };
  desk.apprChange = function (a, pn, qty) {
    var e = SE.state.apprEdits || (SE.state.apprEdits = {});
    var cur = e[a.order] || (e[a.order] = { items: a.items.map(function (x) { return { pn: x.pn, qty: x.qty }; }), log: [] });
    var it = cur.items.find(function (x) { return x.pn === pn; }), was = it.qty;
    if (qty <= 0) { cur.items = cur.items.filter(function (x) { return x !== it; }); cur.log.push({ pn: pn, text: 'Removed ' + pn + ' (was ' + was + ')' }); }
    else { it.qty = qty; cur.log.push({ pn: pn, text: pn + ' quantity ' + was + ' to ' + qty }); }
    SE.save();
  };
  desk.apprReset = function (a) { if (SE.state.apprEdits) delete SE.state.apprEdits[a.order]; SE.save(); };

  // ---------------------------------------------------------------- W6 needed-by advice and guard
  // the work order the cart is most urgent for: { w, due }
  desk.urgent = function (lines) {
    var best = null;
    (lines || SE.state.cart).forEach(function (l) { var w = l.wo && SE.wo(l.wo), due = w && desk.parse(w.due); if (due && (!best || due < best.due)) best = { w: w, due: due }; });
    return best;
  };
  // the arrival window of an option: [earliest, latest]
  desk.window = function (need, picked) { return SE.tx.window(need, picked); };
  desk.backordered = function (lines) { return (lines || SE.state.cart).filter(function (l) { return SE.part(l.pn).stock === 'Backordered' && desk.alloc(l).buy > 0; }); };
  desk.advice = function (lines) {
    var u = desk.urgent(lines), std = desk.window('standard');
    if (!u) return { rec: 'standard', text: 'No work order is waiting on these parts, so standard freight is enough.' };
    var label = 'Work order #' + u.w.id + (u.w.priority === 'High' ? ' is High priority and' : '') + ' is due ' + desk.fmt(u.due);
    if (u.w.priority === 'High' || std[1] > u.due) return { rec: 'next', text: label + '. Standard arrives ' + desk.fmt(std[0]) + ' to ' + desk.fmt(std[1]) + ', too late, so next day is worth the freight.', u: u };
    return { rec: 'standard', text: label + '. Standard arrives by ' + desk.fmt(std[1]) + ', in time.', u: u };
  };
  desk.guard = function (lines, need, picked) { return SE.tx.guard(lines, need, picked); };
  desk.esc = esc;
})();
