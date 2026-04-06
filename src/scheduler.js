const cron = require('node-cron');
const config = require('./config');
const logger = require('./logger');
const { runTracker } = require('./index');

logger.info(`Scheduler started with cron: ${config.scheduleCron} (${config.timezone})`);

cron.schedule(config.scheduleCron, async () => {
  try {
    await runTracker();
  } catch (error) {
    logger.error('Scheduled tracker run failed', { message: error.message, stack: error.stack });
  }
}, {
  timezone: config.timezone,
});

process.stdin.resume();
