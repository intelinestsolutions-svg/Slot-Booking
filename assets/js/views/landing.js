(async function () {
  async function stats() {
    let stats = { buskers: 42, locations: 9, bookings: 128 };
    let locations = [];
    try {
      const data = await API.community.stats();
      stats = { buskers: data.buskers || 0, locations: data.locations || 0, bookings: data.bookings || 0 };
    } catch (e) {}
    try {
      const data = await API.locations.list();
      locations = data.locations || [];
    } catch (e) {}
    return { stats, locations };
  }

  window.viewLanding = async function () {
    const data = await stats();
    if (window.APP.isNative) {
      const s = data.stats;
      const user = Session.user;
      const uName = user ? (user.stageName || user.fullName || user.email || '') : '';
      return `
      <div class="page app-home">
        ${user ? `<div class="aph-greet">Selamat kembali, <b>${UI.esc(uName)}</b></div>` : ''}
        <figure class="aph-hero">
          <img src="assets/img/sbc-community.jpg?v=20260920" alt="Komuniti Sabah Buskers">
          <figcaption>
            <img src="assets/img/sbc-logo.png?v=20260924" alt="SBC logo">
            <span><b>Sabah Buskers Community</b>Kota Kinabalu · Sejak 2019</span>
          </figcaption>
        </figure>
        <div class="aph-intro">
          <p>Sabah Buskers Community <b>(SBC)</b> menghubungkan buskers dengan lokasi sah di Sabah — terokai lokasi yang disahkan pihak berkuasa, tempah slot persembahan mingguan anda dan uruskan aktiviti busking semua dalam satu platform.</p>
        </div>
        <div class="aph-cta">
          <a class="btn btn-primary" href="?page=cari-slot">Cari Slot</a>
          <a class="btn btn-ghost" href="?page=slot-booking">Tempah Slot</a>
        </div>
        <div class="aph-stats">
          <div class="aph-stat"><b>${s.locations || 0}+</b><span>Lokasi</span></div>
          <div class="aph-stat"><b>${s.buskers || 0}+</b><span>Buskers</span></div>
          <div class="aph-stat"><b>${s.bookings || 0}+</b><span>Slot</span></div>
        </div>
        <div class="aph-actions">
          <a class="aph-card" href="?page=cari-slot"><span class="aph-ico">🗺️</span><b>Cari Slot</b><small>Terokai lokasi &amp; tempah</small></a>
          <a class="aph-card" href="?page=tempahan-saya"><span class="aph-ico">📅</span><b>Tempahan Saya</b><small>Urus slot anda</small></a>
          <a class="aph-card" href="?page=tools"><span class="aph-ico">🎯</span><b>Alatan Busker</b><small>Penala &amp; metronom</small></a>
          <a class="aph-card" href="?page=ahli-buzzking"><span class="aph-ico">👥</span><b>Komuniti</b><small>Senarai ahli SBC</small></a>
        </div>
      </div>`;
    }

    const locPreview = ((data.locations || []).slice(0, 6));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const notesHTML = Array.from({ length: 16 }, () => {
      const s = Math.round(rnd(18, 44));
      return `<span class="m-note" style="left:${Math.round(rnd(2, 96))}%;--w:${s}px;--dur:${rnd(8, 16).toFixed(1)}s;--delay:${rnd(0, 13).toFixed(1)}s;--op:${rnd(0.35, 0.8).toFixed(2)};--sway:${Math.round(rnd(-45, 45))}px"><img src="assets/img/sbc-logo.png?v=20260924" alt="" loading="lazy"></span>`;
    }).join('');

    return `
    <section class="hero">
      <div class="music-fall" aria-hidden="true">${notesHTML}</div>
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="container" style="position:relative;">
        <div style="display:grid;grid-template-columns:1.09fr .91fr;gap:clamp(28px,4.5vw,56px);align-items:center;">
          <div>
            <p class="hero-eyebrow reveal"><span class="live-dot"></span> Platform dalaman untuk buskers Sabah — berpusat di Kota Kinabalu</p>
            <h1 class="reveal" style="--d:60ms">Cari spot.<br>Tempah <b>slot persembahan.</b><br>Main.</h1>
            <p class="lead reveal" style="--d:140ms">Sabah Buskers Community (SBC) menghubungkan buskers dengan lokasi sah di Sabah — terokai lokasi yang disahkan pihak berkuasa, tempah slot persembahan mingguan anda dan uruskan aktiviti busking semua dalam satu platform.</p>
            <div class="hero-cta reveal" style="--d:220ms">
              <a class="btn btn-primary btn-lg" href="?page=register">Daftar Sebagai Busker</a>
              <a class="btn btn-ghost btn-lg" href="?page=cari-slot">Tempah Slot Sekarang</a>
            </div>
            <div class="hero-stats reveal" style="--d:300ms">
              <div class="hero-stat"><b>${data.stats.locations}+</b><span>Lokasi busking</span></div>
              <div class="hero-stat"><b>${data.stats.buskers}+</b><span>Buskers berdaftar</span></div>
              <div class="hero-stat"><b>${data.stats.bookings}+</b><span>Slot ditempah</span></div>
            </div>
          </div>
          <figure class="reveal hero-fig" style="--d:180ms;margin:0;">
            <img loading="lazy" style="width:100%;border-radius:24px;object-fit:cover;aspect-ratio:4/5;box-shadow:0 30px 70px -24px rgba(0,0,0,.75);border:1px solid var(--line);" src="assets/img/sbc-community.jpg?v=20260920" alt="Komuniti Sabah Buskers">
            <figcaption style="position:absolute;bottom:16px;left:16px;right:16px;display:flex;gap:10px;align-items:center;background:rgba(10,10,14,.72);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px 14px;">
              <img style="width:38px;height:38px;border-radius:9px;" src="assets/img/sbc-logo.png?v=20260924" alt="Logo SBC">
              <div style="line-height:1.25;">
                <b style="font-size:13.5px;display:block;">Sabah Buskers Community</b>
                <span style="font-size:12px;color:var(--muted);">Kota Kinabalu · Sejak 2019</span>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    ${window.APP.isNative ? '' : `
    <section class="dl-band" id="muat-turun">
      <div class="container">
        <div class="dl-card reveal">
          <div class="dl-media">
            <img loading="lazy" src="assets/img/apk-download.jpg?v=20261005" alt="Aplikasi mudah alih ${UI.esc(APP.mobileLabel)}">
            <span class="dl-badge"><img src="assets/img/sbc-logo.png?v=20261005" alt="">${UI.esc(APP.mobileLabel)} <i class="beta-dot">Beta</i></span>
          </div>
          <div class="dl-body">
            <p class="eyebrow">Aplikasi mudah alih · Android</p>
            <h2>Muat turun <b>${UI.esc(APP.mobileLabel)}</b> sekarang</h2>
            <p>Pasang aplikasi Android ini pada telefon anda untuk menempah slot lebih pantas, menerima pemberitahuan dan mengurus persembahan anda di mana sahaja.</p>
            <ul>
              <li>Tempah slot busking terus dari telefon</li>
              <li>Peringatan 1 jam &amp; 15 minit sebelum persembahan</li>
              <li>Alatan busker — penala gitar &amp; metronom</li>
            </ul>
            <div class="dl-actions">
              <a class="btn btn-primary btn-lg" href="sbc-mobile.apk" download>📲 Muat Turun APK</a>
              <span class="dl-meta"><b>Versi Beta</b> · 3.6 MB · Android 6.0+</span>
            </div>
            <p class="dl-note">Aplikasi dalaman SBC. Pasang, dan sedia untuk buka "Saya telah membaca" skrin pertama kali.</p>
          </div>
        </div>
      </div>
    </section>`}

    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        <span>Persembahan Jalanan</span><span class="alt">Lokasi Disahkan DBKK</span><span>Temperan Slot Mingguan</span><span class="alt">Hotspot &amp; Coldspot</span><span>Sesi Pagi / Petang / Malam</span><span class="alt">Komuniti Busker Sabah</span>
        <span>Persembahan Jalanan</span><span class="alt">Lokasi Disahkan DBKK</span><span>Temperan Slot Mingguan</span><span class="alt">Hotspot &amp; Coldspot</span><span>Sesi Pagi / Petang / Malam</span><span class="alt">Komuniti Busker Sabah</span>
      </div>
    </div>

    <section class="section" id="kaedah">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Cara ia berfungsi</p>
          <h2>Dari persimpangan jalan ke <b>pentas tersusun</b> dalam tiga langkah</h2>
        </div>
        <div class="how-grid">
          <article class="card how-step reveal">
            <span class="h-num">01 · DAFTAR</span>
            <h3>Daftar profil anda</h3>
            <p>Daftar dengan butiran MyKad, nama pentas dan genre. Permohonan disemak dan diluluskan oleh pasukan admin sebelum tempahan dibuka.</p>
            <a style="display:inline-block;margin-top:12px;font-weight:700;color:var(--gold);" href="?page=register">Buat akaun →</a>
          </article>
          <article class="card how-step reveal" style="--d:100ms">
            <span class="h-num">02 · TEMPAH</span>
            <h3>Pilih lokasi &amp; slot</h3>
            <p>Pilih daripada lokasi disahkan (Dataran Deasoka, Tanjung Aru, KKIA &amp; banyak lagi), sesi terbuka (Pagi, Petang, Malam) dan tempah tetingkap persembahan mingguan anda.</p>
            <a style="display:inline-block;margin-top:12px;font-weight:700;color:var(--gold);" href="?page=cari-slot">Tempah slot →</a>
          </article>
          <article class="card how-step reveal" style="--d:200ms">
            <span class="h-num">03 · PERFORM</span>
            <h3>Bawa gear &amp; main</h3>
            <p>Tiba di spot yang ditempah, sahkan kehadiran untuk sesi, dan biarkan muzik anda bercakap.</p>
          </article>
        </div>

        ${locPreview.length ? `
        <div style="margin-top:56px;" id="lokasi">
          <div class="sec-head center reveal">
            <p class="eyebrow">Lokasi pilihan</p>
            <h2>Spot terbaik <b>bandar raya</b> Kota Kinabalu</h2>
          </div>
          <div class="loc-grid" style="margin-top:34px;">
            ${locPreview.map((l, i) => `
              <article class="card loc-card reveal" style="--d:${i * 60}ms">
                <div class="loc-head grad-${(i % 3) + 1}">
                  <span class="pin">📍 Kota Kinabalu · ${UI.esc(l.area)}</span>
                  <h3>${UI.esc(l.name)}</h3>
                </div>
                <div class="loc-body">
                  <p>${UI.esc(l.description || 'Lokasi busking yang disahkan.')}</p>
                  <div class="loc-meta">${UI.badge(l.tier)}</div>
                  <div class="loc-foot">
                    <div class="loc-price"><b>${UI.money(l.priceFrom)}<small> / sesi</small></b></div>
                    <a class="btn btn-ghost btn-sm" href="?page=slot-booking&locationId=${l.id}">Lihat Slot</a>
                  </div>
                </div>
              </article>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="ciri">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Dibina untuk buskers</p>
          <h2>Semua yang anda perlukan untuk <b>busker dengan bijak</b></h2>
        </div>
        <div class="grid-3">
          <article class="card reveal">
            <h3>🟢 Lokasi sah &amp; disahkan</h3>
            <p>Hanya venue diluluskan dengan kebenaran pihak berkuasa (DBKK). Tiada lagi tekaan di mana elok bermain.</p>
          </article>
          <article class="card reveal" style="--d:80ms">
            <h3>📅 Tingkap slot mingguan</h3>
            <p>Slot dibuka untuk minggu berikutnya. Tempah spot anda sebelum buskers lain merebutnya.</p>
          </article>
          <article class="card reveal" style="--d:160ms">
            <h3>🔥 Strata hotspot / coldspot</h3>
            <p>Venue disusun mengikut trafik pejalan kaki supaya anda boleh merancang pendapatan dan mengoptimumkan penonton.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="komuniti">
      <div class="container">
        <div class="panel reveal" style="background:linear-gradient(135deg,rgba(255,122,89,0.08),rgba(242,180,65,0.06))">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px;align-items:center;">
            <div>
              <p class="eyebrow" style="color:var(--gold);">Dipercayai ahli tempatan · ★ 5.0</p>
              <h2 style="font-size:clamp(22px,3.4vw,34px);">Dari <b>Jalan Gaya</b> ke Tanjung Aru &amp; KKIA</h2>
              <p style="color:var(--muted);font-size:15px;line-height:1.8;margin-top:12px;">Dari Jalan Gaya ke Tanjung Aru dan KKIA, SBC menghidupkan suasana muzik jalanan Sabah yang meriah, dengan menggabungkan unsur tradisi, kemodenan, dan kepelbagaian.</p>
              <p style="color:var(--muted);font-size:15px;line-height:1.8;margin-top:10px;">Ditubuhkan pada tahun 2019, Sabah Buskers Community berperanan sebagai platform untuk menyokong, menghubungkan, dan memperkasakan para penghibur jalanan di seluruh Sabah.</p>
              <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:20px;">
                <a class="btn btn-primary" href="?page=register">Jadi Sebahagian Komuniti</a>
                <a class="btn btn-ghost" href="?page=cari-slot">Tempah Slot</a>
              </div>
            </div>
            <div style="display:grid;gap:14px;">
              <img loading="lazy" style="width:100%;border-radius:18px;object-fit:cover;aspect-ratio:16/10;box-shadow:0 20px 50px -20px rgba(0,0,0,.7);" src="assets/img/sbc-community.jpg?v=20260920" alt="Komuniti Sabah Buskers">
              <img loading="lazy" style="width:100%;border-radius:18px;object-fit:cover;aspect-ratio:4/3;box-shadow:0 20px 50px -20px rgba(0,0,0,.7);" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/LvShkzFMOiXmYr9V/475435916_1039399808231254_4765134179936357276_n-vMNZUi7gmvgtftE1.jpg" alt="Persembahan komuniti SBC">
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="perkhidmatan">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Perkhidmatan kami · dari sabahbuskers.my</p>
          <h2>Menghidupkan muzik jalanan Sabah di <b>Jalan Gaya &amp; sekitar</b></h2>
        </div>
        <div class="grid-3">
          <article class="card reveal">
            <h3>🎤 Persembahan di Lokasi</h3>
            <p>Persembahan meriah oleh pemuzik tempatan Kota Kinabalu di lokasi yang disahkan &amp; ditempah terus dalam platform.</p>
          </article>
          <article class="card reveal" style="--d:80ms">
            <h3>📡 Siaran Langsung &amp; Konsert Maya</h3>
            <p>Nikmati bakat artis kami melalui siaran langsung dan konsert maya untuk menjangkau lebih ramai penonton.</p>
          </article>
          <article class="card reveal" style="--d:160ms">
            <h3>👨‍👩‍👧‍👦 Kumpulan Keluarga &amp; Solo</h3>
            <p>Kumpulan keluarga dan persembahan solo menyesuaikan SOP baharu untuk persembahan yang selamat dan profesional.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="moments">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Moments</p>
          <h2>Moment-moment muzik jalanan <b>Kota Kinabalu</b></h2>
          <p class="sub">Gambar-gambar daripada komuniti Sabah Buskers Community (SBC).</p>
        </div>
        <div class="grid-3" style="margin-top:34px;">
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/467337213_18039163061470514_2340748686953379096_n-UQ1VmugXZmHhGYZt.jpg" alt="Persembahan SBC"></figure>
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;--d:60ms;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/475795124_1039399944897907_1065217721881326429_n-2ZvO51Qq3lE8B1wR.jpg" alt="Persembahan SBC"></figure>
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;--d:120ms;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/481205956_1067700372068601_8654649213320417981_n-YXnEvbvwdAx66l2M.jpg" alt="Persembahan SBC"></figure>
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/485995998_1085969600241678_6199954289405681917_n-QITU49ncav9Y1s7L.jpg" alt="Persembahan SBC"></figure>
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;--d:60ms;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/486224747_1086293730209265_878895635845052663_n-zBmEPBrIRfukMVKN.jpg" alt="Persembahan SBC"></figure>
          <figure class="card reveal" style="margin:0;padding:0;overflow:hidden;--d:120ms;"><img loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=366,fit=crop/LvShkzFMOiXmYr9V/515499659_10162990737144413_5515010220609343603_n-yXaIUBWXbr3uvOoV.jpg" alt="Persembahan SBC"></figure>
        </div>
        <div style="text-align:center;margin-top:22px;" class="reveal">
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/p/Sabah-Buskers-Community-SBC-100064859433527/">Ikuti di Facebook</a>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.instagram.com/sabahbuskercommunity/?hl=en" style="margin-left:10px;">Instagram</a>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="hubungi">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Hubungi kami</p>
          <h2>Sokong <b>muzik jalanan Sabah</b></h2>
          <p class="sub">Reach out untuk menyertai atau menyokong komuniti. Semua busker disaring oleh pasukan kami sebelum tempahan dibuka.</p>
        </div>
        <div class="grid-3" style="margin-top:28px;">
          <article class="card reveal" style="text-align:center;"><div style="font-size:30px;">🎫</div><h3>Menjadi Ahli</h3><p style="color:var(--muted);font-size:14px;">Daftar sebagai busker dan mula tempah slot anda yang disahkan.</p><a class="btn btn-primary btn-sm mt" href="?page=register">Daftar</a></article>
          <article class="card reveal" style="text-align:center;--d:80ms;"><div style="font-size:30px;">🎼</div><h3>Menyokong</h3><p style="color:var(--muted);font-size:14px;">Sokong pemuzik jalanan tempatan — saksikan persembahan di lokasi disahkan.</p><a class="btn btn-ghost btn-sm mt" href="?page=cari-slot">Lihat Slot</a></article>
          <article class="card reveal" style="text-align:center;--d:160ms;"><div style="font-size:30px;">📬</div><h3>Hubungi Kami</h3><p style="color:var(--muted);font-size:14px;">info@sabahbuskers.my<br>+6011-6990 0092</p><a class="btn btn-ghost btn-sm mt" href="mailto:info@sabahbuskers.my">Emel</a></article>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0;" id="yuran">
      <div class="container">
        <div class="sec-head center reveal">
          <p class="eyebrow">Yuran sesi DBKK</p>
          <h2>Struktur <b>mesra busker</b> yang telus</h2>
          <p class="sub">Yuran membantu mengekalkan operasi platform dan perkongsian lokasi. Venue yang lebih sibuk dikenakan bayaran lebih.</p>
        </div>
        <div class="table-wrap reveal" style="margin-top:32px;">
          <table class="data">
            <thead><tr><th>Lokasi</th><th>Hari</th><th>Sesi / Masa</th><th>Yuran</th></tr></thead>
            <tbody>
              <tr><td>Dataran Deasoka, BSN, Ex-Pizza, Horizon Water Fountain, Jalan Jati</td><td><span class="tag" style="background:rgba(255,176,58,.14);color:var(--gold);">Jumaat &amp; Sabtu</span></td><td>Malam (17:30–21:00)</td><td><b style="color:var(--gold)">RM 10</b></td></tr>
              <tr><td>Dataran Deasoka, BSN, Ex-Pizza, Horizon Water Fountain, Jalan Jati</td><td><span class="tag" style="background:rgba(255,176,58,.14);color:var(--gold);">Ahad</span></td><td>Pagi (06:30–12:00)</td><td><b style="color:var(--gold)">RM 10</b></td></tr>
              <tr><td>Segama Waterfront (Dolphin)</td><td><span class="tag" style="background:rgba(61,220,151,.14);color:var(--ok);">Setiap hari</span></td><td>Petang (17:30–21:00)</td><td><b style="color:var(--gold)">RM 5</b></td></tr>
              <tr><td>Tanjung Lipat, Likas</td><td><span class="tag" style="background:rgba(61,220,151,.14);color:var(--ok);">Setiap hari</span></td><td>Petang (14:00–17:30)</td><td><b style="color:var(--gold)">RM 5</b></td></tr>
              <tr><td>Tanjung Aru</td><td><span class="tag" style="background:rgba(61,220,151,.14);color:var(--ok);">Setiap hari</span></td><td>Petang–2000 (14:00–20:00)</td><td><b style="color:var(--gold)">RM 10</b></td></tr>
              <tr><td>KKIA (Lapangan Terbang Antarabangsa KK)</td><td><span class="tag" style="background:rgba(61,220,151,.14);color:var(--ok);">Setiap hari</span></td><td>0800–1200; 1200–1600; 1600–2000; 2000–0000</td><td><b style="color:var(--gold)">RM 5</b></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="cta-band" id="sertai">
      <div class="container">
        <h2 class="reveal">Bersedia untuk <b>turun ke jalan?</b></h2>
        <p class="reveal">Daftar hari ini dan mula menempah slot persembahan mingguan anda di Kota Kinabalu.</p>
        <div class="reveal">
          <a class="btn btn-primary btn-lg" href="?page=register">Daftar Sebagai Busker</a>
          <a class="btn btn-ghost btn-lg" href="?page=cari-slot" style="margin-left:12px;">Lihat Lokasi</a>
        </div>
      </div>
    </section>`;
  };
})();