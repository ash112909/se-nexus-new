/* Scan an asset tag (B9; legacy mobile 76 QR / serial scanner; DES-28 serial lookup), web. On a desk the tag
   is read 2 ways, side by side:
     Camera       a viewfinder for the laptop or tablet camera ("Hold the tag's QR code or barcode up to the
                  camera"). The camera is simulated: after a moment the tag of FL-094 is read, the frame turns
                  green and a card names the unit, with Open asset. No camera image is invented: a dark field.
     Scanner      a USB or Bluetooth barcode scanner types the tag into a field and presses Enter; typing the
                  serial by hand works the same way.
   A tag that is not in the fleet says so, with Scan again.
   State: #/scan (aiming; reads the tag after 1.8 s)   #/scan?state=found   #/scan?state=unknown */
// Parked on web since 2026-10-14 (client request): no rail row or link leads here, and the web captures list
// its 3 states as parked. Kept so the scanner can come back to web; #/scan still opens it.
SE.titles.scan = 'Scan asset tag';
SE.views.scan = function (el, p) {
  var esc = SE.esc, icon = SE.icon, UI = SE.ui;
  var state = p.state === 'found' || p.state === 'unknown' ? p.state : 'aim';
  var a = SE.asset('FL-094'), timer = null, tag = state === 'unknown' ? 'JL1930-09981' : a.serial;
  function card() {
    if (state === 'found') return '<div class="sc-card card" role="status">' + UI.thumb() + '<span class="sc-main"><b>' + esc(a.equip) + ' · ' + esc(a.machine) + '</b><small>' + esc(a.serial) + ' · ' + esc(a.location) + '</small></span>' + SE.chip(a.status) +
      '<a class="btn btn-brand" href="#/asset?id=' + a.equip + '">Open asset</a></div>';
    if (state === 'unknown') return '<div class="sc-card card" role="status"><span class="sc-main"><b>This tag is not in your fleet</b><small>Tag ' + esc(tag) + ' · not registered to ' + esc(SE.data.fleet.name) + '</small></span>' +
      '<button class="btn btn-secondary" type="button" data-rescan>Scan again</button></div>';
    return '';
  }
  function render() {
    el.querySelector('#sc-cam').className = 'sc-cam card sc-' + state;
    el.querySelector('#sc-hint').textContent = state === 'aim' ? 'Hold the tag’s QR code or barcode up to the camera' : state === 'found' ? 'Tag read: ' + tag : 'Tag read, no match: ' + tag;
    el.querySelector('#sc-line').hidden = state !== 'aim';
    el.querySelector('#sc-result').innerHTML = card();
  }
  var s = SE.shell(el, {
    nav: 'scan', title: 'Scan asset tag', crumbs: [['Home', 'home'], ['Fleet', 'fleet']],
    sub: 'Read a unit’s tag with the camera or a barcode scanner to open its record.',
    body: '<div class="sc-grid">' +
      '<section class="sc-cam card" id="sc-cam" aria-label="Camera"><div class="sc-field" aria-hidden="true"><div class="sc-frame"><i></i><i></i><i></i><i></i><span class="sc-ln" id="sc-line"></span></div></div>' +
        '<p class="sc-hint" id="sc-hint" aria-live="polite"></p></section>' +
      '<div class="sc-side">' +
        '<section class="card sc-type"><h2 class="od-h">Scanner or keyboard</h2><p class="muted">A USB or Bluetooth barcode scanner types the tag here. You can also type the serial.</p>' +
          '<form class="sc-form" data-sc-form><label class="sr-only" for="sc-q">Asset tag or serial</label><div class="mw-find">' + icon('barcode-read') + '<input id="sc-q" type="text" placeholder="Scan or type a tag, for example SJ3219-00847" autocomplete="off"></div><button class="btn btn-primary" type="submit">Look up</button></form></section>' +
        '<div id="sc-result"></div>' +
      '</div></div>',
  });
  function aim() {
    state = 'aim'; render();
    clearTimeout(timer);

  }
  if (state === 'aim') aim(); else render();
  el.querySelector('[data-sc-form]').addEventListener('submit', function (e) {
    e.preventDefault(); e.stopPropagation();
    var v = el.querySelector('#sc-q').value.trim();
    if (!v) return;
    clearTimeout(timer);
    var hit = SE.asset(v) || SE.assets().find(function (x) { return x.serial.toLowerCase() === v.toLowerCase() || x.equip.toLowerCase() === v.toLowerCase(); });
    if (hit) { a = hit; tag = hit.serial; state = 'found'; } else { tag = v; state = 'unknown'; }
    render();
    history.replaceState(null, '', '#/scan?state=' + state);
  });
  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-rescan]')) { el.querySelector('#sc-q').value = ''; history.replaceState(null, '', '#/scan'); aim(); }
  });
  return function () { clearTimeout(timer); s.cleanup(); };
};
