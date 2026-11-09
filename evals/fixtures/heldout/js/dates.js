(function () {
  var LABEL_FORMAT = { weekday: 'short', day: 'numeric', month: 'short' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function dayOption(offset) {
    var day = new Date();
    day.setDate(day.getDate() + offset);
    var option = document.createElement('option');
    option.value = iso(day);
    option.textContent = day.toLocaleDateString('en-GB', LABEL_FORMAT);
    return option;
  }

  document.querySelectorAll('select[data-days]').forEach(function (select) {
    var days = Number(select.getAttribute('data-days'));
    for (var offset = 0; offset <= days; offset += 1) select.appendChild(dayOption(offset));
  });
})();
