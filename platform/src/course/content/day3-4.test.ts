/**
 * Burrow src/course/content — TDD suite for Day 3 & Day 4 (T9, SPEC.md §5).
 *
 * Mirrors day1-2.test.ts's structure exactly. Pins three things per task,
 * for every authored task in day3 + day4:
 *
 *   1. Structural validity — wrapping { day1..day4 } in a Course and running
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
 * Also pins day/task id uniqueness and day `order` fields across ALL four
 * days (T8's day1/day2 plus T9's day3/day4), since content is additive and
 * must never collide.
 *
 * Networking self-containment (SPEC.md §7 / T9 ticket rules): day3's tasks
 * target the platform's stable `/api/todos` REST contract, but this suite
 * never talks to a live server. Every day3 hidden test either (a) makes
 * string/regex assertions against the authored `app.js` source (same
 * technique as day1-2.test.ts), or (b) mocks `fetch` inline (a plain
 * `(globalThis as any).fetch = (...) => Promise<Response-shaped object>`)
 * and evaluates the task's own app.js source in an isolated `new Function`
 * scope to exercise real runtime behavior (e.g. the d3-t3 race-condition
 * guard), so `bun test` never requires a live `/api/todos` server or actual
 * network access — exactly like day3.ts's own doc comment describes. day4's
 * React tasks author hidden tests against **pure helper functions** in
 * `view.js` (no JSX, no React import, no DOM) so they run under plain
 * `bun test` with no npm install and no browser.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validateCourse } from "../schema.ts";
import type { Course, Day, FileMap, Task } from "../schema.ts";
import { day1, day2, day3, day4 } from "./index.ts";

const allDays: Day[] = [day1, day2, day3, day4];
const days: Day[] = [day3, day4];

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

describe("Day 3 + Day 4 — schema validity (in context of all four days)", () => {
  test("wrapping day1..day4 in a Course passes validateCourse() with zero errors", () => {
    const course: Course = {
      id: "vanilla-to-react",
      title: "Vanilla to React",
      days: allDays,
    };
    const result = validateCourse(course);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("day3 is order 3, day4 is order 4", () => {
    expect(day3.order).toBe(3);
    expect(day4.order).toBe(4);
  });

  test("day ids are unique across all four days", () => {
    const ids = allDays.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("task ids are unique within each day and across all four days", () => {
    const allIds = allDays.flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("every day3/day4 task has at least one hint and at least one hidden test", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.hiddenTests.length).toBeGreaterThan(0);
        expect(Array.isArray(t.hints)).toBe(true);
        expect(t.hints.length).toBeGreaterThan(0);
      }
    }
  });

  test("every day3/day4 task has a solution authored", () => {
    for (const day of days) {
      for (const t of day.tasks) {
        expect(t.solution).toBeDefined();
        expect(Object.keys(t.solution ?? {}).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Day 3 — task count and titles", () => {
  test("day3 has 6 tasks", () => {
    expect(day3.tasks.length).toBe(6);
  });

  test("day3 task titles", () => {
    expect(day3.tasks.map((t) => t.title)).toEqual([
      "Fetch todos from the API (and hand-roll loading/error state)",
      "Add a to-do with an optimistic POST (and a manual rollback)",
      "Fix the reload race condition (stale responses winning)",
      "Toggle done with an optimistic PUT (and a per-item rollback)",
      "Delete a to-do with an optimistic DELETE (and a positional rollback)",
      "Prevent double-submit with a hand-rolled isSubmitting flag",
    ]);
  });

  test("day3 task ids are d3-t1..d3-t6, in order", () => {
    expect(day3.tasks.map((t) => t.id)).toEqual([
      "d3-t1",
      "d3-t2",
      "d3-t3",
      "d3-t4",
      "d3-t5",
      "d3-t6",
    ]);
  });
});

describe("Day 4 — task count and titles", () => {
  test("day4 has 6 tasks", () => {
    expect(day4.tasks.length).toBe(6);
  });

  test("day4 task titles", () => {
    expect(day4.tasks.map((t) => t.title)).toEqual([
      "Rebuild the loading/error/ready states with useState + JSX",
      "Fetch on mount with useEffect",
      "Add a to-do with setTodos (no manual reconciliation)",
      "Toggle done with setTodos (React mirror of d3-t4's PUT)",
      "Delete a to-do with setTodos (React mirror of d3-t5's DELETE)",
      "Guard double-submit with isSubmitting useState (React mirror of d3-t6)",
    ]);
  });

  test("day4 task ids are d4-t1..d4-t6, in order", () => {
    expect(day4.tasks.map((t) => t.id)).toEqual([
      "d4-t1",
      "d4-t2",
      "d4-t3",
      "d4-t4",
      "d4-t5",
      "d4-t6",
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
