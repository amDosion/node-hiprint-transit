import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

async function withTempConfig(run) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'hiprint-init-'));
  const configPath = path.join(tempDir, 'config.json');
  try {
    return await run(configPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function readConfig(configPath) {
  return JSON.parse(await readFile(configPath, 'utf8'));
}

describe('init script', () => {
  it('writes default config in explicit defaults mode', async () => {
    await withTempConfig(async (configPath) => {
      const result = spawnSync(process.execPath, ['init.js', '--defaults'], {
        cwd: rootDir,
        env: { ...process.env, HIPRINT_CONFIG_PATH: configPath },
        encoding: 'utf8',
      });

      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(await readConfig(configPath), {
        port: 17521,
        token: 'vue-plugin-hiprint',
        useSSL: false,
        lang: 'en',
        defaultPrinterOnly: false,
      });
    });
  });

  it('does not prompt when stdin is non-interactive', async () => {
    await withTempConfig(async (configPath) => {
      const result = spawnSync(process.execPath, ['init.js'], {
        cwd: rootDir,
        env: { ...process.env, HIPRINT_CONFIG_PATH: configPath },
        input: '\n\n\n\n',
        encoding: 'utf8',
      });

      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(await readConfig(configPath), {
        port: 17521,
        token: 'vue-plugin-hiprint',
        useSSL: false,
        lang: 'en',
        defaultPrinterOnly: false,
      });
    });
  });
});
