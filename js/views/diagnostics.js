// ── Diagnostic Assistant view ─────────────────────────────────────────────────
// Module-level state persists across navigations within the same tab session.
var _diagSessions = [];
var _diagActiveId = null;
var _diagCart = [];
var _diagCartOpen = false;
var _diagMobileMsg = null; // message shown in mobile overlay

SE.titles.diagnostics = 'Diagnostic Assistant';

SE.views.diagnostics = function (el, p) {
  // ── In-session DS store shim ───────────────────────────────────────────────
  var DS = {
    getSessions: function () { return _diagSessions; },
    getActive: function () {
      for (var i = 0; i < _diagSessions.length; i++) {
        if (_diagSessions[i].id === _diagActiveId) return _diagSessions[i];
      }
      return null;
    },
    createSession: function (title) {
      var s = { id: 'ds' + Date.now(), title: title, createdAt: Date.now(), messages: [] };
      _diagSessions.unshift(s);
      _diagActiveId = s.id;
      return s;
    },
    setActive: function (id) { _diagActiveId = id; },
    deleteSession: function (id) {
      _diagSessions = _diagSessions.filter(function (s) { return s.id !== id; });
      if (_diagActiveId === id) {
        _diagActiveId = _diagSessions.length ? _diagSessions[0].id : null;
      }
    },
    getMessages: function () {
      var s = DS.getActive();
      return s ? s.messages : [];
    },
    addMessage: function (msg) {
      var s = DS.getActive();
      if (!s) return;
      s.messages.push(msg);
      if (s.messages.length === 2 && s.title === 'New chat') {
        s.title = msg.text ? msg.text.substring(0, 40) : 'Chat';
      }
    },
    clearMessages: function () {
      var s = DS.getActive();
      if (s) s.messages = [];
    },
  };

  // Start with one session if none exist
  if (!_diagSessions.length) DS.createSession('New chat');

  // ── Context ────────────────────────────────────────────────────────────────
  var _ctx = { type: 'none' };

  // ── PART catalog ──────────────────────────────────────────────────────────
  var PART_INFO = {
    'SKJ-103100':  { name: 'Lift Cylinder Seal Kit (full)',         price: 148.00 },
    'SKJ-103278':  { name: 'Pressure Relief Valve Assembly',        price: 212.50 },
    'SKJ-103445':  { name: 'Cylinder Rod Wiper Seal',               price:  42.00 },
    'SKJ-103512':  { name: 'Cylinder Piston Seal',                  price:  58.00 },
    'SKJ-103601':  { name: 'Hydraulic Pump O-ring Set',             price:  24.00 },
    'SKJ-CHK-302': { name: 'Check Valve — Lift Circuit',            price:  94.00 },
    'SKJ-HYD-200': { name: 'Gear Pump — Complete',                  price: 485.00 },
    'SKJ-HYD-201': { name: 'Gear Pump Seal Kit',                    price:  67.50 },
    'SKJ-HF046-1G':{ name: 'Hydraulic Fluid ISO 46 AW (1 gal)',     price:  18.00 },
    'SKJ-104880':  { name: 'Hydraulic Filter Element 10-micron',    price:  32.00 },
    'SKJ-SOL-301': { name: 'Lift Solenoid Valve Coil',              price:  88.00 },
    'SKJ-BAT-500': { name: '6V 220Ah Battery (each)',               price: 310.00 },
    'SKJ-CHR-501': { name: 'Battery Charger — 24V',                 price: 560.00 },
    'SKJ-CTL-502': { name: 'Base Controller Board',                 price:1420.00 },
    'SKJ-JOY-503': { name: 'Platform Joystick Module',              price: 640.00 },
    'SKJ-LIM-504': { name: 'Descent Safety Bar Limit Switch',       price:  44.00 },
    'SKJ-MTR-400': { name: 'Drive Motor — Brushless 24V',           price: 890.00 },
    'SKJ-HUB-401': { name: 'Drive Hub Assembly',                    price: 245.00 },
    'SKJ-PAD-601': { name: 'Scissor Arm Wear Pad Set (8pc)',        price:  76.00 },
    'SKJ-PIN-600': { name: 'Scissor Arm Pin 25mm',                  price:  38.00 },
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function relTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function renderMd(text) {
    return (text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function sevClass(sev) {
    var map = { critical: 'diag-sev-critical', high: 'diag-sev-high', medium: 'diag-sev-medium', low: 'diag-sev-low' };
    return map[sev] || 'diag-sev-low';
  }

  function cartTotal() {
    return _diagCart.reduce(function (s, i) { return s + (i.price || 0) * i.qty; }, 0);
  }

  function cartHas(partNo) {
    return _diagCart.some(function (i) { return i.partNo === partNo; });
  }

  function ctxLabel() {
    if (!_ctx || _ctx.type === 'none') return 'General';
    if (_ctx.type === 'wo') {
      var wo = SE.wo(_ctx.woId);
      return wo ? 'WO #' + wo.id + ' — ' + (wo.machine || wo.name || '') : 'WO #' + _ctx.woId;
    }
    return 'General';
  }

  function ctxIcon() {
    if (_ctx && _ctx.type === 'wo') return 'clipboard-list';
    return 'comment';
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function renderSessionsList() {
    var panel = el.querySelector('#diag-sessions-panel');
    if (!panel) return;
    var sessions = DS.getSessions();
    var activeId = _diagActiveId;
    if (!sessions.length) {
      panel.innerHTML = '<div style="padding:16px 10px;font-size:11px;color:var(--muted);text-align:center;">No previous chats</div>';
      return;
    }
    panel.innerHTML = sessions.map(function (s) {
      return '<div class="diag-session-item' + (s.id === activeId ? ' active' : '') + '" onclick="diagSwitchSession(\'' + s.id + '\')">' +
        '<span class="diag-session-title">' + SE.esc(s.title) + '</span>' +
        '<button class="diag-session-del" onclick="event.stopPropagation();diagDeleteSession(\'' + s.id + '\')" title="Delete session">' +
          SE.icon('trash') +
        '</button>' +
      '</div>';
    }).join('');
  }

  function renderContextBar() {
    var bar = el.querySelector('#diag-ctx-bar');
    if (!bar) return;
    if (!_ctx || _ctx.type === 'none') {
      bar.innerHTML =
        SE.icon('comment', '') +
        '<span class="diag-ctx-label">SJIII 3219</span>' +
        '<span class="diag-ctx-gap"></span>' +
        '<button class="diag-ctx-set-btn" onclick="diagSetWOContext()" title="Link this session to a work order">' +
          SE.icon('clipboard-list') + 'Link to WO' +
        '</button>';
      return;
    }
    bar.innerHTML = SE.icon(ctxIcon(), '') +
      '<span class="diag-ctx-label">Context:</span>' +
      '<button class="diag-ctx-value" onclick="diagSetWOContext()" title="Change work order" style="cursor:pointer;">' + SE.esc(ctxLabel()) + '</button>' +
      '<button class="diag-ctx-clear" onclick="diagClearCtx()" title="Clear context">' + SE.icon('cross-small') + '</button>';
  }

  function renderCartCount() {
    var btn = el.querySelector('#diag-cart-btn');
    if (!btn) return;
    var n = _diagCart.reduce(function (s, i) { return s + i.qty; }, 0);
    var badge = el.querySelector('#diag-cart-count');
    if (badge) badge.textContent = n;
    btn.style.display = '';
  }

  function buildWelcomeHtml() {
    var symptomChips = [
      "Platform won't elevate",
      'Platform drifting down',
      "Won't drive",
      'Slow lift',
      'Hydraulic leak',
      'Battery not charging',
      'Maintenance schedule',
      'Wear pads and scissor pins',
    ];
    var fcGroups = [
      { keys: ['HYD-01','HYD-02','HYD-03','HYD-04','HYD-05'], cls: 'diag-suggest-fc-hyd' },
      { keys: ['ELC-01','ELC-02','ELC-03','ELC-04','ELC-05'], cls: 'diag-suggest-fc-elc' },
      { keys: ['DRV-01','DRV-02','DRV-03'],                   cls: 'diag-suggest-fc-drv' },
    ];
    var manualRefs = [
      { chapter: '1',          title: 'Safety Rules',       query: 'Safety rules and pre-operation checklist' },
      { chapter: '2.8',        title: 'Daily Inspection',   query: 'Daily maintenance inspections checklist' },
      { chapter: '2.9',        title: 'Function Tests',     query: 'Function tests procedure' },
      { chapter: '2.14',       title: 'Brake Release',      query: 'Winching towing and brake release procedure' },
      { chapter: '2.15',       title: 'Emergency Lowering', query: 'Emergency lowering procedure' },
      { chapter: '2.17',       title: 'Battery Maint.',     query: 'Battery maintenance and charging' },
      { chapter: 'Table 2.3',  title: 'Specifications',     query: 'SJIII 3219 specifications table' },
      { chapter: 'Table 2.6',  title: 'Service Schedule',   query: 'Maintenance inspection schedule intervals' },
    ];

    return '<div class="diag-welcome">' +
      '<div class="diag-welcome-head">' +
        SE.icon('star', 'diag-welcome-icon') +
        '<h2>Skyjack SJIII 3219 Diagnostic Assistant</h2>' +
        '<p>Describe a symptom, enter a fault code, or tap a manual section. I\'ll walk through the diagnosis with you.</p>' +
      '</div>' +
      '<div class="diag-suggest-group">' +
        '<div class="diag-suggest-label">Common Symptoms</div>' +
        '<div class="diag-suggest-chips">' +
          symptomChips.map(function (s) {
            return '<button class="diag-suggest-chip" onclick="diagSuggest(\'' + s.replace(/\'/g, '\\\'') + '\')">' + SE.esc(s) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="diag-suggest-group">' +
        '<div class="diag-suggest-label">Fault Code Lookup — All Codes</div>' +
        '<div class="diag-suggest-chips">' +
          fcGroups.map(function (g) {
            return g.keys.map(function (fc) {
              var info = SJ3219_FAULT_CODES[fc] || {};
              return '<button class="diag-suggest-chip diag-suggest-fc ' + g.cls + '" onclick="diagSuggest(\'' + fc + '\')" title="' + SE.esc(info.title || fc) + '">' + fc + '</button>';
            }).join('');
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="diag-suggest-group">' +
        '<div class="diag-suggest-label">Manual Reference</div>' +
        '<div class="diag-suggest-chips">' +
          manualRefs.map(function (ref) {
            return '<button class="diag-suggest-chip diag-suggest-manual" onclick="diagSuggest(\'' + ref.query.replace(/\'/g, '\\\'') + '\')">' +
              SE.icon('book-alt') + 'Ch. ' + SE.esc(ref.chapter) + ' — ' + SE.esc(ref.title) +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderMessages() {
    var area = el.querySelector('#diag-messages');
    if (!area) return;
    var msgs = DS.getMessages();
    if (!msgs.length) {
      area.innerHTML = buildWelcomeHtml();
      return;
    }
    area.innerHTML = msgs.map(function (msg, idx) {
      if (msg.role === 'user') {
        return '<div class="diag-msg diag-msg-user">' +
          '<div class="diag-avatar diag-avatar-user">YOU</div>' +
          '<div class="diag-bubble diag-bubble-user">' + SE.esc(msg.text) + '</div>' +
        '</div>';
      }
      return '<div class="diag-msg diag-msg-ai">' +
        '<div class="diag-avatar diag-avatar-ai">' + SE.icon('star') + '</div>' +
        '<div>' + renderAiCard(msg.resp, idx) + '</div>' +
      '</div>';
    }).join('');
    area.scrollTop = area.scrollHeight;
  }

  function renderAiCard(resp, idx) {
    var stepsHtml = '';
    if (resp.steps && resp.steps.length) {
      stepsHtml = '<ul class="diag-steps">' +
        resp.steps.map(function (s, i) {
          return '<li class="diag-step"><span class="diag-step-num">' + (i + 1) + '</span><span>' + renderMd(s) + '</span></li>';
        }).join('') +
      '</ul>';
    }

    var refsHtml = '';
    if (resp.manualRefs && resp.manualRefs.length) {
      refsHtml = '<div class="diag-refs">' +
        resp.manualRefs.map(function (ref) {
          return '<button class="diag-ref-btn" onclick="diagOpenManual(\'' + SE.esc(ref.id) + '\',\'' + SE.esc(ref.title) + '\')">' +
            SE.icon('book-alt') +
            '<span class="diag-ref-label">' +
              '<span class="diag-ref-ch">Ch.' + SE.esc(ref.chapter) + '</span>' +
              '<span class="diag-ref-title">' + SE.esc(ref.title) + '</span>' +
            '</span>' +
            '<span style="font-size:11px;color:var(--muted);">p.' + ref.page + '</span>' +
          '</button>';
        }).join('') +
      '</div>';
    }

    var fcHtml = '';
    if (resp.faultCodes && resp.faultCodes.length) {
      fcHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">' +
        resp.faultCodes.map(function (fc) {
          return '<button onclick="diagLookupFc(\'' + fc + '\')" style="' +
            'padding:2px 8px;border-radius:6px;border:1px solid var(--line);' +
            'font-size:11px;font-weight:700;color:var(--link);background:var(--tint-info);' +
          '">' + fc + '</button>';
        }).join('') +
      '</div>';
    }

    var partsHtml = '';
    if (resp.parts && resp.parts.length) {
      partsHtml = '<div class="diag-parts">' +
        resp.parts.map(function (partNo) {
          var pi = PART_INFO[partNo] || { name: partNo, price: null };
          var inCart = cartHas(partNo);
          var safeId = partNo.replace(/[^A-Za-z0-9]/g, '-');
          var addBtn = inCart
            ? '<button class="diag-part-added" disabled>' + SE.icon('check') + 'In cart</button>'
            : '<button class="diag-part-add" onclick="diagAddToCart(\'' + partNo + '\')">' + SE.icon('shopping-cart') + 'Add</button>';
          var priceHtml = pi.price
            ? '<div class="diag-part-price">$' + pi.price.toFixed(2) + '<small>ea.</small></div>'
            : '';
          return '<div class="diag-part-card" id="pcard-' + safeId + '">' +
            '<div class="diag-part-info">' +
              '<div class="diag-part-num">' + SE.esc(partNo) + '</div>' +
              '<div class="diag-part-name">' + SE.esc(pi.name) + '</div>' +
            '</div>' +
            priceHtml + addBtn +
          '</div>';
        }).join('') +
      '</div>';
    }

    var sevBadge = '<span class="diag-sev ' + sevClass(resp.severity) + '">' +
      (resp.severity || 'low').toUpperCase() + '</span>';

    return '<div style="max-width:640px;">' +
      sevBadge +
      '<div class="diag-bubble diag-bubble-ai">' +
        fcHtml +
        '<p>' + renderMd(resp.body) + '</p>' +
        stepsHtml +
        refsHtml +
        partsHtml +
      '</div>' +
    '</div>';
  }

  function renderCart() {
    var overlay = el.querySelector('#diag-cart-overlay');
    if (!overlay) return;
    if (!_diagCartOpen) { overlay.style.display = 'none'; return; }
    overlay.style.display = 'flex';

    var total = cartTotal();
    var itemsHtml = _diagCart.length
      ? _diagCart.map(function (item) {
          return '<div class="diag-cart-row">' +
            '<div class="diag-cart-row-info">' +
              '<div class="diag-cart-row-num">' + SE.esc(item.partNo) + '</div>' +
              '<div class="diag-cart-row-name">' + SE.esc(item.name) + '</div>' +
            '</div>' +
            '<div class="diag-cart-qty">' +
              '<button class="diag-cart-qty-btn" onclick="diagCartQty(\'' + item.partNo + '\',-1)">-</button>' +
              '<span class="diag-cart-qty-num">' + item.qty + '</span>' +
              '<button class="diag-cart-qty-btn" onclick="diagCartQty(\'' + item.partNo + '\',1)">+</button>' +
            '</div>' +
            '<div class="diag-cart-row-price">$' + ((item.price || 0) * item.qty).toFixed(2) + '</div>' +
          '</div>';
        }).join('')
      : '<div class="diag-cart-empty">' + SE.icon('shopping-cart') + 'Cart is empty</div>';

    overlay.innerHTML =
      '<div class="diag-cart-panel">' +
        '<div class="diag-cart-head">' +
          '<h2>Parts Cart</h2>' +
          '<button class="diag-cart-close" onclick="diagToggleCart()">' + SE.icon('cross-small') + '</button>' +
        '</div>' +
        '<div class="diag-cart-items">' + itemsHtml + '</div>' +
        (_diagCart.length
          ? '<div class="diag-cart-foot">' +
              '<div class="diag-cart-total"><span>Total</span><strong>$' + total.toFixed(2) + '</strong></div>' +
              '<button class="diag-cart-wo-btn" onclick="diagCreateWO()">' +
                SE.icon('clipboard-list') + 'Create Work Order' +
              '</button>' +
              '<button class="diag-cart-wo-add-btn" onclick="diagAddToExistingWO()">' +
                SE.icon('plus-small') + 'Add to Existing WO' +
              '</button>' +
            '</div>'
          : '') +
      '</div>';
  }

  // ── Shell setup ────────────────────────────────────────────────────────────
  var s = SE.shell(el, {
    nav: 'diagnostics',
    title: 'Diagnostic Assistant',
    sub: 'Skyjack SJIII 3219',
    crumbs: [['Home', 'home']],
    body: '<div class="diag-wrap" id="diag-wrap">' +
      // sessions panel
      '<div class="diag-sessions">' +
        '<div class="diag-sessions-head">' +
          '<span>SESSIONS</span>' +
          '<button class="diag-new-btn" onclick="diagNewChat()" title="New chat">' + SE.icon('plus-small') + '</button>' +
        '</div>' +
        '<div class="diag-sessions-list" id="diag-sessions-panel"></div>' +
      '</div>' +
      // main
      '<div class="diag-main">' +
        '<div class="diag-ctx-bar" id="diag-ctx-bar"></div>' +
        '<div class="diag-toolbar">' +
          '<span class="diag-toolbar-title">Skyjack SJIII 3219</span>' +
          '<button class="diag-cart-btn" id="diag-cart-btn" onclick="diagToggleCart()" title="Parts cart">' +
            SE.icon('shopping-cart') + 'Cart' +
            '<span class="diag-cart-count" id="diag-cart-count">0</span>' +
          '</button>' +
        '</div>' +
        '<div class="diag-messages" id="diag-messages"></div>' +
        '<div class="diag-input-area">' +
          '<div class="diag-input-row" id="diag-input-row">' +
            '<textarea id="diag-chat-input" rows="1" placeholder="Describe a symptom or enter a fault code (e.g. HYD-04)…" ' +
              'oninput="diagAutoResize(this)" onkeydown="diagInputKey(event)"></textarea>' +
            '<button class="diag-send-btn" id="diag-send-btn" onclick="diagSend()" disabled>' +
              SE.icon('arrow-small-right') +
            '</button>' +
          '</div>' +
          '<div class="diag-input-hint">Scoped to SJIII 3219 service manual &amp; parts database</div>' +
        '</div>' +
      '</div>' +
    '</div>',
  });

  // Patch content area to fill the shell height
  s.content.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;padding:0;overflow:hidden;';

  // Cart overlay — appended outside the shell content
  var cartEl = document.createElement('div');
  cartEl.id = 'diag-cart-overlay';
  cartEl.style.display = 'none';
  el.appendChild(cartEl);

  // Mobile overlay
  var mobEl = document.createElement('div');
  mobEl.id = 'diag-mobile-overlay';
  mobEl.style.display = 'none';
  el.appendChild(mobEl);

  // Initial renders
  renderSessionsList();
  renderContextBar();
  renderMessages();
  renderCartCount();

  // Input textarea auto-resize
  window.diagAutoResize = function (ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    el.querySelector('#diag-send-btn').disabled = !ta.value.trim();
  };

  window.diagInputKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var ta = el.querySelector('#diag-chat-input');
      if (ta && ta.value.trim()) diagSend();
    }
  };

  // ── Chat send ──────────────────────────────────────────────────────────────
  window.diagSend = function () {
    var ta = el.querySelector('#diag-chat-input');
    if (!ta) return;
    var text = ta.value.trim();
    if (!text) return;

    if (!DS.getActive()) DS.createSession('New chat');

    DS.addMessage({ role: 'user', text: text });
    ta.value = '';
    ta.style.height = 'auto';
    el.querySelector('#diag-send-btn').disabled = true;
    renderMessages();

    // Thinking indicator
    var area = el.querySelector('#diag-messages');
    var thinking = document.createElement('div');
    thinking.className = 'diag-thinking';
    thinking.innerHTML = '<div class="diag-avatar diag-avatar-ai">' + SE.icon('star') + '</div>' +
      '<div class="diag-thinking-dots"><span></span><span></span><span></span></div>';
    area.appendChild(thinking);
    area.scrollTop = area.scrollHeight;

    setTimeout(function () {
      var resp = diagGenerateResponse(text, _ctx);
      if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
      DS.addMessage({ role: 'ai', resp: resp });
      renderSessionsList();
      renderMessages();
    }, 400 + Math.random() * 400);
  };

  // ── Session management ─────────────────────────────────────────────────────
  window.diagNewChat = function () {
    DS.createSession('New chat');
    renderSessionsList();
    renderMessages();
    renderContextBar();
    var ta = el.querySelector('#diag-chat-input');
    if (ta) ta.focus();
  };

  window.diagSwitchSession = function (id) {
    DS.setActive(id);
    _diagActiveId = id;
    renderSessionsList();
    renderMessages();
  };

  window.diagDeleteSession = function (id) {
    DS.deleteSession(id);
    renderSessionsList();
    renderMessages();
  };

  // ── Cart ───────────────────────────────────────────────────────────────────
  window.diagAddToCart = function (partNo) {
    if (cartHas(partNo)) return;
    var pi = PART_INFO[partNo] || { name: partNo, price: null };
    _diagCart.push({ partNo: partNo, name: pi.name, price: pi.price, qty: 1 });
    renderMessages(); // refresh add buttons
    renderCartCount();
    if (_diagCartOpen) renderCart();
  };

  window.diagCartQty = function (partNo, delta) {
    for (var i = 0; i < _diagCart.length; i++) {
      if (_diagCart[i].partNo === partNo) {
        _diagCart[i].qty = Math.max(1, _diagCart[i].qty + delta);
        break;
      }
    }
    renderCart();
    renderCartCount();
  };

  window.diagCartRemove = function (partNo) {
    _diagCart = _diagCart.filter(function (i) { return i.partNo !== partNo; });
    renderCart();
    renderCartCount();
    renderMessages();
  };

  window.diagToggleCart = function () {
    _diagCartOpen = !_diagCartOpen;
    renderCart();
  };

  // ── Create new WO from cart ────────────────────────────────────────────────
  window.diagCreateWO = function () {
    if (!_diagCart.length) return;
    _diagCartOpen = false;
    renderCart();

    var items = _diagCart.slice();
    SE.work.newDialog({
      onCreate: function (wo) {
        // Attach parts note to WO
        if (wo) {
          var notes = items.map(function (i) {
            return i.partNo + ' ×' + i.qty + ' — ' + i.name;
          }).join('\n');
          if (wo.notes !== undefined) {
            wo.notes = (wo.notes ? wo.notes + '\n\n' : '') + 'Parts from Diagnostic Assistant:\n' + notes;
          }
          SE.save();
          _diagCart = [];
          renderCartCount();
          renderMessages();
        }
      }
    });
  };

  // ── Add to existing WO ─────────────────────────────────────────────────────
  window.diagAddToExistingWO = function () {
    if (!_diagCart.length) return;
    var wos = SE.allWorkOrders().filter(function (w) {
      return w.status === 'open' || w.status === 'active' || w.status === 'in-progress';
    });

    var listHtml = wos.length
      ? '<div class="diag-wo-list">' +
          wos.map(function (w) {
            return '<div class="diag-wo-row" onclick="diagConfirmAddToWO(\'' + w.id + '\')">' +
              '<div class="diag-wo-row-info">' +
                '<div class="diag-wo-num">WO #' + SE.esc(String(w.id)) + '</div>' +
                '<div class="diag-wo-name">' + SE.esc(w.machine || w.name || 'Work order') + '</div>' +
              '</div>' +
              SE.icon('arrow-small-right') +
            '</div>';
          }).join('') +
        '</div>'
      : '<p style="font-size:13px;color:var(--muted);">No open work orders found. Create a new one instead.</p>';

    SE.ui.dialog({
      title: 'Add Parts to Work Order',
      body: '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Select a work order to attach these parts to:</div>' + listHtml,
      foot: '<button class="btn btn-secondary" data-dlg-close>Cancel</button>',
    });
  };

  window.diagConfirmAddToWO = function (woId) {
    var wo = SE.wo(woId);
    if (!wo) return;
    var items = _diagCart.slice();
    var notes = items.map(function (i) {
      return i.partNo + ' ×' + i.qty + ' — ' + i.name;
    }).join('\n');
    if (wo.notes !== undefined) {
      wo.notes = (wo.notes ? wo.notes + '\n\n' : '') + 'Parts from Diagnostic Assistant:\n' + notes;
    }
    SE.save();
    _diagCart = [];
    renderCartCount();
    renderMessages();
    _diagCartOpen = false;
    renderCart();

    // close any open dialog
    var dlgClose = document.querySelector('[data-dlg-close]');
    if (dlgClose) dlgClose.click();
  };

  // ── Fault code lookup ──────────────────────────────────────────────────────
  window.diagLookupFc = function (code) {
    var ta = el.querySelector('#diag-chat-input');
    if (!ta) return;
    ta.value = code;
    diagAutoResize(ta);
    diagSend();
  };

  // ── Manual reference ───────────────────────────────────────────────────────
  window.diagOpenManual = function (sectionId, sectionTitle) {
    var section = null;
    for (var i = 0; i < SJ3219_SECTIONS.length; i++) {
      if (SJ3219_SECTIONS[i].id === sectionId) { section = SJ3219_SECTIONS[i]; break; }
    }
    if (!section) return;

    var pdfPage = section.pdfPage || section.page;
    var pdfUrl = window.SJIII_MANUAL_PDF;

    var body = '<div style="font-size:13px;line-height:20px;color:var(--ink);">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
        SE.icon('book-alt') +
        '<strong>Chapter ' + SE.esc(section.chapter) + ' — ' + SE.esc(section.title) + '</strong>' +
        '<span style="margin-left:auto;font-size:11px;color:var(--muted);">p.' + section.page + '</span>' +
      '</div>' +
      '<p style="color:var(--muted);margin:0 0 16px;">' + SE.esc(section.summary) + '</p>';

    if (pdfUrl) {
      body += '<iframe src="' + pdfUrl + '#page=' + pdfPage + '" ' +
        'style="width:100%;height:480px;border:1px solid var(--line);border-radius:8px;" ' +
        'title="SJIII Manual"></iframe>';
    } else {
      body += '<div style="padding:24px;border:1px solid var(--line);border-radius:8px;text-align:center;color:var(--muted);font-size:12px;">' +
        SE.icon('document') +
        '<br>Manual PDF not available in this environment.<br>' +
        '<span style="font-size:11px;">Reference: p.' + section.page + ' of the SJIII 3219 Service Manual (143857AD-A)</span>' +
      '</div>';
    }
    body += '</div>';

    SE.ui.dialog({
      title: 'Manual Reference',
      body: body,
      wide: true,
      foot: '<button class="btn btn-secondary" data-dlg-close>Close</button>',
    });
  };

  // ── Context management ─────────────────────────────────────────────────────
  window.diagClearCtx = function () {
    _ctx = { type: 'none' };
    renderContextBar();
  };

  window.diagSetCtx = function (type, id) {
    if (type === 'wo') _ctx = { type: 'wo', woId: id };
    else _ctx = { type: 'none' };
    renderContextBar();
  };

  // ── Mobile overlay ─────────────────────────────────────────────────────────
  window.diagToggleMobile = function (msgIdx) {
    var overlay = el.querySelector('#diag-mobile-overlay');
    if (!overlay) return;
    var msgs = DS.getMessages();
    var msg = msgs[msgIdx];
    if (!msg || msg.role !== 'ai') { overlay.style.display = 'none'; return; }
    overlay.style.display = 'flex';
    overlay.className = 'diag-mobile-overlay';
    overlay.innerHTML =
      '<div class="diag-mobile-head">' +
        '<button class="diag-mobile-close" onclick="diagToggleMobile(-1)">' + SE.icon('arrow-small-left') + '</button>' +
        '<span class="diag-mobile-title">' + SE.esc(msg.resp.title || 'Response') + '</span>' +
      '</div>' +
      '<div class="diag-mobile-body">' + renderAiCard(msg.resp, msgIdx) + '</div>';
  };

  // ── Suggestion prompt shortcuts ────────────────────────────────────────────
  window.diagSuggest = function (text) {
    var ta = el.querySelector('#diag-chat-input');
    if (!ta) return;
    ta.value = text;
    diagAutoResize(ta);
    ta.focus();
    // Send immediately — suggestion chips are pre-formed queries
    diagSend();
  };

  // ── WO context picker ──────────────────────────────────────────────────────
  window.diagSetWOContext = function () {
    var wos = SE.allWorkOrders();
    if (!wos.length) {
      SE.ui.dialog({
        title: 'Link to Work Order',
        body: '<p style="font-size:13px;color:var(--muted);">No work orders found. Create a work order first, then link it here to give the assistant context about the specific machine and fault history.</p>',
        foot: '<button class="btn btn-secondary" data-dlg-close>Close</button>',
      });
      return;
    }

    var listHtml = '<div class="diag-wo-list">' +
      wos.map(function (w) {
        var active = _ctx.type === 'wo' && _ctx.woId === w.id;
        return '<div class="diag-wo-row' + (active ? ' diag-wo-row-active' : '') + '" onclick="diagConfirmSetWO(\'' + w.id + '\')">' +
          '<div class="diag-wo-row-info">' +
            '<div class="diag-wo-num">WO #' + SE.esc(String(w.id)) + '</div>' +
            '<div class="diag-wo-name">' + SE.esc(w.machine || w.name || 'Work order') + '</div>' +
          '</div>' +
          (active ? SE.icon('check') : SE.icon('arrow-small-right')) +
        '</div>';
      }).join('') +
      '<div class="diag-wo-row" onclick="diagConfirmSetWO(null)" style="border-style:dashed;">' +
        '<div class="diag-wo-row-info">' +
          '<div class="diag-wo-name" style="color:var(--muted);">No context (general)</div>' +
        '</div>' +
        SE.icon('cross-small') +
      '</div>' +
    '</div>';

    SE.ui.dialog({
      title: 'Link to Work Order',
      body: '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Select a work order to give the assistant context about the machine and job:</div>' + listHtml,
      foot: '<button class="btn btn-secondary" data-dlg-close>Cancel</button>',
    });
  };

  window.diagConfirmSetWO = function (woId) {
    if (!woId) {
      _ctx = { type: 'none' };
    } else {
      _ctx = { type: 'wo', woId: woId };
    }
    renderContextBar();
    // close dialog
    var btn = document.querySelector('[data-dlg-close]');
    if (btn) btn.click();
  };

  // ── Focus input ────────────────────────────────────────────────────────────
  setTimeout(function () {
    var ta = el.querySelector('#diag-chat-input');
    if (ta) ta.focus();
  }, 50);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  return function cleanup() {
    var globals = [
      'diagSend', 'diagNewChat', 'diagSwitchSession', 'diagDeleteSession',
      'diagAddToCart', 'diagCartQty', 'diagCartRemove', 'diagToggleCart',
      'diagCreateWO', 'diagAddToExistingWO', 'diagConfirmAddToWO',
      'diagLookupFc', 'diagOpenManual', 'diagClearCtx', 'diagSetCtx',
      'diagToggleMobile', 'diagAutoResize', 'diagInputKey',
      'diagSuggest', 'diagSetWOContext', 'diagConfirmSetWO',
    ];
    globals.forEach(function (g) { delete window[g]; });
  };
};
