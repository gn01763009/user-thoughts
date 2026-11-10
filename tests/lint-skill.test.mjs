import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter, lintRepo, main, checkBriefLeak, referencedPaths, checkPersonaFile } from '../scripts/lint-skill.mjs';

const SCRIPT_PATH = fileURLToPath(new URL('../scripts/lint-skill.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHIPPED_SKILL = join(REPO_ROOT, 'skills/launch/SKILL.md');
const SHIPPED_BRIEFS = join(REPO_ROOT, 'skills/launch/references/briefs.md');
const FENCE = '```';
const personBrief = (lines) => `## Person brief\n${FENCE}text\n${lines.join('\n')}\n${FENCE}\n`;
const DEFAULT_DESCRIPTION = 'Use when a test needs a small skill fixture.';
const PERSONA_DEFAULTS = {
  id: 'novice',
  label: 'Novice visitor',
  evidence: 'quote and screenshot',
  viewport: '390x844',
  max_steps: '15',
  no_progress_limit: '3',
  leave_urge_limit: '2',
};
const MANIFESTS = {
  '.claude-plugin/plugin.json': JSON.stringify({ name: 'user-thoughts', version: '0.1.0' }),
  '.claude-plugin/marketplace.json': JSON.stringify({
    name: 'user-thoughts-marketplace',
    plugins: [{ name: 'user-thoughts', source: './' }],
  }),
};
const tempDirs = [];

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-skill-test-'));
  tempDirs.push(root);
  for (const [relPath, content] of Object.entries(files)) {
    const path = join(root, relPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

function skillMd({ name = 'demo-skill', description = DEFAULT_DESCRIPTION, body = '# Demo\n' } = {}) {
  return `---\nname: ${name}\ndescription: ${description}\n---\n${body}`;
}

function linesOf(count) {
  return `${Array.from({ length: count }, (_, index) => `line ${index}`).join('\n')}\n`;
}

function personaMd(overrides = {}) {
  const fields = { ...PERSONA_DEFAULTS, ...overrides };
  const header = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${header.join('\n')}\n---\nYou are a novice visitor.\n`;
}

function validRepo(extra = {}) {
  return makeRepo({
    'skills/demo-skill/SKILL.md': skillMd(),
    ...MANIFESTS,
    ...extra,
  });
}

function lint(files) {
  return lintRepo(makeRepo(files));
}

function assertHasError(errors, pattern) {
  assert.ok(
    errors.some((error) => pattern.test(error)),
    `expected an error matching ${pattern}, got:\n${errors.join('\n')}`,
  );
}

describe('parseFrontmatter', () => {
  test('returns found false when the file has no frontmatter', () => {
    const result = parseFrontmatter('# Just a heading\n');
    assert.equal(result.found, false);
    assert.deepEqual(result.data, {});
  });

  test('reads quoted values, folded blocks and continuation lines', () => {
    const text = '---\nname: "demo"\ndescription: >\n  Use when\n  testing.\nlabel: \'x\'\n---\nbody\n';
    const result = parseFrontmatter(text);
    assert.equal(result.found, true);
    assert.deepEqual(result.data, { name: 'demo', description: 'Use when testing.', label: 'x' });
    assert.deepEqual(result.problems, []);
  });

  test('reports a line that is not key: value', () => {
    const result = parseFrontmatter('---\nname: demo\nnot a key\n---\n');
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0], /line 3/);
  });

  test('reports a frontmatter block that is never closed', () => {
    const result = parseFrontmatter('---\nname: demo\n');
    assert.equal(result.found, false);
    assert.match(result.problems[0], /not closed/);
  });
});

describe('SKILL.md checks', () => {
  test('a valid skill and valid manifests pass', () => {
    const result = lintRepo(validRepo());
    assert.deepEqual(result.errors, []);
    assert.equal(result.skillCount, 1);
  });

  test('missing frontmatter reports name and description as missing', () => {
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': '# Just a heading\n', ...MANIFESTS });
    assertHasError(errors, /frontmatter is missing/);
    assertHasError(errors, /name is missing/);
    assertHasError(errors, /description is missing/);
  });

  test('name missing', () => {
    const text = '---\ndescription: Use when testing.\n---\n# Demo\n';
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': text, ...MANIFESTS });
    assertHasError(errors, /name is missing/);
  });

  test('name with uppercase letters is rejected', () => {
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': skillMd({ name: 'Demo_skill' }), ...MANIFESTS });
    assertHasError(errors, /only lowercase letters, digits and hyphens/);
  });

  test('name longer than 64 characters is rejected', () => {
    const longName = 'a'.repeat(65);
    const { errors } = lint({ [`skills/${longName}/SKILL.md`]: skillMd({ name: longName }), ...MANIFESTS });
    assertHasError(errors, /at most 64 characters/);
  });

  test('name that differs from the folder is rejected', () => {
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': skillMd({ name: 'other-skill' }), ...MANIFESTS });
    assertHasError(errors, /does not match folder "demo-skill"/);
  });

  test('description missing', () => {
    const text = '---\nname: demo-skill\n---\n# Demo\n';
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': text, ...MANIFESTS });
    assertHasError(errors, /description is missing/);
  });

  test('description longer than 1024 characters is rejected', () => {
    const description = `Use when ${'x'.repeat(1030)}`;
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': skillMd({ description }), ...MANIFESTS });
    assertHasError(errors, /at most 1024 characters/);
  });

  test('description that does not start with "Use when" is rejected', () => {
    const { errors } = lint({
      'skills/demo-skill/SKILL.md': skillMd({ description: 'Helps with personas.' }),
      ...MANIFESTS,
    });
    assertHasError(errors, /start with "Use when"/);
  });

  test('300 lines pass and 301 lines fail', () => {
    // The frontmatter block is 4 lines, so 296 body lines make 300 in total.
    const atLimit = validRepo({ 'skills/demo-skill/SKILL.md': skillMd({ body: linesOf(296) }) });
    assert.deepEqual(lintRepo(atLimit).errors, []);

    const overLimit = validRepo({ 'skills/demo-skill/SKILL.md': skillMd({ body: linesOf(297) }) });
    assertHasError(lintRepo(overLimit).errors, /has 301 lines, the limit is 300/);
  });

  test('a referenced path that does not exist is an error', () => {
    const body = '# Demo\nSee references/guide.md and run ./scripts/run.mjs.\n';
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': skillMd({ body }), ...MANIFESTS });
    assertHasError(errors, /references\/guide\.md is referenced but does not exist/);
    assertHasError(errors, /scripts\/run\.mjs is referenced but does not exist/);
  });

  test('referenced paths that exist pass, including the ./ form', () => {
    const body = '# Demo\nSee references/guide.md and run ./scripts/run.mjs.\n';
    const result = lintRepo(
      validRepo({
        'skills/demo-skill/SKILL.md': skillMd({ body }),
        'skills/demo-skill/references/guide.md': 'guide',
        'skills/demo-skill/scripts/run.mjs': 'export {};',
      }),
    );
    assert.deepEqual(result.errors, []);
  });

  test('a skill folder without SKILL.md is an error', () => {
    const { errors } = lint({ 'skills/demo-skill/README.txt': 'hi', ...MANIFESTS });
    assertHasError(errors, /SKILL\.md is missing/);
  });
});

describe('persona files', () => {
  test('a complete persona file passes', () => {
    const result = lintRepo(validRepo({ 'skills/demo-skill/assets/personas/novice.md': personaMd() }));
    assert.deepEqual(result.errors, []);
  });

  test('missing frontmatter keys are listed', () => {
    const files = { 'skills/demo-skill/assets/personas/novice.md': personaMd({ evidence: undefined, viewport: undefined }) };
    assertHasError(lintRepo(validRepo(files)).errors, /missing frontmatter keys: evidence, viewport/);
  });

  test('a persona file with no frontmatter is an error', () => {
    const files = { 'skills/demo-skill/assets/personas/novice.md': 'Just a persona.\n' };
    assertHasError(lintRepo(validRepo(files)).errors, /frontmatter is missing/);
  });

  test('id that differs from the file name is an error', () => {
    const files = { 'skills/demo-skill/assets/personas/novice.md': personaMd({ id: 'explorer' }) };
    assertHasError(lintRepo(validRepo(files)).errors, /id "explorer" must match file name/);
  });

  test('numeric keys that are zero or not integers are errors', () => {
    const files = {
      'skills/demo-skill/assets/personas/novice.md': personaMd({ max_steps: '0', no_progress_limit: 'abc' }),
    };
    const { errors } = lintRepo(validRepo(files));
    assertHasError(errors, /max_steps must be a positive integer/);
    assertHasError(errors, /no_progress_limit must be a positive integer/);
  });
});

describe('plugin manifests', () => {
  test('plugin.json missing', () => {
    const files = { ...MANIFESTS, 'skills/demo-skill/SKILL.md': skillMd() };
    delete files['.claude-plugin/plugin.json'];
    assertHasError(lintRepo(makeRepo(files)).errors, /\.claude-plugin\/plugin\.json is missing/);
  });

  test('marketplace.json missing', () => {
    const files = { ...MANIFESTS, 'skills/demo-skill/SKILL.md': skillMd() };
    delete files['.claude-plugin/marketplace.json'];
    assertHasError(lintRepo(makeRepo(files)).errors, /\.claude-plugin\/marketplace\.json is missing/);
  });

  test('invalid JSON in a manifest is an error', () => {
    const files = {
      'skills/demo-skill/SKILL.md': skillMd(),
      '.claude-plugin/plugin.json': '{nope',
      '.claude-plugin/marketplace.json': MANIFESTS['.claude-plugin/marketplace.json'],
    };
    assertHasError(lintRepo(makeRepo(files)).errors, /plugin\.json is not valid JSON/);
  });

  test('a manifest that is not a JSON object is an error', () => {
    const files = {
      'skills/demo-skill/SKILL.md': skillMd(),
      '.claude-plugin/plugin.json': '[]',
      '.claude-plugin/marketplace.json': MANIFESTS['.claude-plugin/marketplace.json'],
    };
    assertHasError(lintRepo(makeRepo(files)).errors, /plugin\.json must be a JSON object/);
  });

  test('a plugin name with a reserved prefix is an error', () => {
    for (const prefix of ['claude-', 'anthropic-', 'anthropics-', 'cc-plugin-']) {
      const name = `${prefix}helper`;
      const files = {
        'skills/demo-skill/SKILL.md': skillMd(),
        '.claude-plugin/plugin.json': JSON.stringify({ name }),
        '.claude-plugin/marketplace.json': JSON.stringify({ name: 'market', plugins: [{ name }] }),
      };
      assertHasError(lintRepo(makeRepo(files)).errors, /reserved prefix/);
    }
  });

  test('plugin names that differ between the two files are an error', () => {
    const files = {
      'skills/demo-skill/SKILL.md': skillMd(),
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'user-thoughts' }),
      '.claude-plugin/marketplace.json': JSON.stringify({ name: 'market', plugins: [{ name: 'other-plugin' }] }),
    };
    assertHasError(lintRepo(makeRepo(files)).errors, /differs between/);
  });

  test('a plugin.json without a name is an error', () => {
    const files = {
      'skills/demo-skill/SKILL.md': skillMd(),
      '.claude-plugin/plugin.json': JSON.stringify({ version: '0.1.0' }),
      '.claude-plugin/marketplace.json': MANIFESTS['.claude-plugin/marketplace.json'],
    };
    assertHasError(lintRepo(makeRepo(files)).errors, /plugin\.json: name is missing/);
  });

  test('a marketplace without plugins uses its top-level name for the comparison', () => {
    const files = {
      'skills/demo-skill/SKILL.md': skillMd(),
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'user-thoughts' }),
      '.claude-plugin/marketplace.json': JSON.stringify({ name: 'user-thoughts' }),
    };
    assert.deepEqual(lintRepo(makeRepo(files)).errors, []);
  });
});

describe('checkBriefLeak', () => {
  test('the shipped person brief gives the walker the card facts, about and cares, and still passes the leak check', () => {
    const text = readFileSync(SHIPPED_BRIEFS, 'utf8');
    const start = text.indexOf(`${FENCE}text`, text.indexOf('## Person brief'));
    const block = text.slice(start, text.indexOf(`\n${FENCE}`, start + FENCE.length));
    for (const field of ['facts', 'about', 'cares']) assert.ok(block.includes(`{{${field}}}`), field);
    assert.ok(!block.includes('why_chosen'));
    assert.deepEqual(checkBriefLeak(text), []);
  });

  test('checkBriefLeak flags a person brief that mentions the vision', () => {
    assert.equal(checkBriefLeak('## Person brief\n```text\nVision: {{vision}}\n```').length, 1);
  });

  test('checkBriefLeak flags a person brief that names decisions.md', () => {
    assert.equal(checkBriefLeak(personBrief(['Site: {{url}}', 'Notes: decisions.md'])).length, 1);
  });

  test('flags every leak word inside the person brief block, in any case', () => {
    for (const line of ['Goal: {{願景}}', 'Claims: builder-claims.md', 'ASSUMPTION: users love it', '假設：大家都喜歡']) {
      const errors = checkBriefLeak(personBrief(['Site: {{url}}', line]));
      assert.equal(errors.length, 1, `expected one error for ${line}`);
    }
  });

  test('reports one error per leaking line, with its line number in the file', () => {
    const errors = checkBriefLeak(personBrief(['Vision: {{vision}}', 'Site: {{url}}', 'Assumption: {{claims}}']));
    assert.equal(errors.length, 2);
    assert.match(errors[0], /line 3/);
    assert.match(errors[1], /line 5/);
  });

  test('a clean person brief passes', () => {
    assert.deepEqual(checkBriefLeak(personBrief(['Site: {{url}}', 'Your arrival: {{arrival}}'])), []);
  });

  test('mentions outside the person brief block are allowed', () => {
    const text = [
      '# Briefs',
      'Never pass the vision to anyone.',
      '## Person brief',
      'Keep the vision and the assumption out of this block.',
      `${FENCE}text`,
      'Site: {{url}}',
      FENCE,
      '## judgements.json',
      `${FENCE}json`,
      '{"assumptions": [], "conflicts": [{"vision_note": ""}]}',
      FENCE,
    ].join('\n');
    assert.deepEqual(checkBriefLeak(text), []);
  });

  test('a heading inside a code fence does not end the section', () => {
    const errors = checkBriefLeak(personBrief(['## not a heading', 'Vision: {{vision}}']));
    assert.equal(errors.length, 1);
  });

  test('a block after the next section heading is not part of the person brief', () => {
    const text = `${personBrief(['Site: {{url}}'])}## Verifier brief\n${FENCE}text\nvision\n${FENCE}\n`;
    assert.deepEqual(checkBriefLeak(text), []);
  });

  test('checkBriefLeak also checks the reader brief', () => {
    const text = `${personBrief(['Site: {{url}}'])}\n## Reader brief\n${FENCE}text\nVision: {{vision}}\n${FENCE}\n`;
    assert.equal(checkBriefLeak(text).length, 1);
  });

  test('the shipped reader brief exists and every depth runs the reader', () => {
    const read = (rel) => readFileSync(new URL(`../skills/launch/${rel}`, import.meta.url), 'utf8');
    assert.match(read('references/briefs.md'), /^## Reader brief$/m);
    assert.match(read('SKILL.md'), /\| quick \| 3 \| 8 \| content reader \|/);
    assert.match(read('SKILL.md'), /`references\/content-reader\.md`/);
  });

  test('a missing person brief section is an error', () => {
    const errors = checkBriefLeak('# Briefs\n## Verifier brief\n```text\nSite: {{url}}\n```\n');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Person brief/);
  });

  test('a person brief without a fenced block is an error', () => {
    const errors = checkBriefLeak('## Person brief\nSite: {{url}}\n## Verifier brief\n');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /fenced/);
  });

  test('the shipped briefs.md passes checkBriefLeak', () => {
    assert.deepEqual(checkBriefLeak(readFileSync(SHIPPED_BRIEFS, 'utf8')), []);
  });
});

