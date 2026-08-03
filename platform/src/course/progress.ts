/**
 * Burrow src/course — progress persistence (T5, #8, SPEC.md §8).
 *
 * Persists a learner's progress across reloads:
 *
 *   - current position, the exact `NavigationPosition` shape from
 *     navigation.ts (T4) — { dayId, taskId } — so it round-trips straight
 *     into `Navigation.selectDay`/`selectTask` on restore.
 *   - per-task completion status, keyed by `Task.id` (schema.ts).
 *
 * Pure store: no DOM/UI code, no dependency on navigation.ts or
 * task-runner.ts. Callers wire this up with thin bind functions that pass
 * callbacks/values in — see `bindNavigationPersistence` and
 * `bindCompletionSignal` below — so this module stays decoupled from those
 * seams while still being trivial to hook up.
 *
 * Storage is injectable (`Storage`-shaped: { getItem, setItem }) so tests
 * can supply an in-memory fake instead of touching real `window.localStorage`.
 * All reads/writes tolerate missing or corrupt data — this store never
 * throws due to bad persisted state; it just falls back to sensible
 * defaults (null position, empty completion set).
 */

/** The serializable "where am I" pointer — identical shape to navigation.ts's NavigationPosition. */
export interface ProgressPosition {
  dayId: string;
  taskId: string;
}

/**
 * Minimal storage backend this store depends on. `window.localStorage`
 * satisfies this structurally; tests inject an in-memory fake instead.
 */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Pure progress store over one course's worth of position + completion state. */
export interface ProgressStore {
  /** The persisted position, or null if never set (or unreadable). */
  getPosition(): ProgressPosition | null;
  /** Persist the current position. */
  setPosition(position: ProgressPosition): void;
  /** Whether `taskId` has been marked complete. */
  isComplete(taskId: string): boolean;
  /** Mark `taskId` as complete (idempotent). */
  markComplete(taskId: string): void;
  /** All completed task ids, in the order they were first marked complete. */
  getCompleted(): string[];
  /** Clear all persisted state (position + completion) for this course. */
  reset(): void;
}

/** Shape persisted as JSON under the store's namespaced key. */
interface PersistedState {
  position: ProgressPosition | null;
  completed: string[];
}

const DEFAULT_STATE: PersistedState = { position: null, completed: [] };

function isProgressPosition(value: unknown): value is ProgressPosition {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).dayId === "string" &&
    typeof (value as Record<string, unknown>).taskId === "string"
  );
}

/**
 * Parse persisted JSON into a well-formed `PersistedState`, tolerating any
 * combination of missing keys, wrong types, or outright corrupt JSON by
 * falling back to (parts of) `DEFAULT_STATE`. Never throws.
 */
function parseState(raw: string | null): PersistedState {
  if (raw === null) return { ...DEFAULT_STATE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_STATE };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ...DEFAULT_STATE };
  }

  const obj = parsed as Record<string, unknown>;

  const position = isProgressPosition(obj.position) ? obj.position : null;

  const completed =
    Array.isArray(obj.completed) && obj.completed.every((v) => typeof v === "string")
      ? (obj.completed as string[])
      : [];

  return { position, completed };
}

function defaultStorage(): ProgressStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

/**
 * Build a progress store for `courseId`. Keys are namespaced as
 * `v2r:progress:<courseId>` so multiple courses' progress never collides in
 * the same storage backend.
 *
 * `storage` defaults to `window.localStorage` when available (browser
 * runtime); tests should always pass an explicit in-memory fake.
 */
export function createProgressStore(courseId: string, storage?: ProgressStorage): ProgressStore {
  const backend = storage ?? defaultStorage();
  const key = `v2r:progress:${courseId}`;

  function read(): PersistedState {
    if (!backend) return { ...DEFAULT_STATE };
    let raw: string | null;
    try {
      raw = backend.getItem(key);
    } catch {
      return { ...DEFAULT_STATE };
    }
    return parseState(raw);
  }

  function write(state: PersistedState): void {
    if (!backend) return;
    try {
      backend.setItem(key, JSON.stringify(state));
    } catch {
      // Storage unavailable/full/throwing (e.g. private-browsing quota) —
      // silently drop the write rather than crashing the learner's session.
    }
  }

  return {
    getPosition(): ProgressPosition | null {
      return read().position;
    },

    setPosition(position: ProgressPosition): void {
      const state = read();
      write({ ...state, position });
    },

    isComplete(taskId: string): boolean {
      return read().completed.includes(taskId);
    },

    markComplete(taskId: string): void {
      const state = read();
      if (state.completed.includes(taskId)) return;
      write({ ...state, completed: [...state.completed, taskId] });
    },

    getCompleted(): string[] {
      return read().completed;
    },

    reset(): void {
      write({ ...DEFAULT_STATE });
    },
  };
}

// ---- decoupled wiring helpers -----------------------------------------------
//
// These accept plain callbacks/values rather than importing navigation.ts or
// a test-harness module directly, so progress.ts has zero compile-time
// coupling to either seam while still making the common wiring one-liners
// for callers that do own those modules.

/**
 * Wire a store to persist position changes from a navigation-like source.
 *
 * `subscribe` is supplied by the caller (e.g. an observer/hook around
 * `Navigation.current` from navigation.ts) and is invoked with the new
 * position whenever it changes; this just forwards it to `store.setPosition`.
 * Returns an unsubscribe function if `subscribe` provided one, otherwise
 * a no-op.
 */
export function bindNavigationPersistence(
  store: ProgressStore,
  subscribe: (onPositionChange: (position: ProgressPosition) => void) => (() => void) | void,
): () => void {
  const unsubscribe = subscribe((position) => {
    store.setPosition(position);
  });
  return unsubscribe ?? (() => {});
}

/**
 * Wire a store to record completion signals from a test-harness-like
 * source. `subscribe` is supplied by the caller (e.g. an event emitter
 * around "all hidden tests passed" from the T3 test harness) and is invoked
 * with the completed task's id; this just forwards it to
 * `store.markComplete`. Returns an unsubscribe function if `subscribe`
 * provided one, otherwise a no-op.
 */
export function bindCompletionSignal(
  store: ProgressStore,
  subscribe: (onTaskComplete: (taskId: string) => void) => (() => void) | void,
): () => void {
  const unsubscribe = subscribe((taskId) => {
    store.markComplete(taskId);
  });
  return unsubscribe ?? (() => {});
}
