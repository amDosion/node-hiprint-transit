export const DEFAULT_INIT_CONFIG = Object.freeze({
  port: 17521,
  token: 'vue-plugin-hiprint',
  useSSL: false,
  lang: 'en',
});

export function isValidPortInput(input) {
  if (!input) return true;
  const port = Number(input);
  return /^\d+$/.test(input) && port >= 10000 && port <= 65535;
}

export function parsePortAnswer(input) {
  if (!input) return DEFAULT_INIT_CONFIG.port;
  return Number(input);
}

export function isValidTokenInput(input) {
  return !input || input.length >= 6;
}

export function parseTokenAnswer(input) {
  return input || DEFAULT_INIT_CONFIG.token;
}

export function buildInitConfig(answers = {}) {
  return {
    port: parsePortAnswer(answers.port),
    token: parseTokenAnswer(answers.token),
    useSSL: Boolean(answers.useSSL),
    lang: ['zh', 'en'].includes(answers.lang)
      ? answers.lang
      : DEFAULT_INIT_CONFIG.lang,
  };
}

export function validatePortInput(input, i18n) {
  if (isValidPortInput(input)) return true;
  return i18n.__('Port must be set between %s', '10000 and 65535');
}

export function validateTokenInput(input, i18n) {
  if (isValidTokenInput(input)) return true;
  return i18n.__(
    'For security reasons, the TOKEN length must be greater than 5',
  );
}
