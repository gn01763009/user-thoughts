(function () {
  var steps = [
    ['Welcome to the workspace', 'This is where you build and send documents to your clients.'],
    ['Client details', 'Start with who you are billing. Name, email and tax ID go here.'],
    ['Invoice details', 'Set the number, issue date and due date.'],
    ['Line items', 'Add each service or product you are charging for.'],
    ['Tax and totals', 'Totals update as you type. Pick the tax rate that applies.'],
    ['Live preview', 'The panel on the right shows what your client will receive.'],
    ['Send it', 'When you are ready, send it by email. We will chase late payments for you.']
  ];
  var index = 0;
  var overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tour-title');
  overlay.innerHTML =
    '<div class="tour-card"><div class="tour-count"></div><div class="tour-dots"></div>' +
    '<h3 id="tour-title"></h3><p class="tour-text"></p>' +
    '<div class="tour-actions"><button type="button" class="btn btn-primary tour-next">Next</button></div></div>';
  document.body.appendChild(overlay);
  var count = overlay.querySelector('.tour-count');
  var dots = overlay.querySelector('.tour-dots');
  var title = overlay.querySelector('#tour-title');
  var text = overlay.querySelector('.tour-text');
  var next = overlay.querySelector('.tour-next');
  function render() {
    count.textContent = 'Step ' + (index + 1) + ' of ' + steps.length;
    dots.innerHTML = steps.map(function (_, i) { return '<i class="' + (i <= index ? 'on' : '') + '"></i>'; }).join('');
    title.textContent = steps[index][0];
    text.textContent = steps[index][1];
    next.textContent = index === steps.length - 1 ? 'Finish' : 'Next';
    next.focus();
  }
  next.addEventListener('click', function () {
    if (index < steps.length - 1) { index += 1; render(); }
    else { overlay.hidden = true; document.body.style.overflow = ''; }
  });
  document.addEventListener('keydown', function (e) {
    if (!overlay.hidden && e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Tab') e.preventDefault();
    if (!overlay.hidden && e.key === 'Tab') { e.preventDefault(); next.focus(); }
  }, true);
  document.body.style.overflow = 'hidden';
  render();
})();
