/* Boot (Figma "00a · Boot · checking", "00b · Boot · ready"): the wordmark on brand yellow and the
   Web/BootFoot pill. The spinner turns beside "Checking version"; near the end the pill narrows to
   a check and "Ready", then sign in. Click or press Enter to skip.
   State: #/boot?step=checking|ready&hold=1 (hold stops the timers, for review and capture) */
SE.views.boot = function (el, p) {
  var B = SE.data.bootStates, ready = p.step === 'ready', timers = [];
  var spinner = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle class="track" cx="9" cy="9" r="7.5" fill="none" stroke-width="2.4"/><path class="arc" d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke-width="2.4"/></svg>';
  function foot(isReady) { return isReady ? SE.icon('check') + '<span>' + B.ready + '</span>' : spinner + '<span>' + B.checking + '</span>'; }

  el.innerHTML =
    '<main class="boot" aria-label="Mid-County Rental is starting">' +
      '<h1 class="sr-only" tabindex="-1" data-focus>Mid-County Rental is starting</h1>' +
      '<div class="boot-mark">' + SE.mcLogo('#D9D9D9', '#F4A800') + '</div>' +
      '<div class="boot-foot' + (ready ? ' ready' : '') + '" role="status" aria-live="polite">' + foot(ready) + '</div>' +
      '<button class="boot-skip" type="button">Skip to sign in</button>' +
    '</main>';

  var pill = el.querySelector('.boot-foot');
  // the pill narrows from its checking width to its ready width, content cross-fades
  function becomeReady() {
    var from = pill.getBoundingClientRect().width;
    pill.classList.add('ready');
    pill.innerHTML = foot(true);
    var to = pill.getBoundingClientRect().width;
    SE.animate(pill, [{ width: from + 'px' }, { width: to + 'px' }], { duration: 360 });
    [].forEach.call(pill.children, function (c) { SE.animate(c, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120, fill: 'backwards' }); });
  }
  var left = false;
  function done() { if (left) return; left = true; SE.go('sign-in', { replace: true }); }
  el.querySelector('.boot-skip').addEventListener('click', done);
  el.querySelector('.boot').addEventListener('click', function (e) { if (e.target === e.currentTarget || e.target.closest('.boot-mark')) done(); });

  if (p.hold !== '1') {
    if (!ready) timers.push(setTimeout(becomeReady, 2300));
    timers.push(setTimeout(done, ready ? 900 : 3200));
  }
  return function () { timers.forEach(clearTimeout); };
};
