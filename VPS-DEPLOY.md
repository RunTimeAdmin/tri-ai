# VPS Deployment Guide — Dissensus

## Quick Deploy (after git push)

```bash
cd /var/www/tri-ai
git pull
cd dissensus-engine && npm install
cd /var/www/tri-ai && pm2 restart dissensus
```

## What This Does

- **git pull** — Fetches latest code (Share Card feature, verdict improvements, etc.)
- **npm install** — Installs new deps (satori, @resvg/resvg-js for shareable cards)
- **pm2 restart dissensus** — Reloads the app

## App Location

- **Path:** `/var/www/tri-ai`
- **PM2 process:** `dissensus`
- **Entry:** `dissensus-engine/server/index.js`

## Verify

```bash
pm2 logs dissensus --lines 20
curl -s https://app.dissensus.fun/api/health
```

## New Features (Share Card)

After deploy, users can click **"🖼️ Share Card"** after a debate to download a Twitter-sized PNG:
- 1200×630, dark theme
- Topic + verdict summary + dissensus.fun
- **Not financial advice** disclaimer auto-added for crypto topics
