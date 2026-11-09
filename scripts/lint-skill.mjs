#!/usr/bin/env node
// Lints skills/*/SKILL.md, skills/*/assets/personas/*.md, skills/*/references/briefs.md and the plugin manifests.
// Usage: node scripts/lint-skill.mjs (run from the repo root)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS_DIR = 'skills';
const SKILL_FILE = 'SKILL.md';
const PERSONA_DIR = 'assets/personas';
const PLUGIN_MANIFEST = '.claude-plugin/plugin.json';
const MARKETPLACE_MANIFEST = '.claude-plugin/marketplace.json';
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_SKILL_LINES = 300;
const DESCRIPTION_PREFIX = 'Use when';
const FRONTMATTER_FENCE = '---';
const NAME_PATTERN = /^[a-z0-9-]+$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const FRONTMATTER_LINE = /^([A-Za-z_][\w-]*):\s*(.*)$/;
const BLOCK_SCALAR_INDICATOR = /^[>|][+-]?$/;
const REFERENCE_PATTERN = /(?<![\w./-])(?:\.\/)?((?:references|assets|scripts)\/[\w./-]*)/g;
const TRAILING_DOTS = /\.+$/;
const RESERVED_PREFIXES = ['claude-', 'anthropic-', 'anthropics-', 'cc-plugin-'];
const PERSONA_KEYS = ['id', 'label', 'evidence', 'viewport', 'max_steps', 'no_progress_limit', 'leave_urge_limit'];
const PERSONA_NUMERIC_KEYS = ['max_steps', 'no_progress_limit', 'leave_urge_limit'];
const BOM = /^﻿/;
const BRIEFS_FILE = 'references/briefs.md';
const PERSON_BRIEF_HEADING = /^##\s+Person brief\s*$/i;
const SECTION_HEADING = /^#{1,2}\s/;
const CODE_FENCE = /^\s*(```|~~~)/;
const BRIEF_LEAK = /vision|願景|builder-claims|assumption|假設|decisions\.md/i;

// ---------- frontmatter ----------

function unquote(value) {
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}

function appendText(current, next) {
  return current ? `${current} ${next}` : next;
}

// Hand-written reader for flat "key: value" frontmatter with folded continuation lines.
function readFrontmatterLines(lines) {
  const data = {};
  const problems = [];
  let lastKey = null;
  lines.forEach((raw, index) => {
    const lineNumber = index + 2;
    if (/^\s/.test(raw) && lastKey !== null) {
      data[lastKey] = appendText(data[lastKey], raw.trim());
      return;
    }
    const match = FRONTMATTER_LINE.exec(raw);
    if (!match) {
      if (raw.trim() !== '') problems.push(`frontmatter line ${lineNumber} is not "key: value"`);
      return;
    }
    const [, key, rawValue] = match;
    data[key] = BLOCK_SCALAR_INDICATOR.test(rawValue) ? '' : unquote(rawValue);
    lastKey = key;
  });
  return { found: true, data, problems };
}

export function parseFrontmatter(text) {
  const lines = text.replace(BOM, '').split(/\r?\n/);
  if (lines[0] !== FRONTMATTER_FENCE) return { found: false, data: {}, problems: [] };
  const end = lines.indexOf(FRONTMATTER_FENCE, 1);
  if (end === -1) {
    return { found: false, data: {}, problems: ['frontmatter is not closed with ---'] };
  }
  return readFrontmatterLines(lines.slice(1, end));
}

// ---------- SKILL.md rules ----------

export function checkName(name, folder) {
  if (name === undefined || name === '') return ['name is missing'];
  const errors = [];
  if (!NAME_PATTERN.test(name)) errors.push('name must use only lowercase letters, digits and hyphens');
  if (name.length > MAX_NAME_LENGTH) errors.push(`name must be at most ${MAX_NAME_LENGTH} characters`);
  if (name !== folder) errors.push(`name "${name}" does not match folder "${folder}"`);
  return errors;
}

export function checkDescription(description) {
  if (description === undefined || description === '') return ['description is missing'];
  const errors = [];
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  if (!description.startsWith(DESCRIPTION_PREFIX)) {
    errors.push(`description must start with "${DESCRIPTION_PREFIX}"`);
  }
  return errors;
}

function countLines(text) {
  const parts = text.split('\n');
  return text.endsWith('\n') ? parts.length - 1 : parts.length;
}

export function checkLineCount(text) {
  const lines = countLines(text);
  return lines > MAX_SKILL_LINES ? [`has ${lines} lines, the limit is ${MAX_SKILL_LINES}`] : [];
}

export function referencedPaths(text) {
  const matches = [...text.matchAll(REFERENCE_PATTERN)].map((match) => match[1].replace(TRAILING_DOTS, ''));
  return [...new Set(matches)];
}

export function checkReferences(text, skillDir) {
  return referencedPaths(text)
    .filter((relPath) => !existsSync(join(skillDir, relPath)))
    .map((relPath) => `${relPath} is referenced but does not exist`);
}

function checkFrontmatter(text, folder) {
  const { found, data, problems } = parseFrontmatter(text);
  const errors = found ? [] : ['frontmatter is missing'];
  return [
    ...errors,
    ...problems,
    ...checkName(data.name, folder),
    ...checkDescription(data.description),
  ];
}

function checkSkillMd(text, folder, skillDir) {
  return [
    ...checkFrontmatter(text, folder),
    ...checkLineCount(text),
    ...checkReferences(text, skillDir),
  ];
}

// ---------- persona files ----------

export function checkPersonaFile(fileName, text) {
  const { found, data, problems } = parseFrontmatter(text);
  if (!found) return ['frontmatter is missing'];
  const errors = [...problems];
  const missing = PERSONA_KEYS.filter((key) => data[key] === undefined || data[key] === '');
  if (missing.length > 0) errors.push(`missing frontmatter keys: ${missing.join(', ')}`);
  if (data.id !== undefined && data.id !== basename(fileName, '.md')) {
    errors.push(`id "${data.id}" must match file name`);
  }
  for (const key of PERSONA_NUMERIC_KEYS) {
    if (data[key] !== undefined && !POSITIVE_INTEGER.test(data[key])) {
      errors.push(`${key} must be a positive integer`);
    }
  }
  return errors;
}

function checkPersonas(skillDir, skillRel) {
  const dir = join(skillDir, PERSONA_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .flatMap((file) => {
      const text = readFileSync(join(dir, file), 'utf8');
      return checkPersonaFile(file, text).map((error) => `${skillRel}/${PERSONA_DIR}/${file}: ${error}`);
    });
}

// ---------- briefs.md ----------

// Lines of the "## Person brief" section that sit inside code fences, with 1-based line numbers.
// Headings inside a fence do not end the section. Returns null when the section is absent.
function personBriefBlockLines(text) {
  const lines = text.replace(BOM, '').split(/\r?\n/);
  const start = lines.findIndex((line) => PERSON_BRIEF_HEADING.test(line));
  if (start === -1) return null;
  const fenced = [];
  let inFence = false;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (CODE_FENCE.test(line)) {
      inFence = !inFence;
    } else if (inFence) {
      fenced.push({ number: index + 1, line });
    } else if (SECTION_HEADING.test(line)) {
      break;
    }
  }
  return fenced;
}

// The person brief goes to every simulated visitor, so the builder's vision and hidden assumption must never be in it.
export function checkBriefLeak(briefsText) {
  const fenced = personBriefBlockLines(briefsText);
  if (fenced === null) return ['has no "## Person brief" section to check'];
  if (fenced.length === 0) return ['the "## Person brief" section has no fenced code block to check'];
  return fenced.flatMap(({ number, line }) => {
    const match = BRIEF_LEAK.exec(line);
    return match ? [`Person brief line ${number} mentions "${match[0]}"`] : [];
  });
}

// ---------- plugin manifests ----------

function parseJson(text) {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error.message };
  }
}

function readManifest(root, relPath) {
  const path = join(root, relPath);
  if (!existsSync(path)) return { value: null, errors: [`${relPath} is missing`] };
  const parsed = parseJson(readFileSync(path, 'utf8'));
  if (parsed.error !== undefined) {
    return { value: null, errors: [`${relPath} is not valid JSON: ${parsed.error}`] };
  }
  if (parsed.value === null || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return { value: null, errors: [`${relPath} must be a JSON object`] };
  }
  return { value: parsed.value, errors: [] };
}

// Plugin names listed by the marketplace, or its top-level name when it lists no plugins.
function marketplaceNames(market) {
  if (Array.isArray(market.plugins)) return market.plugins.map((plugin) => plugin?.name);
  return [market.name];
}

function reservedNameErrors(names) {
  return names
    .filter((name) => typeof name === 'string' && RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .map((name) => `plugin name "${name}" starts with a reserved prefix (${RESERVED_PREFIXES.join(', ')})`);
}

function crossManifestErrors(plugin, market) {
  if (typeof plugin.name !== 'string' || plugin.name === '') return [`${PLUGIN_MANIFEST}: name is missing`];
  const listed = marketplaceNames(market);
  const errors = reservedNameErrors([plugin.name, ...listed]);
  if (listed.length > 0 && !listed.includes(plugin.name)) {
    errors.push(`plugin name "${plugin.name}" differs between ${PLUGIN_MANIFEST} and ${MARKETPLACE_MANIFEST}`);
  }
  return errors;
}

export function checkManifests(root) {
  const plugin = readManifest(root, PLUGIN_MANIFEST);
  const market = readManifest(root, MARKETPLACE_MANIFEST);
  const shared = plugin.value !== null && market.value !== null ? crossManifestErrors(plugin.value, market.value) : [];
  return [...plugin.errors, ...market.errors, ...shared];
}

// ---------- repo ----------

function listSkillNames(root) {
  const dir = join(root, SKILLS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function checkSkill(root, name) {
  const skillDir = join(root, SKILLS_DIR, name);
  const relPath = `${SKILLS_DIR}/${name}/${SKILL_FILE}`;
  const skillFile = join(skillDir, SKILL_FILE);
  if (!existsSync(skillFile)) return [`${SKILLS_DIR}/${name}: ${SKILL_FILE} is missing`];
  const text = readFileSync(skillFile, 'utf8');
  return [
    ...checkSkillMd(text, name, skillDir).map((error) => `${relPath}: ${error}`),
    ...checkPersonas(skillDir, `${SKILLS_DIR}/${name}`),
    ...checkBriefsFile(skillDir, `${SKILLS_DIR}/${name}`),
  ];
}

function checkBriefsFile(skillDir, skillRel) {
  const path = join(skillDir, BRIEFS_FILE);
  if (!existsSync(path)) return [];
  return checkBriefLeak(readFileSync(path, 'utf8')).map((error) => `${skillRel}/${BRIEFS_FILE}: ${error}`);
}

export function lintRepo(root) {
  const skills = listSkillNames(root);
  const skillErrors = skills.flatMap((name) => checkSkill(root, name));
  return { errors: [...skillErrors, ...checkManifests(root)], skillCount: skills.length };
}

export function main(root = process.cwd(), io = { out: process.stdout, err: process.stderr }) {
  const { errors, skillCount } = lintRepo(root);
  if (errors.length === 0) {
    const noun = skillCount === 1 ? 'skill' : 'skills';
    io.out.write(`lint ok (${skillCount} ${noun} checked)\n`);
    return 0;
  }
  const list = errors.map((error) => `  - ${error}`).join('\n');
  io.err.write(`lint failed with ${errors.length} error(s):\n${list}\n`);
  return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
