/**
 * Burrow src/course/content — content index.
 *
 * Exports the authored Days in course order. Day 1-2 (T8), Day 3-4 (T9),
 * Day 5-6 (T10), and Day 7 (T11, the capstone) are appended here, in
 * order, following this exact shape:
 *
 *   export const days: Day[] = [day1, day2, day3, day4, day5, day6, day7];
 *
 * Consumers (e.g. a real Course object, the framework's course loader)
 * import `days` from here and assemble `{ id, title, days }` — this module
 * only owns the ordered Day[] list, not the Course wrapper, so content
 * tickets never need to touch course-assembly code.
 */

import { day1 } from "./day1.ts";
import { day2 } from "./day2.ts";
import { day3 } from "./day3.ts";
import { day4 } from "./day4.ts";
import { day5 } from "./day5.ts";
import { day6 } from "./day6.ts";
import { day7 } from "./day7.ts";

export { day1, day2, day3, day4, day5, day6, day7 };

/** Ordered Days for the course, in display order. Append future days here. */
export const days = [day1, day2, day3, day4, day5, day6, day7];
