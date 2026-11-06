(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;
  var success = document.getElementById('signup-success');
  var checks = [
    ['name', function (v) { return v.trim() ? '' : 'Enter your name.'; }],
    ['email', function (v) { return v.search(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) !== -1 ? '' : 'Enter an email address like name@example.com.'; }],
    ['password', function (v) {
      if (v.length < 8) return 'Password needs at least 8 characters. Yours has ' + v.length + '.';
      if (v.search(/[^A-Za-z0-9]/) === -1) return 'Password needs one symbol, such as ! ? or #.';
      return '';
    }]
  ];
  function setError(name, message) {
    var input = form.elements[name];
    var slot = document.getElementById(name + '-error');
    var hint = document.getElementById(name + '-hint');
    var ids = [hint && hint.id, message ? slot.id : null].filter(Boolean).join(' ');
    slot.textContent = message;
    slot.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (ids) input.setAttribute('aria-describedby', ids); else input.removeAttribute('aria-describedby');
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
    window.tallywrenSession.register({ name: form.elements.name.value.trim(), email: form.elements.email.value.trim() });
    form.hidden = true;
    success.hidden = false;
  });
})();
