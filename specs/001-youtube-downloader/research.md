# Phase 0 Research: Modern YouTube Downloader Website

**Feature**: `001-youtube-downloader` | **Date**: 2026-05-30

This document resolves the open technical decisions for the static front-end. All choices are
constrained by the project constitution (Static-First, A11y AA, Performance Budgets, Progressive
Enhancement, Simplicity/YAGNI, Test Discipline) and the spec's clarified decisions.

---

## R1. Static site framework

- **Decision**: **Astro 4.x** with `output: 'static'`, TypeScript, and the islands architecture.
- **Rationale**:
  - Ships **zero JavaScript by default** — directly serves the ≤150KB JS budget (Principle III).
  - Multi-page (MPA) model fits the four required pages (FR-002) with shared layout/components.
  - Server-renders HTML at build time → content/nav available **without JS** (Principle IV).
  - Built-in scoped styles and View Transitions enable a "sleek" feel without a heavy framework.
  - Islands let us add interactivity only where needed (the download flow), keeping pages static.
- **Alternatives considered**:
  - *Next.js static export* — larger baseline JS (React runtime), conflicts with the JS budget and
    "prefer the platform" (Principle V). Rejected.
  - *SvelteKit static adapter* — small bundles and good DX, viable, but Astro's zero-JS MPA default
    is a closer fit for a mostly-content site. Rejected as marginally heavier for this use case.
  - *Plain HTML/CSS/JS* — simplest, but shared nav/branding across 4 pages plus an interactive
    widget means hand-rolling templating and bundling. Astro gives that with negligible cost.

## R2. Styling approach

- **Decision**: **Native CSS** with custom properties (design tokens) + Astro scoped component
  styles. No CSS framework.
- **Rationale**: Keeps shipped CSS tiny and fully controlled (Principles III, V). Modern CSS
  (custom properties, `clamp()` type scale, container queries, `prefers-reduced-motion`) is enough
  for a distinctive, responsive, accessible design (FR-018, FR-021, Principle II).
- **Alternatives considered**: *Tailwind* — fast to author and purges unused classes, but adds a
  build dependency and utility-class noise; rejected to honor YAGNI. *Component CSS-in-JS* —
  requires a runtime/framework; rejected (conflicts with zero-JS default).

## R3. Interactivity model (the download flow)

- **Decision**: A single **vanilla TypeScript island** (`downloader.ts`) that enhances a real HTML
  `<form>`. Use a ~4KB Preact island **only if** state complexity demands it (decided during tasks).
- **Rationale**: The link input is a genuine `<form>` so it degrades gracefully (Principle IV). The
  island progressively enhances it to call the extraction service, render previews, and show
  progress without a full-page reload. Vanilla TS keeps the JS budget minimal (Principle V).
- **Alternatives considered**: Shipping React/Vue for the whole app — rejected (budget + PE).

## R4. Extraction service integration

- **Decision**: Treat the **self-hosted yt-dlp service as an external HTTP dependency** defined by
  `contracts/extraction-service.md`. The site calls it via `PUBLIC_DOWNLOADER_API` (a public base
  URL). The service performs link resolution, format enumeration, MP4/MP3 conversion, metadata
  embedding, and playlist ZIP packaging.
- **Rationale**: Per spec clarification (2026-05-30), the backend is a separate, out-of-scope
  component; the site only consumes its contract. Server-side extraction is unavoidable for full
  quality + MP3 + anti-bot handling (see web research below).
- **Key integration constraints**:
  - The service MUST be reachable from the browser **without a client-embedded secret** and MUST
    set permissive **CORS** for the site origin (Principle I forbids shipping secrets). Abuse
    protection (rate limits, allow-listing) is the service's responsibility, not the static site's.
  - The service SHOULD expose an **async job model** (create job → poll/stream status → fetch
    result) so the UI can show per-item and overall progress (FR-013) and handle large playlists
    without HTTP timeouts (FR-011, no-cap clarification).
