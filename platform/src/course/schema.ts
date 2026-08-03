/**
 * Burrow src/course — course-content schema (the T1a/T1b seam, SPEC.md §3/§5).
 *
 * This is the authoritative TypeScript contract for course content:
 *
 *   Course -> Day[] -> Task[]
 *
 * Workstream A (framework, T2+) loads/renders against these types. Workstream
 * B (content, T8+) authors data literals that satisfy them. Neither side
 * needs to touch the other's code — they only need to agree on this file.
 *
 * No schema-validation library (e.g. zod) is a dependency of this package
 * (see platform/package.json) — see SCHEMA.md for the "why hand-rolled"
 * rationale. `validateCourse()` below is a hand-rolled structural validator
 * that mirrors these types and returns every problem in one pass instead of
 * throwing on the first one, which matters for content authors iterating on
 * 42 tasks across 7 days.
 */

/** A map of filename -> file contents, relative to the task's working dir. */
export type FileMap = Record<string, string>;

/**
 * A hidden test file's contents plus the name it should be written under.
 * Kept as data (not a function) so it can be embedded in a VFS and run by
 * the framework's own test harness (T3) — content authors never need to
 * import framework code to write a test.
 */
export interface HiddenTest {
  /** Filename the test is written to before running, e.g. "heading.test.ts". */
  filename: string;
  /** Full source of the test file (Bun test syntax — see COMPAT.md). */
  contents: string;
}

/** A single unit of work a learner completes inside one Day. */
export interface Task {
  /** Stable unique id within the course, e.g. "d1-t1". Kebab-case. */
  id: string;
  /** Short human-readable title shown in navigation. Must be non-empty. */
  title: string;
  /** Task prompt/instructions, authored as Markdown. Must be non-empty. */
  description: string;
  /** Files the learner's editor is seeded with. Must have at least 1 entry. */
  starterCode: FileMap;
  /** Progressive hints, revealed one at a time. May be empty (no hints). */
  hints: string[];
  /**
   * Hidden tests that grade the task (T3 test harness). Must have at least
   * 1 entry — every task must be machine-checkable.
   */
  hiddenTests: HiddenTest[];
  /**
   * Optional revealable solution, keyed the same way as starterCode. Present
   * per SPEC.md §3's domain model; optional because not every task needs one
   * authored up front.
   */
  solution?: FileMap;
  /**
   * Optional prompt for an AI/heuristic check beyond the hidden tests (e.g.
   * "does this look idiomatic?"). Free text; the framework decides how (or
   * whether) to act on it.
   */
  evalPrompt?: string;
}

/** A single day of the course, containing an ordered list of Tasks. */
export interface Day {
  /** Stable unique id within the course, e.g. "day-1". Kebab-case. */
  id: string;
  /** Human-readable title, e.g. "HTML, CSS & the DOM". Must be non-empty. */
  title: string;
  /** 1-based display order among the course's days. Must be a positive integer. */
  order: number;
  /** Ordered tasks for this day. Must have at least 1 entry. */
  tasks: Task[];
}

/** The top-level course document: metadata + an ordered list of Days. */
export interface Course {
  /** Stable unique id for the course, e.g. "vanilla-to-react". */
  id: string;
  /** Human-readable course title. Must be non-empty. */
  title: string;
  /** Ordered days. Must have at least 1 entry. */
  days: Day[];
}

/** Result of validating an unknown value against the Course schema. */
export interface ValidationResult {
  ok: boolean;
  /** Human-readable problems, empty iff ok is true. Every problem is collected. */
  errors: string[];
}

// ---- internal helpers -------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isFileMap(value: unknown): value is FileMap {
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return false;
  return entries.every(([k, v]) => typeof k === "string" && k.length > 0 && typeof v === "string");
}

