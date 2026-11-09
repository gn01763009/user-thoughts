#!/usr/bin/env node
// Fills evals/headless-settings.template.json with a resolved skill directory.
// Usage: node evals/make-settings.mjs <absolute path ending in skills/launch> <outFile>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(HERE, 'headless-settings.template.json');
const PLACEHOLDER = '{{SKILL_DIR}}';
const FORBIDDEN_CHARS = /[*?()\n\r]/;
const REQUIRED_SUFFIX = '/skills/launch';

export class UsageError extends Error {}

function normalizeSkillDir(skillDir) {
  if (typeof skillDir !== 'string' || !isAbsolute(skillDir)) throw new UsageError('skillDir must be an absolute path');
  if (FORBIDDEN_CHARS.test(skillDir)) throw new UsageError('skillDir must not contain * ? ( ) or a newline');
  const trimmed = skillDir.length > 1 ? skillDir.replace(/\/+$/, '') : skillDir;
  if (trimmed.split('/').includes('..')) throw new UsageError('skillDir must not contain ".." segments');
  if (!trimmed.endsWith(REQUIRED_SUFFIX)) throw new UsageError(`skillDir must end in ${REQUIRED_SUFFIX.slice(1)}`);
  return trimmed;
}

export function makeSettings(template, skillDir) {
  const dir = normalizeSkillDir(skillDir);
  const fill = (text) => text.split(PLACEHOLDER).join(dir);
  const allow = template.permissions.allow.map(fill);
  return { ...template, permissions: { ...template.permissions, allow } };
}

function main(argv) {
  if (argv.length !== 2) throw new UsageError('usage: node evals/make-settings.mjs <skillDir> <outFile>');
  const template = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8'));
  const settings = makeSettings(template, argv[0]);
  writeFileSync(argv[1], `${JSON.stringify(settings, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}
