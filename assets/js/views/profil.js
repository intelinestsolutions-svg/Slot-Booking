(function () {
  const GENRES = ['Akustik / Folk', 'Balada / Pop', 'Jazz / Soul', 'Rock', 'Klasik / Instrumental', 'Nasyid', 'Etnik Tradisional / Kadazandusun', 'Original / Experimental'];
  const STATES = ['Johor', 'Kedah', 'Kelantan', 'W.P. Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'];

  function guardAuth() {
    const u = Session.user;
    if (!u) {
      Router.go('login', { next: 'kemaskini-profil' });
      return null;
    }
    return u;
  }

  function guardBusker() {
    const u = Session.user;
    if (!u || u.role !== 'busker') {
      Router.go('login', { next: 'profil' });
      return null;
    }
    return u;
  }

  function verifyBadge(status) {
    const map = {
      approved: ['ok', 'Disahkan'],
      pending: ['pending', 'Menunggu Kelulusan'],
      rejected: ['cancelled', 'Ditolak'],
    };
    const m = map[status] || ['', status];
    return `<span class="st st-${m[0]}">${m[1]}</span>`;
  }

  window.viewProfil = function () {
    if (!guardBusker()) return '';
    return UI.page('Profil Busker', 'Maklumat akaun dan profil persembahan anda.',
      `
      <div id="meCard"><div class="empty">Memuatkan profil...</div></div>`,
      { eyebrow: 'ID Anda' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewProfil = async function () {
    let u = {};
    try {
      const r = await API.auth.me();
      u = r.user || {};
      Session.setUser({ ...Session.user, ...u });
    } catch (e) {
      document.getElementById('meCard').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const rows = [
      ['Nama Penuh', u.fullName],
      ['Nama Pentas', u.stageName],
      ['Email', u.email],
      ['Nombor IC', u.icNumber],
      ['Telefon', u.phone],
      ['Alamat', [u.address, `${u.city}, ${u.state} ${u.postcode || ''}`].filter(Boolean).join(', ')],
      ['Genre', u.genre],
      ['Deskripsi', u.description],
      ['Instagram', u.instagram],
      ['TikTok', u.tiktok],
      ['Ahli sejak', u.createdAt ? UI.dateLabel(u.createdAt) : ''],
    ].filter(r => (r[1] || '').trim() !== '');

    const meta = [
      u.isPremium ? ['⭐', 'Premium'] : null,
      u.isOku ? ['♿', 'OKU'] : null,
      ['🌐', u.language || 'ms'],
    ].filter(Boolean);

    const box = document.getElementById('meCard');
    box.innerHTML = `
      <div class="card" style="margin-bottom:18px;">
        <div style="display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start;">
          <div class="pro-avatar">${u.avatar
            ? `<img src="${UI.esc(u.avatar)}" alt="Gambar profil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
            : UI.esc((u.stageName || u.fullName || 'B').slice(0, 1).toUpperCase())}</div>
          <div style="flex:1;min-width:230px;">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <h2 style="font-size:26px;">${UI.esc(u.stageName || u.fullName)}</h2>
              ${verifyBadge(u.verificationStatus)}
            </div>
            <p style="color:var(--muted);margin-top:4px;">${UI.esc(u.genre || '')} · ${UI.esc(u.city || '')}, ${UI.esc(u.state || '')}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
              ${meta.map(m => `<span class="tier tier-warm" style="padding:5px 12px;font-size:11px;">${m[0]} ${m[1]}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      ${u.verificationStatus !== 'approved' ? UI.notice('Akaun anda masih belum diluluskan admin. Kali terakhir dikemas kini semasa pendaftaran. Sila tunggu pengesahan atau hubungi sokongan.', 'info') : ''}

      <div class="panel" style="margin-top:0;">
        <h3>Maklumat Akaun</h3>
        <div class="summary" style="margin-top:10px;">
          ${rows.map(([k, v]) => `<div class="summary-row"><dt>${UI.esc(k)}</dt><dd>${UI.esc(v)}</dd></div>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
        <a class="btn btn-primary" href="?page=kemaskini-profil">Kemaskini Profil</a>
        <a class="btn btn-ghost" href="?page=tempahan-saya">Tempahan Saya</a>
      </div>`;
  };

  window.viewKemaskini = function () {
    if (!guardAuth()) return '';
    return UI.page('Kemaskini Profil', 'Kemas kini butiran peribadi dan kata laluan anda.',
      `
      <div class="panel">
        <h3>Gambar Profil</h3>
        <p style="color:var(--muted);font-size:13.5px;margin:6px 0;">Format JPEG sahaja, kurang daripada <b>2MB</b>. Gambar dipaparkan pada panel profil anda.</p>
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:14px;">
          <img id="avatarPreview" alt="Gambar profil"
            style="width:96px;height:96px;border-radius:50%;object-fit:cover;background:#222;border:3px solid var(--gold);"
            src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='%23222'/><text x='48' y='60' font-size='38' text-anchor='middle' fill='%23d4af37'>S</text></svg>">
          <div style="flex:1;min-width:220px;">
            <input type="file" id="avatarFile" accept="image/jpeg" class="input" style="padding:8px;">
            <button class="btn btn-primary" type="button" id="avatarSave" style="margin-top:10px;">Muat Naik</button>
            <div id="avatarNotice"></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Maklumat Peribadi &amp; Profil</h3>
        <form id="profileForm" style="margin-top:16px;">
          <div id="pNotice"></div>
          <div class="form-grid">
            <div class="field"><label for="pfStageName">Nama Pentas</label><input class="input" id="pfStageName" name="stageName"></div>
            <div class="field"><label for="pfGenre">Genre</label><select class="select" id="pfGenre" name="genre"></select></div>
            <div class="field"><label for="pfFullName">Nama Penuh</label><input class="input" id="pfFullName" name="fullName"></div>
            <div class="field"><label for="pfPhone">Telefon</label><input class="input" id="pfPhone" name="phone"></div>
            <div class="field"><label for="pfCity">Bandar</label><input class="input" id="pfCity" name="city"></div>
            <div class="field"><label for="pfPostcode">Poskod</label><input class="input" id="pfPostcode" name="postcode"></div>
            <div class="field span-2"><label for="pfAddress">Alamat</label><textarea class="textarea" id="pfAddress" name="address"></textarea></div>
            <div class="field span-2"><label for="pfDescription">Deskripsi Persembahan</label><textarea class="textarea" id="pfDescription"></textarea></div>
            <div class="field"><label for="pfInstagram">Instagram</label><input class="input" id="pfInstagram" placeholder="Pautan / Username"></div>
            <div class="field"><label for="pfTiktok">TikTok</label><input class="input" id="pfTiktok" placeholder="Pautan / Username"></div>
          </div>
          <button class="btn btn-primary" type="submit" id="pfSave" style="margin-top:10px;">Simpan Profil</button>
        </form>
      </div>

      <div class="panel">
        <h3>Tukar Kata Laluan</h3>
        <form id="passForm" style="margin-top:16px;max-width:460px;">
          <div id="pwNotice"></div>
          <div class="field"><label for="pwCurrent">Kata Laluan Semasa</label><input class="input" type="password" id="pwCurrent" autocomplete="current-password"></div>
          <div class="field" style="margin-top:14px;"><label for="pwNew">Kata Laluan Baru</label><input class="input" type="password" id="pwNew" autocomplete="new-password"></div>
          <div class="field" style="margin-top:14px;"><label for="pwNew2">Sahkan Kata Laluan Baru</label><input class="input" type="password" id="pwNew2" autocomplete="new-password"></div>
          <button class="btn btn-ghost" type="submit" id="pwSave" style="margin-top:12px;">Tukar Kata Laluan</button>
        </form>
      </div>`,
      { eyebrow: 'Butiran anda' });
  };

  window.ViewHooks.viewKemaskini = async function () {
    let u = {};
    try {
      const r = await API.auth.me();
      u = r.user || {};
      Session.setUser({ ...Session.user, ...u });
    } catch (e) { /* continue with session data */ }

    const fill = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    fill('pfStageName', u.stageName);
    fill('pfGenre', u.genre);
    fill('pfFullName', u.fullName);
    fill('pfPhone', u.phone);
    fill('pfCity', u.city);
    fill('pfPostcode', u.postcode);
    fill('pfAddress', u.address);
    fill('pfDescription', u.description);
    fill('pfInstagram', u.instagram);
    fill('pfTiktok', u.tiktok);
    document.getElementById('pfGenre').innerHTML = GENRES.map(g => `<option ${g === u.genre ? 'selected' : ''}>${g}</option>`).join('');

    const avImg = document.getElementById('avatarPreview');
    if (avImg && u.avatar) avImg.src = u.avatar;
    const avFile = document.getElementById('avatarFile');
    const avSave = document.getElementById('avatarSave');
    const avNotice = document.getElementById('avatarNotice');
    if (avFile && avSave) {
      const MB = 2 * 1024 * 1024;
      avFile.addEventListener('change', () => {
        const f = avFile.files && avFile.files[0];
        avNotice.innerHTML = '';
        if (!f) return;
        if (f.type !== 'image/jpeg') {
          avNotice.innerHTML = UI.notice('Hanya JPEG dibenarkan.', 'error');
          avFile.value = '';
          return;
        }
        if (f.size >= MB) {
          avNotice.innerHTML = UI.notice('Gambar mestilah kurang daripada 2MB.', 'error');
          avFile.value = '';
          return;
        }
        avImg.src = URL.createObjectURL(f);
      });
      avSave.addEventListener('click', async () => {
        const f = avFile.files && avFile.files[0];
        avNotice.innerHTML = '';
        if (!f) {
          avNotice.innerHTML = UI.notice('Sila pilih fail JPEG dahulu.', 'error');
          return;
        }
        if (f.type !== 'image/jpeg') {
          avNotice.innerHTML = UI.notice('Hanya JPEG dibenarkan.', 'error');
          return;
        }
        if (f.size >= MB) {
          avNotice.innerHTML = UI.notice('Gambar mestilah kurang daripada 2MB.', 'error');
          return;
        }
        avSave.disabled = true;
        avSave.textContent = 'Memuat naik...';
        try {
          const res = await API.auth.uploadAvatar(f);
          Session.setUser({ ...Session.user, avatar: res.avatar });
          avNotice.innerHTML = UI.notice('Gambar profil berjaya dikemas kini.', 'ok');
        } catch (err) {
          avNotice.innerHTML = UI.notice(err.message, 'error');
        } finally {
          avSave.disabled = false;
          avSave.textContent = 'Muat Naik';
        }
      });
    }

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('pfSave');
      btn.disabled = true;
      try {
        const payload = {
          stageName: document.getElementById('pfStageName').value.trim(),
          genre: document.getElementById('pfGenre').value,
          fullName: document.getElementById('pfFullName').value.trim(),
          phone: document.getElementById('pfPhone').value.trim(),
          city: document.getElementById('pfCity').value.trim(),
          postcode: document.getElementById('pfPostcode').value.trim(),
          address: document.getElementById('pfAddress').value.trim(),
          description: document.getElementById('pfDescription').value.trim(),
          instagram: document.getElementById('pfInstagram').value.trim(),
          tiktok: document.getElementById('pfTiktok').value.trim(),
        };
        const res = await API.auth.updateProfile(payload);
        Session.setUser({ ...Session.user, ...(res.user || {}) });
        UI.toast('Profil dikemas kini!', 'ok');
        Router.go('profil');
      } catch (err) {
        document.getElementById('pNotice').innerHTML = UI.notice(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('passForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = document.getElementById('pwCurrent').value;
      const nw = document.getElementById('pwNew').value;
      const nw2 = document.getElementById('pwNew2').value;
      if (nw !== nw2) {
        document.getElementById('pwNotice').innerHTML = UI.notice('Kata laluan baru tidak sepadan.', 'error');
        return;
      }
      const btn = document.getElementById('pwSave');
      btn.disabled = true;
      try {
        await API.auth.changePassword({ current: cur, new: nw });
        document.getElementById('pwNotice').innerHTML = UI.notice('Kata laluan berjaya ditukar.', 'ok');
        document.getElementById('pwCurrent').value = '';
        document.getElementById('pwNew').value = '';
        document.getElementById('pwNew2').value = '';
      } catch (err) {
        document.getElementById('pwNotice').innerHTML = UI.notice(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  };
})();