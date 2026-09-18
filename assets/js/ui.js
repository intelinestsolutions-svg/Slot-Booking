(function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const money = (n) => {
    const v = Number(n || 0);
    return 'RM ' + (Number.isInteger(v) ? v.toLocaleString('en-MY') : v.toFixed(2));
  };

  const dateLabel = (iso) => {
    if (!iso) return '';
    const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    const day = LOCALE.dayShort[d.getDay()];
    return `${day}, ${d.getDate()} ${LOCALE.monthShort[d.getMonth()]} ${d.getFullYear()}`;
  };

  const todayISO = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  };

  const addDaysISO = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  };

  function toast(msg, type = '', ms = 3600) {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, ms - 300);
    setTimeout(() => t.remove(), ms);
  }

  function showLoader() {
    document.getElementById('loader')?.classList.remove('done');
  }

  function hideLoader() {
    setTimeout(() => document.getElementById('loader')?.classList.add('done'), 350);
  }

  function spinner() {
    return '<div class="spinner"></div>';
  }

  function page(title, subtitle, content, opts = {}) {
    const inner = typeof content === 'string' ? content : (typeof content === 'function' ? content() : '');
    return `
      <section class="page">
        <div class="container">
          ${title ? `
          <div class="page-title">
            <p class="eyebrow">${esc(opts.eyebrow || APP.tagline)}</p>
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </div>` : ''}
          ${inner}
        </div>
      </section>`;
  }

  function badge(tier) {
    const cls = (tier || '').toLowerCase().includes('hot') ? 'hot'
      : (tier || '').toLowerCase().includes('cold') ? 'cold' : 'warm';
    return `<span class="tier tier-${cls}">${esc(tier)}</span>`;
  }

  function statusTag(st) {
    return `<span class="st st-${esc(st)}">${esc(st)}</span>`;
  }

  function stars(rating) {
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let out = '<span class="stars" aria-label="' + r + ' daripada 5 bintang">';
    for (let i = 1; i <= 5; i++) {
      out += `<span class="star${i <= r ? ' filled' : ''}">★</span>`;
    }
    out += '</span>';
    return out;
  }

  /* -------- Ulasan modal (kongsi antara cari-slot & tempahan-saya) -------- */
  let rvModal = null;
  let rvStamp = 0;

  function closeReviews() {
    if (rvModal) { rvModal.remove(); rvModal = null; }
  }

  async function renderReviews(locationId, locationName) {
    const stamp = ++rvStamp;
    const box = rvModal && rvModal.querySelector('.rv-list');
    if (!box) return;
    box.innerHTML = '<div class="empty" style="padding:14px;"><div class="e-ico">⭐</div><p>Memuatkan ulasan...</p></div>';
    let data;
    try {
      data = await API.community.locationReviews(locationId);
    } catch (e) {
      if (stamp !== rvStamp) return;
      box.innerHTML = notice(e.message, 'error');
      return;
    }
    if (stamp !== rvStamp) return;

    const u = window.Session && Session.user;
    const canWrite = !!(u && u.role === 'busker' && u.verificationStatus === 'approved');
    const reviews = (data.reviews || []);
    const my = u ? reviews.find(r => r.userId === u.id) : null;

    box.innerHTML = `
      <div class="rv-agg" style="display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:1px solid var(--line);">
        <div style="text-align:center;">
          <div style="font-size:34px;font-weight:800;color:var(--gold);line-height:1;">${esc(data.ratingAvg || '0')}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">Daripada 5</div>
        </div>
        <div>
          ${stars(data.ratingAvg)}
          <div style="font-size:12.5px;color:var(--muted);margin-top:4px;">${data.ratingCount} ulasan</div>
        </div>
      </div>
      ${canWrite ? `
        <div class="rv-form" style="margin-top:16px;padding:14px;background:var(--bg-soft);border-radius:16px;">
          <p style="font-size:13.5px;font-weight:700;margin-bottom:8px;">${my ? 'Kemas kini ulasan anda' : 'Tulis ulasan anda'}</p>
          <div class="rv-rate" style="display:flex;gap:4px;margin-bottom:10px;">
            ${[1,2,3,4,5].map(n => { const on = n <= Number(my ? my.rating : 0); return `<button type="button" class="rv-star" data-v="${n}" data-chosen="${on ? '1' : '0'}" aria-label="${n} bintang">${on ? '★' : '☆'}</button>`; }).join('')}
          </div>
          <textarea class="input rv-txt" rows="3" maxlength="600" placeholder="Kongsi pengalaman persembahan anda di lokasi ini...">${my ? esc(my.comment || '') : ''}</textarea>
          <button type="button" class="btn btn-primary btn-sm rv-send" style="margin-top:10px;">${my ? 'Kemas Kini' : 'Hantar Ulasan'}</button>
        </div>` : ''}
      <div class="rv-items" style="margin-top:16px;display:flex;flex-direction:column;gap:14px;">
        ${reviews.map(r => `
          <div class="rv-item" style="display:flex;gap:12px;">
            <div class="rv-av" style="width:36px;height:36px;border-radius:50%;background:var(--grad-primary,rgba(255,190,0,.16));display:flex;align-items:center;justify-content:center;flex:0 0 auto;">🎤</div>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <b style="font-size:13.5px;">${esc(r.stageName || 'Busker')}</b>
                <small style="color:var(--muted-2)">${esc((r.createdAt || '').slice(0, 10))}</small>
              </div>
              <div style="margin-top:3px;">${stars(r.rating)}</div>
              ${r.comment ? `<p style="font-size:13.5px;color:var(--ink-soft,#555);margin-top:6px;">${esc(r.comment)}</p>` : ''}
            </div>
          </div>`).join('') || '<div class="empty" style="padding:16px;"><p>Belum ada ulasan.</p></div>'}
      </div>`;

    const rate = box.querySelector('.rv-rate');
    if (rate) {
      const pick = (n) => {
        rate.querySelectorAll('.rv-star').forEach((b, i) => { b.textContent = i < n ? '★' : '☆'; b.dataset.chosen = i < n ? '1' : '0'; });
      };
      rate.querySelectorAll('.rv-star').forEach((b, i) => {
        b.addEventListener('click', () => pick(i + 1));
      });
      const send = box.querySelector('.rv-send');
      send.addEventListener('click', async () => {
        const v = rate.querySelectorAll('.rv-star[data-chosen="1"]').length;
        if (!v) { toast('Pilih bintang dahulu.', 'err'); return; }
        send.disabled = true;
        try {
          await API.community.addReview({ locationId, rating: v, comment: box.querySelector('.rv-txt').value.trim() });
          toast('Ulasan disimpan. Terima kasih!', 'ok');
          renderReviews(locationId, locationName);
        } catch (e) {
          send.disabled = false;
          toast(e.message, 'err');
        }
      });
    }
  }

  function reviewsModal(locationId, locationName) {
    closeReviews();
    rvModal = document.createElement('div');
    rvModal.className = 'modal-overlay';
    rvModal.innerHTML = `
      <div class="modal rv-modal" role="dialog" aria-modal="true" aria-label="${esc(locationName)} — Ulasan">
        <div class="modal-head"><h3>⭐ ${esc(locationName)}</h3><button class="modal-x" aria-label="Tutup">✕</button></div>
        <div class="modal-body"><div class="rv-list"></div></div>
      </div>`;
    rvModal.addEventListener('click', (e) => { if (e.target === rvModal) closeReviews(); });
    rvModal.querySelector('.modal-x').addEventListener('click', closeReviews);
    document.body.appendChild(rvModal);
    renderReviews(locationId, locationName);
  }
  window.addEventListener('popstate', closeReviews);

  function notice(msg, type = 'info') {
    return `<div class="notice notice-${type}"><span>${esc(msg)}</span></div>`;
  }

  function on(el, ev, fn) {
    document.addEventListener(ev, (e) => {
      if (el.contains(e.target)) fn(e);
    });
  }

  window.UI = { esc, money, dateLabel, todayISO, addDaysISO, toast, showLoader, hideLoader, page, badge, statusTag, notice, on, stars, reviewsModal };
})();