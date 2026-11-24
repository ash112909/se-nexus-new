// Module-level session state — persists across nav
var _diagSessions = [];
var _diagActiveId = null;

function _dsEnsure() {
  if (!_diagSessions.length) {
    var s = { id: 'ds-' + Date.now(), title: 'New chat', messages: [], createdAt: Date.now() };
    _diagSessions.push(s);
    _diagActiveId = s.id;
  }
}
_dsEnsure();

var _DS = {
  getSessions: function() { return _diagSessions; },
  getActive: function() {
    return _diagSessions.filter(function(s) { return s.id === _diagActiveId; })[0] || _diagSessions[0] || null;
  },
  createSession: function(t) {
    var s = { id: 'ds-' + Date.now(), title: t || 'New chat', messages: [], createdAt: Date.now() };
    _diagSessions.unshift(s); _diagActiveId = s.id; return s;
  },
  setActive: function(id) { _diagActiveId = id; },
  deleteSession: function(id) {
    _diagSessions = _diagSessions.filter(function(s) { return s.id !== id; });
    if (_diagActiveId === id) _diagActiveId = _diagSessions.length ? _diagSessions[0].id : null;
    _dsEnsure();
  },
  getMessages: function() { var a = _DS.getActive(); return a ? a.messages : []; },
  addMessage: function(msg) {
    var a = _DS.getActive();
    if (!a) { _DS.createSession('New chat'); a = _DS.getActive(); }
    a.messages.push(msg);
    if (msg.role === 'user' && a.messages.filter(function(m) { return m.role === 'user'; }).length === 1)
      a.title = (msg.text || '').slice(0, 40) || 'New chat';
  },
  clearMessages: function() { var a = _DS.getActive(); if (a) a.messages = []; }
};

SE.titles = SE.titles || {};
SE.titles.diagnostics = 'Diagnostic Assistant';

