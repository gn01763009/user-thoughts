(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;
  var banner = document.querySelector('.form-banner');
  var success = document.getElementById('signup-success');
  function valid(v) {
    var digits = v.card.replace(/\D/g, '');
    return v.name.trim() !== '' &&
      v.email.search(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) !== -1 &&
      v.password.length >= 8 && v.password.search(/[^A-Za-z0-9]/) !== -1 &&
      digits.length >= 13 && v.expiry.search(/^\d{2}\s*\/\s*\d{2}$/) !== -1 && v.cvc.search(/^\d{3,4}$/) !== -1;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var values = { name: f.name.value, email: f.email.value, password: f.password.value, card: f.card.value, expiry: f.expiry.value, cvc: f.cvc.value };
    if (!valid(values)) {
      form.reset();
      banner.textContent = 'Something went wrong. Please try again.';
      banner.hidden = false;
      return;
    }
    banner.hidden = true;
    window.tallywrenSession.register({ name: form.elements.name.value.trim(), email: form.elements.email.value.trim() });
    form.hidden = true;
    success.hidden = false;
  });
})();
