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
    const locPreview = ((data.locations || []).slice(0, 6));

    return `
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="container" style="position:relative;">
        <p class="hero-eyebrow reveal"><span class="live-dot"></span> Platform untuk buskers Sabah — berpusat di Kota Kinabalu</p>
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
    </section>

    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        <span>Persembahan Jalanan</span><span class="alt">Lokasi Disahkan DBKK</span><span>Temperan Slot Mingguan</span><span class="alt">Hotspot &amp; Coldspot</span><span>Sesi Pagi / Petang / Malam</span><span class="alt">Komuniti Busker Sabah</span>
        <span>Persembahan Jalanan</span><span class="alt">Lokasi Disahkan DBKK</span><span>Temperan Slot Mingguan</span><span class="alt">Hotspot &amp; Coldspot</span><span>Sesi Pagi / Petang / Malam</span><span class="alt">Komuniti Busker Sabah</span>
      </div>
    </div>

    <section class="section">
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
        <div style="margin-top:56px;">
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

    <section class="section" style="padding-top:0;">
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

    <section class="section" style="padding-top:0;">
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

    <section class="cta-band">
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