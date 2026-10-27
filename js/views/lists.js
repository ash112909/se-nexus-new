/* Shopping Lists (DES-51, PRO-6 company catalog), web. The fleet's curated lists in a rail section of
   their own, separate from parts search (USE-CASES 1 and 2). Sarah (full permissions) uses and manages
   them: New list and Edit open the list editor dialog (SE.lx.editor, shared with the list page).
   - Tag filter (segmented), cards with name, description, tag, part count, total, updated by and when,
     and a "to review" flag when a member went bad (replaced, backordered, priced by unit)
   State: #/lists  #/lists?tag=Repair  #/lists?dialog=new */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon, money = SE.money;
  var LX = SE.lx = {};
  LX.issue = function (p) {
    if (!p) return null;
    if (p.supersededBy) return 'superseded';
    if (!SE.priceVisible(p)) return 'serial';
    if (p.stock === 'Backordered') return 'backordered';
    return null;
  };
  LX.issues = function (l) { return l.items.filter(function (i) { return LX.issue(SE.part(i.pn)); }).length; };
  LX.total = function (l) { return l.items.reduce(function (t, i) { var p = SE.part(i.pn); return t + (SE.priceVisible(p) ? p.price * i.qty : 0); }, 0); };
  LX.unpriced = function (l) { return l.items.filter(function (i) { return !SE.priceVisible(SE.part(i.pn)); }).length; };
  LX.machineName = function (key) { var m = key && SE.machine(key); return m ? m.name : null; };
  LX.today = function () { return SE.tx.today().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  LX.parts = function (n) { return n + ' part' + (n === 1 ? '' : 's'); };

  // ---------- list editor dialog: new (src null) or edit. onDone(list) after Save.
  // Name (required), description, tag, machine (optional); members in authored order with up and down,
  // recommended quantity and remove; "Search parts to add" is the same parts search in a write context,
  // and a picked part is appended at the end.
  LX.editor = function (src, onDone) {
    var D = SE.data, UI = SE.ui;
    var draft = src ? JSON.parse(JSON.stringify(src)) : { id: null, name: '', description: '', tag: LX.tag && LX.tag !== 'all' ? LX.tag : D.listTags[0], machine: null, items: [] };
    function tags() {
      return D.listTags.map(function (t) { return '<button type="button" role="radio" aria-checked="' + (t === draft.tag) + '" aria-selected="' + (t === draft.tag) + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    }
    function member(it, i) {
      var p = SE.part(it.pn), n = draft.items.length, bad = LX.issue(p);
      var step = UI.stepper(it.qty, 'Recommended quantity of ' + p.name, ' data-i="' + i + '"').replace('class="stepper"', 'class="stepper sm"');
      if (it.qty <= 1) step = step.replace('data-step="-1"', 'data-step="-1" disabled');
      return '<li class="le-m" data-m="' + i + '"><span class="le-pos">' + (i + 1) + '</span>' +
        '<span class="le-info"><b>' + esc(p.name) + '</b><small>' + esc(p.pn) + ' · ' + (SE.priceVisible(p) ? money(p.price) : 'Priced by unit') + '</small>' +
          (bad ? '<span class="le-warn">' + esc(p.supersededBy ? 'Replaced by ' + p.supersededBy : bad === 'backordered' ? p.eta : 'Needs a unit for pricing') + '</span>' : '') + '</span>' +
        step +
        '<span class="le-move"><button type="button" class="icon-btn" data-up="' + i + '" aria-label="Move ' + esc(p.name) + ' up"' + (i ? '' : ' disabled') + '>' + icon('angle-small-down', 'up') + '</button>' +
          '<button type="button" class="icon-btn" data-down="' + i + '" aria-label="Move ' + esc(p.name) + ' down"' + (i < n - 1 ? '' : ' disabled') + '>' + icon('angle-small-down') + '</button></span>' +
        '<button type="button" class="icon-btn danger" data-remove="' + i + '" aria-label="Remove ' + esc(p.name) + '">' + icon('trash') + '</button></li>';
    }
    function members() {
      return draft.items.length ? '<ol class="le-list">' + draft.items.map(member).join('') + '</ol>'
        : '<p class="le-none">No parts yet. Search below and add them; they keep the order you add them in.</p>';
    }
    function tokens(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }
    function find(q) {
      var tk = tokens(q);
      if (!tk.length) return D.parts.filter(function (x) { return !draft.machine || x.machine === draft.machine; }).slice(0, 6);
      return D.parts.filter(function (x) {
        var m = x.machine ? SE.machine(x.machine) : null;
        var hay = [x.name, x.pn, x.sub || '', x.type || '', m ? m.name : '', SE.supplierOf(x.pn).name].join(' ').toLowerCase();
        return tk.every(function (t) { return hay.indexOf(t) >= 0; });
      });
    }
    function results(q) {
      var r = find(q);
      if (!r.length) return '<p class="le-none">No parts match "' + esc(q) + '". Try a part number or a word like "filter".</p>';
      return '<ul class="pk-list">' + r.map(function (x) {
        var on = draft.items.some(function (i) { return i.pn === x.pn; });
        var act = x.supersededBy ? '<span class="pk-rep">Replaced: use ' + esc(x.supersededBy) + '</span>'
          : on ? '<span class="pk-done">' + icon('check') + 'On the list</span>'
          : '<button type="button" class="btn btn-secondary pk-add" data-pick="' + esc(x.pn) + '">' + icon('plus-small') + 'Add</button>';
        return '<li>' + UI.thumb() + '<span class="le-info"><b>' + esc(x.name) + '</b><small>' + esc(x.pn) + ' · ' + esc(SE.supplierOf(x.pn).name) + ' · ' + (SE.priceVisible(x) ? money(x.price) : 'Priced by unit') + '</small></span>' + UI.stock(x) + act + '</li>';
      }).join('') + '</ul>';
    }
    var machines = [['', 'Any machine (shop supplies, attachments)']].concat(Object.keys(D.machines).map(function (k) { return [k, D.machines[k].name]; }));
    var dlg = UI.dialog({
      title: src ? 'Edit list' : 'New list', wide: true,
      body: '<form class="le-form" id="le-form" novalidate autocomplete="off">' +
        '<div class="le-grid">' +
          '<div class="form-row" id="le-row-name"><label for="le-name">Name</label><div class="control"><input id="le-name" value="' + esc(draft.name) + '" placeholder="For example: Annual inspection kit" aria-describedby="le-err" data-autofocus></div>' +
            '<p class="form-err" id="le-err" hidden>Give the list a name.</p></div>' +
          '<div class="form-row"><label for="le-mach">Machine (optional)</label><div class="control"><select id="le-mach">' + machines.map(function (m) { return '<option value="' + m[0] + '"' + ((draft.machine || '') === m[0] ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>' +
        '</div>' +
        '<div class="form-row"><label for="le-desc">Description (optional)</label><div class="control area"><textarea id="le-desc" rows="2" placeholder="What the list is for">' + esc(draft.description || '') + '</textarea></div></div>' +
        '<div class="form-row"><span class="le-lbl" id="le-tag-l">Tag</span><div class="seg le-tags" role="radiogroup" aria-labelledby="le-tag-l">' + tags() + '</div></div>' +
        '<div class="form-row"><span class="le-lbl">Parts · <span id="le-n">' + draft.items.length + '</span></span><div id="le-members">' + members() + '</div></div>' +
        '<div class="form-row le-add"><label for="le-q">Search parts to add</label><div class="control">' + icon('search') + '<input id="le-q" type="search" placeholder="Part number, name or machine" enterkeyhint="search"></div>' +
          '<div id="le-res">' + results('') + '</div></div>' +
      '</form>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="submit" form="le-form" class="btn btn-primary">' + (src ? 'Save list' : 'Create list') + '</button>',
    });
    var d = dlg.el, q = d.querySelector('#le-q'), res = d.querySelector('#le-res'), mem = d.querySelector('#le-members'), timer;
    function renderMembers(focusSel) {
      mem.innerHTML = members();
      d.querySelector('#le-n').textContent = draft.items.length;
      if (focusSel && !SE.capture) { var f = mem.querySelector(focusSel); if (f && !f.disabled) f.focus(); }
    }
    d.querySelector('#le-name').addEventListener('input', function () { if (this.value.trim()) { d.querySelector('#le-err').hidden = true; d.querySelector('#le-row-name').classList.remove('invalid'); this.removeAttribute('aria-invalid'); } });
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { res.innerHTML = results(q.value); }, 150); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); res.innerHTML = results(q.value); } });
    d.querySelector('#le-mach').addEventListener('change', function () { draft.machine = this.value || null; if (!q.value.trim()) res.innerHTML = results(''); });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || t.disabled) return;
      var x = t.dataset;
      if (x.tag) { draft.tag = x.tag; d.querySelector('.le-tags').innerHTML = tags(); d.querySelector('[data-tag="' + x.tag + '"]').focus(); return; }
      if (x.step) { var i = +t.closest('[data-i]').dataset.i; draft.items[i].qty = Math.max(1, draft.items[i].qty + (+x.step)); renderMembers('[data-i="' + i + '"] [data-step="' + x.step + '"]'); return; }
      if (x.up != null || x.down != null) {
        var a = +(x.up != null ? x.up : x.down), b = a + (x.up != null ? -1 : 1);
        var it = draft.items.splice(a, 1)[0]; draft.items.splice(b, 0, it);
        renderMembers('[data-' + (x.up != null ? 'up' : 'down') + '="' + b + '"]');
        var row = mem.querySelector('[data-m="' + b + '"]');
        SE.animate(row, [{ backgroundColor: 'var(--tint-info)' }, { backgroundColor: 'var(--surface)' }], { duration: 700 });
        return;
      }
      if (x.remove != null) { var gone = draft.items.splice(+x.remove, 1)[0]; renderMembers(); res.innerHTML = results(q.value); SE.toast('Removed ' + SE.part(gone.pn).name, 'trash'); return; }
      if (x.pick) { draft.items.push({ pn: x.pick, qty: 1 }); renderMembers(); res.innerHTML = results(q.value); SE.toast('Added to the end of the list', 'check'); }
    });
    d.querySelector('#le-form').addEventListener('submit', function (e) {
      e.preventDefault();
      draft.name = d.querySelector('#le-name').value.trim();
      draft.description = d.querySelector('#le-desc').value.trim();
      var ok = !!draft.name;
      d.querySelector('#le-err').hidden = ok;
      d.querySelector('#le-row-name').classList.toggle('invalid', !ok);
      d.querySelector('#le-name').setAttribute('aria-invalid', String(!ok));
      if (!ok) { d.querySelector('#le-name').focus(); return; }
      draft.updatedBy = D.user.name; draft.updatedAt = LX.today();
      var lists = SE.lists();
      if (!src) { draft.id = 'sl-' + Date.now().toString(36); lists.unshift(draft); }
      else lists.splice(lists.indexOf(src), 1, draft);
      SE.saveLists();
      dlg.close();
      SE.toast(src ? 'List saved' : 'List created', 'check');
      if (onDone) onDone(draft);
    });
    return dlg;
  };

  // ---------- delete confirmation; lines already in a cart are not withdrawn
  LX.confirmDelete = function (l, onDone) {
    var dlg = SE.ui.dialog({
      title: 'Delete "' + l.name + '"?',
      body: '<p class="ld-text">Your team stops seeing this list. Parts already in a cart stay there. This cannot be undone.</p>' +
        '<p class="ld-meta">' + LX.parts(l.items.length) + ' · ' + esc(l.tag) + ' · updated by ' + esc(l.updatedBy) + ', ' + esc(l.updatedAt) + '</p>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close data-autofocus>Keep it</button><button type="button" class="btn btn-danger-fill" data-confirm-delete>Delete list</button>',
    });
    dlg.el.querySelector('[data-confirm-delete]').addEventListener('click', function () {
      var lists = SE.lists();
      lists.splice(lists.indexOf(l), 1);
      SE.saveLists();
      dlg.close();
      SE.toast('List deleted', 'trash');
      if (onDone) onDone();
    });
    return dlg;
  };
})();

