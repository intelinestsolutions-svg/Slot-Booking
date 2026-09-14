(function () {
  function guard() {
    const u = Session.user;
    const okRole = u && (u.role === 'partner' || u.role === 'admin');
    if (!okRole) {
      Router.go('login', { next: 'partner-dashboard' });
      return null;
    }
    return u;
  }

  const TABS = [
    ['partner-dashboard', 'Dashboard'],
    ['partner-schedule', 'Jadual'],
    ['partner-settings', 'Tetapan'],
    ['partner-complaints', 'Aduan'],
  ];

  function tabBar(page) {
    return `
      <div class="tabbar" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
        ${TABS.map(([p, label]) => `
          <a class="chip ${p === page ? 'active' : ''}" href="?page=${p}">${label}</a>`).join('')}
      </div>`;
  }

  window.viewPartner = function (q) {
    if (!guard()) return '';
    const page = q.page || 'partner-dashboard';
    const titles = {
      'partner-dashboard': ['Dashboard Penyelia', 'Ringkasan slot & persembahan 7 hari akan datang.'],
      'partner-schedule': ['Jadual Slot', 'Jadual slot mengikut hari untuk penyeliaan.'],
      'partner-complaints': ['Aduan & Sokongan', 'Lapor isu lokasi atau busker kepada admin.'],
      'partner-settings': ['Tetapan Penyelia', 'Kemas kini profil akaun penyelia anda.'],
    };
    const [t, s] = titles[page] || ['Dashboard Penyelia', ''];
    return UI.page(t, s, tabBar(page) + `<div id="partnerBody"><div class="empty">Memuatkan...</div></div>`, { eyebrow: 'Panel penyelia' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewPartner = async function (q) {
    if (!guard()) return;
    const page = q.page || 'partner-dashboard';
    const body = document.getElementById('partnerBody');

    if (page === 'partner-settings') {
      renderSettings(body);
      return;
    }
    if (page === 'partner-complaints') {
      body.innerHTML = `
        ${UI.notice('Untuk aduan berkaitan keselamatan lokasi, kehadiran busker atau isu pembayaran, sila emel hello@sbcbooking.my. Pasukan kami menyemak dalam 24 jam.', 'info')}
        <div class="panel" style="margin-top:16px;">
          <h3>Panduan Penyelia</h3>
          <p style="color:var(--muted);font-size:13.5px;margin-top:8px;">
            • Sahkan kehadiran busker pada slot yang ditempah.<br>
            • Tandakan slot sebagai Selesai selepas persembahan tamat.<br>
            • Batal slot hanya jika terdapat isu atau busker tidak hadir.<br>
            • Hubungi admin untuk sebarang kecemasan atau perubahan lokasi.
          </p>
        </div>`;
      return;
    }

    let slots = [];
    try {
      const r = await API.partner.dashboard();
      slots = r.slots || [];
    } catch (e) {
      body.innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const booked = slots.filter(s => s.stageName);
    const avail = slots.filter(s => !s.stageName && s.status === 'Tersedia');
    const total = slots.length;

    let html = '';
    if (page === 'partner-dashboard') {
      html = `
        <div class="stat-grid">
          <div class="stat-card"><b>${total}</b><span>Jumlah Slot (7 hari)</span></div>
          <div class="stat-card"><b>${booked.length}</b><span>Ditempah</span></div>
          <div class="stat-card"><b>${avail.length}</b><span>Terbuka</span></div>
          <div class="stat-card"><b>${booked.reduce((s, x) => s + (Number(x.price) || 0), 0)}</b><span>Nilai Tempahan (RM)</span></div>
        </div>
        ${renderSlots(slots, 'Jadual Akan Datang')}`;
    } else {
      html = renderSlots(slots, 'Jadual Mengikut Hari');
    }
    body.innerHTML = html;

    body.querySelectorAll('[data-setstatus]').forEach(btn => btn.addEventListener('click', async () => {
      const { slot, status } = btn.dataset;
      if (!slot) return;
      if (!confirm(`Tukar status slot ke "${status}"?`)) return;
      try {
        await API.partner.setStatus({ slotId: Number(slot), status });
        UI.toast('Status slot dikemas kini.', 'ok');
        Router.replace(page);
      } catch (e) {
        UI.toast(e.message, 'err');
      }
    }));
  };

  function renderSlots(slots, title) {
    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
    const dates = Object.keys(byDate).sort();

    let html = `<h2 style="font-size:20px;margin:22px 0 14px;">${title}</h2>`;
    if (!dates.length) {
      return html + '<div class="empty">Tiada slot dijadualkan dalam 7 hari ini.</div>';
    }
    html += dates.map(date => `
      <div class="panel" style="margin-top:14px;">
        <h3 style="font-size:17px;">${UI.dateLabel(date)}</h3>
        <div style="margin-top:10px;">
          ${byDate[date].map(s => {
            const busker = s.stageName ? '🎤 ' + UI.esc(s.stageName) : '<small style="color:var(--muted-2)">Terbuka</small>';
            let actions = '';
            if (s.stageName) actions = `
              <button class="btn btn-primary btn-sm" data-setstatus data-status="Selesai" data-slot="${s.id}">Selesai</button>
              <button class="btn btn-danger btn-sm" data-setstatus data-status="Dibatalkan" data-slot="${s.id}">Batal</button>`;
            return `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px dashed var(--line);flex-wrap:wrap;align-items:center;">
                <span style="font-weight:700;color:var(--gold);min-width:110px;">${UI.esc(s.startTime)} – ${UI.esc(s.endTime)}</span>
                <span style="flex:1;min-width:160px;">${UI.esc(s.locationName)} · <small style="color:var(--muted)">${UI.esc(s.area || '')}</small></span>
                <span>${busker}</span>
                <span class="st st-${UI.esc(s.status)}">${UI.esc(s.status)}</span>
                <span style="display:flex;gap:8px;flex-wrap:wrap;">${actions}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');
    return html;
  }

  async function renderSettings(body) {
    let u = Session.user || {};
    try {
      const r = await API.auth.me();
      u = r.user || {};
      Session.setUser({ ...Session.user, ...u });
    } catch (e) { /* use session */ }

    body.innerHTML = `
      <div class="panel">
        <h3>Profil Penyelia</h3>
        <form id="spForm" style="margin-top:14px;">
          <div id="spNotice"></div>
          <div class="form-grid">
            <div class="field"><label for="spName">Nama / Organisasi</label><input class="input" id="spName" value="${UI.esc(u.fullName || '')}"></div>
            <div class="field"><label for="spPhone">Telefon</label><input class="input" id="spPhone" value="${UI.esc(u.phone || '')}"></div>
            <div class="field span-2"><label for="spCity">Bandar</label><input class="input" id="spCity" value="${UI.esc(u.city || '')}"></div>
          </div>
          <button class="btn btn-primary" type="submit" style="margin-top:10px;">Simpan</button>
        </form>
      </div>
      <div class="panel">
        <h3>Tukar Kata Laluan</h3>
        <form id="spPass" style="margin-top:14px;max-width:460px;">
          <div id="spPwNotice"></div>
          <div class="field"><label for="spCur">Kata Laluan Semasa</label><input class="input" type="password" id="spCur"></div>
          <div class="field" style="margin-top:12px;"><label for="spNew">Kata Laluan Baru</label><input class="input" type="password" id="spNew"></div>
          <button class="btn btn-ghost" type="submit" style="margin-top:12px;">Tukar</button>
        </form>
      </div>`;

    document.getElementById('spForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const r = await API.auth.updateProfile({
          fullName: document.getElementById('spName').value.trim(),
          phone: document.getElementById('spPhone').value.trim(),
          city: document.getElementById('spCity').value.trim(),
        });
        Session.setUser({ ...Session.user, ...(r.user || {}) });
        UI.toast('Profil dikemas kini.', 'ok');
        Router.replace('partner-settings');
      } catch (err) {
        document.getElementById('spNotice').innerHTML = UI.notice(err.message, 'error');
      }
    });

    document.getElementById('spPass').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.auth.changePassword({
          current: document.getElementById('spCur').value,
          new: document.getElementById('spNew').value,
        });
        document.getElementById('spPwNotice').innerHTML = UI.notice('Kata laluan ditukar.', 'ok');
        document.getElementById('spCur').value = '';
        document.getElementById('spNew').value = '';
      } catch (err) {
        document.getElementById('spPwNotice').innerHTML = UI.notice(err.message, 'error');
      }
    });
  }
})();