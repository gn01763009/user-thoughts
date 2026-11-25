(function () {
  var SESSION_KEY = 'tallywren.session';
  var ACCOUNT_KEY = 'tallywren.account';
  var EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function read(key) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      if (value && typeof value.name === 'string' && typeof value.email === 'string') {
        return { name: value.name, email: value.email };
      }
    } catch (e) { /* unreadable or blocked storage counts as empty */ }
    return null;
  }

  function write(key, person) {
    try {
      localStorage.setItem(key, JSON.stringify({ name: person.name, email: person.email }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function signIn(person) { return write(SESSION_KEY, person); }

  function register(person) {
    return write(ACCOUNT_KEY, person) && signIn(person);
  }

  function signInWithEmail(email) {
    var address = email.trim();
    var account = read(ACCOUNT_KEY);
    if (account && account.email.toLowerCase() === address.toLowerCase()) return signIn(account);
    var person = { name: address.split('@')[0], email: address };
    if (!account) write(ACCOUNT_KEY, person);
    return signIn(person);
  }

  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clear */ }
  }

  window.tallywrenSession = {
    current: function () { return read(SESSION_KEY); },
    isValidEmail: function (v) { return v.trim().search(EMAIL_PATTERN) !== -1; },
    register: register,
    signInWithEmail: signInWithEmail,
    signOut: signOut
  };
})();
