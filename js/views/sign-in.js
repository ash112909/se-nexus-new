/* Sign in (web-full, 2026-10-14 reference layout "Fleet desk access"). SmartEquip hosts the first step and
   finds the company from the work email; the company's own step (Mid-County Rental) takes the password.
   Page: SmartEquip wordmark and "Sign-in help" on top; a dark brand panel (dot field, headline, the yellow
   rule) beside the sign-in card from 1024 wide; under 1024 the card is alone. No carousel before Home.
   Steps, both pre-filled as Sarah, the only ARA persona (Pivot Guidelines: 1 pre-filled login):
     email      Work email, Next; "Use a company code instead" swaps the field for the company code (MCR)
     password   Mid-County Rental lockup, the email with Change, Password (show and hide), Continue, Forgot
                password. The right password signs in; anything else shows the Invalid state.
   An email or code with no company stays on the first step with its own message.
   State: #/sign-in   ?step=password   ?state=error|busy (password step)   ?state=unknown (no company)
          ?code=1 (company code)   ?focus=email|password */
SE.views['sign-in'] = function (el, p) {
  var D = SE.data, u = D.user, esc = SE.esc, icon = SE.icon, timer;
  var step = p.step === 'password' || p.state === 'error' || p.state === 'busy' || p.focus === 'password' ? 'password' : 'email';
  var byCode = !!p.code, email = u.email;
  var SPIN = '<svg class="spin" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2.4"/><path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/></svg>';

  el.innerHTML =
    '<div class="auth">' +
      '<header class="auth-top"><span class="auth-se">' + SE.seLogo('auto') + '</span>' +
        '<button type="button" class="btn btn-secondary auth-help" data-help>Sign-in help' + icon('external') + '</button></header>' +
      '<div class="auth-split">' +
        '<section class="auth-panel" aria-label="SmartEquip"><div class="auth-dots" aria-hidden="true"></div><div class="auth-copy">' +
          '<p class="auth-head">Uptime<br>is decided here.</p>' +
          '<p class="auth-lede">Parts, services, diagnostics and sourcing, all in one place for your team.</p>' +
          '<span class="auth-rule" aria-hidden="true"></span><p class="auth-note">Tenant-aware access · one secure workspace</p></div></section>' +
        '<main class="auth-card" id="auth-card"></main>' +
      '</div>' +
    '</div>';
  var card = el.querySelector('#auth-card');

  function emailStep(state) {
    card.innerHTML = '<div class="auth-in">' +
      '<p class="auth-k">Fleet desk access</p><h1 id="auth-title" tabindex="-1" data-focus>Sign in to SmartEquip</h1>' +
      '<p class="auth-sub">' + (byCode ? 'Enter the company code your fleet admin gave you. We will take you to your company’s own sign-in.' : 'Use your work email. We will take you to your company’s own sign-in.') + '</p>' +
      '<form class="auth-form" novalidate data-step="email">' +
        '<div class="field' + (state === 'unknown' ? ' invalid' : '') + '" id="f-id"><label for="ident">' + (byCode ? 'Company code' : 'Work email') + '</label>' +
          '<div class="control"><input id="ident" name="ident" ' + (byCode ? 'type="text" autocomplete="organization" placeholder="For example: MCR" value="MCR"' : 'type="email" autocomplete="username" spellcheck="false" placeholder="you@companyname.com" value="' + esc(email) + '"') + ' aria-describedby="id-error"' + (state === 'unknown' ? ' aria-invalid="true"' : '') + '>' + icon(byCode ? 'building' : 'envelope') + '</div>' +
          '<p class="field-error" id="id-error"' + (state === 'unknown' ? '' : ' hidden') + '>' + icon('exclamation') + '<span>' + (byCode ? 'No company uses that code. Check it with your fleet admin.' : 'No company signs in with that email domain. Check the address, or use a company code.') + '</span></p></div>' +
        '<button class="btn btn-brand auth-go" type="submit"><span>Next</span></button>' +
        '<button class="btn btn-link auth-alt" type="button" data-alt>' + (byCode ? 'Use your work email instead' : 'Use a company code instead') + '</button>' +
      '</form></div>';
  }
  function passwordStep() {
    card.innerHTML = '<div class="auth-in">' +
      '<div class="auth-org">' + SE.mcLogo('var(--mc-ink)', '#F4A800', D.fleet.name) + '</div>' +
      '<h1 id="auth-title" tabindex="-1" data-focus>Enter your password</h1>' +
      '<p class="auth-who">' + icon('user') + '<span>' + esc(byCode ? u.username + ' · ' + D.fleet.name : email) + '</span><button type="button" class="btn btn-link" data-change>Change</button></p>' +
      '<form class="auth-form" novalidate data-step="password">' +
        '<div class="field" id="f-pw"><label for="password">Password</label>' +
          '<div class="control"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" value="' + esc(D.password) + '" aria-describedby="pw-error">' +
            '<button class="reveal" type="button" aria-label="Show password" aria-pressed="false">' + icon('eye') + '</button></div>' +
          '<p class="field-error" id="pw-error" hidden>' + icon('exclamation') + '<span>Incorrect password. Try again.</span></p></div>' +
        '<button class="btn btn-brand auth-go" type="submit"><span>Continue</span></button>' +
        '<button class="btn btn-link auth-alt" type="button" data-forgot>Forgot password?</button>' +
      '</form>' +
      '<p class="auth-sec">' + icon('shield-check') + 'Signed in through ' + esc(D.fleet.name) + ' single sign-on</p></div>';
  }
  function render(state) {
    if (step === 'email') emailStep(state); else passwordStep();
    bind();
  }
  function busyBtn(b, label) { b.setAttribute('aria-busy', 'true'); b.innerHTML = SPIN + '<span>' + label + '</span>'; }
  function bind() {
    var form = card.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var go = form.querySelector('.auth-go');
      if (go.getAttribute('aria-busy') === 'true') return;
      if (form.dataset.step === 'email') {
        var v = card.querySelector('#ident').value.trim().toLowerCase();
        var ok = byCode ? /^(mcr|mid-?county)$/.test(v) : /@midcountyrental\.com$/.test(v) || v === u.username;
        busyBtn(go, 'Finding your company');
        timer = setTimeout(function () {
          if (!ok) { render('unknown'); var f = card.querySelector('#ident'); f.focus(); f.select(); return; }
          if (!byCode) email = v.indexOf('@') > 0 ? v : u.email;
          step = 'password'; render(); focusTitle();
        }, SE.reducedMotion ? 150 : 600);
        return;
      }
      var pw = card.querySelector('#password');
      setError(false); busyBtn(go, 'Signing in'); pw.readOnly = true;
      var good = pw.value === D.password;
      timer = setTimeout(function () {
        if (good) { SE.signIn(); SE.go('home', { replace: true }); return; }
        go.removeAttribute('aria-busy'); go.innerHTML = '<span>Continue</span>'; pw.readOnly = false;
        setError(true); pw.focus(); pw.select();
      }, good ? 900 : 700);
    });
    var pwIn = card.querySelector('#password');
    if (pwIn) pwIn.addEventListener('input', function () { setError(false); });
  }
  function setError(on) {
    var f = card.querySelector('#f-pw'); if (!f) return;
    f.classList.toggle('invalid', on);
    card.querySelector('#pw-error').hidden = !on;
    var pw = card.querySelector('#password');
    if (on) pw.setAttribute('aria-invalid', 'true'); else pw.removeAttribute('aria-invalid');
  }
  function focusTitle() { if (!SE.capture) { var h = card.querySelector('#auth-title'); if (h) h.focus({ preventScroll: true }); } }

  el.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-help')) { SE.toast('Sign-in help opens the SmartEquip help center in a new tab', 'external'); return; }
    if (t.hasAttribute('data-alt')) { byCode = !byCode; render(); var f = card.querySelector('#ident'); if (f && !SE.capture) f.focus(); return; }
    if (t.hasAttribute('data-change')) { step = 'email'; render(); var g = card.querySelector('#ident'); if (g && !SE.capture) g.focus(); return; }
    if (t.hasAttribute('data-forgot')) { SE.notBuilt('Password reset'); return; }
    if (t.classList.contains('reveal')) {
      var pw = card.querySelector('#password'), show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      t.setAttribute('aria-pressed', String(show));
      t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      t.innerHTML = icon(show ? 'eye-crossed' : 'eye');
    }
  });

  render(p.state === 'unknown' ? 'unknown' : null);
  if (p.state === 'error') setError(true);
  if (p.state === 'busy') { busyBtn(card.querySelector('.auth-go'), 'Signing in'); card.querySelector('#password').readOnly = true; }
  if (p.focus === 'email') card.querySelector('#ident').focus();
  if (p.focus === 'password') card.querySelector('#password').focus();
  return function () { clearTimeout(timer); };
};
