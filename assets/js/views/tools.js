(function () {
  let modal = null;
  let metTimer = null;
  let tunerRAF = null;

  function openModal(title, bodyHtml) {
    closeModal();
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${UI.esc(title)}">
        <div class="modal-head"><h3>${UI.esc(title)}</h3><button class="modal-x" aria-label="Tutup">✕</button></div>
        <div class="modal-body">${bodyHtml}</div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.querySelector('.modal-x').addEventListener('click', closeModal);
    document.body.appendChild(modal);
  }

  function closeModal() {
    if (metTimer) { clearInterval(metTimer); metTimer = null; }
    if (tunerRAF) { cancelAnimationFrame(tunerRAF); tunerRAF = null; }
    if (modal) { modal.remove(); modal = null; }
  }
  window.addEventListener('popstate', closeModal);

  window.viewTools = function () {
    return UI.page('Alatan Busker', 'Alatan berguna untuk amalan dan persembahan harian anda.',
      `
      <div class="tools-grid">
        <div class="card tool-tile" data-tool="tuner"><div class="ico">🎛️</div><h3>Penala Gitar</h3><p>Laras gitar atau ukulele anda menggunakan mikrofon.</p></div>
        <div class="card tool-tile" data-tool="metronome"><div class="ico">⏱️</div><h3>Metronom</h3><p>Kekalkan tempo yang konsisten semasa berlatih.</p></div>
        <div class="card tool-tile" data-tool="bank"><div class="ico">🎵</div><h3>Bank Lagu</h3><p>Senarai set dan lagu penonton yang mudah dibawa.</p></div>
        <div class="card tool-tile" data-tool="gear"><div class="ico">🎒</div><h3>Senarai Semak Gear</h3><p>Pastikan semua kelengkapan dibawa sebelum keluar.</p></div>
      </div>`,
      { eyebrow: 'Kotak alat' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewTools = function () {
    document.querySelectorAll('[data-tool]').forEach(tile => {
      tile.addEventListener('click', () => {
        const t = tile.dataset.tool;
        if (t === 'tuner') showTuner();
        else if (t === 'metronome') showMetronome();
        else if (t === 'bank') showBank();
        else if (t === 'gear') showGear();
      });
    });
  };

  /* ---------------- Tuner ---------------- */
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function pitchName(freq) {
    const m = Math.round(69 + 12 * Math.log2(freq / 440));
    const fNote = 440 * Math.pow(2, (m - 69) / 12);
    const cents = 1200 * Math.log2(freq / fNote);
    const note = NOTE_NAMES[((m % 12) + 12) % 12];
    const octave = Math.floor(m / 12) - 1;
    return { note: note + octave, cents: Math.round(cents) };
  }

  function detectPitch(buf, sampleRate) {
    const W = buf.length;
    let rms = 0;
    for (let i = 0; i < W; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / W);
    if (rms < 0.01) return null;
    const MAX_T = Math.floor(sampleRate / 55);
    const MIN_T = Math.floor(sampleRate / 1200);
    const half = Math.floor(W / 2);
    const yin = new Float32Array(half);
    for (let t = 1; t < half; t++) {
      let sum = 0;
      for (let j = 0; j < W - t; j++) {
        const d = buf[j] - buf[j + t];
        sum += d * d;
      }
      yin[t] = sum;
    }
    let running = 0, tau = -1;
    for (let t = 1; t < half; t++) {
      running += yin[t];
      if (running === 0) continue;
      yin[t] = (yin[t] * t) / running;
      if (tau === -1 && t > MIN_T && t < MAX_T && yin[t] < 0.15) {
        let best = yin[t], bestT = t;
        for (let k = t + 1; k < MAX_T; k++) {
          if (yin[k] < best) { best = yin[k]; bestT = k; }
          else break;
        }
        tau = bestT;
        break;
      }
    }
    if (tau === -1 || tau <= MIN_T || tau >= MAX_T) return null;
    return sampleRate / tau;
  }

  function showTuner() {
    openModal('Penala Gitar', `
      <div class="tuner-body">
        <div class="tuner-note" id="tnNote">—</div>
        <div class="tuner-needle">
          <div class="needle" id="tnNeedle"></div>
        </div>
        <div class="tuner-freq" id="tnFreq">0 Hz</div>
        <p id="tnHint" style="color:var(--muted);font-size:13px;margin-top:14px;">Aktifkan mikrofon, kemudian mainkan satu tali sekali gus.</p>
        <button class="btn btn-primary" id="tnStart">Mula Penala</button>
      </div>`);

    const noteEl = modal.querySelector('#tnNote');
    const needleEl = modal.querySelector('#tnNeedle');
    const freqEl = modal.querySelector('#tnFreq');
    const hintEl = modal.querySelector('#tnHint');
    const startBtn = modal.querySelector('#tnStart');
    let ctx = null;

    startBtn.addEventListener('click', async () => {
      try {
        const devPerm = window.APP.isNative && window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : null;
        if (devPerm && devPerm.DevicePermission) {
          const st = await devPerm.DevicePermission.getMicrophoneStatus();
          if (st && st.granted === false) await devPerm.DevicePermission.requestMicrophone();
        }
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === 'suspended') await ctx.resume();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        hintEl.innerHTML = '<span style="color:var(--ok)">Mikrofon aktif.</span> Mainkan satu tali pada satu masa.';
        startBtn.textContent = 'Penala Berjalan…';
        startBtn.disabled = true;
        loop();
        function loop() {
          if (!modal || modal.querySelector('#tnNote') !== noteEl) return;
          analyser.getFloatTimeDomainData(buf);
          const freq = detectPitch(buf, ctx.sampleRate);
          if (freq && freq > 40) {
            const p = pitchName(freq);
            noteEl.textContent = p.note;
            freqEl.textContent = freq.toFixed(1) + ' Hz';
            needleEl.style.transform = 'rotate(' + Math.max(-48, Math.min(48, p.cents * 2)) + 'deg)';
          } else {
            noteEl.textContent = '—';
            freqEl.textContent = '…';
            needleEl.style.transform = 'rotate(0deg)';
          }
          tunerRAF = requestAnimationFrame(loop);
        }
      } catch (e) {
        const canAsk = window.APP.isNative && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.DevicePermission;
        const openSettings = canAsk
          ? '<button class="btn btn-ghost" id="tnSettings" type="button" style="margin-top:10px;width:100%;">Buka Tetapan Aplikasi</button>'
          : '';
        hintEl.innerHTML =
          '<span style="color:var(--danger)">Mikrofon tidak tersedia: ' + UI.esc(e.message) + '</span><br>' +
          '<span style="font-size:12px;">Buka Tetapan aplikasi dan benarkan akses <b>Mikrofon</b>, kemudian cuba semula.</span>' +
          (canAsk
            ? '<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">' +
              '<button class="btn btn-primary" id="tnRetry" type="button">Izinkan Mikrofon &amp; Cuba Semula</button>' + openSettings +
              '</div>'
            : '');
        const retryBtn = modal.querySelector('#tnRetry');
        if (retryBtn) retryBtn.addEventListener('click', async () => {
          retryBtn.disabled = true;
          retryBtn.textContent = 'Meminta kebenaran…';
          try { await window.Capacitor.Plugins.DevicePermission.requestMicrophone(); } catch (e2) {}
          setTimeout(() => {
            startBtn.textContent = 'Mula Penala';
            startBtn.disabled = false;
            startBtn.click();
          }, 700);
        });
        const settingsBtn = modal.querySelector('#tnSettings');
        if (settingsBtn) settingsBtn.addEventListener('click', () => {
          try { window.Capacitor.Plugins.DevicePermission.openAppSettings(); } catch (e2) {}
        });
      }
    });
  }

  /* ---------------- Metronome ---------------- */
  function showMetronome() {
    openModal('Metronom', `
      <p style="color:var(--muted);font-size:13px;">Pilih tempo (BPM) dan tekan mula. Bunyi klik ditetapkan dalam 4/4.</p>
      <div style="margin-top:20px;display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;">
        <div class="field"><label for="mBpm">BPM</label><input class="input" type="number" id="mBpm" value="84" min="40" max="220" style="width:100px;"></div>
        <button class="btn btn-primary" id="mStart">Mula</button>
      </div>
      <div id="mBeat" style="margin-top:24px;text-align:center;font-size:34px;min-height:46px;color:var(--gold);letter-spacing:10px;">–</div>`);
    const bpmEl = modal.querySelector('#mBpm');
    const startBtn = modal.querySelector('#mStart');
    const beatEl = modal.querySelector('#mBeat');
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let on = false;

    startBtn.addEventListener('click', () => {
      if (!on && ctx.state === 'suspended') ctx.resume();
      on = !on;
      startBtn.textContent = on ? 'Berhenti' : 'Mula';
      startBtn.classList.toggle('btn-danger', on);
      if (!on) { if (metTimer) { clearInterval(metTimer); metTimer = null; } return; }
      let beat = 0;
      const step = 60000 / (Number(bpmEl.value || 84));
      beatEl.textContent = '●';
      clickBeat(ctx, true);
      metTimer = setInterval(() => {
        beat = (beat + 1) % 4;
        clickBeat(ctx, beat === 0);
        beatEl.textContent = beat === 0 ? '●' : '•';
      }, step);
    });

    function clickBeat(ac, accent) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.value = accent ? 1568 : 1046;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
      o.connect(g);
      g.connect(ac.destination);
      o.start(ac.currentTime);
      o.stop(ac.currentTime + 0.1);
    }
  }

  /* ---------------- Bank lagu ---------------- */
  function showBank() {
    const sets = [
      { name: 'Set Pagi / Keluarga', songs: ['🎵 Somewhere Over the Rainbow (Israel Kamakawiwo\'ole)', '🎵 Dance Monkey (Tones and I)', '🎵 Cant Help Falling in Love - Elvis'] },
      { name: 'Set Malam / Remaja', songs: ['🎵 Perfect - Ed Sheeran', '🎵 Rumah Kita - Peterpan', '🎵 Aku dan Dia - Ukays'] },
      { name: 'Lagu Tempatan Sabah', songs: ['🎵 Sayang Kinabalu', '🎵 Magandai Kinabalu', '🎵 Musik Sandal Papata'] },
    ];
    const chords = ['C', 'G', 'Am', 'F', 'Em', 'Dm', 'E', 'D'];
    openModal('Bank Lagu', `
      <p style="color:var(--muted);font-size:13px;">Cadangan senarai set untuk dicuba di lokasi hotspot/coldspot.</p>
      ${sets.map(s => `
        <div class="panel" style="margin-top:14px;">
          <h3 style="font-size:16px;">${UI.esc(s.name)}</h3>
          ${s.songs.map(x => `<p style="font-size:13.5px;color:var(--text);padding:5px 0;border-bottom:1px dashed var(--line);">${UI.esc(x)}</p>`).join('')}
        </div>`).join('')}
      <div class="panel" style="margin-top:14px;">
        <h3 style="font-size:16px;">Kord Asas Setiap Set</h3>
        <p style="font-size:13px;color:var(--muted);">${chords.map(c => `<span class="tier tier-warm" style="font-size:11px;margin:3px 4px 0 0;">${c}</span>`).join('')}</p>
      </div>`);
  }

  /* ---------------- Gear checklist ---------------- */
  function showGear() {
    const items = ['Gitar / Alat Muzik', 'Kabel & Playback', 'Pembesar Suara', 'Mikrofon & Stand', 'Tripod & Stand Nota', 'Bateri / Power Bank', 'Tip Jar (Tabung)', 'Kad QR (DuitNow/TNG)', 'Kebenaran / Lesen Busking', 'Kotak P3K'];
    const saved = JSON.parse(localStorage.getItem('sabahbuskers_gear') || '{}');
    openModal('Senarai Semak Gear', `
      <p style="color:var(--muted);font-size:13px;">Tandakan item yang dibawa. Senarai disimpan pada peranti anda.</p>
      <div style="margin-top:14px;">
        ${items.map((it, i) => `
          <label class="consent-row" style="margin:8px 0;"><input type="checkbox" data-g="${i}" ${saved[i] ? 'checked' : ''}> <span>${UI.esc(it)}</span></label>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-primary" id="gearSave">Simpan Senarai</button>
        <button class="btn btn-ghost" id="gearReset">Reset</button>
      </div>`);
    modal.querySelector('#gearSave').addEventListener('click', () => {
      const out = {};
      modal.querySelectorAll('[data-g]').forEach(c => { out[c.dataset.g] = c.checked; });
      localStorage.setItem('sabahbuskers_gear', JSON.stringify(out));
      UI.toast('Senarai semak disimpan.', 'ok');
    });
    modal.querySelector('#gearReset').addEventListener('click', () => {
      localStorage.removeItem('sabahbuskers_gear');
      Router.replace('tools');
    });
  }
})();