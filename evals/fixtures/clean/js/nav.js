(function () {
  var button = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  function set(open) {
    nav.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }
  button.addEventListener('click', function () { set(button.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
})();
