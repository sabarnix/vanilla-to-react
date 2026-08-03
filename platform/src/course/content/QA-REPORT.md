# Content QA Report — D5 (issue #23)

**Status: ALL GREEN.** All 42 authored tasks (6 per day × 7 days) pass the QA
sweep end-to-end through the same machinery the framework uses to grade a
learner (`bun test` against a task's own `hiddenTests`, run in a fresh temp
directory — the exact primitive `test-harness.ts`'s `runHiddenTests()` uses,
see that module's docstring).

This supersedes the original T12 (issue #15) report, which certified 21
tasks (3/day × 7 days) before the content expansion landed (issues #19–#22).
Sibling agents expanded every day to 6 tasks (42 total); this ticket's job
was to update the QA harness's stale hardcoded assumptions (it still
asserted 21/3-per-day) and re-run the sweep against the real, expanded
content — not to touch content itself.

Generated from an actual run of `platform/src/course/content/qa.test.ts` on
2026-08-03 (bun 1.3.14). This file reflects real results, not aspiration —
see "How this was generated" at the bottom for reproduction steps.

## Schema / structural checks

| Check | Result |
|---|---|
| `validateCourse()` over the full 7-day `Course` | ✅ `ok: true`, 0 errors |
| Course has exactly 7 days | ✅ |
| Day `order` values are 1..7, contiguous, no gaps/dupes | ✅ |
| Day ids unique across the course | ✅ |
| Each of the 7 days has exactly 6 tasks | ✅ (asserted per-day, not just as a sum) |
| Course has exactly 42 tasks total (6/day × 7) | ✅ |
| Task ids **globally** unique across the entire course (not just per-day) | ✅ (42/42 unique ids, zero duplicates found) |
| Every task has non-empty title/description/starterCode, a hints array, ≥1 hiddenTest, and an authored solution | ✅ (all 42) |

## Per-task QA matrix (42/42 tasks)

For every task: hidden tests run against `solution` → expect **PASS** (whole
run exits 0), and the same hidden tests run against `starterCode` → expect
**FAIL** (proves the test actually discriminates "done" from "not done").

| Day | Task ID | Title | Solution | Starter |
|---|---|---|---|---|
| 1 | d1-t1 | Build the to-do list markup | ✅ PASS | ✅ FAIL |
| 1 | d1-t2 | Style the to-do list | ✅ PASS | ✅ FAIL |
| 1 | d1-t3 | Read the DOM: count your to-dos | ✅ PASS | ✅ FAIL |
| 1 | d1-t4 | Add an accessible new-to-do form | ✅ PASS | ✅ FAIL |
| 1 | d1-t5 | Lay out a to-do row with flexbox | ✅ PASS | ✅ FAIL |
| 1 | d1-t6 | Read the DOM: report the first and last to-do | ✅ PASS | ✅ FAIL |
| 2 | d2-t1 | Add a to-do with an event listener | ✅ PASS | ✅ FAIL |
| 2 | d2-t2 | Toggle a to-do as done | ✅ PASS | ✅ FAIL |
| 2 | d2-t3 | Delete a to-do (and fix the state/DOM desync bug) | ✅ PASS | ✅ FAIL |
| 2 | d2-t4 | Edit a to-do's text in place | ✅ PASS | ✅ FAIL |
| 2 | d2-t5 | Filter to-dos: All, Active, Completed | ✅ PASS | ✅ FAIL |
| 2 | d2-t6 | Clear completed to-dos in one batch mutation | ✅ PASS | ✅ FAIL |
| 3 | d3-t1 | Fetch todos from the API (and hand-roll loading/error state) | ✅ PASS | ✅ FAIL |
| 3 | d3-t2 | Add a to-do with an optimistic POST (and a manual rollback) | ✅ PASS | ✅ FAIL |
| 3 | d3-t3 | Fix the reload race condition (stale responses winning) | ✅ PASS | ✅ FAIL |
| 3 | d3-t4 | Toggle done with an optimistic PUT (and a per-item rollback) | ✅ PASS | ✅ FAIL |
| 3 | d3-t5 | Delete a to-do with an optimistic DELETE (and a positional rollback) | ✅ PASS | ✅ FAIL |
| 3 | d3-t6 | Prevent double-submit with a hand-rolled isSubmitting flag | ✅ PASS | ✅ FAIL |
| 4 | d4-t1 | Rebuild the loading/error/ready states with useState + JSX | ✅ PASS | ✅ FAIL |
| 4 | d4-t2 | Fetch on mount with useEffect | ✅ PASS | ✅ FAIL |
| 4 | d4-t3 | Add a to-do with setTodos (no manual reconciliation) | ✅ PASS | ✅ FAIL |
| 4 | d4-t4 | Toggle done with setTodos (React mirror of d3-t4's PUT) | ✅ PASS | ✅ FAIL |
| 4 | d4-t5 | Delete a to-do with setTodos (React mirror of d3-t5's DELETE) | ✅ PASS | ✅ FAIL |
| 4 | d4-t6 | Guard double-submit with isSubmitting useState (React mirror of d3-t6) | ✅ PASS | ✅ FAIL |
| 5 | d5-t1 | Extract a TodoItem component that takes a todo prop | ✅ PASS | ✅ FAIL |
| 5 | d5-t2 | Toggle done with a callback prop (lift state up) | ✅ PASS | ✅ FAIL |
| 5 | d5-t3 | Compose a TodoList component (App -> TodoList -> TodoItem) | ✅ PASS | ✅ FAIL |
| 5 | d5-t4 | Add an AddTodoForm with its own local input state | ✅ PASS | ✅ FAIL |
| 5 | d5-t5 | Add a TodoSummary that derives a count from props | ✅ PASS | ✅ FAIL |
| 5 | d5-t6 | Add a FilterBar with local state that filters TodoList | ✅ PASS | ✅ FAIL |
| 6 | d6-t1 | Fetch todos on mount with loading/error state | ✅ PASS | ✅ FAIL |
| 6 | d6-t2 | Cancel the in-flight fetch on unmount with a cleanup function | ✅ PASS | ✅ FAIL |
| 6 | d6-t3 | Re-fetch on prop change with a correct dependency array | ✅ PASS | ✅ FAIL |
| 6 | d6-t4 | Refresh todos on demand with a refreshKey dependency | ✅ PASS | ✅ FAIL |
| 6 | d6-t5 | Poll /api/todos on an interval, cleaned up with clearInterval | ✅ PASS | ✅ FAIL |
| 6 | d6-t6 | Split mount-load and search into two independent effects | ✅ PASS | ✅ FAIL |
| 7 | d7-t1 | Assemble the app shell (App -> TodoList -> TodoItem, wired) | ✅ PASS | ✅ FAIL |
| 7 | d7-t2 | Wire create/toggle/delete to /api/todos end-to-end | ✅ PASS | ✅ FAIL |
| 7 | d7-t3 | Ship it: empty state, error state, and full CRUD polished | ✅ PASS | ✅ FAIL |
| 7 | d7-t4 | Filter the list and derive a remaining-items count | ✅ PASS | ✅ FAIL |
| 7 | d7-t5 | Add optimistic rename with validation | ✅ PASS | ✅ FAIL |
| 7 | d7-t6 | Ship it (v2): bulk-clear completed todos, filter and count wired together | ✅ PASS | ✅ FAIL |

**Result: 42/42 tasks pass solution=PASS & starter=FAIL. Zero failures, zero
tasks needing a fix.**

## Full suite impact

- **Before this ticket (`qa.test.ts` still asserting stale 21/3-per-day count):**
  733 pass / **2 fail** / 2363 expect() calls, 735 tests across 39 files.
  Both failures were in `qa.test.ts` itself:
  1. `"course has exactly 21 tasks (3 per day x 7 days)"` — stale hardcoded
     count from before the 6-tasks/day expansion.
  2. `"task ids are globally unique across the entire course"` — asserted
     `allIds.length === 21`, which is false now that there are 42 tasks; the
     uniqueness check itself was never the problem, only the length literal
     baked into the same assertion.
- **After this ticket's fix:** **735 pass / 0 fail** / 2372 expect() calls,
  735 tests across 39 files.
- Both stale assertions were rewritten to derive expected counts from
  `days` itself (6/day × 7 days, and days.length===7 with orders 1..7) rather
  than hardcoding a new magic number, so this suite won't go stale again on
  the next content rebalance. The id-uniqueness check was verified to
  correctly cover all 42 ids and reports any duplicate loudly (by id and
  count) rather than silently — no duplicates were found in this run.
- No other files in the 39-file suite needed changes; the count fix alone
  restored full green.

## Typecheck

`cd platform && bunx tsc --noEmit` → clean, no errors.

## SPEC.md §8 Definition of Done — content-related items

| Item | Status |
|---|---|
| "Framework boots, loads any valid course (schema-driven)." | Out of scope for this ticket (Workstream A); `validateCourse()` confirms the authored 42-task course *is* schema-valid, which is the content-side half of this. |
| "All 42 tasks authored and passing their own hidden tests." | ✅ **Resolved.** The scope discrepancy flagged in the T12/#15 report (SPEC.md said 42, issue #15 shipped 21) has been closed by the content-expansion tickets (#19–#22): all **42 of 42** authored tasks now pass their own hidden tests (verified here against `solution`) and are proven to discriminate against `starterCode`. |
| "Progress persists across reloads." | Out of scope for this ticket (Workstream A / T5). |
| "Deployed to a public URL." | Out of scope for this ticket (Workstream A / T7, already landed per T7 commit history). |
| "A first-time learner can complete Day 1 with zero setup." | Out of scope for this ticket (Workstream A, runtime/UX). Day 1's 6 tasks are content-verified here (solution passes, starter fails, schema valid). |

## How this was generated

```bash
cd platform
/root/.bun/bin/bun test src/course/content/qa.test.ts   # per-file QA sweep results (91 tests: 7 structural + 42x2 per-task)
/root/.bun/bin/bunx tsc --noEmit                          # typecheck
/root/.bun/bin/bun test                                   # full suite (735 tests across 39 files)
```

No content (`day*.ts`), schema (`schema.ts`), or toolchain source was
modified to produce these results — only `qa.test.ts`'s stale assertions
were corrected. This report is a direct read of `qa.test.ts`'s pass/fail
output plus a full-suite run for before/after comparison.
