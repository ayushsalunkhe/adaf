const { google } = require('googleapis');
const config = require('./config');
const logger = require('./logger');

const HEADERS = {
  userName: 'User Name',
  reelUrl: 'Reel URL',
  currentViews: 'Current Views',
  lastViews: 'Last Views',
  dailyGrowth: 'Daily Growth',
  currentLikes: 'Current Likes',
  lastUpdatedDate: 'Last Updated Date',
  status: 'Status',
  topGrowthFlag: 'Top Growth',
};

class SheetsService {
  constructor() {
    const auth = new google.auth.JWT(
      config.googleServiceAccountEmail,
      null,
      config.googlePrivateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async loadRows() {
    const range = `${config.sheetTabName}!A1:Z`;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheetId,
      range,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      throw new Error(`Sheet ${config.sheetTabName} is empty. Add headers in row 1 first.`);
    }

    const headers = values[0];
    const headerIndex = this.buildHeaderIndex(headers);

    this.ensureHeaders(headerIndex);

    const rows = [];
    for (let i = 1; i < values.length; i += 1) {
      const rowValues = values[i];
      const rowNumber = i + 1;
      const reelUrl = rowValues[headerIndex[HEADERS.reelUrl]];
      if (!reelUrl) continue;

      rows.push({
        rowNumber,
        userName: rowValues[headerIndex[HEADERS.userName]] || '',
        reelUrl,
        currentViews: this.toNumber(rowValues[headerIndex[HEADERS.currentViews]]),
        currentLikes: this.toNumber(rowValues[headerIndex[HEADERS.currentLikes]]),
      });
    }

    return { headers, headerIndex, rows };
  }

  async updateRows(headerIndex, updates) {
    if (updates.length === 0) {
      logger.info('No row updates required.');
      return;
    }

    const data = updates.map((item) => ({
      range: `${config.sheetTabName}!A${item.rowNumber}:Z${item.rowNumber}`,
      values: [this.mapRowToValues(headerIndex, item)],
    }));

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: config.googleSheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });

    logger.info(`Updated ${updates.length} rows in Google Sheets.`);
  }

  mapRowToValues(headerIndex, item) {
    const maxColIndex = Math.max(...Object.values(headerIndex));
    const row = new Array(maxColIndex + 1).fill('');

    row[headerIndex[HEADERS.userName]] = item.userName;
    row[headerIndex[HEADERS.reelUrl]] = item.reelUrl;
    row[headerIndex[HEADERS.currentViews]] = item.currentViews ?? '';
    row[headerIndex[HEADERS.lastViews]] = item.lastViews ?? '';
    row[headerIndex[HEADERS.dailyGrowth]] = item.dailyGrowth ?? '';
    row[headerIndex[HEADERS.currentLikes]] = item.currentLikes ?? '';
    row[headerIndex[HEADERS.lastUpdatedDate]] = item.lastUpdatedDate;
    row[headerIndex[HEADERS.status]] = item.status;
    row[headerIndex[HEADERS.topGrowthFlag]] = item.topGrowthFlag;

    return row;
  }

  ensureHeaders(headerIndex) {
    const missing = Object.values(HEADERS).filter((name) => headerIndex[name] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required sheet headers: ${missing.join(', ')}`);
    }
  }

  buildHeaderIndex(headers) {
    const map = {};
    headers.forEach((header, idx) => {
      map[header] = idx;
    });
    return map;
  }

  toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number.parseFloat(String(value).replace(/[,_\s]/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }

  static headers() {
    return HEADERS;
  }
}

module.exports = SheetsService;
