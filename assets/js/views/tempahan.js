(function () {
  const BOOKING_META = {
    pending:   { label: 'Menunggu Bayaran', cls: 'pending', icon: '⏳' },
    confirmed: { label: 'Disahkan',         cls: 'confirmed', icon: '✅' },
    completed: { label: 'Selesai',          cls: 'completed', icon: '🎸' },
    cancelled: { label: 'Dibatalkan',       cls: 'cancelled', icon: '🚫' },
  };

  window.viewTempahan = function () {
    const user = Session.user || {};
    if (!user || user.role !== 'busker') {
      Router.go('login', { next: 'tempahan-saya' });
      return '';
    }
    return UI.page('Tempahan Saya', 'Urus dan pantau tempahan slot persembahan anda.',
      `
      <div id="verifyMsg"></div>
      <div id="bookList"><div class="empty"><div class="e-ico">🎤</div><p>Memuatkan tempahan...</p></div></div>`,
      { eyebrow: 'Slot anda' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewTempahan = async function (q) {
    const user = Session.user;
    if (!user || user.role !== 'busker') return;

    const verifyMsg = document.getElementById('verifyMsg');
    if (q.verify === '1') {
      try {
        const res = await API.bookings.verifyReturn({ billCode: q.billCode || q.billcode || '', status_id: q.status_id || '1', slotId: q.slotId || '' });
        verifyMsg.innerHTML = UI.notice(res.message || 'Pembayaran berjaya! Slot telah disahkan.', 'ok');
        UI.toast(res.message || 'Pembayaran berjaya!', 'ok');
      } catch (e) {
        verifyMsg.innerHTML = UI.notice(e.message, 'error');
      }
    }

    let list = [];
    try {
      const data = await API.bookings.mine();
      list = data.bookings || [];
      const me = await API.auth.me().catch(() => null);
      if (me && me.user) Session.setUser({ ...Session.user, ...me.user });
      Nav.update();
    } catch (e) {
      document.getElementById('bookList').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const today = UI.todayISO();
    const upcoming = list
      .filter(b => b.slotDate >= today)
      .sort((a, b) => a.slotDate === b.slotDate ? a.startTime.localeCompare(b.startTime) : a.slotDate.localeCompare(b.slotDate));
    const past = list
      .filter(b => b.slotDate < today || b.status === 'cancelled')
      .sort((a, b) => b.slotDate.localeCompare(a.slotDate));

    const box = document.getElementById('bookList');

    function bookingCard(b) {
      const meta = BOOKING_META[b.status] || { label: b.status, cls: '', icon: '🎤' };
      const actions = [];

      if (b.status === 'pending') {
        actions.push(`
          <button class="btn btn-primary btn-sm" data-pay="${b.id}">Bayar Sekarang · ${UI.money(b.amount)}</button>
          <button class="btn btn-danger btn-sm" data-cancel="${b.id}">Batal</button>`);
      } else if (b.status === 'confirmed' && b.slotDate === today) {
        actions.push(`<button class="btn btn-primary btn-sm" data-attend="${b.id}">Sahkan Kehadiran</button>`);
      }

      const photo = b.attendancePhotoUrl
        ? `<a href="${UI.esc(b.attendancePhotoUrl)}" target="_blank" rel="noopener" style="color:var(--gold);font-weight:700;">Lihat gambar kehadiran</a>` : '';

      return `
        <div class="bcard">
          <div class="bc-icon">${meta.icon}</div>
          <div class="bc-main">
            <h4>${UI.esc(b.locationName)} · <span style="color:var(--gold)">${UI.esc(b.slotDate)}</span></h4>
            <p>${UI.esc(b.startTime)} – ${UI.esc(b.endTime)} · ${UI.esc(b.area || '')}${b.buskerStageName ? ' · ' + UI.esc(b.buskerStageName) : ''}</p>
            <p style="margin-top:6px;color:var(--muted-2);font-size:12px;">Bil: ${UI.esc(b.billCode || '—')}${photo ? ' · ' + photo : ''}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span class="st st-${meta.cls}">${meta.label}</span>
            <div class="bc-actions">${actions.join('')}</div>
          </div>
        </div>`;
    }

    const renderSection = (title, items) => `
      <h2 style="font-size:20px;margin:26px 0 14px;">${title} <small style="color:var(--muted);font-size:13px;">(${items.length})</small></h2>
      ${items.length ? items.map(bookingCard).join('') : `<div class="empty" style="padding:20px;"><div class="e-ico">📭</div><p>Tiada tempahan dalam senarai ini.</p></div>`}`;

    box.innerHTML = renderSection('Akan Datang', upcoming) + renderSection('Rekod Lalu', past);

    box.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Batalkan tempahan ini? Slot akan dilepaskan kepada buskers lain.')) return;
      try {
        await API.bookings.cancel({ bookingId: Number(btn.dataset.cancel) });
        UI.toast('Tempahan dibatalkan.', 'ok');
        Router.replace('tempahan-saya');
      } catch (e) {
        UI.toast(e.message, 'err');
      }
    }));

    box.querySelectorAll('[data-pay]').forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Memproses bil...';
      try {
        const res = await API.bookings.pay({ bookingId: Number(btn.dataset.pay) });
        window.location.href = res.paymentUrl;
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Bayar Sekarang';
        UI.toast(e.message, 'err');
      }
    }));

    box.querySelectorAll('[data-attend]').forEach(btn => btn.addEventListener('click', async () => {
      const url = (prompt('Pautan gambar kehadiran (URL foto) — contoh: https://...') || '').trim();
      if (!url) return;
      btn.disabled = true;
      try {
        await API.bookings.confirmAttendance({ bookingId: Number(btn.dataset.attend), photoUrl: url });
        UI.toast('Kehadiran disahkan!', 'ok');
        Router.replace('tempahan-saya');
      } catch (e) {
        btn.disabled = false;
        UI.toast(e.message, 'err');
      }
    }));
  };
})();