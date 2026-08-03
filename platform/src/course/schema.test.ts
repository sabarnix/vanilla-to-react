/**
 * Burrow src/course — schema validator (headless, no VFS/toolchain deps).
 *
 * This pins the course-content contract (SPEC.md §3, §5, #4): a Course is a
 * tree of Day[] -> Task[], authored as plain data so Workstream A (framework)
 * and Workstream B (content) can build against it independently. The
 * validator is hand-rolled (no zod in package.json — see SCHEMA.md) and
 * returns { ok, errors } rather than throwing, so content authors get every
 * problem in one pass instead of fixing one error at a time.
 */

import { describe, expect, test } from "bun:test";
import { sampleCourse } from "./sample-course.ts";
import { validateCourse } from "./schema.ts";
import type { Course } from "./schema.ts";

/** Deep-clone helper so mutation tests never leak into other tests. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("validateCourse — accepts the sample course", () => {
  test("the shipped 1-task sample course is valid", () => {
    const result = validateCourse(sampleCourse);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("sample course has exactly 1 day and 1 task", () => {
    expect(sampleCourse.days.length).toBe(1);
    expect(sampleCourse.days[0]!.tasks.length).toBe(1);
  });
});

describe("validateCourse — rejects malformed shapes", () => {
  test("rejects a course missing a title", () => {
    const bad = clone(sampleCourse) as unknown as Course;
    // @ts-expect-error — deliberately malformed for the test
    delete bad.title;

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /title/i.test(e))).toBe(true);
  });

  test("rejects a course with an empty days array", () => {
    const bad = clone(sampleCourse);
    bad.days = [];

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /days/i.test(e))).toBe(true);
  });

  test("rejects a task missing starterCode", () => {
    const bad = clone(sampleCourse);
    // @ts-expect-error — deliberately malformed for the test
    delete bad.days[0]!.tasks[0]!.starterCode;

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /starterCode/i.test(e))).toBe(true);
  });

  test("rejects a task with an empty title", () => {
    const bad = clone(sampleCourse);
    bad.days[0]!.tasks[0]!.title = "";

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /title/i.test(e))).toBe(true);
  });

  test("rejects a day with no tasks", () => {
    const bad = clone(sampleCourse);
    bad.days[0]!.tasks = [];

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /tasks/i.test(e))).toBe(true);
  });

  test("rejects a task whose hints is not an array of strings", () => {
    const bad = clone(sampleCourse) as unknown as {
      days: Array<{ tasks: Array<{ hints: unknown }> }>;
    };
    bad.days[0]!.tasks[0]!.hints = "not-an-array";

    const result = validateCourse(bad as unknown as Course);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /hints/i.test(e))).toBe(true);
  });

  test("rejects duplicate day ids", () => {
    const bad = clone(sampleCourse);
    const day2 = clone(bad.days[0]!);
    bad.days.push(day2); // same id as days[0]

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /duplicate/i.test(e) && /day/i.test(e))).toBe(true);
  });

  test("rejects non-object input entirely", () => {
    const result = validateCourse(null as unknown as Course);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("collects multiple errors in a single pass", () => {
    const bad = clone(sampleCourse) as unknown as Course;
    // @ts-expect-error — deliberately malformed
    delete bad.title;
    bad.days = [];

    const result = validateCourse(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
