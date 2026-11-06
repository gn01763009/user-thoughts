(function () {
  var modal = document.createElement('div');
  modal.className = 'newsletter-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'newsletter-title');
  modal.hidden = true;
  modal.innerHTML =
    '<div class="newsletter-card">' +
    '<button type="button" class="newsletter-close" aria-label="Close">\u00d7</button>' +
    '<span class="eyebrow">The Wren Weekly</span>' +
    '<h2 id="newsletter-title">Don\u2019t miss out on insights</h2>' +
    '<p>Join our community and get fresh ideas delivered every week.</p>' +
    '<form><input type="email" name="email" placeholder="you@company.com" aria-label="Email address">' +
    '<button type="submit" class="btn btn-accent">Subscribe</button></form></div>';
  document.body.appendChild(modal);
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  modal.querySelector('.newsletter-close').addEventListener('click', close);
  modal.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); close(); });
  setTimeout(function () { modal.hidden = false; document.body.style.overflow = 'hidden'; }, 400);
})();
