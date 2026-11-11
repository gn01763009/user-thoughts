// The quiet report: each person is introduced, then one key moment with its screenshot; only the full walk is one tap away.
// Spacing and fit are checked by looking at the page in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';
import { buildReportModel } from '../skills/launch/scripts/report-model.mjs';
import { renderReport } from '../skills/launch/scripts/render-html.mjs';
import { CSS, MOTION } from '../skills/launch/scripts/report-theme.mjs';
import { prettyDate, prettyRoute, MAX_ROUTE_CHARS } from '../skills/launch/scripts/report-format.mjs';
import { renderSummary } from '../skills/launch/scripts/render-summary.mjs';
import { keyMoment, overviewQuote } from '../skills/launch/scripts/report-moment.mjs';

const step = (n, extra = {}) => ({
  step: n, route: '/', action: `a${n}`, thought: `thought ${n}`, feeling: 'fine', screenshot: `p/screens/0${n}.png`, progress: true, ...extra,
});
const person = (id, name, extra = {}) => ({
  id, name, situation: `${name} situation`, came_for: `${name} came for`, outcome: 'completed', stop_reason: 'goal_reached', left_at: '/done',
  steps: [step(1), step(2)], last_words: null, apple: null, launch_comment: null, ...extra,
});
const CALM = { asked: 1, yes: 0, no: 1, unsure: 0, warn: false };
const modelWith = (people, run = {}) => buildReportModel({
  run: { url: 'https://example.com/app', date: '2026-11-08', depth: 'standard', language: 'zh-TW', vision: 'v', understanding: 'u', personas: [], ...run },
  merged: { personas: [], findings: [], dropped_voices: [], people, apple: CALM },
  judgements: undefined, telephone: undefined, previous: null,
});
const htmlWith = (people, run = {}) => {
  const model = modelWith(people, run);
  return renderReport(model, labelsFor(model.language));
};
const decode = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const policyOf = (html) => decode(/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)[1]);
const overviewOf = (html) => html.slice(html.indexOf('id="section-overview"'), html.indexOf('id="section-stories"'));
const personOf = (html, id) => {
  const from = html.indexOf(`id="person-${id}"`);
  const next = html.indexOf('<article', from);
  return html.slice(from, next === -1 ? undefined : next);
};
const zh = labelsFor('zh-TW');

// ---- keyMoment ----

const feelings = (...list) => ({ steps: list.map((feeling, i) => step(i + 1, { feeling })) });

test('keyMoment takes the strongest feeling: stuck, annoyed, confused, delighted, unsure, fine', () => {
  const order = ['stuck', 'annoyed', 'confused', 'delighted', 'unsure', 'fine'];
  order.forEach((strong, i) => {
    for (const weak of order.slice(i + 1)) {
      assert.equal(keyMoment(feelings(strong, weak)).feeling, strong, `${strong} before ${weak}`);
      assert.equal(keyMoment(feelings(weak, strong)).feeling, strong, `${weak} before ${strong}`);
    }
  });
});

test('keyMoment takes the latest step on a tie', () => {
  assert.equal(keyMoment(feelings('annoyed', 'fine', 'annoyed', 'unsure')).step, 3);
  assert.equal(keyMoment(feelings('fine', 'fine', 'fine')).step, 3);
});

test('on a tie keyMoment takes the latest step with a real thought (8 characters or more), else the latest', () => {
  const thoughts = (feeling, ...list) => ({ steps: list.map((thought, i) => step(i + 1, { feeling, thought })) });
  assert.equal(keyMoment(thoughts('annoyed', '這個按鈕到底在哪裡啊', '我真的找不到那個地方', '煩')).step, 2);
  assert.equal(keyMoment(thoughts('annoyed', '1234567', '12345678', '1234567')).step, 2);
  assert.equal(keyMoment(thoughts('annoyed', '煩', '喔', '嗯')).step, 3);
  const mixed = { steps: [step(1, { feeling: 'stuck', thought: '短' }), step(2, { feeling: 'annoyed', thought: '這個按鈕到底在哪裡啊' })] };
  assert.equal(keyMoment(mixed).step, 1, 'a weaker feeling with a longer thought does not beat a stronger feeling');
});

test('keyMoment is null with no steps, and an unknown feeling never wins but still gives a moment', () => {
  assert.equal(keyMoment({ steps: [] }), null);
  assert.equal(keyMoment({}), null);
  assert.equal(keyMoment(null), null);
  assert.equal(keyMoment(feelings('odd', 'fine', 'odd')).step, 2);
  assert.equal(keyMoment(feelings('odd', 'odd')).step, 2);
});

