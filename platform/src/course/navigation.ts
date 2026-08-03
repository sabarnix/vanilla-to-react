/**
 * Burrow src/course — Day/Course navigation model (T4, #7).
 *
 * Pure, framework-agnostic state machine over a `Course` (schema.ts). This
 * is the nav layer T2's task runner renders into: it tracks which Day+Task
 * is "active" and lets the caller move between them (select directly, or
 * step forward/backward crossing Day boundaries).
 *
 * Deliberately has ZERO DOM/UI code so it's trivially unit-testable and so
 * T5 (progress persistence) can serialize the current position — see
 * `NavigationPosition` — without dragging in any rendering concerns. DOM
 * rendering lives in the sibling file `nav-view.ts`.
 */

import type { Course, Day, Task } from "./schema.ts";

/** The serializable "where am I" pointer — this is what T5 persists. */
export interface NavigationPosition {
  dayId: string;
  taskId: string;
}

/** Pure Day/Task navigation state machine over a Course. */
export interface Navigation {
  /** Days ordered by `Day.order` ascending (stable for equal `order`). */
  readonly days: Day[];
  /** Current { dayId, taskId } — always a valid position within `days`. */
  readonly current: NavigationPosition;
  /** Jump to a Day by id. Resets `current.taskId` to that Day's first task. No-op if the id doesn't exist. */
  selectDay(dayId: string): void;
  /** Jump to a Task by id within the *current* Day. No-op if the id isn't a task of the current Day. */
  selectTask(taskId: string): void;
  /** Advance one Task. At the last task of a Day, moves to the next Day's first task. Clamps at the very last task of the very last Day. */
  next(): void;
  /** Step back one Task. At the first task of a Day, moves to the previous Day's last task. Clamps at the very first task of the very first Day. */
  prev(): void;
  /** The Task object for the current position. */
  getActiveTask(): Task;
  /** The Day object for the current position. */
  getActiveDay(): Day;
}

/**
 * Build a Navigation state machine for `course`. Days are sorted by
 * `Day.order` ascending once, up front; the initial position is the first
 * Day's first Task.
 *
 * Throws if `course.days` is empty or any Day has no tasks — the schema
 * requires both to be non-empty (schema.ts), so this only fires on
 * already-invalid course data (validate with `validateCourse` first).
 */
export function createNavigation(course: Course): Navigation {
  const days = [...course.days].sort((a, b) => a.order - b.order);

  if (days.length === 0) {
    throw new Error("createNavigation: course.days must be non-empty");
  }
  for (const day of days) {
    if (day.tasks.length === 0) {
      throw new Error(`createNavigation: day "${day.id}" has no tasks`);
    }
  }

  let dayIndex = 0;
  let taskIndex = 0;

  function findDayIndex(dayId: string): number {
    return days.findIndex((d) => d.id === dayId);
  }

  function findTaskIndex(day: Day, taskId: string): number {
    return day.tasks.findIndex((t) => t.id === taskId);
  }

  function selectDay(dayId: string): void {
    const idx = findDayIndex(dayId);
    if (idx === -1) return;
    dayIndex = idx;
    taskIndex = 0;
  }

  function selectTask(taskId: string): void {
    const day = days[dayIndex]!;
    const idx = findTaskIndex(day, taskId);
    if (idx === -1) return;
    taskIndex = idx;
  }

  function next(): void {
    const day = days[dayIndex]!;
    if (taskIndex < day.tasks.length - 1) {
      taskIndex += 1;
      return;
    }
    if (dayIndex < days.length - 1) {
      dayIndex += 1;
      taskIndex = 0;
    }
    // else: already at the last task of the last day — clamp (no-op).
  }

  function prev(): void {
    if (taskIndex > 0) {
      taskIndex -= 1;
      return;
    }
    if (dayIndex > 0) {
      dayIndex -= 1;
      taskIndex = days[dayIndex]!.tasks.length - 1;
      return;
    }
    // else: already at the first task of the first day — clamp (no-op).
  }

  function getActiveDay(): Day {
    return days[dayIndex]!;
  }

  function getActiveTask(): Task {
    return days[dayIndex]!.tasks[taskIndex]!;
  }

  return {
    days,
    get current(): NavigationPosition {
      return { dayId: days[dayIndex]!.id, taskId: days[dayIndex]!.tasks[taskIndex]!.id };
    },
    selectDay,
    selectTask,
    next,
    prev,
    getActiveTask,
    getActiveDay,
  };
}
