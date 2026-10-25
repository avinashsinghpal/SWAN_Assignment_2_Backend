const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./config/logger');
const { startReminderJob } = require('./jobs/reminderJob');

let server;

async function startServer() {
  try {
    await connectDB();
    startReminderJob();

    server = app.listen(env.PORT, () => {
      logger.info(`Tasklane server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { startServer };