- **Reference implementations surveyed** (for the separate service team):
  [yt-dlp](https://github.com/yt-dlp/yt-dlp) (engine),
  [yt-dlp-host](https://github.com/Vasysik/yt-dlp-host) (REST, `/get_video` `/get_audio`, MP4/MP3),
  [youtube-dl-server](https://awesome-docker-compose.com/youtube-dl-server) (queue + metadata API),
  [ytdl-server](https://pypi.org/project/ytdl-server/) (ffmpeg post-processing).
- **Alternatives considered**: *Third-party hosted API (RapidAPI etc.)* — rejected during spec
  clarification due to reliability/longevity, possible activity logging, and the need to hide an API
  key (which a static bundle cannot do). *Browser-only extraction* — infeasible (CORS, no ffmpeg,
  YouTube anti-bot).

## R5. Progress reporting transport

- **Decision**: **Poll** `GET /jobs/{id}` on a short interval for status/progress; treat
  Server-Sent Events as an optional future enhancement if the service supports it.
- **Rationale**: Polling is the simplest reliable mechanism, works through CDNs/proxies, and needs
  no persistent connection (Principle V). It satisfies the per-item + overall progress requirement
  (FR-013) for both single and playlist (ZIP packaging) jobs.
- **Alternatives considered**: *WebSocket* — overkill and adds connection-management complexity.
  *SSE* — good fit but optional; we design the contract so SSE can be added without UI rework.

## R6. File delivery to the browser

- **Decision**: When a job completes, the service exposes the result at `GET /jobs/{id}/file`; the
  UI triggers the download via an anchor with `download` attribute (single MP4/MP3) or the same for
  the playlist **ZIP**. Large files stream from the service; the browser handles saving.
- **Rationale**: Keeps memory use low (no buffering large blobs in JS), works for uncapped playlist
  ZIPs (no-cap clarification), and needs no client-side archiving. The service does the zipping
  (FR-011).
- **Alternatives considered**: *Client-side ZIP (e.g., zip.js)* — would pull large per-file blobs
  into the browser and bloat the JS bundle; rejected.

## R7. Accessibility tooling & approach

- **Decision**: Semantic HTML first; **`@axe-core/playwright`** runs against every page in CI;
  manual keyboard + screen-reader pass is part of Definition of Done (constitution §Workflow).
- **Rationale**: Principle II is NON-NEGOTIABLE and a release gate; automated axe checks catch
  regressions, manual passes catch what automation can't (focus order, SR semantics).
- **Targets**: WCAG 2.1 AA — keyboard operability of input/format/quality/download (SC-008),
  visible focus, AA contrast, accessible names (FR-019).

## R8. Performance budget enforcement

- **Decision**: **Lighthouse CI** (`lighthouserc.json`) asserts LCP ≤ 2.5s, TBT ≤ 200ms, CLS ≤ 0.1,
  and resource-size budgets (JS ≤ 150KB, total initial ≤ 500KB gzipped). Build fails on breach.
- **Rationale**: Makes Principle III a testable CI gate, not an aspiration. Images use modern
  formats with explicit dimensions to protect CLS.
- **Alternatives considered**: *Manual Lighthouse runs* — not enforceable; rejected.

## R9. Testing stack

- **Decision**: **Vitest** for unit/logic (`link-utils`, `api-client`, `config`), **Playwright**
  for end-to-end user-story journeys + axe a11y, **Lighthouse CI** for perf. Single documented
  command runs locally and in CI (constitution Principle VI).
- **Rationale**: Matches the three things the constitution requires CI to enforce (tests, a11y,
  perf). The extraction service is **mocked** in e2e so the front-end is testable without a live
  backend.

## R10. Configuration & secret posture

- **Decision**: `PUBLIC_DOWNLOADER_API` is the only required config — a public base URL, injected at
  build/runtime. No secrets in the repo or bundle. `src/lib/config.ts` validates its presence and
  fails fast in dev if missing.
- **Rationale**: Principle I forbids secrets in the client; the chosen architecture deliberately
  uses a secret-free public endpoint so this holds.

---

## Resolved unknowns

All Technical Context items are resolved; **no `NEEDS CLARIFICATION` markers remain**. Items
intentionally left to the separate extraction-service team (its internal implementation, hosting,
proxy/cookie strategy, and abuse controls) are out of scope for this static-site plan and are
bounded by `contracts/extraction-service.md`.
