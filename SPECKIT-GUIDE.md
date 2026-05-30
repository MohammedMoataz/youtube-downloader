# Spec Kit — Visual & Detailed Usage Guide

> A practical, ordered walkthrough of every **Spec Kit** skill/command installed in this
> project, what each one does, **when** to run it, and **its strength** (the one thing it is
> uniquely good at).
>
> Based on the actual skill files under `.claude/skills/speckit-*` and the git extension
> wiring in `.specify/extensions.yml`. Cross-referenced with the official
> [github/spec-kit](https://github.com/github/spec-kit) README.

---

## 1. What is Spec-Driven Development (SDD)?

Spec Kit flips the usual flow. Instead of *"prompt → code"*, you do **multi-step refinement**:
the **specification becomes the source of truth**, and code is generated *from* it.

```
   ┌─────────────┐   ┌──────────┐   ┌────────┐   ┌─────────┐   ┌───────────┐
   │ Constitution│──▶│  Specify │──▶│  Plan  │──▶│  Tasks  │──▶│ Implement │
   │  (rules)    │   │  (WHAT)  │   │ (HOW)  │   │ (STEPS) │   │  (BUILD)  │
   └─────────────┘   └──────────┘   └────────┘   └─────────┘   └───────────┘
         once          per-feature ─────────────────────────────────▶
```

Key idea: each phase produces a **durable artifact** on disk that the next phase reads.

| Phase | Artifact produced | Lives in |
|-------|-------------------|----------|
| constitution | `constitution.md` | `.specify/memory/` |
| specify | `spec.md` + `checklists/requirements.md` | `specs/<NNN>-<name>/` |
| clarify | edits to `spec.md` (`## Clarifications`) | same |
| plan | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` | same |
| tasks | `tasks.md` | same |
| implement | actual source code | your project |

---

## 2. The Full Command Map

There are **two families** of commands:

### Core SDD commands (the spine)
```
/speckit-constitution   →  /speckit-specify   →  /speckit-clarify*  →
/speckit-plan           →  /speckit-tasks     →  /speckit-analyze*  →
/speckit-checklist*     →  /speckit-implement →  /speckit-taskstoissues*

(* = optional quality / integration steps)
```

### Git extension commands (automation around the spine)
```
/speckit-git-initialize   – make the repo + first commit
/speckit-git-feature      – create the feature branch (auto-runs before specify)
/speckit-git-commit       – auto-commit before/after each phase
/speckit-git-validate     – check branch naming convention
/speckit-git-remote       – detect the GitHub remote (for issues)
```

These git commands are **wired as hooks** in `.specify/extensions.yml`, so most of them
fire automatically. You rarely call them by hand.

---

## 3. The Recommended Order (with the git hooks shown)

This diagram shows the **real execution order** including the automatic git hooks that this
project has enabled. Solid arrows = you drive it. Dotted = fires automatically as a hook.

```
                         ╔══════════════════════════════════════════╗
   ONE-TIME SETUP        ║                                            ║
                         ▼                                            ║
   /speckit-git-initialize ····(before_constitution hook)····        ║
                         │                                   :        ║
                         ▼                                   ▼        ║
                 /speckit-constitution ───────────▶ (after: git-commit)
                         │
   ══════════════════════╪══════════ PER FEATURE ═══════════════════════
                         ▼
   /speckit-git-feature ·····(before_specify hook: makes the branch)····
                         ▼
                 /speckit-specify ─────────────────▶ (after: git-commit)
                         │
                         ▼
                 /speckit-clarify   ◀── optional, BEFORE plan
                         │              (before/after: git-commit)
                         ▼
                 /speckit-plan ────────────────────▶ (after: git-commit)
                         │
                         ▼
                 /speckit-tasks ───────────────────▶ (after: git-commit)
                         │
              ┌──────────┼───────────┐
              ▼          ▼           ▼
      /speckit-analyze  /speckit-checklist   ◀── optional quality gates
              └──────────┼───────────┘         (read-only / additive)
                         ▼
                 /speckit-implement ───────────────▶ (after: git-commit)
                         │
                         ▼
                 /speckit-taskstoissues   ◀── optional: push tasks to GitHub
                                              (needs /speckit-git-remote)
```

**Quick mental model of the gates** (from the bundled `workflow.yml`, "Full SDD Cycle"):

```
specify → [review-spec gate] → plan → [review-plan gate] → tasks → implement
```
The workflow pauses for **human approval** after the spec and after the plan.

---

## 4. Each Command in Detail

Below, every command has: **what it does**, **inputs**, **outputs**, **when to run**, and
its **💪 strength** — the unique value it adds.

---

### 4.1 `/speckit-constitution`  — *Set the ground rules (run once)*

**What it does:** Creates/updates `.specify/memory/constitution.md` — the project's
non-negotiable principles (e.g. "all code must have tests", "library-first", versioning
policy). Fills the template, bumps a **semantic version**, and propagates changes into the
plan/spec/tasks templates so everything stays in sync.

| | |
|---|---|
| **Input** | Principles/values you provide (or it infers from the repo) |
| **Output** | `constitution.md` + a "Sync Impact Report" comment at the top |
| **When** | Once at project start; again only when governance changes |
| **Versioning** | MAJOR = remove/redefine a principle · MINOR = add one · PATCH = wording |

> 💪 **Strength:** It's the **conscience of the project**. Later, `/speckit-analyze` treats
> any conflict with a constitution `MUST` as a **CRITICAL** issue — so this file actively
> enforces quality across every future feature, not just documents intent.

---

### 4.2 `/speckit-specify`  — *Describe WHAT & WHY (not how)*

**What it does:** Turns a natural-language feature description into a structured `spec.md`:
user scenarios, **functional requirements** (each testable), **success criteria** (measurable,
technology-agnostic), and key entities. It also auto-creates the feature directory
(`specs/NNN-short-name/`) and a **spec quality checklist** (`checklists/requirements.md`).

| | |
|---|---|
| **Input** | `"Add a download queue with pause/resume"` (the text after the command) |
| **Output** | `spec.md`, `checklists/requirements.md`, records dir in `.specify/feature.json` |
| **When** | Start of every feature (the git-feature hook makes the branch first) |
| **Rules** | No tech stack / APIs / code. Max **3** `[NEEDS CLARIFICATION]` markers. |

The branch (e.g. `003-download-queue`) is created by the **`before_specify` git hook**, not by
this command — the spec directory and the branch are independent.

> 💪 **Strength:** Forces a clean separation of **problem from solution**. By banning
> implementation detail and demanding *measurable, tech-agnostic* success criteria
> ("checkout in under 3 min", not "API < 200ms"), it produces a spec stakeholders can read
> and testers can verify.

---

### 4.3 `/speckit-clarify`  — *Kill ambiguity before planning*  ⚠️ run BEFORE plan

**What it does:** Scans the spec against a broad taxonomy (scope, data model, UX, NFRs,
security, edge cases, …), then asks **up to 5 highly targeted questions** — one at a time,
each with a **recommended answer** and a multiple-choice table. Your answers are written back
into a `## Clarifications` section and folded into the relevant spec sections.

| | |
|---|---|
| **Input** | Optional focus areas; otherwise it picks the highest-impact gaps |
| **Output** | Updated `spec.md` (+ re-validated `requirements.md` checklist) |
| **When** | **After specify, before plan.** Skipping it increases rework risk. |
| **Limit** | Max 5 questions; stops early if ambiguities resolve |

> 💪 **Strength:** **Cheapest possible bug-prevention.** It surfaces the few decisions that
> actually change architecture/data/test design and locks them down *before* a single line of
> plan or code exists — when changing your mind is free.

---

### 4.4 `/speckit-plan`  — *Decide HOW (the technical design)*

**What it does:** Reads `spec.md` + the constitution and produces the technical design.
Runs a **Constitution Check** gate, resolves unknowns via research, and emits design artifacts.

| | |
|---|---|
| **Input** | Optional guidance (e.g. "use SQLite, no external services") |
| **Output** | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`; updates `CLAUDE.md` |
| **When** | After the spec is clarified and approved |
| **Gates** | ERRORs if the design violates the constitution or has unresolved clarifications |
| **Phases** | Phase 0 = research · Phase 1 = data model + contracts + quickstart |

> 💪 **Strength:** This is where **tech choices finally enter** — and they're immediately
> checked against the constitution. It converts "what" into a concrete, researched,
> constitution-compliant blueprint, with alternatives and rationale recorded in `research.md`.

---

### 4.5 `/speckit-tasks`  — *Break the plan into executable steps*

**What it does:** Reads the plan + design docs and generates `tasks.md`: a dependency-ordered
list **organized by user story** so each story is an independently shippable increment.

| | |
|---|---|
| **Input** | Optional constraints (e.g. "include tests", "backend only") |
| **Output** | `tasks.md` with phased, ID'd tasks |
| **When** | After the plan is approved |
| **Format** | `- [ ] T001 [P] [US1] Description with exact file path` |

Task structure:
```
Phase 1: Setup            (project init)
Phase 2: Foundational     (blocking prerequisites)
Phase 3+: User Story 1, 2, 3 …   ◀── each is an independently testable slice
Final:   Polish & cross-cutting
```
- `[P]` = parallelizable (different files, no incomplete deps)
- `[US1]` = which user story the task belongs to
- Tests are **opt-in** (generated only if the spec/you ask for TDD)

> 💪 **Strength:** Produces tasks **specific enough that an LLM can execute each one without
> extra context** (exact file paths, explicit deps). The user-story grouping means you can
> ship an MVP (just US1) and stop, instead of an all-or-nothing build.

---

### 4.6 `/speckit-analyze`  — *Cross-check spec ↔ plan ↔ tasks*  🔍 read-only

**What it does:** A **non-destructive** consistency audit across `spec.md`, `plan.md`, and
`tasks.md`. Detects duplication, ambiguity, underspecification, **coverage gaps**
(requirements with zero tasks / tasks with no requirement), terminology drift, and
**constitution violations**. Outputs a severity-ranked findings table and a coverage summary.
**Never edits files** — it offers remediation only if you approve.

| | |
|---|---|
| **Input** | Optional focus areas |
| **Output** | A Markdown analysis report (in chat), no file writes |
| **When** | **After `/speckit-tasks`, before `/speckit-implement`** |
| **Severity** | CRITICAL (constitution `MUST` / zero coverage) → HIGH → MEDIUM → LOW |

> 💪 **Strength:** The **last safety net before code.** It catches the expensive class of bug
> — "we planned X but there's no task for it" or "tasks contradict the spec" — using a
> deterministic, token-efficient report. Constitution conflicts are auto-flagged CRITICAL.

---

### 4.7 `/speckit-checklist`  — *Unit tests for your requirements*

**What it does:** Generates a domain-specific checklist (e.g. `ux.md`, `security.md`,
`api.md`) that **tests the quality of the requirements themselves** — completeness, clarity,
consistency, measurability, coverage. It is **NOT** a QA/test-the-code checklist.

```
❌ "Verify the button click navigates home"          (tests implementation)
✅ "Are navigation requirements defined for all      (tests the requirement)
    clickable brand elements? [Clarity, Spec §FR-10]"
```

| | |
|---|---|
| **Input** | A domain/focus area; it asks up to 3–5 clarifying questions first |
| **Output** | `checklists/<domain>.md` with `CHK001…` items (≥80% traceable to spec §) |
| **When** | Any time after `specify` — typically alongside `analyze`, before `implement` |

> 💪 **Strength:** Treats your **English spec like code that needs a test suite.** It exposes
> vague adjectives ("fast", "intuitive"), missing edge cases, and unstated assumptions —
> the gaps that silently become wrong implementations. `/speckit-implement` will even **pause**
> if a checklist is incomplete.

---

### 4.8 `/speckit-implement`  — *Build it*

**What it does:** Executes `tasks.md` end to end. First it shows a **checklist status table**
and stops for confirmation if any checklist is incomplete. Then it verifies ignore files,
runs tasks **phase by phase** respecting dependencies and `[P]` parallel markers, follows TDD
when tests exist, marks tasks `[X]` as it goes, and validates against the spec at the end.

| | |
|---|---|
| **Input** | Optional guidance / task filter |
| **Output** | Working source code; `tasks.md` updated with `[X]` |
| **When** | Last core step, after analyze/checklist pass |
| **Safety** | Halts on a failed non-parallel task; reports failed `[P]` tasks but continues |

> 💪 **Strength:** **Disciplined, ordered execution** instead of a freewheeling code dump.
> It honors the dependency graph, keeps `tasks.md` as a live progress ledger, and refuses to
> charge ahead past incomplete quality gates without your sign-off.

---

### 4.9 `/speckit-taskstoissues`  — *Push tasks to GitHub*  (optional)

**What it does:** Converts each task in `tasks.md` into a **GitHub issue** in the repo
identified by the git remote, using the GitHub MCP server.

| | |
|---|---|
| **Input** | Optional label/filter |
| **Output** | One GitHub issue per task |
| **When** | After tasks (and usually after analyze), if you manage work on GitHub |
| **Guard** | **Only** runs if the remote is a real `github.com` URL; never targets a mismatched repo |

> 💪 **Strength:** Bridges the spec workflow to your **team's issue tracker** so tasks become
> assignable, trackable work items — with a hard safety guard against writing issues to the
> wrong repository.

---

## 5. The Git Extension Commands (automation layer)

These are mostly **invoked automatically as hooks** (see `.specify/extensions.yml`). You can
also run them by hand. They degrade gracefully — if Git isn't installed, they warn and skip
rather than failing the SDD flow.

| Command | Fires (in this project) | What it does | 💪 Strength |
|---------|------------------------|--------------|-------------|
| **`/speckit-git-initialize`** | `before_constitution` (mandatory) | `git init` + `git add .` + initial commit | Guarantees every spec lives in version control from line one |
| **`/speckit-git-feature`** | `before_specify` (mandatory) | Creates & switches to the feature branch (`NNN-name` or timestamp) | Isolates each feature on its own branch automatically — you never forget to branch |
| **`/speckit-git-commit`** | `before_*` & `after_*` of every phase (optional) | Stages + commits outstanding changes with a per-phase message | Gives a clean, **per-phase commit history** so each artifact (spec, plan, tasks…) is its own checkpoint |
| **`/speckit-git-validate`** | manual | Checks the current branch matches `NNN-` or `YYYYMMDD-HHMMSS-` naming + finds its spec dir | Catches "you're on the wrong branch" before you generate artifacts in the wrong place |
| **`/speckit-git-remote`** | manual (used by taskstoissues) | Detects owner/repo and whether the remote is GitHub | Safe, accurate GitHub detection — prerequisite for issue creation |

> **Auto-commit note:** the hooks for `git-commit` are wired as **optional** in this project —
> Spec Kit will *prompt* you ("Commit specification changes?") rather than committing silently.
> The branch-creation and repo-init hooks are **mandatory** and run automatically.

---

## 6. Two Ways to Run the Whole Thing

### A) Step by step (full control — recommended while learning)
```
/speckit-constitution   Establish principles               (once)
/speckit-specify        "Add resumable download queue"
/speckit-clarify        Answer ≤5 questions
/speckit-plan           "Python + yt-dlp, SQLite for state"
/speckit-tasks          Generate tasks.md
/speckit-analyze        Review the consistency report
/speckit-checklist      e.g. focus: reliability / UX
/speckit-implement      Build, with quality gates
/speckit-taskstoissues  (optional) push to GitHub
```

### B) The bundled workflow (with built-in review gates)
The "**Full SDD Cycle**" workflow (`.specify/workflows/speckit/workflow.yml`) runs
`specify → plan → tasks → implement` and **pauses for your approval** after the spec and after
the plan. Use it once you trust the flow and want fewer manual invocations.

---

## 7. Cheat Sheet — "Which command do I need?"

```
Just starting the project?              → /speckit-constitution
Beginning a new feature?                → /speckit-specify
Spec feels vague / risky?               → /speckit-clarify   (do this BEFORE plan!)
Need the technical design?              → /speckit-plan
Need an actionable build list?          → /speckit-tasks
"Do the artifacts actually agree?"      → /speckit-analyze   (read-only)
"Are my requirements well-written?"     → /speckit-checklist
Ready to write code?                    → /speckit-implement
Track work as GitHub issues?            → /speckit-taskstoissues
On the wrong branch / naming check?     → /speckit-git-validate
```

### Golden rules
1. **Order matters.** Each command consumes the previous one's artifact.
2. **Clarify before Plan**, **Analyze before Implement** — that's where the cheap wins are.
3. **The constitution is law** — `analyze` enforces it as CRITICAL.
4. **Specify is WHAT, Plan is HOW** — never leak tech into the spec.
5. Let the **git hooks** handle branching and commits; don't fight them.

---

*Generated from this project's installed Spec Kit skills (`.claude/skills/speckit-*`) and the
git extension config (`.specify/extensions.yml`).*
