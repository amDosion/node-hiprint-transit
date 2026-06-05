import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { windowsPathToWslPath } from '../scripts/docker-smoke.js';

describe('docker smoke wrapper', () => {
  it('translates Windows workspace paths to WSL mount paths', () => {
    assert.equal(
      windowsPathToWslPath('E:\\Source_code\\node-hiprint-transit'),
      '/mnt/e/Source_code/node-hiprint-transit',
    );
  });
});
