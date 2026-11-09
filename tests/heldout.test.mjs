// Heldout site checks. This file names the heldout problems and their answers:
// whoever tunes recall against heldout scores must not read it (see the Task 16 rules).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { itemMatches } from '../evals/score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', 'evals', 'fixtures', 'heldout');
const TRUTH_PATH = join(HERE, '..', 'evals', 'ground-truth', 'heldout.json');
const BANNED = /\b(planted|decoy|fixture|heldout|slop|tests?|fake|bugs?|defects?)\b/i;
const BINARY = /\.(png|jpe?g|webp|ico|woff2)$/i;
const PAGES = ['index.html', 'locations.html', 'plans.html', 'book.html', 'teams.html', 'faq.html', 'signin.html', 'account.html'];

const listFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
const read = (name) => readFileSync(join(ROOT, name), 'utf8');
const htmlFiles = () => listFiles(ROOT).filter((f) => f.endsWith('.html'));
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const textOf = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&pound;/g, '£').replace(/\s+/g, ' ').trim();
const section = (html, id) => {
  const found = html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`));
  assert.ok(found, `section #${id} exists`);
  return found[0];
};
const anchors = (html) => [...html.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);

// ---------- site shape ----------

test('heldout site: every page exists and the site is about the size of planted', () => {
  for (const page of PAGES) assert.ok(existsSync(join(ROOT, page)), page);
  const files = listFiles(ROOT);
  assert.ok(files.length >= 15 && files.length <= 24, `${files.length} files`);
});

test('heldout site: no served file names its purpose', () => {
  for (const file of listFiles(ROOT)) {
    const rel = relative(ROOT, file);
    assert.doesNotMatch(rel, BANNED, `file name ${rel}`);
    if (BINARY.test(file)) continue;
    const found = readFileSync(file, 'utf8').match(new RegExp(BANNED.source, 'gi'));
    assert.equal(found, null, `${rel} contains banned word(s): ${found}`);
  }
});

test('heldout site: no HTML comments', () => {
  for (const file of htmlFiles()) assert.doesNotMatch(readFileSync(file, 'utf8'), /<!--/, relative(ROOT, file));
});

