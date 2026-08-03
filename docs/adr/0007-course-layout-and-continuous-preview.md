# ADR-0007 — Course layout refinement + continuous per-task preview

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context tickets:** course UX refinement (2026-08-03); refines ADR-0005

## Context

The first course-shell cut (ADR-0005, #18) put the Days→Tasks navigation in
`#sidebar` by swapping it in for the file tree via `#app[data-mode]` CSS. In use
this reads as "the files panel got replaced by a list of problems," which is
confusing — the file tree is genuinely useful in course mode (the learner edits
real files), and the task nav belongs *with* the task, not in place of the files.

Two more gaps surfaced:
- Switching tasks accumulated stale editor tabs from prior tasks.
- Preview was passive (only lit up when a task's code called `Bun.serve()`), so
  most tasks — static HTML/CSS/JS (Days 1–2) and React (Day 4+) — showed nothing.

## Decision

1. **Sidebar is files-only, always.** Drop the `data-mode` CSS that hid
   `#file-tree` / showed `#course-nav` in the sidebar. The real file tree stays
   in course mode too.
2. **Days→Tasks nav moves into the Task tab as a sub-left panel.** `#task-panel`
   becomes a two-column layout: a left sub-panel hosting the nav ("problems
   list") + a right area with the active task's description / hints / actions.
   The nav lives *with* the task, not in the sidebar.
3. **Switching task clears open editor tabs.** On entering a task, close all
   `#editor-tabs` before seeding + opening the new task's files, so tabs don't
   accumulate across problems.
4. **Continuous per-task preview.** On task entry, auto-start a **static preview
   server** for that task (a tiny `Bun.serve` serving the task dir's files) so
   `#preview-frame` shows the learner's live page for **every** task type, kept
   running and refreshed as they edit — not gated on the task shipping a server.

## Consequences

- Course mode now shows: files (sidebar) · editor (center) · Task tab = nav +
  description/hints/actions (right) · live preview (bottom). The nav is no longer
  a file-tree replacement.
- A per-task static-serve harness is introduced; it runs on the in-tab
  `bun.wasm` runtime (which *can* run `Bun.serve`, unlike `bun:test`), so it works
  on the static deploy — distinct from grading, which stays deferred (ADR-0006).
- Preview auto-start is best-effort: if a task ships its own server entry, that
  still works; the static server is the default for the many file-only tasks.

## Rejected alternatives

- **Keep nav in the sidebar (swap with files)** — ❌ the reported confusion; loses
  the file tree in course mode.
- **Auto-preview only tasks with a server entry** — ❌ leaves Day 1–2 and most
  React tasks with a blank preview; user asked for continuous preview on *all*
  problems.
