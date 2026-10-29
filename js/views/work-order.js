/* Work order detail (B4, legacy web 18, 28 to 30). Left: issue and description, the parts request and
   its state (awaiting approval, approved with its PO, returned with the reason), orders placed against
   the work order, notes timeline with add-note input, activity log. Right panel: status, unit (asset,
   serial, branch), assignee and dates.
   Actions: Find parts (catalog keeps the work order) and Cancel work order (dialog with a reason).
   Done and cancelled work orders show no actions.
   Supervisor desk (web-full W4): status, priority, assignee and due date are edited in the details panel and
   save at once; each change goes into the activity log ("Priority Medium to High, by Sarah Martinez"). Done
   and cancelled work orders can be archived (and un-archived); an archived one is read only.
   State: #/work-order?id=100118  #/work-order?id=100106&dialog=cancel */
SE.titles['work-order'] = 'Work order';
SE.views['work-order'] = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, W = SE.work;
  var w = SE.wo(p.id);
  var crumbs = [['Home', 'home'], ['Work orders', 'work-orders']];
  if (!w) {
    var s0 = SE.shell(el, { nav: 'work-orders', title: 'Work order not found', crumbs: crumbs,
      body: SE.ui.empty({ icon: 'exclamation', tone: 'warning', title: 'Work order not found', text: 'It may have been removed, or the link is out of date.', action: '<a class="btn btn-secondary" href="#/work-orders">All work orders</a>' }) });
    return s0.cleanup;
  }
  var unit = W.unit(w.equip) || {}, K = SE.desk;
  var ED = SE.state.woEdits || (SE.state.woEdits = {});
  function edits() { return ED[w.id] || (ED[w.id] = { set: {}, log: [], notes: [] }); }
  function change(field, label, value, shown) {
    var was = w[field];
    if (String(was) === String(value)) return;
    var e = edits(); e.set[field] = value; e.set.updated = 'Just now';
    e.log.push(['Today', label + ' ' + (was || 'not set') + ' to ' + shown + ', by ' + D.user.name]);
    SE.save(); w = SE.wo(w.id); render();
    SE.toast(label + ' saved: ' + shown, 'check');
    var f = el.querySelector('[data-edit="' + field + '"]'); if (f && !SE.capture) f.focus();
  }
  var REASONS = ['Duplicate work order', 'Fixed without parts', 'Unit sold or retired', 'Other'];

  function warranty() {
    if (!w.warranty) return '<span class="muted">Expired</span>';
    if (typeof w.warranty === 'object') {
      return w.warranty.active ? 'Active · Expires ' + esc(w.warranty.expiry) : 'Expired';
    }
    return 'Until ' + esc(w.warranty);
  }

  function parts() {
    var a = W.approvalFor(w.id), h = '';
    if (a) {
      var st = W.apprState(a), po = W.poFor(a), ret = SE.state.returned[a.order];
      h += st === 'pending' ? SE.ui.banner('<b>Awaiting your approval.</b> ' + esc(a.by) + ' sent ' + a.lines + ' lines, ' + SE.money(a.amount) + '. <a href="#/approval?id=' + a.order + '">Review approval</a>', 'warning', 'shopping-cart-check')
        : st === 'approved' ? SE.ui.banner('<b>Approved.</b> ' + (po ? po.po + ' sent to ' + esc(po.supplier) + '. <a href="#/order?po=' + po.po + '">View ' + po.po + '</a>' : 'Order placed.'), 'success', 'check')
        : SE.ui.banner('<b>Returned to ' + esc(a.by) + ':</b> ' + esc(ret.reason) + (ret.comment ? '. ' + esc(ret.comment) : '') + ' <a href="#/approval?id=' + a.order + '">View request</a>', 'warning', 'undo');
      h += SE.ui.table([['Part'], ['Qty', 'num'], ['Unit price', 'num'], ['Line total', 'num']], a.items.map(function (it) {
        var pt = SE.part(it.pn);
        return ['<span class="cell-part">' + SE.ui.thumb() + '<span><b>' + esc(pt.name) + '</b><span class="sub">' + esc(pt.pn) + '</span></span></span>', it.qty, SE.money(pt.price), '<b>' + SE.money(pt.price * it.qty) + '</b>'];
      }), { cls: 'ap-lines', rowAttrs: function (i) { return 'data-go="part" data-pn="' + a.items[i].pn + '"'; } });
    }
    var pos = SE.orders().filter(function (o) { return o.wo === w.id && !(a && o.from === 'approval'); });
    if (pos.length) h += SE.ui.table([['Order'], ['Supplier'], ['Status'], ['Total', 'num']], pos.map(function (o) {
      return ['<b>' + o.po + '</b><span class="sub">' + esc(o.placed) + '</span>', esc(o.supplier), SE.chip(o.status), o.kind === 'transfer' ? 'No charge' : SE.money(o.total)];
    }), { rowAttrs: function (i) { return 'data-go="order" data-po="' + pos[i].po + '"'; } });
    // 1017 (V3): a recall work order carries the part it replaces
    if (!a && (w.parts || []).length) h += SE.ui.table([['Part'], ['Qty', 'num'], ['Charge', 'num']], w.parts.map(function (it) {
      var pt = SE.part(it.pn);
      return ['<span class="cell-part">' + SE.ui.thumb() + '<span><b>' + esc(pt.name) + '</b><span class="sub">' + esc(pt.pn) + ' · recall replacement</span></span></span>', it.qty, 'No charge'];
    }), { cls: 'ap-lines', rowAttrs: function (i) { return 'data-go="part" data-pn="' + w.parts[i].pn + '" data-wo="' + w.id + '"'; } });
    return h || '<div class="card wo-none">' + icon('box') + '<span>No parts requested yet.</span></div>';
  }
  // 1017 (V1 fault to fix): the work order's fault code finds the article written for it; the article opens for this
  // work order, so the part a step needs deep-links to the catalog filtered to the unit
  function troubleshoot(st) {
    var kb = st !== 'Done' && st !== 'Cancelled' && SE.ops.faultArticle(w);
    if (!kb) return '';
    return SE.ui.sec('Troubleshooting', '', '<ul class="card ar-links wo-kb"><li><a href="#/article?id=' + kb.id + '&wo=' + w.id + '" data-go="article" data-id="' + kb.id + '" data-wo="' + w.id + '"><span class="sym">' + icon('book-alt') + '</span><span><b>' + esc(kb.title) + '</b><small>Fault code ' + esc(kb.fault) + ' · ' + kb.minutes + ' min read · ' + kb.steps.length + ' steps</small></span>' + icon('angle-small-right') + '</a></li></ul>', 'h-kb');
  }
  function log() {
    var rows = w.log.concat(ED[w.id] ? ED[w.id].log : []), a = W.approvalFor(w.id);
    if (a) {
      var st = W.apprState(a);
      if (st === 'approved') { var po = W.poFor(a); rows.push(['Today', 'Parts approved by ' + D.user.name + (po ? ', ' + po.po + ' sent to ' + po.supplier : '')]); }
      if (st === 'returned') rows.push(['Today', 'Parts returned to ' + a.by + ': ' + SE.state.returned[a.order].reason]);
    }
    if (SE.state.cancelled[w.id]) rows.push(['Today', 'Cancelled by ' + D.user.name + ': ' + SE.state.cancelled[w.id]]);
    return '<ol class="wo-log card">' + rows.reverse().map(function (r, i) {
      return '<li' + (i ? '' : ' class="now"') + '><span class="dot" aria-hidden="true"></span><b>' + esc(r[1]) + '</b><small>' + esc(r[0]) + '</small></li>';
    }).join('') + '</ol>';
  }
  function notes() {
    var e = ED[w.id], ns = (e && e.notes && e.notes.length) ? e.notes : (w.notes || []);
    var st = W.status(w);
    var list = ns.length
      ? '<ol class="wo-log card">' + ns.slice().reverse().map(function (n) {
          return '<li class="now"><span class="dot" aria-hidden="true"></span><b>' + esc(n.text) + '</b><small>' + esc(n.author || D.user.name) + (n.time ? ' · ' + esc(n.time) : '') + '</small></li>';
        }).join('') + '</ol>'
      : '<div class="card wo-none">' + icon('comment-alt') + '<span>No notes yet.</span></div>';
    if (!editable(st)) return list;
    return list + '<div class="wo-note-row"><input type="text" id="wo-note-in" class="wo-note-input" placeholder="Add a note…" aria-label="Note text"><button type="button" class="btn btn-secondary" data-add-note>' + icon('comment-alt') + 'Add note</button></div>';
  }
  function actions(st) {
    // web-twin (SE.twin): the iPhone's work order has no archive and no header edits
    if (SE.twin && (st === 'Done' || st === 'Cancelled')) return '';
    if (W.archived(w)) return '<button type="button" class="btn btn-secondary" data-unarchive>' + icon('undo') + 'Un-archive</button>';
    if (st === 'Done' || st === 'Cancelled') return '<button type="button" class="btn btn-secondary" data-archive>' + icon('box') + 'Archive</button>';
    return '<button type="button" class="btn btn-primary" data-go="machine" data-m="' + W.machineKey(w) + '" data-wo="' + w.id + '">' + icon('search') + 'Find parts</button>' +
      '<button type="button" class="btn btn-danger" data-cancel>Cancel work order</button>';
  }
  function editable(st) { return !SE.twin && !W.archived(w) && st !== 'Cancelled'; }
  function sel(field, label, opts, cur) {
    return '<div class="form-row wo-ed"><label for="ed-' + field + '">' + label + '</label><div class="control"><select id="ed-' + field + '" data-edit="' + field + '">' +
      opts.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>';
  }
  function editor(st) {
    var STATUS = ['Open', 'In progress', 'Done'], due = K.parse(w.due);
    if (STATUS.indexOf(st) < 0) STATUS.unshift(st);
    return '<div class="wo-edit">' + sel('status', 'Status', STATUS, st) + sel('priority', 'Priority', ['Normal', 'Medium', 'High'], w.priority) + sel('assignee', 'Assignee', SE.data.techs, w.assignee) +
      '<div class="form-row wo-ed"><label for="ed-due">Due</label><div class="control"><input type="date" id="ed-due" data-edit="due" value="' + (due ? K.iso(due) : '') + '"></div></div>' +
      '<p class="wo-ed-note">' + icon('check') + 'Changes save as you make them and go into the activity log.</p></div>';
  }
  function body() {
    var st = W.status(w);
    var make = unit.make || w.make || '', model = unit.model || w.model || '';
    var kvEdit = [
      w.externalId ? ['ERP order', esc(w.externalId)] : null,
      ['Type', esc(w.kind || 'Equipment repair')],
      ['Machine', esc(w.machine)],
      ['Asset', esc(w.equip)],
      make ? ['Make', esc(make)] : null,
      model ? ['Model', esc(model)] : null,
      ['Serial', esc(unit.serial || 'Unknown')],
      ['Branch', esc(unit.location || 'Unknown')],
      ['Opened', esc(w.opened)],
      ['Warranty', warranty()]
    ].filter(Boolean);
    var kvFull = [
      w.externalId ? ['ERP order', esc(w.externalId)] : null,
      ['Type', esc(w.kind || 'Equipment repair')],
      ['Status', SE.chip(st)],
      ['Priority', W.priority(w.priority)],
      ['Machine', esc(w.machine)],
      ['Asset', esc(w.equip)],
      make ? ['Make', esc(make)] : null,
      model ? ['Model', esc(model)] : null,
      ['Serial', esc(unit.serial || 'Unknown')],
      ['Branch', esc(unit.location || 'Unknown')],
      ['Assignee', esc(w.assignee)],
      ['Opened', esc(w.opened)],
      ['Due', esc(w.due || 'Not set')],
      ['Warranty', warranty()]
    ].filter(Boolean);
    return SE.recallNote(w.equip) + '<div class="split wo-split"><div class="wo-main">' +
        '<section class="card wo-summary"><div class="chips">' + SE.chip(st) + W.priority(w.priority) + '</div>' +
          '<h2 class="wo-h">' + esc(w.issue) + '</h2><p class="muted">' + esc(w.machine) + ' · Asset ' + esc(w.equip) + '</p>' +
          (st === 'Cancelled' ? SE.ui.banner('<b>Cancelled.</b> ' + esc(SE.state.cancelled[w.id]), 'danger', 'cross-small') : '') +
          (w.desc ? '<p class="wo-desc">' + esc(w.desc) + '</p>' : '') + '</section>' +
        troubleshoot(st) +
        SE.ui.sec('Parts', '', parts(), 'h-parts') +
        SE.ui.sec('Notes', '', notes(), 'h-notes') +
        SE.ui.sec('Activity', '', log(), 'h-log') +
      '</div>' +
      '<aside class="panel wo-panel" aria-label="Work order details"><div class="panel-body">' +
        '<h2 class="wo-panel-h">Details</h2>' +
        (editable(st) ? editor(st) + SE.ui.kv(kvEdit)
          : (W.archived(w) ? SE.ui.banner('<b>Archived.</b> Read only. Un-archive it to make changes.', 'neutral', 'box') : '') +
            SE.ui.kv(kvFull)) +
      '</div></aside></div>';
  }

  var s = SE.shell(el, { nav: 'work-orders', title: 'Work order #' + w.id, sub: esc(w.machine) + ' · Asset ' + esc(w.equip) + ' · ' + esc(unit.location || ''), crumbs: crumbs,
    actions: '<span id="wo-actions" class="wo-actions">' + actions(W.status(w)) + '</span>', body: '<div id="wo-body">' + body() + '</div>' });
  function render() {
    el.querySelector('#wo-body').innerHTML = body();
    el.querySelector('#wo-actions').innerHTML = actions(W.status(w));
  }

  var open = null;
  function cancel() {
    var dlg = open = SE.ui.dialog({
      title: 'Cancel work order #' + w.id + '?',
      body: '<p class="muted">' + esc(w.assignee) + ' sees the cancellation on the work order. Parts already ordered stay ordered.</p>' +
        '<div class="form-row" id="row-reason"><label for="c-reason">Reason</label><div class="control"><select id="c-reason" aria-describedby="err-reason"><option value="">Choose a reason</option>' +
          REASONS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div>' +
          '<p class="form-err" id="err-reason" hidden>Choose why the work order is cancelled.</p></div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Keep work order</button><button type="button" class="btn btn-danger-solid" data-confirm>Cancel work order</button>',
    });
    dlg.el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-confirm]')) return;
      var r = dlg.el.querySelector('#c-reason').value;
      if (!r) { dlg.el.querySelector('#row-reason').classList.add('invalid'); dlg.el.querySelector('#err-reason').hidden = false; dlg.el.querySelector('#c-reason').focus(); return; }
      SE.state.cancelled[w.id] = r;
      SE.save();
      dlg.close();
      render();
      SE.toast('Work order #' + w.id + ' cancelled', 'check');
    });
  }
  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-cancel]')) { cancel(); return; }
    if (e.target.closest('[data-add-note]')) {
      var inp = el.querySelector('#wo-note-in');
      var text = inp ? inp.value.trim() : '';
      if (!text) { if (inp) inp.focus(); return; }
      var now = new Date();
      var ed = edits();
      if (!ed.notes) ed.notes = [];
      ed.notes.push({ text: text, author: D.user.name, time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
      SE.save();
      if (inp) inp.value = '';
      render();
      SE.toast('Note added', 'check');
      return;
    }
    var ar = e.target.closest('[data-archive], [data-unarchive]');
    if (!ar) return;
    var on = ar.hasAttribute('data-archive');
    if (on) SE.state.archived[w.id] = true; else delete SE.state.archived[w.id];
    edits().log.push(['Today', (on ? 'Archived' : 'Un-archived') + ' by ' + D.user.name]);
    SE.save(); render();
    SE.toast('Work order #' + w.id + (on ? ' archived' : ' back in the list'), 'box');
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'wo-note-in') {
      var btn = el.querySelector('[data-add-note]');
      if (btn) btn.click();
    }
  });
  el.addEventListener('change', function (e) {
    var f = e.target.closest('[data-edit]');
    if (!f) return;
    var k = f.dataset.edit;
    if (k === 'status') change('status', 'Status', f.value, f.value);
    if (k === 'priority') change('priority', 'Priority', f.value, f.value);
    if (k === 'assignee') change('assignee', 'Assignee', f.value, f.value);
    if (k === 'due' && f.value) { var d = K.parse(f.value); if (!d) { SE.toast('Choose a valid date', 'exclamation'); return; } var lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); change('due', 'Due', lbl, lbl); }
  });
  if (p.dialog === 'cancel' && !/Done|Cancelled/.test(W.status(w))) cancel();
  return function () { if (open && document.contains(open.el)) open.close(); s.cleanup(); };
};
