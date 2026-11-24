/* Knowledge Base (B7; DES-26 Knowledge Base and News & Bulletins surfaces; legacy web 59 and 60, legacy
   mobile 58 and 59), web. 1 library for what the fleet should know: recalls, service bulletins, supplier
   notices and how-to articles. Featured carousel (marketing kit, M8) while nothing is searched; kind filter
   with counts; a search field in the header's search slot; rows open the item (article). Manuals keep their
   own library, linked at the foot.
   Manage articles tab (#/kb?tab=manage): full CMS article editor for supervisors.
   State: #/kb   #/kb?kind=Recall   #/kb?q=lowering   #/kb?tab=manage   #/kb?tab=edit&id=cms-seed-1 */
SE.titles.kb = 'Knowledge Base';

/* ── CMS manage-articles view ────────────────────────────────────────────── */
function _kbManageList(el, p) {
  var esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var cms = SE.cms;
  var filter = p.filter || 'all';
  var now = new Date();

  function getStatus(a) {
    if (a.status === 'draft') return 'draft';
    if (a.status === 'scheduled') return 'scheduled';
    if (a.expiryDate && new Date(a.expiryDate) < now) return 'expired';
    return 'published';
  }

  var all = cms.getArticles('all');
  var counts = { all: all.length, published: 0, draft: 0, scheduled: 0, expired: 0 };
  all.forEach(function (a) { var st = getStatus(a); if (counts[st] !== undefined) counts[st]++; });

  var filtered = filter === 'all' ? all : all.filter(function (a) { return getStatus(a) === filter; });

  function filterTabs() {
    return [['all','All'],['published','Published'],['draft','Draft'],['scheduled','Scheduled'],['expired','Expired']].map(function (pair) {
      return '<button type="button" class="kbcms-ftab' + (filter === pair[0] ? ' active' : '') + '" data-cms-filter="' + esc(pair[0]) + '">' +
        esc(pair[1]) + '<span class="kbcms-count">' + (counts[pair[0]] || 0) + '</span></button>';
    }).join('');
  }

  function articleRows() {
    if (!filtered.length) {
      return '<div class="kbcms-empty">No ' + (filter === 'all' ? '' : filter + ' ') + 'articles yet.</div>';
    }
    return filtered.map(function (a) {
      var status = getStatus(a);
      var tm = cms.TYPES[a.type] || cms.TYPES.notice;
      var pri = cms.PRIORITIES.find(function (p) { return p.value === a.priority; }) || cms.PRIORITIES[2];
      return '<div class="kbcms-row" data-cms-edit="' + esc(a.id) + '">' +
        '<div class="kbcms-row-icon" style="background:' + esc(tm.bg) + ';color:' + esc(tm.color) + ';">' + icon('document') + '</div>' +
        '<div class="kbcms-row-body">' +
          '<div class="kbcms-row-title">' + esc(a.title) + '</div>' +
          '<div class="kbcms-row-meta">' +
            '<span class="kbcms-chip kbcms-status-' + esc(status) + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>' +
            '<span class="kbcms-chip" style="background:' + esc(pri.bg) + ';color:' + esc(pri.color) + ';">' + esc(pri.label) + '</span>' +
            '<span class="kbcms-chip" style="background:' + esc(tm.bg) + ';color:' + esc(tm.color) + ';">' + esc(tm.label) + '</span>' +
            (a.banner ? '<span class="kbcms-chip" style="background:#FFFBEB;color:#111318;">' + icon('megaphone') + ' Banner</span>' : '') +
            (a.orderMsg ? '<span class="kbcms-chip" style="background:#EFF4FB;color:#111318;">Order msg</span>' : '') +
            (a.showOnOrders ? '<span class="kbcms-chip" style="background:#EEEDFE;color:#534AB7;">Supplier msg</span>' : '') +
            '<span>By ' + esc(a.poster || 'Unknown') + '</span>' +
            (a.postedDate ? '<span>' + esc(a.postedDate) + '</span>' : '') +
            (a.expiryDate ? '<span>Expires ' + esc(a.expiryDate) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="kbcms-row-actions" data-cms-row-actions>' +
          '<button class="kbcms-btn-ghost kbcms-btn-sm" data-cms-edit="' + esc(a.id) + '" title="Edit">' + icon('pencil') + '</button>' +
          '<button class="kbcms-btn-danger kbcms-btn-sm" data-cms-delete="' + esc(a.id) + '" title="Delete">' + icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  var manageBody =
    '<style>' +
    '.kbcms-hdr{padding:0 0 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}' +
    '.kbcms-hdr-title{font-size:17px;font-weight:700;color:var(--ink);}' +
    '.kbcms-hdr-sub{font-size:12px;color:var(--ink-muted);margin-top:2px;}' +
    '.kbcms-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:var(--ink);color:var(--paper);border:none;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;}' +
    '.kbcms-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--surface);color:var(--ink);border:1px solid var(--line-field);border-radius:8px;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;}' +
    '.kbcms-btn-danger{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#FEE2E2;color:#B91C1C;border:none;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;}' +
    '.kbcms-btn-sm{padding:5px 9px;}' +
    '.kbcms-filter-bar{display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap;margin-bottom:16px;}' +
    '.kbcms-ftab{padding:5px 13px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;color:var(--ink-muted);background:transparent;transition:all .15s;}' +
    '.kbcms-ftab.active{background:var(--ink);color:var(--paper);}' +
    '.kbcms-ftab:hover:not(.active){background:var(--surface-raised);}' +
    '.kbcms-count{font-size:10px;font-weight:700;background:var(--surface-raised);color:var(--ink-muted);border-radius:10px;padding:1px 6px;margin-left:3px;}' +
    '.kbcms-row{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:14px;cursor:pointer;transition:border-color .15s;margin-bottom:8px;}' +
    '.kbcms-row:hover{border-color:var(--line-field);}' +
    '.kbcms-row-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}' +
    '.kbcms-row-body{flex:1;min-width:0;}' +
    '.kbcms-row-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.kbcms-row-meta{font-size:11px;color:var(--ink-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
    '.kbcms-row-actions{display:flex;gap:6px;flex-shrink:0;}' +
    '.kbcms-chip{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:600;}' +
    '.kbcms-status-published{background:#FEF3C7;color:#111318;}' +
    '.kbcms-status-draft{background:var(--surface-raised);color:var(--ink-muted);}' +
    '.kbcms-status-scheduled{background:#FEF3C7;color:#111318;}' +
    '.kbcms-status-expired{background:#FEE2E2;color:#B91C1C;}' +
    '.kbcms-empty{text-align:center;padding:40px;color:var(--ink-muted);font-size:13px;}' +
    '</style>' +
    '<div class="kbcms-hdr">' +
      '<div><div class="kbcms-hdr-title">Manage Articles</div><div class="kbcms-hdr-sub">Fleet news, notices and site-wide banners</div></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="kbcms-btn-ghost" data-kb-tab="library">Back to library</button>' +
        '<button class="kbcms-btn-primary" data-cms-new>' + icon('plus-small') + ' New article</button>' +
      '</div>' +
    '</div>' +
    '<div class="kbcms-filter-bar">' + filterTabs() + '</div>' +
    '<div id="kbcms-list">' + articleRows() + '</div>';

  var s = SE.shell(el, {
    nav: 'kb', title: 'Knowledge Base', crumbs: [['Home', 'home'], ['Knowledge Base', 'kb']],
    sub: 'Manage articles',
    body: '<section class="sec" style="padding-top:4px;">' + manageBody + '</section>',
  });

  el.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-cms-edit]');
    if (!t) return;

    if (t.hasAttribute('data-kb-tab')) {
      SE.go('kb');
      return;
    }
    if (t.hasAttribute('data-cms-new')) {
      SE.go('kb', { params: { tab: 'edit' } });
      return;
    }
    if (t.hasAttribute('data-cms-filter')) {
      SE.go('kb', { params: { tab: 'manage', filter: t.dataset.cmsFilter } });
      return;
    }
    if (t.hasAttribute('data-cms-delete')) {
      e.stopPropagation();
      var did = t.dataset.cmsDelete;
      (function () {
        var dlg = UI.dialog({
          title: 'Delete article',
          body: '<p style="font-size:13px;color:var(--ink-muted);">This will permanently remove the article. This cannot be undone.</p>',
          foot: '<button type="button" class="btn btn-secondary" data-dlg-close>Cancel</button>' +
                '<button type="button" class="btn" style="background:#FEE2E2;color:#B91C1C;border:none;" id="kbcms-confirm-del">Delete</button>',
        });
        dlg.el.querySelector('#kbcms-confirm-del').addEventListener('click', function () {
          SE.cms.deleteArticle(did); dlg.close(); SE.go('kb', { params: { tab: 'manage', filter: filter } });
        });
      }());
      return;
    }
    if (t.hasAttribute('data-cms-edit')) {
      var eid = t.dataset.cmsEdit;
      SE.go('kb', { params: { tab: 'edit', id: eid } });
      return;
    }
    // row click (not on action buttons)
    var row = e.target.closest('.kbcms-row');
    if (row && row.dataset.cmsEdit && !e.target.closest('[data-cms-row-actions]')) {
      SE.go('kb', { params: { tab: 'edit', id: row.dataset.cmsEdit } });
    }
  });

  return s.cleanup;
}

function _kbManageEdit(el, p) {
  var esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var cms = SE.cms;
  var editId = p.id || null;
  var existing = editId ? cms.getArticle(editId) : null;
  var a = existing || {
    id: 'cms-' + Date.now(), type: 'fleet', subtype: 'Operations', priority: 'medium',
    status: 'draft', postAs: 'news',
    title: '', summary: '', body: '',
    poster: SE.data.user ? SE.data.user.short : '',
    postedDate: new Date().toISOString().slice(0, 10),
    expiryDate: '', language: 'en',
    tags: [], attachments: [], locations: ['all'],
    banner: false, bannerDismissible: true, bannerText: '',
    orderMsg: false, placement: '', showOnOrders: false, vendorName: '',
  };

  var tm = cms.TYPES[a.type] || cms.TYPES.notice;
  var subtypeOpts = (cms.SUBTYPES[a.type] || []).map(function (s) {
    return '<option value="' + esc(s) + '"' + (a.subtype === s ? ' selected' : '') + '>' + esc(s) + '</option>';
  }).join('');
  var locationOpts = '<option value="all"' + ((a.locations || []).indexOf('all') >= 0 ? ' selected' : '') + '>All locations</option>' +
    SE.data.locations.map(function (l) {
      return '<option value="' + esc(l.id) + '"' + ((a.locations || []).indexOf(l.id) >= 0 ? ' selected' : '') + '>' + esc(l.name) + '</option>';
    }).join('');

  var editorBody =
    '<style>' +
    '.kbcms-editor-grid{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;padding:4px 0 40px;}' +
    '@media(max-width:760px){.kbcms-editor-grid{grid-template-columns:1fr;}}' +
    '.kbcms-panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:14px;}' +
    '.kbcms-panel-hdr{padding:12px 16px;border-bottom:1px solid var(--line);font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px;}' +
    '.kbcms-panel-body{padding:16px;display:flex;flex-direction:column;gap:14px;}' +
    '.kbcms-field{display:flex;flex-direction:column;gap:5px;}' +
    '.kbcms-label{font-size:11px;font-weight:600;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.6px;}' +
    '.kbcms-input{width:100%;padding:8px 10px;border:1px solid var(--line-field);border-radius:8px;font-size:13px;font-family:inherit;color:var(--ink);outline:none;background:var(--surface);box-sizing:border-box;}' +
    '.kbcms-input:focus{border-color:var(--ink);}' +
    '.kbcms-textarea{width:100%;padding:10px;border:1px solid var(--line-field);border-radius:8px;font-size:13px;font-family:inherit;color:var(--ink);outline:none;resize:vertical;min-height:120px;line-height:1.6;background:var(--surface);box-sizing:border-box;}' +
    '.kbcms-textarea:focus{border-color:var(--ink);}' +
    '.kbcms-select{width:100%;padding:8px 10px;border:1px solid var(--line-field);border-radius:8px;font-size:13px;font-family:inherit;color:var(--ink);outline:none;background:var(--surface);cursor:pointer;box-sizing:border-box;}' +
    '.kbcms-select:focus{border-color:var(--ink);}' +
    '.kbcms-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.kbcms-post-toggle{display:flex;flex-direction:column;gap:5px;}' +
    '.kbcms-post-opt{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line-field);border-radius:8px;cursor:pointer;font-size:12px;color:var(--ink);transition:all .15s;}' +
    '.kbcms-post-opt.active{border-color:var(--ink);background:#FEF3C7;}' +
    '.kbcms-banner-preview{padding:9px 14px;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;border-radius:8px;margin-top:4px;background:#FFFBEB;border:1.5px solid #B45309;color:#B45309;}' +
    '.kbcms-action-bar{display:flex;align-items:center;gap:8px;padding:16px 0;border-top:1px solid var(--line);margin-top:4px;}' +
    '.kbcms-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:var(--ink);color:var(--paper);border:none;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;}' +
    '.kbcms-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--surface);color:var(--ink);border:1px solid var(--line-field);border-radius:8px;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;}' +
    '.kbcms-toggle-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink);}' +
    '.kbcms-toggle-row input[type=checkbox]{width:14px;height:14px;cursor:pointer;accent-color:var(--ink);}' +
    '.kbcms-order-msg-box{padding:12px;background:var(--surface-raised);border-radius:8px;display:flex;flex-direction:column;gap:10px;}' +
    '</style>' +
    '<div class="kbcms-editor-grid">' +
      /* left column */
      '<div>' +
        '<div class="kbcms-panel">' +
          '<div class="kbcms-panel-hdr">' + icon('document') + ' Article content</div>' +
          '<div class="kbcms-panel-body">' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-title">Title *</label>' +
              '<input class="kbcms-input" id="kbcms-f-title" placeholder="Headline — clear and specific" value="' + esc(a.title) + '"/></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-summary">Summary / teaser</label>' +
              '<input class="kbcms-input" id="kbcms-f-summary" placeholder="One-sentence description shown in the news feed" value="' + esc(a.summary) + '"/></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-body">Body *</label>' +
              '<textarea class="kbcms-textarea" id="kbcms-f-body" rows="8" placeholder="Full article content…">' + esc(a.body) + '</textarea></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-tags">Tags <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink-muted);">(comma-separated)</span></label>' +
              '<input class="kbcms-input" id="kbcms-f-tags" placeholder="e.g. hydraulics, safety, toyota" value="' + esc((a.tags || []).join(', ')) + '"/></div>' +
          '</div>' +
        '</div>' +
        /* Order messages panel */
        '<div class="kbcms-panel">' +
          '<div class="kbcms-panel-hdr">' + icon('receipt') + ' Transactional messages</div>' +
          '<div class="kbcms-panel-body">' +
            '<div class="kbcms-order-msg-box">' +
              '<div class="kbcms-label" style="margin-bottom:0;">Fleet order message</div>' +
              '<label class="kbcms-toggle-row">' +
                '<input type="checkbox" id="kbcms-f-ordermsg"' + (a.orderMsg ? ' checked' : '') + '/>' +
                'Show this article as a message on the checkout order summary' +
              '</label>' +
              '<div id="kbcms-ordermsg-opts"' + (a.orderMsg ? '' : ' hidden') + '>' +
                '<div class="kbcms-field">' +
                  '<label class="kbcms-label" for="kbcms-f-placement">Placement</label>' +
                  '<select class="kbcms-select" id="kbcms-f-placement">' +
                    '<option value="top"' + (a.placement === 'top' ? ' selected' : '') + '>Top of order summary</option>' +
                    '<option value="bottom"' + (a.placement === 'bottom' ? ' selected' : '') + '>Bottom of order summary (before submit)</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="kbcms-order-msg-box">' +
              '<div class="kbcms-label" style="margin-bottom:0;">Supplier order message</div>' +
              '<label class="kbcms-toggle-row">' +
                '<input type="checkbox" id="kbcms-f-showonorders"' + (a.showOnOrders ? ' checked' : '') + '/>' +
                'Show this as a supplier message on orders containing this vendor' +
              '</label>' +
              '<div id="kbcms-supplier-opts"' + (a.showOnOrders ? '' : ' hidden') + '>' +
                '<div class="kbcms-field">' +
                  '<label class="kbcms-label" for="kbcms-f-vendorname">Vendor name (must match supplier exactly)</label>' +
                  '<input class="kbcms-input" id="kbcms-f-vendorname" placeholder="e.g. JLG, Skyjack" value="' + esc(a.vendorName || '') + '"/>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      /* right column */
      '<div>' +
        '<div class="kbcms-panel">' +
          '<div class="kbcms-panel-hdr">' + icon('info') + ' Classification</div>' +
          '<div class="kbcms-panel-body">' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-type">Type</label>' +
              '<select class="kbcms-select" id="kbcms-f-type">' +
                Object.keys(cms.TYPES).map(function (v) {
                  return '<option value="' + esc(v) + '"' + (a.type === v ? ' selected' : '') + '>' + esc(cms.TYPES[v].label) + '</option>';
                }).join('') +
              '</select></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-subtype">Sub-type</label>' +
              '<select class="kbcms-select" id="kbcms-f-subtype">' + subtypeOpts + '</select></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-priority">Urgency</label>' +
              '<select class="kbcms-select" id="kbcms-f-priority">' +
                cms.PRIORITIES.map(function (pr) {
                  return '<option value="' + esc(pr.value) + '"' + (a.priority === pr.value ? ' selected' : '') + '>' + esc(pr.label) + '</option>';
                }).join('') +
              '</select></div>' +
            '<div class="kbcms-row-2">' +
              '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-date">Publish date</label>' +
                '<input class="kbcms-input" type="date" id="kbcms-f-date" value="' + esc(a.postedDate || '') + '"/></div>' +
              '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-expiry">Expiry date</label>' +
                '<input class="kbcms-input" type="date" id="kbcms-f-expiry" value="' + esc(a.expiryDate || '') + '"/></div>' +
            '</div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-language">Language</label>' +
              '<select class="kbcms-select" id="kbcms-f-language">' +
                cms.LANGUAGES.map(function (l) {
                  return '<option value="' + esc(l.value) + '"' + (a.language === l.value ? ' selected' : '') + '>' + esc(l.label) + '</option>';
                }).join('') +
              '</select></div>' +
            '<div class="kbcms-field"><label class="kbcms-label" for="kbcms-f-locations">Locations</label>' +
              '<select class="kbcms-select" id="kbcms-f-locations">' + locationOpts + '</select></div>' +
          '</div>' +
        '</div>' +
        '<div class="kbcms-panel">' +
          '<div class="kbcms-panel-hdr">' + icon('envelope') + ' Post as</div>' +
          '<div class="kbcms-panel-body">' +
            '<div class="kbcms-post-toggle" id="kbcms-post-toggle">' +
              cms.POST_AS.map(function (opt) {
                return '<button type="button" class="kbcms-post-opt' + (a.postAs === opt.value ? ' active' : '') + '" data-post-as="' + esc(opt.value) + '">' +
                  esc(opt.label) + '</button>';
              }).join('') +
            '</div>' +
            '<input type="hidden" id="kbcms-f-postas" value="' + esc(a.postAs) + '"/>' +
            '<div id="kbcms-banner-opts"' + (a.postAs === 'news' ? ' hidden' : '') + '>' +
              '<div class="kbcms-field" style="margin-top:6px;">' +
                '<label class="kbcms-label" for="kbcms-f-banner-text">Banner text</label>' +
                '<input class="kbcms-input" id="kbcms-f-banner-text" placeholder="Short message shown in the banner" value="' + esc(a.bannerText || a.summary || '') + '"/>' +
              '</div>' +
              '<label class="kbcms-toggle-row" style="margin-top:6px;">' +
                '<input type="checkbox" id="kbcms-f-dismissible"' + (a.bannerDismissible !== false ? ' checked' : '') + '/>' +
                'Users can dismiss banner' +
              '</label>' +
              '<div class="kbcms-banner-preview" id="kbcms-banner-live">' +
                icon('megaphone') +
                '<span id="kbcms-banner-live-text">' + esc(a.bannerText || a.summary || 'Banner preview') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="kbcms-action-bar">' +
      '<button class="kbcms-btn-ghost" data-cms-back>' + icon('arrow-small-left') + ' Back to articles</button>' +
      '<div style="flex:1;"></div>' +
      '<button class="kbcms-btn-ghost" data-cms-save="draft">' + icon('document') + ' Save draft</button>' +
      '<button class="kbcms-btn-ghost" data-cms-save="scheduled">' + icon('calendar') + ' Schedule</button>' +
      '<button class="kbcms-btn-primary" data-cms-save="published">' + icon('envelope') + ' Publish now</button>' +
    '</div>';

  var s = SE.shell(el, {
    nav: 'kb', title: 'Knowledge Base',
    crumbs: [['Home', 'home'], ['Knowledge Base', 'kb'], ['Manage articles', 'kb?tab=manage']],
    sub: editId ? 'Edit article' : 'New article',
    body: '<section class="sec" style="padding-top:4px;">' + editorBody + '</section>',
  });

  /* live banner preview */
  var bannerInput = el.querySelector('#kbcms-f-banner-text');
  if (bannerInput) {
    bannerInput.addEventListener('input', function () {
      var t = el.querySelector('#kbcms-banner-live-text');
      if (t) t.textContent = bannerInput.value || 'Banner preview';
    });
  }

  /* toggle ordermsg opts */
  var orderMsgCb = el.querySelector('#kbcms-f-ordermsg');
  if (orderMsgCb) {
    orderMsgCb.addEventListener('change', function () {
      var opts = el.querySelector('#kbcms-ordermsg-opts');
      if (opts) opts.hidden = !orderMsgCb.checked;
    });
  }

  /* toggle supplier opts */
  var showOnOrdersCb = el.querySelector('#kbcms-f-showonorders');
  if (showOnOrdersCb) {
    showOnOrdersCb.addEventListener('change', function () {
      var opts = el.querySelector('#kbcms-supplier-opts');
      if (opts) opts.hidden = !showOnOrdersCb.checked;
    });
  }

  /* type change → update subtypes */
  var typeSelect = el.querySelector('#kbcms-f-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', function () {
      var st = el.querySelector('#kbcms-f-subtype');
      if (st) st.innerHTML = (cms.SUBTYPES[typeSelect.value] || []).map(function (s) {
        return '<option>' + SE.esc(s) + '</option>';
      }).join('');
    });
  }

  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;

    if (t.hasAttribute('data-cms-back')) {
      SE.go('kb', { params: { tab: 'manage' } });
      return;
    }

    if (t.hasAttribute('data-post-as')) {
      var val = t.dataset.postAs;
      el.querySelectorAll('.kbcms-post-opt').forEach(function (b) { b.classList.toggle('active', b.dataset.postAs === val); });
      var fi = el.querySelector('#kbcms-f-postas');
      if (fi) fi.value = val;
      var bo = el.querySelector('#kbcms-banner-opts');
      if (bo) bo.hidden = val === 'news';
      return;
    }

    if (t.hasAttribute('data-cms-save')) {
      var status = t.dataset.cmsSave;
      var article = _kbCmsCollectForm(el, a.id, existing);
      if (!article) return;
      article.status = status;
      cms.saveArticle(article);
      SE.toast(status === 'published' ? 'Article published' : status === 'scheduled' ? 'Article scheduled' : 'Draft saved', 'check');
      SE.go('kb', { params: { tab: 'manage' } });
    }
  });

  return s.cleanup;
}

