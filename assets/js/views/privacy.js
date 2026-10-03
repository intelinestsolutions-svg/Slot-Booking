(function () {
  /* Shared PDPA privacy content: full page + compact summary for modals */
  window.PrivacyHTML = function (compact) {
    const sec = (t, html) => `<section class="tos-sec"><h4>${t}</h4>${html}</section>`;
    const full = `
      <p class="tos-lead">Dasar Privasi ini menjelaskan bagaimana Sabah Buskers Community (SBC) mengumpul, menggunakan dan melindungi data peribadi anda di bawah <b>Akta Perlindungan Data Peribadi 2010 (PDPA)</b> Malaysia. Tarikh kuat kuasa: <b>30 September 2026</b>.</p>
      ${sec('1. Data yang kami kumpul', '<p><b>Akaun busker:</b> nama penuh, nombor MyKad, telefon, emel, alamat, nama pentas, genre, gambar profil. <b>Tempahan &amp; pembayaran:</b> slot, lokasi, amaun dan rujukan ToyyibPay (butiran kad/bank diproses oleh ToyyibPay, bukan kami). <b>Teknikal:</b> token sesi dalam localStorage peranti anda, log asas pelayan.</p>')}
      ${sec('2. Tujuan (Notice &amp; Choice)', '<p>Pengesahan identiti &amp; kelayakan (18+), semakan admin, tempahan slot, kutipan yuran sesi RM5–RM10, notifikasi peringatan 1 jam &amp; 15 minit, keselamatan platform dan penyelesaian pertikaian. Kami <b>tidak</b> menjual data anda.</p>')}
      ${sec('3. Persetujuan anda', '<p>Pendaftaran memerlukan tanda persetujuan eksplisit (checkbox). Penggunaan aplikasi dalaman (native) memerlukan penerimaan Terma &amp; Syarat + dasar ini terlebih dahulu. Anda boleh menarik balik persetujuan dengan menghubungi kami — penarikan mungkin menamatkan akses tempahan.</p>')}
      ${sec('4. Storan tempatan &amp; kuki', '<p>Kami <b>tidak</b> menggunakan kuki pengiklanan/penjejakan. Kami menyimpan dalam <code>localStorage</code> peranti anda sahaja: token sesi, profil, bahasa dan pilihan persetujuan (<code>sabahbuskers_tos_v2</code>, <code>sbc-consent</code>). Memadam storan akan log keluar anda.</p>')}
      ${sec('5. Perkongsian', '<p>DBKK/KKIA atau pihak berkuasa venue (status slot), ToyyibPay (pembayaran), penyedia hosting/CDN (penghantaran teknikal). Tiada penjualan data kepada pihak ketiga.</p>')}
      ${sec('6. Pengekalan &amp; keselamatan', '<p>Data akaun disimpan selagi akaun aktif; rekod transaksi disimpan untuk pembukuan/pertikaian. Akses admin terhad; trafik disulitkan (HTTPS).</p>')}
      ${sec('7. Hak anda (PDPA)', '<p>Akses, pembetulan, had pemprosesan dan penarikan persetujuan melalui <a href="mailto:hello@sabahbuskers.my">hello@sabahbuskers.my</a>. Kami menjawab dalam 21 hari.</p>')}
      ${sec('8. Kanak-kanak', '<p>Platform ini untuk 18 tahun ke atas sahaja.</p>')}
      ${sec('9. Perubahan', '<p>Perubahan material akan dipaparkan di sini dengan tarikh baharu dan mungkin memerlukan penerimaan semula (kunci TOS akan dinaikkan versi).</p>')}`;
    if (compact) return `<p class="tos-lead">Ringkasan: kami guna data anda untuk pengesahan, tempahan &amp; notifikasi sahaja. Butiran penuh dalam Dasar Privasi.</p>`;
    return full + `<p class="tos-lead" style="margin:18px 0 0;font-size:12px;color:var(--muted-2);">© 2026 Sabah Buskers Community (SBC). Hubungi <a href="mailto:hello@sabahbuskers.my">hello@sabahbuskers.my</a> untuk sebarang pertanyaan privasi.</p>`;
  };

  window.viewPrivacy = function () {
    return UI.page('Dasar Privasi', 'PDPA 2010 (Malaysia) · Berkuat kuasa 30 September 2026.',
      `<div class="panel">${PrivacyHTML()}</div>
      <div style="margin-top:20px;">
        <a class="btn btn-primary" href="?page=terms">Lihat Terma &amp; Syarat</a>
        <a class="btn btn-ghost" href="mailto:hello@sabahbuskers.my" style="margin-left:10px;">Hubungi Privasi</a>
      </div>`,
      { eyebrow: 'Perundangan' });
  };
})();
