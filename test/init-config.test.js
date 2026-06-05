import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildInitConfig,
  isValidPortInput,
  isValidTokenInput,
  parsePortAnswer,
  parseTokenAnswer,
  validatePortInput,
  validateTokenInput,
} from '../src/init-config.js';

const fakeI18n = {
  __(message, replacement) {
    if (replacement) return message.replace('%s', replacement);
    return message;
  },
};

describe('init config helpers', () => {
  it('validates port input before writing config', () => {
    assert.equal(isValidPortInput(''), true);
    assert.equal(isValidPortInput('17521'), true);
    assert.equal(isValidPortInput('9999'), false);
    assert.equal(isValidPortInput('65536'), false);
    assert.equal(isValidPortInput('abc'), false);
    assert.equal(
      validatePortInput('abc', fakeI18n),
      'Port must be set between 10000 and 65535',
    );
  });

  it('parses empty port input to the default port', () => {
    assert.equal(parsePortAnswer(''), 17521);
    assert.equal(parsePortAnswer('17522'), 17522);
  });

  it('validates token input before writing config', () => {
    assert.equal(isValidTokenInput(''), true);
    assert.equal(isValidTokenInput('abcdef'), true);
    assert.equal(isValidTokenInput('abc'), false);
    assert.equal(
      validateTokenInput('abc', fakeI18n),
      'For security reasons, the TOKEN length must be greater than 5',
    );
  });

  it('builds normalized init config from prompt answers', () => {
    assert.deepEqual(
      buildInitConfig({
        lang: 'zh',
        port: '',
        token: '',
        useSSL: true,
      }),
      {
        lang: 'zh',
        port: 17521,
        token: 'vue-plugin-hiprint',
        useSSL: true,
      },
    );
  });
});
