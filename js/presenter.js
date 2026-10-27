/* Presenter drawer and branch walkthroughs, shared by the mobile and web builds.
   - Press M to open the drawer from the right; press M again (or Escape) to close it.
     On a phone without a keyboard: triple-tap the top strip of the screen.
   - "Back to root": fresh demo data (cart, approvals, orders), still signed in, on Home.
   - Play: runs a branch walkthrough on the real screens. Each step shows a caption toast
     ("B2 · 3 of 9 · Open JLG"), rings the control it is about to use (blue focus ring), then uses it.
     Press M during a walkthrough to open the drawer and Stop it.
   Each build registers itself: PRESENTER.init({ build, go(route), root(), walkthroughs, scope() }).
   A walkthrough step is one of:
     { say, click: 'selector' }           ring and click the first visible match
     { say, type: ['selector', 'text'] }  type into a field, letter by letter (fires input events)
     { say, select: ['selector', 'option'] } choose an option in a select
     { say, enter: 'selector' }           submit the field's form, or press Enter on it
     { say, go: 'route?x=y' }             navigate directly (start points)
     { say, scroll: 'selector' }          scroll a block into view
     { say, run: function () {} }         set up demo data
     { say }                              caption only
   Any step may add view: 'route' (the screen it must land on) and wait (ms after the action).
   A step with `optional: true` is skipped when its control is not on screen.
   Results of the last run are kept on PRESENTER.log for the automated check (_src/test.mjs).
   1019: PRESENTER.hook(step, walkthrough), when a script sets it, is called after each step has settled (its wait
   and its view) and before the next one starts; a returned promise holds the walkthrough until it resolves.
   _src/value-diagrams.mjs uses it to frame every step. Unset, nothing changes.
   1020: before the ring shows, the caption moves to the top and the pill fades out when either would cover the control;
   after a click or submit the caption returns to the bottom, off the screen it opens. */
