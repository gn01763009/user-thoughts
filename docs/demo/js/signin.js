(function () {
  var form = document.getElementById('signin-form');
  var session = window.tallywrenSession;
  if (!form || !session) return;
  var checks = [
    ['email', function (v) { return session.isValidEmail(v) ? '' : 'Enter an email address like name@example.com.'; }],
    ['password', function (v) { return v === '' ? 'Enter your password.' : ''; }]
  ];
  function setError(name, message) {
    var input = form.elements[name];
    var slot = document.getElementById(name + '-error');
    slot.textContent = message;
    slot.hidden = !message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', slot.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    checks.forEach(function (c) {
      var message = c[1](form.elements[c[0]].value);
      setError(c[0], message);
      if (message && !firstBad) firstBad = form.elements[c[0]];
    });
    if (firstBad) { firstBad.focus(); return; }
    if (!session.signInWithEmail(form.elements.email.value)) {
      var banner = document.getElementById('signin-problem');
      banner.textContent = 'We could not keep you signed in. Allow this site to store data in your browser and try again.';
      banner.hidden = false;
      return;
    }
    window.location.href = 'app-demo.html';
  });
})();
