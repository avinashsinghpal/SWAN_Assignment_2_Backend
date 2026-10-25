const env = require('./env');

const logger = {
  info: (message, meta = {}) => {
    if (env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString();
      console.log(JSON.stringify({ level: 'info', timestamp, message, ...meta }));
    }
  },
  warn: (message, meta = {}) => {
    if (env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString();
      console.warn(JSON.stringify({ level: 'warn', timestamp, message, ...meta }));
    }
  },
  error: (message, meta = {}) => {
    if (env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString();
      console.error(JSON.stringify({ level: 'error', timestamp, message, ...meta }));
    }
  },
  debug: (message, meta = {}) => {
    if (env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(JSON.stringify({ level: 'debug', timestamp, message, ...meta }));
    }
  }
};

module.exports = logger;
