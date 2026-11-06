(function () {
  var input = document.getElementById('help-filter');
  var status = document.getElementById('help-filter-status');
  var items = Array.prototype.slice.call(document.querySelectorAll('.faq details'));
  if (!input || !status) return;
  input.addEventListener('input', function () {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var visible = terms.every(function (term) { return text.indexOf(term) !== -1; });
      item.hidden = !visible;
      if (visible) shown += 1;
    });
    status.textContent = shown === 0 ? 'No questions match.' : terms.length ? 'Showing ' + shown + ' of ' + items.length + ' questions.' : 'Showing all questions.';
  });
})();
