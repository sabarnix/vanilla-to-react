/**
 * Burrow src/course/content — TDD suite for Day 1 & Day 2 (T8, SPEC.md §5).
 *
 * Pins three things per task, for every authored task in day1 + day2:
 *
 *   1. Structural validity — wrapping { day1, day2 } in a Course and running
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
 * Also pins day/task id uniqueness and day `order` fields, since T9+ append
 * more days to the same `days` array and must not collide with these ids.
 *
 * This suite shells out to the real `bun test` binary per task (not just
 * `validateCourse`) because hiddenTests are *data* (HiddenTest.contents is a
 * string of real Bun test source, per schema.ts) — the only faithful way to
 * confirm they pass/fail as authored is to actually run them under Bun, the
 * same way the framework's hidden-test harness (T3) will.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validateCourse } from "../schema.ts";
import type { Course, Day, FileMap, Task } from "../schema.ts";
import { day1, day2 } from "./index.ts";

const days: Day[] = [day1, day2];

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

describe("Day 1 + Day 2 — schema validity", () => {
  test("wrapping day1 + day2 in a Course passes validateCourse() with zero errors", () => {
    const course: Course = {
      id: "vanilla-to-react",
      title: "Vanilla to React",
      days,
    };
    const result = validateCourse(course);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("day1 is order 1, day2 is order 2", () => {
    expect(day1.order).toBe(1);
    expect(day2.order).toBe(2);
  });

  test("day ids are unique", () => {
    const ids = days.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("task ids are unique within each day and across both days", () => {
    const allIds = days.flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("every task has at least one hint and at least one hidden test", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.hiddenTests.length).toBeGreaterThan(0);
        expect(Array.isArray(t.hints)).toBe(true);
      }
    }
  });

  test("every task has a solution authored", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.solution).toBeDefined();
        expect(Object.keys(t.solution ?? {}).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Day 1 — task count and titles", () => {
  test("day1 has 3 tasks", () => {
    expect(day1.tasks.length).toBe(3);
  });

  test("day1 task titles", () => {
    expect(day1.tasks.map((t) => t.title)).toEqual([
      "Build the to-do list markup",
      "Style the to-do list",
      "Read the DOM: count your to-dos",
    ]);
  });
});

describe("Day 2 — task count and titles", () => {
  test("day2 has 3 tasks", () => {
    expect(day2.tasks.length).toBe(3);
  });

  test("day2 task titles", () => {
    expect(day2.tasks.map((t) => t.title)).toEqual([
      "Add a to-do with an event listener",
      "Toggle a to-do as done",
      "Delete a to-do (and fix the state/DOM desync bug)",
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
