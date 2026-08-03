# ADR-0003 — Test harness runtime (real Bun, not the wasm VFS) + course task count

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context tickets:** #6 (T3 hidden-test harness), #15 (T12 content QA), #4 (schema seam)
- **Depends on:** ADR-0001 (Burrow base), ADR-0002 (data layer)

## Context

Two implementation realities surfaced while building the framework (Workstream A)
and authoring content (Workstream B) that were not pinned down in the original
SPEC. This ADR records them so downstream work builds on the real contract.

### 1. Where hidden tests actually execute

The framework must run a task's **hidden tests** against learner code and grade
pass/fail (T3, #6). The intuitive assumption was to run them inside Burrow's
**in-browser `bun.wasm` VFS runner** (the same engine that powers `bun run` /
`serve` in the in-tab terminal).

That does not work: the in-browser sandbox (`src/toolchain/{graph,session,commands}.ts`)
**explicitly does not support hidden-test evaluation**. `bun:*` specifiers —
including `bun:test`, which the hidden tests import per `SCHEMA.md` — are a hard
build error in that sandbox ("Bun builtins not available in the browser
sandbox"). `bun test` cannot execute there at all.

### 2. How many tasks the course actually has

The SPEC prose says **"42 tasks"** in several places (and epic #2 / issue #15
titles inherited "42"). The authored + ticketed scope is **7 days × 3 tasks =
21 tasks** (verified from `platform/src/course/content/index.ts` on 2026-08-03).
There was never a plan producing 42 concrete tasks; "42" was an early estimate
that content authoring (T8–T11) did not follow.

## Decision

1. **Grade with the real Bun test runner via `Bun.spawn`.** The harness
   (`platform/src/course/test-harness.ts`) materializes the learner's files +
   the task's `hiddenTests` into a throwaway working directory and runs
   `Bun.spawn(["bun", "test", ...])` — the *real* Bun test runner on the host —
   not the in-browser wasm VFS runner. This is the "existing Burrow bun
   toolchain" the ticket refers to, per that file's own docstring.

2. **Parse JUnit, not console output.** Run with
   `--reporter=junit --reporter-outfile=<path>` for a structured, stable report.
   `parseJunitReport()` / `parseFailureReport()` are **pure** functions,
   unit-testable with canned XML strings (no live sandbox needed). If bun writes
   no JUnit XML (e.g. a crash before any test runs), the harness falls back to a
   synthetic failure report so a task never silently "passes".

3. **The course is 21 tasks.** Treat **21** (3/day × 7 days) as the canonical
   count. The QA gate (T12, #15) verified all 21: each task's hidden tests
   **pass against its `solution`** and **fail against its `starterCode`**
   (see `platform/src/course/content/QA-REPORT.md`).

## Consequences

- **Grading is host-side, not tab-side.** Hidden-test evaluation runs where the
  platform is served (the real Bun binary), while the *learner's editing/preview*
  experience stays fully in-tab (Burrow's wasm runner + service-worker preview).
  This split is intentional: authors write real `bun:test` files; the wasm
  sandbox never has to grow `bun:test` support.
- **Deploy implication:** a purely static GitHub Pages host cannot run
  `Bun.spawn`. Static hosting serves the learner UI + in-tab runtime; server-side
  grading (if wanted in production) needs a Bun runtime endpoint, or grading is
  scoped to what the in-tab runner can do. For now, hidden-test grading is a
  **build-time / CI + authoring guarantee** (proven by the T12 QA sweep), not a
  live in-browser feature on the static deploy.
- **Docs debt paid:** SPEC prose and the "42 tasks" issue titles are corrected to
  21 (SPEC §8 DoD updated 2026-08-03). Any future reference to "42 tasks" is
  stale.

## Rejected alternatives

- **Run hidden tests in the in-browser `bun.wasm` VFS runner** — ❌ `bun:test` /
  `bun:*` specifiers are a hard build error in Burrow's browser sandbox.
- **Parse bun test's default console output** — ❌ human-formatted, unstable
  across versions; JUnit XML is the stable contract.
- **Author 42 tasks to match the SPEC prose** — ❌ no pedagogical plan backed 42;
  21 (3/day) is the coherent, authored, QA'd scope.
