(function () {
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