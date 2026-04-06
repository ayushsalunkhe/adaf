const { ApifyClient } = require('apify-client');
const config = require('./config');
const logger = require('./logger');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ApifyService {
  constructor() {
    this.client = new ApifyClient({ token: config.apifyToken });
  }

  async fetchMetrics(urls) {
    const batches = this.chunk(urls, config.batchSize);
    const all = new Map();

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      logger.info(`Processing Apify batch ${i + 1}/${batches.length}`, { batchSize: batch.length });
      const batchResult = await this.fetchBatchWithRetry(batch);
      for (const [url, data] of batchResult.entries()) {
        all.set(url, data);
      }
    }

    return all;
  }

  async fetchBatchWithRetry(batch) {
    let lastError;

    for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
      try {
        return await this.fetchBatch(batch);
      } catch (error) {
        lastError = error;
        logger.warn(`Apify batch attempt ${attempt} failed`, {
          attempt,
          maxRetries: config.maxRetries,
          message: error.message,
        });
        if (attempt < config.maxRetries) {
          await wait(attempt * 2000);
        }
      }
    }

    throw lastError;
  }

  async fetchBatch(batch) {
    const runInput = {
      directUrls: batch,
      resultsLimit: batch.length,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
    };

    const run = await this.client.actor(config.apifyActorId).call(runInput);
    const items = await this.client.dataset(run.defaultDatasetId).listItems({ clean: true });

    const normalized = new Map();

    for (const url of batch) {
      normalized.set(url, {
        reelUrl: url,
        viewCount: null,
        likeCount: null,
        fetchedAt: new Date().toISOString(),
        error: 'No matching item returned by actor',
      });
    }

    for (const item of items.items) {
      const reelUrl = this.extractUrl(item);
      if (!reelUrl) continue;

      const existing = normalized.get(reelUrl) || { reelUrl };
      normalized.set(reelUrl, {
        ...existing,
        reelUrl,
        viewCount: this.toNumber(item.videoViewCount ?? item.videoPlayCount ?? item.viewCount),
        likeCount: this.toNumber(item.likesCount ?? item.likeCount),
        fetchedAt: new Date().toISOString(),
        error: null,
      });
    }

    return normalized;
  }

  extractUrl(item) {
    return item.inputUrl || item.url || item.reelUrl || item.postUrl || null;
  }

  toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,_\s]/g, '');
      const parsed = Number.parseFloat(cleaned);
      return Number.isNaN(parsed) ? null : Math.round(parsed);
    }
    return null;
  }

  chunk(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = ApifyService;
