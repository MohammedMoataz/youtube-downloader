# Feature Specification: Modern YouTube Downloader Website

**Feature Branch**: `001-youtube-downloader`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "I am building a modern youtube-downloader website. I want it to look sleek, something that would stand out. Should have a landing page with one featured input to enter the youtube video link. there should be a downloading page, FAQ page, and an about page. should also enable to get a video link to download it or playlist link to download all of its videos. We need to enable download as an audio .mp3 format or video with variety of available qualities .mp4 format. also, if .mp3 format we need to get all available data of the audio downloaded from video like thumb, or author, etc..."

## Clarifications

### Session 2026-05-30

- Q: Where does the actual extraction/conversion happen, and is building the backend in scope for this project? → A: A self-hosted extraction service (yt-dlp–based) is used as a **separate backend component**; the website itself remains a static front-end that calls the service via a configurable runtime endpoint. The backend is a distinct deployable and is **out of scope for this website project**, so the project constitution's Static-First principle remains unchanged.
- Q: How are playlist downloads delivered to the visitor? → A: As a **single ZIP archive** containing all the playlist's files in the chosen format; the overall progress indicator reflects packaging/zipping progress.
- Q: What is the maximum number of videos a single playlist download will process? → A: **No fixed limit** — the entire playlist is processed regardless of size. For very large playlists the visitor is warned about longer processing time and a larger archive, and clear progress is shown throughout.
- Q: What is the highest video quality the site will offer? → A: **Capped at 1080p (Full HD)**. The site offers the qualities the source provides up to a 1080p ceiling; resolutions above 1080p (e.g., 1440p/4K/8K) are not offered in this version.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download a single video as MP4 (Priority: P1)

A visitor lands on the home page, pastes a YouTube video link into the prominent input, and is
taken to a download page that shows the video's details and the available video qualities. The
visitor picks a quality and downloads the video as an MP4 file.

**Why this priority**: This is the core promise of the product and the smallest slice that
delivers real value. Without it, nothing else matters. It is a complete, demonstrable MVP on its
own.

**Independent Test**: Paste a valid single-video link, confirm the page shows the video title,
thumbnail, and a list of selectable qualities, choose one, and verify an MP4 file is produced and
saved to the device.

**Acceptance Scenarios**:

1. **Given** the home page is open, **When** the visitor pastes a valid YouTube video link and
   submits it, **Then** the download page opens showing the video title, thumbnail, channel/author,
   and duration.
2. **Given** the download page shows a video, **When** the visitor selects MP4 and an available
   quality, **Then** the system prepares the file and the download begins, ending in a playable
   MP4 saved to the visitor's device.
3. **Given** a video offers several qualities, **When** the visitor opens the quality selector,
   **Then** only qualities actually available for that video are listed, each labeled with its
   resolution.

---

### User Story 2 - Download audio as MP3 with full metadata (Priority: P2)

A visitor wants only the audio. After entering a video link, they choose the MP3 option and
download an audio file that already carries the video's metadata — title, author/channel, and
cover artwork (thumbnail) — so it appears correctly in their music library.

**Why this priority**: Audio extraction is the second most-requested use case and a key
differentiator, but it builds on the same link-and-fetch flow as P1, so it follows it.

**Independent Test**: Enter a valid video link, choose MP3, download the file, and verify it plays
as audio and that its embedded metadata shows the correct title, author, and cover image.

**Acceptance Scenarios**:

1. **Given** a video's details are displayed, **When** the visitor selects the MP3 option, **Then**
   the system presents the audio download with the detected metadata (title, author/channel,
   thumbnail, duration, and any available album/year info) shown for confirmation.
2. **Given** the visitor downloads an MP3, **When** they open the file in a media player or music
   library, **Then** the title, author, and cover artwork are present and correct.
3. **Given** a video is missing some metadata fields, **When** the MP3 is produced, **Then**
   available fields are embedded and missing fields are omitted without blocking the download.

---

### User Story 3 - Download an entire playlist (Priority: P3)

A visitor pastes a playlist link instead of a single video. The system lists the videos in the
playlist and lets the visitor download all of them in the chosen format (MP4 quality or MP3),
with clear progress for the batch.

**Why this priority**: Playlist support is a powerful convenience feature, but it is an extension
of the single-item flow and only valuable once single downloads work reliably.

**Independent Test**: Paste a valid playlist link, confirm the list of contained videos appears
with a total count, choose a format, start the batch, and verify each video downloads in the
selected format with visible per-item and overall progress.

**Acceptance Scenarios**:

1. **Given** a playlist link is entered, **When** the system recognizes it as a playlist, **Then**
   it displays the playlist title and the list of videos with a total count.
2. **Given** a playlist is displayed, **When** the visitor chooses a format and starts the
   download, **Then** each video is processed in turn with per-item status and an overall progress
   indicator, and the result is delivered as a single ZIP archive containing all files.
