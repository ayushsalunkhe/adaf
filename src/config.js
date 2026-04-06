const dotenv = require('dotenv');

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer for ${name}: ${raw}`);
  }
  return parsed;
}

module.exports = {
  apifyToken: required('APIFY_TOKEN'),
  apifyActorId: process.env.APIFY_ACTOR_ID || 'apify/instagram-scraper',
  googleServiceAccountEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  googlePrivateKey: required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  googleSheetId: required('GOOGLE_SHEET_ID'),
  sheetTabName: process.env.SHEET_TAB_NAME || 'Reels',
  scheduleCron: process.env.SCHEDULE_CRON || '0 8 * * *',
  timezone: process.env.TIMEZONE || 'UTC',
  batchSize: parseIntEnv('BATCH_SIZE', 25),
  maxRetries: parseIntEnv('MAX_RETRIES', 3),
};
