(function () {
  /* ============ Tentang ============ */
  window.viewAbout = function () {
    return UI.page('Tentang SabahBuskers',
      'Clone komuniti buskers Sabah — menghubungkan buskers dengan lokasi sah.',
      `
      <div class="panel">
        <p style="color:var(--muted);font-size:14.5px;line-height:1.8;">SabahBuskers™ (inspirasi daripada buskers.my/BuzzKing) ialah platform digital untuk komuniti buskers di Sabah, berpusat di <b style="color:var(--gold)">Kota Kinabalu</b>. Kami menghubungkan buskers dengan lokasi persembahan yang disahkan pihak berkuasa (DBKK/KKIA) dan membolehkan tempahan slot mingguan secara telus melalui pembayaran ToyyibPay.</p>
      </div>
      <div class="grid-3" style="margin-top:22px;">
        <article class="card"><h3>🟢 Lokasi Sah</h3><p>Hanya venue dengan kebenaran pihak berkuasa. Tiada lagi tekaan di mana untuk bermain — setiap slot dipetakan &amp; disahkan.</p></article>
        <article class="card"><h3>📅 Tempahan Slot</h3><p>Pilih sesi mingguan (Pagi, Petang, Malam) dan kunci slot anda sebelum buskers lain merebutnya.</p></article>
        <article class="card"><h3>💳 Bayaran Telus</h3><p>Yuran sesi dibayar secara dalam talian melalui ToyyibPay. Transaksi direkodkan untuk semua pihak.</p></article>
      </div>
      <div class="panel" style="margin-top:24px;">
        <h3>Misi</h3>
        <p style="color:var(--muted);font-size:14px;margin-top:8px;">Menjadikan busking sebagai profesion yang teratur, adil dan dihormati di Sabah — supaya setiap pemuzik jalanan mendapat peluang persembahan yang konsisten di lokasi selamat.</p>
      </div>
      <div class="panel">
        <h3>Soalan Lazim</h3>
        <div style="margin-top:10px;">
          <p style="font-weight:800;color:var(--cream);">Bagaimana saya mula?</p>
          <p style="color:var(--muted);font-size:13.5px;">Daftar sebagai busker, tunggu kelulusan admin (biasanya 24 jam), kemudian layari Cari Slot dan tempah.</p>
          <p style="font-weight:800;color:var(--cream);margin-top:14px;">Berapa yuran?</p>
          <p style="color:var(--muted);font-size:13.5px;">Yuran mengikut tier lokasi — RM5 (coldspot) hingga RM10 (hotspot) setiap sesi. Lihat halaman Yuran Sesi.</p>
          <p style="font-weight:800;color:var(--cream);margin-top:14px;">Siapa penyelia lokasi?</p>
          <p style="color:var(--muted);font-size:13.5px;">Penyelia (partner) membantu mengesahkan kehadiran dan status slot di lokasi masing-masing.</p>
        </div>
      </div>`,
      { eyebrow: 'Kenali kami' });
  };

  /* ============ Yuran ============ */
  window.viewPricing = function () {
    return UI.page('Yuran Sesi', 'Struktur yuran telus untuk slot busking Sabah.',
      `
      <div class="tier-grid">
        <div class="card price-card">
          <span class="tier tier-cold">❄️ Coldspot</span>
          <div class="price"><small>RM</small>5</div>
          <p style="font-size:12.5px;color:var(--muted);">setiap sesi</p>
          <ul>
            <li>Segama Waterfront (Dolphin)</li>
            <li>Tanjung Lipat, Likas</li>
            <li>KKIA (4 slot / hari)</li>
            <li>Sesuai persembahan latihan &amp; santai</li>
          </ul>
        </div>
        <div class="card price-card featured">
          <span class="tier tier-hot">🔥 Hotspot</span>
          <div class="price"><small>RM</small>10</div>
          <p style="font-size:12.5px;color:var(--muted);">setiap sesi</p>
          <ul>
            <li>Dataran Deasoka — pentas utama DBKK</li>
            <li>BSN (Jalan Gaya), Ex-Pizza, Horizon, Jalan Jati</li>
            <li>Tanjung Aru — pelancong sehingga matahari terbenam</li>
            <li>Jumaat &amp; Sabtu malam; Ahad pagi</li>
          </ul>
        </div>
        <div class="card price-card">
          <span class="tier tier-warm">⭐ Premium</span>
          <div class="price"><small>RM</small>120<small>/bulan</small></div>
          <p style="font-size:12.5px;color:var(--muted);">coming soon</p>
          <ul>
            <li>Tempahan slot tanpa had</li>
            <li>Badge Premium dan keutamaan hotspot</li>
            <li>Statistik persembahan lanjutan</li>
            <li>Pautan TikTok/Instagram ditaja</li>
          </ul>
        </div>
      </div>

      <div class="panel" style="margin-top:28px;">
        <h3>Jadual Sesi DBKK</h3>
        <div class="table-wrap" style="margin-top:14px;">
          <table class="data">
            <thead><tr><th>Lokasi</th><th>Hari</th><th>Sesi / Masa</th><th>Yuran</th></tr></thead>
            <tbody>
              <tr><td>Dataran Deasoka, BSN, Ex-Pizza, Horizon Water Fountain, Jalan Jati</td><td>Jumaat &amp; Sabtu</td><td>Malam (17:30–21:00)</td><td style="color:var(--gold);font-weight:700;">RM 10</td></tr>
              <tr><td>Dataran Deasoka, BSN, Ex-Pizza, Horizon Water Fountain, Jalan Jati</td><td>Ahad</td><td>Pagi (06:30–12:00)</td><td style="color:var(--gold);font-weight:700;">RM 10</td></tr>
              <tr><td>Segama Waterfront (Dolphin)</td><td>Setiap hari</td><td>Malam (17:30–21:00)</td><td style="color:var(--gold);font-weight:700;">RM 5</td></tr>
              <tr><td>Tanjung Lipat, Likas</td><td>Setiap hari</td><td>Petang (14:00–17:30)</td><td style="color:var(--gold);font-weight:700;">RM 5</td></tr>
              <tr><td>Tanjung Aru</td><td>Setiap hari</td><td>Petang (14:00–20:00)</td><td style="color:var(--gold);font-weight:700;">RM 10</td></tr>
              <tr><td>KKIA</td><td>Setiap hari</td><td>0800–1200, 1200–1600, 1600–2000, 2000–0000</td><td style="color:var(--gold);font-weight:700;">RM 5</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cta-band" style="text-align:left;border:1px solid var(--line);border-radius:20px;padding:30px;margin-top:26px;">
        <h3>Ada lokasi sesuai untuk busking?</h3>
        <p style="color:var(--muted);">Ahli korporat atau pihak berkuasa boleh menjadi penyelia lokasi melalui program perkongsian.</p>
        <a class="btn btn-primary" href="?page=partnership">Mohon Perkongsian Lokasi</a>
      </div>`,
      { eyebrow: 'Struktur yuran' });
  };

  /* ============ Perkongsian (partner registration) ============ */
  window.viewPartnership = function () {
    return UI.page('Perkongsian Lokasi', 'Menjadi penyelia lokasi untuk platform busking Sabah.',
      `
      <div class="grid-3" style="margin-bottom:24px;">
        <article class="card"><h3>🏢 Pihak Berkuasa / Korporat</h3><p>Jadikan ruang awam anda sebagai venue busking bertauliah dan menarik orang ramai ke kawasan anda.</p></article>
        <article class="card"><h3>🗺️ Penyelia Lokasi</h3><p>Pengesahan kehadiran, pemantauan slot dan hubungan terus dengan komuniti buskers.</p></article>
        <article class="card"><h3>📈 Liputan &amp; Laporan</h3><p>Dashboard penyelia memberikan pandangan langsung jadual slot dan kehadiran mingguan.</p></article>
      </div>
      <div class="auth-wrap" style="margin-top:0;">
        <div class="auth-card">
          <h3 style="font-size:22px;margin-bottom:6px;">Mohon Sebagai Penyelia</h3>
          <p style="color:var(--muted);font-size:13px;margin-bottom:18px;">Daftar akaun penyelia lokasi. Anda boleh log masuk serta-merta.</p>
          <div id="pNotice"></div>
          <form id="partnerForm">
            <div class="field"><label for="paFullName">Nama Penuh / Organisasi <em>*</em></label><input class="input" id="paFullName" required></div>
            <div class="field" style="margin-top:14px;"><label for="paEmail">Email <em>*</em></label><input class="input" id="paEmail" type="email" required></div>
            <div class="field" style="margin-top:14px;"><label for="paPhone">Telefon <em>*</em></label><input class="input" id="paPhone" required></div>
            <div class="field" style="margin-top:14px;"><label for="paPassword">Kata Laluan <em>*</em></label><input class="input" id="paPassword" type="password" minlength="6" required></div>
            <button class="btn btn-primary btn-block" style="margin-top:20px;" id="paSubmit">Hantar Permohonan</button>
          </form>
        </div>
      </div>`,
      { eyebrow: 'Program perkongsian' });
  };

  window.ViewHooks = window.ViewHooks || {};

  if (window.viewPartnership) {
    window.ViewHooks.viewPartnership = function () {
      const form = document.getElementById('partnerForm');
      if (!form) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('paSubmit');
        btn.disabled = true;
        btn.textContent = 'Menghantar...';
        try {
          const data = await API.partner.register({
            fullName: document.getElementById('paFullName').value.trim(),
            email: document.getElementById('paEmail').value.trim(),
            phone: document.getElementById('paPhone').value.trim(),
            password: document.getElementById('paPassword').value,
          });
          Session.setToken(data.token);
          Session.setUser(data.user);
          UI.toast('Akaun penyelia berjaya didaftarkan!', 'ok');
          Router.go('partner-dashboard');
        } catch (err) {
          document.getElementById('pNotice').innerHTML = UI.notice(err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Hantar Permohonan';
        }
      });
    };
  }

  /* ============ Bilik Pemerhatian (admin) ============ */
  window.viewObservation = function () {
    const u = Session.user;
    if (!u || u.role !== 'admin') { Router.go('login', { next: 'observation-room' }); return ''; }
    return UI.page('Bilik Pemerhatian', 'Suapan langsung slot &amp; kehadiran selama 7 hari.',
      `
      <div id="obsTop"><div class="empty">Memuatkan bilik pemerhatian...</div></div>`,
      { eyebrow: 'Live' });
  };

  window.ViewHooks.viewObservation = async function () {
    const u = Session.user;
    if (!u || u.role !== 'admin') return;
    let slots = [];
    try {
      const r = await API.partner.dashboard();
      slots = r.slots || [];
    } catch (e) {
      document.getElementById('obsTop').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    document.getElementById('obsTop').innerHTML = Object.keys(byDate).sort().map(date => {
      const items = byDate[date];
      return `
        <div class="panel" style="margin-top:14px;">
          <h3 style="font-size:17px;">${UI.dateLabel(date)} <span class="st st-ok">${items.length} slot</span></h3>
          <div style="margin-top:12px;">
            ${items.map(s => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--line);flex-wrap:wrap;align-items:center;">
                <span style="font-weight:700;color:var(--gold);">${UI.esc(s.startTime)} – ${UI.esc(s.endTime)}</span>
                <span>${UI.esc(s.locationName || '')} · <small style="color:var(--muted)">${UI.esc(s.area || '')}</small></span>
                <span>${s.stageName ? '🎤 ' + UI.esc(s.stageName) : '<small style="color:var(--muted-2)">Tiada busker</small>'}</span>
                <span class="st st-${UI.esc(s.status)}">${UI.esc(s.status)}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('') || '<div class="empty">Tiada slot dalam 7 hari akan datang.</div>';
  };

  /* ============ Jadual awam /jadualbuskers/<slug>/ ============ */
  window.viewSchedule = async function () {
    const slug = Router.scheduleSlug();
    let loc = null, slots = [];
    try {
      const r = await API.locations.publicSchedule(slug, 7);
      loc = r.location || null;
      slots = r.slots || [];
    } catch (e) { /* ignore, render error below */ }

    if (!loc) {
      return UI.page('Jadual', 'Jadual persembahan busker.',
        UI.notice('Lokasi tidak dijumpai. Semak pautan anda.', 'error'));
    }

    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    return UI.page(UI.esc(loc.name), 'Jadual persembahan awam · ' + UI.esc(loc.area || ''),
      `
      ${Object.keys(byDate).sort().map(date => `
        <div class="panel" style="margin-top:12px;">
          <h3 style="font-size:17px;">${UI.dateLabel(date)}</h3>
          <div style="margin-top:10px;">
            ${byDate[date].map(s => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--line);flex-wrap:wrap;align-items:center;">
                <span style="font-weight:700;color:var(--gold);">${UI.esc(s.startTime)} – ${UI.esc(s.endTime)}</span>
                <span>${s.stageName ? '🎤 ' + UI.esc(s.stageName) : '<small style="color:var(--muted-2)">Terbuka</small>'}</span>
                <span class="st st-${UI.esc(s.bookingStatus === 'completed' ? 'Selesai' : s.bookingStatus === 'confirmed' ? 'Ditempah' : s.status)}">
                  ${UI.esc(s.bookingStatus === 'completed' ? 'Selesai' : s.bookingStatus === 'confirmed' ? 'Ditempah' : s.status)}
                </span>
              </div>`).join('')}
          </div>
        </div>`).join('') || '<div class="empty">Tiada jadual untuk minggu ini.</div>'}
      <div style="margin-top:20px;"><a class="btn btn-primary" href="?page=cari-slot">Terokai Lokasi Lain</a></div>`,
      { eyebrow: 'Jadual awam' });
  };
})();