function _kbCmsCollectForm(el, defaultId, existing) {
  function g(id) { var el2 = document.getElementById(id); return el2 ? el2.value : ''; }
  var title = g('kbcms-f-title').trim();
  if (!title) { SE.toast('Title is required', 'exclamation'); return null; }
  var body = g('kbcms-f-body').trim();
  if (!body) { SE.toast('Body content is required', 'exclamation'); return null; }
  var postAs = g('kbcms-f-postas') || 'news';
  var orderMsgEl = document.getElementById('kbcms-f-ordermsg');
  var showOnOrdersEl = document.getElementById('kbcms-f-showonorders');
  var dismissEl = document.getElementById('kbcms-f-dismissible');
  return {
    id: existing ? existing.id : defaultId,
    type: g('kbcms-f-type'), subtype: g('kbcms-f-subtype'), priority: g('kbcms-f-priority'),
    postAs: postAs,
    title: title, summary: g('kbcms-f-summary'), body: body,
    poster: SE.data.user ? SE.data.user.short : '',
    postedDate: g('kbcms-f-date'), expiryDate: g('kbcms-f-expiry'), language: g('kbcms-f-language'),
    tags: g('kbcms-f-tags').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
    attachments: existing ? (existing.attachments || []) : [],
    locations: [g('kbcms-f-locations') || 'all'],
    banner: postAs !== 'news',
    bannerDismissible: dismissEl ? dismissEl.checked : true,
    bannerText: g('kbcms-f-banner-text'),
    orderMsg: orderMsgEl ? orderMsgEl.checked : false,
    placement: g('kbcms-f-placement'),
    showOnOrders: showOnOrdersEl ? showOnOrdersEl.checked : false,
    vendorName: g('kbcms-f-vendorname').trim(),
  };
}

