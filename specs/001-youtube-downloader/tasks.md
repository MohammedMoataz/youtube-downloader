---
description: "Task list for Modern YouTube Downloader Website"
---

# Tasks: Modern YouTube Downloader Website

**Input**: Design documents from `/specs/001-youtube-downloader/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — the project constitution (Principle VI: Test Discipline) requires automated
tests plus accessibility and performance checks in CI, so test tasks are mandatory here.

**Organization**: Tasks are grouped by user story (US1–US4) so each can be built, tested, and
shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 (user-story phases only)
- All paths are relative to the repository root (single static Astro project per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the static Astro project and tooling.

- [x] T001 Initialize Astro + TypeScript static project at repo root (`package.json`, `astro.config.mjs` with `output: 'static'`, `tsconfig.json`)
- [x] T002 [P] Add runtime + dev dependencies (astro, typescript; dev: vitest, @playwright/test, @axe-core/playwright, @lhci/cli) in `package.json`
- [x] T003 [P] Configure linting & formatting (`.eslintrc.cjs`, `.prettierrc`) at repo root
- [x] T004 [P] Configure Vitest in `vitest.config.ts`
- [x] T005 [P] Configure Playwright in `playwright.config.ts` (e2e + a11y projects)
- [x] T006 [P] Configure Lighthouse CI budgets (LCP ≤2.5s, TBT ≤200ms, CLS ≤0.1, JS ≤150KB, total ≤500KB) in `lighthouserc.json`
- [x] T007 [P] Add `.env.example` (`PUBLIC_DOWNLOADER_API`) and npm scripts (`dev`, `build`, `preview`, `test`, `test:unit`, `test:e2e`, `test:a11y`, `test:perf`, `mock-api`) in `package.json`
- [x] T008 [P] Create design tokens in `src/styles/tokens.css` and base/global styles in `src/styles/global.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared layout, config, types, and the extraction-service client that every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 [P] Define shared TypeScript types from data-model (MediaLink, MediaItem, QualityOption, Playlist, DownloadRequest, DownloadJob, JobItemStatus, AppConfig) in `src/lib/types.ts`
- [x] T010 Create config loader that reads/validates `PUBLIC_DOWNLOADER_API` (fail-fast in dev) in `src/lib/config.ts`
- [x] T011 [P] Implement link detection/validation (video | playlist | invalid) in `src/islands/link-utils.ts`
- [x] T012 Implement typed API client wrapping `contracts/extraction-service.md` (`resolve`, `createJob`, `getJob`, `cancelJob`, `fileUrl`) in `src/islands/api-client.ts` (depends on T009, T010)
- [x] T013 [P] Create `BaseLayout` (head, skip-link, view transitions, header/footer slots) in `src/layouts/BaseLayout.astro`
- [x] T014 [P] Create `SiteHeader` with navigation to all 4 pages in `src/components/SiteHeader.astro`
- [x] T015 [P] Create `SiteFooter` with responsible-use / legal notice (FR-017) in `src/components/SiteFooter.astro`
- [x] T016 [P] Create local mock extraction-service implementing the contract (resolve/jobs/poll/file/cancel) for dev + e2e in `tests/mocks/extraction-service.mjs`

**Checkpoint**: Foundation ready — user stories can now proceed (in parallel if staffed).

---

## Phase 3: User Story 1 - Download a single video as MP4 (Priority: P1) 🎯 MVP

**Goal**: Visitor pastes a video link, sees its details, picks a quality (≤1080p), and downloads an MP4.

**Independent Test**: Paste a valid single-video link → preview shows title/thumbnail/author/duration → choose a quality → a playable `.mp4` is saved.

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL before implementing)

- [x] T017 [P] [US1] Unit test: link-utils detects a single-video link in `tests/unit/link-utils.test.ts`
- [x] T018 [P] [US1] Contract test: api-client `resolve(video)` + `createJob(mp4)` + poll-to-complete (mocked HTTP) in `tests/unit/api-client.test.ts`
- [x] T019 [P] [US1] E2E journey: paste video → select quality → MP4 download (mock service) in `tests/e2e/us1-single-mp4.spec.ts`
- [x] T020 [P] [US1] A11y test: landing + download pages pass axe (WCAG AA) in `tests/a11y/us1.spec.ts`

### Implementation for User Story 1

