# GrabTube — YouTube Downloader (static front-end)

A sleek, **static** website to download YouTube videos as **MP4** (up to 1080p) or extract **MP3**
audio with embedded metadata (title, author, cover art). Paste a single video or a whole playlist
(delivered as one ZIP). The site ships **no backend and no secrets** — it calls a separate,
self-hosted yt-dlp extraction service via a configurable public endpoint.

Built per the spec in [`specs/001-youtube-downloader/`](specs/001-youtube-downloader/) following the
project [constitution](.specify/memory/constitution.md).

## Stack

- **Astro** (static output) + **TypeScript**, native CSS design tokens — minimal shipped JS.
- Progressive enhancement: pages/nav work without JS; the download flow is a JS island.
- Tests: **Vitest** (unit), **Playwright** + **@axe-core/playwright** (e2e + a11y), **Lighthouse CI** (perf).

## Quickstart

```bash
npm install
cp .env.example .env          # set PUBLIC_DOWNLOADER_API (mock or self-hosted service)
npm run mock-api              # terminal 1: local extraction-service mock (http://localhost:8787)
npm run dev                   # terminal 2: Astro dev server (http://localhost:5173)
```

Production build (static):

```bash
npm run build && npm run preview
```

Deploy the `dist/` folder to any static host/CDN. No server runtime required.

## Run the full stack with Docker (front-end + backend)

`docker-compose.yml` brings up the **backend extraction service first** (it must report healthy)
and then the **static front-end**. It requires the backend repo checked out as a sibling
directory `../grabtube-extraction-service`.

```bash
docker compose up --build        # build + run (Ctrl+C to stop)
docker compose up --build -d     # detached
docker compose down              # stop & remove
```

Then open:

- **Front-end:** http://localhost:8088
- **Backend:**  http://localhost:8080  (health: `/health`)

How it's wired (important for static front-ends):

- The front-end is static, so `PUBLIC_DOWNLOADER_API` is **baked at image-build time** (a build
  arg) and points at the **host-published** backend `http://localhost:8080` — *not* the compose
  service name, because the browser runs on your host, outside the compose network.
- The browser origin is `http://localhost:8088`, so the backend is started with
  `GT_CORS_ORIGINS=http://localhost:8088`.

To change ports/origins, edit `docker-compose.yml` (`frontend.ports`, `extractor.environment`,
and the `PUBLIC_DOWNLOADER_API` build arg) together so the three stay consistent. For real
deployment, serve both over HTTPS behind a reverse proxy and set the origins/URLs accordingly.

## Testing

```bash
npm test            # unit + build + e2e + a11y
npm run test:unit   # Vitest
npm run test:e2e    # Playwright journeys (needs: npx playwright install)
npm run test:a11y   # axe (WCAG 2.1 AA)
npm run test:perf   # Lighthouse CI budgets
```

> First Playwright run: `npx playwright install` to download browsers.

## Configuration

| Variable | Purpose |
|----------|---------|
| `PUBLIC_DOWNLOADER_API` | Base URL of the extraction service. **Public, no secret.** |

The extraction service must implement [`contracts/extraction-service.md`](specs/001-youtube-downloader/contracts/extraction-service.md)
and allow CORS from the site origin (it does its own rate-limiting/abuse protection).

## Security / hosting notes (constitution §Security)

When deploying the static site, configure at the host/CDN:

- **HTTPS only** (HSTS recommended).
- A **Content-Security-Policy**, e.g.:
  `default-src 'self'; img-src 'self' https: data:; connect-src 'self' <PUBLIC_DOWNLOADER_API origin>; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` to disable unused features.

No personal data is collected; the entered link stays in the browser.

## Responsible use

You are responsible for complying with applicable copyright law and the terms of service of any
platform you download from. GrabTube does not host, store, or distribute copyrighted content.
