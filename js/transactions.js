/* Shared transaction rules. Packaged verbatim in each standalone build. */
(function (global) {
  'use strict';
  function attach(X) {
    var D = X.data, tx = X.tx = {}, originalSave = X.save;
    function copy(v) { return JSON.parse(JSON.stringify(v)); }
    function state() {
      var s = X.state;
      ['stockUsed', 'submissions'].forEach(function (k) { if (!s[k]) s[k] = {}; });
      if (!s.nextLine) s.nextLine = 1;
      return s;
    }
    tx.today = function () { var s = (D.deskToday && D.deskToday.iso) || '2026-10-07'; return tx.parse(s); };
    tx.short = function (d) { if (typeof d === 'string') d = tx.parse(d); return d && isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };
    tx.iso = function (d) { if (typeof d === 'string') d = tx.parse(d); return d && isFinite(d.getTime()) ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : ''; };
    tx.parse = function (s) {
      if (s instanceof Date) return new Date(s);
      if (!s) return null;
      var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s)), d;
      if (m) { d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; }
      m = /^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?$/.exec(String(s));
      if (!m) return null;
      var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]);
      if (month < 0) return null;
      d = new Date(m[3] ? +m[3] : +(D.deskToday || { iso: '2026-10-07' }).iso.slice(0,4), month, +m[2]);
      return d.getMonth() === month && d.getDate() === +m[2] ? d : null;
    };
    tx.addBusiness = function (d, n) { d = new Date(d); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; } return d; };
    tx.window = function (need, picked) {
      var t = tx.today();
      if (need === 'standard') return [tx.addBusiness(t,3),tx.addBusiness(t,5)];
      if (need === 'next') { var n = tx.addBusiness(t,1); return [n,n]; }
      var p = need === 'date' && tx.parse(picked); return p ? [p,p] : null;
    };
    tx.guard = function (lines, need, picked) {
      var win = tx.window(need,picked), min = tx.addBusiness(tx.today(),1);
      if (!win) return need === 'date' ? 'Choose a valid needed-by date.' : 'Choose when you need the parts.';
      if (win[0] < min) return 'Choose a date from ' + tx.short(min) + '.';
      var urgent = null;
      (lines || X.state.cart).forEach(function (l) { var w = l.wo && X.wo(l.wo), due = w && tx.parse(w.due); if (due && (!urgent || due < urgent.due)) urgent = { w:w, due:due }; });
      if (urgent && win[1] > urgent.due) return 'This arrives after work order #' + urgent.w.id + ' is due (' + tx.short(urgent.due) + '). Choose an earlier option or update the work order due date.';
      return null;
    };
    function assetFor(l, options) {
      options = options || {};
      var id = l.unit || l.equip || options.unit || options.equip;
      if (id && typeof id === 'object') id = id.equip;
      if (id) return X.asset(id);
      var w = l.wo && X.wo(l.wo), a = w && X.asset(w.equip);
      if (a) return a;
      var c = X.ctx ? X.ctx() : {}, p = X.part(l.pn);
      return c.equip && p && (!p.machine || c.model === p.machine) ? X.asset(c.equip) : null;
    }
    tx.woBranch = function (wo) { var w = X.wo(wo), a = w && X.asset(w.equip); return a && (D.locations.find(function (l) { return l.name === a.location; }) || {}).id || null; };
    function destination(l, options) {
      return l.shipTo || (options || {}).shipTo || (l.wo && tx.woBranch(l.wo)) || (X.state.location !== 'all' && X.state.location) || 'austin';
    }
    function normalize(l, options) {
      options = options || {};
      if (!l.wo && options.wo) l.wo = options.wo;
      l.wo = l.wo || null;
      var a = assetFor(l,options);
      if (a) { l.unit = a.equip; l.serial = a.serial; }
      l.shipTo = destination(l,options);
      if (options.backorderAccepted) l.backorderAccepted = true;
      if (!l.id) l.id = 'line-' + state().nextLine++;
      var remaining = Number.isInteger(+l.qty) && +l.qty > 0 ? +l.qty : 0, from = {};
      Object.keys(l.from || {}).forEach(function (b) { var q = Math.max(0, Math.floor(+l.from[b] || 0)); q = Math.min(q,remaining); if (q) from[b] = q; remaining -= q; });
      l.from = from;
      return l;
    }
    tx.normalizeCart = function () {
      state();
      (X.state.cart || []).forEach(function (l) {
        normalize(l);
        var ack = X.state.cartAck || {};
        if (ack[l.id] === 'backorder' || (ack[l.pn] === 'backorder' && X.state.cart.filter(function (r) { return r.pn === l.pn; }).length === 1)) l.backorderAccepted = true;
      });
      return X.state.cart;
    };
    tx.line = function (id) {
      tx.normalizeCart();
      var exact = X.state.cart.find(function (l) { return l.id === id; });
      if (exact) return exact;
      var matches = X.state.cart.filter(function (l) { return l.pn === id; }); return matches.length === 1 ? matches[0] : null;
    };
    tx.stock = function (pn, branch) { return Math.max(0, (((D.branchStock || {})[pn] || {})[branch] || 0) - (((state().stockUsed || {})[pn] || {})[branch] || 0)); };
    tx.alloc = function (line) {
      normalize(line);
      var own = 0, moved = 0;
      Object.keys(line.from).forEach(function (b) { if (b === line.shipTo) own += line.from[b]; else moved += line.from[b]; });
      return { own:own, moved:moved, buy:Math.max(0,+line.qty-own-moved), from:copy(line.from) };
    };
    function near(l) {
      return D.locations.filter(function (b) { return b.id !== 'monterrey' && tx.stock(l.pn,b.id) > 0; }).map(function (b) {
        return { id:b.id,name:b.name,qty:tx.stock(l.pn,b.id),own:b.id === l.shipTo,miles:b.id === l.shipTo ? 0 : ((D.branchMiles || {})[[b.id,l.shipTo].sort().join('|')] || ((((D.routing || {}).crossBorder || {})[l.shipTo] || {}).miles || {})[b.id] || null) };
      });
    }
    tx.issues = function (lines) {
      lines = lines || X.state.cart; if (lines === X.state.cart) tx.normalizeCart();
      var out = [], used = {};
      function add(l,kind,title,text,extra) { out.push(Object.assign({lineId:l.id,id:l.id,pn:l.pn,kind:kind,blocking:true,title:title,text:text},extra)); }
      lines.forEach(function (l) {
        normalize(l);
        var p = X.part(l.pn), a = p && assetFor(l), allocation = tx.alloc(l), w = l.wo && X.wo(l.wo);
        if (!p) { add(l,'missing','Part unavailable','Remove this unavailable part and search the current catalog.'); return; }
        if (!Number.isInteger(+l.qty) || +l.qty < 1 || +l.qty > 9999) add(l,'quantity','Check quantity','Use a whole quantity between 1 and 9999.');
        if (w && tx.woBranch(l.wo) && l.shipTo !== tx.woBranch(l.wo)) add(l,'destination','Work-order destination changed','Ship this line to ' + X.loc(tx.woBranch(l.wo)).name + ', the work order unit branch.');
        if (!X.loc(l.shipTo)) add(l,'destination','Choose a destination','Select a valid branch for this line.');
        if (l.wo && !w) add(l,'work-order','Work order unavailable','Choose an existing work order or remove its association.');
        if (p.supersededBy) add(l,'replaced','Replaced by ' + p.supersededBy,'The retired part cannot be ordered. Use its replacement.',{to:p.supersededBy});
        if (a && w && a.equip !== w.equip) add(l,'serial','Unit does not match work order','Choose the unit linked to this work order.');
        if ((p.serialPricing && !a) || (a && p.machine && a.model !== p.machine)) add(l,'serial','Choose a compatible unit','The unit and serial must match this part before it can be ordered.');
        if (p.stock === 'Backordered' && allocation.buy > 0 && !l.backorderAccepted) add(l,'backorder','Backorder decision needed','Choose an alternate, use branch stock, or accept the supplier wait.',{alt:p.alternate,near:near(l)});
        Object.keys(l.from).forEach(function (b) {
          var key = l.pn + '|' + b; used[key] = (used[key] || 0) + l.from[b];
          if (b === 'monterrey' || !X.loc(b)) add(l,'stock','Source branch unavailable','This branch cannot supply shelf stock.');
          else if (used[key] > tx.stock(l.pn,b)) add(l,'stock','Shelf stock changed','Reduce the allocation from ' + X.loc(b).name + ' or buy the remainder.');
        });
      });
      return out;
    };
    tx.validate = function (lines) {
      if (!lines || !lines.length) { var empty = new Error('There are no lines to submit.'); empty.issues = []; throw empty; }
      var list = tx.issues(lines);
      if (list.length) { var error = new Error(list[0].title + '. ' + list[0].text); error.issues = list; throw error; }
      return true;
    };
    function identity(l) { return [l.pn,l.wo || '',l.unit || '',l.serial || '',l.shipTo].join('|'); }
    X.addToCart = function (pn, qty, wo, options) {
      options = options || {}; if (!X.part(pn)) throw new Error('Part not found: ' + pn);
      if (!Number.isInteger(+qty) || +qty < 1) throw new Error('Choose a positive whole quantity.');
      tx.normalizeCart();
      var next = normalize({pn:pn,qty:+qty,wo:wo || null,from:copy(options.from || {})},options), found = X.state.cart.find(function (l) { return identity(l) === identity(next); });
      if (found) { found.qty += +qty; Object.keys(next.from || {}).forEach(function (b) { found.from[b] = (found.from[b] || 0) + next.from[b]; }); if (options.backorderAccepted) found.backorderAccepted = true; }
      else { next.quote = {part:pn,unit:next.unit || null,price:X.part(pn).price,currency:'USD',uom:X.part(pn).uom,date:tx.iso(tx.today())}; X.state.cart.push(next); }
      X.save(); if (X.refreshShell) X.refreshShell();
      // 1017 (owner): the cart icon shows a dot, never a number; the count lives in the button's accessible name
      if (global.document) { var cn = X.cartCount(); document.querySelectorAll('[data-cart-badge]').forEach(function (b) { b.textContent = ''; b.hidden = !cn; if (b.parentNode) b.parentNode.setAttribute('aria-label', 'Cart, ' + cn + ' items'); }); }
      return found || next;
    };
    X.cartTotal = function () { return (X.state.cart || []).reduce(function (t,l) { var p = X.part(l.pn); return t + (p ? p.price * tx.alloc(l).buy : 0); },0); };
    tx.fulfill = function (lines, options) {
      var o = options || {}, list = lines.map(function (l) { normalize(l,o); return copy(l); });
      var fingerprint = JSON.stringify({lines:list.map(function (l) { return [l.id,l.pn,+l.qty,l.wo,l.unit,l.serial,l.shipTo,l.from,!!l.backorderAccepted]; }),need:o.need || '',picked:o.picked || '',needBy:o.needBy || '',note:o.note || '',from:o.from || 'cart'});
      var key = o.idempotencyKey || 'draft:' + fingerprint, previous = state().submissions[key];
      if (previous) { if (previous.fingerprint !== fingerprint) throw new Error('This order was already submitted with different details. Review it in Order History.'); return previous.records.map(function (id) { return X.order(id); }).filter(Boolean); }
      tx.validate(list);
      if (o.need) { var guard = tx.guard(list,o.need,o.picked); if (guard) throw new Error(guard); }
      var groups = {};
      function add(l,kind,source,qty) {
        if (!qty) return;
        var supplier = kind === 'purchase' ? X.supplierOf(l.pn).name : kind === 'pick' ? 'Shelf pick, ' + X.loc(l.shipTo).name : 'Branch transfer from ' + X.loc(source).name;
        var k = [kind,supplier,source || '',l.shipTo,l.wo || ''].join('|');
        if (!groups[k]) groups[k] = { kind:kind,supplier:supplier,source:source,shipTo:l.shipTo,wo:l.wo,items:[] };
        groups[k].items.push({id:l.id,pn:l.pn,qty:qty,wo:l.wo,unit:l.unit || null,serial:l.serial || null,shipTo:l.shipTo,quote:l.quote || null});
      }
      list.forEach(function (l) { var a = tx.alloc(l); add(l,'purchase',null,a.buy); Object.keys(a.from).forEach(function (b) { add(l,b === l.shipTo ? 'pick' : 'transfer',b,a.from[b]); }); });
      var today = tx.today(), date = today.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), when = date;
      var made = Object.keys(groups).map(function (k) {
        var g = groups[k], po;
        if (g.kind === 'purchase') { var n = X.state.nextPO || D.nextPO; X.state.nextPO = n+1; po = 'PO-' + n; }
        else if (g.kind === 'transfer') { X.state.transfers = (X.state.transfers || 4410)+1; po = 'TR-' + X.state.transfers; }
        else { X.state.nextPick = (X.state.nextPick || 0)+1; po = 'PICK-' + X.state.nextPick; }
        var status = g.kind === 'purchase' ? 'Submitted' : g.kind === 'pick' ? 'Picked' : 'Requested';
        return {po:po,kind:g.kind === 'purchase' ? 'purchase' : g.kind,wo:g.wo,supplier:g.supplier,from:g.source || o.from || 'cart',shipTo:g.shipTo,items:g.items,status:status,tone:g.kind === 'pick' ? 'success' : 'info',placed:date,eta:g.kind === 'purchase' ? 'Awaiting supplier confirmation' : g.kind === 'pick' ? 'Picked from branch shelf' : 'Transfer requested',carrier:g.kind === 'purchase' ? 'Pending' : g.kind === 'pick' ? 'Shelf pick' : 'Branch van',tracking:null,needBy:o.needBy || null,note:o.note || '',isNew:true,total:g.kind === 'purchase' ? Math.round(g.items.reduce(function (t,i) { return t + X.part(i.pn).price*i.qty; },0)*100)/100 : 0,steps:[[status,when],[g.kind === 'purchase' ? 'Supplier confirmation' : g.kind === 'pick' ? 'Issued to work order' : 'Received at destination',null]]};
      });
      list.forEach(function (l) { Object.keys(l.from).forEach(function (b) { var used = state().stockUsed; if (!used[l.pn]) used[l.pn] = {}; used[l.pn][b] = (used[l.pn][b] || 0) + l.from[b]; }); });
      X.state.placed = made.concat(X.state.placed || []);
      state().submissions[key] = {fingerprint:fingerprint,records:made.map(function (r) { return r.po; })};
      X.save(); return made;
    };
    X.placeOrder = function (lines, options) { return tx.fulfill(lines,options); };
    tx.exportCSV = function (lines) {
      var rows = [['Part number','Part','Supplier','Demand quantity','Own shelf','Transfer quantity','Buy quantity','Unit price USD','Purchase total USD','Currency','Work order','Unit','Serial','Destination','Price status','Shelf sources']];
      (lines || X.state.cart).forEach(function (l) { normalize(l); var p = X.part(l.pn), a = tx.alloc(l), unit = assetFor(l), priced = p && (!p.serialPricing || (unit && unit.model === p.machine));
        rows.push([l.pn,p ? p.name : 'Unavailable',p ? X.supplierOf(l.pn).name : '',l.qty,a.own,a.moved,a.buy,priced ? p.price.toFixed(2) : '',priced ? (p.price*a.buy).toFixed(2) : '','USD',l.wo || '',l.unit || '',l.serial || '',(X.loc(l.shipTo) || {}).name || l.shipTo,priced ? 'Catalog estimate' : 'Unit required',Object.keys(a.from).map(function (b) { return b + ': ' + a.from[b]; }).join('; ')]); });
      return rows.map(function (r) { return r.map(function (c) { c=String(c); if (/^[=+@\-]/.test(c)) c="'"+c; return /[",\r\n]/.test(c) ? '"'+c.replace(/"/g,'""')+'"' : c; }).join(','); }).join('\r\n')+'\r\n';
    };
    tx.download = function (name, text, type) {
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text],{type:type || 'text/plain;charset=utf-8'}));
      a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function () { URL.revokeObjectURL(url); },1000);return true;
    };
    tx.shareCart = function (lines) {
      var data = {version:1,lines:(lines || X.state.cart).map(function (l) { return {pn:l.pn,qty:l.qty,wo:l.wo || null,unit:l.unit || null,shipTo:l.shipTo}; })};
      var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      return location.href.split('?')[0].split('#')[0]+'#/cart?import='+encoded;
    };
    tx.readSnapshot = function (value) {
      if (typeof value !== 'string' || value.length > 64000) throw new Error('This cart snapshot is invalid or too large.');
      var d;try { d=JSON.parse(decodeURIComponent(escape(atob(value.replace(/-/g,'+').replace(/_/g,'/'))))); } catch(e) { throw new Error('This cart snapshot could not be read.'); }
      if (d.version!==1 || !Array.isArray(d.lines) || !d.lines.length || d.lines.length>100) throw new Error('This cart snapshot has no supported lines.');
      return d.lines.map(function (l) { if (!X.part(l.pn) || !Number.isInteger(l.qty) || l.qty<1 || l.qty>9999 || (l.wo && !X.wo(l.wo)) || (l.unit && !X.asset(l.unit)) || (l.shipTo && !X.loc(l.shipTo))) throw new Error('A snapshot line has unavailable part, work order, unit or destination.'); return {pn:l.pn,qty:l.qty,wo:l.wo || null,unit:l.unit || null,shipTo:l.shipTo || null}; });
    };
    tx.importCart = function (value) { var lines=tx.readSnapshot(value);lines.forEach(function (l) { X.addToCart(l.pn,l.qty,l.wo,{unit:l.unit,shipTo:l.shipTo}); });return lines.length; };
    tx.calendar = function (notice) {
      var n = notice || {}, detail = n.detail || {}, event = detail.calendarEvent || n.event || {}, start = event.start || n.start;
      if (!start || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(start) || !isFinite(Date.parse(start))) throw new Error('This notice has no scheduled calendar event.');
      function esc(value) { return String(value || '').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
      function stamp(value) { return value.replace(/[-:]/g,''); }
      var locationText = event.location || n.location || ((detail.facts || []).find(function (f) { return f[0] === 'Where'; }) || [])[1] || '';
      var rows = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mid-County//ARA Notice//EN','BEGIN:VEVENT','UID:'+esc(n.id || 'notice')+'@ara.local','DTSTAMP:'+tx.iso(tx.today()).replace(/-/g,'')+'T120000Z','DTSTART:'+stamp(start)];
      if (event.end) rows.push('DTEND:'+stamp(event.end));
      rows.push('SUMMARY:'+esc(detail.title || n.title || 'Fleet notice'),'DESCRIPTION:'+esc((detail.body || []).join('\n') || n.text || detail.lede || ''),'LOCATION:'+esc(locationText),'END:VEVENT','END:VCALENDAR','');
      return tx.download((n.id || 'fleet-notice')+'.ics',rows.join('\r\n'),'text/calendar;charset=utf-8');
    };
    X.save = function () { tx.normalizeCart(); originalSave(); };
    tx.normalizeCart();
  }
  global.ARA_TX={attach:attach};
  if (global.ARA) attach(global.ARA); else if (global.SE) attach(global.SE);
})(typeof window !== 'undefined' ? window : globalThis);