describe('lintRepo and briefs.md', () => {
  const briefsSkill = skillMd({ body: '# Demo\nFill each brief from `references/briefs.md`.\n' });

  test('lintRepo fails when SKILL.md references a missing file', () => {
    const { errors } = lint({ 'skills/demo-skill/SKILL.md': briefsSkill, ...MANIFESTS });
    assertHasError(errors, /references\/briefs\.md is referenced but does not exist/);
  });

  test('lintRepo reports a person brief that leaks the vision', () => {
    const root = validRepo({
      'skills/demo-skill/SKILL.md': briefsSkill,
      'skills/demo-skill/references/briefs.md': personBrief(['Vision: {{vision}}']),
    });
    assertHasError(lintRepo(root).errors, /skills\/demo-skill\/references\/briefs\.md: .*vision/i);
  });

  test('lintRepo passes a skill whose briefs.md keeps the person brief clean', () => {
    const root = validRepo({
      'skills/demo-skill/SKILL.md': briefsSkill,
      'skills/demo-skill/references/briefs.md': personBrief(['Site: {{url}}']),
    });
    assert.deepEqual(lintRepo(root).errors, []);
  });

  test('the launch skill references references/briefs.md and the repo lints clean', () => {
    assert.ok(referencedPaths(readFileSync(SHIPPED_SKILL, 'utf8')).includes('references/briefs.md'));
    assert.deepEqual(lintRepo(REPO_ROOT).errors, []);
  });
});

