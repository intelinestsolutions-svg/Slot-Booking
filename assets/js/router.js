(function () {
  const root = document.getElementById('root');

  const VIEWS = {
    landing: 'viewLanding',
    login: 'viewLogin',
    'busker_login': 'viewLogin',
    'admin_login': 'viewLogin',
    register: 'viewRegister',
    'busker-landing': 'viewLanding',
    'cari-slot': 'viewCariSlot',
    'slot-booking': 'viewSlotBooking',
    'bersedia': 'viewBersedia',
    'tempahan-saya': 'viewTempahan',
    profil: 'viewProfil',
    'kemaskini-profil': 'viewKemaskini',
    'performance-dashboard': 'viewDashboard',
    'ahli-buzzking': 'viewCommunity',
    inbox: 'viewInbox',
    tools: 'viewTools',
    'about-buzzking': 'viewAbout',
    pricing: 'viewPricing',
    'admin-dashboard': 'viewAdmin',
    'admin-finance': 'viewAdminFinance',
    'pengurusan-slot': 'viewAdminSlots',
    mocks: 'viewTools',
  };

  window.Router = {
    query() {
      return Object.fromEntries(new URLSearchParams(location.search));
    },
    go(page, params = {}) {
      params.page = page;
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, v); });
      location.href = '?' + qs.toString();
    },
    replace(page, params = {}) {
      params.page = page;
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, v); });
      history.replaceState(null, '', '?' + qs.toString());
      this.render();
    },
    path() {
      return location.pathname;
    },
    isSchedule() {
      return /^\/jadualbuskers\//.test(location.pathname);
    },
    scheduleSlug() {
      const m = location.pathname.match(/^\/jadualbuskers\/([^/]+)/);
      return m ? m[1] : null;
    },
    role() {
      return (Session.user || {}).role || null;
    },
    requireRole(role) {
      return !!Session.user && (!role || Session.user.role === role);
    },
    async render() {
      UI.showLoader();
      const q = this.query();
      let page = q.page || 'landing';
      let viewFn = VIEWS[page];

      if (!viewFn && this.isSchedule()) {
        viewFn = 'viewSchedule';
      }

      const user = Session.user;
      const loginPages = ['slot-booking', 'tempahan-saya', 'profil', 'kemaskini-profil', 'performance-dashboard', 'inbox', 'tools', 'bersedia'];
      if (loginPages.includes(page) && !user) {
        return this.go('login', { next: page });
      }
      if (['slot-booking', 'tempahan-saya', 'profil', 'performance-dashboard', 'inbox', 'tools', 'bersedia'].includes(page) && user && user.role && user.role !== 'busker') {
        return this.go('landing');
      }

      if (typeof window[viewFn] !== 'function') {
        root.innerHTML = UI.page('Tidak Dijumpai', 'Halaman yang anda cari tidak wujud.', '') + UI.notice('Sila cuba pautan lain.', 'error');
        UI.hideLoader();
        Nav.update();
        return;
      }

      try {
        const html = await window[viewFn](q);
        root.innerHTML = html;
        window.Nav.refresh();
        if (window.ViewHooks && window.ViewHooks[viewFn]) {
          await window.ViewHooks[viewFn](q);
        }
        document.dispatchEvent(new Event('revealReady'));
        UI.hideLoader();
        if (window.Reminders && typeof window.Reminders.ensure === 'function') {
          window.Reminders.ensure();
        }
      } catch (e) {
        root.innerHTML = UI.page('Ralat', 'Sesuatu telah berlaku.', '') +
          `<div class="container"><div class="notice notice-error">${UI.esc(e.message)}</div></div>`;
        UI.hideLoader();
        Nav.update();
      }
    },
  };

  window.Nav = {
    links() {
      const u = Session.user;
      const role = u ? u.role : null;
      const home = '?page=landing';
      if (role === 'busker') {
        return [
          ['?page=cari-slot', 'Cari Slot'],
          ['?page=bersedia', 'Persediaan'],
          ['?page=tempahan-saya', 'Tempahan Saya'],
          ['?page=performance-dashboard', 'Dashboard'],
          ['?page=ahli-buzzking', 'Komuniti'],
          ['?page=tools', 'Alatan'],
          ['?page=about-buzzking', 'Tentang'],
        ];
      }
      if (role === 'admin') {
        return [
          ['?page=admin-dashboard', 'Panel Admin'],
          ['?page=admin-finance', 'Kewangan'],
          ['?page=pengurusan-slot', 'Slot'],
          ['?page=kemaskini-profil', 'Profil'],
        ];
      }
      return [
        ['?page=landing', 'Laman Utama'],
        ['?page=cari-slot', 'Cari Slot'],
        ['?page=about-buzzking', 'Tentang'],
      ];
    },

    update() {
      const ul = document.getElementById('navLinks');
      const userBox = document.getElementById('navUser');
      const menu = document.getElementById('mobileMenu');
      if (!ul) return;

      const page = new URLSearchParams(location.search).get('page') || 'landing';
      const links = this.links();
      ul.innerHTML = links.map(([href, label]) =>
        `<li><a href="${href}" class="${page === href.split('page=')[1] ? 'is-active' : ''}">${label}</a></li>`).join('');

      const u = Session.user;
      if (u) {
        const roleBadge = u.role === 'busker' ? (u.stageName || u.fullName || u.email) : u.role;
        userBox.innerHTML = `
          <div class="nav-user">
            <a href="?page=kemaskini-profil" class="nav-avatar" title="Profil saya">${u.avatar
              ? `<img src="${UI.esc(APP.abs(u.avatar))}" alt="Gambar profil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
              : UI.esc(('' + (u.stageName || u.fullName || u.email || 'U')).slice(0, 1).toUpperCase())}</a>
            <div class="who"><a href="${u.role === 'busker' ? '?page=profil' : '?page=admin-dashboard'}" style="color:var(--cream)">${UI.esc(roleBadge)}</a><small>${u.role}</small></div>
            <a class="btn btn-ghost btn-sm" href="#" data-logout>Log Keluar</a>
          </div>`;
        userBox.querySelector('[data-logout]').addEventListener('click', async (e) => {
          e.preventDefault();
          try { await API.auth.logout(); } catch (e) {}
          Session.logout();
          Router.go('landing');
        });
      } else {
        userBox.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;">
            <a class="btn btn-ghost btn-sm" href="?page=login">Log Masuk</a>
            <a class="nav-cta" href="?page=register" style="font-size:13px;padding:9px 16px;">Daftar Sebagai Busker</a>
          </div>`;
      }

      menu.innerHTML = links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('') +
        (u ? '<a href="#" data-logout style="color:var(--danger)">Log Keluar</a>'
          : '<a href="?page=login" style="color:var(--gold);font-weight:800;">Log Masuk / Daftar</a>');
      const lo = menu.querySelector('[data-logout]');
      if (lo) lo.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await API.auth.logout(); } catch (e) {}
        Session.logout();
        Router.go('landing');
      });
    },

    refresh() {
      document.getElementById('mobileMenu')?.classList.remove('open');
      document.getElementById('burger')?.classList.remove('open');
      this.update();
    },
  };
})();