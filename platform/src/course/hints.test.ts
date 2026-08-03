/**
 * Burrow src/course — hints + solution reveal controller tests (T6, #9).
 *
 * Headless: hints.ts is a pure state machine (no DOM), same rationale as
 * task-runner.test.ts's split — this file never touches hints-view.ts's
 * DOM-mounting piece.
 */

import { describe, expect, test } from "bun:test";
import type { Task } from "./schema.ts";
import type { TestHarnessReport } from "./test-harness.ts";
import {
  createHintController,
  DEFAULT_FAILURES_BEFORE_SOLUTION,
  type HintControllerOptions,
} from "./hints.ts";

function baseTask(overrides?: Partial<Task>): Task {
  return {
    id: "d1-t1",
    title: "Sample task",
    description: "Do the thing.",
    starterCode: { "index.js": "// start\n" },
    hints: ["Try X first.", "Then think about Y.", "Finally, do Z."],
    hiddenTests: [{ filename: "x.test.ts", contents: 'test("x", () => {});\n' }],
    solution: { "index.js": "// solved\n" },
    ...overrides,
  };
}

function passingReport(): TestHarnessReport {
  return { overall: "pass", tests: [{ name: "t", status: "pass" }], complete: true, rawOutput: "" };
}

function failingReport(): TestHarnessReport {
  return { overall: "fail", tests: [{ name: "t", status: "fail" }], complete: false, rawOutput: "" };
}

describe("createHintController — revealing hints", () => {
  test("totalHints matches task.hints.length", () => {
    const controller = createHintController(baseTask());
    expect(controller.totalHints).toBe(3);
  });

  test("revealedCount starts at 0", () => {
    const controller = createHintController(baseTask());
    expect(controller.revealedCount()).toBe(0);
    expect(controller.revealedHints()).toEqual([]);
  });

  test("revealNextHint reveals hints one at a time, in order", () => {
    const controller = createHintController(baseTask());

    expect(controller.revealNextHint()).toBe("Try X first.");
    expect(controller.revealedCount()).toBe(1);
    expect(controller.revealedHints()).toEqual(["Try X first."]);

    expect(controller.revealNextHint()).toBe("Then think about Y.");
    expect(controller.revealedCount()).toBe(2);
    expect(controller.revealedHints()).toEqual(["Try X first.", "Then think about Y."]);
  });

  test("revealNextHint stops at total — returns null once exhausted", () => {
    const controller = createHintController(baseTask());

    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();
    expect(controller.revealedCount()).toBe(3);

    expect(controller.revealNextHint()).toBeNull();
    expect(controller.revealedCount()).toBe(3);
    expect(controller.revealedHints()).toEqual([
      "Try X first.",
      "Then think about Y.",
      "Finally, do Z.",
    ]);
  });

  test("a task with no hints: totalHints is 0 and revealNextHint always returns null", () => {
    const controller = createHintController(baseTask({ hints: [] }));
    expect(controller.totalHints).toBe(0);
    expect(controller.revealNextHint()).toBeNull();
    expect(controller.revealedCount()).toBe(0);
  });
});

describe("createHintController — canRevealSolution gating", () => {
  test("false before any attempts or hints, even if the task has a solution", () => {
    const controller = createHintController(baseTask());
    expect(controller.canRevealSolution()).toBe(false);
  });

  test("false when the task has no solution, regardless of attempts/hints exhausted", () => {
    const controller = createHintController(baseTask({ solution: undefined }));
    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();
    controller.registerAttempt(failingReport());
    controller.registerAttempt(failingReport());
    controller.registerAttempt(failingReport());
    expect(controller.canRevealSolution()).toBe(false);
  });

  test("becomes true after reaching the default failed-attempt threshold", () => {
    const controller = createHintController(baseTask());

    for (let i = 0; i < DEFAULT_FAILURES_BEFORE_SOLUTION - 1; i++) {
      controller.registerAttempt(failingReport());
    }
    expect(controller.canRevealSolution()).toBe(false);

    controller.registerAttempt(failingReport());
    expect(controller.canRevealSolution()).toBe(true);
  });

  test("passing attempts do not count toward the failed-attempt threshold", () => {
    const controller = createHintController(baseTask());

    controller.registerAttempt(failingReport());
    controller.registerAttempt(passingReport());
    controller.registerAttempt(passingReport());
    expect(controller.failedAttempts()).toBe(1);
    expect(controller.canRevealSolution()).toBe(false);
  });

  test("becomes true once all hints are exhausted, even with zero failed attempts", () => {
    const controller = createHintController(baseTask());

    controller.revealNextHint();
    controller.revealNextHint();
    expect(controller.canRevealSolution()).toBe(false);

    controller.revealNextHint();
    expect(controller.revealedCount()).toBe(3);
    expect(controller.canRevealSolution()).toBe(true);
  });

  test("respects a custom failuresBeforeSolution threshold", () => {
    const opts: HintControllerOptions = { failuresBeforeSolution: 1 };
    const controller = createHintController(baseTask(), opts);

    expect(controller.canRevealSolution()).toBe(false);
    controller.registerAttempt(failingReport());
    expect(controller.canRevealSolution()).toBe(true);
  });

  test("a task with zero hints does not spuriously satisfy the hint-exhaustion gate", () => {
    // hints.length === 0 should not count as "exhausted" for gating purposes
    // on its own — solution reveal for a no-hints task still requires
    // failed attempts to reach the threshold.
    const controller = createHintController(baseTask({ hints: [] }));
    expect(controller.canRevealSolution()).toBe(false);
    controller.registerAttempt(failingReport());
    controller.registerAttempt(failingReport());
    expect(controller.canRevealSolution()).toBe(false);
    controller.registerAttempt(failingReport());
    expect(controller.canRevealSolution()).toBe(true);
  });
});

