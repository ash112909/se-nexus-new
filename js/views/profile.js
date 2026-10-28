/* Profile settings (avatar upload, notification preferences).
   Avatar stored in localStorage; notification prefs stored in localStorage (persist across sessions).
   #/profile */
SE.titles.profile = 'Profile & notifications';
SE.views.profile = function (el, p) {
  var D = SE.data, esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var store = SE.store;

  function getAvatar() { return store.getLocal('avatar'); }
  function getNotif(k) { var v = store.getLocal('notif-' + k); return v === null ? true : v === '1'; }

  function avatarInner() {
    var av = getAvatar();
    return av ? '<img src="' + esc(av) + '" class="prof-avatar-img" alt="Profile photo">'
              : '<span class="prof-avatar-init">' + esc(D.user.initials) + '</span>';
  }

  function prefRow(id, label, sub, checked) {
    return '<div class="pref-row">' +
      '<div class="pref-info"><b>' + esc(label) + '</b><span>' + esc(sub) + '</span></div>' +
      '<label class="sw" aria-label="' + esc(label) + '">' +
        '<input type="checkbox" class="sw-inp" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="sw-track" aria-hidden="true"><span class="sw-thumb"></span></span>' +
      '</label></div>';
  }

  var body =
    '<section class="sec" aria-labelledby="h-prof">' +
      '<div class="sec-head"><h2 id="h-prof">Profile</h2></div>' +
      '<div class="card prof-card">' +
        '<div class="prof-top">' +
          '<span class="prof-avatar" aria-hidden="true">' + avatarInner() + '</span>' +
          '<div class="prof-identity">' +
            '<b>' + esc(D.user.name) + '</b>' +
            '<span>' + esc(D.user.role + ' · ' + D.fleet.name) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="prof-av-row">' +
          '<label class="btn btn-secondary prof-av-btn">' + icon('camera') +
            'Change photo' +
            '<input type="file" accept="image/*" id="avatar-file" class="vis-hidden">' +
          '</label>' +
          '<button type="button" class="btn btn-ghost" id="avatar-clear"' + (!getAvatar() ? ' hidden' : '') + '>Remove photo</button>' +
        '</div>' +
        UI.kv([
          ['Email', esc(D.user.email)],
          ['Username', esc(D.user.username)],
          ['Permissions', esc(D.user.permissions)],
        ]) +
      '</div>' +
    '</section>' +
    '<section class="sec" aria-labelledby="h-notif">' +
      '<div class="sec-head"><h2 id="h-notif">Notifications</h2></div>' +
      '<div class="card pref-card">' +
        '<p class="pref-desc">Order lifecycle notifications — new orders, status updates, backorder alerts and delivery confirmations. Changes take effect immediately.</p>' +
        prefRow('notif-push', 'Push notifications', 'Alerts on this device for order and approval events', getNotif('push')) +
        '<div class="pref-div" aria-hidden="true"></div>' +
        prefRow('notif-email', 'Email notifications', 'Email digests to ' + esc(D.user.email), getNotif('email')) +
      '</div>' +
    '</section>';

  var s = SE.shell(el, {
    nav: null, title: 'Profile & notifications',
    sub: esc(D.user.name) + ' · ' + esc(D.user.role),
    crumbs: [['Home', 'home']],
    body: body,
  });

  var fileInput = el.querySelector('#avatar-file');
  var clearBtn  = el.querySelector('#avatar-clear');
  var avatarEl  = el.querySelector('.prof-avatar');

  function refreshAvatar() {
    var av = getAvatar();
    avatarEl.innerHTML = av
      ? '<img src="' + esc(av) + '" class="prof-avatar-img" alt="Profile photo">'
      : '<span class="prof-avatar-init">' + esc(D.user.initials) + '</span>';
    clearBtn.hidden = !av;
  }

  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function (e) { store.setLocal('avatar', e.target.result); refreshAvatar(); };
    reader.readAsDataURL(f);
  });

  clearBtn.addEventListener('click', function () {
    store.setLocal('avatar', null);
    refreshAvatar();
  });

  el.querySelectorAll('.sw-inp').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var key = inp.id === 'notif-push' ? 'push' : 'email';
      store.setLocal('notif-' + key, inp.checked ? '1' : '0');
    });
  });

  return s.cleanup;
};
