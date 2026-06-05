import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeConfig } from '../src/config.js';

describe('normalizeConfig', () => {
  it('keeps valid config values and coerces booleans', () => {
    assert.deepEqual(
      normalizeConfig({
        port: '17522',
        token: 'hiprint-token',
        useSSL: 1,
        lang: 'zh',
        defaultPrinterOnly: 'yes',
      }),
      {
        port: 17522,
        token: 'hiprint-token',
        useSSL: true,
        lang: 'zh',
        defaultPrinterOnly: true,
      },
    );
  });

  it('falls back from invalid ports, tokens, and locales', () => {
    assert.deepEqual(
      normalizeConfig({
        port: '999',
        token: '',
        useSSL: false,
        lang: 'fr',
      }),
      {
        port: 17521,
        token: 'vue-plugin-hiprint',
        useSSL: false,
        lang: 'en',
        defaultPrinterOnly: false,
      },
    );
  });
});
