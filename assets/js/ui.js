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

  function notice(msg, type = 'info') {
    return `<div class="notice notice-${type}"><span>${esc(msg)}</span></div>`;
  }

  function on(el, ev, fn) {
    document.addEventListener(ev, (e) => {
      if (el.contains(e.target)) fn(e);
    });
  }

  window.UI = { esc, money, dateLabel, todayISO, addDaysISO, toast, showLoader, hideLoader, page, badge, statusTag, notice, on };
})();