(function () {
  const MY_STATES = ['Johor', 'Kedah', 'Kelantan', 'W.P. Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'];
  const GENRES = ['Akustik / Folk', 'Balada / Pop', 'Jazz / Soul', 'Rock', 'Klasik / Instrumental', 'Nasyid', 'Etnik Tradisional / Kadazandusun', 'Original / Experimental'];

  // Nombor mudah alih Malaysia: 01X-XXXXXXX (10 digit) ATAU 011-XXXX XXXX (11 digit).
  // Logik ini diselaraskan dengan normalize_phone() dalam api/phone.php supaya
  // pengesahan di hadapan tidak menolak nombor yang diterima pelayan.
  function isMalaysianMobile(v) {
    let d = String(v).replace(/\D/g, '');
    if (d.startsWith('0')) d = '60' + d.slice(1);
    return /^601\d{8,9}$/.test(d);
  }

  window.viewLogin = function (q) {
    if (window.sbcConsentHide) window.sbcConsentHide();
    const role = q.page === 'admin_login' ? 'admin' : 'busker';
    const tabNames = { busker: 'Busker', admin: 'Admin' };
    const tabs = Object.keys(tabNames).map(r =>
      `<button class="auth-tab ${r === role ? 'active' : ''}" data-role="${r}">${tabNames[r]}</button>`).join('');

    const subtitle = role === 'admin'
      ? 'Log masuk pentadbiran platform.'
      : 'Log masuk untuk menempah slot busking anda.';

    return UI.page('Log Masuk', subtitle,
      `<div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-tabs">${tabs}</div>
          <div id="authNotice"></div>
          <form id="loginForm">
            <div class="field">
              <label for="email">Email <em>*</em></label>
              <input class="input" id="email" type="email" placeholder="nama@contoh.com" autocomplete="email" required>
            </div>
            <div class="field" style="margin-top:14px;">
              <label for="password">Kata Laluan <em>*</em></label>
              <input class="input" id="password" type="password" placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <button class="btn btn-primary btn-block" style="margin-top:20px;" id="loginBtn">Log Masuk</button>
          </form>
          <p style="text-align:center;margin-top:14px;font-size:13px;color:var(--muted)">
            <a href="?page=verify-phone&mode=forgot" style="color:var(--gold);">Lupa kata laluan?</a>
          </p>
          <p style="text-align:center;margin-top:10px;font-size:13px;color:var(--muted)">
            Belum ada akaun? <a href="?page=register" style="color:var(--gold);font-weight:700;">Daftar sebagai busker</a>
          </p>
        </div>
      </div>`,
      { eyebrow: 'Selamat kembali' });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', async (e) => {
      const tab = e.target.closest('.auth-tab');
      if (tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        Router.replace(tab.dataset.role === 'admin' ? 'admin_login' : 'busker_login');
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target.id !== 'loginForm') return;
      e.preventDefault();
      const role = new URLSearchParams(location.search).get('page') === 'admin_login' ? 'admin' : 'busker';
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('loginBtn');
      const noticeBox = document.getElementById('authNotice');

      btn.disabled = true; btn.textContent = 'Memproses...';
      noticeBox.innerHTML = '';
      try {
        const data = await API.auth.login({ email, password, role });
        Session.setToken(data.token);
        Session.setUser(data.user);
        if (data.pending) {
          noticeBox.innerHTML = UI.notice('Akaun anda masih menunggu kelulusan admin. Sila kembali selepas kelulusan.', 'info');
          Router.go('landing');
          return;
        }
        const next = new URLSearchParams(location.search).get('next');
        const roleHome = data.user.role === 'admin' ? 'admin-dashboard' : 'cari-slot';
        Router.go(next || roleHome);
      } catch (err) {
        if (err && err.data && err.data.needPhoneVerify) {
          Router.go('verify-phone', { mode: 'verify', email: err.data.email || email });
          return;
        }
        noticeBox.innerHTML = UI.notice(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Log Masuk';
      }
    });
  });

  window.viewRegister = function () {
    if (window.sbcConsentHide) window.sbcConsentHide();
    const stateOpts = MY_STATES.map(s => `<option>${s}</option>`).join('');
    const genreOpts = GENRES.map(g => `<option>${g}</option>`).join('');

    return UI.page('Daftar Sebagai Busker',
      'Permohonan anda disemak oleh admin sebelum anda boleh mula menempah slot.',
      `<div class="wizard-head">
        <div class="steps" id="stepDots">
          <span class="step-dot active" data-step="0"><i>1</i><span class="step-name">Butiran Peribadi</span></span>
          <span class="step-link"></span>
          <span class="step-dot" data-step="1"><i>2</i><span class="step-name">Alamat</span></span>
          <span class="step-link"></span>
          <span class="step-dot" data-step="2"><i>3</i><span class="step-name">Profil Busker</span></span>
          <span class="step-link"></span>
          <span class="step-dot" data-step="3"><i>4</i><span class="step-name">Akaun &amp; Review</span></span>
        </div>
        <h1 style="font-size:clamp(26px,4vw,38px);font-weight:300;">Permohonan <b style="font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;">Busker Baru</b></h1>
      </div>

      <form class="wizard" id="registerForm" novalidate>
        <div id="notices"></div>

        <section class="wiz-panel active" data-panel="0">
          <div class="wiz-card">
            <h2>Butiran Peribadi</h2>
            <p class="sub">Sila isi maklumat seperti dalam MyKad.</p>
            <div class="form-grid">
              <div class="field span-2">
                <label for="fullName">Nama Penuh (seperti dalam MyKad) <em>*</em></label>
                <input class="input" id="fullName" name="fullName" maxlength="80" placeholder="Nama Penuh (seperti dalam MyKad)" autocomplete="name" required>
                <span class="hint">Contoh: Ahmad Faiz bin Abdullah</span>
                <span class="error">Sila masukkan nama penuh anda.</span>
              </div>
              <div class="field">
                <label for="icNumber">Nombor IC <em>*</em></label>
                <input class="input" id="icNumber" name="icNumber" maxlength="14" placeholder="000000-00-0000" required>
                <span class="hint">Format: 000000-00-0000</span>
                <span class="error">Sila masukkan nombor IC yang sah.</span>
              </div>
              <div class="field">
                <label for="phone">Telefon <em>*</em></label>
                <input class="input" id="phone" name="phone" maxlength="15" placeholder="012-3456789 / 011-1234 5678" autocomplete="tel" required>
                <span class="hint">Nombor telefon Malaysia (10 atau 11 digit).</span>
                <span class="error">Sila masukkan nombor telefon yang sah.</span>
              </div>
              <div class="field span-2">
                <label for="email">Alamat Email <em>*</em></label>
                <input class="input" id="email" name="email" type="email" maxlength="120" placeholder="nama@contoh.com" autocomplete="email" required>
                <span class="error">Sila masukkan email yang sah.</span>
                <button type="button" class="btn btn-ghost btn-sm" id="regOtpSend" style="margin-top:8px;">Hantar Kod Pengesahan</button>
                <div id="regOtpRow" style="display:none;margin-top:8px;gap:8px;flex-wrap:wrap;">
                  <input class="input" id="regOtp" maxlength="6" inputmode="numeric" placeholder="Kod 6-digit dari email" style="letter-spacing:3px;text-align:center;max-width:170px;">
                  <button type="button" class="btn btn-primary btn-sm" id="regOtpVerify" style="white-space:nowrap;">Sahkan Kod</button>
                  <span id="regOtpState" style="align-self:center;font-size:13px;"></span>
                </div>
                <span class="hint">Kod pengesahan dihantar ke email ini — tekan "Hantar Kod", isi kod, tekan "Sahkan".</span>
              </div>
            </div>
          </div>
          <div class="wiz-nav">
            <button type="button" class="btn btn-ghost" disabled>Kembali</button>
            <button type="button" class="btn btn-primary next">Teruskan <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section class="wiz-panel" data-panel="1">
          <div class="wiz-card">
            <h2>Alamat Anda</h2>
            <p class="sub">Maklumat lokasi untuk pengesahan komuniti.</p>
            <div class="form-grid">
              <div class="field">
                <label for="state">Negeri <em>*</em></label>
                <select class="select" id="state" name="state" required><option value="">-- Pilih Negeri --</option>${stateOpts}</select>
                <span class="error">Sila pilih negeri anda.</span>
              </div>
              <div class="field">
                <label for="city">Bandar / Daerah <em>*</em></label>
                <input class="input" id="city" name="city" maxlength="60" placeholder="Cth: Kota Kinabalu" required>
                <span class="error">Sila masukkan bandar/daerah.</span>
              </div>
              <div class="field span-2">
                <label for="address">Alamat <em>*</em></label>
                <textarea class="textarea" id="address" name="address" maxlength="180" placeholder="No. Rumah, Jalan, Kawasan..." required></textarea>
                <span class="error">Sila masukkan alamat penuh.</span>
              </div>
              <div class="field span-2">
                <label for="postcode">Poskod</label>
                <input class="input" id="postcode" name="postcode" maxlength="5" placeholder="Cth: 88000">
              </div>
            </div>
          </div>
          <div class="wiz-nav">
            <button type="button" class="btn btn-ghost back">← Kembali</button>
            <button type="button" class="btn btn-primary next">Teruskan <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section class="wiz-panel" data-panel="2">
          <div class="wiz-card">
            <h2>Profil Busker</h2>
            <p class="sub">Ini yang akan ditunjukkan kepada pencari dan penyelia lokasi.</p>
            <div class="form-grid">
              <div class="field">
                <label for="stageName">Nama Pentas <em>*</em></label>
                <input class="input" id="stageName" name="stageName" maxlength="50" placeholder="Contoh: The Acousticians / Busker John" required>
                <span class="error">Sila masukkan nama pentas.</span>
              </div>
              <div class="field">
                <label for="genre">Genre <em>*</em></label>
                <select class="select" id="genre" name="genre" required><option value="">-- Pilih Genre --</option>${genreOpts}</select>
                <span class="error">Sila pilih genre.</span>
              </div>
              <div class="field span-2">
                <label for="desc">Huraikan persembahan anda</label>
                <textarea class="textarea" id="desc" name="desc" maxlength="300" placeholder="Nyatakan jenis persembahan anda..."></textarea>
              </div>
              <div class="field">
                <label for="instagram">Instagram</label>
                <input class="input" id="instagram" name="instagram" maxlength="120" placeholder="Pautan / Username Instagram">
              </div>
              <div class="field">
                <label for="tiktok">TikTok</label>
                <input class="input" id="tiktok" name="tiktok" maxlength="120" placeholder="Pautan / Username TikTok">
              </div>
            </div>
          </div>
          <div class="wiz-nav">
            <button type="button" class="btn btn-ghost back">← Kembali</button>
            <button type="button" class="btn btn-primary next">Teruskan <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section class="wiz-panel" data-panel="3">
          <div class="wiz-card">
            <h2>Akaun &amp; Review</h2>
            <p class="sub">Cipta kata laluan dan sahkan permohonan anda.</p>
            <div class="form-grid">
              <div class="field">
                <label for="password">Kata Laluan <em>*</em></label>
                <input class="input" id="password" name="password" type="password" minlength="6" maxlength="64" placeholder="Minimum 6 aksara" autocomplete="new-password" required>
                <span class="error">Kata laluan mesti sekurang-kurangnya 6 aksara.</span>
              </div>
              <div class="field">
                <label for="password2">Sahkan Kata Laluan <em>*</em></label>
                <input class="input" id="password2" name="password2" type="password" minlength="6" maxlength="64" placeholder="Ulang kata laluan" required>
                <span class="error">Kata laluan tidak sepadan.</span>
              </div>

              <div class="span-2" style="padding:16px;border:1px dashed rgba(255,176,58,.4);border-radius:12px;background:var(--grad-soft);">
                <p style="font-size:13px;font-weight:800;margin-bottom:10px;letter-spacing:0.04em;color:var(--gold);">Ringkasan Permohonan</p>
                <dl class="summary">
                  <div class="summary-row"><dt>Nama Penuh</dt><dd id="rvName">—</dd></div>
                  <div class="summary-row"><dt>Nombor IC</dt><dd id="rvIc">—</dd></div>
                  <div class="summary-row"><dt>Telefon</dt><dd id="rvPhone">—</dd></div>
                  <div class="summary-row"><dt>Email</dt><dd id="rvEmail">—</dd></div>
                  <div class="summary-row"><dt>Lokasi</dt><dd id="rvLoc">—</dd></div>
                  <div class="summary-row"><dt>Nama Pentas</dt><dd id="rvStage">—</dd></div>
                  <div class="summary-row"><dt>Genre</dt><dd id="rvGenre">—</dd></div>
                </dl>
              </div>

              <label class="consent-row span-2">
                <input type="checkbox" id="consent">
                <span>Saya mengesahkan maklumat yang diberikan adalah benar dan bersetuju dengan <a href="?page=terms" style="text-decoration:underline;">Terma &amp; Syarat</a> serta <a href="?page=privacy" style="text-decoration:underline;">Dasar Privasi (PDPA)</a> platform, termasuk pengumpulan MyKad untuk pengesahan. Akaun saya akan diaktifkan selepas semakan admin.</span>
              </label>
              <span class="error" id="consentErr" style="display:none;color:var(--danger);font-size:12.5px;">Sila tandakan persetujuan anda.</span>
            </div>
          </div>
          <div class="wiz-nav">
            <button type="button" class="btn btn-ghost back">← Kembali</button>
            <button type="submit" class="btn btn-primary" id="submitBtn"><span class="btn-label">Hantar Permohonan</span><span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section class="wiz-panel" data-panel="success">
          <div class="wiz-card">
            <div class="success-wrap">
              <div class="success-icon">✓</div>
              <h2>Permohonan Diterima!</h2>
              <p>Draf anda telah dihantar. Pasukan admin akan menyemak permohonan anda.</p>
              <span class="badge-id" id="appId">APP-XXXXXX</span>
              <p style="font-size:13px;">Akaun anda akan diaktifkan selepas kelulusan. Gunakan email dan kata laluan anda untuk menempah slot.</p>
              <div style="display:flex;gap:12px;justify-content:center;margin-top:22px;flex-wrap:wrap;">
                <a class="btn btn-primary" href="?page=cari-slot">Ke Tempahan</a>
                <a class="btn btn-ghost" href="?page=landing">Kembali ke Laman Utama</a>
              </div>
            </div>
          </div>
        </section>
      </form>`,
      { eyebrow: 'Permohonan busker baharu' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewRegister = function () {
    const form = document.getElementById('registerForm');
    if (!form) return;
    const panels = form.querySelectorAll('.wiz-panel');
    const dots = form.querySelectorAll('#stepDots .step-dot');

    function show(panelIdx) {
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === String(panelIdx)));
      dots.forEach((d, i) => {
        d.classList.toggle('active', i === panelIdx);
        d.classList.toggle('done', i < panelIdx);
      });
    }

    function valid(panelEl) {
      let ok = true;
      panelEl.querySelectorAll('.field').forEach(field => {
        const input = field.querySelector('input, select, textarea');
        const err = field.querySelector('.error');
        const required = input && input.hasAttribute('required');
        const value = input ? input.value.trim() : '';
        let bad = false;
        if (required && !value) bad = true;
        else if (input && input.type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) bad = true;
        else if (input && input.id === 'icNumber' && value && !/^\d{6}-?\d{2}-?\d{4}$/.test(value)) bad = true;
        else if (input && input.id === 'phone' && value && !isMalaysianMobile(value)) bad = true;
        field.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      return ok;
    }

    form.querySelectorAll('.next').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.wiz-panel');
        if (!valid(panel)) {
          UI.toast('Sila betulkan ruangan yang bertanda merah.', 'warn');
          return;
        }
        // Dari Langkah 1 (Butiran Peribadi): TIDAK boleh mara selagi
        // nombor belum disahkan dengan kod OTP — tanpa sebarang pengecualian.
        if (panel.dataset.panel === '0') {
          const pr = window.__regProof;
          const curEmail = document.getElementById('email').value.trim();
          const curPhone = document.getElementById('phone').value.trim();
          if (!pr || pr.email !== curEmail || pr.phone !== curPhone || !pr.proof) {
            document.getElementById('phone').closest('.field').classList.add('invalid');
            UI.toast('Sahkan akaun anda dahulu: tekan "Hantar Kod", isi kod 6-digit, tekan "Sahkan Kod".', 'warn');
            document.getElementById('regOtpSend').focus();
            return;
          }
        }
        show(Number(panel.dataset.panel) + 1);
        if (Number(panel.dataset.panel) + 1 === 3) fillSummary();
      });
    });
    form.querySelectorAll('.back').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.wiz-panel');
        show(Number(panel.dataset.panel) - 1);
      });
    });

    // OTP pra-pendaftaran di bawah ruangan telefon: Hantar Kod -> isi kod ->
    // Sahkan. Bukti disimpan dalam ingatan dan dihantar bersama permohonan
    // (backend mencipta akaun HANYA dengan bukti sah). Menukar email/nombor
    // membatalkan bukti.
    window.__regProof = null;
    const otpInput = document.getElementById('regOtp');
    const otpSend = document.getElementById('regOtpSend');
    const otpVerify = document.getElementById('regOtpVerify');
    const otpRow = document.getElementById('regOtpRow');
    const otpState = document.getElementById('regOtpState');
    const resetProof = (msg) => {
      window.__regProof = null;
      if (msg !== undefined) otpState.textContent = msg;
    };
    ['email', 'phone'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => resetProof(''));
    });
    otpSend.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) { UI.toast('Isi email yang sah dahulu.', 'warn'); return; }
      if (!phone) { UI.toast('Isi nombor telefon dahulu.', 'warn'); return; }
      otpSend.disabled = true;
      try {
        await API.auth.requestRegisterOtp({ email, phone });
        otpRow.style.display = 'flex';
        otpState.textContent = 'Kod dihantar. Semak email atau telefon anda.';
        UI.toast('Kod pengesahan dihantar.', 'ok');
        let wait = 60;
        otpSend.textContent = 'Tunggu ' + wait + 's...';
        const t = setInterval(() => {
          wait -= 1;
          if (wait <= 0) { clearInterval(t); otpSend.disabled = false; otpSend.textContent = 'Hantar Kod'; }
          else otpSend.textContent = 'Tunggu ' + wait + 's...';
        }, 1000);
      } catch (err) {
        UI.toast(err.message, 'err');
        otpSend.disabled = false;
      }
    });
    otpVerify.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const code = otpInput.value.replace(/\D/g, '');
      if (code.length !== 6) { UI.toast('Isi kod 6-digit.', 'warn'); return; }
      otpVerify.disabled = true;
      try {
        const r = await API.auth.verifyRegisterOtp({ email, otp: code });
        window.__regProof = { email, phone: document.getElementById('phone').value.trim(), proof: r.proof };
        otpState.textContent = '✅ Email telah disahkan. Anda boleh teruskan.';
        UI.toast('Email telah disahkan!', 'ok');
      } catch (err) {
        UI.toast(err.message, 'err');
        otpVerify.disabled = false;
      }
    });

    function fillSummary() {
      const g = (id) => document.getElementById(id).value.trim();
      document.getElementById('rvName').textContent = g('fullName');
      document.getElementById('rvIc').textContent = g('icNumber');
      document.getElementById('rvPhone').textContent = g('phone');
      document.getElementById('rvEmail').textContent = g('email');
      document.getElementById('rvLoc').textContent = (g('city') + ', ' + g('state')).replace(/^,\s*/, '');
      document.getElementById('rvStage').textContent = g('stageName');
      document.getElementById('rvGenre').textContent = g('genre');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const panel = form.querySelector('[data-panel="3"]');
      const consent = document.getElementById('consent');
      const consentErr = document.getElementById('consentErr');

      if (!valid(panel) || !(/^\d{6}-?\d{2}-?\d{4}$/.test(document.getElementById('icNumber').value.trim()))) {
        UI.toast('Sila semak semula butiran anda.', 'warn');
        return;
      }
      const pass1 = document.getElementById('password').value;
      const pass2 = document.getElementById('password2').value;
      document.getElementById('password2').parentElement.classList.toggle('invalid', pass1 !== pass2);
      if (pass1 !== pass2) {
        UI.toast('Kata laluan tidak sepadan.', 'warn');
        return;
      }
      if (!consent.checked) {
        consentErr.style.display = 'block';
        return;
      }
      consentErr.style.display = 'none';

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.querySelector('.btn-label').textContent = 'Menghantar...';

      try {
        // Bukti OTP pra-pendaftaran (Langkah 1-2) — wajib.
        const pr = window.__regProof;
        const curEmail = document.getElementById('email').value.trim();
        const curPhone = document.getElementById('phone').value.trim();
        if (!pr || pr.email !== curEmail || pr.phone !== curPhone || !pr.proof) {
          UI.toast('Sahkan email anda dahulu (Langkah 1 di bahagian Butiran Peribadi).', 'warn');
          show(0);
          return;
        }
        const data = await API.auth.register({
          fullName: document.getElementById('fullName').value.trim(),
          icNumber: document.getElementById('icNumber').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          email: document.getElementById('email').value.trim(),
          state: document.getElementById('state').value,
          city: document.getElementById('city').value.trim(),
          address: document.getElementById('address').value.trim(),
          postcode: document.getElementById('postcode').value.trim(),
          stageName: document.getElementById('stageName').value.trim(),
          genre: document.getElementById('genre').value,
          description: document.getElementById('desc').value.trim(),
          instagram: document.getElementById('instagram').value.trim(),
          tiktok: document.getElementById('tiktok').value.trim(),
          password: pass1,
          proof: pr.proof,
          // Persetujuan PDPA eksplisit — WAJIB oleh api/auth.php ('register').
          consent: consent.checked ? 1 : 0,
        });
        window.__regProof = null;
        Session.setToken(data.token);
        Session.setUser(data.user);
        document.getElementById('appId').textContent = data.appId;
        show('success');
        Nav.update();
        UI.toast('Email telah disahkan. Permohonan berjaya dihantar!', 'ok');
      } catch (err) {
        document.getElementById('notices').innerHTML = UI.notice(err.message, 'error');
        UI.toast(err.message, 'err');
      } finally {
        btn.disabled = false;
        btn.querySelector('.btn-label').textContent = 'Hantar Permohonan';
      }
    });

  };
  window.viewVerifyPhone = function (q) {
    if (window.sbcConsentHide) window.sbcConsentHide();
    const mode = q.mode === 'forgot' ? 'forgot' : 'verify';
    const isForgot = mode === 'forgot';
    const title = isForgot ? 'Lupa Kata Laluan' : 'Sahkan Email';
    const subtitle = isForgot
      ? 'Kod tetapan semula dihantar ke email/nombor berdaftar anda.'
      : 'Lengkapkan pengesahan untuk mengaktifkan akaun anda.';

    return UI.page(title, subtitle,
      `<div class="auth-wrap">
        <div class="auth-card">
          <div id="vpNotice">${q.email && !isForgot ? UI.notice('Kod 6-digit dihantar. Semak email atau telefon anda. Kod luput dalam 10 minit.', 'info') : ''}</div>
          <form id="vpForm">
            <div class="field">
              <label for="vpEmail">Email ${isForgot ? '<em>*</em>' : ''}</label>
              <input class="input" id="vpEmail" type="email" placeholder="nama@contoh.com" autocomplete="email" value="${UI.esc(q.email || '')}" ${isForgot ? '' : 'readonly'} required>
            </div>
            ${isForgot ? `<div class="field" id="vpOtpWrap" style="margin-top:14px;display:none;">
              <label for="vpOtp">Kod Pengesahan (6-digit) <em>*</em></label>
              <input class="input" id="vpOtp" maxlength="6" inputmode="numeric" placeholder="123456" style="letter-spacing:4px;text-align:center;font-size:20px;">
            </div>
            <div class="field" id="vpNewWrap" style="margin-top:14px;display:none;">
              <label for="vpNew">Kata Laluan Baharu <em>*</em></label>
              <input class="input" id="vpNew" type="password" minlength="6" placeholder="Minimum 6 aksara" autocomplete="new-password">
            </div>
            <div class="field" id="vpNew2Wrap" style="margin-top:14px;display:none;">
              <label for="vpNew2">Sahkan Kata Laluan Baharu <em>*</em></label>
              <input class="input" id="vpNew2" type="password" minlength="6" placeholder="Ulang kata laluan">
            </div>` : `<div class="field" style="margin-top:14px;">
              <label for="vpOtp">Kod Pengesahan (6-digit) <em>*</em></label>
              <input class="input" id="vpOtp" maxlength="6" inputmode="numeric" placeholder="123456" style="letter-spacing:4px;text-align:center;font-size:20px;" required>
            </div>`}
            <button class="btn btn-primary btn-block" style="margin-top:20px;" id="vpBtn">${isForgot ? 'Hantar Kod Tetapan Semula' : 'Sahkan Email'}</button>
            <button class="btn btn-ghost btn-block" style="margin-top:10px;" id="vpResend" type="button">Hantar Semula Kod</button>
          </form>
          <p style="text-align:center;margin-top:18px;font-size:13px;color:var(--muted)">
            <a href="?page=login" style="color:var(--gold);">← Kembali log masuk</a>
          </p>
        </div>
      </div>`,
      { eyebrow: isForgot ? 'Tetapan semula kata laluan' : 'Pengesahan SMS' });
  };

  window.ViewHooks.viewVerifyPhone = function (q) {
    const mode = q.mode === 'forgot' ? 'forgot' : 'verify';
    const isForgot = mode === 'forgot';
    const noticeBox = document.getElementById('vpNotice');
    const btn = document.getElementById('vpBtn');
    let otpSent = !isForgot;

    document.getElementById('vpForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('vpEmail').value.trim();
      btn.disabled = true;
      noticeBox.innerHTML = '';
      try {
        if (isForgot && !otpSent) {
          const r = await API.auth.forgotPassword({ email });
          otpSent = true;
          document.getElementById('vpOtpWrap').style.display = '';
          document.getElementById('vpNewWrap').style.display = '';
          document.getElementById('vpNew2Wrap').style.display = '';
          btn.textContent = 'Tukar Kata Laluan';
          noticeBox.innerHTML = UI.notice(r.message || ('Kod dihantar ke ' + (r.sentTo || 'anda') + '.'), 'ok');
        } else if (isForgot) {
          const code = document.getElementById('vpOtp').value.replace(/\D/g, '');
          const nw = document.getElementById('vpNew').value;
          const nw2 = document.getElementById('vpNew2').value;
          if (code.length !== 6) { noticeBox.innerHTML = UI.notice('Isi kod 6-digit.', 'error'); return; }
          if (!nw || nw.length < 6) { noticeBox.innerHTML = UI.notice('Kata laluan baharu min. 6 aksara.', 'error'); return; }
          if (nw !== nw2) { noticeBox.innerHTML = UI.notice('Pengesahan kata laluan tidak sepadan.', 'error'); return; }
          const r = await API.auth.resetPassword({ email, otp: code, new: nw });
          noticeBox.innerHTML = UI.notice(r.message || 'Kata laluan ditukar. Sila log masuk.', 'ok');
          UI.toast('Kata laluan berjaya ditukar.', 'ok');
          setTimeout(() => Router.go('login'), 1600);
        } else {
          const code = document.getElementById('vpOtp').value.replace(/\D/g, '');
          if (code.length !== 6) { noticeBox.innerHTML = UI.notice('Isi kod 6-digit.', 'error'); return; }
          const data = await API.auth.verifyPhone({ email, otp: code });
          Session.setToken(data.token);
          Session.setUser(data.user);
          noticeBox.innerHTML = UI.notice('Email telah disahkan! Anda boleh meneruskan.', 'ok');
          UI.toast('Nombor telefon disahkan.', 'ok');
          setTimeout(() => Router.go('cari-slot'), 1200);
        }
      } catch (err) {
        noticeBox.innerHTML = UI.notice(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('vpResend').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      const email = document.getElementById('vpEmail').value.trim();
      if (!email) { noticeBox.innerHTML = UI.notice('Isi email dahulu.', 'error'); return; }
      b.disabled = true;
      try {
        const r = isForgot
          ? await API.auth.forgotPassword({ email })
          : await API.auth.resendOtp({ email });
        otpSent = true;
        if (isForgot) {
          document.getElementById('vpOtpWrap').style.display = '';
          document.getElementById('vpNewWrap').style.display = '';
          document.getElementById('vpNew2Wrap').style.display = '';
          btn.textContent = 'Tukar Kata Laluan';
        }
        noticeBox.innerHTML = UI.notice(r.message || 'Kod baharu dihantar.', 'ok');
      } catch (err) {
        noticeBox.innerHTML = UI.notice(err.message, 'error');
        b.disabled = false;
      }
    });
  };
})();