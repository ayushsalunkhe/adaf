const ApifyService = require('./apifyService');
const SheetsService = require('./sheetsService');
const logger = require('./logger');

function normalizeUrl(url) {
  return String(url).trim().replace(/\/?$/, '/');
}

async function runTracker() {
  logger.info('Starting Instagram Reel tracker run...');
  const sheetsService = new SheetsService();
  const apifyService = new ApifyService();

  const { rows, headerIndex } = await sheetsService.loadRows();
  if (rows.length === 0) {
    logger.warn('No reel rows found. Exiting.');
    return;
  }

  const urlList = rows.map((row) => normalizeUrl(row.reelUrl));
  const metricsByUrl = await apifyService.fetchMetrics(urlList);

  const updates = [];
  let bestGrowth = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    const normalizedUrl = normalizeUrl(row.reelUrl);
    const metric = metricsByUrl.get(normalizedUrl);

    const previousViews = row.currentViews ?? 0;
    const latestViews = metric?.viewCount;
    const latestLikes = metric?.likeCount;

    const dailyGrowth = latestViews !== null && latestViews !== undefined
      ? latestViews - previousViews
      : null;

    if (dailyGrowth !== null && dailyGrowth > bestGrowth) {
      bestGrowth = dailyGrowth;
    }

    updates.push({
      rowNumber: row.rowNumber,
      userName: row.userName,
      reelUrl: row.reelUrl,
      currentViews: latestViews ?? row.currentViews,
      lastViews: row.currentViews ?? '',
      dailyGrowth,
      currentLikes: latestLikes ?? row.currentLikes,
      lastUpdatedDate: new Date().toISOString(),
      status: metric?.error ? `FAILED: ${metric.error}` : 'OK',
      topGrowthFlag: '',
    });
  }

  for (const update of updates) {
    if (bestGrowth > Number.NEGATIVE_INFINITY && update.dailyGrowth === bestGrowth) {
      update.topGrowthFlag = '🔥 Highest daily growth';
    }
  }

  await sheetsService.updateRows(headerIndex, updates);
  logger.info('Tracker run completed successfully.');
}

if (require.main === module) {
  runTracker().catch((error) => {
    logger.error('Tracker run failed', { message: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = { runTracker };
