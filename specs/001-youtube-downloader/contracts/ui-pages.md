# Contract: UI Pages & Routes

**Feature**: `001-youtube-downloader` | **Date**: 2026-05-30

Defines the page routes the site exposes and the observable UI-state contract for the interactive
download flow. This is the "interface the application exposes to its users" (per plan Phase 1).

## Routes (FR-002)

| Route | Page | Purpose | No-JS behavior |
|-------|------|---------|----------------|
| `/` | Landing | Featured link input (FR-001); brand/hero | Renders fully; input is a real `<form>` that submits to `/download?url=` |
| `/download` | Download | Preview + format/quality selection + progress | Renders shell + responsible-use notice; shows "JavaScript required to download" message when JS off (Principle IV note) |
| `/faq` | FAQ | Supported links, formats, qualities, responsible use (FR-015) | Fully static |
| `/about` | About | What the service is + responsible-use stance (FR-016) | Fully static |

Shared across all routes: `SiteHeader` (branding + nav to all 4 pages), `SiteFooter` (responsible-
use / legal notice, FR-017). Consistent visual identity (FR-021).

## Landing → Download handoff

- The landing input submits the link. The enhanced path stores the raw link in `sessionStorage`
  and navigates to `/download`; the no-JS path submits the form to `/download?url=<encoded>`.
- `/download` reads the link from `sessionStorage` or the `url` query param, then (with JS) calls
  `POST /resolve`.

## Download flow — observable states (FR-013, FR-014)

```text
[idle/empty] ──submit link──▶ [validating]
   [validating] ──invalid──▶ [error: invalid link]            (FR-003)
   [validating] ──valid────▶ [resolving]
[resolving] ──ok (video)────▶ [preview: video + formats]
[resolving] ──ok (playlist)─▶ [preview: playlist list + count]
[resolving] ──unavailable───▶ [error: reason + retry]         (edge cases)
[preview] ──choose format/quality + start──▶ [downloading]
[downloading] ──progress poll──▶ updates per-item + overall   (FR-011, FR-012)
[downloading] ──completed────▶ [done: file/ZIP download triggered]
[downloading] ──failed───────▶ [error: message + retry]       (FR-014)
[downloading] ──cancel───────▶ [canceled]                     (FR-022, large playlist)
```

### State contract requirements

- Every non-instant state (`validating`, `resolving`, `downloading`) MUST show visible progress or
  busy feedback (FR-013) — no frozen/blank screens.
- Every error state MUST present a human-readable message and a retry affordance **without losing
  the entered link** (FR-014).
- A very large playlist MUST show a pre-start warning (longer wait, larger archive) and expose a
  cancel control during `downloading` (FR-022).
- MP3 selection MUST surface the detected metadata (title, author, thumbnail) for confirmation
  before/at download (FR-008).
- All interactive controls (input, format/quality picker, start, cancel, retry) MUST be keyboard-
  operable with visible focus and accessible names (FR-019, SC-008).

## Acceptance mapping

| User Story | Primary route(s) | Key states |
|------------|------------------|------------|
| US1 — single MP4 | `/` → `/download` | resolving → preview(video) → downloading → done |
| US2 — MP3 + metadata | `/download` | preview(video) → (mp3 selected, metadata shown) → done |
| US3 — playlist ZIP | `/` → `/download` | preview(playlist) → downloading(per-item) → done(zip) |
| US4 — info pages | `/faq`, `/about` | static render + nav |
