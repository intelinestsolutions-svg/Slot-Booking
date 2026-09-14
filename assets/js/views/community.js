(function () {
  window.viewCommunity = function () {
    return UI.page('Ahli Komuniti BuzzKing', 'Kenali buskers yang disahkan dalam komuniti Sabah.',
      `
      <div id="buskerGrid" class="loc-grid"><div class="empty">Memuatkan komuniti...</div></div>`,
      { eyebrow: 'Komuniti' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewCommunity = async function () {
    let buskers = [];
    try {
      const r = await API.community.buskers();
      buskers = r.buskers || [];
      if (!buskers.length) buskers = _demoBuskers();
    } catch (e) {
      buskers = _demoBuskers();
    }

    const grid = document.getElementById('buskerGrid');
    grid.innerHTML = buskers.map((b, i) => `
      <article class="card busker-card reveal" style="--d:${(i % 6) * 40}ms">
        <div class="busker-head">
          <span class="busker-ava">${UI.esc((b.stageName || 'B').slice(0, 1).toUpperCase())}</span>
          <div>
            <h3>${UI.esc(b.stageName || 'Busker')}</h3>
            <p style="font-size:12px;color:var(--muted);">${UI.esc(b.genre || '')} · ${UI.esc(b.city || '')}, ${UI.esc(b.state || '')}</p>
          </div>
        </div>
        <p class="busker-desc">${UI.esc(b.description || 'Buskers komuniti Sabah.')}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          ${b.isCoordinator ? `<span class="tier tier-hot" style="font-size:10px;">⭐ Koordinator</span>` : ''}
          ${b.isOku ? `<span class="tier tier-warm" style="font-size:10px;">♿ OKU</span>` : ''}
          <span class="tier tier-cold" style="font-size:10px;">${UI.esc(b.genre || 'Busker')}</span>
        </div>
        <div class="busker-social">
          ${b.instagram ? `<a href="${UI.esc(b.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${b.tiktok ? `<a href="${UI.esc(b.tiktok)}" target="_blank" rel="noopener">TikTok</a>` : ''}
        </div>
      </article>`).join('');

    document.querySelectorAll('.reveal').forEach(el => RevealObserver && RevealObserver.observe(el));
  };

  window.viewInbox = function () {
    const u = Session.user;
    if (!u) { Router.go('login', { next: 'inbox' }); return ''; }
    return UI.page('Peti Masuk', 'Pengumuman dan pemberitahuan akaun anda.',
      `
      <div id="inboxTop" style="margin-bottom:16px;"></div>
      <div id="inboxList"><div class="empty">Memuatkan pemberitahuan...</div></div>`,
      { eyebrow: 'Pemberitahuan' });
  };

  window.ViewHooks.viewInbox = async function () {
    const u = Session.user;
    if (!u) return;
    let notifications = [];
    try {
      const r = await API.community.notifications();
      notifications = r.notifications || [];
    } catch (e) {
      document.getElementById('inboxList').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const top = document.getElementById('inboxTop');
    if (notifications.length) {
      top.innerHTML = `<button id="markAll" class="btn btn-ghost btn-sm">Tandakan Semua Sebagai Dibaca</button>`;
      top.querySelector('#markAll').addEventListener('click', async () => {
        try {
          await API.community.markRead();
          UI.toast('Semua pemberitahuan ditandakan dibaca.', 'ok');
          Router.replace('inbox');
        } catch (e) {
          UI.toast(e.message, 'err');
        }
      });
    }

    const box = document.getElementById('inboxList');
    if (!notifications.length) {
      box.innerHTML = `<div class="empty"><div class="e-ico">📬</div><p>Tiada pemberitahuan buat masa ini.</p></div>`;
      return;
    }

    box.innerHTML = notifications.map(n => `
      <div class="bcard notif-card ${n.isRead ? 'notif-read' : ''}">
        <div class="bc-icon">${n.isRead ? '📖' : '🔔'}</div>
        <div class="bc-main">
          <h4>${UI.esc(n.title)}</h4>
          <p>${UI.esc(n.body || '')}</p>
          <p style="font-size:12px;color:var(--muted-2);margin-top:4px;">${UI.esc((n.createdAt || '').replace('T', ' '))}</p>
        </div>
      </div>`).join('');
  };

  function _demoBuskers() {
    return [
      { stageName: 'The Acousticians', genre: 'Akustik / Folk', city: 'Kota Kinabalu', state: 'Sabah', description: 'Duo folk-akustik dengan harmoni vokal dan gitar.', isCoordinator: 1 },
      { stageName: 'Busker John', genre: 'Balada / Pop', city: 'Kota Kinabalu', state: 'Sabah', description: 'Vokalis pop dengan lagu-lagu klasik teman jalanan.' },
      { stageName: 'Kadazan Spirit', genre: 'Etnik Tradisional / Kadazandusun', city: 'Penampang', state: 'Sabah', description: 'Persembahan etnik dengan alat tradisional.' },
    ];
  }
})();