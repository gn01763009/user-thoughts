(function () {
  var session = window.tallywrenSession && window.tallywrenSession.current();
  if (!session) { window.location.replace('signin.html'); return; }
  document.getElementById('account-lede').textContent = 'Signed in as ' + session.email + '.';
  document.getElementById('p-name').value = session.name;
  document.getElementById('p-biz').value = '';
  document.getElementById('p-email').value = session.email;
  var signOut = document.getElementById('sign-out');
  signOut.hidden = false;
  signOut.addEventListener('click', function () {
    window.tallywrenSession.signOut();
    window.location.href = 'index.html';
  });
  var suggest = document.getElementById('smart-suggestions');
  var prefStatus = document.getElementById('pref-status');
  if (suggest) {
    suggest.addEventListener('change', function () {
      try { localStorage.setItem('tallywren.smart-suggestions', suggest.checked ? 'on' : 'off'); } catch (e) { return; }
      prefStatus.hidden = false;
    });
  }
  var input = document.getElementById('confirm-delete');
  var button = document.getElementById('delete-account');
  var message = document.getElementById('delete-message');
  if (!input || !button) return;
  input.addEventListener('input', function () { button.disabled = input.value !== 'DELETE'; });
  button.addEventListener('click', function () {
    message.textContent = 'This is a sample account, so nothing was deleted.';
    message.hidden = false;
    input.value = '';
    button.disabled = true;
  });
})();
