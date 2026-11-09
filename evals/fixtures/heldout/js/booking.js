(function () {
  var PASSES = { drift: { name: 'Drift', price: 18 }, dock: { name: 'Dock', price: 24 }, den: { name: 'Den', price: 45 } };
  var SPACE_NAMES = { 'harbour-lane': 'Harbour Lane', millrace: 'Millrace', 'old-tannery': 'Old Tannery', northgate: 'Northgate' };
  var VIBES = ['Steady Lighthouse', 'Bright Spark', 'Quiet Fox'];
  var QUIZ_QUESTIONS = ['q1', 'q2', 'q3', 'q4'];
  var COVER_PRICE = 2.5;
  var SERVICE_FEE = 3.4;
  var PHONE_PATTERN = /^\+?\d{10,13}$/;
  var CARD_DIGITS_MIN = 13;
  var CARD_DIGITS_MAX = 19;
  var STEPS = ['step-quiz', 'step-where', 'step-pass', 'step-details', 'step-review', 'step-done'];
  var NEXT_BUTTONS = ['quiz-next', 'where-next', 'pass-next', 'details-next'];
  var REVIEW_INDEX = 4;
  var DONE_INDEX = 5;

  var form = document.getElementById('booking-form');
  var session = window.pellwickSession;
  if (!form || !session) return;
  var f = form.elements;
  var index = 0;

  function el(id) { return document.getElementById(id); }
  function money(n) { return '£' + n.toFixed(2); }

  function niceDate(value) {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function show(next) {
    index = next;
    STEPS.forEach(function (id, i) { el(id).hidden = i !== index; });
    el('step-count').textContent = index < DONE_INDEX ? 'Step ' + (index + 1) + ' of ' + DONE_INDEX : 'Booking confirmed';
    window.scrollTo(0, 0);
  }

  function setError(name, message) {
    var slot = el(name + '-error');
    var input = f[name];
    slot.textContent = message;
    slot.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }

  function quizDone() { return QUIZ_QUESTIONS.every(function (q) { return f[q].value !== ''; }); }

  function quizResult() {
    var total = QUIZ_QUESTIONS.reduce(function (sum, q) { return sum + Number(f[q].value); }, 0);
    return VIBES[total % VIBES.length];
  }

  function checkWhere() {
    var spaceOk = setError('space', f.space.value ? '' : 'Choose a space.');
    var dateOk = setError('date', f.date.value ? '' : 'Choose a day.');
    return spaceOk && dateOk;
  }

  function checkPass() {
    var message = f.pass.value ? '' : 'Choose a pass.';
    var slot = el('pass-error');
    slot.textContent = message;
    slot.hidden = !message;
    return !message;
  }

  function checkDetails() {
    var nameOk = setError('name', f.name.value.trim() ? '' : 'Enter your full name.');
    var emailOk = setError('email', session.isValidEmail(f.email.value) ? '' : 'Enter an email address like name@example.com.');
    var phoneOk = f.phone.value.search(PHONE_PATTERN) !== -1;
    el('phone-field').classList.toggle('is-wrong', !phoneOk);
    return nameOk && emailOk && phoneOk;
  }

  function totals() {
    var pass = PASSES[f.pass.value];
    var cover = f.cover.checked ? COVER_PRICE : 0;
    return { pass: pass, cover: cover, total: pass.price + cover + SERVICE_FEE };
  }

  function renderReview() {
    var t = totals();
    el('sum-space').textContent = SPACE_NAMES[f.space.value];
    el('sum-date').textContent = niceDate(f.date.value);
    el('sum-pass-label').textContent = t.pass.name + ' pass';
    el('sum-pass').textContent = money(t.pass.price);
    el('sum-cover-row').hidden = !f.cover.checked;
    el('sum-cover').textContent = money(COVER_PRICE);
    el('sum-fee').textContent = money(SERVICE_FEE);
    el('sum-total').textContent = money(t.total);
    el('pay').textContent = 'Confirm and pay ' + money(t.total);
  }

  function checkCard() {
    var digits = f.card.value.replace(/\D/g, '');
    var cardOk = setError('card', digits.length >= CARD_DIGITS_MIN && digits.length <= CARD_DIGITS_MAX ? '' : 'Enter the full card number.');
    var expiryOk = setError('expiry', f.expiry.value.trim().search(/^\d{2}\s*\/\s*\d{2}$/) !== -1 ? '' : 'Enter the expiry as MM/YY.');
    var cvcOk = setError('cvc', f.cvc.value.trim().search(/^\d{3,4}$/) !== -1 ? '' : 'Enter the 3 or 4 digit security code.');
    return cardOk && expiryOk && cvcOk;
  }

  function confirmBooking() {
    var t = totals();
    var ref = 'PW-' + (10000 + Math.floor(Math.random() * 90000));
    var person = { name: f.name.value.trim(), email: f.email.value.trim() };
    var booking = { ref: ref, email: person.email, space: SPACE_NAMES[f.space.value], date: f.date.value, pass: t.pass.name, total: t.total };
    if (!session.addBooking(booking) || !session.signIn(person)) {
      el('pay-problem').textContent = 'We could not save your booking in this browser. Allow this site to store data and try again.';
      el('pay-problem').hidden = false;
      return;
    }
    el('pay-problem').hidden = true;
    el('done-summary').textContent = t.pass.name + ' pass at ' + booking.space + ', ' + niceDate(booking.date) + '.';
    el('done-ref').textContent = ref;
    el('done-email').textContent = person.email;
    show(DONE_INDEX);
  }

  form.addEventListener('change', function () { el('quiz-next').disabled = !quizDone(); });
  f.phone.addEventListener('input', function () { el('phone-field').classList.remove('is-wrong'); });

  el('quiz-next').addEventListener('click', function () {
    el('vibe-result').textContent = 'You are a ' + quizResult() + '. Now let us find you a desk.';
    show(1);
  });
  el('where-next').addEventListener('click', function () { if (checkWhere()) show(2); });
  el('pass-next').addEventListener('click', function () { if (checkPass()) show(3); });
  el('details-next').addEventListener('click', function () {
    if (!checkDetails()) return;
    renderReview();
    show(REVIEW_INDEX);
  });
  form.querySelectorAll('[data-back]').forEach(function (button) {
    button.addEventListener('click', function () { show(index - 1); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (index < REVIEW_INDEX) { el(NEXT_BUTTONS[index]).click(); return; }
    if (index === REVIEW_INDEX && checkCard()) confirmBooking();
  });
})();
