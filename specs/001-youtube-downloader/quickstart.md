# Quickstart: Modern YouTube Downloader Website

**Feature**: `001-youtube-downloader` | **Date**: 2026-05-30

How to set up, run, test, and verify the static front-end. The extraction service is a **separate
component**; for local development the front-end runs against a **mock** of its contract
(`contracts/extraction-service.md`).

## Prerequisites

- Node.js 20+ and npm
- A value for `PUBLIC_DOWNLOADER_API` (the extraction service base URL). For local dev, point it at
  the mock server (below) or a running self-hosted service.

## Setup

```bash
npm install
cp .env.example .env          # then set PUBLIC_DOWNLOADER_API
```

`.env.example`:
```
PUBLIC_DOWNLOADER_API=http://localhost:8787   # mock or self-hosted extraction service
```

## Run (development)

```bash
npm run dev          # Astro dev server (http://localhost:5173 — matches the service CORS allow-list)
npm run mock-api     # optional: local mock implementing the extraction-service contract
```

Open the dev URL, paste a YouTube link on the landing page, and proceed to the download page.

## Build & preview (production static output)

```bash
npm run build        # outputs static site to ./dist
npm run preview      # serve ./dist locally to sanity-check the production build
```

Deploy `./dist` to any static host/CDN. No server runtime is required (constitution Principle I).

## Test (single documented command — constitution Principle VI)

```bash
npm test             # runs unit + e2e + a11y + perf gates
```

Individually:
```bash
npm run test:unit    # Vitest — link-utils, api-client, config
npm run test:e2e     # Playwright — user-story journeys (extraction service mocked)
npm run test:a11y    # Playwright + axe — WCAG 2.1 AA per page
npm run test:perf    # Lighthouse CI — LCP/TBT/CLS + JS/transfer budgets
```

## Verify each user story (manual smoke)

1. **US1 — single video MP4**: paste a video link → preview shows title/thumbnail/author/duration →
   pick a quality (≤1080p) → download → confirm a playable `.mp4` is saved.
2. **US2 — MP3 + metadata**: same link → choose MP3 → confirm shown metadata → download → open the
   `.mp3` and verify title, author, and cover art are embedded.
3. **US3 — playlist ZIP**: paste a playlist link → list + count appear → start → watch per-item +
   overall progress → confirm a single `.zip` of all files is saved.
4. **US4 — info pages**: navigate Home/Download/FAQ/About from the nav; disable JS and confirm pages
   still render and navigation works (download page shows the "JavaScript required" message).

## Accessibility & performance gates (must pass before "done")

- Keyboard-only pass: tab through input → format/quality → start → cancel/retry with visible focus.
- Screen-reader pass on the download flow states.
- `npm run test:a11y` and `npm run test:perf` both green (budgets in `lighthouserc.json`).
