const { config } = require('../config');

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'medos-hms',
    message,
    ...meta,
  };

  if (config.nodeEnv === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}[${level.toUpperCase()}]${reset} ${message}`, meta);
  }
};

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  http: (message, meta) => log('info', message, meta),
};

module.exports = logger;