- [x] T021 [US1] Build landing page with featured link `<form>` (real, no-JS submittable) in `src/pages/index.astro` and `src/components/LinkInput.astro`
- [x] T022 [US1] Build download page shell + Home→Download handoff (sessionStorage + `?url=` fallback) in `src/pages/download.astro`
- [x] T023 [P] [US1] `MediaPreview` component (title/thumbnail/author/duration) in `src/components/MediaPreview.astro`
- [x] T024 [P] [US1] `FormatPicker` component with MP4 quality list (≤1080p) in `src/components/FormatPicker.astro`
- [x] T025 [P] [US1] `DownloadProgress` component (single-item state) in `src/components/DownloadProgress.astro`
- [x] T026 [US1] `downloader` island: orchestrate resolve → create job → poll progress → trigger file download for a single video in `src/islands/downloader.ts` (depends on T012, T023, T024, T025)
- [x] T027 [US1] Wire validation + error/retry states (keep entered link) + "JavaScript required to download" no-JS message in `src/pages/download.astro` / `src/islands/downloader.ts` (FR-003, FR-014)
- [x] T028 [US1] Apply 1080p client-side filter as a safety net in `src/components/FormatPicker.astro` / `src/islands/api-client.ts` (FR-006)

**Checkpoint**: US1 fully functional and independently testable — this is the deployable MVP.

---

## Phase 4: User Story 2 - Download audio as MP3 with metadata (Priority: P2)

**Goal**: Visitor chooses MP3 and downloads an audio file with embedded title, author, and cover art.

**Independent Test**: Enter a video link → choose MP3 → confirm shown metadata → `.mp3` plays with correct title/author/cover art.

### Tests for User Story 2 ⚠️

- [x] T029 [P] [US2] Contract test: api-client `createJob(mp3)` omits `qualityId`; missing-field tolerance (FR-009) in `tests/unit/api-client.mp3.test.ts`
- [x] T030 [P] [US2] E2E journey: video → MP3 → metadata confirmation shown → download in `tests/e2e/us2-mp3.spec.ts`

### Implementation for User Story 2

- [x] T031 [US2] Extend `FormatPicker` with an MP3 option + metadata confirmation panel in `src/components/FormatPicker.astro`
- [x] T032 [US2] Extend `downloader` island with the MP3 job path (no `qualityId`) in `src/islands/downloader.ts`
- [x] T033 [US2] Surface detected metadata (title/author/thumbnail, optional album/year) before download; omit missing fields without failing (FR-008, FR-009) in `src/components/MediaPreview.astro` / `src/components/FormatPicker.astro`

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Download an entire playlist as a ZIP (Priority: P3)

**Goal**: Visitor pastes a playlist link, sees the list + count, downloads all items as a single ZIP with per-item + overall progress; can cancel large batches; partial failures don't abort.

**Independent Test**: Paste a playlist link → list + count appear → start → per-item & overall progress → single `.zip` of all files saved.

### Tests for User Story 3 ⚠️

- [x] T034 [P] [US3] Contract test: playlist `createJob` → ZIP result, `cancelJob`, and a failed item leaves the job running (FR-011, FR-012, FR-022) in `tests/unit/api-client.playlist.test.ts`
- [x] T035 [P] [US3] E2E journey: playlist → start → per-item progress → ZIP download in `tests/e2e/us3-playlist.spec.ts`

### Implementation for User Story 3

- [x] T036 [P] [US3] `PlaylistPreview` component (title, ordered list, total count) in `src/components/PlaylistPreview.astro`
- [x] T037 [US3] Extend `DownloadProgress` for per-item rows + overall packaging/zipping bar in `src/components/DownloadProgress.astro`
- [x] T038 [US3] Extend `downloader` island for playlists: large-playlist pre-start warning, cancel control, ZIP result handling, partial-failure reporting (no cap) in `src/islands/downloader.ts` (FR-011, FR-012, FR-022)

**Checkpoint**: US1, US2, US3 all independently functional.

---

## Phase 6: User Story 4 - Informational pages (Priority: P3)

**Goal**: FAQ and About pages explain supported links, formats, qualities, and responsible use; all 4 pages are navigable and render without JS.

**Independent Test**: Navigate Home/Download/FAQ/About via nav; with JS disabled, FAQ/About still render and nav works.

### Tests for User Story 4 ⚠️

- [x] T039 [P] [US4] E2E: navigation across all 4 pages + no-JS render of FAQ/About in `tests/e2e/us4-pages.spec.ts`
- [x] T040 [P] [US4] A11y test: FAQ + About pass axe (WCAG AA) in `tests/a11y/us4.spec.ts`

### Implementation for User Story 4

- [x] T041 [P] [US4] FAQ page content (supported links, formats, qualities, responsible/legal use) in `src/pages/faq.astro` (FR-015)
- [x] T042 [P] [US4] About page content (what the service is + responsible-use stance) in `src/pages/about.astro` (FR-016)

**Checkpoint**: All user stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, docs, and the constitution's CI gates across all stories.