3. **Given** one video in a playlist fails or is unavailable, **When** the batch runs, **Then**
   that item is reported as failed and the remaining items continue without aborting the whole
   batch.

---

### User Story 4 - Learn about the service via informational pages (Priority: P3)

A visitor who is unsure how the service works or whether it is safe/legal to use can read a FAQ
page and an About page that explain usage, supported links, formats, and responsible-use
guidance.

**Why this priority**: These pages build trust and reduce support load, but they are supporting
content rather than the core download capability.

**Independent Test**: Navigate to the FAQ and About pages from any page, and confirm each renders
its content and that navigation between all pages (Home, Download, FAQ, About) works.

**Acceptance Scenarios**:

1. **Given** any page is open, **When** the visitor uses the site navigation, **Then** they can
   reach Home, Download, FAQ, and About pages.
2. **Given** the FAQ page is open, **When** the visitor reads it, **Then** it answers common
   questions about supported links, formats, qualities, and responsible/legal use.
3. **Given** the About page is open, **When** the visitor reads it, **Then** it explains what the
   service does and its responsible-use position.

---

### Edge Cases

- **Invalid or malformed link**: The visitor enters text that is not a recognizable YouTube video
  or playlist link → the system shows a clear, friendly validation message and does not proceed.
- **Unavailable content**: The link is valid but the content is private, age-restricted, region-
  blocked, deleted, or otherwise unavailable → the system explains why the download cannot proceed.
- **Live or upcoming streams**: The link points to a live or scheduled stream → the system informs
  the visitor that such content is not supported (or only supported after it ends).
- **Very large playlist**: A playlist contains a very large number of videos → there is no hard
  item cap; the system warns the visitor that processing will take longer and produce a larger
  archive, shows clear per-item and overall progress, and lets the visitor cancel the batch.
- **Extraction/processing failure**: The underlying retrieval fails mid-way → the system reports a
  clear error and lets the visitor retry without losing their entered link.
- **Slow source / timeout**: Fetching details or preparing a file takes too long → the visitor sees
  progress feedback and a timeout message with a retry option rather than a frozen screen.
- **No qualities available**: A video exposes no downloadable video formats → the system still
  offers audio (MP3) if available, or explains that the content cannot be downloaded.
- **Duplicate / rapid submissions**: The visitor submits repeatedly → the system avoids starting
  redundant duplicate jobs for the same request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST present a landing page with a single, prominent input where a visitor
  can enter a YouTube video or playlist link and submit it.
- **FR-002**: The site MUST provide four navigable pages: a landing/home page, a download page, an
  FAQ page, and an About page, reachable from a consistent site navigation.
- **FR-003**: The system MUST validate the entered link and distinguish between a single-video
  link, a playlist link, and an invalid/unsupported link, giving clear feedback for each case.
- **FR-004**: For a single-video link, the system MUST retrieve and display the video's title,
  thumbnail, author/channel, and duration before download.
- **FR-005**: The system MUST allow downloading a single video as an MP4 file.
- **FR-006**: The system MUST present the list of video qualities actually available for the given
  video — **up to a maximum of 1080p (Full HD)** — and allow the visitor to choose one before
  downloading. Resolutions above 1080p MUST NOT be offered in this version.
- **FR-007**: The system MUST allow downloading the audio of a video as an MP3 file.
- **FR-008**: When producing an MP3, the system MUST embed the available metadata of the source
  video into the file, including at minimum title, author/channel, and cover artwork (thumbnail),
  and additional fields (e.g., duration, album, year) when available.
- **FR-009**: When metadata fields are missing from the source, the system MUST still complete the
  download with the available fields and omit the missing ones, without failing.
- **FR-010**: For a playlist link, the system MUST list the contained videos with the playlist
  title and a total count.
- **FR-011**: The system MUST allow downloading all videos in a playlist in a chosen format (MP4 at
  a selected quality, or MP3), delivered as a **single ZIP archive** containing all files, with
  per-item progress and an overall packaging/zipping progress indicator.
- **FR-012**: The system MUST continue a playlist batch when individual items fail, reporting which
  items failed and which succeeded.
- **FR-013**: The system MUST show progress feedback for any operation that is not effectively
  instantaneous (fetching details, preparing a file, batch downloading).
- **FR-014**: The system MUST present clear, friendly error messages for all failure cases
  identified in Edge Cases, allowing the visitor to retry without re-entering their link.
- **FR-015**: The FAQ page MUST answer common questions covering supported link types, available
  formats and qualities, and responsible/legal use.
- **FR-016**: The About page MUST describe what the service does and its responsible-use position.
- **FR-017**: The site MUST display a responsible-use / legal notice making clear that the visitor
  is responsible for complying with applicable copyright law and the source platform's terms of
  service, and that the service does not host or distribute copyrighted content.
