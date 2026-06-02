/*
 * @Date: 2023-09-28 19:28:42
 * @LastEditors: admin@54xavier.cn
 * @LastEditTime: 2024-07-22 16:38:53
 * @FilePath: /node-hiprint-transit/index.js
 */
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { totalmem, freemem } from 'node:os';
import chalk from 'chalk';
import { I18n } from 'i18n';
import { Server } from 'socket.io';
import forge from 'node-forge';
import { toUnicode } from 'punycode';
import log from './src/log.js';
import { readConfig, getIPAddress } from './src/config.js';

// ES Module need use fileURLToPath to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

// Filter printer list to only the default printer of each client when enabled
function filterPrinters(printerList, defaultPrinterOnly) {
  if (!defaultPrinterOnly || !Array.isArray(printerList)) return printerList;
  const defaults = printerList.filter((p) => p && p.isDefault === true);
  return defaults.length > 0 ? defaults : printerList;
}

const printEvents = [
  'news',
  'printByFragments',
  'render-jpeg',
  'render-pdf',
  'render-print',
];
const fileExportEvent = 'file.export.v1';
const fileExportReplyEvents = [
  'file.export.v1.progress',
  'file.export.v1.success',
  'file.export.v1.error',
];
const maxFileExportBytes = 50 * 1024 * 1024;

function isFileExportEnabled(clientRecord) {
  return clientRecord?.capabilities?.fileExport?.enabled === true;
}

function declaredExportSize(options) {
  const size = Number(options?.size);
  if (Number.isFinite(size) && size >= 0) return size;
  if (typeof options?.data === 'string') {
    return Math.ceil((options.data.length * 3) / 4);
  }
  if (typeof options?.payload === 'string') {
    return Math.ceil((options.payload.length * 3) / 4);
  }
  return 0;
}

// Setup i18n
const i18n = new I18n({
  locales: ['en', 'zh'],
  directory: path.join(__dirname, './src/locales'),
  defaultLocale: 'en',
});

const CLIENT = new Map();

