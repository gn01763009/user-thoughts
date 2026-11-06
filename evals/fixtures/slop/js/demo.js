(function () {
  var form = document.getElementById('invoice-form');
  if (!form) return;
  var symbols = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' };
  var toast = document.querySelector('.inline-status');
  function money(n) { return (symbols[form.elements.currency.value] || '$') + n.toFixed(2); }
  function update() {
    var subtotal = 0;
    form.querySelectorAll('tbody tr').forEach(function (row) {
      var qty = parseFloat(row.querySelector('[name^=qty]').value) || 0;
      var rate = parseFloat(row.querySelector('[name^=rate]').value) || 0;
      var amount = qty * rate;
      subtotal += amount;
      row.querySelector('.amount').textContent = money(amount);
    });
    var tax = subtotal * ((parseFloat(form.elements.tax_rate.value) || 0) / 100);
    document.getElementById('pv-client').textContent = form.elements.client_name.value || 'Client name';
    document.getElementById('pv-number').textContent = form.elements.number.value;
    document.getElementById('pv-due').textContent = form.elements.due_date.value || '\u2014';
    document.getElementById('pv-subtotal').textContent = money(subtotal);
    document.getElementById('pv-tax').textContent = money(tax);
    document.getElementById('pv-total').textContent = money(subtotal + tax);
  }
  var session = window.tallywrenSession;
  var signedIn = Boolean(session && session.current());
  var NEXT_INVOICE_NUMBER = 'TW-0043';
  function prepareWorkspace() {
    var banner = document.querySelector('.app-bar .notice');
    if (banner) banner.remove();
    ['client_name', 'client_email', 'tax_id', 'po', 'address', 'notes'].forEach(function (name) { form.elements[name].value = ''; });
    form.elements.number.value = NEXT_INVOICE_NUMBER;
    var rows = form.querySelectorAll('tbody tr');
    rows.forEach(function (row, i) {
      if (i > 0) { row.remove(); return; }
      row.querySelectorAll('input').forEach(function (input) { input.value = ''; });
    });
  }
  function notify(message, withSignupLink) {
    toast.textContent = message;
    if (withSignupLink) {
      var link = document.createElement('a');
      link.href = 'signup.html';
      link.textContent = 'Start free';
      toast.append(' Want to send real invoices? ', link, '.');
    }
    toast.hidden = false;
  }
  function submitSigned(isDraft) {
    if (isDraft) { notify('Draft saved'); return; }
    var email = form.elements.client_email.value.trim();
    if (!session.isValidEmail(email)) { notify('Add the client email address to send this invoice.'); return; }
    notify('Invoice ' + form.elements.number.value + ' sent to ' + email);
  }
  form.addEventListener('input', function () { toast.hidden = true; update(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (signedIn) { submitSigned(Boolean(e.submitter && e.submitter.dataset.intent === 'draft')); return; }
    notify('Done. This is a sample workspace, so no email went out. Change anything and try again whenever you like.', true);
  });
  if (signedIn) prepareWorkspace();
  update();
})();
