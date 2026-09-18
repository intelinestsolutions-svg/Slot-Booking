(function () {
  /* ============ Terma & Syarat (kandungan dikongsi modal + halaman) ============ */
  window.TermsHTML = function (compact) {
    const sec = (t, html) => `<section class="tos-sec"><h4>${t}</h4>${html}</section>`;
    return `
      <p class="tos-lead">${APP.mobileLabel} — Sabah Buskers Community (SBC). Aplikasi ini dibangunkan <b>untuk kegunaan dalaman komuniti sahaja</b> dan tidak untuk diedarkan secara bebas kepada awam. Dengan menggunakan aplikasi ini, anda bersetuju dengan terma &amp; syarat berikut:</p>
      ${sec('1. Akses Dalaman', '<p>Aplikasi ini hanya untuk kegunaan ahli/karyawan SBC yang diberi akses. Ia tidak boleh dimuat turun, disalin, dikongsikan atau diagihkan kepada pihak luar tanpa kebenaran bertulis pasukan SBC.</p>')}
      ${sec('2. Penerimaan', '<p>Penggunaan aplikasi bermakna anda menerima terma ini sepenuhnya. Jika anda tidak bersetuju, sila berhenti menggunakan aplikasi dengan serta-merta.</p>')}
      ${sec('3. Pendaftaran &amp; Akaun', '<p>Anda mestilah berumur 18 tahun ke atas, memberi maklumat yang sah (termasuk MyKad) dan bertanggungjawab menjaga kerahsiaan akaun anda. Setiap busker disaring oleh pasukan admin sebelum tempahan dibuka.</p>')}
      ${sec('4. Tempahan &amp; Slot', '<p>Slot dibuka untuk minggu berikutnya. Tempahan hanya sah selepas bayaran lengkap melalui ToyyibPay. Pembatalan tertakluk kepada dasar yang dipaparkan semasa tempahan.</p>')}
      ${sec('5. Kelakuan di Lokasi', '<p>Patuhi SOP DBKK/KKIA, arahan pihak berkuasa, dan hormati peniaga serta orang awam. Aktiviti yang mencemarkan nama baik komuniti boleh menyebabkan akaun digantung.</p>')}
      ${sec('6. Bayaran &amp; Yuran', '<p>Yuran sesi RM5–RM10 mengikut tier lokasi dibayar secara atas talian. Semua transaksi direkodkan; tempahan yang tidak dibayar akan dilepaskan.</p>')}
      ${sec('7. Harta Intelek &amp; Kerahsiaan', '<p>Kandungan aplikasi (logo, teks, imej, data internal) adalah hak milik SBC dan dianggap sulit. Tidak dibenarkan berkongsi cetakan skrin atau data dalaman kepada pihak luar.</p>')}
      ${sec('8. Had Tanggungjawab', '<p>SBC tidak bertanggungjawab atas kerugian akibat penggunaan aplikasi, pembatalan venue, cuaca, atau keadaan di luar kawalan kami.</p>')}
      ${sec('9. Privasi &amp; Data', '<p>Maklumat anda digunakan untuk pengesahan, tempahan dan penyampaian notifikasi sahaja. Lihat dasar privasi untuk butiran penuh.</p>')}
      ${sec('10. Perubahan Terma', '<p>Terma ini boleh dikemas kini dari masa ke masa. Penggunaan berterusan selepas perubahan bermakna anda menerima terma baharu.</p>')}
      <p class="tos-lead" style="margin:18px 0 0;font-size:12px;color:var(--muted-2);">© 2026 Sabah Buskers Community (SBC). All rights reserved. Developed by <b style="color:var(--muted)">Studio Pro</b> (Marwan Haji Beluar).</p>`;
  };

  /* ============ Halaman Terma ============ */
  window.viewTerms = function () {
    return UI.page('Terma &amp; Syarat Penggunaan', 'Sila baca dengan teliti sebelum menggunakan platform SBC.',
      `
      <div class="panel">${TermsHTML()}</div>
      <div style="margin-top:20px;">
        <a class="btn btn-primary" href="?page=landing">Kembali ke Laman Utama</a>
        <a class="btn btn-ghost" href="mailto:hello@sabahbuskers.my" style="margin-left:10px;">Soalan? Hubungi Kami</a>
      </div>`,
      { eyebrow: 'Perundangan' });
  };

  /* ============ Tentang ============ */
  window.viewAbout = function () {
    return UI.page('Tentang Sabah Buskers Community',
      'Komuniti buskers Sabah — menghubungkan buskers dengan lokasi sah.',
      `
      <div class="panel">
        <p style="color:var(--muted);font-size:14.5px;line-height:1.8;">Sabah Buskers Community (SBC) — ialah platform digital untuk komuniti buskers di Sabah, berpusat di <b style="color:var(--gold)">Kota Kinabalu</b>. Kami menghubungkan buskers dengan lokasi persembahan yang disahkan pihak berkuasa (DBKK/KKIA) dan membolehkan tempahan slot mingguan secara telus melalui pembayaran secara atas talian atau online.</p>
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
        </div>
      </div>
      <div class="panel" style="margin-top:24px;">
        <h3>Kredit Pembangunan</h3>
        <p style="color:var(--muted);font-size:14px;margin-top:8px;">© 2026 Sabah Buskers Community (SBC). All rights reserved. Developed by <b style="color:var(--gold)">Studio Pro</b> (Marwan Haji Beluar).</p>
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
            <li>KKIA Arrival &amp; Departure</li>
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
          <p style="font-size:12.5px;color:var(--muted);">untuk ahli berdaftar</p>
          <ul>
            <li>Tempahan slot tanpa had</li>
            <li>Badge Premium dan keutamaan hotspot</li>
            <li>Statistik persembahan lanjutan</li>
            <li>Pautan TikTok/Instagram ditaja</li>
          </ul>
          <a class="btn btn-primary btn-block" href="?page=premium" style="margin-top:16px;">Naik Taraf</a>
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
              <tr><td>KKIA Arrival</td><td>Setiap hari</td><td>0800–1200, 1200–1600, 1600–2000, 2000–0000</td><td style="color:var(--gold);font-weight:700;">RM 5</td></tr>
              <tr><td>KKIA Departure</td><td>Setiap hari</td><td>0800–1200, 1200–1600, 1600–2000</td><td style="color:var(--gold);font-weight:700;">RM 5</td></tr>
            </tbody>
          </table>
        </div>
      </div>`,
      { eyebrow: 'Struktur yuran' });
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