- **FR-018**: The interface MUST be fully usable on both mobile and desktop screen sizes.
- **FR-019**: The interface MUST be accessible to keyboard and assistive-technology users,
  including accessible names for all controls and visible focus indication.
- **FR-020**: The system MUST NOT require the visitor to create an account or sign in to download.
- **FR-021**: The system MUST present a visually distinctive, modern interface consistent across
  all four pages (shared branding, navigation, and visual style).
- **FR-022**: For playlist downloads, the system MUST process the entire playlist with no fixed
  item cap, warn the visitor before starting when a playlist is very large (longer wait, larger
  archive), and allow the visitor to cancel an in-progress batch.

### Key Entities *(include if feature involves data)*

- **Media Link**: A user-submitted reference to YouTube content. Attributes: the raw link, its
  resolved type (single video or playlist), and validity status.
- **Video**: A single downloadable item. Attributes: title, author/channel, thumbnail, duration,
  and the set of available video qualities and audio availability.
- **Quality Option**: One downloadable video variant. Attributes: resolution label and format
  (MP4); the chosen option determines the produced video file.
- **Audio Track**: The extracted audio for a video. Attributes: format (MP3) plus embedded
  metadata (title, author/channel, cover artwork/thumbnail, duration, and optional album/year).
- **Playlist**: A collection of videos referenced by one link. Attributes: playlist title, ordered
  list of contained Videos, and total item count.
- **Download Job**: A single requested download (one video, one audio, or one playlist batch).
  Attributes: requested format/quality, status (pending, in progress, completed, failed), and
  progress; for batches, per-item status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from pasting a single-video link to a completed MP4
  download in 3 steps or fewer (enter link → choose quality → download).
- **SC-002**: After submitting a valid single-video link, the visitor sees the video's details
  (title, thumbnail, author, duration) within 5 seconds under normal conditions.
- **SC-003**: At least 95% of valid, available single-video link submissions result in a successful
  download without an error.
- **SC-004**: 90% of first-time visitors successfully complete a download on their first attempt
  without external help.
- **SC-005**: Downloaded MP3 files carry correct title, author, and cover artwork in 100% of cases
  where the source video provides those fields.
- **SC-006**: For playlists, the visitor can start a full-playlist download in a single action
  after the playlist is displayed, and overall progress is visible throughout.
- **SC-007**: Every error case presents an understandable message and a way to retry, with no dead
  ends or frozen states, in 100% of tested failure scenarios.
- **SC-008**: The interface meets WCAG 2.1 AA, including full keyboard operability of the link
  input, format/quality selection, and download actions.
- **SC-009**: The site is fully usable (input, selection, navigation) on common mobile and desktop
  screen widths with no broken layout.

## Assumptions

- **Static front-end + separate self-hosted extraction service** *(confirmed — see Clarifications
  2026-05-30)*: The website is a static, account-free site that calls a **self-hosted, yt-dlp–based
  extraction service** at runtime via a configurable endpoint. That service handles all retrieval,
  quality enumeration, MP3 conversion, metadata embedding, and playlist expansion. The service is a
  **separate backend component/deployable and is out of scope for this website project**; building
  and operating it is tracked separately. This keeps the constitution's Static-First, No Backend or
  Secrets principle intact for the website bundle (no server code or secrets ship in the site).
- **Anonymous, no-account usage**: Visitors are anonymous; no login, profiles, or saved history are
  in scope for this version.
- **Supported source**: Only YouTube video and YouTube playlist links are in scope. Other platforms
  are out of scope for this version.
- **Quality set is source-driven, capped at 1080p**: The MP4 qualities offered are whichever the
  source video actually provides, **up to a 1080p (Full HD) ceiling** (confirmed — see
  Clarifications 2026-05-30). Resolutions above 1080p are not offered in this version; the site does
  not invent qualities the source lacks.
- **Audio format**: Audio downloads are delivered as MP3 with embedded metadata; other audio
  formats are out of scope for this version.
- **Playlist limit**: There is **no fixed cap** on playlist size — the entire playlist is processed
  regardless of how many videos it contains (confirmed — see Clarifications 2026-05-30). For very
  large playlists the visitor is warned about longer processing time and a larger archive, sees
  clear progress, and can cancel the batch.
- **Live/scheduled content excluded**: Live streams and upcoming/scheduled premieres are not
  supported for download.
- **No DRM circumvention**: The service does not attempt to download content protected by DRM or
  otherwise restricted; such content is reported as unavailable.
- **Responsible-use posture**: The product surfaces a clear legal/responsible-use notice and places
  responsibility for lawful use on the visitor; it does not host or redistribute copyrighted media.
- **Connectivity**: Visitors have a stable internet connection sufficient to download media files.
