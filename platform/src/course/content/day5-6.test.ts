/**
 * Burrow src/course/content — TDD suite for Day 5 & Day 6 (T10, SPEC.md §5).
 *
 * Mirrors day3-4.test.ts's structure exactly. Pins three things per task,
 * for every authored task in day5 + day6:
 *
 *   1. Structural validity — wrapping { day1..day6 } in a Course and running
 *      it through `validateCourse()` (schema.ts, the T1a/T1b seam) must be
 *      `ok: true` with zero errors.
 *   2. Hidden tests pass against the task's own `solution` — each task's
 *      `hiddenTests` are written into a real temp directory alongside the
 *      `solution` files and run with `bun test`; every one must pass.
 *   3. Hidden tests fail against the task's own `starterCode` — same temp-dir
 *      run, but seeded with `starterCode` instead of `solution`; at least one
 *      hidden test must fail (otherwise the task would be gradeable as
 *      "already done" before the learner writes anything).
 *
 * Also pins day/task id uniqueness and day `order` fields across ALL six
 * days (T8's day1/day2, T9's day3/day4, T10's day5/day6), since content is
 * additive and must never collide.
 *
 * Self-containment (T10 ticket rules, same approach as day4.ts/day3-4.test.ts
 * for React content): day5/day6 hidden tests never mount a component, never
 * import React/JSX, and never talk to a live `/api/todos` server. Every
 * hidden test either (a) makes string/regex assertions against the authored
 * `.jsx` source (same technique as day3-4.test.ts's "shape" tests), or
 * (b) exercises a **pure helper function** co-authored in `view.js`
 * alongside each task's component — so `bun test` runs with zero npm
 * installs, zero JSX, zero DOM, zero network.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validateCourse } from "../schema.ts";
import type { Course, Day, FileMap, Task } from "../schema.ts";
import { day1, day2, day3, day4, day5, day6 } from "./index.ts";

const allDays: Day[] = [day1, day2, day3, day4, day5, day6];
const days: Day[] = [day5, day6];

const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

/**
 * Write a FileMap (source files) + a task's hiddenTests into a fresh temp
 * dir, then run `bun test` inside it. Returns whether the whole run
 * succeeded (exit code 0, i.e. every hidden test passed).
 */
async function runHiddenTestsAgainst(task: Task, files: FileMap): Promise<{ passed: boolean; output: string }> {
  const dir = await mkdtemp(join(tmpdir(), "v2r-content-"));
  tempDirs.push(dir);

  for (const [filename, contents] of Object.entries(files)) {
    const filePath = join(dir, filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }

  for (const hiddenTest of task.hiddenTests) {
    const filePath = join(dir, hiddenTest.filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, hiddenTest.contents, "utf8");
  }

  const testFilenames = task.hiddenTests.map((t) => t.filename);
  const proc = Bun.spawn(["bun", "test", ...testFilenames], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { passed: exitCode === 0, output: stdout + stderr };
}

describe("Day 5 + Day 6 — schema validity (in context of all six days)", () => {
  test("wrapping day1..day6 in a Course passes validateCourse() with zero errors", () => {
    const course: Course = {
      id: "vanilla-to-react",
      title: "Vanilla to React",
      days: allDays,
    };
    const result = validateCourse(course);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("day5 is order 5, day6 is order 6", () => {
    expect(day5.order).toBe(5);
    expect(day6.order).toBe(6);
  });

  test("day ids are unique across all six days", () => {
    const ids = allDays.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("task ids are unique within each day and across all six days", () => {
    const allIds = allDays.flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("every day5/day6 task has at least one hint and at least one hidden test", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.hiddenTests.length).toBeGreaterThan(0);
        expect(Array.isArray(t.hints)).toBe(true);
        expect(t.hints.length).toBeGreaterThan(0);
      }
    }
  });

  test("every day5/day6 task has a solution authored", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.solution).toBeDefined();
        expect(Object.keys(t.solution ?? {}).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Day 5 — task count and titles", () => {
  test("day5 has 6 tasks", () => {
    expect(day5.tasks.length).toBe(6);
  });

  test("day5 task titles", () => {
    expect(day5.tasks.map((t) => t.title)).toEqual([
      "Extract a TodoItem component that takes a todo prop",
      "Toggle done with a callback prop (lift state up)",
      "Compose a TodoList component (App -> TodoList -> TodoItem)",
      "Add an AddTodoForm with its own local input state",
      "Add a TodoSummary that derives a count from props",
      "Add a FilterBar with local state that filters TodoList",
    ]);
  });

  test("day5 task ids in order", () => {
    expect(day5.tasks.map((t) => t.id)).toEqual([
      "d5-t1",
      "d5-t2",
      "d5-t3",
      "d5-t4",
      "d5-t5",
      "d5-t6",
    ]);
  });
});

describe("Day 6 — task count and titles", () => {
  test("day6 has 6 tasks", () => {
    expect(day6.tasks.length).toBe(6);
  });

  test("day6 task titles", () => {
    expect(day6.tasks.map((t) => t.title)).toEqual([
      "Fetch todos on mount with loading/error state",
      "Cancel the in-flight fetch on unmount with a cleanup function",
      "Re-fetch on prop change with a correct dependency array",
      "Refresh todos on demand with a refreshKey dependency",
      "Poll /api/todos on an interval, cleaned up with clearInterval",
      "Split mount-load and search into two independent effects",
    ]);
  });

  test("day6 task ids in order", () => {
    expect(day6.tasks.map((t) => t.id)).toEqual([
      "d6-t1",
      "d6-t2",
      "d6-t3",
      "d6-t4",
      "d6-t5",
      "d6-t6",
    ]);
  });
});

describe("hiddenTests pass against solution, fail against starterCode", () => {
  for (const day of days) {
    for (const task of day.tasks) {
      test(`${task.id} — hiddenTests PASS against solution`, async () => {
        expect(task.solution).toBeDefined();
        const { passed, output } = await runHiddenTestsAgainst(task, task.solution!);
        if (!passed) {
          throw new Error(`${task.id} hiddenTests failed against its own solution:\n${output}`);
        }
        expect(passed).toBe(true);
      });

      test(`${task.id} — hiddenTests FAIL against starterCode`, async () => {
        const { passed, output } = await runHiddenTestsAgainst(task, task.starterCode);
        if (passed) {
          throw new Error(
            `${task.id} hiddenTests unexpectedly PASSED against starterCode (task would be ` +
              `gradeable as already complete):\n${output}`,
          );
        }
        expect(passed).toBe(false);
      });
    }
  }
});
