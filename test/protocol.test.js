import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FILE_EXPORT_ERRORS,
  MAX_FILE_EXPORT_BYTES,
  filterPrinters,
  tokenMatches,
  validateFileExportTask,
} from '../src/protocol.js';

describe('filterPrinters', () => {
  it('returns an empty list for missing printer lists', () => {
    assert.deepEqual(filterPrinters(undefined, false), []);
    assert.deepEqual(filterPrinters(null, true), []);
  });

  it('keeps only default printers when requested and available', () => {
    const printers = [
      { name: 'A', isDefault: false },
      { name: 'B', isDefault: true },
    ];
    assert.deepEqual(filterPrinters(printers, false), printers);
    assert.deepEqual(filterPrinters(printers, true), [
      { name: 'B', isDefault: true },
    ]);
  });

  it('falls back to the full list when no default printer is marked', () => {
    const printers = [{ name: 'A' }];
    assert.deepEqual(filterPrinters(printers, true), printers);
  });
});

describe('tokenMatches', () => {
  it('matches exact tokens and preserves wildcard semantics', () => {
    assert.equal(tokenMatches('hiprint', 'hiprint'), true);
    assert.equal(tokenMatches('hiprint', 'hiprint-extra'), false);
    assert.equal(tokenMatches('hiprint*', 'hiprint-office'), true);
    assert.equal(tokenMatches('hiprint*', 'hiprint'), false);
    assert.equal(tokenMatches('hiprint*', 'hiprint office'), false);
  });

  it('treats regex metacharacters in configured tokens as literals', () => {
    assert.equal(tokenMatches('hiprint.123', 'hiprint.123'), true);
    assert.equal(tokenMatches('hiprint.123', 'hiprintX123'), false);
    assert.equal(tokenMatches('hiprint+$', 'hiprint+$'), true);
    assert.equal(tokenMatches('hiprint+$', 'hiprinttt'), false);
  });

  it('rejects missing or unreasonably large tokens', () => {
    assert.equal(tokenMatches('', 'anything'), false);
    assert.equal(tokenMatches('hiprint', undefined), false);
    assert.equal(tokenMatches('hiprint', 'x'.repeat(257)), false);
    assert.equal(tokenMatches('x'.repeat(257), 'x'.repeat(257)), false);
  });
});

describe('validateFileExportTask', () => {
  it('accepts valid base64 payloads within the configured limit', () => {
    assert.deepEqual(
      validateFileExportTask({
        size: 5,
        payload: Buffer.from('hello').toString('base64'),
      }),
      { ok: true, declaredBytes: 5, actualBytes: 5 },
    );
  });

  it('rejects payloads whose actual decoded bytes exceed the limit', () => {
    const payload = Buffer.alloc(MAX_FILE_EXPORT_BYTES + 1).toString('base64');
    assert.deepEqual(validateFileExportTask({ size: 1, payload }), {
      ok: false,
      code: FILE_EXPORT_ERRORS.FILE_TOO_LARGE,
      message: 'File export task is too large.',
      declaredBytes: 1,
      actualBytes: MAX_FILE_EXPORT_BYTES + 1,
    });
  });

  it('rejects declared and actual size mismatches', () => {
    assert.deepEqual(
      validateFileExportTask({
        size: 1,
        payload: Buffer.from('hello').toString('base64'),
      }),
      {
        ok: false,
        code: FILE_EXPORT_ERRORS.FILE_SIZE_MISMATCH,
        message: 'Declared file export size does not match payload size.',
        declaredBytes: 1,
        actualBytes: 5,
      },
    );
  });

  it('rejects invalid base64 payloads', () => {
    assert.deepEqual(validateFileExportTask({ payload: 'not base64!' }), {
      ok: false,
      code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
      message: 'File export payload must be valid base64.',
      declaredBytes: undefined,
      actualBytes: undefined,
    });
    assert.deepEqual(
      validateFileExportTask({ size: 11, payload: 'not base64!' }),
      {
        ok: false,
        code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
        message: 'File export payload must be valid base64.',
        declaredBytes: 11,
        actualBytes: undefined,
      },
    );
  });

  it('rejects missing payload or declared size', () => {
    assert.deepEqual(
      validateFileExportTask({
        payload: Buffer.from('hello').toString('base64'),
      }),
      {
        ok: false,
        code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
        message: 'File export payload and size are required.',
        declaredBytes: undefined,
        actualBytes: 5,
      },
    );
    assert.deepEqual(validateFileExportTask({ size: 5 }), {
      ok: false,
      code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
      message: 'File export payload and size are required.',
      declaredBytes: 5,
      actualBytes: undefined,
    });
  });
});
