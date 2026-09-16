(function () {
  const P = () => APP.apiPrefix;

  function file(kind) {
    const map = {
      auth: 'auth.php', slots: 'slots.php', bookings: 'bookings.php',
      community: 'community.php', partner: 'partner.php', admin: 'admin.php',
      prayer: 'prayer.php',
    };
    return map[kind] || kind;
  }

  async function call(kind, action, opts = {}) {
    const { method = 'GET', body, params = {} } = opts;
    const qs = new URLSearchParams({ action, ...params });
    const url = `${P()}${file(kind)}?${qs}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(APP.tokenKey);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['X-Auth-Token'] = token;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: method === 'POST' && body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw new Error('Sambungan ke pelayan mengambil masa terlalu lama. Sila cuba semula.');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (data && data.success === false) {
      throw new Error(data.error || 'Ralat berlaku.');
    }
    return data;
  }

  window.API = {
    auth: {
      register: (b) => call('auth', 'register', { method: 'POST', body: b }),
      login: (b) => call('auth', 'login', { method: 'POST', body: b }),
      me: () => call('auth', 'me'),
      logout: () => call('auth', 'logout'),
      updateProfile: (b) => call('auth', 'update_profile', { method: 'POST', body: b }),
      changePassword: (b) => call('auth', 'change_password', { method: 'POST', body: b }),
      uploadAvatar: (jpeg) => {
        const fd = new FormData();
        fd.append('avatar', jpeg);
        const url = `${P()}${file('auth')}?${new URLSearchParams({ action: 'upload_avatar' })}`;
        const headers = {};
        const token = localStorage.getItem(APP.tokenKey);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          headers['X-Auth-Token'] = token;
        }
        return fetch(url, { method: 'POST', headers, body: fd })
          .then(r => r.json().catch(() => null))
          .then((data) => {
            if (!data || data.success === false) throw new Error((data && data.error) || 'Ralat memuat naik gambar.');
            return data;
          });
      },
    },
    locations: {
      list: (params) => call('slots', 'list', { params }),
      areas: () => call('slots', 'areas'),
      overview: (locationId, days = 14) => call('slots', 'overview', { params: { locationId, days } }),
      booking: (slotId) => call('slots', 'booking', { params: { slotId } }),
      publicSchedule: (slug, days = 7) => call('bookings', 'public_schedule', { params: { slug, days } }),
    },
    bookings: {
      create: (b) => call('bookings', 'book', { method: 'POST', body: b }),
      mine: () => call('bookings', 'my_bookings'),
      cancel: (b) => call('bookings', 'cancel', { method: 'POST', body: b }),
      pay: (b) => call('bookings', 'pay', { method: 'POST', body: b }),
      confirmAttendance: (b) => call('bookings', 'confirm_attendance', { method: 'POST', body: b }),
      verifyReturn: (params) => call('bookings', 'verify_return', { params }),
      partnerList: () => call('bookings', 'partner_bookings'),
    },
    community: {
      buskers: () => call('community', 'busker_list'),
      notifications: () => call('community', 'notifications'),
      markRead: () => call('community', 'mark_read', { method: 'POST' }),
      stats: () => call('community', 'stats'),
    },
    partner: {
      dashboard: () => call('partner', 'dashboard'),
      setStatus: (b) => call('partner', 'set_status', { method: 'POST', body: b }),
      register: (b) => call('partner', 'partner_registration', { method: 'POST', body: b }),
    },
    prayer: {
      today: () => call('prayer', 'today'),
    },
    admin: {
      applications: () => call('admin', 'applications'),
      approve: (b) => call('admin', 'approve', { method: 'POST', body: b }),
      financials: () => call('admin', 'financials'),
      registerAdmin: (b) => call('admin', 'register_admin', { method: 'POST', body: b }),
      listBuskers: () => call('admin', 'buskers'),
      assignBusker: (b) => call('admin', 'assign_busker', { method: 'POST', body: b }),
    },
  };

  window.Session = {
    get token() { return localStorage.getItem(APP.tokenKey); },
    setToken(t) { if (t) localStorage.setItem(APP.tokenKey, t); else localStorage.removeItem(APP.tokenKey); },
    get user() {
      try { return JSON.parse(localStorage.getItem(APP.userKey)); } catch (e) { return null; }
    },
    setUser(u) { if (u) localStorage.setItem(APP.userKey, JSON.stringify(u)); else localStorage.removeItem(APP.userKey); },
    logout() { this.setToken(null); this.setUser(null); },
  };
})();