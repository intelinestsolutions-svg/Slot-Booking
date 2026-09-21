(function () {
  const TZ = '+08:00';
  const PRAYER_MS = {
    Fajr: 'Subuh', Dhuhr: 'Zuhur', Asr: 'Asar', Maghrib: 'Maghrib', Isha: 'Isyak',
    'Fajr (esok)': 'Subuh (esok)',
  };

  function now() { return Date.now(); }
  function atYmdHm(date, time) { return Date.parse(date + 'T' + time + TZ); }

  function fmtDur(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}h ${h}m`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  }
  function fmtClock(ms) {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function nativeNotifier() {
    return window.APP.isNative && window.Capacitor && window.Capacitor.Plugins &&
      window.Capacitor.Plugins.Notifier ? window.Capacitor.Plugins.Notifier : null;
  }

  async function notify(title, body) {
    try { UI.toast(`${title} — ${body}`, 'gold'); } catch (e) {}
    const N = nativeNotifier();
    if (N) {
      try { await N.notify({ title, body }); return; } catch (e) {}
    }
    if (window.Notification && Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: 'assets/img/sbc-logo.png' }); } catch (e) {}
    }
  }

  async function scheduleNative(id, when, title, body) {
    const N = nativeNotifier();
    if (!N || !when || when <= Date.now()) return;
    try { await N.schedule({ id: String(id), date: Math.round(when), title, body }); } catch (e) {}
  }

  window.Reminders = {
    _t: null,
    _lease: 0,
    _prayerDate: null,
    _prayer: null,
    _notified: {},

    ensure() {
      const u = Session.user;
      const want = u && u.role === 'busker' && u.verificationStatus === 'approved';
      if (!want) {
        if (window.__reminderLease) window.__reminderLease++;
        return;
      }
      if (this._t) return;
      this._t = setInterval(() => this.tick(), 30000);
      this.tick();
    },

    async tick() {
      const u = Session.user;
      if (!u || u.role !== 'busker' || u.verificationStatus !== 'approved') return;

      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuching' });
      if (this._prayerDate !== today || !this._prayer) {
        try {
          this._prayer = await API.prayer.today();
          this._prayerDate = today;
        } catch (e) { /* retry next tick */ }
      }

      if (this._prayer) {
        this._prayerTick();
        this._schedulePrayers();
      }

      try {
        const r = await API.bookings.mine();
        this._slotTick(r.bookings || []);
      } catch (e) { /* silent */ }
    },

    _schedulePrayers() {
      const p = this._prayer;
      const d = this._prayerDate;
      if (!p || !d) return;
      const midnight = atYmdHm(d, '00:00');
      (p.prayers || []).forEach(pr => {
        const key = 'sch:prayer:' + pr.name + ':' + d;
        if (this._notified[key] === true) return;
        const isTomorrow = /esok/i.test(pr.name || '');
        const when = isTomorrow && pr.minutes
          ? midnight + pr.minutes * 60000
          : atYmdHm(d, pr.time);
        if (when && when > now()) {
          this._notified[key] = true;
          scheduleNative(key, when, 'Waktu Solat',
            `Telah masuk waktu solat ${PRAYER_MS[pr.name] || pr.name}. Jika anda sedang busking, sila berhenti seketika.`);
        }
      });
    },

    _prayerTick() {
      const p = this._prayer;
      const el = document.getElementById('prayerNowBar');
      if (el) {
        el.innerHTML = p.active
          ? `${PRAYER_MS[p.active] || p.active} — hentikan busking seketika`
          : '';
        el.style.display = p.active ? 'flex' : 'none';
      }
      if (p.active && this._notified['prayer:' + p.due.name + ':' + this._prayerDate] !== true) {
        this._notified['prayer:' + p.due.name + ':' + this._prayerDate] = true;
        notify('Waktu solat', `Telah masuk waktu solat ${PRAYER_MS[p.active] || p.active}. Jika anda sedang busking, sila berhenti seketika.`);
      }
    },

    _slotTick(bookings) {
      const nowMs = now();
      bookings.forEach(b => {
        if (b.status !== 'confirmed') return;
        const start = atYmdHm(b.slotDate, b.startTime);
        const m60 = start - 3600000;
        const m15 = start - 900000;
        if (nowMs < start && nowMs >= m60) {
          const k = '60m:' + b.id;
          if (!this._notified[k]) {
            this._notified[k] = true;
            notify('Persembahan', `Persembahan anda di ${b.locationName} akan bermula dalam masa 1 jam.`);
            scheduleNative(k, m60, 'Persembahan', `Persembahan anda di ${b.locationName} akan bermula dalam masa 1 jam.`);
          }
        } else if (nowMs < start && nowMs >= m15) {
          const k = '15m:' + b.id;
          if (!this._notified[k]) {
            this._notified[k] = true;
            notify('Persediaan', 'Sila bersedia, masa setup anda akan bermula dalam 15 minit.');
            scheduleNative(k, m15, 'Waktu Setup', 'Sila bersedia, masa setup anda akan bermula dalam 15 minit.');
          }
        }
      });
    },
  };

  /* ============ Halaman Persediaan & Waktu Solat ============ */
  window.viewBersedia = function () {
    return UI.page('Persediaan Slot', 'Bersedia untuk persembahan dan semak waktu solat Kota Kinabalu.',
      `
      <div id="prayerNowBar" class="notice notice-gold" style="display:none;"></div>
      <div class="grid-2" style="margin-top:20px;align-items:start;">
        <article class="card" id="bersediaNext"><div class="empty">Memuatkan slot...</div></article>
        <article class="card" id="bersediaPrayer"><div class="empty">Memuatkan waktu solat...</div></article>
      </div>
      <div class="panel" style="margin-top:18px;">
        <h3>Pemberitahuan</h3>
        <p style="color:var(--muted);font-size:14px;margin:6px 0;">Aktifkan pemberitahuan penyemak imbas supaya anda menerima amaran 1 jam &amp; 15 minit sebelum slot bermula, walaupun aplikasi tidak dibuka penuh.</p>
        <button class="btn btn-primary mt" id="notifBtn">Aktifkan Pemberitahuan</button>
        <div id="soundRow" style="display:none;margin-top:12px;">
          <button class="btn btn-outline" id="soundBtn">Pilih Bunyi Pemberitahuan (Bunyi Peranti)</button>
          <p id="soundLabel" style="color:var(--muted-2);font-size:12px;margin-top:6px;"></p>
        </div>
      </div>`,
      { eyebrow: 'Kawalan Masa' });
  };

  async function renderNext(slots) {
    const nowMs = now();
    const upcoming = (slots || [])
      .filter(b => b.status === 'confirmed' && atYmdHm(b.slotDate, b.startTime) > nowMs)
      .sort((a, b) => atYmdHm(a.slotDate, a.startTime) - atYmdHm(b.slotDate, b.startTime));

    const box = document.getElementById('bersediaNext');
    if (!box) return;
    if (!upcoming.length) {
      box.innerHTML = '<div class="e-ico">🎤</div><h3 style="margin-top:8px;">Tiada slot akan datang</h3><p style="color:var(--muted);font-size:14px;margin-top:6px;">Tempah slot anda untuk melihat kiraan masa di sini.</p>';
      if (box.__timer) clearInterval(box.__timer);
      return;
    }

    const b = upcoming[0];
    const start = atYmdHm(b.slotDate, b.startTime);
    const end = atYmdHm(b.slotDate, b.endTime);

    function paint() {
      const left = start - now();
      const phase = left <= 0 ? 'sedang berlangsung' : left <= 900000 ? 'sedia — setup!' : left <= 3600000 ? 'dalam masa 1 jam' : 'akan datang';
      box.innerHTML = `
        <div class="e-ico" style="font-size:34px;">🎼</div>
        <h3 style="margin-top:6px;">${UI.esc(b.locationName || '')}</h3>
        <p style="color:var(--muted);font-size:13.5px;">${UI.esc(b.slotDate.replace(/-/g, ' / '))} · ${UI.esc(b.startTime)} – ${UI.esc(b.endTime)}</p>
        <div class="soon" style="font-size:38px;font-weight:800;color:var(--gold);font-variant-numeric:tabular-nums;margin:10px 0 2px;">${left > 0 ? fmtDur(left) : fmtClock(end - now())}</div>
        <p style="color:${phase.startsWith('sedia') ? 'var(--err)' : 'var(--muted)'};font-size:13.5px;font-weight:700;">${phase}</p>`;
    }
    paint();
    if (!box.__timer) box.__timer = setInterval(paint, 1000);
  }

  async function renderPrayer(p, box) {
    const nowMs = now();
    const rows = (p.prayers || []).map(pr => {
      const isActive = p.active === pr.name;
      const isNext = p.next && p.next.name === pr.name && !isActive;
      return `
        <div class="prayer-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid ${isActive ? 'var(--amber)' : 'var(--line)'};border-radius:12px;margin-top:8px;background:${isActive ? 'rgba(255,170,60,0.08)' : 'transparent'};${isNext ? 'box-shadow:inset 3px 0 0 var(--gold);' : ''}">
          <span style="font-weight:700;color:${isActive ? 'var(--amber)' : 'var(--cream)'};">${PRAYER_MS[pr.name] || pr.name}</span>
          <span style="font-variant-numeric:tabular-nums;font-weight:800;color:var(--gold);">${UI.esc(pr.time)}</span>
        </div>`;
    }).join('');

    box.innerHTML = `
      <div class="e-ico" style="font-size:30px;">🕌</div>
      <h3 style="margin-top:6px;">Waktu Solat — Kota Kinabalu</h3>
      ${p.next || p.active ? `<p style="color:var(--muted);font-size:13px;margin-top:4px;">${p.active ? 'Sekarang: <b style="color:var(--amber)">' + (PRAYER_MS[p.active] || p.active) + '</b>' : 'Seterusnya: <b style="color:var(--gold)">' + (PRAYER_MS[p.next.name] || p.next.name) + ' · ' + p.next.time + '</b>'}</p>` : ''}
      <div style="margin-top:4px;">${rows}</div>
      <p style="color:var(--muted-2);font-size:12px;margin-top:10px;">Anggaran waktu biasa * ${p.source === 'aladhan' ? 'Aladhan API' : p.source === 'cached' ? 'Aladhan (tersimpan)' : 'anggaran statik'}</p>`;
  }

  window.ViewHooks = window.ViewHooks || {};
  window.ViewHooks.viewBersedia = async function () {
    const nextBox = document.getElementById('bersediaNext');
    const prayerBox = document.getElementById('bersediaPrayer');
    if (!nextBox || !prayerBox) return;

    // Waktu solat = data awam (prayer.php tidak memerlukan log masuk).
    // Jangan biarkan isu sesi slot menutup kad ini.
    try {
      const pr = await API.prayer.today();
      renderPrayer(pr, prayerBox);
      Reminders._prayer = pr;
    } catch (e) {
      prayerBox.innerHTML = UI.notice(e.message, 'error');
    }

    // Slot akan datang memerlukan log masuk; sekali cuba segarkan sesi jika token lapuk.
    const loadBookings = async () => {
      try {
        const mine = await API.bookings.mine();
        renderNext(mine.bookings);
      } catch (e) {
        const user = Session.user;
        if (user && /log masuk/i.test(e.message || '')) {
          try {
            const me = await API.auth.me();
            if (me && me.user) Session.setUser(me.user);
            const retry = await API.bookings.mine();
            renderNext(retry.bookings);
            return;
          } catch (e2) {
            renderSlotsLoginError(nextBox);
            return;
          }
        }
        renderSlotsLoginError(nextBox);
      }
    };
    await loadBookings();

    function renderSlotsLoginError(box) {
      box.innerHTML = '<div class="e-ico" style="font-size:30px;">🔐</div>' +
        '<h3 style="margin-top:8px;">Sila log masuk semula</h3>' +
        '<p style="color:var(--muted);font-size:14px;margin-top:6px;">Sesi anda telah tamat. Tekan butang di bawah untuk log masuk supaya slot akan datang dapat dipaparkan.</p>' +
        '<button class="btn btn-primary mt" onclick="location.href=\'?page=login&next=bersedia\'">Log Masuk</button>';
    }

    document.getElementById('notifBtn').addEventListener('click', async () => {
      const N = nativeNotifier();
      if (N) {
        const st = await N.status().catch(() => ({ granted: false }));
        if (st && st.granted) {
          UI.toast('Pemberitahuan sudah diaktifkan.', 'ok');
          return;
        }
        await N.request().catch(() => {});
        const st2 = await N.status().catch(() => ({ granted: false }));
        UI.toast(st2 && st2.granted ? 'Pemberitahuan diaktifkan!' : 'Pemberitahuan tidak dibenarkan.', st2 && st2.granted ? 'ok' : 'warn');
        afterNotif();
        return;
      }
      if (!('Notification' in window)) {
        UI.toast('Pelayar anda tidak menyokong pemberitahuan.', 'warn');
        return;
      }
      const perm = await Notification.requestPermission();
      UI.toast(perm === 'granted' ? 'Pemberitahuan diaktifkan!' : 'Pemberitahuan tidak dibenarkan.', perm === 'granted' ? 'ok' : 'warn');
      afterNotif();
    });

    const soundRow = document.getElementById('soundRow');
    const soundLabel = document.getElementById('soundLabel');
    let lastSoundTitle = '';
    function afterNotif() {
      if (soundRow && nativeNotifier()) {
        soundRow.style.display = 'block';
        renderSoundLabel();
      }
    }
    async function renderSoundLabel() {
      if (!soundLabel) return;
      const N = nativeNotifier();
      if (!N) return;
      const s = await N.getSound().catch(() => null);
      const isSilent = s && (s.silent === true || s.uri === '');
      soundLabel.textContent = isSilent
        ? 'Bunyi: Senyap (tanpa bunyi).'
        : (lastSoundTitle && s && s.uri ? `Bunyi: ${lastSoundTitle}` : (s && s.uri ? 'Bunyi tersuai dipilih.' : 'Bunyi: Lalai sistem (penggera kuat).'));
    }
    function openSoundPicker(N) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Pilih bunyi pemberitahuan');
      modal.innerHTML =
        '<div class="modal-head"><h3>Pilih Bunyi Pemberitahuan</h3><button class="modal-x" aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body"><p style="color:var(--muted);font-size:13px;margin-bottom:12px;">Ketuk bunyi untuk pratonton, kemudian tekan "Guna" untuk memilihnya.</p><div class="sound-list"></div></div>';
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      let selected = null;
      function close(stopPreview) {
        if (stopPreview !== false) N.stopPreview().catch(() => {});
        overlay.remove();
      }
      modal.querySelector('.modal-x').addEventListener('click', () => close());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

      const list = modal.querySelector('.sound-list');
      if (!list) return;
      let sList = { sounds: [] };
      let sCur = { uri: '', default: true, silent: false };
      N.listSounds().catch(() => sList).then(r => { sList = r; render(); });
      N.getSound().catch(() => sCur).then(r => { sCur = r; render(); });
      render();

      function render() {
        list.innerHTML = '';
        let anyRendered = 0;
        addOption('Lalai — Penggera Kuat', 'default', '');
        addOption('Senyap — Tanpa Bunyi', 'silent', '');
        (sList.sounds || []).forEach(sd => {
          if (sd && sd.uri) { addOption(sd.title || 'Bunyi peranti', 'custom', sd.uri); anyRendered++; }
        });
        const pick = document.createElement('div');
        pick.style.cssText = 'display:flex;gap:10px;margin-top:16px;';
        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-primary';
        useBtn.textContent = 'Guna';
        useBtn.style.cssText = 'flex:1;';
        pick.appendChild(useBtn);
        list.appendChild(pick);
        useBtn.addEventListener('click', async () => {
          if (!selected) return;
          const { mode, uri } = selected;
          await N.setSound({ mode, uri: uri || '' }).catch(() => null);
          close(false);
          UI.toast(mode === 'silent' ? 'Bunyi ditetapkan kepada senyap.' : 'Bunyi pemberitahuan dikemas kini.', 'ok');
          renderSoundLabel();
        });
      }

      function addOption(label, mode, uri) {
        const row = document.createElement('button');
        row.type = 'button';
        row.style.cssText = 'display:block;width:100%;text-align:left;padding:11px 14px;margin-top:8px;border:1px solid var(--line);border-radius:12px;background:var(--card, rgba(255,255,255,0.06));color:var(--cream);font:inherit;font-size:14px;cursor:pointer;';
        row.textContent = label;
        const isSelected = mode === 'default' ? (sCur.default && !sCur.silent)
          : mode === 'silent' ? (!!sCur.silent)
          : (!sCur.default && !sCur.silent && sCur.uri === uri);
        if (isSelected) {
          selected = { mode, uri };
          row.style.borderColor = 'var(--gold)';
          row.style.background = 'rgba(255,170,60,0.12)';
          row.textContent = '✓ ' + label;
        }
        row.addEventListener('click', async () => {
          selected = { mode, uri };
          [...list.querySelectorAll('button')].forEach(b => { b.style.borderColor = 'var(--line)'; b.style.background = 'var(--card, rgba(255,255,255,0.06))'; b.textContent = b.textContent.replace(/^✓ /, ''); });
          row.style.borderColor = 'var(--gold)';
          row.style.background = 'rgba(255,170,60,0.12)';
          row.textContent = '✓ ' + label;
          if (mode === 'custom' && uri) {
            lastSoundTitle = label;
            N.previewSound({ uri }).catch(() => {});
          } else {
            N.stopPreview().catch(() => {});
          }
        });
        list.appendChild(row);
      }
    }
    const sbBtn = document.getElementById('soundBtn');
    if (sbBtn) {
      sbBtn.addEventListener('click', async () => {
        const N = nativeNotifier();
        if (!N) {
          UI.toast('Hanya tersedia dalam aplikasi Android.', 'warn');
          return;
        }
        const st = await N.status().catch(() => ({ granted: false }));
        if (!st || !st.granted) {
          UI.toast('Aktifkan pemberitahuan dahulu.', 'warn');
          return;
        }
        openSoundPicker(N);
      });
    }
    afterNotif();
  };
})();