(function () {
  // HANYA admin@sabahbuskers.my layak ke panel global (role 'admin' sahaja
  // belum cukup — akaun admin lain tiada hak memantau semua lokasi).
  function isSup(u) {
    return !!(u && u.role === 'admin' &&
      String(u.email || '').toLowerCase() === String(APP.superAdminEmail || 'admin@sabahbuskers.my').toLowerCase());
  }

  function guard() {
    const u = Session.user;
    if (!isSup(u)) {
      Router.go('admin_login', { next: 'admin-dashboard' });
      return null;
    }
    return u;
  }

  // Pentadbir spot (role 'venue') juga layak ke panel pengesahan tempahan —
  // pelayan memfilter lokasi mengikut tugasan adminUserId.
  function staffGuard() {
    const u = Session.user;
    if (!u || (!isSup(u) && u.role !== 'venue')) {
      Router.go('admin_login', { next: 'admin-bookings' });
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
      apps = (r && r.applications) || [];
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
      rows = (r && r.transactions) || [];
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
        '<div class="empty"><div class="e-ico">💰</div><p>Belum ada transaksi.</p></div>';
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
      slots = (r && r.slots) || [];
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

  /* ============ Pengesahan Tempahan (admin penuh & pentadbir spot) ============ */
  window.viewAdminBookings = function () {
    if (!staffGuard()) return '';
    return UI.page('Pengesahan Tempahan', 'Lulus atau tolak permohonan slot. Satu kelulusan menolak pemohon lain bagi slot yang sama.',
      `<div id="pendingBookings"><div class="empty">Memuatkan tempahan...</div></div>`,
      { eyebrow: 'Kelulusan Slot' });
  };

  window.ViewHooks.viewAdminBookings = async function () {
    const me = staffGuard();
    if (!me) return;
    let rows = [];
    try {
      const r = await API.admin.pendingBookings();
      rows = (r && r.bookings) || [];
    } catch (e) {
      document.getElementById('pendingBookings').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const box = document.getElementById('pendingBookings');
    if (!rows.length) {
      box.innerHTML = '<div class="empty"><div class="e-ico">✅</div><p>Belum ada tempahan busker.</p></div>';
      return;
    }

    const stCls = b => b.status === 'pending' ? 'pending' : 'ok';
    const stLbl = b => b.status === 'pending' ? 'Menunggu Kelulusan' : 'Menunggu Bayaran';

    box.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Tarikh / Masa</th><th>Busker</th><th>Hubungan</th><th>Lokasi</th><th>Status</th><th>Tindakan</th></tr></thead>
      <tbody>
        ${rows.map(b => `
          <tr>
            <td><b>${UI.esc(b.slotDate)}</b><br><small style="color:var(--muted)">${UI.esc(b.startTime)} – ${UI.esc(b.endTime)}</small></td>
            <td>🎤 ${UI.esc(b.stageName || b.fullName)}<br><small style="color:var(--muted-2)">${UI.esc(b.fullName || '')}</small></td>
            <td>${UI.esc(b.buskerEmail)}<br><small style="color:var(--muted)">${UI.esc(b.buskerPhone || '—')}</small></td>
            <td>${UI.esc(b.locationName)} · <small style="color:var(--muted)">${UI.esc(b.area || '')}</small></td>
            <td><span class="st st-${stCls(b)}">${stLbl(b)}</span></td>
            <td>
              ${b.status === 'pending'
                ? `<button class="btn btn-primary btn-sm" data-approve="${b.id}">Lulus</button>
                   <button class="btn btn-danger btn-sm" data-reject="${b.id}">Tolak</button>`
                : `<small style="color:var(--muted-2)">Bil: ${UI.esc(b.billCode || '—')}</small>`}
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

    box.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Luluskan tempahan ini? Pemohon lain bagi slot yang sama akan ditolak secara automatik.')) return;
      btn.disabled = true;
      try {
        const r = await API.admin.approveBooking({ bookingId: Number(btn.dataset.approve) });
        const extra = r.autoRejected ? ` ${r.autoRejected} permohonan lain ditolak otomatik.` : '';
        UI.toast(
          r.emailSent
            ? ('Tempahan diluluskan. Pautan bayaran diemelkan kepada busker.' + extra)
            : ('Tempahan diluluskan, tetapi penghantaran emel gagal: ' + (r.emailError || '') + extra),
          r.emailSent ? 'ok' : 'warn'
        );
        Router.replace('admin-bookings');
      } catch (e) {
        UI.toast(e.message, 'err');
        btn.disabled = false;
      }
    }));

    box.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Tolak permohonan tempahan ini?')) return;
      btn.disabled = true;
      try {
        const r = await API.admin.rejectBooking({ bookingId: Number(btn.dataset.reject) });
        UI.toast(
          r.emailSent ? 'Tempahan ditolak. Busker dimaklumkan melalui emel.' : ('Tempahan ditolak (emel gagal: ' + (r.emailError || '') + ').'),
          r.emailSent ? 'ok' : 'warn'
        );
        Router.replace('admin-bookings');
      } catch (e) {
        UI.toast(e.message, 'err');
        btn.disabled = false;
      }
    }));
  };

  /* ============ Spot Admin: pentadbir per-lokasi (super admin sahaja) ============ */
  window.viewAdminVenues = function () {
    if (!guard()) return '';
    return UI.page('Spot Admin', 'Tugaskan pentadbir bagi setiap lokasi ("spot"). Pentadbir spot hanya boleh meluluskan tempahan lokasinya.',
      `
      <div class="panel" style="margin-bottom:18px;">
        <h3 style="font-size:17px;">Tugaskan Pentadbir Spot</h3>
        <form id="venueForm" class="form-grid" style="margin-top:14px;">
          <div class="field span-2">
            <label for="vEmail">Email <em>*</em></label>
            <input class="input" id="vEmail" type="email" required placeholder="admin.lokasi@contoh.com">
          </div>
          <div class="field span-2">
            <label for="vName">Nama Penuh <small style="color:var(--muted);">(akaun baharu sahaja)</small></label>
            <input class="input" id="vName" placeholder="Nama pentadbir spot">
          </div>
          <div class="field span-2">
            <label for="vPass">Kata Laluan Awal <small style="color:var(--muted);">(akaun baharu sahaja)</small></label>
            <input class="input" id="vPass" type="text" minlength="6" placeholder="Minimum 6 aksara">
          </div>
          <div class="field span-2">
            <label for="vLoc">Lokasi <em>*</em></label>
            <select class="select" id="vLoc" required><option value="">-- Pilih Lokasi --</option></select>
          </div>
          <div class="field span-2">
            <small style="color:var(--muted)">Emel yang sama boleh ditugaskan ke lebih daripada satu spot. Jika emel sedia ada sebagai pentadbir spot, akaun digunakan semula — kata laluan & nama kekal.</small>
          </div>
          <div class="field span-2" style="align-self:end;">
            <button class="btn btn-primary" id="vSubmit">Cipta Pentadbir Spot</button>
          </div>
        </form>
      </div>
      <div id="venueEditPanel" class="panel" style="margin-bottom:18px;display:none;">
        <h3 style="font-size:17px;">Ubah Pentadbir Spot</h3>
        <form id="venueEditForm" class="form-grid" style="margin-top:14px;">
          <input type="hidden" id="eVenueId">
          <div class="field span-2">
            <label for="eEmail">Email</label>
            <input class="input" id="eEmail" type="email" disabled>
          </div>
          <div class="field span-2">
            <label for="eName">Nama Penuh</label>
            <input class="input" id="eName" placeholder="Nama baharu (biar kosong jika kekal)">
          </div>
          <div class="field span-2">
            <label for="ePass">Kata Laluan Baharu</label>
            <input class="input" id="ePass" type="text" minlength="6" placeholder="Minimum 6 aksara (biar kosong jika kekal)">
          </div>
          <div class="field span-2">
            <label for="eLoc">Pindah ke Lokasi</label>
            <select class="select" id="eLoc"><option value="">-- Kekal Lokasi Semasa --</option></select>
          </div>
          <div class="field span-2" style="align-self:end;">
            <button class="btn btn-primary" id="eSubmit">Simpan Perubahan</button>
            <button type="button" class="btn" id="eCancel" style="margin-left:8px;">Batal</button>
          </div>
        </form>
      </div>
      <div id="venueList"><div class="empty">Memuatkan lokasi...</div></div>`,
      { eyebrow: 'Pentadbiran Spot' });
  };

  window.ViewHooks.viewAdminVenues = async function () {
    if (!guard()) return;
    let locations = [];
    try {
      const r = await API.admin.venueLocations();
      locations = (r && r.locations) || [];
    } catch (e) {
      document.getElementById('venueList').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const locSel = document.getElementById('vLoc');
    locSel.innerHTML = '<option value="">-- Pilih Lokasi --</option>' + locations
      .map(l => `<option value="${l.id}" ${l.adminUserId ? 'disabled' : ''}>${UI.esc(l.name)}${l.area ? ' (' + UI.esc(l.area) + ')' : ''}${l.adminUserId ? ' — sedia ada: ' + UI.esc(l.adminName || l.adminEmail) : ''}</option>`).join('');

    const box = document.getElementById('venueList');
    box.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Lokasi</th><th>Kawasan</th><th>Pentadbir Spot</th><th>Status</th><th>Tindakan</th></tr></thead>
      <tbody>
        ${locations.map(l => `
          <tr>
            <td><b>${UI.esc(l.name)}</b></td>
            <td>${UI.esc(l.area || '—')}</td>
            <td>${l.adminEmail
              ? '👤 ' + UI.esc(l.adminName || l.adminEmail) + '<br><small style="color:var(--muted)">' + UI.esc(l.adminEmail) + '</small>'
              : '<small style="color:var(--muted-2)">Tiada pentadbir</small>'}</td>
            <td><span class="st st-${l.adminUserId ? 'ok' : 'pending'}">${l.adminUserId ? 'Ditugaskan' : 'Belum Ditugaskan'}</span></td>
            <td>${l.adminUserId
              ? `<button class="btn btn-sm" data-edit="${l.id}">✏️ Ubah</button>`
              : '<small style="color:var(--muted-2)">—</small>'}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
    box.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openVenueEdit(Number(btn.getAttribute('data-edit')), locations));
    });

    // ---------- Panel "Ubah Pentadbir Spot" ----------
    const editPanel = document.getElementById('venueEditPanel');
    const locSelE = document.getElementById('eLoc');
    locSelE.innerHTML = '<option value="">-- Kekal Lokasi Semasa --</option>' + locations
      .map(l => `<option value="${l.id}">${UI.esc(l.name)}${l.area ? ' (' + UI.esc(l.area) + ')' : ''}</option>`).join('');

    window.openVenueEdit = function (locId, locs) {
      const l = locs.find(x => x.id === locId);
      if (!l) return;
      document.getElementById('eVenueId').value = l.adminUserId;
      document.getElementById('eEmail').value = l.adminEmail || '';
      document.getElementById('eName').value = '';
      document.getElementById('ePass').value = '';
      // Lokasi yang diduduki pentadbir LAIN dikunci — elak tulis ganti senyap.
      const eLoc = document.getElementById('eLoc');
      eLoc.innerHTML = '<option value="">-- Kekal Lokasi Semasa --</option>' + locs
        .map(x => {
          const taken = x.adminUserId && x.adminUserId !== l.adminUserId;
          const label = x.name + (x.area ? ' (' + UI.esc(x.area) + ')' : '') + (taken ? ' — sedia ada: ' + UI.esc(x.adminName || x.adminEmail) : '');
          return `<option value="${x.id}" ${taken ? 'disabled' : ''}>${UI.esc(label)}</option>`;
        }).join('');
      eLoc.value = '';
      editPanel.style.display = 'block';
      editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    document.getElementById('eCancel').addEventListener('click', () => { editPanel.style.display = 'none'; });

    document.getElementById('venueEditForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('eSubmit');
      btn.disabled = true;
      try {
        await API.admin.updateVenue({
          venueId: Number(document.getElementById('eVenueId').value),
          fullName: document.getElementById('eName').value.trim(),
          password: document.getElementById('ePass').value,
          locationId: Number(document.getElementById('eLoc').value || 0) || undefined,
        });
        UI.toast('Pentadbir spot dikemas kini.', 'ok');
        editPanel.style.display = 'none';
        Router.replace('admin-venues');
      } catch (err) {
        UI.toast(err.message, 'err');
        btn.disabled = false;
      }
    });

    document.getElementById('venueForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('vSubmit');
      btn.disabled = true;
      try {
        const r = await API.admin.createVenue({
          email: document.getElementById('vEmail').value.trim(),
          fullName: document.getElementById('vName').value.trim(),
          password: document.getElementById('vPass').value,
          locationId: Number(document.getElementById('vLoc').value),
        });
        UI.toast(
          (r.reused ? 'Pentadbir sedia ada ditugaskan ke ' : 'Pentadbir spot dicipta & ditugaskan ke ') +
          (r.location && r.location.name ? r.location.name : 'lokasi terpilih') + '.', 'ok');
        Router.replace('admin-venues');
      } catch (err) {
        UI.toast(err.message, 'err');
        btn.disabled = false;
      }
    });
  };

  /* ============ Lokasi Spot: tambah/buang spot (super admin sahaja) ============ */
  window.viewAdminLocations = function () {
    if (!guard()) return '';
    return UI.page('Lokasi Spot', 'Super admin menambah atau membuang tempat persembahan. Harga & masa slot ditentukan oleh super admin.',
      `
      <div class="panel" style="margin-bottom:18px;">
        <h3 style="font-size:17px;">Tambah Lokasi Spot</h3>
        <form id="locForm" class="form-grid" style="margin-top:14px;">
          <div class="field span-2">
            <label for="locName">Nama Spot <em>*</em></label>
            <input class="input" id="locName" required placeholder="cth: Padang Merdeka">
          </div>
          <div class="field span-2">
            <label for="locArea">Kawasan/Area <em>*</em></label>
            <input class="input" id="locArea" required placeholder="cth: Pusat Bandar">
          </div>
          <div class="field">
            <label for="locTier">Tier</label>
            <select class="select" id="locTier">
              <option value="Hotspot">Hotspot</option>
              <option value="Coldspot">Coldspot</option>
            </select>
          </div>
          <div class="field">
            <label for="locPrice">2. Yuran Slot (RM) <em>*</em></label>
            <input class="input" id="locPrice" type="number" min="1" step="0.5" required placeholder="cth: 50">
          </div>
          <div class="field">
            <label for="locStart">3a. Masa Mula <em>*</em></label>
            <input class="input" id="locStart" type="time" value="20:00" required>
          </div>
          <div class="field">
            <label for="locEnd">3b. Masa Tamat <em>*</em></label>
            <input class="input" id="locEnd" type="time" value="22:00" required>
          </div>
          <div class="field span-2">
            <label for="locDays">Hari Aktif</label>
            <input class="input" id="locDays" value="Fri,Sat,Sun" placeholder="cth: Mon,Tue,Wed,Thu,Fri,Sat,Sun">
            <small style="color:var(--muted)">Singkatan Inggeris dipisahkan koma: Fri,Sat,Sun</small>
          </div>
          <div class="field span-2">
            <label for="locDesc">Penerangan</label>
            <textarea class="input" id="locDesc" rows="2" placeholder="Penerangan ringkas spot..."></textarea>
          </div>
          <div class="field span-2" style="align-self:end;">
            <button class="btn btn-primary" id="locSubmit">Tambah Spot</button>
          </div>
        </form>
      </div>
      <div id="locList"><div class="empty">Memuatkan senarai lokasi...</div></div>`,
      { eyebrow: 'Lokasi Busking' });
  };

  window.ViewHooks.viewAdminLocations = async function () {
    if (!guard()) return;
    let locations = [];
    try {
      const r = await API.admin.venueLocations();
      locations = (r && r.locations) || [];
    } catch (e) {
      document.getElementById('locList').innerHTML = UI.notice(e.message, 'error');
      return;
    }
    const box = document.getElementById('locList');
    box.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Spot</th><th>Kawasan</th><th>Tier</th><th>Status</th><th>Pentadbir</th><th>Tindakan</th></tr></thead>
      <tbody>
        ${locations.map(l => `
          <tr>
            <td><b>${UI.esc(l.name)}</b></td>
            <td>${UI.esc(l.area || '—')}</td>
            <td>${UI.esc(l.tier || '—')}</td>
            <td><span class="st st-${l.isActive ? 'ok' : 'err'}">${l.isActive ? 'Aktif' : 'Dibuang'}</span></td>
            <td>${l.adminEmail ? '👤 ' + UI.esc(l.adminName || l.adminEmail) : '<small style="color:var(--muted-2)">Tiada</small>'}</td>
            <td>${l.isActive
              ? `<button class="btn btn-sm" data-remove="${l.id}" data-name="${UI.esc(l.name)}">🗑 Buang</button>`
              : '<small style="color:var(--muted-2)">—</small>'}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

    box.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-name');
        if (!window.confirm(`Buang spot "${name}"?\n\nSpot akan dinyahaktifkan; tempahan aktif akan disekat. Sejarah kekal untuk audit.`)) return;
        btn.disabled = true;
        try {
          await API.admin.locationRemove({ locationId: Number(btn.getAttribute('data-remove')) });
          UI.toast('Spot dibuang: ' + name, 'ok');
          Router.replace('admin-locations');
        } catch (err) {
          UI.toast(err.message, 'err');
          btn.disabled = false;
        }
      });
    });

    document.getElementById('locForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('locSubmit');
      btn.disabled = true;
      try {
        const r = await API.admin.locationCreate({
          name: document.getElementById('locName').value.trim(),
          area: document.getElementById('locArea').value.trim(),
          tier: document.getElementById('locTier').value,
          price: Number(document.getElementById('locPrice').value),
          days: document.getElementById('locDays').value.trim(),
          startTime: document.getElementById('locStart').value,
          endTime: document.getElementById('locEnd').value,
          description: document.getElementById('locDesc').value.trim(),
        });
        UI.toast('Spot "' + r.location.name + '" ditambah — yuran RM' + r.template.price + ' (' + r.template.startTime + '-' + r.template.endTime + ').', 'ok');
        Router.replace('admin-locations');
      } catch (err) {
        UI.toast(err.message, 'err');
        btn.disabled = false;
      }
    });
  };
})();