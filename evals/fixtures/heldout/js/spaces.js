(function () {
  var DETAILS = {
    'harbour-lane': { address: '14 Harbour Lane', hours: 'Monday to Friday, 8:00–19:00' },
    millrace: { address: '2 Mill Yard, Millrace', hours: 'Every day, 7:30–20:00' },
    'old-tannery': { address: '31 Hide Street', hours: 'Monday to Friday, 8:30–18:30' },
    northgate: { address: '88 Northgate Road', hours: 'Every day, 8:00–21:00' }
  };
  var session = window.pellwickSession;
  var status = document.getElementById('filter-status');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.space-card'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.filter-chip'));

  function toggleFilter(chip) {
    var pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    var active = chips
      .filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
      .map(function (c) { return c.getAttribute('data-filter'); });
    status.textContent = 'Showing ' + cards.length + ' spaces' + (active.length ? ' with ' + active.join(' and ') : '');
  }

  function revealDetails() {
    if (!session || !session.current()) return;
    cards.forEach(function (card) {
      var info = DETAILS[card.getAttribute('data-space')];
      var slot = card.querySelector('.space-details');
      var address = document.createElement('strong');
      address.textContent = info.address;
      var hours = document.createElement('div');
      hours.textContent = info.hours;
      slot.replaceChildren(address, hours);
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { toggleFilter(chip); });
  });
  revealDetails();
})();
