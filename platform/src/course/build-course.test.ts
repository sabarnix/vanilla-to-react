/**
 * Burrow src/course — build-course.ts tests (C1, #18 wiring ticket).
 */

import { describe, expect, test } from "bun:test";
import { buildCourse } from "./build-course.ts";
import { validateCourse } from "./schema.ts";
import type { Day } from "./schema.ts";

function makeDay(id: string, order: number): Day {
  return {
    id,
    title: `Day ${order}`,
    order,
    tasks: [
      {
        id: `${id}-t1`,
        title: "A task",
        description: "## A task\n\nDo the thing.",
        starterCode: { "index.html": "<h1>hi</h1>" },
        hints: [],
        hiddenTests: [{ filename: "x.test.ts", contents: 'test("x", () => {});' }],
      },
    ],
  };
}

describe("buildCourse", () => {
  test("wraps a Day[] into a valid Course with default id/title", () => {
    const days = [makeDay("day-1", 1), makeDay("day-2", 2)];
    const course = buildCourse(days);

    expect(course.id).toBe("vanilla-to-react");
    expect(course.title).toBe("Vanilla to React");
    expect(course.days).toBe(days);
    expect(validateCourse(course).ok).toBe(true);
  });

  test("accepts an id/title override", () => {
    const days = [makeDay("day-1", 1)];
    const course = buildCourse(days, { id: "custom-id", title: "Custom Title" });

    expect(course.id).toBe("custom-id");
    expect(course.title).toBe("Custom Title");
  });

  test("does not re-sort or mutate the input days array", () => {
    const days = [makeDay("day-2", 2), makeDay("day-1", 1)];
    const course = buildCourse(days);

    expect(course.days.map((d) => d.id)).toEqual(["day-2", "day-1"]);
  });
});
