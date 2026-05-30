<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: Initial ratification — first concrete constitution replacing the template.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Static-First, No Backend or Secrets
  - [PRINCIPLE_2_NAME] → II. Accessibility (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Performance Budgets
  - [PRINCIPLE_4_NAME] → IV. Progressive Enhancement
  - [PRINCIPLE_5_NAME] → V. Simplicity & YAGNI
Added principles:
  - VI. Test Discipline (expands the template's default 5 principles to 6,
        per the requested "testing" principle)
Added sections:
  - Security, Privacy & Compliance Constraints (Section 2)
  - Development Workflow & Quality Gates (Section 3)
Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — "Constitution Check" gate is generic
       ("[Gates determined based on constitution file]"); no edit required, it
       resolves against this file at plan time.
  - ✅ .specify/templates/spec-template.md — no hardcoded principle references; OK.
  - ✅ .specify/templates/tasks-template.md — task categories are principle-agnostic; OK.

Follow-up TODOs: none. RATIFICATION_DATE set to first adoption date (today).
-->

# YouTube Downloader Web App Constitution

## Core Principles

### I. Static-First, No Backend or Secrets

The application MUST ship as a static site (HTML, CSS, JS, and static assets) that can be
served from any static host or CDN with no application server. No server-side runtime,
database, or build-time secret is permitted in the deployed artifact.

- No API keys, tokens, or credentials may be committed to the repo or embedded in client code.
- Any third-party or downloader service the UI talks to MUST be reachable as a configurable,
  public endpoint supplied at runtime — never a hardcoded secret.
- All state lives in the browser (in-memory, `localStorage`, `sessionStorage`, or IndexedDB).

**Rationale**: A static, secret-free deliverable is cheap to host, trivially cacheable,
auditable in full from the source, and removes an entire class of server and credential-leak
risks. If a secret is ever required, that is a signal the feature belongs behind a service the
client calls — not inside the static bundle.

### II. Accessibility (NON-NEGOTIABLE)

Every user-facing feature MUST meet **WCAG 2.1 Level AA**. This is a release gate, not a
nice-to-have.

- All interactive elements MUST be keyboard-operable and reachable in a logical tab order.
- Semantic HTML is required; ARIA is used only to fill genuine gaps, never to paper over
  non-semantic markup.
- Color contrast MUST meet AA ratios; information MUST never be conveyed by color alone.
- All actionable controls and images MUST have accessible names / alt text.
- A keyboard-only and screen-reader pass MUST be performed before any feature is marked done.

**Rationale**: A downloader is a utility everyone reaches for; excluding keyboard and assistive
-technology users is both a usability failure and, in many jurisdictions, a legal one. Treating
A11y as non-negotiable keeps it from being deferred into oblivion.

### III. Performance Budgets

Pages MUST meet explicit, measurable performance budgets, verified before release.

- **Largest Contentful Paint** ≤ 2.5s on a simulated mid-tier mobile device (4x CPU throttle,
  "Fast 3G").
- **Total Blocking Time** ≤ 200ms; **Cumulative Layout Shift** ≤ 0.1.
- Initial JavaScript payload ≤ 150KB gzipped; total initial transfer ≤ 500KB gzipped.
- Assets MUST be minified, compressed, and cache-busted; images served in modern formats with
  explicit dimensions to prevent layout shift.

Any change that exceeds a budget MUST be justified in Complexity Tracking or reverted.

**Rationale**: Budgets turn "make it fast" into a testable contract. Numeric thresholds make
regressions visible in review instead of surfacing as vague user complaints later.

### IV. Progressive Enhancement

Core functionality MUST be built up from a working baseline, not down from a JS-only app.

- Meaningful HTML content and primary navigation MUST render without JavaScript.
- JavaScript enhances; it does not gate the existence of core content.
- Features MUST degrade gracefully when a browser API, network call, or third-party endpoint
  is unavailable, with a clear user-facing message rather than a blank or broken screen.

**Rationale**: Progressive enhancement maximizes reach and resilience — flaky networks, older
browsers, blocked scripts, and partial failures all become survivable instead of fatal.

### V. Simplicity & YAGNI

Start with the simplest solution that satisfies the requirement; add complexity only when a
concrete, present need demands it.

- Prefer the platform (native HTML/CSS/JS, fetch, web components) over frameworks and
  dependencies unless a dependency earns its weight.
- No speculative abstraction, configuration, or "future-proofing" for unrequested use cases.
- Each added dependency MUST be justified by a real need and reviewed for size and maintenance
  cost (see Performance Budgets).

**Rationale**: For a static app, every dependency is shipped to every user and maintained
forever. YAGNI keeps the bundle small, the codebase legible, and the attack surface minimal.

### VI. Test Discipline

Behavior MUST be protected by automated tests appropriate to the change.

- User-facing flows MUST have automated coverage (component and/or end-to-end) before being
  marked done; bug fixes MUST add a regression test.
- Accessibility and performance budgets (Principles II and III) MUST be enforced by automated
  checks in CI, not solely by manual inspection.
- Tests MUST be deterministic and runnable locally and in CI with a single documented command.

**Rationale**: Tests are the executable record of intended behavior. Wiring A11y and perf
budgets into CI is what makes those principles real rather than aspirational.

## Security, Privacy & Compliance Constraints

- **No secrets in the client.** Reaffirms Principle I: nothing sensitive ships in the bundle.
- **Minimal data collection.** Collect no personal data by default. Any analytics MUST be
  privacy-respecting, disclosed, and opt-in where legally required.
- **Local-only state.** User inputs (e.g. URLs) and history stay in the browser and are never
  transmitted except to the explicit, user-visible downloader endpoint required to perform the
  requested action.
- **Transport security.** All network requests MUST use HTTPS. A Content Security Policy and
  other appropriate security headers MUST be configured at the host/CDN.
- **Dependency hygiene.** Dependencies MUST be pinned and scanned for known vulnerabilities;
  flagged advisories MUST be triaged before release.
- **Legal & platform terms.** The UI MUST clearly communicate that users are responsible for
  complying with applicable copyright law and the terms of service of any platform they
  download from. The project does not host or distribute copyrighted content.

## Development Workflow & Quality Gates

- **Branch & spec flow.** Work follows the Spec Kit flow: feature branch → spec → (clarify) →
  plan → tasks → (analyze/checklist) → implement. See `SPECKIT-GUIDE.md`.
- **Definition of Done** for any feature:
  1. Meets all six Core Principles.
  2. Passes automated tests, A11y checks, and performance-budget checks in CI.
  3. Reviewed by at least one other contributor (or a documented self-review checklist when
     solo), confirming constitution compliance.
- **Quality gates (CI MUST block on):** lint/format, unit/component tests, end-to-end tests for
  critical flows, accessibility audit (AA), and performance budgets.
- **Complexity justification.** Any violation of a principle (extra dependency, budget overrun,
  added abstraction) MUST be recorded in the plan's Complexity Tracking with the simpler
  alternative that was rejected and why.

## Governance

This constitution supersedes all other development practices for this project. Where another
document or habit conflicts with it, this constitution wins.

- **Amendments** MUST be proposed via pull request that updates this file, states the rationale,
  and bumps the version per the policy below. Amendments require approval from a project
  maintainer before merge.
- **Versioning policy** (semantic):
  - **MAJOR** — backward-incompatible governance change: removing or redefining a principle.
  - **MINOR** — adding a new principle or section, or materially expanding guidance.
  - **PATCH** — clarifications, wording, and non-semantic refinements.
- **Compliance review.** Every PR review MUST verify compliance with the Core Principles and
  Quality Gates. `/speckit-analyze` treats any conflict with a principle marked NON-NEGOTIABLE
  or expressed as MUST as a CRITICAL finding that blocks implementation.
- **Runtime guidance.** Use `CLAUDE.md` and `SPECKIT-GUIDE.md` for day-to-day development
  workflow guidance; they MUST stay consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30