(function () {
  'use strict';
  var P = window.PRESENTER = { log: [], playing: null };
  var cfg = null, drawer = null, caption = null, ring = null, pill = null, stopFlag = false;

  var CSS = [
    '.pz-drawer{position:fixed;z-index:2000;top:0;right:0;bottom:0;width:min(360px,92vw);display:flex;flex-direction:column;background:#FFF;color:#242424;box-shadow:-16px 0 48px rgba(0,0,0,.28);transform:translateX(calc(100% + 80px));visibility:hidden;transition:transform .38s cubic-bezier(.32,.72,0,1),visibility 0s .38s;font:400 15px/21px -apple-system,system-ui,Inter,sans-serif;-webkit-font-smoothing:antialiased}',
    '.pz-drawer.open{transform:none;visibility:visible;transition:transform .38s cubic-bezier(.32,.72,0,1)}',
    '.pz-scrim{position:fixed;z-index:1999;inset:0;background:rgba(0,0,0,.32);opacity:0;pointer-events:none;transition:opacity .3s}',
    '.pz-scrim.open{opacity:1;pointer-events:auto}',
    '.pz-head{flex:none;padding:calc(env(safe-area-inset-top,0px) + 20px) 20px 18px;background:#000;color:#FFF}',
    '.pz-head small{display:block;font-size:12px;font-weight:700;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:#F4A800}',
    '.pz-head h2{margin:4px 0 0;font-size:20px;line-height:26px;letter-spacing:-.3px}',
    '.pz-head p{margin:4px 0 0;font-size:13px;line-height:18px;color:#C9CBD2}',
    '.pz-head kbd{display:inline-block;min-width:22px;padding:0 6px;border:1px solid #5F5F5F;border-radius:6px;font:600 12px/20px inherit;text-align:center;color:#FFF}',
    '.pz-body{flex:1;overflow-y:auto;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px)}',
    '.pz-root{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:0 16px;border:0;border-radius:12px;background:#F4A800;color:#000;font:600 16px/20px inherit;text-align:left;cursor:pointer}',
    '.pz-root:hover{background:#DA9500}',
    '.pz-root svg,.pz-play svg{width:20px;height:20px;flex:none}',
    '.pz-root span{flex:1}',
    '.pz-root em{font-style:normal;font-size:12px;font-weight:500;color:#3D2A00}',
    '.pz-label{margin:20px 4px 8px;font-size:12px;font-weight:700;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:#5F5F5F}',
    '.pz-list{list-style:none;margin:0;padding:0;border:1px solid #E6E6E6;border-radius:14px;overflow:hidden}',
    '.pz-item{display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 8px 8px 14px}',
    '.pz-item+.pz-item{border-top:1px solid #E6E6E6}',
    '.pz-id{display:inline-grid;place-items:center;min-width:32px;height:24px;padding:0 6px;border-radius:12px;background:#EFEFF1;font-size:12px;font-weight:700}',
    '.pz-item b{display:block;font-size:15px;line-height:20px;font-weight:600}',
    '.pz-item small{display:block;font-size:12px;line-height:16px;color:#5F5F5F}',
    '.pz-item .pz-t{flex:1;min-width:0}',
    '.pz-play{display:grid;place-items:center;width:44px;height:44px;flex:none;border:0;border-radius:22px;background:#18181B;color:#F4A800;cursor:pointer}',
    '.pz-play:hover{background:#000}',
    '.pz-play[aria-pressed="true"]{background:#B20015;color:#FFF}',
    '.pz-item.on{background:#FFF0DD}',
    '.pz-foot{margin:16px 4px 0;font-size:12px;line-height:17px;color:#5F5F5F}',
    '.pz-drawer :focus-visible{outline:3px solid #004F8A;outline-offset:2px}',
    '.pz-cap{position:fixed;z-index:1990;left:24px;bottom:24px;display:flex;align-items:flex-start;gap:12px;width:min(380px,calc(100vw - 32px));padding:14px 16px;border-radius:14px;background:#FFF;color:#242424;box-shadow:0 16px 40px rgba(0,0,0,.28);border:1px solid #E6E6E6;font:400 14px/20px -apple-system,system-ui,Inter,sans-serif;opacity:0;transform:translateY(12px);transition:opacity .2s,transform .3s cubic-bezier(.32,.72,0,1);pointer-events:none}',
    '.pz-cap.show{opacity:1;transform:none}',
    '.pz-cap .pz-n{flex:none;display:grid;place-items:center;min-width:44px;height:28px;padding:0 8px;border-radius:14px;background:#F4A800;color:#000;font-size:12px;font-weight:700}',
    '.pz-cap small{display:block;font-size:12px;line-height:16px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#5F5F5F}',
    '.pz-cap b{display:block;margin-top:2px;font-size:15px;line-height:20px;font-weight:600}',
    '.pz-cap.done .pz-n{background:#00836B;color:#FFF}',
    '.pz-cap.err .pz-n{background:#B20015;color:#FFF}',
    'body.device .pz-cap{left:12px;right:12px;width:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 20px)}',
    '.pz-ring{position:fixed;z-index:1995;border:3px solid #004F8A;border-radius:12px;box-shadow:0 0 0 4px rgba(0,79,138,.22);pointer-events:none;opacity:0;transition:opacity .15s}',
    '.pz-ring.show{opacity:1}',
    '.pz-pill{position:fixed;z-index:1990;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;min-height:44px;padding:0 8px 0 16px;border-radius:22px;background:#18181B;color:#FFF;font:600 13px/18px -apple-system,system-ui,Inter,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.3)}',
    '.pz-pill button{min-width:64px;height:32px;padding:0 12px;border:0;border-radius:16px;background:#B20015;color:#FFF;font:600 13px/18px inherit;cursor:pointer}',
    '.pz-pill[hidden],.pz-cap[hidden]{display:none}',
    'body.device .pz-pill{top:calc(env(safe-area-inset-top,0px) + 8px);bottom:auto;right:12px}',
    // 1020: the caption and the pill step aside when they would cover the control a step uses
    '.pz-cap.pz-up{top:24px;bottom:auto}',
    'body.device .pz-cap.pz-up{top:calc(env(safe-area-inset-top,0px) + 60px);bottom:auto}',
    '.pz-pill.pz-away{opacity:0;pointer-events:none}',
    '@media (prefers-reduced-motion:reduce){.pz-drawer,.pz-cap,.pz-scrim{transition:none}}',
  ].join('\n');
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, P.fast ? Math.min(ms, 250) : ms); }); };

  // ---------- drawer
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var scrim = document.createElement('div'); scrim.className = 'pz-scrim'; document.body.appendChild(scrim);
    drawer = document.createElement('aside');
    drawer.className = 'pz-drawer';
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-labelledby', 'pz-t');
    drawer.inert = true;
    drawer.innerHTML =
      '<header class="pz-head"><small>Presenter · ' + (cfg.build === 'mobile' ? 'iPhone build' : 'Web build') + '</small><h2 id="pz-t">Walkthroughs</h2>' +
        '<p>Press <kbd>M</kbd> to open or close. Each walkthrough plays on the real screens with a caption at every step.</p></header>' +
      '<div class="pz-body">' +
        '<button type="button" class="pz-root" data-pz-root>' + ICON.home + '<span>Back to root</span><em>Home, fresh data</em></button>' +
        '<p class="pz-label">Play a branch</p>' +
        '<ul class="pz-list">' + cfg.walkthroughs.map(function (w) {
          return '<li class="pz-item" data-pz-item="' + w.id + '"><span class="pz-id">' + w.id + '</span><span class="pz-t"><b>' + esc(w.name) + '</b><small>' + w.steps.length + ' steps · ' + esc(w.sub || '') + '</small></span>' +
            '<button type="button" class="pz-play" data-pz-play="' + w.id + '" aria-pressed="false" aria-label="Play ' + esc(w.name) + '">' + ICON.play + '</button></li>';
        }).join('') + '</ul>' +
        '<p class="pz-foot">Each walkthrough starts from root: Home, with the data reset.</p>' +
      '</div>';
    document.body.appendChild(drawer);
    caption = document.createElement('div'); caption.className = 'pz-cap'; caption.setAttribute('role', 'status'); caption.setAttribute('aria-live', 'polite'); caption.hidden = true;
    document.body.appendChild(caption);
    ring = document.createElement('div'); ring.className = 'pz-ring'; document.body.appendChild(ring);
    pill = document.createElement('div'); pill.className = 'pz-pill'; pill.hidden = true;
    pill.innerHTML = '<span data-pz-pill></span><button type="button" data-pz-stop>Stop</button>';
    document.body.appendChild(pill);

    scrim.addEventListener('click', function () { P.close(); });
    drawer.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-pz-root')) { stop(); P.close(); cfg.root(); toast('Root', 'Back on Home, data reset', 'done'); return; }
      if (t.dataset.pzPlay) { if (P.playing === t.dataset.pzPlay) { stop(); syncButtons(); } else play(t.dataset.pzPlay); }
    });
    pill.addEventListener('click', function (e) { if (e.target.closest('[data-pz-stop]')) stop(); });
    P._scrim = scrim;
  }
  var lastFocus = null;
  P.open = function () {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.inert = false; drawer.classList.add('open'); P._scrim.classList.add('open');
    syncButtons();
    var f = drawer.querySelector(P.playing ? '[aria-pressed="true"]' : '[data-pz-root]');
    if (f) f.focus({ preventScroll: true });
  };
  P.close = function () {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); P._scrim.classList.remove('open'); drawer.inert = true;
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  P.toggle = function () { if (drawer && drawer.classList.contains('open')) P.close(); else P.open(); };
  function syncButtons() {
    drawer.querySelectorAll('[data-pz-play]').forEach(function (b) {
      var on = b.dataset.pzPlay === P.playing;
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = on ? ICON.stop : ICON.play;
      b.setAttribute('aria-label', (on ? 'Stop ' : 'Play ') + b.closest('.pz-item').querySelector('b').textContent);
      b.closest('.pz-item').classList.toggle('on', on);
    });
  }

  // ---------- caption toast and target ring
  var capTimer;
  function toast(n, text, kind, label) {
    clearTimeout(capTimer);
    caption.hidden = false;
    caption.className = 'pz-cap' + (kind ? ' ' + kind : '');
    caption.innerHTML = '<span class="pz-n">' + esc(n) + '</span><span>' + (label ? '<small>' + esc(label) + '</small>' : '') + '<b>' + esc(text) + '</b></span>';
    void caption.offsetWidth; caption.classList.add('show');
    if (kind === 'done' || kind === 'err') capTimer = setTimeout(function () { caption.classList.remove('show'); }, 3600);
  }
  P.toast = toast;
  function showRing(el) {
    var r = el.getBoundingClientRect();
    ring.style.left = (r.left - 5) + 'px'; ring.style.top = (r.top - 5) + 'px';
    ring.style.width = (r.width + 10) + 'px'; ring.style.height = (r.height + 10) + 'px';
    ring.classList.add('show');
  }
  function hideRing() { ring.classList.remove('show'); }
  // keep the caption and the pill off the control: the caption moves to the top, the pill fades out
  function cover(a, b) { return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }
  function avoid(el) {
    var r = el.getBoundingClientRect();
    caption.classList.remove('pz-up');
    if (!caption.hidden && cover(r, caption.getBoundingClientRect())) {
      caption.classList.add('pz-up');
      if (cover(r, caption.getBoundingClientRect())) caption.classList.remove('pz-up');
    }
    pill.classList.toggle('pz-away', !pill.hidden && cover(r, pill.getBoundingClientRect()));
  }

  // ---------- finding controls on the current screen (the outgoing page is inert while it animates away)
  function visible(el) {
    if (!el || el.closest('[inert]')) return false;
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }
  function find(sel) {
    var all = [].slice.call(document.querySelectorAll(sel)).filter(function (el) { return !el.closest('.pz-drawer,.pz-pill') && visible(el); });
    return all[0] || null;
  }
  function waitFor(sel, ms) {
    var t0 = Date.now();
    return new Promise(function (res) {
      (function poll() {
        var el = find(sel);
        if (el) return res(el);
        if (Date.now() - t0 > ms || stopFlag) return res(null);
        setTimeout(poll, 120);
      })();
    });
  }
  function reveal(el) {
    try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: P.fast ? 'auto' : 'smooth' }); } catch (e) { el.scrollIntoView(); }
  }
  // 1020: a smooth scroll can outlast a fixed pause; ring the control only once it has stopped moving
  function settle(el) {
    var t0 = Date.now(), last = null, still = 0;
    return new Promise(function (res) {
      (function poll() {
        var r = el.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top);
        still = k === last ? still + 1 : 0; last = k;
        if ((still >= 2 && Date.now() - t0 >= (P.fast ? 0 : 280)) || Date.now() - t0 > 1500) return res();
        setTimeout(poll, 60);
      })();
    });
  }
  function setValue(input, v) {
    var proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ---------- player
  function stop() {
    if (!P.playing) return;
    stopFlag = true;
    P.playing = null;
    pill.hidden = true; hideRing();
    toast('Stop', 'Walkthrough stopped', 'err');
    if (drawer) syncButtons();
  }
  P.stop = stop;
  function play(id) {
    var w = cfg.walkthroughs.find(function (x) { return x.id === id; });
    if (!w) return;
    if (P.playing) { stopFlag = true; }
    P.close();
    var token = {};
    P._token = token;
    setTimeout(function () { run(w, token); }, P.fast ? 0 : 380);
  }
  P.play = play;
  function run(w, token) {
    stopFlag = false;
    P.playing = w.id;
    P.log = [];
    syncButtons();
    pill.hidden = false; pill.classList.remove('pz-away');
    pill.querySelector('[data-pz-pill]').textContent = 'Playing ' + w.id + ' · ' + w.name;
    cfg.root();
    var i = 0, n = w.steps.length, hooked = 0;
    function next() {
      if (stopFlag || P._token !== token) return;
      if (P.hook && i > 0 && hooked !== i) { hooked = i; return Promise.resolve(P.hook(i, w)).then(next, next); }
      if (i >= n) {
        P.playing = null; pill.hidden = true; hideRing(); syncButtons();
        toast('Done', w.name + ': walkthrough complete', 'done', w.id);
        P.log.push({ step: 'done' });
        return;
      }
      var s = w.steps[i++];
      toast(i + ' of ' + n, s.say, '', w.id + ' · ' + w.name);
      sleep(s.read != null ? s.read : 650).then(function () { return act(s); }).then(function (ok) {
        P.log.push({ step: i, say: s.say, ok: ok });
        if (!ok) {
          if (s.optional) return sleep(200).then(next);
          P.playing = null; pill.hidden = true; hideRing(); syncButtons();
          toast(i + ' of ' + n, 'This step is not on screen. Walkthrough stopped.', 'err', w.id);
          return;
        }
        return sleep(s.wait != null ? s.wait : 1500).then(function () {
          // a step can name the screen it must land on (polled until the transition settles)
          return new Promise(function (res) {
            var t0 = Date.now();
            (function poll() { var v = document.getElementById('app').dataset.view; if (!s.view || v === s.view || Date.now() - t0 > 3000) res(v); else setTimeout(poll, 100); })();
          });
        }).then(function (v) {
          if (s.view && v !== s.view) { P.log[P.log.length - 1].ok = false; P.log[P.log.length - 1].got = v; P.playing = null; pill.hidden = true; syncButtons(); toast(i + ' of ' + n, 'Expected ' + s.view + ', got ' + v, 'err', w.id); return; }
          next();
        });
      });
    }
    sleep(700).then(next);
  }
  function act(s) {
    if (s.run) { try { s.run(); return Promise.resolve(true); } catch (e) { console.warn(e); return Promise.resolve(false); } }
    if (s.go) { cfg.go(s.go); return Promise.resolve(true); }
    var sel = s.click || s.scroll || s.enter || (s.type && s.type[0]) || (s.select && s.select[0]);
    if (!sel) return Promise.resolve(true);
    return waitFor(sel, s.optional ? 1200 : 4000).then(function (el) {
      if (!el) return false;
      reveal(el);
      return settle(el).then(function () {
        avoid(el);
        showRing(el);
        return sleep(s.scroll ? 700 : 520);
      }).then(function () {
        hideRing();
        if (s.click || s.enter) caption.classList.remove('pz-up'); // back at the bottom once a tap or submit opens the next screen
        if (s.click) { if (typeof el.click === 'function') el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
        if (s.scroll) return true;
        if (s.select) {
          var opts = [].slice.call(el.options).filter(function (o) { return o.value !== ''; });
          var opt = opts.find(function (o) { return o.value === s.select[1] || o.text.indexOf(s.select[1]) === 0; }) || opts[0];
          el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        if (s.enter) {
          var f = el.form;
          if (f && f.requestSubmit) f.requestSubmit();
          else ['keydown', 'keyup'].forEach(function (t) { el.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); });
          return true;
        }
        // type, letter by letter
        el.focus({ preventScroll: true });
        setValue(el, '');
        var text = s.type[1], k = 0;
        return new Promise(function (res) {
          (function key() {
            if (stopFlag) return res(false);
            if (k >= text.length) return res(true);
            setValue(el, text.slice(0, ++k));
            setTimeout(key, P.fast ? 0 : 90);
          })();
        });
      });
    });
  }

  // ---------- init and keys
  P.init = function (o) {
    cfg = o;
    P.walkthroughs = o.walkthroughs; // read by _src/flow-screens.mjs to storyboard each flow
    P.fast = /[?&]fast=1/.test(location.search);
    function boot() {
      build();
      if (o.phone) document.body.classList.add('pz-phone');
      document.addEventListener('keydown', function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var a = document.activeElement, typing = a && (/input|textarea|select/i.test(a.tagName) || a.isContentEditable);
        if (typing && !drawer.contains(a)) return;
        if (e.key === 'm' || e.key === 'M') { e.preventDefault(); P.toggle(); }
        else if (e.key === 'Escape' && drawer.classList.contains('open')) { e.stopPropagation(); P.close(); }
      }, true);
      // phones have no M key: triple-tap the top strip of the screen
      var taps = [];
      document.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0];
        if (!t || t.clientY > 56) return;
        var now = Date.now();
        taps = taps.filter(function (x) { return now - x < 700; }).concat(now);
        if (taps.length >= 3) { taps = []; P.toggle(); }
      }, { passive: true });
    }
    if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
  };
})();
