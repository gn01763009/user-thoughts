(function () {
  var form = document.getElementById('teams-form');
  var session = window.pellwickSession;
  if (!form || !session) return;
  var f = form.elements;

  var CHECKS = [
    ['company', function (v) { return v.trim() ? '' : 'Enter your company name.'; }],
    ['contact-name', function (v) { return v.trim() ? '' : 'Enter your name.'; }],
    ['work-email', function (v) { return session.isValidEmail(v) ? '' : 'Enter a work email like name@company.example.'; }],
    ['team-size', function (v) { return v ? '' : 'Choose a team size.'; }],
    ['start-date', function (v) { return v ? '' : 'Choose a start date.'; }],
    ['term', function (v) { return v ? '' : 'Choose a term.'; }],
    ['billing-email', function (v) { return session.isValidEmail(v) ? '' : 'Enter a billing email like accounts@company.example.'; }]
  ];

  function apply(name, message) {
    var input = f[name];
    var slot = document.getElementById(name + '-error');
    slot.textContent = message;
    slot.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return message ? input : null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var problems = CHECKS.map(function (c) { return apply(c[0], c[1](f[c[0]].value)); }).filter(Boolean);
    if (problems.length) { problems[0].focus(); return; }
    form.hidden = true;
    document.getElementById('teams-success').hidden = false;
  });
})();