test('keyMoment leaves the person untouched', () => {
  const input = feelings('stuck', 'fine');
  const snapshot = JSON.stringify(input);
  keyMoment(input);
  assert.equal(JSON.stringify(input), snapshot);
});

// ---- the top of the page ----

test('the headline counts who came, and the line below it says who finished', () => {
  const some = htmlWith([person('p1', '小美'), person('p2', '阿哲', { outcome: 'abandoned' }), person('p3', '阿信', { outcome: 'blocked' })]);
  assert.match(some, /<h1[^>]*>3 個人用了 example\.com<\/h1>/);
  assert.ok(some.includes('1 個人完成來做的事，2 個人沒有。'));
});

test('when nobody finished the line says so instead of counting zero', () => {
  const none = htmlWith([person('p1', '小美', { outcome: 'abandoned' }), person('p2', '阿哲', { outcome: 'blocked' })]);
  assert.ok(none.includes('沒有人完成來做的事。'));
  assert.ok(!none.includes('0 個人完成'));
});

test('when everyone finished the line says so', () => {
  const all = htmlWith([person('p1', '小美'), person('p2', '阿哲')]);
  assert.ok(all.includes('全部的人都完成了。'));
});

test('a run with no people does not claim that everyone finished', () => {
  assert.ok(!htmlWith([]).includes('全部的人都完成了。'));
});

test('English headline and status read correctly, for one person too', () => {
  const en = labelsFor('en');
  const one = htmlWith([person('p1', 'Mina')], { language: 'en' });
  assert.ok(one.includes('1 person used example.com'));
  assert.ok(one.includes(en.status_all));
  const two = htmlWith([person('p1', 'Mina'), person('p2', 'Omar', { outcome: 'abandoned' })], { language: 'en' });
  assert.ok(two.includes('2 people used example.com'));
  assert.ok(two.includes('1 finished what they came to do, 1 did not.'));
});

test('the top shows the vision, the date without its time, the depth and the one quiet line', () => {
  const html = htmlWith([person('p1', '小美')], { date: '2026-11-08T14:30:00Z', vision: '飼主的願景' });
  const top = html.slice(html.indexOf('<h1'), html.indexOf('id="section-overview"'));
  assert.ok(top.includes('你的願景：'));
  assert.ok(top.includes('飼主的願景'));
  assert.ok(top.includes('2026-11-08'));
  assert.ok(!html.includes('14:30'));
  assert.ok(top.includes(zh.depth_standard));
  assert.ok(top.includes('這些是模擬的人。畫面是真的，感受需要找真人確認。'));
});

test('claims dropped for having no step are still counted at the top, and only when there are some', () => {
  const dropped = (n) => {
    const model = buildReportModel({
      run: { url: 'https://example.com/', date: 'd', depth: 'standard', language: 'zh-TW', vision: 'v', understanding: 'u', personas: [] },
      merged: { personas: [], findings: [], dropped_voices: Array(n).fill({ persona: 'p1' }), people: [person('p1', '小美')], apple: CALM },
      judgements: undefined, telephone: undefined, previous: null,
    });
    return renderReport(model, zh);
  };
  assert.ok(dropped(2).includes(zh.dropped_note.replace('{n}', '2')));
  assert.ok(!dropped(0).includes(zh.dropped_note.split('{n}')[1]));
});

test('fixed copy has no gendered pronoun', () => {
  for (const value of Object.values(labelsFor('zh-TW'))) assert.doesNotMatch(value, /(?<!其)[他她]/u, value);
  for (const value of Object.values(labelsFor('en'))) assert.doesNotMatch(value, /\b(he|she|his|her|hers|him)\b/i, value);
});

// ---- overview ----

const annoyedQuote = '我只是想確認營業時間。我的狗在抖，這種時候不要問我這個。';
const kai = (extra = {}) => person('p2', '阿凱', {
  outcome: 'abandoned', came_for: '找現在還開著的 24 小時動物醫院',
  steps: [step(1), step(5, { feeling: 'annoyed', thought: annoyedQuote, screenshot: 'p2/screens/05.png' })],
  ...extra,
});

const friendLine = '它找不到現在還開著的醫院，我不會推薦。';
const withFriend = () => kai({ last_words: { would_return: 'no', why: '找不到', tell_a_friend: friendLine, steps: [5] } });