SE.titles.lists = 'Shopping Lists';
SE.views.lists = function (el, p) {
  var D = SE.data, UI = SE.ui, esc = SE.esc, icon = SE.icon, LX = SE.lx;
  var tag = D.listTags.indexOf(p.tag) >= 0 ? p.tag : (LX.tag || 'all');

  function card(l) {
    var n = LX.issues(l), un = LX.unpriced(l), mach = LX.machineName(l.machine);
    return '<li><a class="lw-card" href="#/list?id=' + encodeURIComponent(l.id) + '">' +
      '<span class="lw-top"><b>' + esc(l.name) + '</b><span class="lw-total">' + SE.money(LX.total(l)) + (un ? '<small>+ ' + un + ' priced by unit</small>' : '') + '</span></span>' +
      (l.description ? '<span class="lw-desc">' + esc(l.description) + '</span>' : '') +
      '<span class="lw-chips">' + SE.chip(l.tag, 'neutral') + '<span>' + LX.parts(l.items.length) + '</span>' + (mach ? '<span>' + icon('truck-side') + esc(mach) + '</span>' : '') + '</span>' +
      '<span class="lw-foot"><span>Updated by ' + esc(l.updatedBy) + ', ' + esc(l.updatedAt) + '</span>' +
        (n ? '<span class="lw-flag">' + icon('exclamation') + n + ' to review</span>' : '') + '</span>' +
    '</a></li>';
  }
  function body() {
    var all = SE.lists(), list = all.filter(function (l) { return tag === 'all' || l.tag === tag; });
    var items = [['all', 'All', all.length]].concat(D.listTags.map(function (t) { return [t, t, all.filter(function (l) { return l.tag === t; }).length]; }));
    return '<div class="lw-bar">' + UI.seg('Filter lists by tag', items, tag) + '</div>' +
      (list.length ? '<ul class="lw-grid">' + list.map(card).join('') + '</ul>'
        : UI.empty({ icon: 'list', tone: 'neutral', title: 'No ' + tag + ' lists yet', text: 'Make one for the parts your team orders together.', action: '<button type="button" class="btn btn-primary" data-new>' + icon('plus-small') + 'New list</button>' }));
  }
  var s = SE.shell(el, {
    nav: 'lists', title: 'Shopping Lists', crumbs: [['Home', 'home']],
    sub: 'Company catalog: lists your fleet keeps for kits and restocks, separate from parts search.',
    actions: '<button type="button" class="btn btn-primary" data-new>' + SE.icon('plus-small') + 'New list</button>',
    body: '<div id="lw-body"></div>',
  });
  var host = el.querySelector('#lw-body');
  function render() { host.innerHTML = body(); }
  function openNew() { LX.editor(null, function (l) { SE.go('list', { params: { id: l.id } }); }); }
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.seg) { tag = LX.tag = t.dataset.seg; render(); var b = host.querySelector('[data-seg="' + tag + '"]'); if (b && !SE.capture) b.focus(); return; }
    if (t.hasAttribute('data-new')) openNew();
  });
  render();
  if (p.dialog === 'new') openNew();
  return s.cleanup;
};
