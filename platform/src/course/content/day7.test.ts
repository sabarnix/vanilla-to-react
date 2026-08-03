/**
 * Burrow src/course/content — TDD suite for Day 7 (T11, SPEC.md §5, the
 * capstone).
 *
 * Mirrors day5-6.test.ts's structure exactly. Pins three things per task:
 *
 *   1. Structural validity — wrapping { day1..day7 } in a Course and running
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
 * Also pins day/task id uniqueness and day `order` fields across ALL seven
 * days (T8's day1/day2, T9's day3/day4, T10's day5/day6, T11's day7), since
 * content is additive and must never collide.
 *
 * Self-containment (T11 ticket rules, same approach as day4.ts/day5.ts/
 * day6.ts and their *.test.ts for React content): day7 hidden tests never
 * mount a component, never import React/JSX, and never talk to a live
 * `/api/todos` server. Every hidden test either (a) makes string/regex
 * assertions against the authored `.jsx` source (same technique as
 * day3-4.test.ts's "shape" tests), or (b) exercises a **pure helper
 * function** co-authored in `view.js` alongside each task's component — so
 * `bun test` runs with zero npm installs, zero JSX, zero DOM, zero network.
 *
 * D4(#22) expanded day7 from 3 to 6 tasks: d7-t4 (filtering + derived
 * remaining-count), d7-t5 (optimistic rename with validation), and d7-t6
 * (bulk "clear completed" + final polish) were appended after the original
 * d7-t1..t3, following the exact same pure-helper + shape-test approach.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validateCourse } from "../schema.ts";
import type { Course, Day, FileMap, Task } from "../schema.ts";
import { day1, day2, day3, day4, day5, day6, day7 } from "./index.ts";

const allDays: Day[] = [day1, day2, day3, day4, day5, day6, day7];
const days: Day[] = [day7];

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

describe("Day 7 — schema validity (in context of all seven days)", () => {
  test("wrapping day1..day7 in a Course passes validateCourse() with zero errors", () => {
    const course: Course = {
      id: "vanilla-to-react",
      title: "Vanilla to React",
      days: allDays,
    };
    const result = validateCourse(course);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("day7 is order 7", () => {
    expect(day7.order).toBe(7);
  });

  test("day ids are unique across all seven days", () => {
    const ids = allDays.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("task ids are unique within each day and across all seven days", () => {
    const allIds = allDays.flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("every day7 task has at least one hint and at least one hidden test", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.hiddenTests.length).toBeGreaterThan(0);
        expect(Array.isArray(t.hints)).toBe(true);
        expect(t.hints.length).toBeGreaterThan(0);
      }
    }
  });

  test("every day7 task has a solution authored", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.solution).toBeDefined();
        expect(Object.keys(t.solution ?? {}).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Day 7 — task count and titles", () => {
  test("day7 has 6 tasks", () => {
    expect(day7.tasks.length).toBe(6);
  });

  test("day7 task titles", () => {
    expect(day7.tasks.map((t) => t.title)).toEqual([
      "Assemble the app shell (App -> TodoList -> TodoItem, wired)",
      "Wire create/toggle/delete to /api/todos end-to-end",
      "Ship it: empty state, error state, and full CRUD polished",
      "Filter the list and derive a remaining-items count",
      "Add optimistic rename with validation",
      "Ship it (v2): bulk-clear completed todos, filter and count wired together",
    ]);
  });

  test("day7 task ids are the expected d7-t1..t6, in order", () => {
    expect(day7.tasks.map((t) => t.id)).toEqual([
      "d7-t1",
      "d7-t2",
      "d7-t3",
      "d7-t4",
      "d7-t5",
      "d7-t6",
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