// Read config first and then start serve
readConfig().then((CONFIG) => {
  const { port, token, useSSL, lang, defaultPrinterOnly } = CONFIG;
  var ipAddress = `http://${getIPAddress()}:${port}`;
  i18n.setLocale(lang);
  var server;
  if (useSSL) {
    const key = readFileSync('./src/ssl.key', 'utf-8');
    const cert = readFileSync('./src/ssl.pem', 'utf-8');
    // Check SSL certificate
    if (!key || !cert) {
      console.error(chalk.red(i18n.__('SSL certificate is missing')));
      process.exit(1);
    }
    const certificate = forge.pki.certificateFromPem(cert);
    // Check SSL certificate is expired
    if (new Date(certificate.validity.notAfter) < new Date()) {
      console.warn(chalk.red(i18n.__('SSL certificate has expired')));
    }
    server = https.createServer({
      key,
      cert,
    });
    // Get all domains from certificate
    const domains = certificate.extensions
      .find(({ name }) => name === 'subjectAltName')
      .altNames.map(({ value }) => toUnicode(value));
    ipAddress = domains.map((value) => `https://${value}:${port}`).join('\n');
  } else {
    server = http.createServer();
  }

  // Setup socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  server.listen(port, () => {
    log(i18n.__('Serve is start'));
    console.log(
      chalk.green(`node-hiprint-transit version: ${packageJson.version}\n`),
    );
    console.log(
      i18n.__(
        'Serve is running on\n%s\n\nPlease make sure that the ports have been opened in the security group or firewall.\ntoken: %s',
        chalk.green.underline(ipAddress),
        chalk.green(token),
      ),
    );
  });

  // Authentication
  io.use((socket, next) => {
    const tokenRegex = new RegExp(`^${token.replace(/\*/g, '\\S+')}$`);
    if (token && tokenRegex.test(socket.handshake.auth.token)) {
      next();
    } else {
      log(i18n.__('Authentication failed for %s', socket.id));
      next(new Error('Authentication failed'));
    }
  });

  // Socket.io Add event listener
  io.on('connection', (socket) => {
    const sToken = socket.handshake.auth.token;
    if (!CLIENT.has(sToken)) {
      CLIENT.set(sToken, {});
    }

    const currentClients = Object.keys(CLIENT.get(sToken))?.length || 0;

    const webClients =
      (Array.from(io.sockets.sockets.values()).filter(
        ({ handshake }) => handshake.auth.token === sToken,
      )?.length || 0) - currentClients;

    const allClients =
      Array.from(io.sockets.sockets.values()).filter(
        ({ handshake }) => handshake.query?.client === 'electron-hiprint',
      )?.length || 0;

    const allWebClients =
      (Array.from(io.sockets.sockets.values())?.length || 0) - allClients;

    // Send server info to client
    const serverInfo = {
      // Server version
      version: packageJson.version,
      // Number of Electron-hiprint clients for the current socket's token
      currentClients,
      // Number of all Electron-hiprint clients
      allClients,
      // Number of web clients for the current socket's token
      webClients,
      // Number of all web clients
      allWebClients,
      // Server total memory
      totalmem: totalmem(),
      // Server free memory
      freemem: freemem(),
    };
    socket.emit('serverInfo', serverInfo);

    if (socket.handshake.query.test !== 'true') {
      if (socket.handshake.query.client === 'electron-hiprint') {
        log(
          i18n.__(
            'Client connected: %s',
            `${socket.id} | ${sToken} | (electron-hiprint)`,
          ),
        );
        // Join electron-hiprint room
        socket.join(`${sToken}_electron-hiprint`);
      } else {
        log(
          i18n.__(
            'Client connected: %s',
            `${socket.id} | ${sToken} | (web-client)`,
          ),
        );
        // Join web-client room
        socket.join(`${sToken}_web-client`);

        // Send client list to web client
        socket.emit('clients', CLIENT.get(sToken));

        // Send all printer list to web client
        const allPrinterList = [];
        const clients = CLIENT.get(sToken);
        Object.keys(clients).forEach((key) => {
          const client = clients[key];
          filterPrinters(client.printerList, defaultPrinterOnly).forEach(
            (printer) => {
              allPrinterList.push({
                ...printer,
                server: Object.assign({}, client, {
                  clientId: key,
                  printerList: undefined,
                }),
              });
            },
          );
        });
        socket.emit('printerList', allPrinterList);
      }
    } else {
      log(i18n.__('Client connected: %s', `${socket.id} | ${sToken} | (test)`));
      // Wait for the serverInfo event to be emitted, then disconnect.
      setTimeout(() => {
        socket.disconnect(true);
      }, 1000 * 5);
    }

    // Get client info
    socket.on('clientInfo', (data) => {
      CLIENT.get(sToken)[socket.id] = Object.assign(
        {
          clientId: socket.id,
        },
        CLIENT.get(sToken)[socket.id],
        data,
      );
      io.to(`${sToken}_web-client`).emit('clients', CLIENT.get(sToken));
    });

    // Get client printer list
    socket.on('printerList', (printerList) => {
      CLIENT.get(sToken)[socket.id] = Object.assign(
        {},
        CLIENT.get(sToken)[socket.id],
        { printerList },
      );
    });

    // Get all client list
    socket.on('getClients', () => {
      socket.emit('clients', CLIENT.get(sToken));
    });

    // Get all clients printer list
    socket.on('refreshPrinterList', () => {
      io.to(`${sToken}_electron-hiprint`).emit('refreshPrinterList');

      // Just wait 2 seconds for the client to update the printer list
      // Of course, this is not a good way to do it. But it’s not like it can’t be used 🤪
      setTimeout(() => {
        const allPrinterList = [];
        const clients = CLIENT.get(sToken);
        Object.keys(clients).forEach((key) => {
          const client = clients[key];
          filterPrinters(client.printerList, defaultPrinterOnly).forEach(
            (printer) => {
              allPrinterList.push({
                ...printer,
                server: Object.assign({}, client, {
                  clientId: key,
                  printerList: undefined,
                }),
              });
            },
          );
        });
        socket.emit('printerList', allPrinterList);
      }, 1000 * 2);
    });

    // Get client address info, is not supported
    socket.on('address', () => {
      socket.emit(
        'address',
        'Address is not supported in transit server, you should use getClients.',
      );
    });

    // Make a ipp print to electron-hiprint client
    socket.on('ippPrint', (options) => {
      if (options.client) {
        if (!CLIENT.get(sToken)[options.client]) {
          socket.emit('error', {
            msg: 'Client is not exist.',
          });
          return;
        }
        socket
          .to(options.client)
          .emit('ippPrint', { ...options, replyId: socket.id });
        log(i18n.__('%s send ippPrint to %s', socket.id, options.client));
      } else {
        socket.emit('error', {
          msg: 'Client must be specified.',
        });
      }
    });

    // Make a ipp printer connected event to reply client
    socket.on('ippPrinterConnected', (options) => {
      if (options.replyId && options.printer) {
        socket.to(options.replyId).emit('ippPrinterConnected', options.printer);
      }
    });

    // Make a ipp printer callback to reply client
    socket.on('ippPrinterCallback', (options, res) => {
      if (options.replyId) {
        socket.to(options.replyId).emit('ippPrinterCallback', options, res);
      }
    });

    // Make a ipp request to electron-hiprint client
    socket.on('ippRequest', (options) => {
      if (options.client) {
        if (!CLIENT.get(sToken)[options.client]) {
          socket.emit('error', {
            msg: 'Client is not exist.',
          });
          return;
        }
        socket
          .to(options.client)
          .emit('ippRequest', { ...options, replyId: socket.id });
        log(i18n.__('%s send ippRequest to %s', socket.id, options.client));
      } else {
        socket.emit('error', {
          msg: 'Client must be specified.',
        });
      }
    });

    // Make a ipp request callback to reply client
    socket.on('ippRequestCallback', (options, res) => {
      if (options.replyId) {
        socket.to(options.replyId).emit('ippRequestCallback', options, res);
      }
    });

    // news, printByFragments, render-jpeg, render-pdf, render-print event bind.
    printEvents.forEach((event) => {
      socket.on(event, (options) => {
        if (options.client) {
          if (!CLIENT.get(sToken)[options.client]) {
            socket.emit('error', {
              msg: 'Client is not exist.',
              templateId: options.templateId,
            });
            return;
          }
          socket
            .to(options.client)
            .emit(event, { ...options, replyId: socket.id });
          log(i18n.__(`%s send %s to %s`, socket.id, event, options.client));
        } else {
          socket.emit('error', {
            msg: 'Client must be specified.',
            templateId: options.templateId,
          });
        }
      });

      // render event success callback
      socket.on(`${event}-success`, (options) => {
        if (options.replyId) {
          socket.to(options.replyId).emit(`${event}-success`, options);
          log(
            i18n.__(
              `%s client: %s success, templateId: %s`,
              socket.id,
              event,
              options.templateId,
            ),
          );
        }
      });

      // render event error callback
      socket.on(`${event}-error`, (options) => {
        if (options.replyId) {
          socket.to(options.replyId).emit(`${event}-error`, options);
          log(
            i18n.__(
              `%s client: %s error, templateId: %s`,
              socket.id,
              event,
              options.templateId,
            ),
          );
        }
      });
    });

    socket.on(fileExportEvent, (options) => {
      const taskId = options?.taskId;
      if (!options?.client) {
        socket.emit('file.export.v1.error', {
          taskId,
          code: 'CLIENT_REQUIRED',
          message: 'Client must be specified.',
        });
        return;
      }
      const clientRecord = CLIENT.get(sToken)[options.client];
      if (!clientRecord) {
        socket.emit('file.export.v1.error', {
          taskId,
          code: 'CLIENT_NOT_FOUND',
          message: 'Client is not exist.',
        });
        return;
      }
      if (!isFileExportEnabled(clientRecord)) {
        socket.emit('file.export.v1.error', {
          taskId,
          code: 'CLIENT_FILE_EXPORT_DISABLED',
          message: 'Client file export capability is disabled.',
        });
        return;
      }
      if (declaredExportSize(options) > maxFileExportBytes) {
        socket.emit('file.export.v1.error', {
          taskId,
          code: 'FILE_TOO_LARGE',
          message: 'File export task is too large.',
        });
        return;
      }
      socket
        .to(options.client)
        .emit(fileExportEvent, { ...options, replyId: socket.id });
      log(
        i18n.__(`%s send %s to %s`, socket.id, fileExportEvent, options.client),
      );
    });

    fileExportReplyEvents.forEach((event) => {
      socket.on(event, (options) => {
        if (options?.replyId) {
          socket.to(options.replyId).emit(event, options);
          log(
            i18n.__(
              `%s client: %s result, taskId: %s`,
              socket.id,
              event,
              options.taskId,
            ),
          );
        }
      });
    });

    // Make a success callback to reply client
    socket.on('success', (options) => {
      if (options.replyId) {
        socket.to(options.replyId).emit('success', options);
        log(
          i18n.__(
            '%s client: %s success, templateId: %s',
            socket.id,
            'print',
            options.templateId,
          ),
        );
      }
    });

    // Make a error callback to reply client
    socket.on('error', (options) => {
      if (options.replyId) {
        socket.to(options.replyId).emit('error', options);
        log(
          i18n.__(
            '%s client: %s error, templateId: %s',
            socket.id,
            'print',
            options.templateId,
          ),
        );
      }
    });

    // Client disconnect
    socket.on('disconnect', () => {
      if (socket.handshake.query.test !== 'true') {
        log(i18n.__('Client disconnected: %s', socket.id));
        // Remove electron-hiprint client from CLIENT
        if (socket.handshake.query.client === 'electron-hiprint') {
          delete CLIENT.get(sToken)[socket.id];
          // Send client list to web client
          io.to(`${sToken}_web-client`).emit('clients', CLIENT.get(sToken));
        }
      }
    });
  });

  // Retrieve the client print list every 10 minutes.
  setInterval(
    () => {
      log(i18n.__('Retrieve the client print list'));
      CLIENT.forEach((_, key) => {
        io.to(`${key}_electron-hiprint`).emit('refreshPrinterList');
      });
    },
    1000 * 60 * 10,
  );
});

// Close serve
process.on('SIGINT', () => {
  log(i18n.__('Serve is closed')).then(() => {
    process.exit(0); // 退出进程
  });
});
