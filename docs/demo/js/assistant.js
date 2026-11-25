(function () {
  var REPLY = "Great question! Our team is here to help you succeed.";
  var panel = document.createElement('div');
  panel.className = 'assistant-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask Wren assistant');
  panel.hidden = true;
  panel.innerHTML =
    '<div class="assistant-head"><span class="dot" aria-hidden="true">W</span><strong>Ask Wren</strong>' +
    '<button type="button" class="assistant-close" aria-label="Close assistant">\u00d7</button></div>' +
    '<div class="assistant-log" aria-live="polite"><div class="bubble bot">Hi, I\u2019m Wren, your AI assistant. Ask me anything!</div></div>' +
    '<form class="assistant-form"><input type="text" name="q" placeholder="Ask Wren anything" aria-label="Ask Wren anything" autocomplete="off">' +
    '<button class="btn btn-primary btn-sm" type="submit">Send</button></form>';
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'assistant-launcher';
  launcher.textContent = 'Ask Wren';
  document.body.appendChild(panel);
  document.body.appendChild(launcher);
  var log = panel.querySelector('.assistant-log');
  function show(open) { panel.hidden = !open; launcher.hidden = open; }
  function say(text, who) {
    var b = document.createElement('div');
    b.className = 'bubble ' + who;
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
  }
  panel.querySelector('.assistant-close').addEventListener('click', function () { show(false); });
  launcher.addEventListener('click', function () { show(true); });
  function ask(text) {
    say(text, 'me');
    setTimeout(function () { say(REPLY, 'bot'); }, 500);
  }
  panel.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = e.target.elements.q;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  });
  var headerSearch = document.getElementById('header-search');
  if (headerSearch) {
    headerSearch.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = headerSearch.elements.q;
      var text = box.value.trim();
      if (!text) return;
      box.value = '';
      show(true);
      ask(text);
    });
  }
  show(false);
  setTimeout(function () { show(true); }, 900);
})();
