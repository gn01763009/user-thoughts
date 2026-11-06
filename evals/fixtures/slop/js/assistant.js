(function () {
  var REPLY = 'Thanks for your message. Could you tell me a little more about what you are trying to do?';
  var panel = document.createElement('div');
  panel.className = 'assistant-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask Wren assistant');
  panel.hidden = true;
  panel.innerHTML =
    '<div class="assistant-head"><span class="dot" aria-hidden="true">W</span><strong>Ask Wren</strong>' +
    '<button type="button" class="assistant-close" aria-label="Close assistant">×</button></div>' +
    '<div class="assistant-log" aria-live="polite"><div class="bubble bot">Hi, I’m Wren, your AI assistant. What can I help with?</div></div>' +
    '<form class="assistant-form"><input type="text" name="q" placeholder="Ask Wren anything" aria-label="Ask Wren anything" autocomplete="off">' +
    '<button class="btn btn-primary btn-sm" type="submit">Send</button></form>';
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'assistant-launcher';
  launcher.textContent = 'Ask Wren';
  document.body.appendChild(panel);
  document.body.appendChild(launcher);
  var log = panel.querySelector('.assistant-log');
  var field = panel.querySelector('input');

  function show(open) {
    panel.hidden = !open;
    launcher.hidden = open;
    if (open) field.focus();
  }
  function say(text, who) {
    var bubble = document.createElement('div');
    bubble.className = 'bubble ' + who;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }
  function ask(text) {
    say(text, 'me');
    setTimeout(function () { say(REPLY, 'bot'); }, 500);
  }

  panel.querySelector('.assistant-close').addEventListener('click', function () { show(false); });
  launcher.addEventListener('click', function () { show(true); });
  panel.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = field.value.trim();
    if (!text) return;
    field.value = '';
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
})();