/* ── Library view ────────────────────────────────────────────────────────── */
SE.views.kb = function (el, p) {
  /* Route to manage sub-views */
  if (p.tab === 'manage') return _kbManageList(el, p);
  if (p.tab === 'edit')   return _kbManageEdit(el, p);

  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var KINDS = [['all', 'All'], ['Recall', 'Recalls'], ['Bulletin', 'Bulletins'], ['Notice', 'Notices'], ['Article', 'Articles']];
  var TONE = { Recall: 'danger', Bulletin: 'warning', Notice: 'neutral', Article: 'info' };
  var kind = KINDS.some(function (k) { return k[0] === p.kind; }) ? p.kind : 'all';
  var date = p.date || 'all';
  var by = p.by || 'all';
  var q = p.q || '';

  function supName(machineId) {
    if (!machineId || !D.machines[machineId]) return null;
    var sup = SE.supplier(D.machines[machineId].supplier);
    return sup ? sup.name : null;
  }
  function dateGroup(d) {
    if (!d) return null;
    var m = d.match(/^(\w+)\s+\d+,?\s+(\d{4})$/);
    return m ? m[1] + ' ' + m[2] : d;
  }

  function items() {
    return D.news.map(function (n) {
      var mc = n.machine ? SE.machine(n.machine) : null;
      return { id: n.id, kind: n.kind, title: n.title, summary: n.summary,
               meta: (mc ? mc.name + ' · ' : '') + n.date,
               dateGroup: dateGroup(n.date), by: supName(n.machine) };
    }).concat(D.kb.map(function (a) {
      return { id: a.id, kind: 'Article', title: a.title, summary: a.summary,
               meta: a.topic + ' · ' + a.minutes + ' min read',
               dateGroup: null, by: supName(a.machine) };
    }));
  }
  function match(x, k) {
    if (k !== 'all' && x.kind !== k) return false;
    if (date !== 'all' && x.dateGroup !== date) return false;
    if (by !== 'all' && x.by !== by) return false;
    return !q.trim() || SE.hitTokens([x.title, x.summary, x.kind, x.meta].join(' '), SE.qTokens(q));
  }

  function kindSel() {
    return '<select id="kb-kind-sel" aria-label="Type">' +
      KINDS.map(function (k) { return '<option value="' + esc(k[0]) + '"' + (kind === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
  function dateSel() {
    var seen = {}, dates = [];
    items().forEach(function (x) { if (x.dateGroup && !seen[x.dateGroup]) { seen[x.dateGroup] = 1; dates.push(x.dateGroup); } });
    return '<select id="kb-date-sel" aria-label="Date posted"><option value="all">All dates</option>' +
      dates.map(function (d) { return '<option value="' + esc(d) + '"' + (date === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
  function bySel() {
    var seen = {}, bys = [];
    items().forEach(function (x) { if (x.by && !seen[x.by]) { seen[x.by] = 1; bys.push(x.by); } });
    return '<select id="kb-by-sel" aria-label="Posted by"><option value="all">All sources</option>' +
      bys.map(function (b) { return '<option value="' + esc(b) + '"' + (by === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') +
      '</select>' + icon('angle-small-down');
  }
  function row(x) {
    return '<li><a class="kb-row card" href="#/article?id=' + encodeURIComponent(x.id) + '">' +
      '<span class="kb-kind">' + SE.chip(x.kind, TONE[x.kind]) + '<small>' + esc(x.meta) + '</small></span>' +
      '<b>' + SE.hl(x.title, q) + '</b><span class="kb-sum">' + SE.hl(x.summary, q) + '</span>' + icon('angle-small-right', 'chev') + '</a></li>';
  }
  function list() {
    var l = items().filter(function (x) { return match(x, kind); });
    if (!l.length) return UI.empty({ icon: 'search', tone: 'neutral', title: 'Nothing matches' + (q.trim() ? ' "' + q.trim() + '"' : ''), text: 'Try another word, or show every kind.',
      action: '<button type="button" class="btn btn-secondary" data-clear>Clear search and filters</button>' });
    return '<p class="sr-meta"><b>' + l.length + ' item' + (l.length === 1 ? '' : 's') + '</b></p><ul class="kb-list">' + l.map(row).join('') + '</ul>';
  }
  var field = '<form class="search mw-find kb-find" role="search" data-kb-form><label class="sr-only" for="kb-q">Search the knowledge base</label>' + icon('search') +
    '<input id="kb-q" type="search" value="' + esc(q) + '" placeholder="Search bulletins, recalls and articles" autocomplete="off"></form>';
  var s = SE.shell(el, {
    nav: 'kb', title: 'Knowledge Base', crumbs: [['Home', 'home']],
    sub: esc(D.news.length + ' bulletins, recalls and notices · ' + D.kb.length + ' how-to articles'),
    actions: '<a class="btn btn-secondary" href="#/kb?tab=manage">' + icon('pencil') + 'Manage articles</a>',
    body: '<div id="kb-feat">' + (SE.mkt ? SE.mkt.featured() : '') + '</div>' +
      (SE.cms ? '<div style="display:flex;justify-content:flex-end;margin-bottom:4px;padding:0 0 8px;">' +
        '<a class="btn btn-secondary" href="#/kb?tab=manage" style="gap:6px;">' + icon('pencil') + 'Manage articles</a></div>' : '') +
      '<section class="sec kb" aria-label="Library"><div class="sx-bar">' + field +
        '<div class="flt-sel" id="kb-kind-wrap">' + kindSel() + '</div>' +
        '<div class="flt-sel" id="kb-date-wrap">' + dateSel() + '</div>' +
        '<div class="flt-sel" id="kb-by-wrap">' + bySel() + '</div>' +
      '</div>' +
      '<div id="kb-list">' + list() + '</div></section>' +
      UI.sec('Manuals', '', '<a class="sr-browse card" href="#/manuals">' + icon('book-alt') + '<span><b>Manuals & Docs</b><small>' + D.manuals.length + ' manuals and bulletins by machine</small></span>' + icon('angle-small-right') + '</a>'),
  });
  var input = el.querySelector('#kb-q');
  var stopMkt = SE.mkt ? SE.mkt.bind(el) : null;
  function render() {
    el.querySelector('#kb-kind-sel').value = kind;
    el.querySelector('#kb-date-wrap').innerHTML = dateSel();
    el.querySelector('#kb-by-wrap').innerHTML = bySel();
    el.querySelector('#kb-list').innerHTML = list();
    el.querySelector('#kb-feat').hidden = !!q.trim();
    var h = [];
    if (kind !== 'all') h.push('kind=' + kind);
    if (date !== 'all') h.push('date=' + encodeURIComponent(date));
    if (by !== 'all') h.push('by=' + encodeURIComponent(by));
    if (q.trim()) h.push('q=' + encodeURIComponent(q.trim()));
    history.replaceState(null, '', '#/kb' + (h.length ? '?' + h.join('&') : ''));
  }
  el.querySelector('#kb-feat').hidden = !!q.trim();
  input.addEventListener('input', function () { q = input.value; render(); });
  el.querySelector('[data-kb-form]').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); q = input.value; render(); });
  el.querySelector('#kb-kind-sel').addEventListener('change', function (e) { kind = e.target.value; render(); });
  el.querySelector('#kb-date-sel').addEventListener('change', function (e) { date = e.target.value; render(); });
  el.querySelector('#kb-by-sel').addEventListener('change', function (e) { by = e.target.value; render(); });
  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-clear')) { q = ''; input.value = ''; kind = 'all'; date = 'all'; by = 'all'; render(); }
  });
  return function () { if (stopMkt) stopMkt(); s.cleanup(); };
};
