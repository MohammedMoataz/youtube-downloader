# Phase 1 Data Model: Modern YouTube Downloader Website

**Feature**: `001-youtube-downloader` | **Date**: 2026-05-30

These are **client-side view models** — the typed shapes the static front-end holds in memory and
exchanges with the extraction service. The site persists nothing server-side; the only browser
storage is a transient `sessionStorage` value carrying the entered link from Home → Download.

---

## Entity: MediaLink

The visitor's submitted reference, after client-side validation/classification.

| Field | Type | Notes |
|-------|------|-------|
| `raw` | string | Exactly what the visitor typed |
| `kind` | `'video' \| 'playlist' \| 'invalid'` | Determined by `link-utils` (FR-003) |
| `id` | string \| null | Extracted video or playlist id when valid |

**Validation rules**: `kind` is `invalid` unless `raw` matches a recognized YouTube video or
playlist URL form. Invalid links never advance to a request (FR-003, edge case "invalid link").

## Entity: MediaItem

A single resolvable video (standalone, or one entry within a playlist).

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Video id |
| `title` | string | FR-004 |
| `author` | string | Channel/author (FR-004) |
| `thumbnailUrl` | string | Preview + MP3 cover art source (FR-004, FR-008) |
| `durationSeconds` | number | FR-004 |
| `qualities` | `QualityOption[]` | MP4 options ≤ 1080p (FR-006) |
| `audioAvailable` | boolean | Whether MP3 can be produced (FR-007) |

**Rules**: `qualities` contains only resolutions **≤ 1080p** (clarification 2026-05-30); items above
1080p are filtered out. If `qualities` is empty but `audioAvailable`, the UI still offers MP3 (edge
case "no qualities available").

## Entity: QualityOption

One selectable MP4 variant for a `MediaItem`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Service-specific format id passed back when requesting a job |
| `label` | string | e.g., "1080p", "720p" |
| `heightPx` | number | ≤ 1080 |
| `container` | `'mp4'` | This version only delivers MP4 video |

## Entity: AudioSelection (derived)

Represents an MP3 request for a `MediaItem`. Not stored; constructed when the visitor picks MP3.

| Field | Type | Notes |
|-------|------|-------|
| `format` | `'mp3'` | Only audio format this version supports |
| `embedMetadata` | `true` | Always embed available title/author/thumbnail (FR-008, FR-009) |

## Entity: Playlist

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Playlist id |
| `title` | string | FR-010 |
| `items` | `MediaItem[]` | Ordered; **uncapped** (clarification 2026-05-30) |
| `count` | number | Total items (FR-010) |

## Entity: DownloadRequest (sent to service)

| Field | Type | Notes |
|-------|------|-------|
| `source` | `'video' \| 'playlist'` | |
| `id` | string | Video or playlist id |
| `format` | `'mp4' \| 'mp3'` | FR-005, FR-007 |
| `qualityId` | string \| null | Required when `format === 'mp4'`; null for mp3 |

## Entity: DownloadJob (client view of service job)

| Field | Type | Notes |
|-------|------|-------|
| `jobId` | string | Returned by the service on creation |
| `status` | `'queued' \| 'running' \| 'completed' \| 'failed' \| 'canceled'` | |
| `overallProgress` | number (0–100) | Drives the overall bar (FR-013) |
| `items` | `JobItemStatus[]` | Per-item rows for playlists (FR-011, FR-012) |
| `resultKind` | `'file' \| 'zip' \| null` | `zip` for playlists (clarification 2026-05-30) |
| `resultUrl` | string \| null | `GET /jobs/{id}/file` when completed (R6) |
| `error` | string \| null | User-facing message on failure (FR-014) |

### Sub-shape: JobItemStatus

| Field | Type | Notes |
|-------|------|-------|
| `itemId` | string | Maps to a `MediaItem.id` |
| `title` | string | |
| `status` | `'pending' \| 'running' \| 'done' \| 'failed'` | Failed items don't abort the batch (FR-012) |
| `progress` | number (0–100) | |

### State transitions (DownloadJob.status)

```text
queued ──▶ running ──▶ completed
   │           │
   │           └──▶ failed        (whole job failed)
   └────────────▶ canceled        (visitor canceled large batch — FR-022)

Per item: pending ──▶ running ──▶ done | failed
(a failed item leaves the job running; job completes with partial success — FR-012)
```

## Entity: AppConfig

| Field | Type | Notes |
|-------|------|-------|
| `downloaderApiBase` | string (URL) | From `PUBLIC_DOWNLOADER_API`; validated at startup (R10) |

---

## Relationships

```text
MediaLink ──classifies──▶ (MediaItem | Playlist | invalid)
Playlist  ──contains 1..*─▶ MediaItem
MediaItem ──offers 0..*──▶ QualityOption        (MP4, ≤1080p)
MediaItem ──may offer────▶ AudioSelection        (MP3 + metadata)
DownloadRequest ──creates─▶ DownloadJob
DownloadJob ──has 1..*────▶ JobItemStatus         (playlist batches)
```
