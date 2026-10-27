/* Radio groups with the keyboard behaviour their role promises (1016, review F12). Shared by the mobile and web
   builds (copied by _src/build.mjs into mobile/shared/ and web-full/js/), loaded in <head>.

   Every role="radiogroup" of role="radio" buttons, whenever it appears or changes:
     - 1 tab stop: the checked option, else the first available one (roving tabindex)
     - Arrow Left/Up and Right/Down move to the previous/next available option (wrapping), Home and End to the
       first and last; disabled options ([disabled], aria-disabled="true") are skipped
     - selection follows focus (the option is clicked, so each view's own handler runs), except in groups marked
       data-select="manual" (choosing closes a sheet or a menu, e.g. Location): there arrows move focus and Space or
       Enter chooses
   Native <input type="radio"> groups are left to the browser. Groups bound by theme.js (Appearance) handle their
   own keys. */
(function () {
  'use strict';
  var GROUP = '[role="radiogroup"]:not([data-theme-bound])';
  function radios(g) {
    return [].slice.call(g.querySelectorAll('[role="radio"]')).filter(function (r) { return r.closest('[role="radiogroup"]') === g && r.getClientRects().length; });
  }
  function off(r) { return r.disabled || r.getAttribute('aria-disabled') === 'true'; }
  function sync(g) {
    var list = radios(g);
    if (!list.length) return;
    var on = list.filter(function (r) { return r.getAttribute('aria-checked') === 'true' && !off(r); })[0] || list.filter(function (r) { return !off(r); })[0];
    var hasFocus = list.indexOf(document.activeElement);
    list.forEach(function (r) {
      // keep the focused option reachable while a manual group's choice has not been made yet
      var t = (hasFocus >= 0 ? r === document.activeElement : r === on) ? '0' : '-1';
      if (r.getAttribute('tabindex') !== t) r.setAttribute('tabindex', t);
    });
  }
  var queued = false;
  function scan() { queued = false; document.querySelectorAll(GROUP).forEach(sync); }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(scan); } }
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'disabled', 'aria-disabled', 'hidden'] });
  document.addEventListener('DOMContentLoaded', soon);

  document.addEventListener('keydown', function (e) {
    var r = e.target.closest && e.target.closest('[role="radio"]');
    if (!r || e.altKey || e.ctrlKey || e.metaKey) return;
    var g = r.closest('[role="radiogroup"]');
    if (!g || g.hasAttribute('data-theme-bound')) return;
    var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (step == null && e.key !== 'Home' && e.key !== 'End') return;
    var list = radios(g).filter(function (x) { return !off(x); });
    var i = list.indexOf(r);
    if (!list.length) return;
    e.preventDefault();
    var j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : ((i < 0 ? 0 : i) + step + list.length) % list.length;
    var next = list[j];
    list.forEach(function (x) { x.setAttribute('tabindex', x === next ? '0' : '-1'); });
    next.focus();
    if (g.getAttribute('data-select') !== 'manual' && next.getAttribute('aria-checked') !== 'true') next.click();
  }, true);
})();
