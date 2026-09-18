(function () {
  function guard() {
    const u = Session.user;
    if (!u || (u.role !== 'partner' && u.role !== 'admin')) {
      Router.go('partner_login', { next: 'partner-dashboard' });
      return null;
    }
    return u;
  }

  const SLOT_STATUS = ['Tersedia', 'Ditempah', 'Dibatalkan', 'Selesai'];

  /* ============ Pendaftaran Rakan ============ */
  window.viewPartnerRegister = function () {
    if (Session.user && Session.user.role === 'partner') {
      Router.replace('partner-dashboard');
      return '';
    }
    return UI.page('Daftar Rakan / Penyelia', 'Daftar akaun untuk penyelia lokasi dan rakan platform.',
      `
      <div class="auth-wrap">
        <div class="auth-card">
          <div id="ptNotice"></div>
          <form id="partnerReg">
            <div class="field">
              <label for="ptName">Nama Penuh <em>*</em></label>
              <input class="input" id="ptName" maxlength="80" placeholder="Nama penuh" required>
            </div>
            <div class="field" style="margin-top:14px;">
              <label for="ptEmail">Email <em>*</em></label>
              <input class="input" id="ptEmail" type="email" maxlength="120" placeholder="nama@contoh.com" autocomplete="email" required>
            </div>
            <div class="field" style="margin-top:14px;">
              <label for="ptPhone">Telefon <em>*</em></label>
              <input class="input" id="ptPhone" maxlength="15" placeholder="01X-XXXXXXX" autocomplete="tel" required>
            </div>
            <div class="field" style="margin-top:14px;">
              <label for="ptPassword">Kata Laluan <em>*</em></label>
              <input class="input" id="ptPassword" type="password" minlength="6" placeholder="Minimum 6 aksara" autocomplete="new-password" required>
            </div>
            <button class="btn btn-primary btn-block" style="margin-top:20px;" id="ptSubmit">Daftar Akaun Rakan</button>
          </form>
          <p style="text-align:center;margin-top:18px;font-size:13px;color:var(--muted)">
            Sudah ada akaun? <a href="?page=partner_login" style="color:var(--gold);font-weight:700;">Log masuk</a>
          </p>
        </div>
      </div>`,
      { eyebrow: 'Rakan platform' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewPartnerRegister = function () {
    const form = document.getElementById('partnerReg');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('ptSubmit');
      const box = document.getElementById('ptNotice');
      const phone = document.getElementById('ptPhone').value.trim();
      if (!/^(\+?6?01)[0-9]{7,8}$/.test(phone.replace(/[- ]/g, ''))) {
        box.innerHTML = UI.notice('Nombor telefon tidak sah. Format: 01X-XXXXXXX.', 'error');
        return;
      }
      if (document.getElementById('ptPassword').value.length < 6) {
        box.innerHTML = UI.notice('Kata laluan minimum 6 aksara.', 'error');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Menghantar...';
      try {
        const data = await API.partner.register({
          fullName: document.getElementById('ptName').value.trim(),
          email: document.getElementById('ptEmail').value.trim(),
          phone,
          password: document.getElementById('ptPassword').value,
        });
        Session.setToken(data.token);
        Session.setUser(data.user);
        UI.toast('Akaun rakan berjaya didaftarkan!', 'ok');
        Router.go('partner-dashboard');
      } catch (err) {
        box.innerHTML = UI.notice(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Daftar Akaun Rakan';
      }
    });
  };

  /* ============ Dashboard Rakan ============ */
  window.viewPartnerDashboard = function () {
    if (!guard()) return '';
    return UI.page('Panel Rakan', 'Pantau slot dan tempahan yang akan datang.',
      `
      <div id="ptStats"></div>
      <div id="ptBookings"><div class="empty">Memuatkan tempahan...</div></div>
      <div id="ptSlots" style="margin-top:20px;"><div class="empty">Memuatkan slot...</div></div>`,
      { eyebrow: 'Penyeliaan' });
  };

  window.ViewHooks.viewPartnerDashboard = async function () {
    if (!guard()) return;
    let slots = [], bookings = [];
    try {
      const [s, b] = await Promise.all([
        API.partner.dashboard(),
        API.bookings.partnerList().catch(() => ({ bookings: [] })),
      ]);
      slots = (s && s.slots) || [];
      bookings = (b && b.bookings) || [];
    } catch (e) {
      document.getElementById('ptBookings').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const confirmed = bookings.filter(x => x.status === 'confirmed' || x.status === 'completed');
    const today = UI.todayISO();
    const todayCount = confirmed.filter(x => x.slotDate === today).length;
    const venues = new Set(bookings.map(x => x.locationName)).size;

    document.getElementById('ptStats').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><b>${confirmed.length}</b><span>Tempahan Sah (7 hari)</span></div>
        <div class="stat-card"><b>${todayCount}</b><span>Persembahan Hari Ini</span></div>
        <div class="stat-card"><b>${venues}</b><span>Lokasi Aktif</span></div>
        <div class="stat-card"><b>${slots.length}</b><span>Slot Jadual (7 hari)</span></div>
      </div>`;

    const box = document.getElementById('ptBookings');
    if (!bookings.length) {
      box.innerHTML = '<div class="empty" style="padding:24px;"><div class="e-ico">🎤</div><p>Tiada tempahan akan datang.</p></div>';
    } else {
      box.innerHTML = `
        <div class="panel" style="margin-top:0;">
          <h3>Tempahan Akan Datang</h3>
          <div class="table-wrap" style="margin-top:14px;">
            <table class="data">
              <thead><tr><th>Tarikh</th><th>Masa</th><th>Lokasi</th><th>Busker</th><th>Telefon</th><th>Status</th></tr></thead>
              <tbody>
                ${bookings.map(b => `
                  <tr>
                    <td>${UI.dateLabel(b.slotDate)}</td>
                    <td>${UI.esc(b.startTime)} – ${UI.esc(b.endTime)}</td>
                    <td>${UI.esc(b.locationName)}</td>
                    <td>${b.buskerStageName ? '🎤 ' + UI.esc(b.buskerStageName) : '<small style="color:var(--muted-2)">—</small>'}</td>
                    <td>${UI.esc(b.buskerPhone || '—')}</td>
                    <td><span class="st st-${UI.esc(b.status)}">${UI.esc(b.status)}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }

    const slotBox = document.getElementById('ptSlots');
    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
    if (!Object.keys(byDate).length) {
      slotBox.innerHTML = '<div class="empty" style="padding:24px;"><div class="e-ico">📅</div><p>Tiada slot dalam 7 hari akan datang.</p></div>';
    } else {
      slotBox.innerHTML = Object.keys(byDate).sort().map(date => `
        <div class="panel">
          <h3 style="font-size:16px;">${UI.dateLabel(date)}</h3>
          <div class="table-wrap" style="margin-top:12px;">
            <table class="data">
              <thead><tr><th>Masa</th><th>Lokasi</th><th>Busker</th><th>Status</th><th>Tindakan</th></tr></thead>
              <tbody>
                ${byDate[date].map(s => `
                  <tr>
                    <td>${UI.esc(s.startTime)} – ${UI.esc(s.endTime)}</td>
                    <td>${UI.esc(s.locationName)} · <small style="color:var(--muted)">${UI.esc(s.area || '')}</small></td>
                    <td>${s.stageName ? '🎤 ' + UI.esc(s.stageName) : '<small style="color:var(--muted-2)">Terbuka</small>'}</td>
                    <td><span class="st st-${UI.esc(s.status)}">${UI.esc(s.status)}</span></td>
                    <td>
                      <select class="select st-select" data-slot="${s.id}" style="width:140px;padding:7px 12px;font-size:12.5px;">
                        ${SLOT_STATUS.map(o => `<option ${o === s.status ? 'selected' : ''}>${o}</option>`).join('')}
                      </select>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`).join('');

      slotBox.querySelectorAll('.st-select').forEach(sel => sel.addEventListener('change', async () => {
        try {
          await API.partner.setStatus({ slotId: Number(sel.dataset.slot), status: sel.value });
          UI.toast('Status slot dikemas kini.', 'ok');
          Router.replace('partner-dashboard');
        } catch (e) {
          UI.toast(e.message, 'err');
          Router.replace('partner-dashboard');
        }
      }));
    }
  };
})();