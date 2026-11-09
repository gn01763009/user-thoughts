(function () {
  var ALLOWED_NEXT = ['locations.html', 'account.html', 'plans.html'];
  var DEFAULT_NEXT = 'account.html';
  var MIN_PASSWORD_LENGTH = 8;
  var form = document.getElementById('signin-form');
  var session = window.pellwickSession;
  if (!form || !session) return;

  function destination() {
    var next = new URLSearchParams(window.location.search).get('next');
    return ALLOWED_NEXT.indexOf(next) !== -1 ? next : DEFAULT_NEXT;
  }

  function setError(name, message) {
    var input = form.elements[name];
    var slot = document.getElementById(name + '-error');
    slot.textContent = message;
    slot.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    var emailOk = setError('email', session.isValidEmail(email) ? '' : 'Enter an email address like name@example.com.');
    var passwordOk = setError('password', form.elements.password.value.length >= MIN_PASSWORD_LENGTH ? '' : 'Use at least 8 characters.');
    if (!emailOk || !passwordOk) return;
    if (!session.signIn({ name: email.split('@')[0], email: email })) {
      var banner = document.getElementById('signin-problem');
      banner.textContent = 'We could not keep you signed in. Allow this site to store data in your browser and try again.';
      banner.hidden = false;
      return;
    }
    window.location.href = destination();
  });
})();