test('each row names the person, quotes what they would tell a friend, says what they came for and how it ended', () => {
  const row = overviewOf(htmlWith([withFriend()]));
  assert.ok(row.includes('href="#person-p2"'));
  assert.ok(row.includes('阿凱'));
  assert.ok(row.includes(`class="row-quote">${zh.sep_colon}${zh.quote_open}${friendLine}${zh.quote_close}<`));
  assert.ok(!row.includes('我的狗在抖'), 'a mid-visit thought is never shown under the friend heading');
  assert.ok(row.includes('找現在還開著的 24 小時動物醫院'));
  assert.ok(row.includes(`>${zh.outcome_abandoned}<`));
});

test('the outcome word is plain text with no colour class', () => {
  const row = overviewOf(htmlWith([kai()]));
  assert.ok(row.includes(zh.outcome_abandoned));
  assert.doesNotMatch(row, /class="out-/);
});

test('a row without a quote or a reason for coming has no empty line', () => {
  const row = overviewOf(htmlWith([person('p3', '路過', { steps: [], came_for: null, outcome: 'blocked' })]));
  assert.ok(row.includes('路過'));
  assert.ok(!row.includes('class="row-quote"'));
  assert.ok(!row.includes('class="row-sub"'));
});

test('no overview when nobody took part', () => {
  assert.ok(!htmlWith([]).includes('id="section-overview"'));
  assert.ok(!htmlWith([]).includes('id="section-stories"'));
});

// ---- each person: the key moment ----

test('the section shows the whole thought of the key moment, its step and feeling, and links to the full-size screenshot', () => {
  const block = personOf(htmlWith([kai()]), 'p2');
  const moment = block.slice(block.indexOf('<figure'), block.indexOf('</figure>'));
  assert.ok(moment.includes(annoyedQuote));
  assert.ok(moment.includes('href="p2/screens/05.png"'));
  assert.ok(moment.includes('src="p2/screens/05.png"'));
  assert.ok(moment.includes('第 5 步'));
  assert.ok(moment.includes(`>${zh.feeling_annoyed}<`));
});

test('the header says how it ended and whether they would come back', () => {
  const block = personOf(htmlWith([kai({ last_words: { would_return: 'maybe', why: '太慢', tell_a_friend: '別用', steps: [1] } })]), 'p2');
  const head = block.slice(0, block.indexOf('<figure'));
  assert.ok(head.includes(zh.outcome_abandoned));
  assert.ok(head.includes(`${zh.would_return_maybe}`));
});

test('below the moment: what they would tell a friend, whether they would return and why, and the planned feature with its tag', () => {
  const p = kai({ last_words: { would_return: 'no', why: '太慢了', tell_a_friend: '別用這個', steps: [1] }, apple: { answer: 'no', why: '我不需要' } });
  const model = modelWith([p]);
  const block = personOf(renderReport(model, zh), 'p2');
  const after = block.slice(block.indexOf('</figure>'));
  for (const text of ['別用這個', '太慢了', zh.would_return_no, zh.tell_a_friend, '我不需要', `>${zh.apple_experimental}<`]) assert.ok(after.includes(text), text);
  const validated = renderReport({ ...model, apple: { ...model.apple, status: 'validated' } }, zh);
  assert.ok(!validated.includes(`>${zh.apple_experimental}<`));
});

test('a person with no steps gets a plain line instead of an image, and no disclosure', () => {
  const block = personOf(htmlWith([person('p3', '路過', { steps: [], outcome: 'blocked', stop_reason: 'never_started', left_at: null })]), 'p3');
  assert.ok(block.includes('沒有留下畫面'));
  assert.ok(!block.includes('<img'));
  assert.ok(!block.includes('<details'));
  assert.ok(block.includes('never_started'));
});

test('a key moment whose screenshot is not a safe relative path gets the plain line and no link', () => {
  for (const bad of ['https://evil.example/x.png', '//evil.example/x.png', 'javascript:alert(1)', '/etc/passwd', '../../secret.png', 'screens/x.html', '%2e%2e/%2e%2e/x.png']) {
    const html = htmlWith([person('p1', '小美', { steps: [step(1, { screenshot: bad })] })]);
    assert.ok(!html.includes(`src="${bad}"`), bad);
    assert.ok(!html.includes(`href="${bad}"`), bad);
    assert.ok(personOf(html, 'p1').includes('沒有留下畫面'), bad);
  }
});

// ---- each person: every step, one tap away ----

test('the disclosure is native and carries the step count', () => {
  const block = personOf(htmlWith([person('p1', '小美', { steps: [step(1), step(2), step(3)] })]), 'p1');
  assert.match(block, /<details[^>]*>\s*<summary[^>]*>看完整過程（3 步）<\/summary>/);
  assert.ok(block.indexOf('<details') > block.indexOf('</figure>'));
});

test('the steps are an ordered list numbered by the real step, even across a gap', () => {
  const steps = [step(1), step(3, { thought: 'third' }), step(4)];
  const block = personOf(htmlWith([person('p1', '小美', { steps })]), 'p1');
  const list = block.slice(block.indexOf('<details'), block.indexOf('</details>'));
  assert.ok(list.includes('<ol'));
  assert.deepEqual([...list.matchAll(/<li value="(\d+)"/g)].map((m) => m[1]), ['1', '3', '4']);
  assert.ok(list.includes('third'));
});

test('each step shows its thought, action, decoded route, feeling word and a thumbnail linking to the file', () => {
  const steps = [step(1), step(2, { route: '/a%E5%8F%B0?b=1', action: '點了按鈕', feeling: 'confused', screenshot: 'p/screens/02.png' })];
  const block = personOf(htmlWith([person('p1', '小美', { steps })]), 'p1');
  const list = block.slice(block.indexOf('<details'), block.indexOf('</details>'));
  assert.ok(list.includes('點了按鈕'));
  assert.ok(list.includes('/a台'));
  assert.ok(!list.includes('%E5%8F%B0'));
  assert.ok(list.includes(`>${zh.feeling_confused}<`));
  assert.ok(list.includes('href="p/screens/02.png"'));
  assert.ok(list.includes('src="p/screens/02.png"'));
});

test('a thought stays whole in the html, and routes shown to the builder are pretty', () => {
  const thought = '第一句話。第二句話，還有一點！第三句？';
  const html = htmlWith([person('p1', '小美', { steps: [step(1, { thought })], left_at: '/c/%E5%8F%B0?x=1' })]);
  assert.ok(html.includes(thought));
  assert.ok(html.includes('/c/台'));
  assert.ok(!html.includes('%E5%8F%B0'));
});

// ---- getting to know the person ----

const known = (extra = {}) => kai({
  facts: ['28 歲', '外送員', '新北'], about: '養了這隻狗六年。平常有事都問當獸醫的朋友。', cares: ['現在有沒有開', '離我多遠'],
  why_chosen: '緊急又只有一支手機', voice: '講話很短 Sample: 快點快點', ...extra,
});

test('the section introduces the person before the situation and the key moment', () => {
  const block = personOf(htmlWith([known()]), 'p2');
  const order = ['28 歲 · 外送員 · 新北', '養了這隻狗六年', zh.cares_label, '現在有沒有開 · 離我多遠', '阿凱 situation', '緊急又只有一支手機', '<figure']
    .map((text) => block.indexOf(text));
  assert.ok(order.every((at) => at !== -1), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(block.includes(`${zh.why_chosen_label}：緊急又只有一支手機`));
});

test('the voice is never printed', () => {
  assert.ok(!htmlWith([known()]).includes('講話很短'));
});

test('without those fields the section has no empty label, empty element or stray separator', () => {
  const block = personOf(htmlWith([kai({ why_chosen: '' })]), 'p2');
  const head = block.slice(0, block.indexOf('<figure'));
  assert.ok(!head.includes(zh.cares_label));
  assert.ok(!head.includes(zh.why_chosen_label));
  for (const name of ['facts', 'about', 'cares', 'chosen']) assert.ok(!head.includes(`class="${name}"`), name);
  assert.doesNotMatch(head, /<p[^>]*><\/p>/);
  assert.doesNotMatch(head, /· <\/|>\s*·/);
});

test('an old merged.json with none of the fields, or with the wrong shape, renders the same as an empty card', () => {
  const plain = htmlWith([kai()]);
  const wrong = htmlWith([kai({ facts: 'x', about: 5, cares: { a: 1 }, why_chosen: null, voice: [] })]);
  assert.ok(!plain.includes('class="row-facts"') && !wrong.includes('class="row-facts"'));
  assert.ok(!personOf(wrong, 'p2').includes('class="about"'));
  assert.deepEqual(modelWith([kai()]).people[0].facts, []);
  assert.deepEqual(modelWith([kai({ facts: ['a', '', 3] })]).people[0].facts, ['a']);
});

test('the overview row reads name: quote, then the facts, then why they came', () => {
  const row = overviewOf(htmlWith([known({ last_words: withFriend().last_words })]));
  const order = ['阿凱', '：「', '它找不到現在還開著', '」', '28 歲 · 外送員 · 新北', '找現在還開著的'].map((text) => row.indexOf(text));
  assert.ok(order.every((at) => at !== -1), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('without facts the first line of the row is the name alone', () => {
  const row = overviewOf(htmlWith([kai()]));
  assert.ok(row.includes('>阿凱<'));
  assert.ok(!row.includes('class="row-facts"'));
  assert.ok(!row.includes(' · '));
});

test('the new card fields are escaped everywhere they appear', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const html = htmlWith([known({ facts: [evil], about: evil, cares: [evil], why_chosen: evil })]);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

// ---- no script, and a closed policy ----

test('the report has no script at all, whatever the data says', () => {
  const evil = '</script><script>alert(1)</script>';
  const html = htmlWith([person(evil, evil, { situation: evil, steps: [step(1, { thought: evil, route: evil })] })], { vision: evil });
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(htmlWith([person('p1', '小美')]), /<script|onclick=|onload=/i);
});

test('the content security policy is exactly the one in the brief, and comes before what it governs', () => {
  const html = htmlWith([person('p1', '小美')]);
  assert.equal(policyOf(html), "default-src 'none'; img-src 'self' file: data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'");
  assert.ok(html.indexOf('Content-Security-Policy') > 0 && html.indexOf('Content-Security-Policy') < html.indexOf('<style>'));
});

// ---- sections that need their own shape ----

test('a conflict is one heading per question, a block per side, and no verdict', () => {
  const people = [person('p1', '小美'), person('p2', '阿哲')];
  const conflict = (q) => ({ question: q, sides: [{ label: 'A', reasons: [{ persona: 'p1', step: 1 }] }, { label: 'B', reasons: [{ persona: 'p2', step: 2 }] }], vision_note: 'n' });
  const model = buildReportModel({
    run: { url: 'https://e.com', date: 'd', depth: 'standard', language: 'zh-TW', vision: 'v', understanding: 'u', personas: [] },
    merged: { personas: [], findings: [], dropped_voices: [], people, apple: CALM },
    judgements: { conflicts: [conflict('Q1'), conflict('Q2')] }, telephone: undefined, previous: null,
  });
  const conflicts = renderReport(model, zh).slice(renderReport(model, zh).indexOf('id="section-conflicts"'));
  assert.deepEqual([...conflicts.matchAll(/<h3[^>]*>(Q\d)<\/h3>/g)].map((m) => m[1]), ['Q1', 'Q2']);
  assert.equal((conflicts.match(/class="side"/g) ?? []).length, 4);
});

test('a chain shows the final impression after the two earlier sentences', () => {
  const p = person('p1', '小美', { last_words: { would_return: 'yes', why: 'w', tell_a_friend: '第一句', steps: [1] } });
  const model = buildReportModel({
    run: { url: 'https://e.com', date: 'd', depth: 'standard', language: 'zh-TW', vision: '願景內容', understanding: 'u', personas: [] },
    merged: { personas: [], findings: [], dropped_voices: [], people: [p], apple: CALM },
    judgements: undefined, telephone: { chains: [{ from: 'p1', hops: ['第二句', '最後印象'], comment: null }] }, previous: null,
  });
  const html = renderReport(model, zh);
  const tel = html.slice(html.indexOf('id="section-telephone"'));
  const order = ['願景內容', '第一句', '第二句', '最後印象'].map((text) => tel.indexOf(text));
  assert.ok(order.every((at) => at !== -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(tel, /class="final">最後印象</);
});

test('an assumption reads as what you thought against what really happened', () => {
  const p = person('p1', '小美');
  const model = buildReportModel({
    run: { url: 'https://e.com', date: 'd', depth: 'standard', language: 'zh-TW', vision: 'v', understanding: 'u', personas: [] },
    merged: { personas: [], findings: [], dropped_voices: [], people: [p], apple: CALM },
    judgements: { assumptions: [{ claim: '大家先看價格', happened: '真的先看', evidence: [{ persona: 'p1', step: 1 }] }, { claim: '會用搜尋', evidence: [] }] },
    telephone: undefined, previous: null,
  });
  const html = renderReport(model, zh);
  const section = html.slice(html.indexOf('id="section-assumptions"'));
  assert.ok(section.includes('你以為'));
  assert.ok(section.includes('實際上'));
  assert.ok(section.includes('真的先看'));
  assert.ok(section.includes(zh.not_encountered));
});

// ---- the stylesheet keeps to the brief ----

test('the report is light only, with neutral tokens and one accent', () => {
  for (const token of ['color-scheme:light;', '--page:#FFFFFF', '--card:#F5F5F7', '--label:#1D1D1F', '--secondary:#6E6E73', '--separator:#D2D2D7', '--accent:#0066CC']) assert.ok(CSS.includes(token), token);
  assert.ok(!CSS.includes('prefers-color-scheme'));
  assert.ok(!/--finished|--unfinished|--warning/.test(CSS));
  assert.ok(CSS.includes('prefers-contrast:more'));
});

test('no colour outside the brief, no gradient and no shadow', () => {
  const allowed = new Set(['#FFFFFF', '#F5F5F7', '#1D1D1F', '#6E6E73', '#D2D2D7', '#0066CC', '#000000']);
  for (const colour of CSS.match(/#[0-9a-fA-F]{3,8}\b/g)) assert.ok(allowed.has(colour), colour);
  assert.doesNotMatch(CSS, /gradient|box-shadow|\brgba?\(|filter:/);
});

test('one system family, sizes in rem, weights 400 to 600 only', () => {
  assert.ok(CSS.includes('font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif'));
  assert.equal((CSS.match(/font-family:/g) ?? []).length, 1);
  for (const size of CSS.match(/font-size:[^;}]*/g)) assert.match(size, /rem$/, size);
  for (const weight of CSS.match(/font-weight:[^;}]*/g)) assert.match(weight, /:(400|500|600)$/, weight);
  assert.doesNotMatch(CSS, /[;{]font:/);
});

test('motion lives only in the guarded block, and never hides content where it is unsupported', () => {
  const guarded = MOTION.replace(/\s/g, '');
  assert.ok(guarded.includes('@supports(animation-timeline:view())'));
  assert.ok(MOTION.includes('prefers-reduced-motion:no-preference'));
  assert.ok(CSS.includes(MOTION));
  assert.doesNotMatch(CSS.replace(MOTION, ''), /animation|transition|@keyframes|scroll-behavior/);
  assert.doesNotMatch(MOTION, /transition/);
});

test('no sticky or fixed bars, and interactive targets are at least 44px tall', () => {
  assert.doesNotMatch(CSS, /position:(fixed|sticky)/);
  assert.match(CSS, /summary\{[^}]*padding:11px 0/);
  assert.match(CSS, /\.row\{[^}]*min-height:44px/);
});

// ---- route and date text ----

test('prettyRoute decodes a Chinese path', () => {
  assert.equal(prettyRoute('/zh-TW/clinics/cities/%E5%8F%B0%E5%8C%97%E5%B8%82'), '/zh-TW/clinics/cities/台北市');
});

test('prettyRoute leaves malformed percent-escapes raw and never throws', () => {
  for (const raw of ['/a/%E5%ZZ', '/100%', '%']) assert.equal(prettyRoute(raw), raw);
});

test('prettyRoute drops the query string, but not a question mark that was escaped in the path', () => {
  assert.equal(prettyRoute('/signin?next=%2Fzh-TW%2Fclinics'), '/signin');
  assert.equal(prettyRoute('/zh-TW/clinics/cities/%E5%8F%B0?map=true&location=auto'), '/zh-TW/clinics/cities/台');
  assert.equal(prettyRoute('/a%3Fb?x=1'), '/a?b');
});

test('prettyRoute truncates long paths by character with an ellipsis', () => {
  const long = `/${'字'.repeat(MAX_ROUTE_CHARS * 2)}`;
  const out = prettyRoute(long);
  assert.equal(Array.from(out).length, MAX_ROUTE_CHARS + 1);
  assert.ok(out.endsWith('…'));
  const astral = prettyRoute(`/${'😀'.repeat(MAX_ROUTE_CHARS * 2)}`);
  assert.doesNotMatch(astral, /\p{Cs}/u, 'no half of a surrogate pair is left behind');
  const exact = `/${'a'.repeat(MAX_ROUTE_CHARS - 1)}`;
  assert.equal(prettyRoute(exact), exact);
});

test('prettyRoute returns plain text, decoded but never escaped, and tolerates a missing route', () => {
  assert.equal(prettyRoute('/%3Cscript%3Ealert(1)%3C/script%3E'), '/<script>alert(1)</script>');
  assert.equal(prettyRoute('/a%26b'), '/a&b');
  assert.equal(prettyRoute(null), '');
  assert.equal(prettyRoute(undefined), '');
});

test('a route with markup is escaped in the HTML report but stays plain in summary.md', () => {
  const route = '/a%26b%3Cscript%3E';
  const people = [person('p1', '小美', { steps: [step(1, { route })], left_at: route, outcome: 'abandoned' })];
  const html = htmlWith(people);
  assert.ok(html.includes('/a&amp;b&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  const model = modelWith(people);
  const summary = renderSummary(model, labelsFor(model.language));
  assert.ok(summary.includes('/a&b<script>'));
  assert.ok(!summary.includes('&amp;'));
});

test('prettyDate shows the date only and falls back to the raw value', () => {
  assert.equal(prettyDate('2026-11-08T16:28:19.223Z'), '2026-11-08');
  assert.equal(prettyDate('2026-11-08'), '2026-11-08');
  assert.equal(prettyDate('sometime last week'), 'sometime last week');
  assert.equal(prettyDate('<b>'), '&lt;b&gt;');
  assert.equal(prettyDate(undefined), '');
});

// ---- the overview quote has to make sense to someone who has not seen the site ----

test('overviewQuote prefers what the person would tell a friend over a mid-visit thought', () => {
  const steps = [{ step: 1, thought: '還是沒到，再一點點', feeling: 'stuck', screenshot: 'p1/screens/01.png' }];
  const person = { steps, last_words: { tell_a_friend: '  資料很多，但現在有開的它找不到  ' } };
  assert.equal(overviewQuote(person), '資料很多，但現在有開的它找不到');
});

test('overviewQuote is empty when the person left no words for a friend, never a mid-visit thought', () => {
  const steps = [{ step: 1, thought: '蛤。我的狗在抖，不要問我這個。', feeling: 'annoyed', screenshot: 'p1/screens/01.png' }];
  assert.equal(overviewQuote({ steps, last_words: null }), '');
  assert.equal(overviewQuote({ steps, last_words: { tell_a_friend: '   ' } }), '');
  assert.equal(overviewQuote({ steps, last_words: {} }), '');
  assert.equal(overviewQuote({ steps: [], last_words: null }), '');
});

test('a row with no last words shows the name alone, with no quote', () => {
  const row = overviewOf(htmlWith([kai()]));
  assert.ok(row.includes('阿凱'));
  assert.ok(!row.includes('class="row-quote"'));
  assert.ok(!row.includes('我的狗在抖'));
});

test('a route in the not-reproduced list is decoded and has no query, like every other route', () => {
  const model = buildReportModel({
    run: { url: 'https://example.com/', date: '2026-11-08', depth: 'standard', language: 'en', vision: 'v', understanding: 'u', personas: [] },
    merged: { personas: [], findings: [{ verification: 'not_reproduced', route: '/a%E5%8F%B0?x=1', element: { name: 'Save' } }], dropped_voices: [], people: [], apple: CALM },
    judgements: undefined, telephone: undefined, previous: null,
  });
  assert.ok(model.not_checked.some((line) => line.includes('/a台 Save')), model.not_checked.join('|'));
});

// ---- a stop imposed from outside is labelled as such ----

test('the status line says why the visit ended when a boundary stopped it, and only then', () => {
  for (const reason of ['unsafe_action', 'login_wall', 'bot_check']) {
    const block = personOf(htmlWith([person('p1', '小美', { outcome: 'blocked', stop_reason: reason })]), 'p1');
    const status = /<p class="status">(.*?)<\/p>/.exec(block)[1];
    assert.ok(status.includes(zh.outcome_blocked), reason);
    assert.ok(status.includes(zh[`stop_reason_${reason}`]), reason);
    assert.ok(status.indexOf(zh.outcome_blocked) < status.indexOf(zh[`stop_reason_${reason}`]), reason);
  }
  for (const reason of ['goal_reached', 'leave_urge', 'step_limit', null]) {
    const block = personOf(htmlWith([person('p1', '小美', { stop_reason: reason })]), 'p1');
    const status = /<p class="status">(.*?)<\/p>/.exec(block)[1];
    assert.ok(!status.includes(zh.stop_reason_leave_urge) && !status.includes(zh.stop_reason_goal_reached), String(reason));
  }
});

// ---- a person who never started ----

test('a person who never started gets a plain label, in both languages, and is not counted as having used the site', () => {
  assert.notEqual(zh.outcome_not_started, undefined);
  assert.notEqual(labelsFor('en').outcome_not_started, undefined);
  const ghost = person('p9', '沒來', { steps: [], outcome: null, stop_reason: null, left_at: null });
  const html = htmlWith([person('p1', '小美'), kai(), ghost]);
  assert.ok(overviewOf(html).includes(`<span class="row-out">${zh.outcome_not_started}</span>`));
  assert.ok(personOf(html, 'p9').includes(zh.outcome_not_started));
  const headline = html.slice(html.indexOf('<h1'), html.indexOf('</h1>'));
  assert.ok(headline.includes(zh.headline_used.replace('{n}', '2').replace('{host}', 'example.com')), headline);
  const alone = htmlWith([ghost]);
  assert.ok(alone.slice(alone.indexOf('<h1'), alone.indexOf('</h1>')).includes('0'));
});

test('summary.md counts only people who started', () => {
  const ghost = person('p9', '沒來', { steps: [], outcome: null, stop_reason: null, left_at: null });
  const model = modelWith([person('p1', '小美'), ghost]);
  assert.ok(renderSummary(model, zh).includes(`${zh.summary_completed} 1/1`));
});

test('a quote mark in a person id cannot break out of the id or href attribute', () => {
  const html = htmlWith([person('a"b', '小美')]);
  assert.ok(html.includes('id="person-a&quot;b"'));
  assert.ok(html.includes('href="#person-a&quot;b"'));
  assert.ok(!html.includes('person-a"b'));
});

// ---- running out of test steps is not giving up ----

const cutShort = (id, name, extra = {}) => person(id, name, { outcome: 'abandoned', stop_reason: 'step_limit', left_at: '/clinic', ...extra });
const gaveUp = (id, name, extra = {}) => person(id, name, { outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/signup', ...extra });

test('someone who ran out of test steps is labelled so, in the row and the header, never as not finished', () => {
  const html = htmlWith([cutShort('p1', '子晴'), gaveUp('p2', '阿哲')]);
  const rows = overviewOf(html);
  assert.ok(rows.includes(`>${zh.outcome_step_limit}<`));
  assert.equal(rows.split(`>${zh.outcome_abandoned}<`).length - 1, 1, 'only the person who gave up is not finished');
  const head = personOf(html, 'p1');
  assert.ok(head.slice(0, head.indexOf('<figure')).includes(zh.outcome_step_limit));
  assert.ok(!head.slice(0, head.indexOf('<figure')).includes(zh.outcome_abandoned));
});

test('the status line says how many of the unfinished ran out of test steps, and only when some did', () => {
  const top = (html) => html.slice(html.indexOf('<h1'), html.indexOf('id="section-overview"'));
  const mixed = top(htmlWith([person('p0', '小美'), cutShort('p1', '子晴'), cutShort('p3', '家豪'), gaveUp('p2', '阿哲')]));
  assert.ok(mixed.includes('1 個人完成來做的事，3 個人沒有。'));
  assert.ok(mixed.includes(zh.status_cut.replace('{n}', '2')));
  const none = top(htmlWith([person('p0', '小美'), gaveUp('p2', '阿哲')]));
  assert.ok(!none.includes(zh.status_cut.split('{n}')[0]));
  const en = labelsFor('en');
  const english = top(htmlWith([person('p0', 'Mina'), cutShort('p1', 'Omar')], { language: 'en' }));
  assert.ok(english.includes(en.status_cut.replace('{n}', '1')));
});

test('summary.md lists people who ran out of steps apart from people who gave up', () => {
  const model = modelWith([person('p0', '小美'), cutShort('p1', '子晴'), gaveUp('p2', '阿哲')]);
  const line = renderSummary(model, zh).split('\n')[1];
  assert.ok(line.includes(`${zh.summary_completed} 1/3`));
  assert.ok(line.includes(`${zh.gave_up_at}${zh.sep_colon}阿哲 @ /signup`));
  assert.ok(line.includes(`${zh.ran_out_at}${zh.sep_colon}子晴 @ /clinic`));
  const calm = renderSummary(modelWith([person('p0', '小美'), gaveUp('p2', '阿哲')]), zh);
  assert.ok(!calm.includes(zh.ran_out_at));
});

test('the brief asks for the feature name and if_gone in the run language, because the report prints both', async () => {
  const { readFile } = await import('node:fs/promises');
  const briefs = await readFile(new URL('../skills/launch/references/briefs.md', import.meta.url), 'utf8');
  const line = briefs.split('\n').find((l) => l.startsWith('Language: {{language}}'));
  assert.match(line, /`feature` name and `if_gone` in \{\{language_name\}\}/);
});
