(function () {
  if (!window.APP || !window.APP.isNative) return;
  var DAY = 86400000;
  var KEY = 'sbc_update_dismissed_at';

  function canSuggest() {
    try {
      var t = localStorage.getItem(KEY);
      return !t || (Date.now() - Number(t)) >= DAY;
    } catch (_) {
      return true;
    }
  }

  function render(m) {
    if (document.getElementById('sbc-update')) return;
    var el = document.createElement('div');
    el.id = 'sbc-update';
    el.innerHTML =
      '<div class="sbc-update-card" role="alertdialog" aria-modal="true" aria-label="Kemas kini tersedia">' +
      '<span class="sbc-update-tag">KEMAS KINI</span>' +
      '<h4>Versi Baharu Tersedia</h4>' +
      '<p>Sabah Buskers Community <b>v' + m.version + '</b> telah dikeluarkan. Muat turun versi terkini dari <b>apps.sabahbuskers.my</b>.</p>' +
      '<div class="sbc-update-actions">' +
      '<a class="sbc-update-btn" href="' + m.url + '" target="_blank" rel="noopener">Muat Turun</a>' +
      '<button type="button" class="sbc-update-btn ghost" data-skip>Nanti</button>' +
      '</div></div>';
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-skip]')) return;
      try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {}
      el.classList.add('sbc-update--hide');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    });
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('is-on'); });
    });
  }

  function check() {
    if (!canSuggest()) return;
    fetch(window.APP.updateUrl, { cache: 'no-store', redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (m) {
        if (!m || !m.android || !m.android.url) return;
        var cur = Number(window.APP.buildCode) || 0;
        if (Number(m.android.versionCode) > cur) render(m.android);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();