SE.views.diagnostics = function(el, p) {
  var _ctx = { type: 'none' };

  // ── Session helpers ───────────────────────────────────────────────────────
  function renderSessions() {
    var panel = document.getElementById('diag-sessions-panel');
    if (!panel) return;
    var sessions = _DS.getSessions();
    var active = _DS.getActive();
    var activeId = active ? active.id : null;
    panel.innerHTML =
      '<div class="ds-header">' +
        '<button class="ds-new-btn" onclick="diagNewChat()">' + SE.icon('plus-small') + ' New chat</button>' +
      '</div>' +
      '<div class="ds-list">' +
        (sessions.length === 0 ? '<div style="padding:12px 10px;font-size:11px;color:#6C7082;text-align:center;">No previous chats</div>' : '') +
        sessions.map(function(s) {
          return '<div class="ds-item ' + (s.id === activeId ? 'ds-item-active' : '') + '" onclick="diagSwitchSession(\'' + s.id + '\')">' +
            '<div class="ds-item-title">' + escHtml(s.title) + '</div>' +
            '<div class="ds-item-foot">' +
              '<span class="ds-item-time">' + _relTime(s.createdAt) + '</span>' +
              '<button class="ds-item-del" onclick="event.stopPropagation();diagDeleteSession(\'' + s.id + '\')" title="Delete">' + SE.icon('trash') + '</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
  }

  function _relTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  window.diagNewChat = function() {
    _DS.createSession('New chat');
    renderSessions();
    renderMessages();
    renderContextBar();
    var inp = document.getElementById('diag-chat-input');
    if (inp) inp.focus();
  };

  window.diagSwitchSession = function(id) {
    _DS.setActive(id);
    renderSessions();
    renderMessages();
  };

  window.diagDeleteSession = function(id) {
    _DS.deleteSession(id);
    renderSessions();
    renderMessages();
  };

  // ── Cart state ────────────────────────────────────────────────────────────
  var _diagCart = [];
  var _cartOpen = false;

  var PART_INFO = {
    'SKJ-103100':  { desc: 'Lift Cylinder Seal Kit (full)',      price: 148.00 },
    'SKJ-103278':  { desc: 'Pressure Relief Valve Assembly',     price: 212.50 },
    'SKJ-103445':  { desc: 'Cylinder Rod Wiper Seal',            price: 42.00  },
    'SKJ-103512':  { desc: 'Cylinder Piston Seal',               price: 58.00  },
    'SKJ-103601':  { desc: 'Hydraulic Pump O-ring Set',          price: 24.00  },
    'SKJ-CHK-302': { desc: 'Check Valve — Lift Circuit',    price: 94.00  },
    'SKJ-HYD-200': { desc: 'Gear Pump — Complete',          price: 485.00 },
    'SKJ-HYD-201': { desc: 'Gear Pump Seal Kit',                 price: 67.50  },
    'SKJ-HF046-1G':{ desc: 'Hydraulic Fluid ISO 46 AW (1 gal)', price: 18.00  },
    'SKJ-104880':  { desc: 'Hydraulic Filter Element 10-micron', price: 32.00  },
    'SKJ-SOL-301': { desc: 'Lift Solenoid Valve Coil',           price: 88.00  },
    'SKJ-BAT-500': { desc: '6V 220Ah Battery (each)',            price: 310.00 },
    'SKJ-CHR-501': { desc: 'Battery Charger — 24V',         price: 560.00 },
    'SKJ-CTL-502': { desc: 'Base Controller Board',              price: 1420.00},
    'SKJ-JOY-503': { desc: 'Platform Joystick Module',           price: 640.00 },
    'SKJ-LIM-504': { desc: 'Descent Safety Bar Limit Switch',    price: 44.00  },
    'SKJ-MTR-400': { desc: 'Drive Motor — Brushless 24V',   price: 890.00 },
    'SKJ-HUB-401': { desc: 'Drive Hub Assembly',                 price: 245.00 },
    'SKJ-PAD-601': { desc: 'Scissor Arm Wear Pad Set (8pc)',     price: 76.00  },
    'SKJ-PIN-600': { desc: 'Scissor Arm Pin 25mm',               price: 38.00  }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMd(text) {
    return (text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="rp">')
      .replace(/\n/g, '<br>');
  }

  function severityBadge(sev) {
    var map = {
      critical: ['#B91C1C', '#FEE2E2', 'CRITICAL'],
      high:     ['#C2410C', '#FFF7ED', 'HIGH'],
      medium:   ['#B45309', '#FFFBEB', 'MEDIUM'],
      low:      ['#1A1A1A', '#FFFBEB', 'LOW']
    };
    var m = map[sev] || map.low;
    return '<span style="background:' + m[1] + ';color:' + m[0] + ';border:1px solid ' + m[0] + '30;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;letter-spacing:.7px;">' + m[2] + '</span>';
  }

  function partInfo(partNo) { return PART_INFO[partNo] || { desc: partNo, price: null }; }

  function cartTotal() {
    return _diagCart.reduce(function(s, i) { return s + (i.price || 0) * i.qty; }, 0);
  }

  function cartHasItem(partNo) {
    return _diagCart.some(function(i) { return i.partNo === partNo; });
  }

  // ── Context helpers ───────────────────────────────────────────────────────
  function ctxLabel(ctx) {
    if (!ctx || ctx.type === 'none') return 'General';
    if (ctx.type === 'wo') {
      var wo = SE.wo && SE.wo(ctx.woId);
      return wo ? 'WO #' + wo.id + ' — ' + wo.machine : 'WO #' + ctx.woId;
    }
    if (ctx.type === 'parts') return ctx.query ? 'Parts: "' + ctx.query + '"' : 'Parts search';
    return 'General';
  }
  function ctxIcon(ctx) {
    if (!ctx || ctx.type === 'none') return 'comment';
    if (ctx.type === 'wo') return 'clipboard-list';
    if (ctx.type === 'parts') return 'search';
    return 'comment';
  }
  function ctxColor(ctx) {
    if (!ctx || ctx.type === 'none') return '#8A8FA8';
    if (ctx.type === 'wo') return '#111318';
    if (ctx.type === 'parts') return '#7C6FF7';
    return '#8A8FA8';
  }

  // ── Rich response card ────────────────────────────────────────────────────
  function renderAiCard(resp) {
    var sev = severityBadge(resp.severity);

    var stepsHtml = resp.steps && resp.steps.length
      ? '<div class="rc-section">' +
          '<div class="rc-section-lbl">Step-by-step procedure</div>' +
          '<ol class="rc-steps">' + resp.steps.map(function(s) { return '<li>' + renderMd(s) + '</li>'; }).join('') + '</ol>' +
        '</div>'
      : '';

    var manualsHtml = resp.manualRefs && resp.manualRefs.length
      ? '<div class="rc-section">' +
          '<div class="rc-section-lbl">Manual references</div>' +
          '<div class="rc-chips">' + resp.manualRefs.map(function(ref) {
            return '<span class="rc-chip rc-chip-manual" onclick="diagOpenManual(\'' + ref.id + '\',\'' + escHtml(ref.title) + '\')" title="' + escHtml(ref.summary || '') + '">' +
              SE.icon('book-alt') + ' Ch.' + ref.chapter + ' — ' + escHtml(ref.title) +
              '<span style="opacity:.6;margin-left:3px;">p.' + ref.page + '</span>' +
            '</span>';
          }).join('') + '</div>' +
        '</div>'
      : '';

    var fcHtml = resp.faultCodes && resp.faultCodes.length
      ? '<div class="rc-chips" style="margin-bottom:8px;">' +
          resp.faultCodes.map(function(fc) {
            return '<span class="rc-chip rc-chip-fc" onclick="diagLookupFc(\'' + fc + '\')">' + fc + '</span>';
          }).join('') +
        '</div>'
      : '';

    var partsHtml = resp.parts && resp.parts.length
      ? '<div class="rc-section">' +
          '<div class="rc-section-lbl">Recommended parts</div>' +
          '<div class="rc-parts">' + resp.parts.map(function(p) {
            var pi = partInfo(p);
            var inCart = cartHasItem(p);
            var pid = 'pcard-' + p.replace(/[^A-Za-z0-9]/g, '-');
            return '<div class="rc-part-card" id="' + pid + '">' +
              '<div class="rc-part-no">' + p + '</div>' +
              '<div class="rc-part-desc">' + escHtml(pi.desc) + '</div>' +
              '<div class="rc-part-foot">' +
                (pi.price ? '<span class="rc-part-price">$' + pi.price.toFixed(2) + '</span>' : '') +
                (inCart
                  ? '<button class="rc-part-btn rc-part-btn-added" disabled>' + SE.icon('check') + ' In cart</button>'
                  : '<button class="rc-part-btn" onclick="diagAddToCart(\'' + p + '\')">' + SE.icon('shopping-cart') + ' Add to cart</button>') +
              '</div>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>'
      : '';

    return '<div class="response-card">' +
      '<div class="rc-header">' +
        '<div class="rc-meta">' +
          '<span class="rc-tag">SmartEquip AI · ' + escHtml(resp.machine || 'SJIII 3219') + '</span>' +
          sev +
        '</div>' +
        '<div class="rc-title">' + escHtml(resp.title) + '</div>' +
      '</div>' +
      '<div class="rc-body">' +
        fcHtml +
        '<p class="rp">' + renderMd(resp.body) + '</p>' +
        stepsHtml +
        manualsHtml +
        partsHtml +
      '</div>' +
    '</div>';
  }

  // ── Cart panel ────────────────────────────────────────────────────────────
  function renderCart() {
    var wrap = document.getElementById('diag-cart-panel');
    if (!wrap) return;
    if (!_cartOpen || !_diagCart.length) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'flex';
    var total = cartTotal();
    var rows = _diagCart.map(function(item, i) {
      return '<div class="cart-row">' +
        '<div class="cart-row-info">' +
          '<div class="cart-row-no">' + item.partNo + '</div>' +
          '<div class="cart-row-desc">' + escHtml(item.desc) + '</div>' +
        '</div>' +
        '<div class="cart-row-right">' +
          '<div class="cart-qty-ctrl">' +
            '<button onclick="diagCartQty(' + i + ',-1)">−</button>' +
            '<span>' + item.qty + '</span>' +
            '<button onclick="diagCartQty(' + i + ',1)">+</button>' +
          '</div>' +
          (item.price ? '<div class="cart-row-price">$' + (item.price * item.qty).toFixed(2) + '</div>' : '') +
          '<button class="cart-row-del" onclick="diagCartRemove(' + i + ')" title="Remove">' + SE.icon('cross-small') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
    wrap.innerHTML =
      '<div class="cart-header">' +
        '<div class="cart-title">' + SE.icon('shopping-cart') + ' Parts Cart (' + _diagCart.length + ')</div>' +
        '<button class="cart-close-btn" onclick="diagToggleCart()">' + SE.icon('cross-small') + '</button>' +
      '</div>' +
      '<div class="cart-rows">' + rows + '</div>' +
      '<div class="cart-footer">' +
        '<div class="cart-total">Total estimate: <strong>$' + total.toFixed(2) + '</strong></div>' +
        '<div class="cart-actions">' +
          '<button class="cart-action-btn cart-action-secondary" onclick="diagAddToExistingWO()">' +
            SE.icon('clipboard-list') + ' Add to existing WO' +
          '</button>' +
          '<button class="cart-action-btn cart-action-primary" onclick="diagCreateWO()">' +
            SE.icon('plus-small') + ' New work order' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function renderCartBadge() {
    var btn = document.getElementById('diag-cart-btn');
    if (!btn) return;
    var badge = btn.querySelector('.cart-badge');
    if (badge) badge.textContent = _diagCart.length || '';
    btn.style.display = _diagCart.length ? 'flex' : 'none';
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  function renderMessages() {
    var area = document.getElementById('diag-chat-area');
    if (!area) return;
    var history = _DS.getMessages();
    if (!history.length) {
      area.innerHTML =
        '<div style="text-align:center;padding:48px 20px;">' +
          '<div style="width:48px;height:48px;background:#FEF3C7;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#111318;margin:0 auto 14px;">' + SE.icon('star') + '</div>' +
          '<div style="font-size:14px;font-weight:600;color:#111318;margin-bottom:6px;">Diagnostic Assistant — Skyjack SJIII 3219</div>' +
          '<div style="font-size:13px;color:#9CA3AF;max-width:320px;margin:0 auto;line-height:1.6;">Describe a fault code, symptom, or ask about a service interval. Parts can be added to a cart and converted to a work order.</div>' +
        '</div>';
      return;
    }
    area.innerHTML = history.map(function(msg) {
      if (msg.role === 'system') {
        return '<div class="msg-system">' + SE.icon('arrow-small-right') + ' ' + escHtml(msg.text) + '</div>';
      }
      if (msg.role === 'user') {
        var ctxPill = msg.ctx && msg.ctx.type !== 'none'
          ? '<div class="msg-ctx-pill" style="color:' + ctxColor(msg.ctx) + ';border-color:' + ctxColor(msg.ctx) + '40;">' +
              SE.icon(ctxIcon(msg.ctx)) + ' ' + ctxLabel(msg.ctx) +
            '</div>'
          : '';
        return '<div class="msg-user">' + ctxPill + '<div class="msg-user-bubble">' + escHtml(msg.text) + '</div></div>';
      }
      if (msg.role === 'ai' && msg.resp) {
        return '<div class="msg-ai">' +
          '<div class="ai-avatar">' + SE.icon('star') + '</div>' +
          '<div class="ai-bubble">' + renderAiCard(msg.resp) + '</div>' +
        '</div>';
      }
      return '<div class="msg-ai">' +
        '<div class="ai-avatar">' + SE.icon('star') + '</div>' +
        '<div class="ai-bubble">' +
          '<div class="response-card">' +
            '<div class="rc-header"><div class="rc-title">SmartEquip AI</div></div>' +
            '<div class="rc-body"><p class="rp">' + escHtml(msg.text) + '</p></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    area.scrollTop = area.scrollHeight;
  }

  function renderContextBar() {
    var bar = document.getElementById('diag-ctx-bar');
    if (!bar) return;
    var color = ctxColor(_ctx);
    var iconName = ctxIcon(_ctx);
    var label = ctxLabel(_ctx);
    var detail = '';
    if (_ctx.type === 'wo') {
      var wo = SE.wo && SE.wo(_ctx.woId);
      if (wo) detail = '<span class="ctx-detail">' + (wo.asset || '') + ' · ' + wo.status + '</span>';
    }
    bar.innerHTML =
      '<div class="ctx-active" style="border-color:' + color + '20;background:' + color + '10;">' +
        SE.icon(iconName) +
        '<span class="ctx-active-label" style="color:' + color + ';">' + label + '</span>' +
        detail +
        '<button class="ctx-switch-btn" onclick="diagSwitchContext()">Switch context ' + SE.icon('swap') + '</button>' +
      '</div>' +
      (_ctx.type !== 'none' ? '<button class="ctx-clear-btn" onclick="diagClearContext()" title="Remove context">' + SE.icon('cross-small') + '</button>' : '');
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  function sendMessage() {
    var inp = document.getElementById('diag-chat-input');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    _DS.addMessage({ role: 'user', text: text, ctx: { type: _ctx.type, woId: _ctx.woId, query: _ctx.query } });
    inp.value = '';
    renderSessions();
    renderMessages();
    setTimeout(function() {
      var resp = diagGenerateResponse(text, _ctx);
      _DS.addMessage({ role: 'ai', resp: resp });
      renderMessages();
    }, 500);
  }

  // ── Cart actions ──────────────────────────────────────────────────────────
  window.diagAddToCart = function(partNo) {
    if (cartHasItem(partNo)) return;
    var pi = partInfo(partNo);
    _diagCart.push({ partNo: partNo, qty: 1, desc: pi.desc, price: pi.price });
    var id = 'pcard-' + partNo.replace(/[^A-Za-z0-9]/g, '-');
    var card = document.getElementById(id);
    if (card) {
      var btn = card.querySelector('.rc-part-btn');
      if (btn) btn.outerHTML = '<button class="rc-part-btn rc-part-btn-added" disabled>' + SE.icon('check') + ' In cart</button>';
    }
    if (!_cartOpen) _cartOpen = true;
    renderCart();
    renderCartBadge();
  };

  window.diagCartQty = function(idx, delta) {
    _diagCart[idx].qty = Math.max(1, (_diagCart[idx].qty || 1) + delta);
    renderCart();
  };

  window.diagCartRemove = function(idx) {
    _diagCart.splice(idx, 1);
    if (!_diagCart.length) _cartOpen = false;
    renderCart();
    renderCartBadge();
    renderMessages();
  };

  window.diagToggleCart = function() {
    _cartOpen = !_cartOpen;
    renderCart();
  };

  window.diagLookupFc = function(code) {
    var inp = document.getElementById('diag-chat-input');
    if (inp) { inp.value = 'Fault code ' + code; inp.focus(); }
  };

  window.diagOpenManual = function(sectionId, title) {
    var sec = (window.SJ3219_SECTIONS || []).filter(function(s) { return s.id === sectionId; })[0];
    var pdfPage = sec ? sec.pdfPage : null;
    var pdfFile = window.SJIII_MANUAL_PDF || 'manuals/skj-3219-service.pdf';
    var pdfSrc = pdfFile + (pdfPage ? '#page=' + pdfPage : '');
    var manPage = sec ? sec.page : null;

    var existing = document.getElementById('diag-pdf-fullscreen');
    if (existing) existing.remove();

    var ov = document.createElement('div');
    ov.id = 'diag-pdf-fullscreen';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0D0D0D;display:flex;flex-direction:column;';
    ov.innerHTML =
      '<div style="background:#0D0D0D;padding:8px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;border-bottom:0.5px solid #2A2D35;">' +
        SE.icon('book-alt') +
        '<span style="color:#9CA3AF;font-size:11px;flex:1;">Skyjack SJIII Series Operating Manual (ANSI/CSA) · ' + escHtml(title || '') + '</span>' +
        (manPage ? '<span style="font-size:11px;color:#9CA3AF;display:flex;align-items:center;gap:4px;">' + SE.icon('marker') + ' Page ' + manPage + '</span>' : '') +
        '<a href="' + pdfFile + '" download style="font-size:11px;color:#9CA3AF;background:#0A0A0A;border:0.5px solid #3C4052;border-radius:5px;padding:4px 10px;text-decoration:none;display:flex;align-items:center;gap:4px;">' + SE.icon('download') + ' Download</a>' +
        '<button onclick="document.getElementById(\'diag-pdf-fullscreen\').remove();" style="background:rgba(255,255,255,.1);border:0.5px solid #3C4052;border-radius:5px;padding:4px 10px;color:#FFF;cursor:pointer;font-size:12px;font-family:inherit;">Close</button>' +
      '</div>' +
      '<iframe src="' + pdfSrc + '" style="flex:1;border:none;background:#525659;width:100%;" title="' + escHtml(title || 'Manual') + '"></iframe>';
    document.body.appendChild(ov);
  };

  // ── Close dialog helper ───────────────────────────────────────────────────
  function _closeDialog() {
    var btns = document.querySelectorAll('[data-dlg-close]');
    if (btns.length) btns[btns.length - 1].click();
  }

  // ── WO flows ──────────────────────────────────────────────────────────────
  window.diagCreateWO = function() {
    if (!SE.work || typeof SE.work.newDialog !== 'function') {
      SE.ui.dialog({ title: 'Error', body: '<p style="font-size:13px;color:#7A7F8E;">Work order form not available.</p>', foot: '<button data-dlg-close>Close</button>' });
      return;
    }
    SE.work.newDialog({
      onCreate: function(newWO) {
        _diagCart = [];
        _cartOpen = false;
        renderCart();
        renderCartBadge();
        renderMessages();
        SE.ui.dialog({
          title: 'Work order created',
          body: '<div style="text-align:center;padding:12px 0;">' +
                  '<div style="font-size:32px;margin-bottom:8px;color:#111318;">✓</div>' +
                  '<div style="font-size:14px;font-weight:600;color:#111318;margin-bottom:4px;">Work Order #' + (newWO ? newWO.id : '') + ' created</div>' +
                  '<div style="font-size:13px;color:#7A7F8E;">Skyjack SJIII 3219 · parts attached</div>' +
                '</div>',
          foot: '<button data-dlg-close>Close</button>'
        });
      }
    });
  };

  window.diagAddToExistingWO = function() {
    var _done = { 'Done': 1, 'Cancelled': 1, 'Delivered': 1 };
    var wos = SE.allWorkOrders ? SE.allWorkOrders().filter(function(w) { return !_done[w.status]; }) : [];
    if (!wos.length) {
      SE.ui.dialog({ title: 'No active orders', body: '<p style="font-size:13px;color:#7A7F8E;">There are no active work orders to add parts to. Create a new work order instead.</p>', foot: '<button data-dlg-close>Close</button>' });
      return;
    }
    SE.ui.dialog({
      title: 'Add parts to existing work order',
      body: '<div style="display:flex;flex-direction:column;gap:6px;">' +
              '<div style="font-size:12px;color:#7A7F8E;margin-bottom:6px;">Select the order to add ' + _diagCart.length + ' part(s) to:</div>' +
              wos.map(function(wo) {
                return '<div class="ctx-option" onclick="diagConfirmAddToWO(' + wo.id + ')" style="cursor:pointer;">' +
                  SE.icon('clipboard-list') +
                  '<div style="flex:1;">' +
                    '<div style="font-size:12px;font-weight:600;color:#111318;">Order #' + wo.id + ' — ' + escHtml(wo.machine || '') + '</div>' +
                    '<div style="font-size:11px;color:#9CA3AF;">' + (wo.asset || '') + ' · ' + (wo.status || '') + '</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
            '<style>.ctx-option{display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid #E8E4DF;border-radius:9px;transition:background .1s;}.ctx-option:hover{background:#FAFAF8;}</style>',
      foot: '<button data-dlg-close>Cancel</button>'
    });
  };

  window.diagConfirmAddToWO = function(woId) {
    _closeDialog();
    _diagCart = [];
    _cartOpen = false;
    renderCart();
    renderCartBadge();
    renderMessages();
    SE.ui.dialog({
      title: 'Parts added',
      body: '<div style="text-align:center;padding:12px 0;font-size:13px;color:#7A7F8E;">Parts have been added to Work Order #' + woId + '.</div>',
      foot: '<button data-dlg-close>Close</button>'
    });
  };

  // ── Context switcher ──────────────────────────────────────────────────────
  window.diagSwitchContext = function() {
    var _done = { 'Done': 1, 'Cancelled': 1, 'Delivered': 1 };
    var wos = SE.allWorkOrders ? SE.allWorkOrders().filter(function(w) { return !_done[w.status]; }) : [];
    var partsQ = _ctx.type === 'parts' ? (_ctx.query || '') : '';
    SE.ui.dialog({
      title: 'Switch context',
      body: '<div style="display:flex;flex-direction:column;gap:6px;">' +
              '<div class="ctx-option ' + (_ctx.type === 'none' ? 'selected' : '') + '" onclick="diagSetCtx(\'none\')">' +
                SE.icon('comment') +
                '<div style="flex:1;"><div style="font-size:12px;font-weight:600;color:#111318;">General question</div><div style="font-size:11px;color:#9CA3AF;">No machine or WO attached</div></div>' +
              '</div>' +
              '<div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:8px 0 2px;">Parts lookup</div>' +
              '<div class="ctx-option ' + (_ctx.type === 'parts' ? 'selected' : '') + '" id="ctx-parts-opt" style="' + (_ctx.type === 'parts' ? 'border-color:#7C6FF7;background:#F5F4FF;' : '') + '">' +
                SE.icon('search') +
                '<div style="flex:1;">' +
                  '<div style="font-size:12px;font-weight:600;color:#111318;margin-bottom:5px;">Parts search context</div>' +
                  '<input id="ctx-parts-query" type="text" placeholder="Part number or description…" value="' + escHtml(partsQ) + '" onclick="event.stopPropagation()" style="width:100%;border:1px solid #E2DDD8;border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;color:#111318;" onfocus="this.style.borderColor=\'#7C6FF7\'" onblur="this.style.borderColor=\'#E2DDD8\'"/>' +
                  '<div style="font-size:11px;color:#9CA3AF;margin-top:4px;">AI will focus answers on this part or category</div>' +
                '</div>' +
                '<button onclick="event.stopPropagation();var q=document.getElementById(\'ctx-parts-query\').value.trim();if(q)diagSetCtx(\'parts\',null,q);" style="background:#7C6FF7;border:none;border-radius:6px;padding:5px 11px;font-size:11px;font-weight:600;color:#FFF;cursor:pointer;font-family:inherit;flex-shrink:0;">Set</button>' +
              '</div>' +
              '<div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:8px 0 2px;">Work orders</div>' +
              (wos.length
                ? wos.map(function(w) {
                    var isSel = _ctx.type === 'wo' && _ctx.woId === w.id;
                    return '<div class="ctx-option ' + (isSel ? 'selected' : '') + '" onclick="diagSetCtx(\'wo\',' + w.id + ')" ' + (isSel ? 'style="border-color:#111318;background:#FEF3C7;"' : '') + '>' +
                      SE.icon('clipboard-list') +
                      '<div style="flex:1;"><div style="font-size:12px;font-weight:600;color:#111318;">Order #' + w.id + ' — ' + escHtml(w.machine || '') + '</div><div style="font-size:11px;color:#9CA3AF;">' + (w.asset || '') + ' · ' + (w.status || '') + '</div></div>' +
                    '</div>';
                  }).join('')
                : '<div style="font-size:12px;color:#9CA3AF;padding:8px 12px;">No active work orders</div>') +
            '</div>' +
            '<style>.ctx-option{display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid #E8E4DF;border-radius:9px;cursor:pointer;transition:background .1s;}.ctx-option:hover{background:#FAFAF8;}.ctx-option.selected{background:#FAFAF8;border-color:#D1CBC4;}</style>',
      foot: '<button data-dlg-close>Cancel</button>'
    });
  };

  window.diagSetCtx = function(type, woId, partsQuery) {
    var prev = ctxLabel(_ctx);
    if (type === 'none') _ctx = { type: 'none' };
    else if (type === 'wo') _ctx = { type: 'wo', woId: woId };
    else if (type === 'parts') _ctx = { type: 'parts', query: partsQuery || '' };
    var next = ctxLabel(_ctx);
    _closeDialog();
    if (prev !== next) _DS.addMessage({ role: 'system', text: 'Context switched to: ' + next });
    renderContextBar();
    renderMessages();
    var inp = document.getElementById('diag-chat-input');
    if (inp) inp.focus();
  };

  window.diagClearContext = function() {
    _ctx = { type: 'none' };
    _DS.addMessage({ role: 'system', text: 'Context cleared.' });
    renderContextBar();
    renderMessages();
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  var s = SE.shell(el, {
    nav: 'diagnostics',
    title: 'Diagnostic Assistant',
    sub: '',
    crumbs: [['Home', 'home'], ['Diagnostic Assistant', null]],
    body: ''
  });

  s.content.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:0;';

  // Preserve the page-head (search bar + quickbar) already rendered by SE.shell
  var _pageHead = s.content.querySelector('.page-head');
  if (_pageHead) _pageHead.style.flexShrink = '0';

  // Inject styles into <head> so they don't wipe the page-head
  var _diagStyle = document.createElement('style');
  _diagStyle.id = 'diag-view-styles';
  _diagStyle.textContent =
'.diag-view .i{width:1em;height:1em;display:inline-flex;vertical-align:middle;fill:currentColor;flex-shrink:0;}\n' +
'.diag-layout{flex:1;display:flex;min-height:0;overflow:hidden;}\n' +
'.diag-main{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;}\n' +
'#diag-sessions-panel{width:210px;flex-shrink:0;border-right:0.5px solid #E8E4DF;background:#F5F2EE;display:flex;flex-direction:column;overflow:hidden;}\n' +
'.ds-header{padding:10px 10px 8px;border-bottom:0.5px solid #E8E4DF;flex-shrink:0;}\n' +
'.ds-new-btn{width:100%;background:#111318;border:none;border-radius:7px;padding:7px 10px;font-size:12px;font-weight:600;color:#FFFFFF;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;}\n' +
'.ds-new-btn:hover{background:#0D0D0D;}\n' +
'.ds-list{flex:1;overflow-y:auto;padding:6px 6px;}\n' +
'.ds-item{padding:8px 10px;border-radius:7px;cursor:pointer;margin-bottom:2px;}\n' +
'.ds-item:hover{background:#E8E4DF;}\n' +
'.ds-item-active{background:#FEF3C7 !important;border:0.5px solid #11131840;}\n' +
'.ds-item-title{font-size:11.5px;color:#3A3D4A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;}\n' +
'.ds-item-active .ds-item-title{color:#111318;font-weight:600;}\n' +
'.ds-item-foot{display:flex;align-items:center;justify-content:space-between;margin-top:3px;}\n' +
'.ds-item-time{font-size:10px;color:#9CA3AF;}\n' +
'.ds-item-del{background:none;border:none;color:#C0BAB3;cursor:pointer;padding:0;display:none;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;}\n' +
'.ds-item:hover .ds-item-del,.ds-item-active .ds-item-del{display:flex;}\n' +
'.ds-item-del:hover{background:#FEE2E2;color:#B91C1C;}\n' +
'.diag-ctx-strip{background:#FAFAF8;padding:9px 22px;display:flex;align-items:center;gap:8px;border-bottom:0.5px solid #E8E4DF;flex-shrink:0;}\n' +
'.ctx-active{display:flex;align-items:center;gap:7px;padding:5px 12px;border-radius:8px;border:1px solid;flex:1;}\n' +
'.ctx-active-label{font-size:12px;font-weight:600;flex:1;}\n' +
'.ctx-detail{font-size:11px;color:#9CA3AF;padding-left:6px;border-left:1px solid #E2DDD8;margin-left:2px;}\n' +
'.ctx-switch-btn{margin-left:auto;background:none;border:0.5px solid #E2DDD8;border-radius:5px;padding:3px 9px;font-size:11px;font-weight:500;color:#7A7F8E;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;white-space:nowrap;}\n' +
'.ctx-switch-btn:hover{border-color:#111318;color:#111318;}\n' +
'.ctx-clear-btn{width:26px;height:26px;background:none;border:0.5px solid #E2DDD8;border-radius:6px;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n' +
'.ctx-clear-btn:hover{border-color:#B91C1C;color:#B91C1C;}\n' +
'.diag-toolbar{background:#FAFAF8;border-bottom:0.5px solid #E8E4DF;padding:7px 22px;display:flex;align-items:center;gap:8px;flex-shrink:0;}\n' +
'.diag-clear-btn{font-size:11px;font-weight:500;color:#7A7F8E;background:none;border:0.5px solid #E2DDD8;border-radius:6px;padding:3px 9px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;}\n' +
'.diag-clear-btn:hover{background:#F5F2EE;color:#3A3D4A;}\n' +
'.diag-cart-btn{font-size:11px;font-weight:600;color:#111318;background:#FEF3C7;border:1px solid #11131840;border-radius:6px;padding:4px 12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;}\n' +
'.diag-cart-btn:hover{background:#FDE68A;}\n' +
'.cart-badge{background:#111318;color:#FFFFFF;border-radius:10px;padding:0 5px;font-size:10px;font-weight:700;min-width:16px;text-align:center;}\n' +
'.chat-area{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px;}\n' +
'.msg-system{display:flex;align-items:center;gap:5px;font-size:11px;color:#9CA3AF;justify-content:center;padding:2px 0;}\n' +
'.msg-user{display:flex;flex-direction:column;align-items:flex-end;gap:4px;}\n' +
'.msg-ctx-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid;}\n' +
'.msg-user-bubble{background:#1B3A2B;color:#FFF;border-radius:14px 14px 4px 14px;padding:11px 16px;max-width:60%;font-size:13px;line-height:1.5;}\n' +
'.msg-ai{display:flex;gap:12px;align-items:flex-start;}\n' +
'.ai-avatar{width:32px;height:32px;background:#111318;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#FFFFFF;flex-shrink:0;margin-top:2px;}\n' +
'.ai-bubble{flex:1;min-width:0;}\n' +
'.response-card{background:#FFF;border:0.5px solid #E8E4DF;border-radius:12px;overflow:hidden;}\n' +
'.rc-header{padding:12px 16px 10px;border-bottom:0.5px solid #F0EDE9;}\n' +
'.rc-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px;}\n' +
'.rc-tag{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;}\n' +
'.rc-title{font-size:14px;font-weight:700;color:#111318;line-height:1.3;}\n' +
'.rc-body{padding:14px 16px;display:flex;flex-direction:column;gap:14px;}\n' +
'p.rp{margin:0;font-size:13px;color:#3A3D4A;line-height:1.65;}\n' +
'.rc-section{display:flex;flex-direction:column;gap:6px;}\n' +
'.rc-section-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#B0AAA3;}\n' +
'.rc-steps{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;}\n' +
'.rc-steps li{font-size:12.5px;color:#3A3D4A;line-height:1.55;}\n' +
'.rc-chips{display:flex;flex-wrap:wrap;gap:5px;}\n' +
'.rc-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:5px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid;}\n' +
'.rc-chip-manual{background:#FFFBEB;color:#1A1A1A;border-color:#FDE68A;}\n' +
'.rc-chip-manual:hover{background:#FEF3C7;}\n' +
'.rc-chip-fc{background:#FEF3C7;color:#92400E;border-color:#FDE68A;}\n' +
'.rc-chip-fc:hover{background:#FDE68A;}\n' +
'.rc-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:8px;}\n' +
'.rc-part-card{background:#FAFAF8;border:0.5px solid #E8E4DF;border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;}\n' +
'.rc-part-no{font-size:11px;font-weight:700;color:#7C6FF7;font-family:monospace;}\n' +
'.rc-part-desc{font-size:12px;color:#3A3D4A;flex:1;line-height:1.4;}\n' +
'.rc-part-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}\n' +
'.rc-part-price{font-size:12px;font-weight:600;color:#111318;}\n' +
'.rc-part-btn{font-size:11px;font-weight:600;color:#1A1A1A;background:#FFFBEB;border:1px solid #FDE68A;border-radius:5px;padding:3px 8px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:3px;}\n' +
'.rc-part-btn:hover{background:#FEF3C7;}\n' +
'.rc-part-btn-added{color:#111318;background:#F0FDF4;border-color:#BBF7D0;cursor:default;}\n' +
'#diag-cart-panel{width:300px;flex-shrink:0;border-left:0.5px solid #E8E4DF;background:#FAFAF8;display:flex;flex-direction:column;overflow:hidden;}\n' +
'.cart-header{padding:14px 16px;border-bottom:0.5px solid #E8E4DF;display:flex;align-items:center;justify-content:space-between;background:#FFF;flex-shrink:0;}\n' +
'.cart-title{font-size:13px;font-weight:700;color:#111318;display:flex;align-items:center;gap:6px;}\n' +
'.cart-close-btn{width:24px;height:24px;background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center;justify-content:center;border-radius:4px;}\n' +
'.cart-close-btn:hover{background:#F0EDE9;color:#3A3D4A;}\n' +
'.cart-rows{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;}\n' +
'.cart-row{background:#FFF;border:0.5px solid #E8E4DF;border-radius:8px;padding:11px 12px;display:flex;align-items:center;gap:8px;}\n' +
'.cart-row-info{flex:1;min-width:0;}\n' +
'.cart-row-no{font-size:11px;font-weight:700;color:#7C6FF7;font-family:monospace;}\n' +
'.cart-row-desc{font-size:11px;color:#5C6070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
'.cart-row-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}\n' +
'.cart-qty-ctrl{display:flex;align-items:center;gap:2px;}\n' +
'.cart-qty-ctrl button{width:20px;height:20px;background:#F0EDE9;border:none;border-radius:4px;cursor:pointer;font-size:13px;line-height:1;color:#3A3D4A;display:flex;align-items:center;justify-content:center;}\n' +
'.cart-qty-ctrl span{font-size:12px;font-weight:600;color:#111318;width:20px;text-align:center;}\n' +
'.cart-row-price{font-size:11px;font-weight:600;color:#111318;width:46px;text-align:right;}\n' +
'.cart-row-del{width:22px;height:22px;background:none;border:none;cursor:pointer;color:#B0AAA3;display:flex;align-items:center;justify-content:center;border-radius:4px;}\n' +
'.cart-row-del:hover{background:#FEE2E2;color:#B91C1C;}\n' +
'.cart-footer{border-top:0.5px solid #E8E4DF;padding:14px 16px;background:#FFF;flex-shrink:0;}\n' +
'.cart-total{font-size:13px;color:#3A3D4A;margin-bottom:10px;}\n' +
'.cart-actions{display:flex;flex-direction:column;gap:6px;}\n' +
'.cart-action-btn{width:100%;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:1px solid;display:flex;align-items:center;justify-content:center;gap:5px;}\n' +
'.cart-action-secondary{background:#F5F2EE;color:#3A3D4A;border-color:#E2DDD8;}\n' +
'.cart-action-secondary:hover{background:#EAE6E1;}\n' +
'.cart-action-primary{background:#111318;color:#FFFFFF;border-color:#0D0D0D;}\n' +
'.cart-action-primary:hover{background:#0D0D0D;}\n' +
'.input-area{background:#FFF;border-top:0.5px solid #E8E4DF;padding:14px 24px;flex-shrink:0;}\n' +
'.input-row{display:flex;align-items:flex-end;gap:10px;}\n' +
'.input-wrap{flex:1;position:relative;}\n' +
'.input-box{width:100%;min-height:44px;max-height:120px;background:#F5F2EE;border:1.5px solid #E2DDD8;border-radius:12px;padding:11px 16px;font-size:13px;font-family:inherit;color:#111318;outline:none;resize:none;line-height:1.5;box-sizing:border-box;}\n' +
'.input-box:focus{border-color:#111318;background:#FFF;}\n' +
'.input-box::placeholder{color:#B0AAA3;}\n' +
'.send-btn{width:44px;height:44px;background:#111318;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:#FFFFFF;flex-shrink:0;}\n' +
'.send-btn:hover{background:#0D0D0D;}\n' +
'.input-hints{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}\n' +
'.hint-chip{background:#F5F2EE;border-radius:5px;padding:3px 9px;cursor:pointer;color:#7A7F8E;font-size:11px;}\n' +
'.hint-chip:hover{background:#FEF3C7;color:#111318;}\n' +
'#diag-mobile-overlay{display:none;position:fixed;inset:0;z-index:900;background:rgba(10,12,18,.72);backdrop-filter:blur(4px);align-items:center;justify-content:center;}\n' +
'#diag-mobile-overlay.open{display:flex;}\n' +
'.mob-shell{width:390px;height:780px;border-radius:44px;background:#1A1C22;box-shadow:0 0 0 10px #111,0 0 0 12px #2A2D35,0 32px 80px rgba(0,0,0,.7);display:flex;flex-direction:column;overflow:hidden;position:relative;flex-shrink:0;}\n' +
'.mob-notch{background:#111;height:28px;display:flex;align-items:center;justify-content:center;border-radius:0 0 16px 16px;width:120px;margin:0 auto;flex-shrink:0;position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:2;}\n' +
'.mob-notch-dot{width:10px;height:10px;border-radius:50%;background:#1A1C22;border:1.5px solid #333;}\n' +
'.mob-status{height:44px;background:#0F1117;display:flex;align-items:flex-end;justify-content:space-between;padding:0 20px 6px;font-size:11px;font-weight:600;color:#E0E0E0;flex-shrink:0;}\n' +
'.mob-status-icons{display:flex;gap:5px;align-items:center;}\n' +
'.mob-screen{flex:1;background:#F5F2EE;display:flex;flex-direction:column;overflow:hidden;border-bottom-left-radius:32px;border-bottom-right-radius:32px;}\n' +
'.mob-topbar{background:#1F2330;padding:10px 16px;display:flex;align-items:center;gap:8px;flex-shrink:0;}\n' +
'.mob-topbar-title{font-size:13px;font-weight:700;color:#FFF;flex:1;}\n' +
'.mob-ctx{background:#FFF;border-bottom:0.5px solid #E8E4DF;padding:7px 14px;display:flex;align-items:center;gap:6px;flex-shrink:0;}\n' +
'.mob-ctx-label{font-size:11px;font-weight:600;flex:1;}\n' +
'.mob-ctx-switch{font-size:10px;color:#9CA3AF;background:none;border:0.5px solid #E2DDD8;border-radius:5px;padding:2px 7px;cursor:pointer;font-family:inherit;}\n' +
'.mob-chat{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px;}\n' +
'.mob-msg-user{display:flex;justify-content:flex-end;}\n' +
'.mob-msg-user-bub{background:#1B3A2B;color:#FFF;border-radius:14px 14px 4px 14px;padding:9px 13px;max-width:78%;font-size:12px;line-height:1.5;}\n' +
'.mob-msg-ai{display:flex;gap:8px;align-items:flex-start;}\n' +
'.mob-ai-av{width:26px;height:26px;background:#111318;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#FFFFFF;flex-shrink:0;margin-top:2px;}\n' +
'.mob-ai-card{background:#FFF;border:0.5px solid #E8E4DF;border-radius:10px;overflow:hidden;flex:1;min-width:0;}\n' +
'.mob-card-head{padding:9px 12px 8px;border-bottom:0.5px solid #F0EDE9;}\n' +
'.mob-card-tag{font-size:9px;font-weight:700;letter-spacing:.8px;color:#9CA3AF;text-transform:uppercase;margin-bottom:3px;}\n' +
'.mob-card-title{font-size:12px;font-weight:700;color:#111318;line-height:1.3;}\n' +
'.mob-card-body{padding:10px 12px;font-size:11.5px;color:#3A3D4A;line-height:1.6;}\n' +
'.mob-card-steps{margin:6px 0 0;padding-left:16px;display:flex;flex-direction:column;gap:4px;}\n' +
'.mob-card-steps li{font-size:11px;color:#3A3D4A;line-height:1.5;}\n' +
'.mob-parts{display:flex;flex-direction:column;gap:5px;margin-top:8px;}\n' +
'.mob-part-row{display:flex;align-items:center;gap:8px;background:#FAFAF8;border:0.5px solid #E8E4DF;border-radius:7px;padding:7px 9px;}\n' +
'.mob-part-no{font-size:10px;font-weight:700;color:#7C6FF7;font-family:monospace;flex-shrink:0;}\n' +
'.mob-part-desc{font-size:10.5px;color:#3A3D4A;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n' +
'.mob-part-price{font-size:10px;font-weight:600;color:#111318;flex-shrink:0;}\n' +
'.mob-add-btn{font-size:10px;font-weight:600;color:#1A1A1A;background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;padding:2px 7px;cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap;}\n' +
'.mob-add-btn.added{color:#111318;background:#F0FDF4;border-color:#BBF7D0;cursor:default;}\n' +
'.mob-fc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}\n' +
'.mob-fc-chip{font-size:10px;font-weight:600;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:4px;padding:2px 7px;cursor:pointer;}\n' +
'.mob-input-area{background:#FFF;border-top:0.5px solid #E8E4DF;padding:10px 14px 14px;flex-shrink:0;}\n' +
'.mob-hints{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px;}\n' +
'.mob-hint{background:#F5F2EE;border-radius:4px;padding:3px 7px;font-size:10px;color:#7A7F8E;cursor:pointer;}\n' +
'.mob-hint:hover{background:#FEF3C7;color:#111318;}\n' +
'.mob-input-row{display:flex;gap:8px;align-items:flex-end;}\n' +
'.mob-input-box{flex:1;background:#F5F2EE;border:1.5px solid #E2DDD8;border-radius:10px;padding:9px 12px;font-size:12px;font-family:inherit;color:#111318;outline:none;resize:none;min-height:38px;max-height:80px;line-height:1.45;box-sizing:border-box;}\n' +
'.mob-input-box:focus{border-color:#111318;background:#FFF;}\n' +
'.mob-send{width:38px;height:38px;background:#111318;border:none;border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#FFFFFF;flex-shrink:0;}\n' +
'.mob-home-bar{height:20px;background:#0F1117;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:0 0 32px 32px;}\n' +
'.mob-home-pill{width:100px;height:4px;background:#444;border-radius:2px;}\n' +
'.mob-sessions-drawer{position:absolute;top:0;left:0;right:0;bottom:0;background:#F5F2EE;z-index:10;border-radius:44px;display:flex;flex-direction:column;overflow:hidden;transform:translateX(-100%);transition:transform .25s ease;}\n' +
'.mob-sessions-drawer.open{transform:translateX(0);}\n' +
'.mob-sessions-head{background:#1F2330;padding:52px 16px 12px;display:flex;align-items:center;gap:8px;flex-shrink:0;}\n' +
'.mob-sessions-back{width:32px;height:32px;background:rgba(255,255,255,.1);border:none;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#FFF;cursor:pointer;flex-shrink:0;}\n' +
'.mob-sessions-title{font-size:14px;font-weight:700;color:#FFF;flex:1;}\n' +
'.mob-sessions-new{display:inline-flex;align-items:center;gap:4px;background:#111318;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#FFFFFF;cursor:pointer;font-family:inherit;}\n' +
'.mob-sessions-list{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:4px;}\n' +
'.mob-sess-item{background:#FFF;border:0.5px solid #E8E4DF;border-radius:10px;padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;}\n' +
'.mob-sess-item:hover,.mob-sess-item:active{background:#FEF3C7;border-color:#11131840;}\n' +
'.mob-sess-item.active{background:#FEF3C7;border-color:#111318;}\n' +
'.mob-sess-icon{width:28px;height:28px;border-radius:7px;background:#FEF3C7;display:flex;align-items:center;justify-content:center;color:#111318;flex-shrink:0;}\n' +
'.mob-sess-body{flex:1;min-width:0;}\n' +
'.mob-sess-title{font-size:12px;font-weight:600;color:#111318;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
'.mob-sess-time{font-size:10px;color:#9CA3AF;margin-top:2px;}\n' +
'.mob-sess-del{width:28px;height:28px;background:none;border:none;border-radius:6px;color:#C0BAB3;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n' +
'.mob-sess-del:hover{background:#FEE2E2;color:#B91C1C;}\n' +
'.mob-cart-sheet{position:absolute;bottom:20px;left:0;right:0;background:#FFF;border-radius:20px 20px 0 0;box-shadow:0 -4px 30px rgba(0,0,0,.25);padding:14px 16px 20px;transform:translateY(100%);transition:transform .25s ease;max-height:60%;overflow-y:auto;}\n' +
'.mob-cart-sheet.open{transform:translateY(0);}\n' +
'.mob-cart-sheet-handle{width:36px;height:4px;background:#E0DAD4;border-radius:2px;margin:0 auto 12px;}\n' +
'.mob-cart-sheet-title{font-size:13px;font-weight:700;color:#111318;margin-bottom:10px;display:flex;align-items:center;gap:6px;}\n' +
'.mob-cart-item{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:0.5px solid #F0EDE9;}\n' +
'.mob-cart-item-info{flex:1;min-width:0;}\n' +
'.mob-cart-item-no{font-size:10px;font-weight:700;color:#7C6FF7;font-family:monospace;}\n' +
'.mob-cart-item-desc{font-size:11px;color:#5C6070;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n' +
'.mob-cart-footer{margin-top:10px;}\n' +
'.mob-cart-total{font-size:12px;color:#3A3D4A;margin-bottom:8px;}\n' +
'.mob-cart-cta{width:100%;padding:11px;background:#111318;color:#FFFFFF;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}\n' +
'.mob-overlay-close{position:absolute;top:24px;right:24px;width:36px;height:36px;background:rgba(255,255,255,.12);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#FFF;}\n' +
'.mob-overlay-close:hover{background:rgba(255,255,255,.22);}\n' +
'.mob-preview-label{position:absolute;top:24px;left:24px;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.8px;text-transform:uppercase;}\n' +
'.mob-toggle-btn{display:inline-flex;align-items:center;gap:5px;background:#F5F2EE;border:0.5px solid #E2DDD8;border-radius:7px;padding:5px 11px;font-size:11px;font-weight:600;color:#7A7F8E;cursor:pointer;font-family:inherit;}\n' +
'.mob-toggle-btn:hover{background:#FEF3C7;color:#111318;border-color:#11131840;}\n';
  document.head.appendChild(_diagStyle);

  var _diagWrap = document.createElement('div');
  _diagWrap.className = 'diag-view';
  _diagWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;';
  _diagWrap.innerHTML =
'<div class="diag-ctx-strip" id="diag-ctx-bar"></div>' +
'<div class="diag-layout">' +
  '<div id="diag-sessions-panel"></div>' +
  '<div class="diag-main">' +
    '<div class="diag-toolbar">' +
      '<button class="diag-clear-btn" id="diag-clear-btn">' + SE.icon('trash') + ' Clear chat</button>' +
      '<button class="diag-cart-btn" id="diag-cart-btn" onclick="diagToggleCart()" style="display:none;">' +
        SE.icon('shopping-cart') +
        'Cart <span class="cart-badge">0</span>' +
      '</button>' +
      '<button class="mob-toggle-btn" onclick="diagToggleMobile()" style="margin-left:auto;" title="Preview mobile experience">' + SE.icon('apps') + ' Mobile view</button>' +
      '<span style="font-size:11px;color:#9CA3AF;margin-left:12px;">Skyjack SJIII 3219 · SmartEquip AI</span>' +
    '</div>' +
    '<div class="chat-area" id="diag-chat-area"></div>' +
    '<div class="input-area">' +
      '<div class="input-row">' +
        '<div class="input-wrap">' +
          '<textarea class="input-box" id="diag-chat-input" rows="1" placeholder="Describe a fault, enter a code (e.g. HYD-04), or ask about service intervals…"></textarea>' +
        '</div>' +
        '<button class="send-btn" id="diag-send-btn">' + SE.icon('arrow-small-right') + '</button>' +
      '</div>' +
      '<div class="input-hints">' +
        '<span class="hint-chip" onclick="document.getElementById(\'diag-chat-input\').value=\'Fault code HYD-04 — platform won\\\'t elevate\';document.getElementById(\'diag-chat-input\').focus();">HYD-04 — won\'t elevate</span>' +
        '<span class="hint-chip" onclick="document.getElementById(\'diag-chat-input\').value=\'Platform is drifting down slowly on its own\';document.getElementById(\'diag-chat-input\').focus();">Platform drift</span>' +
        '<span class="hint-chip" onclick="document.getElementById(\'diag-chat-input\').value=\'There is a hydraulic fluid leak near the cylinder\';document.getElementById(\'diag-chat-input\').focus();">Hydraulic leak</span>' +
        '<span class="hint-chip" onclick="document.getElementById(\'diag-chat-input\').value=\'Machine won\\\'t drive, wheels not turning\';document.getElementById(\'diag-chat-input\').focus();">Won\'t drive</span>' +
        '<span class="hint-chip" onclick="document.getElementById(\'diag-chat-input\').value=\'What is the maintenance schedule?\';document.getElementById(\'diag-chat-input\').focus();">Maintenance intervals</span>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div id="diag-cart-panel" style="display:none;"></div>' +
'</div>' +
'<div id="diag-mobile-overlay">' +
  '<div class="mob-preview-label">' + SE.icon('apps') + '  Mobile preview</div>' +
  '<button class="mob-overlay-close" onclick="diagToggleMobile()" title="Close mobile view">' + SE.icon('cross-small') + '</button>' +
  '<div class="mob-shell">' +
    '<div style="position:relative;height:44px;background:#0F1117;flex-shrink:0;">' +
      '<div class="mob-notch"><div class="mob-notch-dot"></div></div>' +
      '<div class="mob-status">' +
        '<span>9:41</span>' +
        '<div class="mob-status-icons">' +
          '<svg width="14" height="10" viewBox="0 0 14 10" fill="none"><rect x="0" y="3" width="2.5" height="7" rx="1" fill="#FFF" opacity=".4"/><rect x="3.5" y="2" width="2.5" height="8" rx="1" fill="#FFF" opacity=".6"/><rect x="7" y="0.5" width="2.5" height="9.5" rx="1" fill="#FFF" opacity=".8"/><rect x="10.5" y="0" width="3" height="10" rx="1" fill="#FFF"/></svg>' +
          '<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M6 2C8.5 2 10.7 3 12 4.7L10.5 6.2C9.6 5 7.9 4.2 6 4.2S2.4 5 1.5 6.2L0 4.7C1.3 3 3.5 2 6 2Z" fill="#FFF" opacity=".5"/><path d="M6 5.5C7.4 5.5 8.6 6.1 9.5 7L8 8.5C7.4 8 6.7 7.7 6 7.7s-1.4.3-2 .8L2.5 7C3.4 6.1 4.6 5.5 6 5.5Z" fill="#FFF" opacity=".8"/><circle cx="6" cy="9.5" r="1" fill="#FFF"/></svg>' +
          '<svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="18" height="10" rx="3" stroke="#FFF" stroke-opacity=".35"/><rect x="1.5" y="1.5" width="14" height="8" rx="2" fill="#FFF"/><path d="M20 3.5v4a2 2 0 000-4Z" fill="#FFF" opacity=".4"/></svg>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="mob-screen">' +
      '<div class="mob-topbar">' +
        '<button onclick="diagMobOpenSessions()" style="width:30px;height:30px;background:rgba(255,255,255,.08);border:none;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#A0A8C0;cursor:pointer;flex-shrink:0;" title="All chats">' + SE.icon('menu-burger') + '</button>' +
        '<div class="mob-topbar-title">Diagnostic Assistant</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          '<div id="mob-cart-btn" onclick="diagMobToggleCart()" style="display:none;position:relative;width:32px;height:32px;background:#FEF3C7;border:1px solid #11131840;border-radius:8px;align-items:center;justify-content:center;color:#111318;cursor:pointer;flex-shrink:0;">' +
            SE.icon('shopping-cart') +
            '<span id="mob-cart-badge" style="position:absolute;top:-4px;right:-4px;background:#111318;color:#FFF;border-radius:8px;padding:0 4px;font-size:9px;font-weight:800;display:none;"></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mob-ctx" id="mob-ctx-bar">' +
        SE.icon('comment') +
        '<span class="mob-ctx-label" style="color:#8A8FA8;">General</span>' +
        '<button class="mob-ctx-switch" onclick="diagSwitchContext()">Switch</button>' +
      '</div>' +
      '<div class="mob-chat" id="mob-chat-area"></div>' +
      '<div class="mob-input-area">' +
        '<div class="mob-hints">' +
          '<span class="mob-hint" onclick="diagMobSetInput(\'Fault code HYD-04 — platform won\\\'t elevate\')">HYD-04</span>' +
          '<span class="mob-hint" onclick="diagMobSetInput(\'Platform is drifting down slowly\')">Platform drift</span>' +
          '<span class="mob-hint" onclick="diagMobSetInput(\'Hydraulic fluid leak near the cylinder\')">Hyd leak</span>' +
          '<span class="mob-hint" onclick="diagMobSetInput(\'Machine won\\\'t drive, wheels not turning\')">Won\'t drive</span>' +
        '</div>' +
        '<div class="mob-input-row">' +
          '<textarea class="mob-input-box" id="mob-chat-input" rows="1" placeholder="Describe a fault or ask a question…"></textarea>' +
          '<button class="mob-send" onclick="diagMobSend()">' + SE.icon('arrow-small-right') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="mob-cart-sheet" id="mob-cart-sheet">' +
      '<div class="mob-cart-sheet-handle"></div>' +
      '<div class="mob-cart-sheet-title">' + SE.icon('shopping-cart') + ' Parts Cart</div>' +
      '<div id="mob-cart-items"></div>' +
      '<div class="mob-cart-footer" id="mob-cart-footer"></div>' +
    '</div>' +
    '<div class="mob-sessions-drawer" id="mob-sessions-drawer">' +
      '<div class="mob-sessions-head">' +
        '<button class="mob-sessions-back" onclick="diagMobCloseSessions()" title="Back">' + SE.icon('arrow-small-left') + '</button>' +
        '<div class="mob-sessions-title">All chats</div>' +
        '<button class="mob-sessions-new" onclick="diagMobNewChat()">' + SE.icon('plus-small') + ' New chat</button>' +
      '</div>' +
      '<div class="mob-sessions-list" id="mob-sessions-list"></div>' +
    '</div>' +
    '<div class="mob-home-bar"><div class="mob-home-pill"></div></div>' +
  '</div>' +
'</div>';
  s.content.appendChild(_diagWrap);

  renderContextBar();
  renderSessions();
  renderMessages();
  renderCartBadge();

  document.getElementById('diag-send-btn').addEventListener('click', sendMessage);
  document.getElementById('diag-chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('diag-clear-btn').addEventListener('click', function() {
    SE.ui.dialog({
      title: 'Clear chat?',
      body: '<p style="font-size:13px;color:#3A3D4A;margin:0;">Clear all messages in this conversation?</p>',
      foot: '<button data-dlg-close>Cancel</button>' +
            '<button data-dlg-close onclick="window._diagClearConfirm()" style="background:#111318;color:#FFF;border:none;border-radius:7px;padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:8px;">Clear</button>'
    });
  });

  window._diagClearConfirm = function() {
    _DS.clearMessages();
    renderMessages();
    renderSessions();
    renderMobileMessages();
  };

  // ── Mobile preview ────────────────────────────────────────────────────────
  var _mobCartOpen = false;

  function renderMobileMessages() {
    var area = document.getElementById('mob-chat-area');
    if (!area) return;
    var history = _DS.getMessages();
    if (!history.length) {
      area.innerHTML =
        '<div style="text-align:center;padding:32px 14px;">' +
          '<div style="width:40px;height:40px;background:#FEF3C7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#111318;margin:0 auto 10px;">' + SE.icon('star') + '</div>' +
          '<div style="font-size:13px;font-weight:600;color:#111318;margin-bottom:5px;">SmartEquip AI</div>' +
          '<div style="font-size:11.5px;color:#9CA3AF;line-height:1.6;">Describe a fault code, symptom, or ask about a service interval.</div>' +
        '</div>';
      return;
    }
    area.innerHTML = history.map(function(msg) {
      if (msg.role === 'system') {
        return '<div style="text-align:center;font-size:10px;color:#B0AAA3;padding:2px 0;">' + escHtml(msg.text) + '</div>';
      }
      if (msg.role === 'user') {
        return '<div class="mob-msg-user"><div class="mob-msg-user-bub">' + escHtml(msg.text) + '</div></div>';
      }
      if (msg.role === 'ai' && msg.resp) {
        var resp = msg.resp;
        var fcHtml = resp.faultCodes && resp.faultCodes.length
          ? '<div class="mob-fc-chips">' + resp.faultCodes.map(function(fc) {
              return '<span class="mob-fc-chip" onclick="diagMobSetInput(\'Fault code ' + fc + '\')">' + fc + '</span>';
            }).join('') + '</div>' : '';
        var stepsHtml = resp.steps && resp.steps.length
          ? '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;color:#B0AAA3;text-transform:uppercase;margin:8px 0 4px;">Procedure</div>' +
            '<ol class="mob-card-steps">' + resp.steps.map(function(s) { return '<li>' + renderMd(s) + '</li>'; }).join('') + '</ol>' : '';
        var manualsHtml = resp.manualRefs && resp.manualRefs.length
          ? '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;color:#B0AAA3;text-transform:uppercase;margin:8px 0 4px;">Manual References</div>' +
            '<div style="display:flex;flex-direction:column;gap:5px;">' + resp.manualRefs.map(function(ref) {
              return '<div onclick="diagOpenManual(\'' + ref.id + '\',\'' + escHtml(ref.title) + '\')" style="display:flex;align-items:center;gap:8px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:7px;padding:8px 10px;cursor:pointer;">' +
                SE.icon('book-alt') +
                '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:10.5px;font-weight:600;color:#1A1A1A;line-height:1.3;">Ch.' + ref.chapter + ' — ' + escHtml(ref.title) + '</div>' +
                  '<div style="font-size:10px;color:#6B9ECC;margin-top:1px;">Page ' + ref.page + (ref.summary ? ' · ' + escHtml(ref.summary.slice(0, 48)) + (ref.summary.length > 48 ? '…' : '') : '') + '</div>' +
                '</div>' +
                SE.icon('external') +
              '</div>';
            }).join('') + '</div>' : '';
        var partsHtml = resp.parts && resp.parts.length
          ? '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;color:#B0AAA3;text-transform:uppercase;margin:8px 0 4px;">Recommended Parts</div>' +
            '<div class="mob-parts">' + resp.parts.map(function(p) {
              var pi = partInfo(p);
              var inCart = cartHasItem(p);
              return '<div class="mob-part-row" id="mob-pcard-' + p.replace(/[^A-Za-z0-9]/g, '-') + '">' +
                '<span class="mob-part-no">' + p + '</span>' +
                '<span class="mob-part-desc">' + escHtml(pi.desc) + '</span>' +
                (pi.price ? '<span class="mob-part-price">$' + pi.price.toFixed(2) + '</span>' : '') +
                (inCart
                  ? '<span class="mob-add-btn added">' + SE.icon('check') + '</span>'
                  : '<button class="mob-add-btn" onclick="diagMobAddToCart(\'' + p + '\')">+ Cart</button>') +
              '</div>';
            }).join('') + '</div>' : '';
        return '<div class="mob-msg-ai">' +
          '<div class="mob-ai-av">' + SE.icon('star') + '</div>' +
          '<div class="mob-ai-card">' +
            '<div class="mob-card-head">' +
              '<div class="mob-card-tag">SmartEquip AI</div>' +
              '<div class="mob-card-title">' + escHtml(resp.title || '') + '</div>' +
            '</div>' +
            '<div class="mob-card-body">' +
              fcHtml +
              '<p style="margin:0;font-size:11.5px;color:#3A3D4A;line-height:1.6;">' + renderMd(resp.body) + '</p>' +
              stepsHtml +
              manualsHtml +
              partsHtml +
            '</div>' +
          '</div>' +
        '</div>';
      }
      return '';
    }).join('');
    area.scrollTop = area.scrollHeight;
  }

  function renderMobileCtxBar() {
    var bar = document.getElementById('mob-ctx-bar');
    if (!bar) return;
    var color = ctxColor(_ctx);
    var iconName = ctxIcon(_ctx);
    var label = ctxLabel(_ctx);
    bar.innerHTML =
      SE.icon(iconName) +
      '<span class="mob-ctx-label" style="color:' + color + ';">' + label + '</span>' +
      '<button class="mob-ctx-switch" onclick="diagSwitchContext()">Switch</button>';
  }

  function renderMobileCart() {
    var sheet  = document.getElementById('mob-cart-sheet');
    var items  = document.getElementById('mob-cart-items');
    var footer = document.getElementById('mob-cart-footer');
    var badge  = document.getElementById('mob-cart-badge');
    var btn    = document.getElementById('mob-cart-btn');
    if (!sheet) return;
    if (badge) {
      badge.textContent = _diagCart.length || '';
      badge.style.display = _diagCart.length ? 'block' : 'none';
    }
    if (btn) btn.style.display = _diagCart.length ? 'flex' : 'none';
    if (!_mobCartOpen || !_diagCart.length) { sheet.classList.remove('open'); return; }
    sheet.classList.add('open');
    items.innerHTML = _diagCart.map(function(item, i) {
      return '<div class="mob-cart-item">' +
        '<div class="mob-cart-item-info">' +
          '<div class="mob-cart-item-no">' + item.partNo + '</div>' +
          '<div class="mob-cart-item-desc">' + escHtml(item.desc) + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
          '<div style="display:flex;align-items:center;gap:2px;">' +
            '<button onclick="diagCartQty(' + i + ',-1);renderMobileCart();" style="width:22px;height:22px;background:#F0EDE9;border:none;border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">−</button>' +
            '<span style="font-size:11px;font-weight:600;color:#111318;width:20px;text-align:center;">' + item.qty + '</span>' +
            '<button onclick="diagCartQty(' + i + ',1);renderMobileCart();" style="width:22px;height:22px;background:#F0EDE9;border:none;border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">+</button>' +
          '</div>' +
          (item.price ? '<span style="font-size:11px;font-weight:600;color:#111318;width:44px;text-align:right;">$' + (item.price * item.qty).toFixed(2) + '</span>' : '') +
          '<button onclick="diagCartRemove(' + i + ');" title="Remove" style="width:24px;height:24px;background:none;border:none;border-radius:5px;cursor:pointer;color:#C0BAB3;display:flex;align-items:center;justify-content:center;">' + SE.icon('cross-small') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
    footer.innerHTML =
      '<div class="mob-cart-total">Total estimate: <strong>$' + cartTotal().toFixed(2) + '</strong></div>' +
      '<button class="mob-cart-cta" onclick="diagCreateWO()">' + SE.icon('plus-small') + ' Create work order</button>';
  }

  var _origAddToCart = window.diagAddToCart;
  window.diagAddToCart = function(partNo) {
    _origAddToCart(partNo);
    renderMobileMessages();
    renderMobileCart();
  };
  var _origCartRemove = window.diagCartRemove;
  window.diagCartRemove = function(idx) {
    _origCartRemove(idx);
    renderMobileMessages();
    renderMobileCart();
  };

  window.diagMobAddToCart = function(partNo) { window.diagAddToCart(partNo); };

  window.diagMobToggleCart = function() { _mobCartOpen = !_mobCartOpen; renderMobileCart(); };

  window.diagMobSetInput = function(text) {
    var inp = document.getElementById('mob-chat-input');
    if (inp) { inp.value = text; inp.focus(); }
  };

  window.diagMobSend = function() {
    var inp = document.getElementById('mob-chat-input');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    _DS.addMessage({ role: 'user', text: text, ctx: { type: _ctx.type, woId: _ctx.woId, query: _ctx.query } });
    inp.value = '';
    renderMessages();
    renderSessions();
    renderMobileMessages();
    renderMobileCtxBar();
    setTimeout(function() {
      var resp = diagGenerateResponse(text, _ctx);
      _DS.addMessage({ role: 'ai', resp: resp });
      renderMessages();
      renderMobileMessages();
    }, 500);
  };

  function renderMobileSessions() {
    var list = document.getElementById('mob-sessions-list');
    if (!list) return;
    var sessions = _DS.getSessions();
    var active = _DS.getActive();
    var activeId = active ? active.id : null;
    if (!sessions.length) {
      list.innerHTML = '<div style="text-align:center;padding:32px 16px;font-size:12px;color:#9CA3AF;">No previous chats</div>';
      return;
    }
    list.innerHTML = sessions.map(function(s) {
      return '<div class="mob-sess-item ' + (s.id === activeId ? 'active' : '') + '" onclick="diagMobSwitchSession(\'' + s.id + '\')">' +
        '<div class="mob-sess-icon">' + SE.icon('comment') + '</div>' +
        '<div class="mob-sess-body">' +
          '<div class="mob-sess-title">' + escHtml(s.title) + '</div>' +
          '<div class="mob-sess-time">' + _relTime(s.createdAt) + '</div>' +
        '</div>' +
        '<button class="mob-sess-del" onclick="event.stopPropagation();diagMobDeleteSession(\'' + s.id + '\')" title="Delete">' + SE.icon('trash') + '</button>' +
      '</div>';
    }).join('');
  }

  window.diagMobOpenSessions = function() {
    renderMobileSessions();
    var drawer = document.getElementById('mob-sessions-drawer');
    if (drawer) drawer.classList.add('open');
  };

  window.diagMobCloseSessions = function() {
    var drawer = document.getElementById('mob-sessions-drawer');
    if (drawer) drawer.classList.remove('open');
  };

  window.diagMobNewChat = function() {
    _DS.createSession('New chat');
    renderSessions(); renderMessages(); renderMobileMessages(); renderMobileSessions();
    diagMobCloseSessions();
    var inp = document.getElementById('mob-chat-input');
    if (inp) inp.focus();
  };

  window.diagMobSwitchSession = function(id) {
    _DS.setActive(id);
    renderSessions(); renderMessages(); renderMobileMessages(); renderMobileSessions();
    diagMobCloseSessions();
  };

  window.diagMobDeleteSession = function(id) {
    _DS.deleteSession(id);
    renderSessions(); renderMessages(); renderMobileMessages(); renderMobileSessions();
  };

  window.diagToggleMobile = function() {
    var ov = document.getElementById('diag-mobile-overlay');
    if (!ov) return;
    var isOpen = ov.classList.toggle('open');
    if (isOpen) { renderMobileMessages(); renderMobileCtxBar(); renderMobileCart(); renderMobileSessions(); }
  };

  var _origSetCtx = window.diagSetCtx;
  window.diagSetCtx = function(type, woId, partsQuery) {
    _origSetCtx(type, woId, partsQuery);
    renderMobileCtxBar();
  };
  var _origClearCtx = window.diagClearContext;
  window.diagClearContext = function() {
    _origClearCtx();
    renderMobileCtxBar();
  };

  function cleanup() {
    var pdfOv = document.getElementById('diag-pdf-fullscreen');
    if (pdfOv) pdfOv.remove();
    var styleEl = document.getElementById('diag-view-styles');
    if (styleEl) styleEl.remove();
  }

  return cleanup;
};
