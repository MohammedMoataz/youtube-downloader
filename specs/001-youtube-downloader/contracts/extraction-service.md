# Contract: Extraction Service HTTP API

**Feature**: `001-youtube-downloader` | **Date**: 2026-05-30

This is the contract the **static front-end expects** from the separate, self-hosted yt-dlp–based
extraction service. The service itself is **out of scope** for this project; this document is the
boundary. Base URL is provided to the site via `PUBLIC_DOWNLOADER_API`.

## Cross-cutting requirements

- **CORS**: The service MUST allow the site origin (`Access-Control-Allow-Origin`) and the methods
  below. No client-embedded secret is used (constitution Principle I).
- **Auth**: None from the browser. Any abuse protection (rate limiting, origin allow-listing) is
  enforced server-side and MUST surface as HTTP `429` with a JSON error the UI can display.
- **Content type**: JSON request/response unless downloading a file.
- **Errors**: Non-2xx responses return `{ "error": { "code": string, "message": string } }`.
  `message` is safe to show to the visitor (FR-014).
- **Quality cap**: The service MUST NOT return video formats above 1080p (clarification 2026-05-30),
  or the site will filter them; returning ≤1080p is preferred.

---

## 1. Resolve a link

`POST /resolve`

Resolves a video or playlist link into metadata + available formats (FR-003, FR-004, FR-006,
FR-010).

**Request**
```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

**Response 200 — single video**
```json
{
  "kind": "video",
  "item": {
    "id": "abc123",
    "title": "Example",
    "author": "Channel Name",
    "thumbnailUrl": "https://.../hq.jpg",
    "durationSeconds": 372,
    "audioAvailable": true,
    "qualities": [
      { "id": "137", "label": "1080p", "heightPx": 1080, "container": "mp4" },
      { "id": "136", "label": "720p",  "heightPx": 720,  "container": "mp4" }
    ]
  }
}
```

**Response 200 — playlist**
```json
{
  "kind": "playlist",
  "playlist": {
    "id": "PL123",
    "title": "My Playlist",
    "count": 250,
    "items": [ { "id": "abc123", "title": "...", "author": "...", "thumbnailUrl": "...", "durationSeconds": 200, "audioAvailable": true, "qualities": [] } ]
  }
}
```

**Error responses**: `400` invalid/unsupported URL · `404` content unavailable (private, deleted,
region-blocked) · `422` live/upcoming stream not supported · `429` rate limited. (Maps to spec
edge cases.)

---

## 2. Create a download job

`POST /jobs`

Starts producing an MP4/MP3 file (single) or a ZIP (playlist) (FR-005, FR-007, FR-011).

**Request**
```json
{ "source": "video", "id": "abc123", "format": "mp4", "qualityId": "137" }
```
`qualityId` is required when `format` is `mp4`, and MUST be omitted/null for `mp3`. For
`source: "playlist"`, the service processes **all** items (no cap) and produces a ZIP.

**Response 202**
```json
{ "jobId": "job_789", "status": "queued" }
```

**Errors**: `400` bad request (e.g., mp4 without `qualityId`) · `429` rate limited.

---

## 3. Poll job status

`GET /jobs/{jobId}`

Drives progress UI (FR-013) and per-item status for playlists (FR-012).

**Response 200**
```json
{
  "jobId": "job_789",
  "status": "running",
  "overallProgress": 42,
  "resultKind": null,
  "resultUrl": null,
  "error": null,
  "items": [
    { "itemId": "abc123", "title": "...", "status": "done",    "progress": 100 },
    { "itemId": "def456", "title": "...", "status": "running", "progress": 30 },
    { "itemId": "ghi789", "title": "...", "status": "failed",  "progress": 0 }
  ]
}
```
On completion: `status: "completed"`, `overallProgress: 100`, `resultKind: "file" | "zip"`, and a
populated `resultUrl`. A failed individual item keeps the job running and is reported in `items`
(FR-012). For single-video jobs, `items` MAY be omitted or contain one entry.

---

## 4. Download the result

`GET /jobs/{jobId}/file`

Streams the produced MP4, MP3, or playlist ZIP. The MP3 MUST have embedded metadata (title,
author, cover artwork, and any available extra fields) (FR-008, FR-009).

- `Content-Type`: `video/mp4` | `audio/mpeg` | `application/zip`
- `Content-Disposition: attachment; filename="..."` (the UI relies on this for the saved filename)
- Response streams; large playlist ZIPs are supported (R6, no-cap clarification).

---

## 5. Cancel a job (large batches)

`POST /jobs/{jobId}/cancel`

Allows canceling an in-progress playlist batch (FR-022).

**Response 200**: `{ "jobId": "job_789", "status": "canceled" }`

---

## Contract test obligations (front-end side)

The front-end's `api-client` MUST be covered by tests (mocked HTTP) verifying:
- `/resolve` happy paths for video and playlist, and each error code → correct user-facing message.
- mp4 job requires `qualityId`; mp3 job omits it.
- polling transitions `queued → running → completed` and surfaces `resultUrl`.
- a `failed` item does not stop the UI from completing the batch.
- 1080p cap: any returned format > 1080p is filtered out client-side as a safety net.