test('heldout site: every local link, script and stylesheet resolves to a served file', () => {
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    for (const [, ref] of html.matchAll(/\s(?:href|src|action)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|#)/.test(ref)) continue;
      const path = ref.split(/[?#]/)[0];
      assert.ok(existsSync(join(ROOT, path)), `${relative(ROOT, file)} -> ${ref}`);
    }
  }
});

// ---------- usability ----------

test('heldout item U1 structure', () => {
  const bookLinks = anchors(read('index.html')).filter((a) => /Book a desk/.test(textOf(a)));
  assert.ok(bookLinks.length >= 2, 'nav button and hero button');
  for (const a of bookLinks) assert.equal(attr(a, 'href'), 'plans.html', a);
  const plans = read('plans.html');
  assert.match(textOf(plans.match(/<h1[\s\S]*?<\/h1>/)[0]), /member/i);
  const toBooking = [...plans.matchAll(/href="book\.html"/g)];
  assert.equal(toBooking.length, 1);
  assert.ok(toBooking[0].index > plans.lastIndexOf('class="card plan'), 'booking link sits below every membership plan');
});

test('heldout item U2 structure', () => {
  const step = section(read('book.html'), 'step-pass');
  const radios = [...step.matchAll(/<input[^>]*name="pass"[^>]*>/g)].map((m) => attr(m[0], 'value'));
  assert.deepEqual(radios, ['drift', 'dock', 'den']);
  const labels = [...step.matchAll(/<label class="pass-option"[\s\S]*?<\/label>/g)].map((m) => textOf(m[0]));
  assert.equal(labels.length, 3);
  for (const label of labels) assert.match(label, /^(Drift|Dock|Den) £\d+ a day$/, label);
});

test('heldout item U3 structure', () => {
  const book = read('book.html');
  const phone = book.match(/<input[^>]*id="phone"[^>]*>/)[0];
  const placeholder = attr(phone, 'placeholder');
  assert.match(placeholder, / /);
  const source = read('js/booking.js');
  const pattern = new RegExp(source.match(/PHONE_PATTERN = \/(.+)\/;/)[1]);
  assert.equal(pattern.test(placeholder), false);
  assert.equal(pattern.test(placeholder.replace(/\s/g, '')), true);
  assert.match(book, /id="name-error"/);
  assert.match(book, /id="email-error"/);
  assert.doesNotMatch(book, /id="phone-error"/);
  assert.doesNotMatch(source, /phone-error/);
});

test('heldout item U4 structure', () => {
  for (const page of PAGES) assert.match(read(page), /<button class="menu-toggle"/, page);
  const css = read('css/site.css');
  const small = css.match(/@media \(max-width:480px\)\{[\s\S]*?\n\}/)[0];
  assert.match(small, /\.site-nav\{display:none\}/);
  assert.match(small, /\.menu-toggle\{display:inline-flex\}/);
  const menu = read('js/menu.js');
  assert.match(menu, /mobile-menu/);
  assert.doesNotMatch(menu, /Escape|close|'false'|remove\(/);
});

test('heldout item U5 structure', () => {
  const locations = read('locations.html');
  const cards = locations.match(/<article class="space-card"/g) ?? [];
  assert.equal(cards.length, 4);
  const gates = locations.match(/<a href="signin\.html\?next=locations\.html"[^>]*>Sign in to see the address and opening hours<\/a>/g) ?? [];
  assert.equal(gates.length, 4);
  const hoursRange = /\d{1,2}:\d{2}\s*(?:–|-|&ndash;|to)\s*\d{1,2}:\d{2}/;
  for (const page of PAGES) assert.doesNotMatch(read(page), hoursRange, page);
  const spaces = read('js/spaces.js');
  assert.match(spaces, hoursRange);
  assert.match(spaces, /session\.current\(\)/);
});

test('heldout item U6 structure', () => {
  const fee = /service fee/i;
  for (const page of PAGES.filter((p) => p !== 'book.html')) assert.doesNotMatch(read(page), fee, page);
  const book = read('book.html');
  for (const id of ['step-quiz', 'step-where', 'step-pass', 'step-details', 'step-done']) {
    assert.doesNotMatch(section(book, id), fee, id);
  }
  assert.match(section(book, 'step-review'), fee);
  assert.match(read('js/booking.js'), /SERVICE_FEE/);
});

// ---------- value ----------

test('heldout item V1 structure', () => {
  const book = read('book.html');
  const quiz = section(book, 'step-quiz');
  assert.equal((quiz.match(/<fieldset/g) ?? []).length, 4);
  assert.match(quiz.match(/<button[^>]*id="quiz-next"[^>]*>/)[0], /\sdisabled/);
  assert.ok(book.indexOf('id="step-quiz"') < book.indexOf('id="step-where"'), 'quiz comes before space and date');
  assert.doesNotMatch(quiz, /skip/i);
  assert.doesNotMatch(read('js/booking.js'), /skip/i);
});

test('heldout item V2 structure', () => {
  const locations = read('locations.html');
  const badges = locations.match(/<span class="desk-count">[^<]*<\/span>/g) ?? [];
  assert.equal(badges.length, 4);
  assert.equal(new Set(badges).size, 1);
  assert.match(badges[0], /Only 2 desks left today/);
});

test('heldout item V3 structure', () => {
  const book = read('book.html');
  const review = section(book, 'step-review');
  assert.match(review, /Pellwick Points/);
  assert.match(review, /badge/i);
  assert.match(review, /Level 1/);
  assert.ok(review.indexOf('class="reward"') < review.indexOf('id="card"'), 'rewards are visible before any payment field');
  assert.doesNotMatch(section(book, 'step-done'), /Pellwick Points/);
  for (const page of PAGES.filter((p) => p !== 'book.html')) assert.doesNotMatch(read(page), /\bpoints?\b/i, page);
});

test('heldout item V4 structure', () => {
  for (const page of ['index.html', 'locations.html', 'plans.html', 'book.html']) {
    assert.match(read(page), /<script src="js\/activity\.js" defer><\/script>/, page);
  }
  const js = read('js/activity.js');
  assert.match(js, /setInterval/);
  assert.match(js, /just booked/);
  assert.doesNotMatch(js, /clearInterval|localStorage|sessionStorage/);
  assert.match(read('css/site.css'), /\.activity-toast\{position:fixed;left:/);
});

test('heldout item V5 structure', () => {
  const details = section(read('book.html'), 'step-details');
  const box = details.match(/<input[^>]*id="desk-cover"[^>]*>/)[0];
  assert.equal(attr(box, 'type'), 'checkbox');
  assert.match(box, /\schecked/);
  assert.match(details, /&pound;2\.50/);
});

// ---------- promise ----------

test('heldout item P1 structure', () => {
  const home = read('index.html');
  const form = home.match(/<form[^>]*id="quick-book"[\s\S]*?<\/form>/)[0];
  assert.equal(attr(form.match(/<form[^>]*>/)[0], 'action'), 'book.html');
  assert.match(form, /<select[^>]*name="space"/);
  assert.match(form, /<select[^>]*name="date"[^>]*data-days="30"/);
  assert.match(form, /Check availability/);
  const source = read('js/booking.js');
  assert.doesNotMatch(source, /location\.search|URLSearchParams|location\.href|location\.hash/);
});

test('heldout item P2 structure', () => {
  const locations = read('locations.html');
  const filters = locations.match(/<button[^>]*class="filter-chip"[^>]*aria-pressed="false"[^>]*>/g) ?? [];
  assert.equal(filters.length, 4);
  const cards = locations.match(/<article class="space-card"[\s\S]*?<\/article>/g);
  for (const amenity of ['Phone booths', 'Showers', 'Bike storage', 'Open weekends']) {
    const having = cards.filter((c) => c.includes(`<li>${amenity}</li>`)).length;
    assert.ok(having >= 1 && having < cards.length, `${amenity} on ${having} of ${cards.length}`);
  }
  const spaces = read('js/spaces.js');
  const filterCode = spaces.slice(spaces.indexOf('function toggleFilter'), spaces.indexOf('function revealDetails'));
  assert.match(filterCode, /aria-pressed/);
  assert.doesNotMatch(filterCode, /hidden|display|remove/);
});

// ---------- decoys ----------

test('heldout item D1 structure', () => {
  assert.match(section(read('book.html'), 'step-review'), /photo ID/);
  assert.match(read('index.html'), /photo ID/);
  const faq = read('faq.html');
  assert.match(faq, /photo ID/);
  assert.match(faq, /first visit/);
});

test('heldout item D2 structure', () => {
  for (const html of [read('plans.html'), read('faq.html'), section(read('book.html'), 'step-review')]) {
    assert.match(html, /18:00 the day before/);
  }
});

test('heldout item D3 structure', () => {
  const teams = read('teams.html');
  const form = teams.match(/<form[^>]*id="teams-form"[\s\S]*?<\/form>/)[0];
  const fields = form.match(/<(input|select|textarea)\b/g) ?? [];
  assert.ok(fields.length >= 9, `${fields.length} fields`);
  assert.match(teams, /written quote/);
  for (const name of ['company', 'contact-name', 'work-email', 'team-size', 'start-date', 'term', 'billing-email']) {
    assert.match(form, new RegExp(`id="${name}-error"`), name);
  }
});

// ---------- ground truth ----------

const truth = () => JSON.parse(readFileSync(TRUTH_PATH, 'utf8'));

test('heldout ground truth: shape, ids and counts per type', () => {
  const items = truth();
  assert.deepEqual(items.map((t) => t.id), ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'V1', 'V2', 'V3', 'V4', 'V5', 'P1', 'P2', 'D1', 'D2', 'D3']);
  const count = (type) => items.filter((t) => t.type === type).length;
  assert.deepEqual([count('usability'), count('value'), count('promise'), count('decoy')], [6, 5, 2, 3]);
  for (const item of items) {
    assert.equal(typeof item.title, 'string', item.id);
    assert.equal(typeof item.route, 'string', item.id);
    assert.ok(Array.isArray(item.all_of) && item.all_of.length >= 2, item.id);
    for (const group of item.all_of) {
      assert.ok(Array.isArray(group) && group.length === 1 && typeof group[0] === 'string', item.id);
      assert.doesNotThrow(() => new RegExp(group[0], 'i'), item.id);
    }
  }
});

const SAMPLES = {
  U1: {
    yes: [
      'The "Book a desk" button on the homepage took me to a monthly membership page instead of booking a day.',
      '首頁的「Book a desk」按鈕卻帶到月費會員方案頁，而不是預訂頁。',
    ],
    no: 'The Book a desk button took me straight to the booking form.',
  },
  U2: {
    yes: [
      'The pass options Drift, Dock and Den have no description, so I could not tell what each one gets me.',
      'Drift、Dock、Den 這三種票沒有說明，看不懂差別。',
    ],
    no: 'I chose the Dock pass and moved on to my details.',
  },
  U3: {
    yes: [
      'I typed my phone number with a space, exactly like the placeholder, and pressing Continue did nothing, with no error message.',
      '手機號碼照範例加了空格，按繼續完全沒反應，也沒有錯誤訊息。',
    ],
    no: 'I entered my phone number and continued to the review step.',
  },
  U4: {
    yes: [
      'On a phone-sized screen the menu opens full screen and there is no way to close it.',
      '手機版的選單打開後蓋住整個畫面，找不到關閉按鈕。',
    ],
    no: 'On mobile the hamburger menu opens and closes smoothly.',
  },
  U5: {
    yes: [
      'The spaces page hides the street address and opening hours until you sign in.',
      '地點頁要先登入才看得到地址和營業時間。',
    ],
    no: 'Each space lists its address and opening hours, and you can sign in from the header.',
  },
  U6: {
    yes: [
      'A service fee only appeared on the final review step, so the total was higher than the advertised £18.',
      '最後結帳才出現服務費，總價比一開始看到的高。',
    ],
    no: 'There is no booking fee and the total matched the pass price.',
  },
  V1: {
    yes: [
      'Booking forces you through a work vibe quiz before you can pick a date, and the answers change nothing.',
      '訂位前必須先做一個工作風格測驗，不能跳過，而且答案跟訂位無關。',
    ],
    no: 'There is a short optional quiz about your work style.',
  },
  V2: {
    yes: [
      'Every space says "Only 2 desks left today", which feels like manufactured urgency.',
      '每個地點都寫「只剩 2 個座位」，感覺是製造壓力。',
    ],
    no: 'Harbour Lane showed only 2 desks left today, so I booked quickly.',
  },
  V3: {
    yes: [
      'The confirmation page gives me Pellwick Points, a badge and a level, but nothing explains what the points are for.',
      '確認頁給了積分和徽章，卻沒有說明有什麼用。',
    ],
    no: 'The confirmation page shows my booking reference and the date.',
  },
  V4: {
    yes: [
      'Pop-ups saying someone just booked keep appearing every few seconds and cover the page.',
      '「某某剛剛預訂」的通知一直跳出來，擋住內容。',
    ],
    no: 'A single notification confirmed my booking.',
  },
  V5: {
    yes: [
      'A £2.50 Desk Cover add-on was pre-ticked in the details step.',
      '詳細資料那一步預設勾選了 2.50 英鎊的 Desk Cover 加購。',
    ],
    no: 'There is an optional Desk Cover add-on you can tick for £2.50.',
  },
  P1: {
    yes: [
      'I picked a space and a date in the homepage Check availability form, but the booking page ignored my choices and started blank.',
      '首頁的查詢空位表單選好地點和日期，到了預訂頁全部消失，要重新選。',
    ],
    no: 'Check availability on the homepage showed the free desks for my chosen space and date.',
  },
  P2: {
    yes: [
      'The amenity filters on the spaces page do nothing: I chose Showers and it still listed all four spaces.',
      '地點頁的篩選按了沒作用，選了淋浴間還是列出全部四個地點。',
    ],
    no: 'The filters narrowed the list to the two spaces with showers.',
  },
  D1: {
    yes: [
      'Having to bring a photo ID on the first visit is extra friction.',
      '第一次去要出示有照片的證件，有點麻煩。',
    ],
    no: 'The booking reference on the confirmation page was easy to copy.',
  },
  D2: {
    yes: [
      'You can only cancel for free until 18:00 the day before; after that there is no refund.',
      '只能在前一天 18:00 前免費取消，之後不退款。',
    ],
    no: 'I cancelled my booking from the My bookings page.',
  },
  D3: {
    yes: [
      'The Teams enquiry form is long, asking for team size, contract length and a billing contact.',
      '團隊詢價表單太長，欄位太多。',
    ],
    no: 'The Teams page explains private offices clearly.',
  },
};

for (const [id, sample] of Object.entries(SAMPLES)) {
  const sentences = [...sample.yes.map((text) => ({ text, credit: true })), { text: sample.no, credit: false }];
  sentences.forEach(({ text, credit }, index) => {
    test(`heldout item ${id} sample ${index + 1}`, () => {
      const item = truth().find((t) => t.id === id);
      assert.ok(item, id);
      assert.equal(itemMatches(item, text), credit, `${id} ${credit ? 'should' : 'should not'} match: ${text}`);
    });
  });
}

// Regression list from review: [item, whether the sentence must credit it, sentence].
const PROBES = [
  ['U3', false, 'The Phone booths filter does nothing; all four spaces stay listed.'],
  ['U3', false, 'On a phone, the menu lists Spaces, Plans and Teams and there is no close button.'],
  ['U3', false, 'I would continue to the Spaces page to compare locations.'],
  ['V3', false, 'The Only 2 desks left today badge appears on all four spaces and is a gimmick.'],
  ['V3', false, 'The urgency badge never says how many desks there really are.'],
  ['V3', false, 'The top-level navigation is unclear.'],
  ['U5', false, 'Sign in requires an email address and a password.'],
  ['U5', false, '登入需要電子郵件地址。'],
  ['U6', false, 'The pre-ticked Desk Cover is an extra charge at checkout.'],
  ['U6', false, 'A service fee appears in the summary table, clearly itemised.'],
  ['U4', false, 'On mobile the menu opens full screen with large links that are easy to tap.'],
  ['U2', false, 'The toast saying Tom booked a Den pass is confusing.'],
  ['U1', true, 'Every Book a desk button opens the monthly membership page.'],
  ['U1', true, 'Book a desk routes you to the Plans page and its monthly memberships.'],
  ['U1', true, '首頁的 Book a desk 連到月費方案頁。'],
  ['U2', true, 'The three day-pass tiers have no descriptions, so I cannot tell what I am paying for.'],
  ['U2', true, '三種日票都沒有說明差別。'],
  ['U3', true, "Continue doesn't work and I can't see why: the mobile number field just turns red."],
  ['U3', true, '按繼續沒有任何反應，電話欄位只變紅。'],
  ['U4', true, 'On a narrow screen the menu panel has no visible close button.'],
  ['U4', true, 'On mobile the only way out of the menu is to tap a link.'],
  ['U4', true, 'On mobile the menu is missing a close button.'],
  ['U4', true, '手機版選單打開後沒辦法關掉。'],
  ['U5', true, 'You must sign in to see the address and opening hours.'],
  ['U5', true, '地址和營業時間要登入後才會顯示。'],
  ['U6', true, 'The £3.40 service fee first shows on step 5, Review and pay.'],
  ['U6', true, 'A £3.40 service fee is only added at the payment step, so £18 becomes £21.40.'],
  ['U6', true, '到了第五步才多出 3.40 的服務費。'],
  ['V1', true, 'A personality quiz sits in front of booking.'],
  ['V1', true, 'You have to take a quiz first, and it has no bearing on the desk.'],
  ['V1', true, '訂位前要先做測驗，結果跟桌子沒關係。'],
  ['V2', true, 'All four spaces say only two desks are left.'],
  ['V2', true, 'Only 2 desks remaining on every card looks invented.'],
  ['V3', true, "It's not clear what Pellwick Points are."],
  ['V3', true, 'What do the points actually buy me?'],
  ['V4', true, "A card in the corner keeps announcing other visitors' bookings."],
  ['V4', true, '訂位通知一直跳出來，擋住表單。'],
  ['V5', true, 'Desk Cover 被自動勾選。'],
  ['V5', true, 'Desk Cover is opted in by default and you have to remove it.'],
  ['P1', true, 'Check availability goes to the quiz instead of showing availability for my space and date.'],
  ['P1', true, '首頁查詢空位按下去沒有顯示任何空位。'],
  ['P2', true, 'The Showers filter says Showing 4 spaces with Showers even though only two spaces have showers.'],
  ['P2', true, 'The filters are only cosmetic; all four cards stay on the page.'],
  ['P2', true, '篩選按鈕按了只會變色，四個空間都留著。'],
  ['D1', false, 'The note explains why a photo ID is checked, which I found reassuring.'],
  ['D2', false, 'Free cancellation until 18:00 the day before is clearly stated where you pay.'],
  ['D3', false, 'The Teams page says the price depends on team size.'],
  ['D1', true, 'Requiring ID on a first visit feels excessive for a desk.'],
  ['D1', true, 'The photo-ID check is only mentioned on the final payment screen.'],
  ['D2', true, 'Cancelling after 18:00 the day before loses the whole fee, which feels harsh.'],
  ['D3', true, 'The team enquiry form has fourteen fields, which is far too many.'],
];

PROBES.forEach(([id, credit, text], index) => {
  test(`heldout item ${id} probe ${index + 1}`, () => {
    const item = truth().find((t) => t.id === id);
    assert.ok(item, id);
    assert.equal(itemMatches(item, text), credit, `${id} ${credit ? 'should' : 'should not'} match: ${text}`);
  });
});

test('heldout ground truth: each positive sample matches only the items it is about', () => {
  const items = truth();
  for (const [id, sample] of Object.entries(SAMPLES)) {
    for (const sentence of sample.yes) {
      const others = items.filter((t) => t.id !== id && itemMatches(t, sentence)).map((t) => t.id);
      assert.deepEqual(others, [], `${id} sample also matched ${others}: ${sentence}`);
    }
  }
});

test('heldout ground truth: plain unrelated remarks match nothing', () => {
  const items = truth();
  for (const sentence of [
    'The footer copyright year is wrong and the colour contrast of the grey caption is low.',
    'The site looks clean and the pages load quickly.',
    'I booked a desk for Thursday and got a confirmation.',
  ]) {
    assert.deepEqual(items.filter((t) => itemMatches(t, sentence)).map((t) => t.id), [], sentence);
  }
});
