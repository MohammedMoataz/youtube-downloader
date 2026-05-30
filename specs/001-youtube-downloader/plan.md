# Implementation Plan: Modern YouTube Downloader Website

**Branch**: `001-youtube-downloader` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-youtube-downloader/spec.md`

## Summary

Build a sleek, modern, **static** multi-page website (Home, Download, FAQ, About) that lets a
visitor paste a YouTube video or playlist link and download it as MP4 (up to 1080p) or MP3 (with
embedded metadata: title, author/channel, thumbnail). Playlists are delivered as a single ZIP with
no size cap. All extraction/conversion is performed by a **separate, self-hosted yt-dlp–based
service** that the static site calls via a configurable runtime endpoint; the site itself ships no
server code or secrets, honoring the project constitution. Technical approach: Astro static output
+ TypeScript, native CSS design system, progressive-enhancement islands for the interactive
download flow, and a CI pipeline enforcing accessibility (WCAG 2.1 AA) and performance budgets.

## Technical Context

**Language/Version**: TypeScript 5.x; HTML5 / modern CSS

**Primary Dependencies**: Astro 4.x (static `output: 'static'`); native `fetch`; no UI framework
required (vanilla TS islands; a ~4KB Preact island permitted only if the download widget's state
warrants it). No CSS framework — native CSS with custom properties (design tokens).

**Storage**: Browser only — `sessionStorage` to carry the entered link from Home → Download. No
persistence, no accounts, no cookies for app state.

**Testing**: Vitest (unit/component logic), Playwright (end-to-end + `@axe-core/playwright` for
accessibility), Lighthouse CI (performance & best-practices budgets).

**Target Platform**: Static hosting / CDN (e.g., Cloudflare Pages, Netlify, Vercel static, GitHub
Pages). Modern evergreen browsers, mobile + desktop.

**Project Type**: Static multi-page web front-end (single project at repo root). The extraction
service is a **separate component**, out of scope here; this plan only consumes its HTTP contract.

**Performance Goals**: LCP ≤ 2.5s (throttled mobile), TBT ≤ 200ms, CLS ≤ 0.1 (constitution
Principle III). Initial JS ≤ 150KB gzipped; total initial transfer ≤ 500KB gzipped.

**Constraints**:
- No backend code or secrets in the deployed bundle (constitution Principle I).
- The extraction service MUST be callable from the browser **without a client-embedded secret**
  (CORS-allowed for the site origin); abuse/rate-limiting is the service's responsibility.
- Extraction-service base URL supplied via a public build/runtime variable (`PUBLIC_DOWNLOADER_API`).
- Informational pages and navigation MUST render without JavaScript (Principle IV); the download
  action itself is a JS-enhanced island with a clear no-JS fallback message.

**Scale/Scope**: 4 pages; ~1 interactive download flow (single + playlist); anonymous traffic.
Video quality capped at 1080p; playlists uncapped (delivered as one ZIP).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` v1.0.0.

| # | Principle | Compliance in this plan | Status |
|---|-----------|-------------------------|--------|
| I | Static-First, No Backend or Secrets | Astro static output; zero server code in bundle; extraction is a separate service called via `PUBLIC_DOWNLOADER_API`; no secrets shipped | ✅ PASS |
| II | Accessibility (NON-NEGOTIABLE) | Semantic HTML, keyboard-operable controls, AA contrast; enforced by `@axe-core/playwright` + manual keyboard/SR pass in DoD | ✅ PASS |
| III | Performance Budgets | Astro ships ~0 baseline JS; budgets enforced by Lighthouse CI (LCP/TBT/CLS + JS/transfer size) | ✅ PASS |
| IV | Progressive Enhancement | All pages + nav + FAQ/About render without JS; link `<form>` works as a real form; download flow is a JS island with no-JS messaging | ✅ PASS (see note) |
| V | Simplicity & YAGNI | Astro + native CSS + native fetch; no CSS framework, no SPA framework; deps justified below | ✅ PASS |
| VI | Test Discipline | Vitest + Playwright(+axe) + Lighthouse CI; a11y & perf wired into CI, not just manual | ✅ PASS |

**Note on Principle IV**: The *download action* inherently requires JavaScript and a network call
to the extraction service, so it cannot be fully no-JS. This is an accepted, scoped enhancement:
the site remains navigable and informational without JS, the input is a real submittable form, and
a visible message explains that downloading requires JavaScript when it is disabled. This does not
violate the principle (core *content* is available; *one interactive feature* is enhanced).

**Result**: No unjustified violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-youtube-downloader/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── extraction-service.md   # HTTP contract the site expects from the yt-dlp service
│   └── ui-pages.md             # Page/route + UI-state contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── pages/                 # Astro routes (one file per page)
│   ├── index.astro        # Landing page with the featured link input
│   ├── download.astro     # Download page (results + format/quality selection)
│   ├── faq.astro          # FAQ page
│   └── about.astro        # About page
├── components/            # Reusable .astro components
│   ├── SiteHeader.astro   # Shared branding + navigation
│   ├── SiteFooter.astro   # Footer + responsible-use notice
│   ├── LinkInput.astro    # Featured input (real <form>, enhanced by island)
│   ├── MediaPreview.astro # Title/thumbnail/author/duration display
│   ├── FormatPicker.astro # MP4 quality + MP3 selection
│   └── DownloadProgress.astro # Per-item + overall progress UI
├── islands/               # Client-side TS that enhances the static pages
│   ├── downloader.ts      # Orchestrates resolve → job → progress → download
│   ├── api-client.ts      # Typed wrapper around the extraction-service contract
│   └── link-utils.ts      # Detect/validate video vs. playlist links
├── styles/
│   ├── tokens.css         # Design tokens (color, type scale, spacing, motion)
│   └── global.css         # Base + layout + component styles
├── layouts/
│   └── BaseLayout.astro   # <head>, skip-link, header/footer, view transitions
└── lib/
    └── config.ts          # Reads PUBLIC_DOWNLOADER_API, exposes typed config

public/                    # Static assets (favicon, og image, fonts if self-hosted)

tests/
├── unit/                  # Vitest: link-utils, api-client, config
├── e2e/                   # Playwright: user journeys per user story
└── a11y/                  # Playwright + axe: per-page accessibility checks

astro.config.mjs
tsconfig.json
package.json
lighthouserc.json         # Performance budgets for Lighthouse CI
playwright.config.ts
```

**Structure Decision**: Single static Astro project at the repository root. Routes map 1:1 to the
four required pages (FR-002). Interactivity is isolated to `src/islands/*` so the bulk of each page
is static HTML/CSS (satisfies Principles III & IV). The extraction service lives in its own repo
and is consumed only through `contracts/extraction-service.md`.

## Complexity Tracking

> No constitution violations require justification. This section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
