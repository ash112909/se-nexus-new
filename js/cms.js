/* CMS article store for se-nexus-new.
   Exposes SE.cms with article CRUD and order-message rendering helpers.
   Persists to localStorage; seeds with demo articles on first load. */
(function () {
  'use strict';

  var CMS_TYPES = {
    bulletin: { label: 'Service Bulletin', color: '#111318', bg: '#FEF3C7' },
    fleet:    { label: 'Fleet Update',     color: '#1A1A1A', bg: '#FFFBEB' },
    safety:   { label: 'Safety Alert',     color: '#B91C1C', bg: '#FEE2E2' },
    warranty: { label: 'Warranty Notice',  color: '#111318', bg: '#E1F5EE' },
    supplier: { label: 'Supplier News',    color: '#534AB7', bg: '#EEEDFE' },
    training: { label: 'Training',         color: '#5B21B6', bg: '#EDE9FE' },
    pricing:  { label: 'Pricing Update',   color: '#6B7280', bg: '#F3F4F6' },
    machine:  { label: 'Machine Content',  color: '#065F46', bg: '#D1FAE5' },
    notice:   { label: 'General Notice',   color: '#374151', bg: '#F9FAFB' },
  };

  var CMS_SUBTYPES = {
    bulletin: ['Mandatory', 'Advisory', 'Recall'],
    fleet:    ['Operations', 'Equipment', 'Staffing'],
    safety:   ['Compliance', 'Hazard', 'PPE', 'Procedure'],
    warranty: ['Expiry', 'Claim', 'Coverage'],
    supplier: ['Pricing', 'Availability', 'Product Launch'],
    training: ['Required', 'Optional', 'Certification'],
    pricing:  ['Increase', 'Decrease', 'Promotional'],
    machine:  ['Parts Guide', 'Service Tips', 'Spec Sheet', 'Usage Guide', 'Fleet Modification Note'],
    notice:   ['Policy', 'Reminder', 'Administrative'],
  };

  var CMS_PRIORITIES = [
    { value: 'critical', label: 'Critical', color: '#B91C1C', bg: '#FEE2E2' },
    { value: 'high',     label: 'High',     color: '#C2410C', bg: '#FFF7ED' },
    { value: 'medium',   label: 'Medium',   color: '#B45309', bg: '#FFFBEB' },
    { value: 'low',      label: 'Low',      color: '#6B7280', bg: '#F9FAFB' },
  ];

  var CMS_LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish (Español)' },
    { value: 'fr', label: 'French (Français)' },
    { value: 'pt', label: 'Portuguese (Português)' },
  ];

  var CMS_POST_AS = [
    { value: 'news',   label: 'News & updates feed only' },
    { value: 'banner', label: 'Site-wide banner only' },
    { value: 'both',   label: 'News feed + banner' },
  ];

  var SEED = [
    {
      id: 'cms-seed-1', type: 'fleet', subtype: 'Operations', priority: 'high',
      status: 'published', postAs: 'news',
      title: 'Mandatory pre-operation inspection for JLG 1930ES',
      summary: 'All operators must complete the revised inspection checklist before using the 1930ES.',
      body: 'Effective immediately, all operators are required to complete the updated pre-operation inspection checklist for the JLG 1930ES aerial work platform. The revised checklist includes additional checks for the hydraulic leveling system and pothole protection device. Please contact your supervisor to obtain a copy of the updated checklist.',
      poster: 'Sarah M.', postedDate: '2026-11-01', expiryDate: '', language: 'en',
      tags: ['inspection', 'safety', 'JLG', '1930ES'],
      attachments: [], locations: ['all'],
      banner: false, bannerDismissible: true, bannerText: '',
      orderMsg: true, placement: 'order-top',
      showOnOrders: false, vendorName: '',
    },
    {
      id: 'cms-seed-2', type: 'supplier', subtype: 'Availability', priority: 'medium',
      status: 'published', postAs: 'news',
      title: 'JLG hydraulic hose lead times extended to 3–4 weeks',
      summary: 'JLG has notified us of extended lead times on hydraulic hose assemblies through Q1 2027.',
      body: 'JLG Industries has informed us that lead times on hydraulic hose assembly kits (including JLG-4120-118) are extended to 3–4 weeks through Q1 2027 due to supply chain constraints. We recommend placing orders early and reviewing backorder status on open POs.',
      poster: 'Sarah M.', postedDate: '2026-11-10', expiryDate: '2027-03-31', language: 'en',
      tags: ['JLG', 'hydraulics', 'lead times'],
      attachments: [], locations: ['all'],
      banner: false, bannerDismissible: true, bannerText: '',
      orderMsg: false, placement: 'order-bottom',
      showOnOrders: true, vendorName: 'JLG',
    },
    {
      id: 'cms-seed-3', type: 'safety', subtype: 'Procedure', priority: 'critical',
      status: 'published', postAs: 'both',
      title: 'Scissor lift stabilizer inspection – immediate action required',
      summary: 'All Skyjack scissor lifts must be inspected for stabilizer wear before next use.',
      body: 'A critical safety advisory has been issued for Skyjack SJIII series scissor lifts. All units must be inspected for stabilizer pad wear before next use. Units with wear exceeding 20% must be taken out of service immediately. Contact the service department to schedule inspection.',
      poster: 'Sarah M.', postedDate: '2026-10-15', expiryDate: '', language: 'en',
      tags: ['Skyjack', 'safety', 'stabilizer'],
      attachments: [], locations: ['all'],
      banner: true, bannerDismissible: false, bannerText: 'Safety alert: Skyjack stabilizer inspection required before next use.',
      orderMsg: false, placement: '',
      showOnOrders: true, vendorName: 'Skyjack',
    },
    {
      id: 'cms-seed-4', type: 'notice', subtype: 'Administrative', priority: 'low',
      status: 'draft', postAs: 'news',
      title: 'Year-end parts ordering deadline',
      summary: 'All parts orders must be submitted by Dec 15 for guaranteed year-end delivery.',
      body: 'As a reminder, all parts orders intended for year-end delivery must be submitted no later than December 15, 2026. Orders submitted after this date cannot be guaranteed for delivery before year-end. Contact your branch manager with any questions.',
      poster: 'Sarah M.', postedDate: '2026-11-20', expiryDate: '2026-12-15', language: 'en',
      tags: ['ordering', 'deadline'],
      attachments: [], locations: ['all'],
      banner: false, bannerDismissible: true, bannerText: '',
      orderMsg: false, placement: '',
      showOnOrders: false, vendorName: '',
    },
  ];

  var STORAGE_KEY = 'se-1016-cms-articles';
  var _articles;
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    _articles = saved ? JSON.parse(saved) : SEED.slice();
  } catch (e) {
    _articles = SEED.slice();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_articles)); } catch (e) {}
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var cms = window.SE.cms = {
    TYPES: CMS_TYPES,
    SUBTYPES: CMS_SUBTYPES,
    PRIORITIES: CMS_PRIORITIES,
    LANGUAGES: CMS_LANGUAGES,
    POST_AS: CMS_POST_AS,
    esc: esc,

    getArticles: function (status) {
      if (status === 'published') return _articles.filter(function (a) { return a.status === 'published'; });
      if (!status || status === 'all') return _articles.slice();
      return _articles.filter(function (a) { return a.status === status; });
    },

    getArticle: function (id) {
      return _articles.find(function (a) { return a.id === id; }) || null;
    },

    saveArticle: function (a) {
      var idx = _articles.findIndex(function (x) { return x.id === a.id; });
      if (idx >= 0) _articles[idx] = a; else _articles.unshift(a);
      persist();
    },

    deleteArticle: function (id) {
      _articles = _articles.filter(function (a) { return a.id !== id; });
      persist();
    },

    // Order-level fleet messages.
    // placement: 'cart-top'|'cart-bottom'|'order-top'|'order-bottom'|'' ('' = all)
    // forTransfer: true to also include transfer-only messages (vendorName === '__transfers__')
    orderMessages: function (placement, forTransfer) {
      var msgs = cms.getArticles('published').filter(function (a) {
        if (!a.orderMsg) return false;
        if (placement && a.placement !== placement) return false;
        if (a.vendorName === '__transfers__') return forTransfer === true;
        return true;
      });
      if (!msgs.length) return '';
      return msgs.map(function (a) {
        return '<div style="background:#EFF4FB;border-radius:9px;padding:11px 14px;margin-bottom:10px;border-left:3px solid #111318;">' +
          '<div style="font-size:11px;font-weight:700;color:#111318;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Fleet message' +
            (a.postedDate ? '<span style="font-weight:400;color:#9CA3AF;margin-left:8px;text-transform:none;">' + esc(a.postedDate) + '</span>' : '') +
          '</div>' +
          '<div style="font-size:13px;font-weight:600;color:#111318;margin-bottom:2px;">' + esc(a.title) + '</div>' +
          (a.body ? '<div style="font-size:12px;color:#5A5F6E;line-height:1.55;">' + esc(a.body) + '</div>' : '') +
        '</div>';
      }).join('');
    },

    // Open "Order Messages" manager dialog (shared by orders and work-orders pages)
    openMsgManager: function () {
      var UI = SE.ui;
      var PLACEMENTS = [
        { id: 'cart-top',    label: 'Top of cart',              forOrder: false },
        { id: 'cart-bottom', label: 'Bottom of cart',           forOrder: false },
        { id: 'order-top',   label: 'Top of order summary',     forOrder: true  },
        { id: 'order-bottom',label: 'Bottom of order summary',  forOrder: true  },
      ];
      var PL_IDS = PLACEMENTS.map(function (p) { return p.id; });
      var sups = (SE.data.suppliers || []).filter(function (s) { return s.active !== false; }).map(function (s) { return s.name; });

      function plLabel(id) {
        var p = PLACEMENTS.filter(function (p) { return p.id === id; })[0];
        return p ? p.label : (id || '—');
      }
      function scopeLabel(a) {
        if (a.vendorName === '__transfers__') return 'Branch transfers';
        if (a.showOnOrders && a.vendorName) return a.vendorName;
        return 'All orders';
      }

      var msgs = cms.getArticles('published').filter(function (a) {
        return PL_IDS.indexOf(a.placement) >= 0 && (a.orderMsg || (a.showOnOrders && a.vendorName));
      });

      var INP = 'width:100%;border:1px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;color:var(--ink);background:var(--surface);font-family:inherit;outline:none;box-sizing:border-box;';
      var LBL = 'display:block;font-size:11px;font-weight:600;color:#6B7280;margin-bottom:5px;';

      function buildRow(a) {
        var scopeChip = scopeLabel(a) !== 'All orders'
          ? '<span style="font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.4px;background:#F3F4F6;padding:2px 5px;border-radius:3px;margin-left:4px;">' + esc(scopeLabel(a)) + '</span>'
          : '';
        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #F3F4F6;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;">' +
              '<span style="font-size:9px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.5px;background:#EEEDFE;padding:2px 7px;border-radius:4px;white-space:nowrap;">' + esc(plLabel(a.placement)) + '</span>' +
              scopeChip +
              '<span style="font-size:12px;font-weight:600;color:var(--ink);margin-left:2px;">' + esc(a.title) + '</span>' +
            '</div>' +
            (a.body ? '<div style="font-size:11px;color:#6B7280;line-height:1.5;margin-bottom:2px;">' + esc(a.body.slice(0, 100) + (a.body.length > 100 ? '…' : '')) + '</div>' : '') +
            (a.postedDate ? '<div style="font-size:10px;color:#B0AAA3;">' + esc(a.postedDate) + '</div>' : '') +
          '</div>' +
          '<button data-oh-del="' + esc(a.id) + '" style="background:none;border:1px solid #FECACA;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;color:#DC2626;cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap;">Remove</button>' +
        '</div>';
      }

      var listHtml = msgs.length
        ? msgs.map(buildRow).join('')
        : '<div style="font-size:13px;color:#9CA3AF;text-align:center;padding:24px 0;">No order messages yet.</div>';

      var supOpts = sups.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');

      var dlg = UI.dialog({
        title: 'Order Messages',
        wide: true,
        body: '<div style="max-height:520px;overflow-y:auto;margin:-16px;">' +

          '<div style="padding:16px;border-bottom:1px solid #F0ECE8;">' +
            '<div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#9CA3AF;margin-bottom:14px;">Add new message</div>' +
            '<div style="display:grid;gap:11px;">' +

              '<div><label for="oh-msg-title" style="' + LBL + '">Message title</label>' +
                '<input id="oh-msg-title" type="text" placeholder="e.g. New inspection requirement for JLG 1930ES" style="' + INP + '" /></div>' +

              '<div><label for="oh-msg-body" style="' + LBL + '">Message content</label>' +
                '<textarea id="oh-msg-body" placeholder="Describe the message shown to users when placing or reviewing orders…" rows="3" style="' + INP + 'resize:vertical;"></textarea></div>' +

              '<div><label for="oh-msg-placement" style="' + LBL + '">Placement</label>' +
                '<div style="position:relative;">' +
                  '<select id="oh-msg-placement" style="' + INP + 'appearance:none;-webkit-appearance:none;padding-right:28px;cursor:pointer;">' +
                    PLACEMENTS.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.label) + '</option>'; }).join('') +
                  '</select>' +
                  '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:12px;color:#6B7280;">&#9660;</span>' +
                '</div></div>' +

              '<div id="oh-applies-wrap" hidden>' +
                '<div style="' + LBL + '">Applies to</div>' +
                '<div style="display:flex;flex-direction:column;gap:6px;">' +
                  '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink);">' +
                    '<input type="radio" name="oh-scope" value="all" checked style="accent-color:#111318;width:14px;height:14px;cursor:pointer;"> All orders</label>' +
                  '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink);">' +
                    '<input type="radio" name="oh-scope" value="supplier" style="accent-color:#111318;width:14px;height:14px;cursor:pointer;"> Specific supplier</label>' +
                  '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink);">' +
                    '<input type="radio" name="oh-scope" value="transfer" style="accent-color:#111318;width:14px;height:14px;cursor:pointer;"> Branch transfers only</label>' +
                '</div>' +
                '<div id="oh-vendor-wrap" hidden style="margin-top:8px;">' +
                  '<div style="position:relative;">' +
                    '<select id="oh-msg-vendor" style="' + INP + 'appearance:none;-webkit-appearance:none;padding-right:28px;cursor:pointer;">' +
                      '<option value="">Select supplier…</option>' + supOpts +
                    '</select>' +
                    '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:12px;color:#6B7280;">&#9660;</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<button type="button" data-oh-add style="width:100%;height:40px;background:#111318;border:none;border-radius:8px;font-size:13px;font-weight:600;color:#fff;font-family:inherit;cursor:pointer;text-align:center;letter-spacing:.1px;">Add message</button>' +

            '</div>' +
          '</div>' +

          '<div>' +
            '<div style="padding:12px 16px 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#534AB7;">Active messages (' + msgs.length + ')</div>' +
            listHtml +
          '</div>' +

        '</div>',
        foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Done</button>',
      });

      // Show/hide Applies To section based on placement
      dlg.el.addEventListener('change', function (e) {
        var placEl = dlg.el.querySelector('#oh-msg-placement');
        var appliesWrap = dlg.el.querySelector('#oh-applies-wrap');
        var vendorWrap  = dlg.el.querySelector('#oh-vendor-wrap');
        if (e.target === placEl) {
          var chosen = PLACEMENTS.filter(function (p) { return p.id === placEl.value; })[0];
          appliesWrap.hidden = !(chosen && chosen.forOrder);
          if (appliesWrap.hidden) {
            var r = appliesWrap.querySelector('input[value="all"]');
            if (r) { r.checked = true; }
          }
        }
        if (e.target.name === 'oh-scope') {
          vendorWrap.hidden = e.target.value !== 'supplier';
        }
      });

      dlg.el.addEventListener('click', function (e) {
        var del = e.target.closest('[data-oh-del]');
        if (del) {
          cms.deleteArticle(del.dataset.ohDel);
          dlg.close();
          cms.openMsgManager();
          return;
        }
        if (e.target.closest('[data-oh-add]')) {
          var titleEl = dlg.el.querySelector('#oh-msg-title');
          var bodyEl  = dlg.el.querySelector('#oh-msg-body');
          var placEl  = dlg.el.querySelector('#oh-msg-placement');
          var scopeEl = dlg.el.querySelector('input[name="oh-scope"]:checked');
          var vendorEl = dlg.el.querySelector('#oh-msg-vendor');
          var t  = titleEl ? titleEl.value.trim() : '';
          var b  = bodyEl  ? bodyEl.value.trim()  : '';
          var pl = placEl  ? placEl.value : 'cart-top';
          var scope = scopeEl ? scopeEl.value : 'all';
          var vendor = (vendorEl && !vendorEl.closest('#oh-vendor-wrap[hidden]')) ? vendorEl.value.trim() : '';
          if (!t || !b) { SE.toast('Title and content are required', 'cross-small'); return; }
          if (scope === 'supplier' && !vendor) { SE.toast('Select a supplier', 'cross-small'); return; }
          var article = {
            id: 'oh-msg-' + Date.now(),
            type: 'notice', subtype: 'Administrative', status: 'published', postAs: 'news',
            title: t, body: b, placement: pl,
            poster: SE.data.user.name || '', postedDate: new Date().toISOString().slice(0, 10), expiryDate: '',
            language: 'en', tags: [], attachments: [], locations: ['all'],
            banner: false, bannerDismissible: true, bannerText: '', priority: 'low',
          };
          if (scope === 'supplier') {
            article.orderMsg = false; article.showOnOrders = true; article.vendorName = vendor;
          } else if (scope === 'transfer') {
            article.orderMsg = true; article.showOnOrders = false; article.vendorName = '__transfers__';
          } else {
            article.orderMsg = true; article.showOnOrders = false; article.vendorName = '';
          }
          cms.saveArticle(article);
          dlg.close();
          cms.openMsgManager();
        }
      });
    },

    // Fleet messages scoped to specific suppliers — same style as orderMessages
    supplierMessages: function (vendors) {
      if (!vendors || !vendors.length) return '';
      var msgs = cms.getArticles('published').filter(function (a) {
        return a.showOnOrders && a.vendorName && vendors.indexOf(a.vendorName) >= 0;
      });
      if (!msgs.length) return '';
      return msgs.map(function (a) {
        return '<div style="background:#EFF4FB;border-radius:9px;padding:11px 14px;margin-bottom:10px;border-left:3px solid #111318;">' +
          '<div style="font-size:11px;font-weight:700;color:#111318;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">' +
            esc(a.vendorName) + ' orders' +
            (a.postedDate ? '<span style="font-weight:400;color:#9CA3AF;margin-left:8px;text-transform:none;">' + esc(a.postedDate) + '</span>' : '') +
          '</div>' +
          '<div style="font-size:13px;font-weight:600;color:#111318;margin-bottom:2px;">' + esc(a.title) + '</div>' +
          (a.body ? '<div style="font-size:12px;color:#5A5F6E;line-height:1.55;">' + esc(a.body) + '</div>' : '') +
        '</div>';
      }).join('');
    },
  };
})();
