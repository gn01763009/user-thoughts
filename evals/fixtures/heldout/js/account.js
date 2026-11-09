(function () {
  var session = window.pellwickSession;
  var person = session && session.current();
  if (!person) { window.location.replace('signin.html?next=account.html'); return; }

  var list = document.getElementById('booking-list');
  var empty = document.getElementById('no-bookings');
  document.getElementById('account-lede').textContent = 'Signed in as ' + person.email + '.';

  var signOut = document.getElementById('sign-out');
  signOut.hidden = false;
  signOut.addEventListener('click', function () {
    session.signOut();
    window.location.href = 'index.html';
  });

  function niceDate(value) {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function button(label, className, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function row(booking) {
    var item = document.createElement('li');
    item.className = 'booking-item';
    var info = document.createElement('div');
    var title = document.createElement('strong');
    title.textContent = booking.pass + ' pass at ' + booking.space;
    var meta = document.createElement('small');
    meta.textContent = niceDate(booking.date) + ', reference ' + booking.ref;
    info.append(title, meta);
    var confirmBox = document.createElement('div');
    confirmBox.className = 'cancel-confirm';
    confirmBox.hidden = true;
    var question = document.createElement('p');
    question.textContent = 'Cancel this booking? The desk will go back on sale.';
    confirmBox.append(
      question,
      button('Keep booking', 'btn btn-ghost btn-sm', function () { confirmBox.hidden = true; }),
      button('Cancel booking', 'btn btn-danger btn-sm', function () { session.cancelBooking(booking.ref); render(); })
    );
    item.append(info, button('Cancel booking', 'btn btn-ghost btn-sm', function () { confirmBox.hidden = false; }), confirmBox);
    return item;
  }

  function render() {
    var mine = session.bookings().filter(function (b) { return b.email === person.email; });
    list.replaceChildren.apply(list, mine.map(row));
    empty.hidden = mine.length > 0;
  }

  render();
})();
