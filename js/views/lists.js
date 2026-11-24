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
    var myId = D.user.username;
    var draft = src ? JSON.parse(JSON.stringify(src)) : { id: null, name: '', description: '', tag: LX.tag && LX.tag !== 'all' ? LX.tag : D.listTags[0], machine: null, items: [], ownerId: myId, pinned: false, public: false };
    function tags() {
      return D.listTags.map(function (t) { return '<button type="button" role="radio" aria-checked="' + (t === draft.tag) + '" aria-selected="' + (t === draft.tag) + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    }
    function member(it, i) {
      var p = SE.part(it.pn) || { pn: it.pn, name: it.pn, price: 0, supersededBy: null };
      var n = draft.items.length, bad = LX.issue(p);
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
        '<div class="form-row"><span class="le-lbl" id="le-vis-l">Visibility</span><div class="seg le-vis-seg" role="radiogroup" aria-labelledby="le-vis-l">' +
          '<button type="button" role="radio" aria-checked="' + !draft.public + '" aria-selected="' + !draft.public + '" data-vis="private">' + icon('lock') + 'Private</button>' +
          '<button type="button" role="radio" aria-checked="' + !!draft.public + '" aria-selected="' + !!draft.public + '" data-vis="public">' + icon('share') + 'Public</button>' +
        '</div></div>' +
        '<div class="form-row"><span class="le-lbl">Parts · <span id="le-n">' + draft.items.length + '</span></span><div id="le-members">' + members() + '</div></div>' +
        '<div class="form-row le-browse"><span class="le-lbl">Add parts</span>' +
          '<button type="button" class="btn btn-secondary le-browse-btn" data-le-browse>' + icon('search') + 'Browse catalog to add parts</button>' +
          '<p class="muted le-browse-note" style="margin-top:6px;font-size:13px;">Navigate to any catalog page and use the <b>Save</b> button on each part.</p>' +
        '</div>' +
      '</form>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="submit" form="le-form" class="btn btn-primary">' + (src ? 'Save list' : 'Create list') + '</button>',
    });
    var d = dlg.el, mem = d.querySelector('#le-members');
    function renderMembers(focusSel) {
      mem.innerHTML = members();
      d.querySelector('#le-n').textContent = draft.items.length;
      if (focusSel && !SE.capture) { var f = mem.querySelector(focusSel); if (f && !f.disabled) f.focus(); }
    }
    d.querySelector('#le-name').addEventListener('input', function () { if (this.value.trim()) { d.querySelector('#le-err').hidden = true; d.querySelector('#le-row-name').classList.remove('invalid'); this.removeAttribute('aria-invalid'); } });
    d.querySelector('#le-mach').addEventListener('change', function () { draft.machine = this.value || null; });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || t.disabled) return;
      var x = t.dataset;
      if (x.tag) { draft.tag = x.tag; d.querySelector('.le-tags').innerHTML = tags(); d.querySelector('[data-tag="' + x.tag + '"]').focus(); return; }
      if (x.vis) { draft.public = x.vis === 'public'; var seg = d.querySelector('.le-vis-seg'); seg.querySelectorAll('button').forEach(function(b) { var on = b.dataset.vis === x.vis; b.setAttribute('aria-checked', on); b.setAttribute('aria-selected', on); }); return; }
      if (x.step) { var i = +t.closest('[data-i]').dataset.i; draft.items[i].qty = Math.max(1, draft.items[i].qty + (+x.step)); renderMembers('[data-i="' + i + '"] [data-step="' + x.step + '"]'); return; }
      if (x.up != null || x.down != null) {
        var a = +(x.up != null ? x.up : x.down), b = a + (x.up != null ? -1 : 1);
        var it = draft.items.splice(a, 1)[0]; draft.items.splice(b, 0, it);
        renderMembers('[data-' + (x.up != null ? 'up' : 'down') + '="' + b + '"]');
        var row = mem.querySelector('[data-m="' + b + '"]');
        SE.animate(row, [{ backgroundColor: 'var(--tint-info)' }, { backgroundColor: 'var(--surface)' }], { duration: 700 });
        return;
      }
      if (x.remove != null) {
        var gone = draft.items.splice(+x.remove, 1)[0];
        renderMembers();
        SE.toast('Removed ' + (SE.part(gone.pn) || { name: gone.pn }).name, 'trash');
        return;
      }
      if (t.hasAttribute('data-le-browse')) {
        draft.name = d.querySelector('#le-name').value.trim();
        draft.description = d.querySelector('#le-desc').value.trim();
        if (!draft.name) {
          d.querySelector('#le-err').hidden = false;
          d.querySelector('#le-row-name').classList.add('invalid');
          d.querySelector('#le-name').setAttribute('aria-invalid', 'true');
          d.querySelector('#le-name').focus();
          return;
        }
        draft.updatedBy = D.user.name; draft.updatedAt = LX.today();
        var lists = SE.lists();
        if (!src) { draft.id = 'sl-' + Date.now().toString(36); lists.unshift(draft); }
        else lists.splice(lists.indexOf(src), 1, draft);
        SE.saveLists();
        SE.state._listEdit = { id: draft.id, name: draft.name };
        SE.save && SE.save();
        dlg.close();
        SE.go('catalog');
        return;
      }
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
  var myId = D.user.username;
  var _activeListId = null;
  var _renaming = false;

  // Set initial active list
  (function () {
    var all = SE.lists();
    if (p.id && SE.list(p.id)) { _activeListId = p.id; return; }
    if (all.length) _activeListId = all[0].id;
  })();

  function openWos() {
    return SE.workOrders().filter(function (w) { return w.status !== 'Done' && !SE.state.cancelled[w.id]; });
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  function listRow(l) {
    var isActive = l.id === _activeListId;
    var canEdit = !l.ownerId || l.ownerId === myId;
    var pubBadge = l.public ? '<span class="wl-nav-pub">PUB</span>' : '';
    var pinBtn = canEdit
      ? '<button type="button" class="wl-nav-pin" data-navpin="' + esc(l.id) + '" title="' + (l.pinned ? 'Unpin' : 'Pin to top') + '" aria-label="' + (l.pinned ? 'Unpin ' : 'Pin ') + esc(l.name) + '">' + icon('star') + '</button>'
      : '';
    return '<div class="wl-nav-item' + (isActive ? ' active' : '') + '" data-navsel="' + esc(l.id) + '">' +
      icon('list') +
      '<span class="wl-nav-name">' + esc(l.name) + '</span>' +
      pubBadge +
      '<span class="wl-nav-count">' + l.items.length + '</span>' +
      pinBtn +
    '</div>';
  }

  function renderSideLists() {
    var nav = el.querySelector('#wl-list-nav');
    if (!nav) return;
    var lists = SE.lists();
    var pinned = lists.filter(function (l) { return l.pinned; });
    var mine   = lists.filter(function (l) { return !l.pinned && (!l.ownerId || l.ownerId === myId); });
    var shared = lists.filter(function (l) { return !l.pinned && l.ownerId && l.ownerId !== myId && l.public; });
    var html = '';
    if (pinned.length) {
      html += '<div class="wl-nav-label">' + icon('star') + 'Pinned</div>' + pinned.map(listRow).join('');
    }
    html += '<div class="wl-nav-label">' + icon('user') + 'My Lists</div>';
    html += mine.length ? mine.map(listRow).join('') : '<div class="wl-nav-empty">No lists yet.</div>';
    if (shared.length) {
      html += '<div class="wl-nav-label">' + icon('share') + 'Shared with me</div>' + shared.map(listRow).join('');
    }
    html += '<button type="button" class="wl-nav-new" data-navnew>' + icon('plus-small') + 'New list</button>';
    nav.innerHTML = html;
  }

  // ── Item cards ───────────────────────────────────────────────────────────────
  function itemCard(item, l, otherLists, canEdit) {
    var part = SE.part(item.pn);
    if (!part) return '';
    var sup = SE.supplierOf(item.pn);
    var oemBadge = part.oemOnly ? '<span class="wl-oem">OEM</span>' : '';
    var moveSel = (canEdit && otherLists.length)
      ? '<select class="wl-move-sel" data-wlmove data-wpn="' + esc(item.pn) + '" data-wlid="' + esc(l.id) + '" aria-label="Move to another list">' +
          '<option value="">Move to…</option>' +
          otherLists.map(function (lo) { return '<option value="' + esc(lo.id) + '">' + esc(lo.name) + '</option>'; }).join('') +
        '</select>'
      : '';
    return '<div class="wl-item-card">' +
      '<div class="wl-item-main">' +
        '<div class="wl-item-info">' +
          '<div class="wl-item-top">' +
            '<span class="wl-pn">' + esc(part.pn) + '</span>' +
            oemBadge +
            (item.qty > 1 ? '<span class="wl-qty">×' + item.qty + '</span>' : '') +
          '</div>' +
          '<div class="wl-item-desc">' + esc(part.name) + '</div>' +
          '<div class="wl-item-meta">' +
            '<span class="wl-item-sup">' + esc(sup.name) + '</span>' +
            (part.uom ? '<span class="wl-uom">' + esc(part.uom) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="wl-item-acts">' +
          '<button type="button" class="wl-cart-btn" data-wladd data-wpn="' + esc(item.pn) + '" data-wlid="' + esc(l.id) + '">' + icon('shopping-cart') + 'Add to cart</button>' +
          '<a class="wl-find-btn" href="#/part?pn=' + encodeURIComponent(part.pn) + '">' + icon('search') + 'Find</a>' +
          moveSel +
          (canEdit ? '<button type="button" class="wl-del-btn" data-wlrm data-wpn="' + esc(item.pn) + '" data-wlid="' + esc(l.id) + '" title="Remove from list">' + icon('trash') + '</button>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Content panel ─────────────────────────────────────────────────────────
  function panelHeader(l) {
    var canEdit = !l.ownerId || l.ownerId === myId;
    var pubLabel = l.public
      ? '<span class="wl-vis pub">' + icon('share') + 'Public</span>'
      : '<span class="wl-vis priv">' + icon('lock') + 'Private</span>';
    var nameRow = _renaming
      ? '<input id="wl-ren-inp" class="wl-ren-inp" value="' + esc(l.name) + '" />' +
        '<button type="button" class="wl-act-btn wl-act-primary" data-wlrensave>' + icon('check') + 'Save</button>' +
        '<button type="button" class="wl-act-btn" data-wlrencancel>Cancel</button>'
      : '<h2 class="wl-ph-title">' + esc(l.name) + '</h2>' + pubLabel +
        (canEdit ? '<button type="button" class="wl-act-btn" data-wlren>' + icon('pencil') + '</button>' : '');
    return '<div class="wl-panel-hd">' +
      '<div class="wl-ph-left">' + nameRow + '</div>' +
      '<div class="wl-ph-right">' +
        '<span class="wl-ph-cnt">' + l.items.length + ' item' + (l.items.length !== 1 ? 's' : '') + '</span>' +
        (canEdit && l.items.length ? '<button type="button" class="wl-act-btn wl-act-primary" data-wladdall data-wlid="' + esc(l.id) + '">' + icon('shopping-cart') + 'Add all to cart</button>' : '') +
        (canEdit ? '<button type="button" class="wl-act-btn" data-wlpub data-wlid="' + esc(l.id) + '">' + icon(l.public ? 'lock' : 'share') + (l.public ? 'Make private' : 'Make public') + '</button>' : '') +
        (canEdit ? '<button type="button" class="wl-act-btn" data-wledit data-wlid="' + esc(l.id) + '">' + icon('pencil') + 'Edit</button>' : '') +
        (canEdit ? '<button type="button" class="wl-act-btn wl-act-danger" data-wldel data-wlid="' + esc(l.id) + '">' + icon('trash') + 'Delete</button>' : '') +
      '</div>' +
    '</div>';
  }

  function renderItems() {
    var panel = el.querySelector('#wl-items-panel');
    if (!panel) return;
    var l = _activeListId ? SE.list(_activeListId) : null;
    if (!l) {
      panel.innerHTML = UI.empty({ icon: 'list', tone: 'neutral', title: 'No lists yet', text: 'Create a list to save parts you order together.', action: '<button type="button" class="btn btn-primary" data-navnew>' + icon('plus-small') + 'Create first list</button>' });
      return;
    }
    var canEdit = !l.ownerId || l.ownerId === myId;
    var otherLists = SE.lists().filter(function (lo) { return lo.id !== l.id && (!lo.ownerId || lo.ownerId === myId); });
    var bodyHtml = !l.items.length
      ? '<div class="wl-panel-empty"><p>This list is empty.</p><p>Add parts using the <b>Save to list</b> button on any part.</p>' +
        (canEdit ? '<button type="button" class="btn btn-secondary" data-wledit data-wlid="' + esc(l.id) + '">' + icon('pencil') + 'Edit list</button>' : '') + '</div>'
      : '<div class="wl-items-list">' + l.items.map(function (item) { return itemCard(item, l, otherLists, canEdit); }).join('') + '</div>';
    panel.innerHTML = panelHeader(l) + bodyHtml;
    if (_renaming) {
      var inp = panel.querySelector('#wl-ren-inp');
      if (inp) { inp.focus(); inp.select(); }
    }
  }

  function render() { renderSideLists(); renderItems(); }

  // ── Add to cart helpers ───────────────────────────────────────────────────
  function wlAddOne(pn, listId) {
    var l = SE.list(listId);
    var item = l && l.items.filter(function (i) { return i.pn === pn; })[0];
    var qty = item ? item.qty : 1;
    var part = SE.part(pn);
    if (!part) return;
    function doOne(wo) {
      SE.addToCart(pn, qty, wo || null, {});
      SE.toast(part.name + ' added to cart' + (wo ? ' · WO #' + wo : ''), 'shopping-cart');
    }
    var wos = openWos();
    if (!wos.length) { doOne(null); return; }
    var dlg = UI.dialog({
      title: 'Add to cart',
      body: '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Adding <b>' + esc(part.name) + '</b> · ' + esc(pn) + '</p>' +
        '<div class="form-row"><label for="wl-one-wo">Work order (optional)</label><div class="control"><select id="wl-one-wo"><option value="">General cart (no WO)</option>' +
        wos.map(function (w) { return '<option value="' + w.id + '">#' + w.id + ' · ' + esc(w.equip) + ' · ' + esc(w.issue) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" id="wl-one-ok">' + icon('shopping-cart') + 'Add to cart</button>',
    });
    dlg.el.querySelector('#wl-one-ok').addEventListener('click', function () {
      var v = dlg.el.querySelector('#wl-one-wo').value || null;
      dlg.close(); doOne(v);
    });
  }

  function wlAddAll(listId) {
    var l = SE.list(listId);
    if (!l || !l.items.length) return;
    function doAll(wo) {
      l.items.forEach(function (item) { SE.addToCart(item.pn, item.qty, wo || null, {}); });
      SE.toast('Added ' + l.items.length + ' item' + (l.items.length !== 1 ? 's' : '') + ' to cart' + (wo ? ' · WO #' + wo : ''), 'shopping-cart');
    }
    var wos = openWos();
    if (!wos.length) { doAll(null); return; }
    var dlg = UI.dialog({
      title: 'Add all to cart',
      body: '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Adding <b>' + l.items.length + ' items</b> from <b>' + esc(l.name) + '</b></p>' +
        '<div class="form-row"><label for="wl-all-wo">Work order (optional)</label><div class="control"><select id="wl-all-wo"><option value="">General cart (no WO)</option>' +
        wos.map(function (w) { return '<option value="' + w.id + '">#' + w.id + ' · ' + esc(w.equip) + ' · ' + esc(w.issue) + '</option>'; }).join('') + '</select>' + icon('angle-small-down') + '</div></div>',
      foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" id="wl-all-ok">' + icon('shopping-cart') + 'Add to cart</button>',
    });
    dlg.el.querySelector('#wl-all-ok').addEventListener('click', function () {
      var v = dlg.el.querySelector('#wl-all-wo').value || null;
      dlg.close(); doAll(v);
    });
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  var s = SE.shell(el, {
    nav: 'lists', title: 'Shopping Lists', crumbs: [['Home', 'home']],
    sub: 'Company catalog: lists your fleet keeps for kits and restocks.',
    actions: '<button type="button" class="btn btn-primary" data-navnew>' + icon('plus-small') + 'New list</button>',
    body: '<div class="wl-two-panel"><div class="wl-sidebar-nav" id="wl-list-nav"></div><div class="wl-items-panel" id="wl-items-panel"></div></div>',
  });

  // ── Event delegation ─────────────────────────────────────────────────────
  el.addEventListener('click', function (e) {
    var navsel = e.target.closest('[data-navsel]');
    if (navsel && !e.target.closest('[data-navpin]')) {
      _activeListId = navsel.dataset.navsel;
      _renaming = false;
      render();
      return;
    }
    var navpin = e.target.closest('[data-navpin]');
    if (navpin) {
      e.stopPropagation();
      var list = SE.list(navpin.dataset.navpin);
      if (list) { list.pinned = !list.pinned; SE.saveLists(); render(); }
      return;
    }
    var t = e.target.closest('button');
    if (!t) return;
    var d = t.dataset;
    if (t.hasAttribute('data-navnew')) {
      LX.editor(null, function (l) { _activeListId = l.id; render(); });
      return;
    }
    if (t.hasAttribute('data-wlren')) { _renaming = true; renderItems(); return; }
    if (t.hasAttribute('data-wlrencancel')) { _renaming = false; renderItems(); return; }
    if (t.hasAttribute('data-wlrensave')) {
      var inp = el.querySelector('#wl-ren-inp'), nm = inp ? inp.value.trim() : '';
      var list = _activeListId ? SE.list(_activeListId) : null;
      if (list && nm) { list.name = nm; list.updatedBy = D.user.name; list.updatedAt = LX.today(); SE.saveLists(); }
      _renaming = false; render(); return;
    }
    if (t.hasAttribute('data-wlpub')) {
      var list = SE.list(d.wlid);
      if (list) { list.public = !list.public; SE.saveLists(); render(); }
      return;
    }
    if (t.hasAttribute('data-wledit')) {
      var list = SE.list(d.wlid);
      if (list) LX.editor(list, function () { render(); });
      return;
    }
    if (t.hasAttribute('data-wldel')) {
      var list = SE.list(d.wlid);
      if (list) {
        LX.confirmDelete(list, function () {
          var remaining = SE.lists();
          _activeListId = remaining.length ? remaining[0].id : null;
          render();
        });
      }
      return;
    }
    if (t.hasAttribute('data-wladdall')) { wlAddAll(d.wlid); return; }
    if (t.hasAttribute('data-wladd')) { wlAddOne(d.wpn, d.wlid); return; }
    if (t.hasAttribute('data-wlrm')) {
      var list = SE.list(d.wlid);
      if (list) { list.items = list.items.filter(function (i) { return i.pn !== d.wpn; }); SE.saveLists(); render(); }
      return;
    }
  });

  el.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-wlmove') && t.value) {
      var src = SE.list(t.dataset.wlid), dest = SE.list(t.value);
      if (src && dest) {
        var item = src.items.filter(function (i) { return i.pn === t.dataset.wpn; })[0];
        if (item) {
          if (!dest.items.some(function (i) { return i.pn === item.pn; })) dest.items.push({ pn: item.pn, qty: item.qty });
          src.items = src.items.filter(function (i) { return i.pn !== item.pn; });
          SE.saveLists(); render();
          SE.toast('Moved to "' + dest.name + '"', 'check');
        }
      }
      t.value = '';
    }
  });

  el.addEventListener('keydown', function (e) {
    if (!_renaming) return;
    if (e.key === 'Enter') { var sb = el.querySelector('[data-wlrensave]'); if (sb) sb.click(); }
    if (e.key === 'Escape') { _renaming = false; renderItems(); }
  });

  render();
  if (p.dialog === 'new') LX.editor(null, function (l) { _activeListId = l.id; render(); });
  return s.cleanup;
};

// Global: save a part to a shopping list from anywhere (part card, catalog, etc.)
SE.addToShoppingList = function (part) {
  if (!part) return;
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var myId = D.user.username;
  var myLists = SE.lists().filter(function (l) { return !l.ownerId || l.ownerId === myId; });

  function doAdd(listId) {
    var list = SE.list(listId);
    if (!list) return;
    var exists = list.items.some(function (i) { return i.pn === part.pn; });
    if (!exists) { list.items.push({ pn: part.pn, qty: 1 }); SE.saveLists(); }
    SE.toast((exists ? 'Already on "' : 'Saved to "') + list.name + '"', 'star');
  }

  function buildRows() {
    var cur = SE.lists().filter(function (l) { return !l.ownerId || l.ownerId === myId; });
    return cur.map(function (l) {
      var on = l.items.some(function (i) { return i.pn === part.pn; });
      return '<div class="slp-row" data-slpick="' + esc(l.id) + '">' +
        '<span class="slp-name">' + esc(l.name) + '</span>' +
        '<span class="slp-cnt">' + l.items.length + ' part' + (l.items.length !== 1 ? 's' : '') + '</span>' +
        (on ? '<span class="slp-on">' + icon('check') + 'On list</span>' : '<button type="button" class="btn btn-secondary slp-add" data-slpick="' + esc(l.id) + '">Add</button>') +
      '</div>';
    }).join('') || '<p class="slp-empty">No lists yet.</p>';
  }

  var createHtml = '<div id="slp-create" style="display:none;border-top:1px solid var(--line);padding:12px 0 4px;">' +
    '<input id="slp-new-name" placeholder="New list name…" class="slp-new-input" />' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
      '<button type="button" class="btn btn-primary" id="slp-new-save">Create &amp; add</button>' +
      '<button type="button" class="btn btn-secondary" id="slp-new-cancel">Cancel</button>' +
    '</div></div>';

  var dlg = UI.dialog({
    title: 'Save to shopping list',
    body: '<div style="margin-bottom:12px;font-size:13px;color:var(--muted);">Saving <b>' + esc(part.name) + '</b> · ' + esc(part.pn) + '</div>' +
      '<div id="slp-rows">' + buildRows() + '</div>' +
      '<button type="button" class="btn btn-secondary slp-new-toggle" style="margin-top:8px;width:100%;">' + icon('plus-small') + 'Create new list</button>' +
      createHtml,
    foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Close</button>',
  });

  dlg.el.addEventListener('click', function (e) {
    var pick = e.target.closest('[data-slpick]');
    if (pick) { dlg.close(); doAdd(pick.dataset.slpick); return; }
    if (e.target.closest('.slp-new-toggle')) {
      var c = dlg.el.querySelector('#slp-create'); c.style.display = 'block';
      var inp = dlg.el.querySelector('#slp-new-name'); if (inp) inp.focus();
      return;
    }
    if (e.target.closest('#slp-new-save')) {
      var name = (dlg.el.querySelector('#slp-new-name') || {}).value || '';
      if (!name.trim()) return;
      var list = SE.lx.editor ? null : null;
      var newList = { id: 'sl-' + Date.now().toString(36), name: name.trim(), description: '', tag: D.listTags[0], machine: null, items: [], ownerId: myId, pinned: false, public: false, updatedBy: D.user.name, updatedAt: SE.lx.today() };
      SE.lists().unshift(newList); SE.saveLists();
      dlg.close(); doAdd(newList.id);
      return;
    }
    if (e.target.closest('#slp-new-cancel')) {
      var c2 = dlg.el.querySelector('#slp-create'); if (c2) c2.style.display = 'none';
    }
  });
};
