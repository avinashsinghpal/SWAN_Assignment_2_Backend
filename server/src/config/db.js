const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

let isConnected = false;

async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: env.NODE_ENV !== 'production'
    });

    isConnected = true;
    logger.info('MongoDB connected successfully', {
      host: conn.connection.host,
      name: conn.connection.name
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB initial connection failure', { error: error.message });
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
