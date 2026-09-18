(function () {
  function guard() {
    const u = Session.user;
    if (!u || u.role !== 'admin') {
      Router.go('admin_login', { next: 'admin-dashboard' });
      return null;
    }
    return u;
  }

  window.viewAdmin = function () {
    if (!guard()) return '';
    return UI.page('Dashboard Admin', 'Semakan permohonan & pengurusan platform.',
      `
      <div id="adStats"></div>
      <div id="adApps"><div class="empty">Memuatkan permohonan...</div></div>`,
      { eyebrow: 'Pentadbiran' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewAdmin = async function () {
    if (!guard()) return;
    try {
      const r = await API.community.stats();
      document.getElementById('adStats').innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><b>${r.buskers || 0}</b><span>Buskers Disahkan</span></div>
          <div class="stat-card"><b>${r.locations || 0}</b><span>Lokasi Aktif</span></div>
          <div class="stat-card"><b>${r.bookings || 0}</b><span>Tempahan Sah</span></div>
          <div class="stat-card"><b>${UI.money(r.revenue)}</b><span>Hasil</span></div>
        </div>`;
    } catch (e) { /* ignore stats */ }

    let apps = [];
    try {
      const r = await API.admin.applications();
      apps = r.applications || [];
    } catch (e) {
      document.getElementById('adApps').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const box = document.getElementById('adApps');
    if (!apps.length) {
      box.innerHTML = '<div class="empty"><div class="e-ico">📋</div><p>Tiada permohonan buat masa ini.</p></div>';
      return;
    }

    const statusCls = a => a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'cancelled' : 'pending';
    const statusLabel = a => a.status === 'approved' ? 'Disahkan' : a.status === 'rejected' ? 'Ditolak' : 'Dalam Semakan';

    box.innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Nama / Pentas</th><th>Hubungan</th><th>Lokasi</th><th>Status</th><th>Tindakan</th></tr></thead>
        <tbody>
          ${apps.map(a => `
            <tr>
              <td><b style="color:var(--gold)">${UI.esc(a.appId)}</b><br><small style="color:var(--muted-2)">${UI.esc((a.createdAt || '').replace('T', ' '))}</small></td>
              <td>${UI.esc(a.fullName)}<br><small style="color:var(--muted)">${UI.esc(a.stageName || '')} · ${UI.esc(a.genre || '')}</small></td>
              <td>${UI.esc(a.email)}<br><small style="color:var(--muted)">${UI.esc(a.phone || '')}</small></td>
              <td>${UI.esc(a.city || '')}, ${UI.esc(a.state || '')}</td>
              <td><span class="st st-${statusCls(a)}">${statusLabel(a)}</span></td>
              <td>${a.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" data-decide="approve" data-app="${a.id}">Lulus</button>
                <button class="btn btn-danger btn-sm" data-decide="reject" data-app="${a.id}">Tolak</button>` : `<small style="color:var(--muted-2)">Selesai</small>`}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

    box.querySelectorAll('[data-decide]').forEach(btn => btn.addEventListener('click', async () => {
      const decision = btn.dataset.decide;
      if (!confirm(decision === 'approve' ? 'Luluskan permohonan ini?' : 'Tolak permohonan ini?')) return;
      try {
        await API.admin.approve({ appId: Number(btn.dataset.app), decision });
        UI.toast('Status permohonan dikemas kini.', 'ok');
        Router.replace('admin-dashboard');
      } catch (e) {
        UI.toast(e.message, 'err');
      }
    }));
  };

  /* ============ Kewangan ============ */
  window.viewAdminFinance = function () {
    if (!guard()) return '';
    return UI.page('Kewangan', 'Rekod transaksi pembayaran slot.',
      `
      <div id="finStats"></div>
      <div id="finTable"><div class="empty">Memuatkan transaksi...</div></div>`,
      { eyebrow: 'Transaksi' });
  };

  window.ViewHooks.viewAdminFinance = async function () {
    if (!guard()) return;
    let rows = [];
    try {
      const r = await API.admin.financials();
      rows = r.transactions || [];
      const s = await API.community.stats().catch(() => null);
      document.getElementById('finStats').innerHTML = s ? `
        <div class="stat-grid" style="margin-bottom:20px;">
          <div class="stat-card"><b>${UI.money(s.revenue)}</b><span>Hasil Sesuai</span></div>
          <div class="stat-card"><b>${s.bookings}</b><span>Tempahan Sah</span></div>
        </div>` : '';
    } catch (e) {
      document.getElementById('finTable').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const box = document.getElementById('finTable');
    if (!rows.length) {
      box.innerHTML = UI.notice('Belum ada rekod transaksi. Transaksi ToyyibPay akan direkodkan selepas pembayaran disahkan.', 'info') +
        '<div class="empty"><div class="e-ico">💰</div><p>Tiada transaksi belum.</p></div>';
      return;
    }

    box.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Tarikh</th><th>Busker</th><th>Lokasi</th><th>Jumlah</th><th>BillCode</th><th>Rujukan</th><th>Status</th></tr></thead>
      <tbody>
        ${rows.map(t => `
          <tr>
            <td>${UI.esc((t.createdAt || '').replace('T', ' '))}</td>
            <td>${UI.esc(t.stageName || '—')}</td>
            <td>${UI.esc(t.locationName || '—')}</td>
            <td style="color:var(--gold);font-weight:700;">${UI.money(t.amount)}</td>
            <td><small>${UI.esc(t.billCode || '—')}</small></td>
            <td><small>${UI.esc(t.txnRef || '—')}</small></td>
            <td><span class="st st-ok">${UI.esc(t.status || 'paid')}</span></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
  };

  /* ============ Pengurusan Slot ============ */
  window.viewAdminSlots = function () {
    if (!guard()) return '';
    return UI.page('Pengurusan Slot', 'Urus status slot 7 hari akan datang.',
      `
      <div id="slotMgr"><div class="empty">Memuatkan slot...</div></div>`,
      { eyebrow: 'Slot' });
  };

  window.ViewHooks.viewAdminSlots = async function () {
    if (!guard()) return;
    let slots = [], buskers = [];
    try {
      const [r, buskersRes] = await Promise.all([
        API.admin.slotSchedule(),
        API.admin.listBuskers().catch(() => ({ buskers: [] })),
      ]);
      slots = r.slots || [];
      buskers = (buskersRes && buskersRes.buskers) || [];
    } catch (e) {
      document.getElementById('slotMgr').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    const box = document.getElementById('slotMgr');
    box.innerHTML = Object.keys(byDate).sort().map(date => `
      <div class="panel" style="margin-top:12px;">
        <h3 style="font-size:17px;">${UI.dateLabel(date)}</h3>
        <div class="table-wrap" style="margin-top:10px;">
          <table class="data">
            <thead><tr><th>Slot</th><th>Lokasi</th><th>Busker</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody>
              ${byDate[date].map(s => `
                <tr>
                  <td>${UI.esc(s.startTime)} – ${UI.esc(s.endTime)}</td>
                  <td>${UI.esc(s.locationName)} · <small style="color:var(--muted)">${UI.esc(s.area || '')}</small></td>
                  <td>${s.stageName ? '🎤 ' + UI.esc(s.stageName) : '<small style="color:var(--muted-2)">Terbuka</small>'}</td>
                  <td><span class="st st-${UI.esc(s.status)}">${UI.esc(s.status)}</span></td>
                  <td>
                    <select class="select st-select" data-slot="${s.id}" style="width:150px;padding:7px 12px;font-size:12.5px;">
                      ${['Tersedia', 'Ditempah', 'Dibatalkan', 'Selesai'].map(o => `<option ${o === s.status ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>
                    ${s.buskerId && buskers.length ? `
                    <select class="select ganti-select" data-ganti="${s.id}" style="width:190px;margin-top:6px;padding:7px 12px;font-size:12.5px;color:var(--muted);">
                      <option value="">⇄ Ganti busker…</option>
                      ${buskers.map(b => `<option value="${b.id}" ${b.id === s.buskerId ? 'selected' : ''}>${UI.esc(b.stageName || b.fullName)}</option>`).join('')}
                    </select>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`).join('') || '<div class="empty">Tiada slot dalam 7 hari akan datang.</div>';

    box.querySelectorAll('.st-select').forEach(sel => sel.addEventListener('change', async () => {
      try {
        await API.admin.setSlotStatus({ slotId: Number(sel.dataset.slot), status: sel.value });
        UI.toast('Status slot dikemas kini.', 'ok');
        Router.replace('pengurusan-slot');
      } catch (e) {
        UI.toast(e.message, 'err');
      }
    }));

    box.querySelectorAll('.ganti-select').forEach(sel => sel.addEventListener('change', async () => {
      const newU = Number(sel.value);
      if (!newU) return;
      if (!confirm('Ganti busker bagi slot ini?')) {
        sel.value = '';
        return;
      }
      try {
        await API.admin.assignBusker({ slotId: Number(sel.dataset.ganti), buskerId: newU });
        UI.toast('Busker diganti.', 'ok');
        Router.replace('pengurusan-slot');
      } catch (e) {
        UI.toast(e.message, 'err');
      }
    }));
  };
})();