describe("createHintController — revealSolution", () => {
  test("returns null when gating is not satisfied", () => {
    const controller = createHintController(baseTask());
    expect(controller.revealSolution()).toBeNull();
    expect(controller.solutionRevealed()).toBe(false);
  });

  test("returns the solution FileMap once gating is satisfied", () => {
    const controller = createHintController(baseTask());
    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();

    const solution = controller.revealSolution();
    expect(solution).toEqual({ "index.js": "// solved\n" });
    expect(controller.solutionRevealed()).toBe(true);
  });

  test("returns null when the task has no solution, even if gating is satisfied", () => {
    const controller = createHintController(baseTask({ solution: undefined }));
    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();

    expect(controller.revealSolution()).toBeNull();
    expect(controller.solutionRevealed()).toBe(false);
  });

  test("returned solution is a copy — mutating it does not affect the task or future reveals", () => {
    const task = baseTask();
    const controller = createHintController(task);
    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();

    const solution = controller.revealSolution()!;
    solution["index.js"] = "tampered";

    expect(task.solution).toEqual({ "index.js": "// solved\n" });
    expect(controller.revealSolution()).toEqual({ "index.js": "// solved\n" });
  });
});

describe("createHintController — registerAttempt", () => {
  test("failedAttempts starts at 0", () => {
    const controller = createHintController(baseTask());
    expect(controller.failedAttempts()).toBe(0);
  });

  test("increments failedAttempts only for reports with complete: false", () => {
    const controller = createHintController(baseTask());
    controller.registerAttempt(failingReport());
    controller.registerAttempt(passingReport());
    controller.registerAttempt(failingReport());
    expect(controller.failedAttempts()).toBe(2);
  });

  test("registerAttempt updates gating as attempts accumulate", () => {
    const controller = createHintController(baseTask());
    expect(controller.canRevealSolution()).toBe(false);
    for (let i = 0; i < DEFAULT_FAILURES_BEFORE_SOLUTION; i++) {
      controller.registerAttempt(failingReport());
    }
    expect(controller.canRevealSolution()).toBe(true);
  });
});

describe("createHintController — reset", () => {
  test("reset clears revealed hints, failed attempts, and solution-revealed state", () => {
    const controller = createHintController(baseTask());
    controller.revealNextHint();
    controller.revealNextHint();
    controller.revealNextHint();
    controller.registerAttempt(failingReport());
    controller.revealSolution();

    expect(controller.revealedCount()).toBe(3);
    expect(controller.failedAttempts()).toBe(1);
    expect(controller.solutionRevealed()).toBe(true);

    controller.reset();

    expect(controller.revealedCount()).toBe(0);
    expect(controller.revealedHints()).toEqual([]);
    expect(controller.failedAttempts()).toBe(0);
    expect(controller.solutionRevealed()).toBe(false);
    expect(controller.canRevealSolution()).toBe(false);
  });

  test("after reset, hints can be revealed again from the start", () => {
    const controller = createHintController(baseTask());
    controller.revealNextHint();
    controller.reset();
    expect(controller.revealNextHint()).toBe("Try X first.");
  });
});
