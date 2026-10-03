(function () {
  let tosModal = null;

  function closeTos() {
    if (tosModal) { tosModal.remove(); tosModal = null; }
  }

  function showTos() {
    closeTos();
    tosModal = document.createElement('div');
    tosModal.className = 'modal-overlay tos-overlay';
    tosModal.innerHTML = `
      <div class="modal tos-modal" role="dialog" aria-modal="true" aria-labelledby="tosTitle">
        <div class="modal-head">
          <h3 id="tosTitle">Terma &amp; Syarat · ${UI.esc(APP.mobileLabel)}</h3>
          <button class="modal-x" type="button" aria-label="Tutup">✕</button>
        </div>
        <div class="modal-body tos-body">${window.TermsHTML ? TermsHTML(true) : ''}</div>
        <div class="tos-foot">
          <label class="consent-row tos-agree"><input type="checkbox" id="tosAgree"> <span>Saya telah membaca dan <b>bersetuju</b> dengan <a href="?page=terms">Terma &amp; Syarat</a> serta <a href="?page=privacy">dasar privasi</a> aplikasi.</span></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
            <button class="btn btn-primary tos-accept" type="button" disabled>Teruskan ke Aplikasi</button>
            <a class="btn btn-ghost" style="text-decoration:none;" href="?page=terms">Lihat Terma Penuh</a>
          </div>
        </div>
      </div>`;

    const agree = tosModal.querySelector('#tosAgree');
    const accept = tosModal.querySelector('.tos-accept');
    agree.addEventListener('change', () => {
      accept.disabled = !agree.checked;
      accept.classList.toggle('btn-dim', !agree.checked);
    });
    accept.addEventListener('click', () => {
      try { localStorage.setItem(APP.tosKey, '1'); } catch (e) {}
      closeTos();
      requestMicPermission();
    });
    tosModal.querySelector('.modal-x').addEventListener('click', closeTos);
    tosModal.addEventListener('click', (e) => { if (e.target === tosModal) closeTos(); });
    document.body.appendChild(tosModal);
  }

  function requestMicPermission() {
    const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.DevicePermission;
    if (!window.APP.isNative || !P) return;
    try {
      P.requestMicrophone().then(() => {}).catch(() => {});
    } catch (e) {}
  }

  function requestNotifPermission() {
    const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Notifier;
    if (!window.APP.isNative || !P) return;
    try {
      P.bootstrap().catch(() => {});
      P.request().then(() => {}).catch(() => {});
    } catch (e) {}
  }

  function ensureTos() {
    if (!window.APP.isNative) return true;
    if (window.TermsHTML) {
      let accepted = false;
      try { accepted = localStorage.getItem(APP.tosKey) === '1'; } catch (e) {}
      if (!accepted) setTimeout(showTos, 650);
      return accepted;
    }
    return true;
  }

  /* Web privacy-consent banner (PDPA): non-native browsers only.
     Native gate above already handles in-app consent. */
  function ensureWebConsent() {
    if (window.APP.isNative) return;
    let choice = null;
    try { choice = localStorage.getItem('sbc-consent'); } catch (e) {}
    if (choice) return;
    const bar = document.createElement('div');
    bar.id = 'sbcConsent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Persetujuan privasi');
    bar.innerHTML = `
      <div class="sbc-consent-text"><b>Privasi anda penting.</b>
      <span>Kami tidak menggunakan kuki pengiklanan/penjejakan — hanya storan tempatan yang diperlukan (sesi, bahasa, pilihan anda). Dengan meneruskan, anda bersetuju dengan <a href="?page=terms">Terma</a> &amp; <a href="?page=privacy">Dasar Privasi (PDPA)</a>.</span></div>
      <div class="sbc-consent-btns">
        <button type="button" class="btn btn-primary btn-sm" data-choice="accept">Terima</button>
        <button type="button" class="btn btn-ghost btn-sm" data-choice="decline">Tolak</button>
      </div>`;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-choice]');
      if (!b) return;
      try { localStorage.setItem('sbc-consent', b.dataset.choice); } catch (err) {}
      bar.classList.add('gone');
      setTimeout(() => bar.remove(), 400);
    });
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add('on'));
  }
  window.sbcConsentManage = function () {
    try { localStorage.removeItem('sbc-consent'); } catch (e) {}
    const old = document.getElementById('sbcConsent');
    if (old) old.remove();
    ensureWebConsent();
  };

  document.addEventListener('DOMContentLoaded', function () {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    setTimeout(function () {
      const l = document.getElementById('loader');
      if (l) l.classList.add('done');
    }, 12000);

    if (window.APP.isNative) {
      const lt = document.querySelector('.loader-title a');
      if (lt) lt.setAttribute('href', '?page=landing');
    }

    const burger = document.getElementById('burger');
    const menu = document.getElementById('mobileMenu');
    burger.addEventListener('click', () => {
      menu.classList.toggle('open');
      burger.classList.toggle('open');
      burger.setAttribute('aria-expanded', menu.classList.contains('open'));
    });

    Router.render();

    window.addEventListener('popstate', () => Router.render());

    const tosAccepted = ensureTos();
    if (tosAccepted) setTimeout(requestMicPermission, 1400);
    setTimeout(requestNotifPermission, 2600);
    setTimeout(ensureWebConsent, 1200);

    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          reveal.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    window.RevealObserver = reveal;
    document.addEventListener('revealReady', () => {
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => reveal.observe(el));
      setTimeout(() => {
        document.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'));
      }, 900);
    });
  });

  window.__scrollToHashTarget = function () {
    const id = location.hash ? decodeURIComponent(location.hash.replace(/^#/, '')) : '';
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelectorAll('.reveal').forEach(n => n.classList.add('in'));
    setTimeout(() => {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
    }, 430);
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const m = (a.getAttribute('href') || '').match(/^(?:\?page=landing)?#(.+)$/);
    if (!m) return;
    e.preventDefault();
    const id = m[1];
    const current = new URLSearchParams(location.search).get('page') || 'landing';
    if (current === 'landing') {
      const el = document.getElementById(id);
      if (el) {
        el.querySelectorAll('.reveal').forEach(n => n.classList.add('in'));
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '?page=landing#' + id); } catch (e2) {}
      } else if (window.APP.isNative) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        location.href = '?page=landing#' + id;
      }
      return;
    }
    location.href = '?page=landing#' + id;
  });
})();