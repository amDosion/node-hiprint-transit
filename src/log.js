/*
 * @Date: 2023-09-29 20:50:59
 * @LastEditors: admin@54xavier.cn
 * @LastEditTime: 2024-03-09 11:29:03
 * @FilePath: \node-hiprint-transit\src\log.js
 */
import { access, appendFile, constants, mkdir, writeFile } from 'node:fs';
import path from 'node:path';
import dayjs from 'dayjs';

const logDir = process.env.HIPRINT_LOG_DIR || './logs';

function logFilePath() {
  return path.join(logDir, `${dayjs().format('YYYY-MM-DD')}.log`);
}

/**
 * @description: This function checks if the log directory exists. If it does not exist, a new directory will be created.
 * @return {Promise} A Promise object that resolves if the directory exists, or rejects if creating the directory fails.
 */
function checkDir() {
  return new Promise((resolve, reject) => {
    access(logDir, constants.F_OK, (err) => {
      if (err) {
        mkdir(logDir, { recursive: true }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * This function checks if a log file exists. If it does not exist, a new log file will be created.
 * @returns {Promise} A Promise object that resolves if the file exists, or rejects if creating the file fails.
 */
function checkLogFile() {
  const filePath = logFilePath();
  return new Promise((resolve, reject) => {
    checkDir()
      .then(() => {
        access(filePath, constants.F_OK, (err) => {
          if (err) {
            writeFile(filePath, '', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/**
 * Writes log message to log file.
 * @param {string} message - The log message to be written.
 * @returns {Promise} - A Promise object that resolves when writing is successful, or rejects when writing fails.
 */
function log(message) {
  const filePath = logFilePath();
  return new Promise((resolve, reject) => {
    checkLogFile()
      .then(() => {
        const logMessage = `${dayjs().format(
          'YYYY/MM/DD HH:mm:ss',
        )}: ${message}\n`;
        appendFile(filePath, logMessage, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export default log;
