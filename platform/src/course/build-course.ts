/**
 * Burrow src/course — course assembly helper (C1, #18 wiring ticket).
 *
 * The content package (`content/index.ts`) only owns the ordered `Day[]`
 * list (by design — see that file's docstring: content tickets never touch
 * course-assembly code). Something has to wrap that into a real `Course`
 * (schema.ts: `{ id, title, days }`) for `createNavigation`/`validateCourse`
 * to consume. `sample-course.ts` hand-writes that shape for the 1-task
 * fixture; this is the minimal, reusable version for a real `days` array.
 *
 * Pure, DOM-free, zero I/O — trivially unit-testable.
 */

import type { Course, Day } from "./schema.ts";

export interface BuildCourseOptions {
  id?: string;
  title?: string;
}

const DEFAULT_COURSE_ID = "vanilla-to-react";
const DEFAULT_COURSE_TITLE = "Vanilla to React";

/**
 * Wrap an ordered `Day[]` (e.g. `content/index.ts`'s `days`) into a `Course`.
 * Days are NOT re-sorted here — `createNavigation` (navigation.ts) already
 * sorts by `Day.order` ascending, so this only needs to pass them through.
 */
export function buildCourse(days: Day[], options: BuildCourseOptions = {}): Course {
  return {
    id: options.id ?? DEFAULT_COURSE_ID,
    title: options.title ?? DEFAULT_COURSE_TITLE,
    days,
  };
}
