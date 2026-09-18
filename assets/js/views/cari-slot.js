(function () {
  window.viewCariSlot = function () {
    const user = Session.user || {};
    const isGuest = !user;
    const notApproved = user.role === 'busker' && user.verificationStatus !== 'approved';

    return UI.page('Cari Slot', 'Cari lokasi busking disahkan di sekitar Kota Kinabalu dan Sabah.',
      `
      ${notApproved ? UI.notice('Akaun anda belum diluluskan admin. Anda boleh meneroka lokasi tetapi belum boleh menempah slot.', 'info') : ''}
      ${isGuest ? UI.notice('Anda dalam mod layar. <a href="?page=login" style="color:var(--gold);font-weight:700;">Log masuk</a> untuk menempah slot.', 'info') : ''}
      <div class="toolbar">
        <div class="search">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="locSearch" type="text" placeholder="Cari lokasi atau kawasan..." autocomplete="off">
        </div>
        <select class="select" id="locArea" style="width:auto;"><option value="">Semua Kawasan</option></select>
        <button class="chip active" data-tier="">Semua</button>
        <button class="chip" data-tier="Hotspot">🔥 Hotspot</button>
        <button class="chip" data-tier="Coldspot">❄️ Coldspot</button>
      </div>
      <div id="locGrid" class="loc-grid">
        <div class="empty"><div class="e-ico">🎤</div><p>Memuatkan lokasi...</p></div>
      </div>`,
      { eyebrow: 'Lokasi DBKK & Sabah' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewCariSlot = async function () {
    let locations = [];
    let areas = [];
    try {
      const [locRes, areaRes] = await Promise.all([API.locations.list(), API.locations.areas()]);
      locations = locRes.locations || [];
      areas = areaRes.areas || [];
    } catch (e) {
      locations = [];
      areas = [];
    }

    const user = Session.user || {};
    const canBook = user.role === 'busker' && user.verificationStatus === 'approved';

    const areaSelect = document.getElementById('locArea');
    areaSelect.innerHTML = '<option value="">Semua Kawasan</option>' + areas.map(a => `<option>${UI.esc(a)}</option>`).join('');

    const grid = document.getElementById('locGrid');
    let activeTier = '';

    const render = (list) => {
      if (!list.length) {
        grid.innerHTML = `<div class="empty"><div class="e-ico">🗺️</div><p>Tiada lokasi dijumpai.</p></div>`;
        return;
      }
      grid.innerHTML = list.map((l, i) => `
        <article class="card loc-card reveal" style="--d:${(i % 6) * 40}ms">
          <div class="loc-head grad-${(i % 3) + 1}">
            <span class="pin">📍 ${UI.esc(l.city)} · ${UI.esc(l.area)}</span>
            <h3>${UI.esc(l.name)}</h3>
          </div>
          <div class="loc-body">
            <p>${UI.esc(l.description || 'Lokasi busking yang disahkan.')}</p>
            <div class="loc-meta">
              ${UI.badge(l.tier)}
              ${(l.sessions || '').split(',').filter(Boolean).map(s => `<span class="tier tier-warm" style="font-weight:700;padding:3px 10px;font-size:10px;">${UI.esc(s)}</span>`).join('')}
            </div>
            ${Number(l.ratingCount || 0) > 0
              ? `<div class="loc-rate" style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);margin-top:10px;">
                  ${UI.stars(l.ratingAvg)}<span><b style="color:var(--gold)">${UI.esc(l.ratingAvg)}</b> · ${UI.esc(l.ratingCount)} ulasan</span>
                </div>`
              : `<div class="loc-rate" style="font-size:12.5px;color:var(--muted-2);margin-top:10px;">Belum ada ulasan — jadi yang pertama!</div>`}
            <div class="loc-foot">
              <div class="loc-price"><b>${UI.money(l.priceFrom)}</b><small> / sesi</small></div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-ghost btn-sm" data-review="${l.id}" data-name="${UI.esc(l.name)}">Ulasan</button>
                <a class="btn btn-${canBook ? 'primary' : 'ghost'} btn-sm" href="?page=slot-booking&locationId=${l.id}">${canBook ? 'Tempah Slot' : 'Lihat Slot'}</a>
              </div>
            </div>
          </div>
        </article>`).join('');
      RevealObserver && document.querySelectorAll('.reveal').forEach(el => RevealObserver.observe(el));
      grid.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', () => UI.reviewsModal(Number(btn.dataset.review), btn.dataset.name)));
    };

    const filter = () => {
      const term = document.getElementById('locSearch').value.toLowerCase();
      const area = areaSelect.value;
      const list = locations.filter(l => {
        const matchTerm = (l.name + ' ' + l.area + ' ' + (l.description || '')).toLowerCase().includes(term);
        const matchArea = !area || l.area === area;
        const matchTier = !activeTier || l.tier === activeTier;
        return matchTerm && matchArea && matchTier;
      });
      render(list);
    };

    document.getElementById('locSearch').addEventListener('input', filter);
    areaSelect.addEventListener('change', filter);
    document.querySelectorAll('[data-tier]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-tier]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeTier = chip.dataset.tier;
        filter();
      });
    });

    render(locations);
  };
})();