function validateHiddenTest(value: unknown, path: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${path}: must be an object with { filename, contents }`);
    return;
  }
  if (!isNonEmptyString(value.filename)) {
    errors.push(`${path}.filename: must be a non-empty string`);
  }
  if (typeof value.contents !== "string" || value.contents.length === 0) {
    errors.push(`${path}.contents: must be a non-empty string`);
  }
}

function validateTask(value: unknown, path: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${path}: must be an object`);
    return;
  }

  if (!isNonEmptyString(value.id)) {
    errors.push(`${path}.id: must be a non-empty string`);
  }
  if (!isNonEmptyString(value.title)) {
    errors.push(`${path}.title: must be a non-empty string`);
  }
  if (!isNonEmptyString(value.description)) {
    errors.push(`${path}.description: must be a non-empty markdown string`);
  }

  if (!("starterCode" in value)) {
    errors.push(`${path}.starterCode: is required`);
  } else if (!isFileMap(value.starterCode)) {
    errors.push(`${path}.starterCode: must be a non-empty map of filename -> contents`);
  }

  if (!("hints" in value)) {
    errors.push(`${path}.hints: is required (may be an empty array)`);
  } else if (!isStringArray(value.hints)) {
    errors.push(`${path}.hints: must be an array of strings`);
  }

  if (!("hiddenTests" in value)) {
    errors.push(`${path}.hiddenTests: is required`);
  } else if (!Array.isArray(value.hiddenTests) || value.hiddenTests.length === 0) {
    errors.push(`${path}.hiddenTests: must be a non-empty array`);
  } else {
    value.hiddenTests.forEach((t, i) => validateHiddenTest(t, `${path}.hiddenTests[${i}]`, errors));
  }

  if ("solution" in value && value.solution !== undefined && !isFileMap(value.solution)) {
    errors.push(`${path}.solution: if present, must be a non-empty map of filename -> contents`);
  }

  if ("evalPrompt" in value && value.evalPrompt !== undefined && typeof value.evalPrompt !== "string") {
    errors.push(`${path}.evalPrompt: if present, must be a string`);
  }
}

function validateDay(value: unknown, path: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${path}: must be an object`);
    return;
  }

  if (!isNonEmptyString(value.id)) {
    errors.push(`${path}.id: must be a non-empty string`);
  }
  if (!isNonEmptyString(value.title)) {
    errors.push(`${path}.title: must be a non-empty string`);
  }
  if (typeof value.order !== "number" || !Number.isInteger(value.order) || value.order < 1) {
    errors.push(`${path}.order: must be a positive integer`);
  }

  if (!("tasks" in value)) {
    errors.push(`${path}.tasks: is required`);
  } else if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    errors.push(`${path}.tasks: must be a non-empty array`);
  } else {
    value.tasks.forEach((t, i) => validateTask(t, `${path}.tasks[${i}]`, errors));

    const ids = value.tasks
      .filter((t): t is Record<string, unknown> => isPlainObject(t) && isNonEmptyString(t.id))
      .map((t) => t.id as string);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        errors.push(`${path}.tasks: duplicate task id "${id}"`);
      }
      seen.add(id);
    }
  }
}

/**
 * Validate an unknown value against the Course schema, collecting every
 * problem found rather than stopping at the first one. Safe to call on
 * untrusted/parsed JSON (e.g. content loaded at runtime).
 */
export function validateCourse(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return { ok: false, errors: ["course: must be an object"] };
  }

  if (!isNonEmptyString(value.id)) {
    errors.push("course.id: must be a non-empty string");
  }
  if (!isNonEmptyString(value.title)) {
    errors.push("course.title: must be a non-empty string");
  }

  if (!("days" in value)) {
    errors.push("course.days: is required");
  } else if (!Array.isArray(value.days) || value.days.length === 0) {
    errors.push("course.days: must be a non-empty array");
  } else {
    value.days.forEach((d, i) => validateDay(d, `course.days[${i}]`, errors));

    const ids = value.days
      .filter((d): d is Record<string, unknown> => isPlainObject(d) && isNonEmptyString(d.id))
      .map((d) => d.id as string);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        errors.push(`course.days: duplicate day id "${id}"`);
      }
      seen.add(id);
    }
  }

  return { ok: errors.length === 0, errors };
}
