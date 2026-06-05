/*
 * @Date: 2023-09-28 19:32:35
 * @LastEditors: admin@54xavier.cn
 * @LastEditTime: 2023-10-03 10:39:47
 * @FilePath: \node-hiprint-transit\src\config.js
 */
import os from 'node:os';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ES Module need use fileURLToPath to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.env.HIPRINT_CONFIG_PATH
  ? path.resolve(process.env.HIPRINT_CONFIG_PATH)
  : path.join(__dirname, '../', 'config.json');

const DEFAULT_CONFIG = {
  port: 17521,
  token: 'vue-plugin-hiprint',
  useSSL: false,
  lang: 'en',
  defaultPrinterOnly: false,
};

const CONFIG = { ...DEFAULT_CONFIG };

function normalizePort(port) {
  const parsed = Number(port);
  if (Number.isInteger(parsed) && parsed >= 10000 && parsed <= 65535) {
    return parsed;
  }
  return DEFAULT_CONFIG.port;
}

function normalizeToken(token) {
  if (typeof token === 'string' && token.length >= 6) {
    return token;
  }
  return DEFAULT_CONFIG.token;
}

export function normalizeConfig(config = {}) {
  return {
    port: normalizePort(config.port ?? DEFAULT_CONFIG.port),
    token: normalizeToken(config.token ?? DEFAULT_CONFIG.token),
    useSSL: Boolean(config.useSSL),
    lang: ['zh', 'en'].includes(config.lang)
      ? config.lang
      : DEFAULT_CONFIG.lang,
    defaultPrinterOnly: Boolean(config.defaultPrinterOnly),
  };
}

/**
 * @description: Read config from config.json
 * @return {Promise}
 */
export function readConfig() {
  return new Promise((resolve, reject) => {
    readFile(configPath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          Object.assign(
            CONFIG,
            normalizeConfig(data ? JSON.parse(data) : DEFAULT_CONFIG),
          );
          resolve(CONFIG);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

/**
 * @description: Write config to config.json
 * @param {Object} _CONFIG
 * @return {Promise}
 */
export function writeConfig(_CONFIG) {
  const normalizedConfig = normalizeConfig(_CONFIG);
  return new Promise((resolve, reject) => {
    writeFile(configPath, JSON.stringify(normalizedConfig, null, 2), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * @description: Get local IP address
 * @return {String}
 */
export function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
}

export default {
  readConfig,
  writeConfig,
  normalizeConfig,
  getIPAddress,
};
