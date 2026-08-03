/**
 * Burrow src/ui — course.ts pure-logic tests (C1, #18 wiring ticket).
 *
 * Only the DOM-free helpers are covered here (same convention as
 * task-runner.test.ts / hints.test.ts — Burrow has no jsdom/happy-dom dep,
 * so DOM-mounting code (`initCourse`) is exercised manually in-app, not in
 * `bun test`). Covers: the boot-view decision (overview vs. auto-resume),
 * the mark-done -> next advancement, and that `loadCourse()` assembles a
 * schema-valid Course out of the real authored content.
 */

import { describe, expect, test } from "bun:test";
import { advanceAfterMarkDone, decideBootView, loadCourse } from "./course.ts";
import { validateCourse } from "../course/schema.ts";
import type { NavigationPosition } from "../course/navigation.ts";

describe("decideBootView", () => {
  test("no saved position -> overview", () => {
    expect(decideBootView(null)).toEqual({ kind: "overview" });
  });

  test("a saved position -> auto-resume to that task", () => {
    const position: NavigationPosition = { dayId: "day-2", taskId: "d2-t1" };
    expect(decideBootView(position)).toEqual({ kind: "task", position });
  });
});

describe("advanceAfterMarkDone", () => {
  test("moving to a different task within the same day counts as advanced", () => {
    const before: NavigationPosition = { dayId: "day-1", taskId: "d1-t1" };
    const after: NavigationPosition = { dayId: "day-1", taskId: "d1-t2" };
    expect(advanceAfterMarkDone(before, after)).toEqual({ advanced: true, position: after });
  });

  test("crossing into the next day counts as advanced", () => {
    const before: NavigationPosition = { dayId: "day-1", taskId: "d1-t3" };
    const after: NavigationPosition = { dayId: "day-2", taskId: "d2-t1" };
    expect(advanceAfterMarkDone(before, after)).toEqual({ advanced: true, position: after });
  });

  test("clamped at the very last task -> not advanced (no-op)", () => {
    const before: NavigationPosition = { dayId: "day-7", taskId: "last-task" };
    const after: NavigationPosition = { dayId: "day-7", taskId: "last-task" };
    expect(advanceAfterMarkDone(before, after)).toEqual({ advanced: false, position: after });
  });
});

describe("loadCourse", () => {
  test("assembles a schema-valid Course from the real authored content", () => {
    const course = loadCourse();
    const result = validateCourse(course);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("has 7 days (day1..day7), ordered", () => {
    const course = loadCourse();
    expect(course.days.length).toBe(7);
    const orders = [...course.days].sort((a, b) => a.order - b.order).map((d) => d.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
