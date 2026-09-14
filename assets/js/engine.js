/* ======================================================================
   SabahBuskers — ENJIN TEMPATAN (Backend Percuma Penuh)
   ======================================================================
   Menggantikan 100% PHP + SQLite + ToyyibPay dengan pangkalan data
   localStorage pelayar. TIADA server, TIADA PHP, TIADA fetch, TIADA
   yuran, TIADA kad — RM0. Boleh dikehoskan pada mana-mana hos statik
   percuma (Netlify / GitHub Pages / Vercel / Hostinger Static) atau
   terus daripada file://.

   Menyediakan paparan SAMA seperti api.js (window.API + Session +
   UI) supaya SEMUA view sedia ada terus berfungsi tanpa perubahan.
   ====================================================================== */
(function () {
  'use strict';

  /* ==================================================================
     PEMBANTU
     ================================================================== */
  const DB_KEY = 'sbh_sabahbuskers_db_v1';
  const nowISO = () => new Date().toISOString();

  /* Kata laluan di-hash (demo sahaja — tiada server, maka tidak boleh
     guna bcrypt. Fungsi ringkas untuk demonstrasi tempatan.) */
  function hashpw(p) {
    let h = 5381;
    const s = String(p || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h$' + h.toString(36) + '.' + s.length;
  }
  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const DAY_M = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const DAY_D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayShort = (iso) => DAY_D[new Date(iso + 'T00:00:00').getDay()];
  const dayLong = (iso) => DAY_M[new Date(iso + 'T00:00:00').getDay()];
  const randToken = () => 't_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2.a);
  const escHTML = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ==================================================================
     PANGKALAN DATA (localStorage)
     ================================================================== */
  const DB_KEY2 = 'sbh_sabahbuskers_db_v1';
  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY2);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function saveDB(d) {
    try { localStorage.setItem(DB_KEY2, JSON.stringify(d)); } catch (e) { /* penuh? abaikan */ }
  }

  /* ==================================================================
     SESSION — sama seperti api.js; disokong terus oleh view
     ================================================================== */
  const TOKEN_KEY = 'sbh_sabahbuskers_token';
  const USER_KEY = 'sbh_sabahbuskers_user';
  function readUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }
  window.Session = {
    get token() { return localStorage.getItem(TOKEN_KEY); },
    setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); },
    get user() { return readUser(); },
    setUser(u) { if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); },
    logout() { this.setToken(null); this.setUser(null); },
  };

  /* ==================================================================
     SEED — LOKASI SEBENAR & TEMPLAT SLOT (HARGA INDUSTRI SEBENAR)
     ================================================================== */
  const dt = '2026-09-14'; /* tarikh rujukan demo */

  function buildSeed() {
    const now = nowISO();
    let uid = 0;
    const mkUser = (partial) => {
      uid++;
      return Object.assign({
        id: uid, email: '', password: '', role: 'busker', fullName: '', stageName: '', genre: 'Pop',
        state: 'Sabah', city: 'Kota Kinabalu', phone: '', verificationStatus: 'approved',
        isActive: 1, isPremium: 0, token: null, createdAt: now,
      }, partial);
    };

    const users = [];
    /* Demo busker diluluskan */
    users.push(mkUser({
      email: 'busker@demo.my', password: hashpw('demo123'), role: 'busker',
      fullName: 'Aiman Hadi', stageName: 'Aiman Akustik', genre: 'Pop Akustik',
      state: 'Sabah', city: 'Kota Kinabalu', description: 'Penyanyi gitar akustik.',
      instagram: 'aiman.akustik', tiktok: 'aimanakustik', verificationStatus: 'approved',
    }));
    /* Demo penyelia (partner) */
    users.push(mkUser({
      email: 'partner@demo.my', password: hashpw('demo123'), role: 'partner',
      fullName: 'Penyelia DBKK', verificationStatus: 'approved',
    }));
    /* Demo admin */
    users.push(mkUser({
      email: 'admin@demo.my', password: hashpw('admin123'), role: 'admin',
      fullName: 'Admin SabahBuskers', verificationStatus: 'approved',
    }));

    /* ============ LOKASI (SPEC RASMI INDUSTRI) ============
       Hotspot Dataran Deasoka area — RM10, Jumaat & Sabtu malam + Ahad pagi
       + Ahad petang. Semua DBKK / Kota Kinabalu.
    */
    const L = [];
    let lid = 0;
    const mkLoc = (p) => {
      lid++;
      return Object.assign({
        id: lid, isActive: 1, priceFrom: 0, sessions: 'Malam', tier: 'Coldspot',
        area: 'Bandar', pbt: 'DBKK', city: 'Kota Kinabalu', state: 'Sabah',
      }, p);
    };
    L.push(mkLoc({ slug: 'dataran-deasoka', name: 'Dataran Deasoka', tier: 'Hotspot', area: 'Bandar',
      priceFrom: 10, sessions: 'Malam', address: 'Jalan Tun Fuad Stephens', description: 'Dataran utama pusat bandar Kota Kinabalu. Keramaian tinggi pada waktu malam hujung minggu.' }));
    L.push(mkLoc({ slug: 'bsn', name: 'BSN (Jalan Gaya)', tier: 'Hotspot', area: 'Bandar',
      priceFrom: 10, sessions: 'Malam', address: 'Jalan Gaya', description: 'Hadapan bangunan BSN di Jalan Gaya, kawasan tumpuan pelancong.' }));
    L.push(mkLoc({ slug: 'ex-pizza', name: 'Ex-Pizza', tier: 'Hotspot', area: 'Bandar',
      priceFrom: 10, sessions: 'Malam', address: 'Jalan Gaya', description: 'Bekas lokasi Pizza Hut di Jalan Gaya — tapak busking terkenal.' }));
    L.push(mkLoc({ slug: 'horizon-water-fountain', name: 'Horizon Water Fountain', tier: 'Hotspot', area: 'Bandar',
      priceFrom: 10, sessions: 'Malam', address: 'Jalan Tun Fuad Stephens', description: 'Air pancut hadapan Horizon Hotel, lokasi ikonik pusat bandar.' }));
    L.push(mkLoc({ slug: 'jalan-jati', name: 'Jalan Jati', tier: 'Coldspot', area: 'Bandar',
      priceFrom: 5, sessions: 'Petang', address: 'Jalan Jati', description: 'Sepanjang Jalan Jati, sesi petang dan malam. Slot RM5.' }));
    L.push(mkLoc({ slug: 'segama-waterfront-dolphin', name: 'Segama Waterfront (Dolphin)', tier: 'Coldspot', area: 'Segama',
      priceFrom: 5, sessions: 'Malam', address: 'Segama Waterfront', description: 'Kawasan tepi laut Segama, arca Dolphin. Slot RM5 setiap malam.' }));
    L.push(mkLoc({ slug: 'tanjung-lipat-likas', name: 'Tanjung Lipat, Likas', tier: 'Coldspot', area: 'Likas',
      priceFrom: 5, sessions: 'Petang', address: 'Jalan Tanjung Lipat, Likas', description: 'Taman tepi pantai Tanjung Lipat, Likas. Slot RM5 setiap petang.' }));
    L.push(mkLoc({ slug: 'tanjung-aru', name: 'Tanjung Aru', tier: 'Coldspot', area: 'Tanjung Aru',
      priceFrom: 5, sessions: 'Petang', address: 'Jalan Tanjung Aru', description: 'Pantai Tanjung Aru. Slot RM5 setiap petang.' }));
    L.push(mkLoc({ slug: 'kkia', name: 'KKIA (Lapangan Terbang Antarabangsa KK)', tier: 'Hotspot', area: 'KKIA',
      priceFrom: 5, sessions: 'Pagi/Tengah Hari/Petang/Malam', address: 'Jalan Lapangan Terbang, Tanjung Aru', description: 'Lapangan Terbang Antarabangsa Kota Kinabalu. Sesebuah sesi 4 jam, RM5.' }));

    /* ============ TEMPLAT SLOT ============
       Mengikut spec rasmi:
       - Hotspot Dataran (5 lokasi) → RM10 sesi Malam Jumaat/Sabtu, RM10 Ahad Pagi
       - Jalan Jati → RM5 Petang (setiap hari)
       - Segama Waterfront (Dolphin) → RM5 Malam (setiap hari)
       - Tanjung Lipat Likas → RM5 Petang (setiap hari)
       - Tanjung Aru → RM10 Petang? Tidak: spec kata Tanjung Aru RM10 setiap petang sehingga 8 malam.
    */
    const templates = [];
    let said = 0 Processing Rule: jika tiada bayaran tercatat, harga Malam = RM10 untuk 5 lokasi hotspot utama; petang = RM5.
