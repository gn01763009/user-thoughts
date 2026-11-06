(function () {
  var TOPICS = [
    { title: 'Hourly consulting invoice', kind: 'Template', href: 'app-demo.html', words: 'hours rate consulting time' },
    { title: 'Fixed-fee project invoice', kind: 'Template', href: 'app-demo.html', words: 'project flat fee milestone' },
    { title: 'Monthly retainer invoice', kind: 'Template', href: 'app-demo.html', words: 'retainer recurring monthly' },
    { title: 'Deposit invoice', kind: 'Template', href: 'app-demo.html', words: 'deposit upfront advance' },
    { title: 'Set up payment reminders', kind: 'Help topic', href: 'help.html', words: 'reminders late overdue schedule' },
    { title: 'Add a client tax ID', kind: 'Help topic', href: 'help.html', words: 'tax vat number billing' },
    { title: 'Invoice in another currency', kind: 'Help topic', href: 'help.html', words: 'currency dollars euros pounds' },
    { title: 'Export your data', kind: 'Help topic', href: 'help.html', words: 'export spreadsheet download' }
  ];
  var form = document.getElementById('home-search');
  var card = document.getElementById('search-results');
  if (!form || !card) return;

  function matches(topic, terms) {
    var haystack = (topic.title + ' ' + topic.words + ' ' + topic.kind).toLowerCase();
    return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
  }

  function row(topic) {
    var item = document.createElement('li');
    var link = document.createElement('a');
    link.href = topic.href;
    link.textContent = topic.title;
    var kind = document.createElement('span');
    kind.className = 'pill';
    kind.textContent = topic.kind;
    item.appendChild(link);
    item.appendChild(kind);
    return item;
  }

  function render(query, found) {
    card.replaceChildren();
    var heading = document.createElement('h3');
    heading.textContent = found.length
      ? found.length + (found.length === 1 ? ' result' : ' results') + (query ? ' for “' + query + '”' : '')
      : 'Nothing found for “' + query + '”';
    card.appendChild(heading);
    if (!found.length) {
      var hint = document.createElement('p');
      hint.textContent = 'Try a shorter word, such as reminders or currency.';
      card.appendChild(hint);
      return;
    }
    var list = document.createElement('ul');
    list.className = 'result-list';
    found.forEach(function (topic) { list.appendChild(row(topic)); });
    card.appendChild(list);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var query = form.elements.q.value.trim();
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    render(query, TOPICS.filter(function (topic) { return matches(topic, terms); }));
    card.hidden = false;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.focus({ preventScroll: true });
  });
})();
