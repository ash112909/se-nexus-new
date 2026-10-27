/* web-full: the web twins of the phone's system moments, shared by every page.
     SE.ui.permission(o)   the browser's permission bubble (top left, under the address bar): "This site wants
                           to <ask>", Block and Allow. The page cannot draw the real one, so this stands in for
                           it in the prototype; it is asked once and the answer is kept for the tab.
     SE.voice.start(o)     voice search (DES-45 use case 7 state 2; the phone's dictation): the microphone is asked
                           for once (bubble), then a dialog listens, shows the words as they are heard, and Done
                           searches for them as a described part. o.phase 1 (listening, nothing heard) or 2 (heard);
                           o.ask true shows the bubble first. Blocked: a toast says how to turn it on.
     SE.push               desktop notifications after the first sign in (DES-42, the phone's push permission):
                           SE.push.card() on Home, then the browser bubble. Asked once (SE.state.pushAsked).
     SE.confirmSignOut()   the sign-out confirmation (the phone's sign-out alert). */
(function () {
  'use strict';
  var esc = SE.esc, icon = SE.icon;

  SE.ui.permission = function (o) {
    var host = document.createElement('div');
    host.className = 'perm';
    host.setAttribute('role', 'alertdialog');
    host.setAttribute('aria-modal', 'false');
    host.setAttribute('aria-labelledby', 'perm-t');
    host.innerHTML = '<p class="perm-site">' + icon('lock') + '<span>Mid-County Rental fleet portal</span></p>' +
      '<p class="perm-t" id="perm-t">This site wants to</p><p class="perm-ask">' + icon(o.icon) + '<span>' + esc(o.ask) + '</span></p>' +
      '<div class="perm-btns"><button type="button" class="btn btn-secondary" data-perm="no">Block</button><button type="button" class="btn btn-primary" data-perm="ok">Allow</button></div>';
    document.body.appendChild(host);
    SE.animate(host, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 160 });
    if (!SE.capture) host.querySelector('[data-perm="ok"]').focus();
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-perm]');
      if (!b) return;
      host.remove();
      (b.dataset.perm === 'ok' ? o.onAllow : o.onBlock)();
    });
    return host;
  };

  // ---------------------------------------------------------------- voice search
  var SAID = 'seal kit for the lift cylinder on FL-094';
  SE.voice = {
    said: SAID,
    start: function (o) {
      o = o || {};
      var phase = o.phase;
      if (SE.state.micAsked && !SE.state.micAllowed) { SE.ui.dialog({ title: 'Microphone is blocked', body: '<p>Allow the microphone to search by voice, or keep typing your search.</p>', foot: '<button class="btn btn-secondary" type="button" data-dlg-close>Keep typing</button><button class="btn btn-primary" type="button" data-voice-retry>Allow microphone</button>' }).el.querySelector('[data-voice-retry]').addEventListener('click', function (e) { var close = e.target.closest(".dlg-host"); SE.state.micAsked = false; SE.state.micAllowed = false; SE.save(); var cancel = close && close.querySelector('[data-dlg-close]'); if (cancel) cancel.click(); SE.voice.start(); }); return; }
      if (o.ask) { SE.state.micAsked = false; SE.state.micAllowed = false; }
      if (!SE.state.micAsked && phase !== 1 && phase !== 2) {
        SE.ui.permission({ icon: 'microphone', ask: 'Use your microphone', onAllow: function () { SE.state.micAsked = true; SE.state.micAllowed = true; SE.save(); SE.voice.start(); },
          onBlock: function () { SE.state.micAsked = true; SE.state.micAllowed = false; SE.save(); SE.toast('Voice search is off. Choose the microphone again to allow it', 'microphone'); } });
        return;
      }
      if (SE.state.micAsked && !SE.state.micAllowed && phase == null) { SE.toast('Voice search is off. Choose the microphone again to allow it', 'microphone'); return; }
      SE.state.micAsked = true; SE.state.micAllowed = true; SE.save();
      var said = phase === 2 ? SAID : '', timer = null;
      var d = SE.ui.dialog({
        title: said ? 'Heard' : 'Listening',
        body: '<div class="vd"><p class="vd-sub">Say a part, a serial or a work order</p><div class="vd-wave" aria-hidden="true">' + new Array(19).join('<span></span>') + '</div>' +
          '<p class="vd-said' + (said ? '' : ' empty') + '" aria-live="polite">' + (said ? esc(said) : 'Listening…') + '</p><p class="vd-hint">Done searches for what you said</p></div>',
        foot: '<button class="btn btn-secondary" type="button" data-dlg-close>Cancel</button><button class="btn btn-primary" type="button" data-vd-go' + (said ? '' : ' disabled') + '>Done</button>',
        onClose: function () { clearTimeout(timer); },
      });
      var out = d.el.querySelector('.vd-said'), go = d.el.querySelector('[data-vd-go]');
      if (said) out.dataset.said = said;
      go.addEventListener('click', function () {
        if (!out.dataset.said) return;
        var w = out.dataset.said; d.close();
        SE.addRecent('parts', w); SE.countAttempt('parts');
        SE.go('search', { params: { q: w } });
      });
      if (said || SE.capture) return;
      var words = SAID.split(' '), k = 0;
      (function next() {
        timer = setTimeout(function () {
          k++;
          var t = words.slice(0, k).join(' ');
          out.textContent = t; out.classList.remove('empty'); out.dataset.said = t;
          if (k < words.length) next(); else { go.disabled = false; d.el.querySelector('#dlg-t').textContent = 'Heard'; if (!SE.capture) go.focus(); }
        }, SE.reducedMotion ? 30 : (k ? 260 : 900));
      })();
    },
  };

  // ---------------------------------------------------------------- desktop notifications (first sign in)
  SE.push = {
    due: function () { return !SE.state.pushAsked; },
    card: function () {
      return '<section class="card push-card" aria-labelledby="push-t" data-push-card><span class="push-ico">' + icon('bell') + '</span>' +
        '<div><h2 id="push-t">Get notified on this computer</h2><p>Approvals waiting for you, deliveries and backorders, even when this tab is in the background. You can change it any time in your browser.</p></div>' +
        '<div class="push-btns"><button type="button" class="btn btn-secondary" data-push-later>Not now</button><button type="button" class="btn btn-primary" data-push-on>' + icon('bell') + 'Turn on</button></div></section>';
    },
    // wires the card inside root; done() runs after it is answered
    bind: function (root, done) {
      function finish(msg, ic) {
        SE.state.pushAsked = true; SE.save();
        var c = root.querySelector('[data-push-card]'); if (c) c.remove();
        if (msg) SE.toast(msg, ic);
        if (done) done();
      }
      root.addEventListener('click', function (e) {
        if (e.target.closest('[data-push-later]')) { finish(); return; }
        if (e.target.closest('[data-push-on]')) SE.push.ask(finish);
      });
    },
    ask: function (finish) {
      SE.ui.permission({ icon: 'bell', ask: 'Show notifications', onAllow: function () { finish('Notifications are on for this computer', 'bell'); }, onBlock: function () { finish('Notifications stay off. You can turn them on from the address bar', 'bell'); } });
    },
  };

  // ---------------------------------------------------------------- sign out
  SE.confirmSignOut = function () {
    var d = SE.ui.dialog({
      title: 'Sign out of Mid-County Rental?',
      body: '<p class="dlg-p">You are signed out on this computer. Your orders and work orders stay in your account.</p>',
      foot: '<button class="btn btn-secondary" type="button" data-dlg-close>Cancel</button><button class="btn btn-danger-solid" type="button" data-signout-ok>' + icon('sign-out-alt') + 'Sign out</button>',
    });
    d.el.querySelector('[data-signout-ok]').addEventListener('click', function () { d.close(); SE.signOut(); SE.go('sign-in', { replace: true }); });
    return d;
  };
})();
