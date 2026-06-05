import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

async function readJson(relativePath) {
  const contents = await readFile(path.join(rootDir, relativePath), 'utf8');
  return JSON.parse(contents);
}

async function fileExists(relativePath) {
  await access(path.join(rootDir, relativePath));
}

describe('project metadata', () => {
  it('keeps npm entrypoints and dependency locking auditable', async () => {
    const pkg = await readJson('package.json');
    assert.match(pkg.scripts.init, /node \.\/init\.js/);
    assert.ok(pkg.scripts.test);
    assert.ok(pkg.scripts.build);
    assert.ok(pkg.scripts.verify);
    await fileExists('init.js');
    await fileExists('package-lock.json');
  });

  it('keeps Codex workflow standard files present', async () => {
    await Promise.all([
      fileExists('PLANS.md'),
      fileExists('docs/runbook/STATUS.md'),
      fileExists('scripts/run-all.sh'),
      fileExists('scripts/codex/noninteractive-exec.sh'),
    ]);
  });
});
