# Instagram Reel Daily View Tracker (Apify + Google Sheets)

A production-ready Node.js automation that:

1. Reads many Instagram Reel URLs from Google Sheets
2. Scrapes latest reel metrics via an Apify Instagram scraper actor
3. Updates views, likes, last update timestamp, and daily growth
4. Marks the reel(s) with highest daily growth
5. Runs once per day via cron scheduler

---

## 1) Google Sheet format

Create a tab (default name: `Reels`) with these exact headers in row 1:

- `User Name`
- `Reel URL`
- `Current Views`
- `Last Views`
- `Daily Growth`
- `Current Likes`
- `Last Updated Date`
- `Status`
- `Top Growth`

Each additional row is one reel tied to one user.

---

## 2) Prerequisites

- Node.js 18+
- Apify account + API token
- Apify actor for Instagram scraping (default: `apify/instagram-scraper`)
- Google Cloud service account with Sheets API enabled
- Google Sheet shared with the service account email

---

## 3) Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` with your credentials:

- `APIFY_TOKEN`
- `APIFY_ACTOR_ID` (or keep default)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (preserve newlines as `\n`)
- `GOOGLE_SHEET_ID`

Optional:

- `SHEET_TAB_NAME=Reels`
- `SCHEDULE_CRON=0 8 * * *` (daily 08:00)
- `TIMEZONE=UTC`
- `BATCH_SIZE=25`
- `MAX_RETRIES=3`

---

## 4) Run manually

```bash
npm run run-once
```

What it does:

- Loads all reel rows from Sheets
- Sends URLs to Apify in batches (default 25 URLs/batch)
- Retries failed batches up to `MAX_RETRIES`
- Updates metrics and timestamps
- Calculates daily growth:
  - `Daily Growth = Current Views(new) - Current Views(old)`
- Sets top growth flag for best performer(s)

---

## 5) Schedule daily automation

### Option A: Keep Node scheduler process running

```bash
npm run schedule
```

This runs cron inside Node using `SCHEDULE_CRON` and `TIMEZONE`.

### Option B: OS cron (recommended on Linux server)

Edit crontab:

```bash
crontab -e
```

Example daily 08:00 UTC:

```cron
0 8 * * * cd /path/to/repo && /usr/bin/node src/index.js >> tracker.log 2>&1
```

---

## 6) Scale guidance (100+ reels)

- Tune `BATCH_SIZE` (e.g., 20–40) based on actor runtime
- Keep one row per reel URL (easy incremental growth)
- Add new rows any time; next run auto-detects and tracks them
- Use service logs for failures and retries

---

## 7) Error handling built in

- Batch retry with exponential-style backoff (`2s`, `4s`, ...)
- URL-level failure status persisted to `Status`
- Missing metrics do not crash full run

---

## 8) File structure

- `src/apifyService.js` → Apify actor calls, batching, retries, parsing
- `src/sheetsService.js` → Google Sheets read/update logic
- `src/scheduler.js` → daily cron runner
- `src/index.js` → orchestration runner
- `.env.example` → required environment variables

---

## Notes

- Uses only public data from Apify actor output.
- Does **not** use Instagram private APIs.
- If your selected actor emits different output keys, adjust mappings in `src/apifyService.js` (`viewCount`, `likeCount`, URL fields).
