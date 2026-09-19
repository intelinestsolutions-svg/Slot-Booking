(function () {
  window.viewSlotBooking = function (q) {
    const user = Session.user || {};
    if (!user || user.role !== 'busker') {
      Router.go('login', { next: 'slot-booking' });
      return '';
    }
    if (user.role === 'busker' && user.verificationStatus !== 'approved') {
      return UI.page('Tempah Slot', 'Gagal memuatkan.',
        UI.notice('Akaun anda belum diluluskan admin. Slot hanya boleh ditempah selepas kelulusan.', 'info'));
    }

    const isDirect = q.slotId ? true : false;

    return UI.page('Tempah Slot', 'Pilih tarikh dan sesi persembahan anda.',
      `
      <a href="?page=cari-slot" style="display:inline-block;margin-bottom:18px;color:var(--muted);font-weight:700;">← Kembali ke Cari Slot</a>
      <div id="locHead" class="card" style="margin-bottom:20px;">
        <div class="empty">Memuatkan lokasi...</div>
      </div>
      ${isDirect ? '' : `
      <div id="dayPills" class="cal-row"></div>
      <div id="slotList"><div class="empty">Memilih tarikh...</div></div>
      `}
      <div id="directSlot"></div>
      `,
      { eyebrow: 'Tempahan slot mingguan' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewSlotBooking = async function (q) {
    const user = Session.user;
    if (!user || user.role !== 'busker') return;

    const locationId = q.locationId;
    if (!locationId) {
      const box = document.getElementById('locHead');
      if (box) box.innerHTML = UI.notice('Lokasi tidak diberikan.', 'error');
      return;
    }

    let data;
    try {
      data = await API.locations.overview(locationId, 14);
    } catch (e) {
      const box = document.getElementById('locHead');
      if (box) box.innerHTML = UI.notice(e.message, 'error');
      UI.toast(e.message, 'err');
      return;
    }

    const loc = data.location;
    const avail = data.availability || [];

    const head = document.getElementById('locHead');
    head.innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${UI.badge(loc.tier)}
            <span style="font-size:12.5px;color:var(--muted);font-weight:700;">📍 ${UI.esc(loc.area)}, ${UI.esc(loc.city)}</span>
          </div>
          <h3 style="margin:8px 0 6px;font-size:26px;">${UI.esc(loc.name)}</h3>
          <p style="color:var(--muted);font-size:13.5px;">${UI.esc(loc.description || '')}</p>
          <p style="color:var(--gold);font-size:12.5px;margin-top:8px;font-weight:700;">PBT: ${UI.esc(loc.pbt || 'DBKK')} · Slot dibuka 14 hari akan datang</p>
        </div>
      </div>`;

    if (q.slotId) {
      const box = document.getElementById('directSlot');
      box.innerHTML = '<div class="empty">Memuatkan slot...</div>';
      try {
        const r = await API.locations.booking(q.slotId);
        box.innerHTML = slotCard(r.slot, true);
        box.querySelector('[data-book]')?.addEventListener('click', () => confirmBook(r.slot));
      } catch (e) {
        box.innerHTML = UI.notice(e.message, 'error');
      }
      return;
    }

    const pills = document.getElementById('dayPills');
    const list = document.getElementById('slotList');

    pills.innerHTML = avail.map((a, i) => `
      <div class="day-pill ${i === 0 ? 'active' : ''}" data-date="${a.date}">
        <span>${UI.esc(LOCALE.dayShort[new Date(a.date + 'T00:00:00').getDay()])}</span>
        <b>${new Date(a.date + 'T00:00:00').getDate()}</b>
        <small>${UI.esc(LOCALE.monthShort[new Date(a.date + 'T00:00:00').getMonth()])}</small>
      </div>`).join('');

    const renderDate = (date) => {
      const day = avail.find(a => a.date === date);
      if (!day) {
        list.innerHTML = `<div class="empty"><div class="e-ico">🌙</div><p>Tiada slot pada tarikh ini.</p></div>`;
        return;
      }
      const available = day.slots.filter(s => s.status === 'Tersedia');
      const booked = day.slots.filter(s => s.status !== 'Tersedia');

      let html = '';
      if (available.length) {
        html += `<h3 style="margin:6px 0 12px;font-size:18px;">Slot Tersedia</h3><div class="slot-grid">${available.map(s => slotCard(s)).join('')}</div>`;
      } else {
        html += `<div class="empty" style="padding:26px 12px;"><div class="e-ico">📭</div><p>Semua slot untuk ${UI.esc(UI.dateLabel(date))} telah ditempah.</p></div>`;
      }
      if (booked.length) {
        html += `<h3 style="margin:24px 0 12px;font-size:16px;color:var(--muted);">Sudah Ditempah</h3><div class="slot-grid">${booked.map(s => slotCard(s, false)).join('')}</div>`;
      }
      list.innerHTML = html;

      list.querySelectorAll('[data-book]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.book);
          const slot = day.slots.find(s => s.id === id);
          if (slot) confirmBook(slot);
        });
      });
    };

    function slotCard(s, interactive = true) {
      const session = s.sessionLabel ? `<span style="display:block;font-weight:600;color:var(--muted);font-size:12px;">Sesi ${UI.esc(s.sessionLabel)}</span>` : '';
      const available = s.status === 'Tersedia';
      return `
        <div class="slot-card">
          <div>
            <div class="time">${UI.esc(s.startTime)} – ${UI.esc(s.endTime)} <span>${session}${UI.dateLabel(s.date)}</span></div>
          </div>
          ${interactive && available
            ? `<button class="btn btn-primary btn-sm" data-book="${s.id}">Tempah · ${UI.money(s.price)}</button>`
            : `<span class="st st-${UI.esc(s.status)}">${UI.esc(s.status)}</span>`}
        </div>`;
    }

    document.querySelectorAll('.day-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderDate(pill.dataset.date);
      });
    });

    renderDate(avail[0] ? avail[0].date : '');

    async function confirmBook(slot) {
      if (!confirm(`Tempah slot\n${loc.name}\n${slot.startTime} – ${slot.endTime} · ${UI.dateLabel(slot.date)}\nYuran: RM ${slot.price}\n\nAnda akan diarahkan ke ToyyibPay untuk pembayaran.`)) return;

      const btn = document.createElement('div');
      btn.innerHTML = `<div class="notice notice-info"><span>Memproses bil pembayaran ToyyibPay...</span></div>`;
      list.insertAdjacentElement('beforebegin', btn.firstElementChild);

      try {
        const res = await API.bookings.create({ slotId: slot.id });
        btn.remove();
        const paymentUrl = res.paymentUrl;
        if (/^https?:\/\//.test(paymentUrl)) {
          window.location.href = paymentUrl;
        } else {
          const d = await API.bookings.verifyReturn({ billCode: res.billCode, status_id: '1', slotId: slot.id });
          UI.toast(d.message || 'Pembayaran berjaya!', 'ok');
          Router.go('tempahan-saya');
        }
      } catch (e) {
        btn.remove();
        UI.toast(e.message, 'err');
      }
    }
  };
})();