# Content QA Report — T12 (issue #15)

**Status: ALL GREEN.** All 21 authored tasks (3 per day × 7 days) pass the QA
sweep end-to-end through the same machinery the framework uses to grade a
learner (`bun test` against a task's own `hiddenTests`, run in a fresh temp
directory — the exact primitive `test-harness.ts`'s `runHiddenTests()` uses,
see that module's docstring).

Generated from an actual run of `platform/src/course/content/qa.test.ts` on
2026-08-03 (bun 1.3.14). This file reflects real results, not aspiration — see
"How this was generated" at the bottom for reproduction steps.

## Schema / structural checks

| Check | Result |
|---|---|
| `validateCourse()` over the full 7-day `Course` | ✅ `ok: true`, 0 errors |
| Course has exactly 7 days | ✅ |
| Course has exactly 21 tasks (3/day × 7) | ✅ |
| Day `order` values are 1..7, contiguous, no gaps/dupes | ✅ |
| Day ids unique across the course | ✅ |
| Task ids **globally** unique across the entire course (not just per-day) | ✅ (21 unique ids) |
| Every task has non-empty title/description/starterCode, a hints array, ≥1 hiddenTest, and an authored solution | ✅ (all 21) |

## Per-task QA matrix (21/21 tasks)

For every task: hidden tests run against `solution` → expect **PASS** (whole
run exits 0), and the same hidden tests run against `starterCode` → expect
**FAIL** (proves the test actually discriminates "done" from "not done").

| Day | Task ID | Title | Solution | Starter |
|---|---|---|---|---|
| 1 | d1-t1 | Build the to-do list markup | ✅ PASS | ✅ FAIL |
| 1 | d1-t2 | Style the to-do list | ✅ PASS | ✅ FAIL |
| 1 | d1-t3 | Read the DOM: count your to-dos | ✅ PASS | ✅ FAIL |
| 2 | d2-t1 | Add a to-do with an event listener | ✅ PASS | ✅ FAIL |
| 2 | d2-t2 | Toggle a to-do as done | ✅ PASS | ✅ FAIL |
| 2 | d2-t3 | Delete a to-do (and fix the state/DOM desync bug) | ✅ PASS | ✅ FAIL |
| 3 | d3-t1 | Fetch todos from the API (and hand-roll loading/error state) | ✅ PASS | ✅ FAIL |
| 3 | d3-t2 | Add a to-do with an optimistic POST (and a manual rollback) | ✅ PASS | ✅ FAIL |
| 3 | d3-t3 | Fix the reload race condition (stale responses winning) | ✅ PASS | ✅ FAIL |
| 4 | d4-t1 | Rebuild the loading/error/ready states with useState + JSX | ✅ PASS | ✅ FAIL |
| 4 | d4-t2 | Fetch on mount with useEffect | ✅ PASS | ✅ FAIL |
| 4 | d4-t3 | Add a to-do with setTodos (no manual reconciliation) | ✅ PASS | ✅ FAIL |
| 5 | d5-t1 | Extract a TodoItem component that takes a todo prop | ✅ PASS | ✅ FAIL |
| 5 | d5-t2 | Toggle done with a callback prop (lift state up) | ✅ PASS | ✅ FAIL |
| 5 | d5-t3 | Compose a TodoList component (App -> TodoList -> TodoItem) | ✅ PASS | ✅ FAIL |
| 6 | d6-t1 | Fetch todos on mount with loading/error state | ✅ PASS | ✅ FAIL |
| 6 | d6-t2 | Cancel the in-flight fetch on unmount with a cleanup function | ✅ PASS | ✅ FAIL |
| 6 | d6-t3 | Re-fetch on prop change with a correct dependency array | ✅ PASS | ✅ FAIL |
| 7 | d7-t1 | Assemble the app shell (App -> TodoList -> TodoItem, wired) | ✅ PASS | ✅ FAIL |
| 7 | d7-t2 | Wire create/toggle/delete to /api/todos end-to-end | ✅ PASS | ✅ FAIL |
| 7 | d7-t3 | Ship it: empty state, error state, and full CRUD polished | ✅ PASS | ✅ FAIL |

**Result: 21/21 tasks pass solution=PASS & starter=FAIL. Zero failures, zero
tasks needing a fix.**

## Full suite impact

- **Before (`qa.test.ts` not yet added):** 586 pass / 1 fail / 1752 expect() calls, 587 tests across 36 files.
- **After adding `qa.test.ts`:** 635 pass / 1 fail / 1977 expect() calls, 636 tests across 37 files.
- **Delta:** +49 pass, +0 fail, +225 expect() calls (7 schema/structural
  assertions + 21 tasks × 2 PASS/FAIL checks = 49 new tests).
- The 1 pre-existing failure (`bun/serve commands > bun --help prints the
  Burrow usage banner`) is unrelated to content and was already failing
  before this QA sweep — left untouched per instructions.

## Typecheck

`cd platform && bunx tsc --noEmit` → clean, no errors.

## SPEC.md §8 Definition of Done — content-related items

| Item | Status |
|---|---|
| "Framework boots, loads any valid course (schema-driven)." | Out of scope for T12 (Workstream A); `validateCourse()` confirms the authored course *is* schema-valid, which is the content-side half of this. |
| "All 42 tasks authored and passing their own hidden tests." | ⚠️ **Note:** SPEC.md §1/§4/§5 predates a scope change — the actual ticket plan (§5) and issue #15 both call for **21 tasks (3/day × 7 days)**, not 42. All **21 of 21** authored tasks pass their own hidden tests (verified here against `solution`) and are proven to discriminate against `starterCode`. If 42 was truly intended, that is a scope/spec discrepancy predating T12, not a content gap this issue can silently fix — flagging for the parent/spec owner rather than authoring 21 more tasks unprompted. |
| "Progress persists across reloads." | Out of scope for T12 (Workstream A / T5). |
| "Deployed to a public URL." | Out of scope for T12 (Workstream A / T7, already landed per T7 commit history). |
| "A first-time learner can complete Day 1 with zero setup." | Out of scope for T12 (Workstream A, runtime/UX). Day 1's 3 tasks are content-verified here (solution passes, starter fails, schema valid). |

## How this was generated

```bash
cd platform
/root/.bun/bin/bun test src/course/content/qa.test.ts   # per-file QA sweep results
/root/.bun/bin/bunx tsc --noEmit                          # typecheck
/root/.bun/bin/bun test                                   # full suite, before/after comparison
```

No content, schema, or toolchain source was modified to produce these
results — this report is a direct read of `qa.test.ts`'s pass/fail output.
