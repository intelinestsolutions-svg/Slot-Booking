(function () {
  // Pintu versi aplikasi natif: bandingkan binaan semasa dengan version.json
  // di laman live. Sama -> teruskan seperti biasa. Tidak sama -> papar
  // gesaan muat turun versi baharu (tiada auto-push/paksa pasang senyap).
  // Gagal rangkaian -> teruskan (fail-open) supaya mod luar talian tidak terkunci.
  if (!window.APP || !window.APP.isNative) return;

  function render(m) {
    if (document.getElementById('sbc-update')) return;
    var el = document.createElement('div');
    el.id = 'sbc-update';
    el.innerHTML =
      '<div class="sbc-update-card" role="alertdialog" aria-modal="true" aria-label="Kemas kini diperlukan">' +
      '<span class="sbc-update-tag">KEMAS KINI DIPERLUKAN</span>' +
      '<h4>Versi Anda Telah Lapuk</h4>' +
      '<p>Aplikasi ini versi lama dan tidak lagi disokong. Sila muat turun Sabah Buskers Community <b>v' + m.version + '</b> dari laman rasmi <b>apps.sabahbuskers.my</b> untuk meneruskan.</p>' +
      (m.notes ? '<p style="font-size:13px;opacity:.85;">' + m.notes + '</p>' : '') +
      '<div class="sbc-update-actions">' +
      '<a class="sbc-update-btn" href="' + m.url + '" target="_blank" rel="noopener">Muat Turun Versi Baharu</a>' +
      '</div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('is-on'); });
    });
  }

  function check() {
    var url = window.APP.updateUrl;
    if (!url) return;
    fetch(url, { cache: 'no-store', redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (m) {
        if (!m || !m.android || !m.android.url) return;
        var cur = Number(window.APP.buildCode) || 0;
        var live = Number(m.android.versionCode) || 0;
        // Sama (atau lebih baharu) -> proceed senyap. Lama -> minta muat turun.
        if (live > 0 && cur < live) render(m.android);
      })
      .catch(function () { /* luar talian / ralat -> teruskan versi semasa */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
