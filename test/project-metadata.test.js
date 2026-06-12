import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

async function readJson(relativePath) {
  const contents = await readFile(path.join(rootDir, relativePath), 'utf8');
  return JSON.parse(contents);
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
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
    assert.ok(pkg.scripts['check:docker']);
    await fileExists('init.js');
    await fileExists('package-lock.json');
  });

  it('keeps Codex workflow standard files present', async () => {
    await Promise.all([
      fileExists('PLANS.md'),
      fileExists('docs/runbook/STATUS.md'),
      fileExists('scripts/run-all.sh'),
      fileExists('scripts/docker-smoke.js'),
      fileExists('scripts/docker-smoke.sh'),
      fileExists('scripts/codex/noninteractive-exec.sh'),
    ]);
  });

  it('keeps Docker smoke wired into local and CI gates', async () => {
    const runAll = await readText('scripts/run-all.sh');
    const ci = await readText('.github/workflows/ci.yml');
    const gitlabCi = await readText('.gitlab-ci.yml');
    assert.match(runAll, /npm run check:docker/);
    assert.match(ci, /npm run check:docker/);
    assert.match(gitlabCi, /npm run verify/);
    assert.match(gitlabCi, /docker build/);
    assert.match(gitlabCi, /docker save/);
    assert.match(gitlabCi, /CI_REGISTRY_IMAGE/);
  });
});
