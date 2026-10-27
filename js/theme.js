/* ARA appearance controller, shared by the mobile and web builds (copied by _src/build.mjs into mobile/shared/ and
   web-full/js/). A classic script loaded in <head>, right after theme.css, so the theme is on <html> before the
   first paint: no flash of the wrong theme.

   window.ARATheme
     pref()            'system' | 'light' | 'dark'   what the person chose
     resolved()        'light' | 'dark'              what is on screen (data-theme on <html>)
     set(pref)         choose; saved per build folder, applied at once (cross-fade where the browser can)
     onChange(fn)      fn(resolved, pref) after every change: a choice here, in another tab, or the OS (System)
     bind(group)       wires a role="radiogroup" of role="radio" buttons carrying data-theme-pref: click, arrow
                       keys (roving tabindex) and aria-checked kept in step with the current choice

   Which theme wins, first match:
     1 ?theme=light|dark|system in the URL (review and capture links). Not saved; choosing in the app drops it.
     2 ?capture=1 without ?theme: the folder default, so the gate's screenshots never pick up a saved choice.
     3 the saved choice for this folder (localStorage). Keyed by the folder path: file:// pages share 1
       localStorage, and the 4 instances must not change each other.
     4 the folder default: data-theme stamped on <html> by _src/themes.mjs (themes/*-light, themes/*-dark),
       else System.
   The choice is a device setting, like iOS Appearance: sign out and the presenter's reset keep it. */
(function () {
  'use strict';
  var root = document.documentElement;
  var PREFS = ['system', 'light', 'dark'];
  var url = new URLSearchParams(location.search);
  var stamped = root.getAttribute('data-theme');
  var fallback = PREFS.indexOf(stamped) > 0 ? stamped : 'system';
  var KEY = 'ara-theme:' + location.pathname.replace(/[^/]*$/, '');
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var listeners = [];
  var memory = null; // when storage is blocked (private mode), the choice lasts for the page

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return memory; } }
  function write(v) { memory = v; try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: memory only */ } }
  function valid(v) { return PREFS.indexOf(v) >= 0 ? v : null; }

  var urlPref = valid(url.get('theme'));
  var pref = urlPref || (url.has('capture') ? fallback : valid(read()) || fallback);

  function resolve(p) { return p === 'system' ? (mq && mq.matches ? 'dark' : 'light') : p; }
  function apply(animate) {
    var next = resolve(pref), was = root.getAttribute('data-theme');
    root.setAttribute('data-theme-pref', pref);
    if (next === was) { notify(); return; }
    var swap = function () {
      // components animate background-color; switching themes must not ripple through them one by one
      root.classList.add('theme-switching');
      root.setAttribute('data-theme', next);
      void root.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('theme-switching'); }); });
    };
    var still = url.has('capture') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (animate && !still && document.startViewTransition) document.startViewTransition(swap);
    else swap();
    notify();
  }
  function notify() { var r = resolve(pref); listeners.forEach(function (fn) { try { fn(r, pref); } catch (e) { setTimeout(function () { throw e; }); } }); }

  var api = window.ARATheme = {
    prefs: PREFS.slice(),
    labels: { system: 'System', light: 'Light', dark: 'Dark' },
    pref: function () { return pref; },
    resolved: function () { return resolve(pref); },
    set: function (p) {
      p = valid(p); if (!p) return;
      write(p);
      // a ?theme in the address would win again on reload: the choice made here replaces it
      urlPref = null;
      if (url.has('theme')) { url.delete('theme'); var s = url.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash); }
      if (p === pref) return;
      pref = p;
      apply(true);
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    bind: function (group) {
      if (!group || group.dataset.themeBound) return;
      group.dataset.themeBound = '1';
      var radios = function () { return [].slice.call(group.querySelectorAll('[role="radio"][data-theme-pref]')); };
      var off = null;
      var sync = function () {
        // the group lives in a popover or sheet that is rebuilt: stop listening once it has left the page
        if (!group.isConnected) { if (off) off(); return; }
        radios().forEach(function (b) { var on = b.dataset.themePref === pref; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
        group.dispatchEvent(new CustomEvent('themechange', { bubbles: true }));
      };
      group.addEventListener('click', function (e) {
        var b = e.target.closest('[role="radio"][data-theme-pref]');
        if (b) api.set(b.dataset.themePref);
      });
      group.addEventListener('keydown', function (e) {
        var keys = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
        if (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
        var list = radios(), i = list.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        var j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + keys[e.key] + list.length) % list.length;
        list[j].focus();
        api.set(list[j].dataset.themePref);
      });
      off = api.onChange(sync);
      sync();
    },
  };

  // System follows the OS while the page is open
  if (mq) {
    var onOs = function () { if (pref === 'system') apply(true); };
    if (mq.addEventListener) mq.addEventListener('change', onOs); else if (mq.addListener) mq.addListener(onOs);
  }
  // a choice made in another tab of the same folder
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || urlPref || url.has('capture')) return;
    var p = valid(e.newValue) || fallback;
    if (p !== pref) { pref = p; apply(true); }
  });

  apply(false);
})();
