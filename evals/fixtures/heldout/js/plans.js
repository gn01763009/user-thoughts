(function () {
  var form = document.getElementById('join-form');
  var session = window.pellwickSession;
  if (!form || !session) return;
  var plan = document.getElementById('join-plan');

  document.querySelectorAll('[data-plan]').forEach(function (link) {
    link.addEventListener('click', function () { plan.value = link.getAttribute('data-plan'); });
  });

  function setError(id, message) {
    var slot = document.getElementById(id + '-error');
    slot.textContent = message;
    slot.hidden = !message;
    return !message;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nameOk = setError('join-name', form.elements.name.value.trim() ? '' : 'Enter your name.');
    var emailOk = setError('join-email', session.isValidEmail(form.elements.email.value) ? '' : 'Enter an email address like name@example.com.');
    if (!nameOk || !emailOk) return;
    form.hidden = true;
    document.getElementById('join-success').hidden = false;
  });
})();
