(function () {
  // Banner pengumuman global: papar pengumuman aktif terbaru di atas setiap
  // halaman (web + aplikasi Android) supaya kemas kini sampai kepada SEMUA
  // pengguna bila mereka buka aplikasi. Mod luar talian -> teruskan senyap.

  function formPage() {
    const p = (new URLSearchParams(location.search).get('page') || '').toLowerCase();
    return ['register', 'login', 'busker_login', 'admin_login', 'venue_login', 'forgot', 'verify-phone', 'terms', 'privacy'].includes(p);
  }

  async function show() {
    if (formPage()) return;
    let items = [];
    try {
      const r = await API.announcements.list();
      items = (r && r.announcements) || [];
    } catch (e) {
      return; // luar talian / ralat -> jangan sekat pengguna
    }
    if (!items.length || !document.getElementById('root')) return;

    // Pengumuman terbaru yang belum ditutup oleh pengguna ini.
    let chosen = null;
    for (const a of items) {
      if (!a || !a.id) continue;
      let dismissed = false;
      try { dismissed = localStorage.getItem('sbc-anno-dismiss-' + a.id) === '1'; } catch (e) {}
      if (!dismissed) { chosen = a; break; }
    }
    if (!chosen) return;

    let host = document.getElementById('sbcAnnoHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sbcAnnoHost';
      document.getElementById('root').prepend(host);
    }
    const el = document.createElement('div');
    el.className = 'sbc-anno';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<button type="button" class="sbc-anno-x" aria-label="Tutup pengumuman">✕</button>' +
      '<div class="sbc-anno-title">📢 ' + UI.esc(chosen.title) + '</div>' +
      '<div class="sbc-anno-body">' + UI.esc(chosen.body) + '</div>';
    el.querySelector('.sbc-anno-x').addEventListener('click', function () {
      try { localStorage.setItem('sbc-anno-dismiss-' + chosen.id, '1'); } catch (e) {}
      el.remove();
    });
    host.innerHTML = '';
    host.appendChild(el);
  }

  // Papar selepas setiap render SPA (event revealReady) dan pada muat awal.
  document.addEventListener('revealReady', show);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else {
    show();
  }
})();