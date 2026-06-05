/*
 * @Date: 2023-09-29 13:52:41
 * @LastEditors: admin@54xavier.cn
 * @LastEditTime: 2024-07-22 15:02:09
 * @FilePath: /node-hiprint-transit/init.js
 */
import path from 'node:path';
import readline from 'node:readline';
import inquirer from 'inquirer';
import { fileURLToPath } from 'node:url';
import { writeConfig } from './src/config.js';
import { I18n } from 'i18n';
import {
  DEFAULT_INIT_CONFIG,
  parsePortAnswer,
  parseTokenAnswer,
  validatePortInput,
  validateTokenInput,
} from './src/init-config.js';

// ES Module need use fileURLToPath to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const CONFIG = { ...DEFAULT_INIT_CONFIG };

// Setup i18n
const i18n = new I18n({
  locales: ['en', 'zh'],
  directory: path.join(__dirname, './src/locales'),
  defaultLocale: 'en',
});

/**
 * @description: Set language
 * @return {Promise}
 */
function setLang() {
  return new Promise((resolve) => {
    inquirer
      .prompt([
        {
          name: 'lang',
          type: 'list',
          message: 'Set language 设置语言 ',
          choices: [
            {
              name: 'English',
              value: 'en',
            },
            {
              name: '简体中文',
              value: 'zh',
            },
          ],
        },
      ])
      .then((answers) => {
        CONFIG.lang = answers.lang;
        i18n.setLocale(CONFIG.lang);
        resolve();
      });
  });
}

/**
 * @description: Set port
 * @return {Promise}
 */
function setPort() {
  return new Promise((resolve) => {
    inquirer
      .prompt([
        {
          name: 'port',
          type: 'input',
          message: i18n.__('Set serve port %s:', '10000~65535'),
          default: 17521,
          validate: (input) => validatePortInput(input, i18n),
        },
      ])
      .then((answers) => {
        CONFIG.port = parsePortAnswer(answers.port);
        resolve();
      });
  });
}

/**
 * @description: Set token
 * @return {Promise}
 */
function setToken() {
  return new Promise((resolve) => {
    inquirer
      .prompt([
        {
          name: 'token',
          type: 'input',
          message: i18n.__(
            'Set service TOKEN (Use the wildcard character (*) to match any character):',
          ),
          default: 'vue-plugin-hiprint',
          validate: (input) => validateTokenInput(input, i18n),
        },
      ])
      .then((answers) => {
        CONFIG.token = parseTokenAnswer(answers.token);
        resolve();
      });
  });
}

/**
 * @description: Set SSL
 * @return {Promise}
 */
function setSSL() {
  return new Promise((resolve) => {
    inquirer
      .prompt([
        {
          name: 'ssl',
          type: 'confirm',
          message: i18n.__('Use SSL:'),
          default: false,
        },
      ])
      .then((answers) => {
        CONFIG.useSSL = answers.ssl;
        resolve();
      });
  });
}

setLang().then(() => {
  setPort().then(() => {
    setToken().then(() => {
      setSSL().then(() => {
        writeConfig(CONFIG)
          .then(() => {
            console.log(i18n.__('Configuration file written successfully'));
          })
          .catch(() => {
            console.error(i18n.__('Configuration file write failed'));
          })
          .finally(() => {
            rl.close();
          });
      });
    });
  });
});