- [x] T043 [P] Write `README.md` and document required CSP / security headers + HTTPS for the static host (constitution §Security)
- [x] T044 [P] Unit tests for edge cases (invalid link, unavailable content, no-qualities-but-audio, live/upcoming) in `tests/unit/edge-cases.test.ts`
- [x] T045 Run Lighthouse CI and resolve any budget breaches (`lighthouserc.json`) — runs green in CI on `main`
- [x] T046 Execute full `quickstart.md` manual validation incl. keyboard/screen-reader pass — a11y/keyboard audit done; axe AA green per page; `#status` made a `role="status"` live region. A human NVDA/VoiceOver spot-check is still recommended before public launch.
- [x] T047 [P] View Transitions + `prefers-reduced-motion` polish in `src/layouts/BaseLayout.astro` / `src/styles/global.css`
- [x] T048 Verify a single `npm test` runs unit + e2e + a11y + perf green (`package.json`)
- [x] T049 [P] Responsive layout pass + mobile/desktop viewport e2e test in `tests/e2e/responsive.spec.ts` (covers FR-018, SC-009 — analysis finding C1)
- [x] T050 Timeout handling for slow resolve/job + duplicate/rapid-submission guard (no redundant jobs) in `src/islands/downloader.ts`, with edge tests in `tests/unit/edge-cases.test.ts` (covers spec Edge Cases "slow source/timeout" & "duplicate submissions" — analysis finding C2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phases 3–6)**: All depend on Foundational. US2/US3 extend files created in US1
  (`downloader.ts`, `FormatPicker.astro`, `DownloadProgress.astro`) so they are easiest **after**
  US1; US4 is fully independent and can run in parallel with US1–US3.
- **Polish (Phase 7)**: Depends on the targeted user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories. → MVP.
- **US2 (P2)**: After Foundational. Extends US1's `downloader`/`FormatPicker` (shared files) — build after US1 or coordinate edits.
- **US3 (P3)**: After Foundational. Extends US1's `downloader`/`DownloadProgress` (shared files) — build after US1 or coordinate edits.
- **US4 (P3)**: After Foundational. Fully independent (separate page files) — safe to parallelize.

### Within Each User Story

- Tests written first and FAIL before implementation (constitution Principle VI).
- Types/config (Foundational) → components → island wiring → states/error handling.

### Parallel Opportunities

- All `[P]` Setup tasks (T002–T008) run together.
- All `[P]` Foundational tasks (T009, T011, T013–T016) run together (T010, T012 are sequential).
- US4 (T039–T042) can run fully in parallel with US1–US3.
- Within a story, `[P]` test files and `[P]` standalone components run together; the shared
  `downloader.ts` edits (T026, T032, T038) are sequential because they touch the same file.

---

## Parallel Example: User Story 1

```bash
# Tests for US1 together (different files):
Task: "Unit test link-utils video detection in tests/unit/link-utils.test.ts"        # T017
Task: "Contract test api-client resolve/job/poll in tests/unit/api-client.test.ts"    # T018
Task: "E2E single MP4 journey in tests/e2e/us1-single-mp4.spec.ts"                    # T019
Task: "A11y landing+download in tests/a11y/us1.spec.ts"                               # T020

# Standalone US1 components together (different files):
Task: "MediaPreview in src/components/MediaPreview.astro"        # T023
Task: "FormatPicker in src/components/FormatPicker.astro"        # T024
Task: "DownloadProgress in src/components/DownloadProgress.astro" # T025
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → 2. Phase 2: Foundational (CRITICAL) → 3. Phase 3: US1 →
4. **STOP & VALIDATE** US1 independently (single MP4 download works) → 5. Deploy/demo the MVP.

### Incremental Delivery

Setup + Foundational → **US1 (MVP, deploy)** → US2 (MP3) → US3 (playlist ZIP) → US4 (info pages) →
Polish. Each story adds value without breaking the previous ones.

### Parallel Team Strategy

After Foundational: Dev A → US1 (then US2/US3 extensions), Dev B → US4 in parallel, Dev C → mock
service + test harness hardening. Converge at Polish.

---

## Notes

- `[P]` = different files, no incomplete dependencies.
- Shared-file edits across stories (`downloader.ts`, `FormatPicker.astro`, `DownloadProgress.astro`)
  are intentionally sequential to avoid conflicts — coordinate if parallelizing US1→US2→US3.
- The extraction service is **mocked** for all automated tests (`tests/mocks/extraction-service.mjs`);
  no live backend is required to develop or test the front-end.
- Verify tests fail before implementing. Commit after each task or logical group.
- Total tasks: **50** (T001–T050). T049–T050 added from `/speckit-analyze` findings C1 (responsive
  coverage) and C2 (timeout + duplicate-submission handling).
