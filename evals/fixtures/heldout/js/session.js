(function () {
  var SESSION_KEY = 'pellwick.session';
  var BOOKINGS_KEY = 'pellwick.bookings';
  var EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function current() {
    var person = readJson(SESSION_KEY, null);
    if (person && typeof person.email === 'string' && typeof person.name === 'string') {
      return { name: person.name, email: person.email };
    }
    return null;
  }

  function signIn(person) { return writeJson(SESSION_KEY, { name: person.name, email: person.email }); }

  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { return false; }
    return true;
  }

  function bookings() {
    var list = readJson(BOOKINGS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function addBooking(booking) { return writeJson(BOOKINGS_KEY, bookings().concat([booking])); }

  function cancelBooking(ref) {
    return writeJson(BOOKINGS_KEY, bookings().filter(function (b) { return b.ref !== ref; }));
  }

  window.pellwickSession = {
    current: current,
    signIn: signIn,
    signOut: signOut,
    isValidEmail: function (v) { return v.trim().search(EMAIL_PATTERN) !== -1; },
    bookings: bookings,
    addBooking: addBooking,
    cancelBooking: cancelBooking
  };

  var accountLink = document.querySelector('[data-account-link]');
  if (accountLink && current()) {
    accountLink.setAttribute('href', 'account.html');
    accountLink.textContent = 'My bookings';
  }
})();
