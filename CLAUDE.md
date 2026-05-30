<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-youtube-downloader/plan.md`

Active feature: 001-youtube-downloader — sleek static (Astro + TypeScript) multi-page site
(Home/Download/FAQ/About) that calls a separate self-hosted yt-dlp extraction service via
`PUBLIC_DOWNLOADER_API`. MP4 ≤1080p, MP3 with embedded metadata, playlists as a single ZIP.
Constraints: static-only (no backend/secrets in bundle), WCAG 2.1 AA, perf budgets (JS ≤150KB
gzip), progressive enhancement. Tests: Vitest + Playwright(+axe) + Lighthouse CI.
See also: data-model.md, research.md, contracts/extraction-service.md, contracts/ui-pages.md.
<!-- SPECKIT END -->
