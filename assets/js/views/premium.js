(function () {
  const PRICE = 120;

  function guardLogged() {
    const u = Session.user;
    if (!u) {
      Router.go('login', { next: 'premium' });
      return null;
    }
    return u;
  }

  const BENEFITS = [
    'Tempahan slot tanpa had',
    'Badge Premium dan keutamaan hotspot',
    'Statistik persembahan lanjutan',
    'Pautan TikTok/Instagram ditaja',
  ];

  window.viewPremium = function (q) {
    const u = guardLogged();
    if (!u) return '';
    return UI.page('Keahlian Premium', 'Naik taraf akaun anda untuk kelebihan penuh SBC.',
      `
      <div id="premVerify"></div>
      <div id="premMain"><div class="empty"><div class="e-ico">⭐</div><p>Memuatkan status keahlian...</p></div></div>
      <div id="premHistory" style="margin-top:8px;"></div>`,
      { eyebrow: 'Premium' });
  };

  window.ViewHooks = window.ViewHooks || {};

  window.ViewHooks.viewPremium = async function (q) {
    const u = guardLogged();
    if (!u) return;

    const verifyMsg = document.getElementById('premVerify');
    if (q.verify === '1') {
      try {
        const res = await API.premium.verifyReturn({ billCode: q.billCode || '', status_id: q.status_id || '1' });
        verifyMsg.innerHTML = UI.notice(res.message || 'Status dikemas kini.', res.status === 'confirmed' ? 'ok' : 'info');
        UI.toast(res.message || 'Status dikemas kini.', res.status === 'confirmed' ? 'ok' : 'err');
      } catch (e) {
        verifyMsg.innerHTML = UI.notice(e.message, 'error');
      }
      const next = new URLSearchParams(location.search);
      next.delete('verify'); next.delete('billCode'); next.delete('status_id');
      history.replaceState(null, '', '?' + next.toString());
    }

    let status = { isPremium: false, premiumExpiresAt: '', price: PRICE, months: 1 };
    let history = [];
    try {
      const [s, h] = await Promise.all([
        API.premium.status(),
        API.premium.history().catch(() => ({ purchases: [] })),
      ]);
      status = { ...status, ...(s || {}) };
      history = (h && h.purchases) || [];
    } catch (e) {
      document.getElementById('premMain').innerHTML = UI.notice(e.message, 'error');
      return;
    }

    const canSubscribe = u.role === 'busker' && u.verificationStatus === 'approved';

    const main = document.getElementById('premMain');
    if (status.isPremium) {
      main.innerHTML = `
        <div class="card prem-card prem-active">
          <div class="prem-badge">⭐ Premium Aktif</div>
          <h3 style="font-size:24px;">Anda adalah ahli Premium</h3>
          <p style="color:var(--muted);margin-top:6px;">Keahlian anda sah sehingga <b style="color:var(--gold)">${UI.esc(UI.dateLabel(status.premiumExpiresAt))}</b>.</p>
          <div class="prem-perk-grid" style="margin-top:18px;">
            ${BENEFITS.map(b => `<div class="prem-perk"><span class="prem-ok">✓</span>${UI.esc(b)}</div>`).join('')}
          </div>
          <p style="font-size:13px;color:var(--muted-2);margin-top:18px;">Sebelum tamat tempoh, anda boleh memperbaharui untuk kekal aktif.</p>
        </div>`;
    } else {
      main.innerHTML = `
        <div class="card prem-card">
          <div class="price"><small>RM</small>${UI.esc(status.price)}<small>/bulan</small></div>
          <h3 style="font-size:22px;">Keahlian Premium</h3>
          <p style="color:var(--muted);margin-top:6px;">Buka kunci semua kelebihan platform untuk ahli disahkan.</p>
          <ul class="prem-list" style="margin-top:16px;">
            ${BENEFITS.map(b => `<li><span class="prem-ok">✓</span>${UI.esc(b)}</li>`).join('')}
          </ul>
          ${canSubscribe
            ? `<button class="btn btn-primary btn-block" id="premSubscribe" style="margin-top:20px;">Naik Taraf ke Premium · ${UI.money(status.price)}</button>`
            : UI.notice(u.role !== 'busker' ? 'Keahlian premium hanya untuk akaun busker.' : 'Akaun anda mesti diluluskan admin sebelum melanggan premium.', 'info')}
        </div>`;
      const btn = document.getElementById('premSubscribe');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Menyediakan bil...';
          try {
            const res = await API.premium.subscribe();
            window.location.href = res.paymentUrl;
          } catch (e) {
            btn.disabled = false;
            btn.textContent = 'Naik Taraf ke Premium';
            UI.toast(e.message, 'err');
          }
        });
      }
    }

    const histBox = document.getElementById('premHistory');
    if (!history.length) {
      histBox.innerHTML = '';
      return;
    }
    histBox.innerHTML = `
      <div class="panel">
        <h3>Rekod Langganan</h3>
        <div class="table-wrap" style="margin-top:14px;">
          <table class="data">
            <thead><tr><th>Tarikh</th><th>Jumlah</th><th>Bil</th><th>Status</th></tr></thead>
            <tbody>
              ${history.map(h => `
                <tr>
                  <td>${UI.esc((h.createdAt || '').replace('T', ' '))}</td>
                  <td style="color:var(--gold);font-weight:700;">${UI.money(h.amount)}</td>
                  <td><small>${UI.esc(h.billCode || '—')}</small></td>
                  <td><span class="st st-${h.status === 'paid' ? 'ok' : h.status === 'cancelled' ? 'cancelled' : 'pending'}">${UI.esc(h.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  };
})();