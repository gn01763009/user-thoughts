(function () {
  var toggle = document.querySelector('.menu-toggle');
  if (!toggle) return;
  var panel = null;

  function build() {
    panel = document.createElement('div');
    panel.className = 'mobile-menu';
    panel.id = 'mobile-menu';
    var brand = document.createElement('a');
    brand.className = 'mobile-menu-brand';
    brand.href = 'index.html';
    brand.textContent = 'Pellwick';
    panel.appendChild(brand);
    document.querySelectorAll('#site-nav a').forEach(function (link) {
      var copy = document.createElement('a');
      copy.href = link.getAttribute('href');
      copy.textContent = link.textContent;
      panel.appendChild(copy);
    });
    document.body.appendChild(panel);
  }

  toggle.addEventListener('click', function () {
    if (!panel) build();
    toggle.setAttribute('aria-expanded', 'true');
  });
})();
