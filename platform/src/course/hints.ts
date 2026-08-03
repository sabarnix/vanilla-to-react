/**
 * Burrow src/course — hints + solution reveal controller (T6, #9,
 * SPEC.md §5 "Hints + solution reveal UI").
 *
 * Given a task's `hints` and optional `solution` (schema.ts — LOCKED
 * contract from #4), this module is a pure, DOM-free state machine that:
 *
 *   1. reveals hints one at a time (`revealNextHint`),
 *   2. tracks failed grading attempts fed in from the T3 test harness
 *      (`registerAttempt`, consuming `TestHarnessReport.complete`),
 *   3. gates a "reveal solution" affordance (`canRevealSolution`) so the
 *      answer isn't handed out for free — it only unlocks after the
 *      learner has genuinely struggled (N failed attempts) OR has already
 *      burned through every hint, whichever comes first,
 *   4. hands back the solution's `FileMap` on `revealSolution()` so the
 *      caller (a view/UI layer) can load it straight into the T2 task
 *      runner's editor via `TaskRunnerHandle`/`TaskFileState`.
 *
 * Split in the same two-halves shape as task-runner.ts/test-harness.ts:
 *   - Pure logic (this file): a plain closure over in-memory counters, no
 *     DOM, no storage, no I/O. Fully unit-testable with `bun test`.
 *   - `hints-view.ts`: the thin DOM-touching rendering layer that drives
 *     this controller from button clicks and a confirm step.
 *
 * Deliberately NOT persisted here (unlike progress.ts, T5) — hint/solution
 * reveal state is scoped to a single task-viewing session in memory, same
 * lifetime as `TaskFileState` (T2). If a future ticket wants revealed-hints
 * to survive reloads, that's an explicit persistence layer on top of this
 * controller's state, not something this module should assume.
 */

import type { FileMap, Task } from "./schema.ts";
import type { TestHarnessReport } from "./test-harness.ts";

/** Tunables for when the "reveal solution" affordance unlocks. */
export interface HintControllerOptions {
  /**
   * Number of *failed* attempts (`registerAttempt` called with a report
   * where `complete` is false) after which solution reveal unlocks, even if
   * hints remain. Default: 3 — enough attempts to show genuine struggle
   * without being punitive for a single typo-driven failure.
   */
  failuresBeforeSolution?: number;
}

/** Default failed-attempt threshold — see `HintControllerOptions` above. */
export const DEFAULT_FAILURES_BEFORE_SOLUTION = 3;

/** Pure controller over one task's hint/solution reveal state. */
export interface HintController {
  /** Total number of hints authored for this task (`task.hints.length`). */
  readonly totalHints: number;
  /** How many hints have been revealed so far (0..totalHints). */
  revealedCount(): number;
  /**
   * Reveal the next hint and return its text, or `null` if every hint has
   * already been revealed (no more to give / task has no hints).
   */
  revealNextHint(): string | null;
  /** All hints revealed so far, in order. */
  revealedHints(): string[];
  /**
   * Whether the "reveal solution" affordance should be enabled right now:
   * the task must actually have a `solution`, AND (failed-attempt count has
   * reached the configured threshold OR every hint has been revealed).
   */
  canRevealSolution(): boolean;
  /**
   * Reveal the task's solution `FileMap`, or `null` if the task has no
   * solution authored, or if `canRevealSolution()` is false (reveal is
   * gated — this is a deliberate, confirmable action, not a free read).
   * Marks the solution as revealed (see `solutionRevealed()`).
   */
  revealSolution(): FileMap | null;
  /** Whether `revealSolution()` has already been called successfully. */
  solutionRevealed(): boolean;
  /** How many failed attempts have been registered so far. */
  failedAttempts(): number;
  /**
   * Feed in a grading result from the T3 test harness. Only failing reports
   * (`report.complete === false`) increment the failed-attempt counter that
   * feeds `canRevealSolution()`'s gating; passing reports are a no-op here
   * (task completion is T5's concern, not this controller's).
   */
  registerAttempt(report: TestHarnessReport): void;
  /** Reset all reveal/attempt state back to the controller's initial state. */
  reset(): void;
}

/**
 * Build a hint/solution controller for `task`. Pure — holds only in-memory
 * counters, no DOM/storage/network. Safe to construct fresh per task view.
 */
export function createHintController(task: Task, opts?: HintControllerOptions): HintController {
  const failuresBeforeSolution = opts?.failuresBeforeSolution ?? DEFAULT_FAILURES_BEFORE_SOLUTION;
  const totalHints = task.hints.length;

  let revealed = 0;
  let failures = 0;
  let solutionWasRevealed = false;

  function hintsExhausted(): boolean {
    return totalHints > 0 && revealed >= totalHints;
  }

  function gateSatisfied(): boolean {
    return failures >= failuresBeforeSolution || hintsExhausted();
  }

  return {
    totalHints,

    revealedCount(): number {
      return revealed;
    },

    revealNextHint(): string | null {
      if (revealed >= totalHints) return null;
      const hint = task.hints[revealed]!;
      revealed += 1;
      return hint;
    },

    revealedHints(): string[] {
      return task.hints.slice(0, revealed);
    },

    canRevealSolution(): boolean {
      if (!task.solution) return false;
      return gateSatisfied();
    },

    revealSolution(): FileMap | null {
      if (!task.solution) return null;
      if (!gateSatisfied()) return null;
      solutionWasRevealed = true;
      return { ...task.solution };
    },

    solutionRevealed(): boolean {
      return solutionWasRevealed;
    },

    failedAttempts(): number {
      return failures;
    },

    registerAttempt(report: TestHarnessReport): void {
      if (!report.complete) {
        failures += 1;
      }
    },

    reset(): void {
      revealed = 0;
      failures = 0;
      solutionWasRevealed = false;
    },
  };
}
