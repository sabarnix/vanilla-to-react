# ADR-0005 — Course shell embedded as a pane that orchestrates Burrow's native panels

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context tickets:** course build-out (2026-08-03); builds on ADR-0001 (Burrow base), the schema seam (#4), and the course modules (T2–T6)
- **Supersedes intent of:** SPEC §8 DoD item "a first-time learner can complete Day 1 with zero setup" (this ADR is how it gets met)

## Context

The course modules (`src/course/*` — navigation, task-runner, test-harness,
hints, progress) were built and unit-tested (T2–T6, T12 QA) but **never wired
into the UI**. The deployed site boots stock Burrow (editor + file tree + shell +
preview); a learner cannot reach a single task. We need the deployed product to
*be the course*.

Design question: does the course **replace** Burrow's editor UI, or live
**inside** it? Decision (grilled 2026-08-03): the course is a **pane inside
Burrow** that **orchestrates Burrow's real panels** — not a self-contained runner
with its own mini-editor.

## Decision

1. **Course as an orchestration layer over Burrow's native regions**, mapped to
   the existing `index.html` layout:
   - **`#sidebar`** — Days → Tasks navigation (`renderNavView`), replacing/
     supplementing the file tree while in course mode.
   - **`#editor-pane`** — the learner edits the task's `starterCode` in the
     **real Burrow editor**, seeded into the **real VFS** (not the course
     module's internal `TaskFileState`). One editor on screen.
   - **`#rightbar`** — a new **"Task" panel**: rendered task description
     (markdown) + hints/solution reveal (`mountHintsView`) + the **Run** and
     **Mark done → next** controls.
   - **`#bottombar`** — test results (`mountTestResultsView`) surface here.
2. **Course mode via `data-mview`.** `#app` already carries `data-mview`
   (default `"editor"`). Add `data-mview="course"` as the **boot default**; the
   raw Burrow editor/shell remains reachable (switchable mode) for the Day-7
   "ship a real app" payoff and power users.
3. **Boot behavior:** show a **course overview** (Days grid) on first visit;
   **auto-resume to the last-visited task** when `progress` has a saved position
   (overview stays one click away).
4. **Progress + completion:** `createProgressStore(courseId)` persists position +
   completion to localStorage. Because grading is deferred on the static deploy
   (see ADR-0006), completion is advanced by a **manual "Mark done → next"**
   control now; when in-tab grading lands, an all-pass run *also* auto-marks.

## Consequences

- The course layer must read/write **Burrow's VFS + editor** and (later) drive
  the shell for grading — richer than the modules' standalone `TaskFileState`,
  but it's the whole point of embedding: the learner works in a *real* dev env.
- `data-mview="course"` boot default changes what the deployed URL opens into.
  The sandbox view is preserved, not deleted (per ADR-0004 the chrome is already
  neutral-branded "sandbox").
- The course modules' pure logic (nav state machine, hint gating, progress store,
  report parsing) is reused unchanged; only new *view/orchestration* glue is added.

## Rejected alternatives

- **Course replaces the editor UI entirely** — ❌ throws away the real dev env the
  Day-7 capstone needs; higher risk.
- **Course as one self-contained panel with its own mini-editor** — ❌ puts two
  editors on screen (task mini-editor + Burrow editor); confusing, and wastes the
  reason to embed in a real dev environment.
