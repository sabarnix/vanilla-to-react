/**
 * Burrow src/course/content — QA sweep (T12, SPEC.md §5, issue #15; content
 * expansion to 6 tasks/day per issue #23).
 *
 * The final QA gate for Workstream B. Proves EVERY authored task (all 42:
 * 6/day x 7 days) actually works end-to-end through the SAME machinery the
 * framework uses to grade a learner — not a paraphrase of it.
 *
 * This does not invent a new runtime. It reuses, verbatim, the
 * `runHiddenTestsAgainst` throwaway-temp-dir pattern already established and
 * proven by day1-2.test.ts / day3-4.test.ts / day5-6.test.ts / day7.test.ts:
 * write a task's files + its own `hiddenTests` into a fresh temp dir and run
 * them with the real `bun test` binary (the same primitive test-harness.ts's
 * `runHiddenTests()` — the T3 harness — uses internally, see that module's
 * docstring for why this is "the existing Burrow bun toolchain" and not the
 * in-browser bun.wasm VFS runner, which cannot run `bun:test` at all).
 *
 * What this suite pins, across ALL 7 days at once (superset of the per-day
 * suites, which remain as-is and are not touched):
 *
 *   1. Schema validity — assembling { day1..day7 } into a full 7-day Course
 *      and running it through `validateCourse()` must be `ok: true` with
 *      zero errors.
 *   2. Global id hygiene — every task id is unique across the ENTIRE course
 *      (not just within a day), and every day's `order` is 1..7 contiguous
 *      with no gaps/dupes.
 *   3. Count invariant — each of the 7 days has exactly 6 tasks (derived
 *      from `days`, not hardcoded per-day slices), and the course-wide total
 *      is exactly 42 (6 x 7). Asserted per-day AND as a sum so a future
 *      per-day rebalance (e.g. 5+7) that still sums to 42 is caught.
 *   4. Per-task discrimination — for every one of the 42 tasks, its
 *      `hiddenTests` PASS when run against that task's own `solution`, and
 *      FAIL when run against that task's own `starterCode`. This is the
 *      literal Definition-of-Done bar from SPEC.md §8 ("all tasks authored
 *      and passing their own hidden tests") plus the "actually
 *      discriminates" half the per-day suites already established.
 *
 * Self-containment: no new mocking is introduced here. As already documented
 * by day3-4.test.ts (day3's networking tasks) and day7.test.ts (the
 * capstone), every hidden test across all 42 tasks is authored as either (a)
 * string/regex "shape" assertions against source, or (b) exercises a pure
 * helper function, or (c) mocks `fetch` inline and evaluates source in an
 * isolated scope. None of the 42 tasks' hiddenTests talk to a live
 * `/api/todos` server, so this sweep runs under plain `bun test` with zero
 * npm installs, zero browser, and zero network — same as every suite it
 * reuses the pattern from.
 *
 * Slow on purpose: this spawns a real `bun test` subprocess per task per
 * file-set (42 tasks x 2 = 84 real subprocess runs), on top of what the
 * per-day suites already do. Timeouts are generous (see `test(..., { timeout })`
 * below) to absorb CI/sandbox variance.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validateCourse } from "../schema.ts";
import type { Course, Day, FileMap, Task } from "../schema.ts";
import { day1, day2, day3, day4, day5, day6, day7 } from "./index.ts";

const allDays: Day[] = [day1, day2, day3, day4, day5, day6, day7];

const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

/**
 * Write a FileMap (source files) + a task's hiddenTests into a fresh temp
 * dir, then run `bun test` inside it. Returns whether the whole run
 * succeeded (exit code 0, i.e. every hidden test passed). Identical
 * approach to the one already proven in day1-2.test.ts / day7.test.ts —
 * duplicated here (not imported) so this suite has no dependency on any
 * other test file's internals, matching this codebase's existing
 * per-suite-self-contained convention.
 */
async function runHiddenTestsAgainst(task: Task, files: FileMap): Promise<{ passed: boolean; output: string }> {
  const dir = await mkdtemp(join(tmpdir(), "v2r-qa-"));
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

describe("QA sweep — full course schema validity", () => {
  test("assembling day1..day7 into a Course passes validateCourse() with zero errors", () => {
    const course: Course = {
      id: "vanilla-to-react",
      title: "Vanilla to React",
      days: allDays,
    };
    const result = validateCourse(course);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("course has exactly 7 days", () => {
    expect(allDays.length).toBe(7);
  });

  test("course has exactly 42 tasks total (6 per day x 7 days), derived from `days`", () => {
    for (const d of allDays) {
      expect(d.tasks.length).toBe(6);
    }

    const total = allDays.reduce((n, d) => n + d.tasks.length, 0);
    expect(total).toBe(42);
  });

  test("day orders are 1..7, contiguous, no gaps or duplicates", () => {
    const orders = allDays.map((d) => d.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("day ids are unique across the whole course", () => {
    const ids = allDays.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("task ids are globally unique across the entire course (not just within a day)", () => {
    const allIds = allDays.flatMap((d) => d.tasks.map((t) => t.id));
    // Derived from `days` — the expected count is 6 tasks/day x 7 days, but
    // we assert it via the same live sum used above rather than a bare
    // literal, so this test can never drift from the actual authored count.
    const expectedTotal = allDays.reduce((n, d) => n + d.tasks.length, 0);
    expect(expectedTotal).toBe(42);
    expect(allIds.length).toBe(expectedTotal);

    const seen = new Map<string, number>();
    for (const id of allIds) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate task id(s) found across the course (must be globally unique): ` +
          duplicates.map(([id, count]) => `"${id}" (x${count})`).join(", "),
      );
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("every task across all 7 days has a non-empty title, description, starterCode, hints array, hiddenTests, and solution", () => {
    for (const day of allDays) {
      for (const t of day.tasks) {
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
        expect(Object.keys(t.starterCode).length).toBeGreaterThan(0);
        expect(Array.isArray(t.hints)).toBe(true);
        expect(t.hiddenTests.length).toBeGreaterThan(0);
        expect(t.solution).toBeDefined();
        expect(Object.keys(t.solution ?? {}).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("QA sweep — hiddenTests PASS against solution, FAIL against starterCode (all 42 tasks)", () => {
  for (const day of allDays) {
    for (const task of day.tasks) {
      test(
        `${day.id}/${task.id} — hiddenTests PASS against solution`,
        async () => {
          expect(task.solution).toBeDefined();
          const { passed, output } = await runHiddenTestsAgainst(task, task.solution!);
          if (!passed) {
            throw new Error(`${task.id} hiddenTests failed against its own solution:\n${output}`);
          }
          expect(passed).toBe(true);
        },
        { timeout: 30_000 },
      );

      test(
        `${day.id}/${task.id} — hiddenTests FAIL against starterCode`,
        async () => {
          const { passed, output } = await runHiddenTestsAgainst(task, task.starterCode);
          if (passed) {
            throw new Error(
              `${task.id} hiddenTests unexpectedly PASSED against starterCode (task would be ` +
                `gradeable as already complete):\n${output}`,
            );
          }
          expect(passed).toBe(false);
        },
        { timeout: 30_000 },
      );
    }
  }
});