describe('lintRepo', () => {
  test('a repo with no skills folder checks manifests only', () => {
    const result = lintRepo(makeRepo({ ...MANIFESTS }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.skillCount, 0);
  });
});

describe('main', () => {
  test('prints lint ok with the skill count and returns 0', () => {
    const out = [];
    const err = [];
    const code = main(validRepo(), {
      out: { write: (text) => out.push(text) },
      err: { write: (text) => err.push(text) },
    });
    assert.equal(code, 0);
    assert.match(out.join(''), /lint ok \(1 skill checked\)/);
    assert.equal(err.join(''), '');
  });

  test('lists every error on stderr and returns 1', () => {
    const out = [];
    const err = [];
    const root = makeRepo({ 'skills/demo-skill/SKILL.md': '# Heading only\n' });
    const code = main(root, {
      out: { write: (text) => out.push(text) },
      err: { write: (text) => err.push(text) },
    });
    assert.equal(code, 1);
    assert.match(err.join(''), /name is missing/);
    assert.match(err.join(''), /plugin\.json is missing/);
    assert.equal(out.join(''), '');
  });

  test('runs directly from the command line from the repo root', () => {
    const root = validRepo();
    const run = spawnSync(process.execPath, [SCRIPT_PATH], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /lint ok/);
  });
});

test('low-stakes is a short walk and is in the standard bases', () => {
  const read = (rel) => readFileSync(new URL(`../skills/launch/${rel}`, import.meta.url), 'utf8');
  const persona = read('assets/personas/low-stakes.md');
  assert.deepEqual(checkPersonaFile('low-stakes.md', persona), []);
  assert.match(persona, /^max_steps: 5$/m);
  assert.match(persona, /^no_progress_limit: 1$/m);
  const skill = read('SKILL.md');
  assert.match(skill, /\| standard \| 6 \|/);
  assert.match(skill, /\| full \| 9 \|/);
  assert.match(skill, /\| standard \| the quick three, plus `novice`, `explorer`, `low-stakes` \|/);
  assert.match(skill, /\| full \| the standard six, plus /);
});
