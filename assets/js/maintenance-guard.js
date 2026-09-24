/* SBC maintenance guard
 *
 * When the server is placed in maintenance mode, every fresh request is
 * redirected to maintenance.html — but an app/tab that is ALREADY open keeps
 * running (the SPA is fully loaded in memory). This guard polls a tiny endpoint
 * and, the moment it sees the maintenance redirect, kicks the client to the
 * official maintenance page so "Under Maintenance" actually sticks everywhere.
 *
 * It reacts ONLY to a confident signal (redirect to maintenance.html).
 * Network errors / offline are ignored, so no user is ever locked out by a
 * flaky connection.
 */
(function () {
  if (!window.APP || !window.APP.abs) return;

  var PING = window.APP.abs('/version.json'); /* 302 → maintenance.html while paused */
  var INTERVAL = 20000; /* health check every 20 s (fast enough to feel instant) */
  var TIMEOUT = 5000;   /* abort a hung ping */
  var done = false;

  function kick() {
    if (done) return;
    done = true;
    try {
      location.replace(window.APP.abs('/maintenance.html'));
    } catch (e) {}
  }

  function check() {
    if (done) return;
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    fetch(PING, { cache: 'no-store', redirect: 'follow', signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(t);
        if (done) return;
        var landed = r.url ? String(r.url) : '';
        if (r.redirected || /maintenance\.html/.test(landed)) kick();
      })
      .catch(function () {
        clearTimeout(t);
        /* offline or transient — intentionally do nothing */
      });
  }

  function onVisible() { check(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
  setInterval(check, INTERVAL);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') onVisible();
  });
})();