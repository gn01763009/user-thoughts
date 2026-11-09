(function () {
  var PEOPLE = ['Priya', 'Tom', 'Aiko', 'Femi', 'Marta', 'Jonas', 'Leila', 'Sam'];
  var SPACES = ['Harbour Lane', 'Millrace', 'Old Tannery', 'Northgate'];
  var PASSES = ['Drift', 'Dock', 'Den'];
  var FIRST_DELAY_MS = 3000;
  var EVERY_MS = 10000;
  var VISIBLE_MS = 6500;
  var LATEST_MINUTES = 9;

  var toast = document.createElement('div');
  toast.className = 'activity-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML = '<span class="activity-text"></span><small class="activity-time"></small>' +
    '<button type="button" aria-label="Dismiss">×</button>';
  document.body.appendChild(toast);

  var text = toast.querySelector('.activity-text');
  var time = toast.querySelector('.activity-time');
  var hideTimer = null;

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function show() {
    text.textContent = pick(PEOPLE) + ' just booked a ' + pick(PASSES) + ' pass at ' + pick(SPACES);
    var minutes = 1 + Math.floor(Math.random() * LATEST_MINUTES);
    time.textContent = minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    toast.hidden = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { toast.hidden = true; }, VISIBLE_MS);
  }

  toast.querySelector('button').addEventListener('click', function () { toast.hidden = true; });
  setTimeout(function () {
    show();
    setInterval(show, EVERY_MS);
  }, FIRST_DELAY_MS);
})();
