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
      orderMsg: true, placement: 'top',
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
      orderMsg: true, placement: 'bottom',
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

  var _articles;
  try {
    var saved = localStorage.getItem('se-1015-cms-articles');
    _articles = saved ? JSON.parse(saved) : SEED.slice();
  } catch (e) {
    _articles = SEED.slice();
  }

  function persist() {
    try { localStorage.setItem('se-1015-cms-articles', JSON.stringify(_articles)); } catch (e) {}
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

    // Order-level fleet messages (placement: '' = all, 'top', 'bottom')
    orderMessages: function (placement) {
      var msgs = cms.getArticles('published').filter(function (a) {
        return a.orderMsg && (!placement || a.placement === placement);
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

    // Supplier-specific messages for a list of vendor names
    supplierMessages: function (vendors) {
      if (!vendors || !vendors.length) return '';
      var msgs = cms.getArticles('published').filter(function (a) {
        return a.showOnOrders && a.vendorName && vendors.indexOf(a.vendorName) >= 0;
      });
      if (!msgs.length) return '';
      return '<div style="margin-top:12px;">' +
        '<div style="font-size:10px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.7px;margin-bottom:7px;">From your supplier' + (msgs.length !== 1 ? 's' : '') + '</div>' +
        msgs.map(function (a) {
          return '<div style="background:#F5F2EE;border-radius:9px;padding:12px 14px;border-left:3px solid #534AB7;margin-bottom:8px;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
              '<span style="font-size:11px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.6px;">' + esc(a.vendorName) + '</span>' +
              (a.postedDate ? '<span style="font-size:10px;color:#9CA3AF;">' + esc(a.postedDate) + '</span>' : '') +
            '</div>' +
            '<div style="font-size:13px;font-weight:600;color:#111318;margin-bottom:3px;">' + esc(a.title) + '</div>' +
            '<div style="font-size:12px;color:#5A5F6E;line-height:1.55;">' + esc(a.body ? a.body.slice(0, 300) + (a.body.length > 300 ? '…' : '') : '') + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    },
  };
})();
