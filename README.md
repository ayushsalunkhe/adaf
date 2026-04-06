# Instagram Reel Daily View Tracker (Apify + Google Sheets)

This project gives you a **fully automated daily tracker**:

1. You add reels in Google Sheets (multiple users, multiple reel URLs)
2. Script runs daily
3. Apify actor fetches latest reel metrics
4. Sheet updates views, likes, growth, timestamp, and status

---

## Quick answer to your 3 questions

## 1) What to write in `.env`

Create `.env` in the project root (`/workspace/adaf/.env`) with values like:

```env
# Required
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APIFY_ACTOR_ID=apify/instagram-scraper
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_LINE_1\nYOUR_KEY_LINE_2\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890

# Optional
SHEET_TAB_NAME=Reels
SCHEDULE_CRON=0 8 * * *
TIMEZONE=UTC
BATCH_SIZE=25
MAX_RETRIES=3
```

**Where each value comes from:**

- `APIFY_TOKEN`: Apify Console → Settings → Integrations/API (personal token)
- `APIFY_ACTOR_ID`: Actor you run for reels (default uses `apify/instagram-scraper`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`: Google Cloud service account JSON key
- `GOOGLE_SHEET_ID`: the long ID in your Google Sheet URL

---

## 2) Where to deploy

You have 3 good options:

### Option A (Easiest): VPS / cloud VM + cron
Deploy on any always-on Linux machine:
- AWS EC2
- DigitalOcean Droplet
- Hetzner Cloud
- Railway/Render background worker (if cron supported)

Best when you want stable daily automation and full control.

### Option B: Apify scheduled task
Run this Node script itself on Apify as an actor/task and schedule daily there.
Best when you want all automation inside Apify.

### Option C: Local machine (only for testing)
Works for initial testing, but not reliable for production unless your PC is always on.

---

## 3) How to use (end-to-end)

### Step 1: Prepare Google Sheet
Create one tab named `Reels` (or change with `SHEET_TAB_NAME`) with headers in row 1:

- `User Name`
- `Reel URL`
- `Current Views`
- `Last Views`
- `Daily Growth`
- `Current Likes`
- `Last Updated Date`
- `Status`
- `Top Growth`

Example rows:

| User Name | Reel URL | Current Views | Last Views | Daily Growth | Current Likes | Last Updated Date | Status | Top Growth |
|---|---|---:|---:|---:|---:|---|---|---|
| Alice | https://www.instagram.com/reel/ABC123/ |  |  |  |  |  |  |  |
| Bob | https://www.instagram.com/reel/XYZ987/ |  |  |  |  |  |  |  |

### Step 2: Share sheet with service account
Open the sheet → Share → add `GOOGLE_SERVICE_ACCOUNT_EMAIL` as Editor.

### Step 3: Install and configure
```bash
npm install
cp .env.example .env
# edit .env with real values
```

### Step 4: First manual run
```bash
npm run run-once
```

Expected result:
- `Current Views` and `Current Likes` filled
- `Last Views` updated from previous value
- `Daily Growth` calculated
- `Last Updated Date` set
- `Status` set to `OK` or error text

### Step 5: Enable daily automation

#### Method 1: Node internal scheduler
```bash
npm run schedule
```
(Keep process alive with PM2/systemd.)

#### Method 2: OS cron (recommended)
```bash
crontab -e
```
Add:
```cron
0 8 * * * cd /path/to/repo && /usr/bin/node src/index.js >> tracker.log 2>&1
```

---

## Production deployment recipe (recommended)

Example with Ubuntu VM:

```bash
# 1) Install Node.js 18+
# 2) Clone repo
cd /opt
sudo git clone <your-repo-url> reel-tracker
cd reel-tracker

# 3) Install deps
npm install

# 4) Add env
cp .env.example .env
nano .env

# 5) Smoke test
npm run run-once

# 6) Setup cron daily at 08:00 UTC
(crontab -e)
0 8 * * * cd /opt/reel-tracker && /usr/bin/node src/index.js >> /opt/reel-tracker/tracker.log 2>&1
```

---

## Scaling and reliability notes

- 100+ reels supported via batching (`BATCH_SIZE`)
- Transient actor/network failures retried (`MAX_RETRIES`)
- URL-level failures are written to `Status`, not fatal to whole run
- Add new reel rows anytime; next run auto-includes them

---

## Security notes

- Never commit `.env`
- Rotate any exposed API key immediately
- Give service account only required access to the target sheet

---

## File structure

- `src/apifyService.js` → Apify actor calls, batching, retries, parsing
- `src/sheetsService.js` → Google Sheets read/update logic
- `src/scheduler.js` → daily cron runner
- `src/index.js` → orchestration runner
- `.env.example` → environment variable template
