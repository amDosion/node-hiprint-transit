export const MAX_TOKEN_LENGTH = 256;
export const MAX_FILE_EXPORT_BYTES = 50 * 1024 * 1024;

export const FILE_EXPORT_ERRORS = Object.freeze({
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_SIZE_MISMATCH: 'FILE_SIZE_MISMATCH',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
});

export function filterPrinters(printerList, defaultPrinterOnly) {
  if (!Array.isArray(printerList)) return [];
  if (!defaultPrinterOnly) return printerList;
  const defaults = printerList.filter((printer) => printer?.isDefault === true);
  return defaults.length > 0 ? defaults : printerList;
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function isBase64Char(charCode) {
  return (
    (charCode >= 65 && charCode <= 90) ||
    (charCode >= 97 && charCode <= 122) ||
    (charCode >= 48 && charCode <= 57) ||
    charCode === 43 ||
    charCode === 47
  );
}

function base64PaddingLength(value) {
  if (value.endsWith('==')) return 2;
  if (value.endsWith('=')) return 1;
  return 0;
}

function isValidBase64(value) {
  if (value.length % 4 === 1) return false;
  const padding = base64PaddingLength(value);
  for (let index = 0; index < value.length; index++) {
    const charCode = value.charCodeAt(index);
    const isPadding = charCode === 61;
    if (isPadding) {
      if (index < value.length - padding) return false;
      continue;
    }
    if (!isBase64Char(charCode)) return false;
  }
  return true;
}

export function tokenMatches(configuredToken, candidateToken) {
  if (typeof configuredToken !== 'string' || configuredToken.length === 0) {
    return false;
  }
  if (typeof candidateToken !== 'string' || candidateToken.length === 0) {
    return false;
  }
  if (
    configuredToken.length > MAX_TOKEN_LENGTH ||
    candidateToken.length > MAX_TOKEN_LENGTH
  ) {
    return false;
  }
  const pattern = configuredToken.split('*').map(escapeRegExp).join('\\S+');
  return new RegExp(`^${pattern}$`).test(candidateToken);
}

function declaredFileExportBytes(options) {
  const size = Number(options?.size);
  if (Number.isFinite(size) && size >= 0) return size;
  return undefined;
}

function base64DecodedByteLength(value) {
  if (typeof value !== 'string') return undefined;
  const compact = value.replace(/\s+/g, '');
  if (compact.length === 0) return 0;
  if (!isValidBase64(compact)) return null;
  const padding = base64PaddingLength(compact);
  return Math.floor((compact.length * 3) / 4) - padding;
}

function fileExportPayloadBytes(options) {
  if (typeof options?.payload === 'string') {
    return base64DecodedByteLength(options.payload);
  }
  if (typeof options?.data === 'string') {
    return base64DecodedByteLength(options.data);
  }
  return undefined;
}

export function validateFileExportTask(
  options,
  maxBytes = MAX_FILE_EXPORT_BYTES,
) {
  const declaredBytes = declaredFileExportBytes(options);
  const actualBytes = fileExportPayloadBytes(options);

  if (actualBytes === null) {
    return {
      ok: false,
      code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
      message: 'File export payload must be valid base64.',
      declaredBytes,
      actualBytes: undefined,
    };
  }

  if (declaredBytes === undefined || actualBytes === undefined) {
    return {
      ok: false,
      code: FILE_EXPORT_ERRORS.INVALID_PAYLOAD,
      message: 'File export payload and size are required.',
      declaredBytes,
      actualBytes,
    };
  }

  if (
    (declaredBytes !== undefined && declaredBytes > maxBytes) ||
    (actualBytes !== undefined && actualBytes > maxBytes)
  ) {
    return {
      ok: false,
      code: FILE_EXPORT_ERRORS.FILE_TOO_LARGE,
      message: 'File export task is too large.',
      declaredBytes,
      actualBytes,
    };
  }

  if (
    declaredBytes !== undefined &&
    actualBytes !== undefined &&
    declaredBytes !== actualBytes
  ) {
    return {
      ok: false,
      code: FILE_EXPORT_ERRORS.FILE_SIZE_MISMATCH,
      message: 'Declared file export size does not match payload size.',
      declaredBytes,
      actualBytes,
    };
  }

  return {
    ok: true,
    declaredBytes,
    actualBytes,
  };
}
