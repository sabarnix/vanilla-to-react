/**
 * Burrow src/course — navigation model tests (T4, #7).
 *
 * Covers: ordering by Day.order, selectDay resetting to first task,
 * next()/prev() crossing day boundaries, clamping at the start/end of the
 * course, and getActiveTask/getActiveDay/current reflecting selection.
 */

import { describe, expect, test } from "bun:test";
import { createNavigation } from "./navigation.ts";
import type { Course } from "./schema.ts";

/** Minimal valid course: 3 days (authored out of order) x varying task counts. */
function makeCourse(): Course {
  return {
    id: "nav-test-course",
    title: "Nav Test Course",
    days: [
      {
        id: "day-2",
        title: "Day Two",
        order: 2,
        tasks: [
          { ...task("d2-t1", "Day 2 Task 1") },
          { ...task("d2-t2", "Day 2 Task 2") },
        ],
      },
      {
        id: "day-1",
        title: "Day One",
        order: 1,
        tasks: [
          { ...task("d1-t1", "Day 1 Task 1") },
          { ...task("d1-t2", "Day 1 Task 2") },
          { ...task("d1-t3", "Day 1 Task 3") },
        ],
      },
      {
        id: "day-3",
        title: "Day Three",
        order: 3,
        tasks: [{ ...task("d3-t1", "Day 3 Task 1") }],
      },
    ],
  };
}

function task(id: string, title: string) {
  return {
    id,
    title,
    description: `Description for ${title}`,
    starterCode: { "index.html": "<html></html>" },
    hints: [],
    hiddenTests: [{ filename: "t.test.ts", contents: 'test("x", () => {});' }],
  };
}

describe("createNavigation — ordering", () => {
  test("days are ordered by Day.order ascending regardless of authoring order", () => {
    const nav = createNavigation(makeCourse());
    expect(nav.days.map((d) => d.id)).toEqual(["day-1", "day-2", "day-3"]);
  });

  test("initial position is the first ordered day's first task", () => {
    const nav = createNavigation(makeCourse());
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t1" });
    expect(nav.getActiveDay().id).toBe("day-1");
    expect(nav.getActiveTask().id).toBe("d1-t1");
  });
});

describe("createNavigation — selectDay", () => {
  test("selecting a day resets to its first task", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t3");
    expect(nav.current.taskId).toBe("d1-t3");

    nav.selectDay("day-2");
    expect(nav.current).toEqual({ dayId: "day-2", taskId: "d2-t1" });
  });

  test("selecting an unknown day id is a no-op", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t2");
    const before = nav.current;

    nav.selectDay("no-such-day");

    expect(nav.current).toEqual(before);
  });
});

describe("createNavigation — selectTask", () => {
  test("selecting a task within the current day updates current.taskId", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t2");
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t2" });
    expect(nav.getActiveTask().title).toBe("Day 1 Task 2");
  });

  test("selecting a task id that belongs to a different day is a no-op", () => {
    const nav = createNavigation(makeCourse());
    const before = nav.current;

    nav.selectTask("d2-t1"); // not in day-1 (the current day)

    expect(nav.current).toEqual(before);
  });
});

describe("createNavigation — next()", () => {
  test("advances within the same day", () => {
    const nav = createNavigation(makeCourse());
    nav.next();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t2" });
    nav.next();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t3" });
  });

  test("crosses into the next day's first task at a day boundary", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t3"); // last task of day-1
    nav.next();
    expect(nav.current).toEqual({ dayId: "day-2", taskId: "d2-t1" });
  });

  test("crosses multiple day boundaries across successive calls", () => {
    const nav = createNavigation(makeCourse());
    nav.selectDay("day-2");
    nav.selectTask("d2-t2"); // last task of day-2
    nav.next();
    expect(nav.current).toEqual({ dayId: "day-3", taskId: "d3-t1" });
  });

  test("clamps at the last task of the last day", () => {
    const nav = createNavigation(makeCourse());
    nav.selectDay("day-3");
    expect(nav.current).toEqual({ dayId: "day-3", taskId: "d3-t1" });

    nav.next();
    expect(nav.current).toEqual({ dayId: "day-3", taskId: "d3-t1" });
    nav.next();
    expect(nav.current).toEqual({ dayId: "day-3", taskId: "d3-t1" });
  });
});

describe("createNavigation — prev()", () => {
  test("steps back within the same day", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t3");
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t2" });
  });

  test("crosses into the previous day's last task at a day boundary", () => {
    const nav = createNavigation(makeCourse());
    nav.selectDay("day-2"); // resets to d2-t1, the first task of day-2
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t3" });
  });

  test("crosses multiple day boundaries backward across successive calls", () => {
    const nav = createNavigation(makeCourse());
    nav.selectDay("day-3"); // day-3 has only 1 task, d3-t1
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-2", taskId: "d2-t2" });
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-2", taskId: "d2-t1" });
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t3" });
  });

  test("clamps at the first task of the first day", () => {
    const nav = createNavigation(makeCourse());
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t1" });

    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t1" });
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "d1-t1" });
  });
});

describe("createNavigation — next()/prev() are inverses across a boundary", () => {
  test("next() then prev() returns to the original position", () => {
    const nav = createNavigation(makeCourse());
    nav.selectTask("d1-t3");
    const before = nav.current;

    nav.next(); // -> day-2/d2-t1
    nav.prev(); // -> back to day-1/d1-t3

    expect(nav.current).toEqual(before);
  });
});

describe("createNavigation — getActiveTask/getActiveDay reflect selection", () => {
  test("getActiveTask and getActiveDay track selectDay/selectTask", () => {
    const nav = createNavigation(makeCourse());
    nav.selectDay("day-2");
    nav.selectTask("d2-t2");

    expect(nav.getActiveDay().id).toBe("day-2");
    expect(nav.getActiveTask().id).toBe("d2-t2");
    expect(nav.getActiveTask().title).toBe("Day 2 Task 2");
  });

  test("getActiveTask and getActiveDay track next()/prev()", () => {
    const nav = createNavigation(makeCourse());
    nav.next();
    nav.next();

    expect(nav.getActiveDay().id).toBe("day-1");
    expect(nav.getActiveTask().id).toBe("d1-t3");
  });
});

describe("createNavigation — single-day, single-task course", () => {
  test("next() and prev() are no-ops when there is nowhere to go", () => {
    const course: Course = {
      id: "tiny",
      title: "Tiny Course",
      days: [{ id: "day-1", title: "Only Day", order: 1, tasks: [task("only-task", "Only Task")] }],
    };
    const nav = createNavigation(course);

    nav.next();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "only-task" });
    nav.prev();
    expect(nav.current).toEqual({ dayId: "day-1", taskId: "only-task" });
  });
});
