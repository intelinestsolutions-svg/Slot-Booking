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
          <label class="consent-row tos-agree"><input type="checkbox" id="tosAgree"> Saya telah membaca dan <b>bersetuju</b> dengan Terma &amp; Syarat serta dasar privasi aplikasi.</label>
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
    });
    tosModal.querySelector('.modal-x').addEventListener('click', closeTos);
    tosModal.addEventListener('click', (e) => { if (e.target === tosModal) closeTos(); });
    document.body.appendChild(tosModal);
  }

  function ensureTos() {
    if (window.TermsHTML) {
      let accepted = false;
      try { accepted = localStorage.getItem(APP.tosKey) === '1'; } catch (e) {}
      if (!accepted) setTimeout(showTos, 650);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('year').textContent = new Date().getFullYear();

    const burger = document.getElementById('burger');
    const menu = document.getElementById('mobileMenu');
    burger.addEventListener('click', () => {
      menu.classList.toggle('open');
      burger.classList.toggle('open');
      burger.setAttribute('aria-expanded', menu.classList.contains('open'));
    });

    Router.render();

    window.addEventListener('popstate', () => Router.render());

    ensureTos();

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
})();