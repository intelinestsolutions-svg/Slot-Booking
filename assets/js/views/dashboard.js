(function () {
  const BOOK_META = {
    pending:   ['⏳', 'Menunggu Bayaran', 'pending'],
    confirmed: ['✅', 'Disahkan', 'confirmed'],
    completed: ['🎸', 'Selesai', 'completed'],
    cancelled: ['🚫', 'Dibatalkan', 'cancelled'],
  };

  function guard() {
    const u = Session.user;
    if (!u || u.role !== 'busker') {
      Router.go('login', { next: 'performance-dashboard' });
      return null;
    }
    return u;
  }

  window.viewDashboard = function () {
    if (!guard()) return '';
    const u = Session.user;
    return UI.page('Dashboard Persembahan', `Ringkasan prestasi untuk ${u.stageName || u.fullName || ''}.`,
      `
      <div id="dashStats"></div>
      <div id="dashNext"><div class="empty">Memuatkan... </div></div>`,
      { eyebrow: 'Statistik anda' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewDashboard = async function () {
    if (!guard()) return;
    let list = [];
    try {
      const r = await API.bookings.mine();
      list = r.bookings || [];
    } catch (e) {
      document.getElementById('dashNext').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const today = UI.todayISO();
    const total = list.length;
    const confirmed = list.filter(b => b.status === 'confirmed').length;
    const completed = list.filter(b => b.status === 'completed').length;
    const paidSum = list.filter(b => ['confirmed', 'completed'].includes(b.status)).reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const completedSum = list.filter(b => b.status === 'completed').reduce((s, b) => s + (Number(b.amount) || 0), 0);

    document.getElementById('dashStats').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><b>${total}</b><span>Jumlah Tempahan</span></div>
        <div class="stat-card"><b>${confirmed}</b><span>Disahkan</span></div>
        <div class="stat-card"><b>${completed}</b><span>Selesai</span></div>
        <div class="stat-card"><b>${UI.money(paidSum)}</b><span>Jumlah Dibayar</span></div>
      </div>`;

    const upcoming = list
      .filter(b => b.slotDate >= today)
      .sort((a, b) => a.slotDate === b.slotDate ? a.startTime.localeCompare(b.startTime) : a.slotDate.localeCompare(b.slotDate));

    const next = upcoming[0];

    const nextHtml = next ? `
      <div class="card" style="margin-bottom:24px;">
        <p class="eyebrow" style="margin-bottom:8px;">Persembahan Akan Datang</p>
        <h3 style="font-size:28px;">${UI.esc(next.locationName)}</h3>
        <p style="margin-top:6px;color:var(--gold);font-weight:800;">${UI.dateLabel(next.slotDate)} · ${UI.esc(next.startTime)} – ${UI.esc(next.endTime)}</p>
        <p style="color:var(--muted);font-size:13px;margin-top:4px;">Status: <span class="st st-${UI.esc(next.status)}">${UI.esc(next.status)}</span></p>
        <div style="margin-top:14px;">
          ${next.status === 'confirmed'
            ? `<a class="btn btn-primary btn-sm" href="?page=tempahan-saya">Lihat Tempahan</a>`
            : `<a class="btn btn-primary btn-sm" href="?page=tempahan-saya">Bayar / Urus</a>`}
          <a class="btn btn-ghost btn-sm" href="?page=cari-slot">Cari Slot Lain</a>
        </div>
      </div>`
      : `<div class="empty" style="padding:26px 10px;"><div class="e-ico">🎵</div><p>Tiada persembahan akan datang. Mari tempah slot pertama anda!</p>
          <a class="btn btn-primary" href="?page=cari-slot">Cari Slot</a></div>`;

    let history = '<h3 style="font-size:20px;margin:26px 0 14px;">Rekod Persembahan</h3>';
    if (!list.length) {
      history += `<div class="empty" style="padding:20px;"><div class="e-ico">🎼</div><p>Belum ada rekod. Tempahan pertama anda akan muncul di sini.</p></div>`;
    } else {
      history += `<div class="table-wrap"><table class="data">
        <thead><tr><th>Tarikh</th><th>Lokasi</th><th>Sesi</th><th>Status</th><th>Bayaran</th></tr></thead>
        <tbody>
          ${list.slice().sort((a, b) => (b.slotDate + b.startTime).localeCompare(a.slotDate + a.startTime)).map(b => {
            const m = BOOK_META[b.status] || ['' , b.status, b.status];
            return `<tr>
              <td>${UI.esc(b.slotDate)}</td>
              <td>${UI.esc(b.locationName)}</td>
              <td>${UI.esc(b.startTime)} – ${UI.esc(b.endTime)}</td>
              <td><span class="st st-${UI.esc(m[2])}">${UI.esc(m[1])}</span></td>
              <td style="color:var(--gold);font-weight:700;">${UI.money(b.amount)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
    }

    document.getElementById('dashNext').innerHTML = nextHtml + history;
  };
})();