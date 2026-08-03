/**
 * Burrow src/course — progress persistence tests (T5, #8).
 *
 * Covers: position round-trip, markComplete/isComplete, getCompleted
 * ordering, reset clearing keys, corrupt/missing JSON tolerance, key
 * namespacing by courseId, and two courses not colliding in the same
 * storage backend. Uses an in-memory fake storage — no real
 * `window.localStorage` needed.
 */

import { describe, expect, test } from "bun:test";
import {
  bindCompletionSignal,
  bindNavigationPersistence,
  createProgressStore,
  type ProgressStorage,
} from "./progress.ts";

/** In-memory fake satisfying the { getItem, setItem } storage shape. */
function makeFakeStorage(): ProgressStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string): string | null {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

describe("createProgressStore — position", () => {
  test("getPosition returns null when nothing has been set", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    expect(store.getPosition()).toBeNull();
  });

  test("setPosition/getPosition round-trips the exact NavigationPosition shape", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.setPosition({ dayId: "day-2", taskId: "d2-t3" });

    expect(store.getPosition()).toEqual({ dayId: "day-2", taskId: "d2-t3" });
  });

  test("setPosition overwrites a previously persisted position", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.setPosition({ dayId: "day-1", taskId: "d1-t1" });
    store.setPosition({ dayId: "day-3", taskId: "d3-t2" });

    expect(store.getPosition()).toEqual({ dayId: "day-3", taskId: "d3-t2" });
  });

  test("position persists across separate store instances sharing storage", () => {
    const storage = makeFakeStorage();
    const store1 = createProgressStore("course-a", storage);
    store1.setPosition({ dayId: "day-1", taskId: "d1-t2" });

    const store2 = createProgressStore("course-a", storage);
    expect(store2.getPosition()).toEqual({ dayId: "day-1", taskId: "d1-t2" });
  });
});

describe("createProgressStore — completion", () => {
  test("isComplete is false for an unmarked task", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    expect(store.isComplete("d1-t1")).toBe(false);
  });

  test("markComplete then isComplete returns true", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.markComplete("d1-t1");

    expect(store.isComplete("d1-t1")).toBe(true);
  });

  test("markComplete is idempotent — marking twice doesn't duplicate", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.markComplete("d1-t1");
    store.markComplete("d1-t1");

    expect(store.getCompleted()).toEqual(["d1-t1"]);
  });

  test("getCompleted returns ids in the order first marked complete", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.markComplete("d1-t2");
    store.markComplete("d1-t1");
    store.markComplete("d2-t1");

    expect(store.getCompleted()).toEqual(["d1-t2", "d1-t1", "d2-t1"]);
  });

  test("completion and position are independent state", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.setPosition({ dayId: "day-1", taskId: "d1-t1" });
    store.markComplete("d1-t1");

    expect(store.getPosition()).toEqual({ dayId: "day-1", taskId: "d1-t1" });
    expect(store.getCompleted()).toEqual(["d1-t1"]);
  });
});

describe("createProgressStore — reset", () => {
  test("reset clears both position and completion", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    store.setPosition({ dayId: "day-2", taskId: "d2-t1" });
    store.markComplete("d1-t1");
    store.markComplete("d1-t2");

    store.reset();

    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
    expect(store.isComplete("d1-t1")).toBe(false);
  });

  test("reset still leaves a readable (non-corrupt) key behind", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);
    store.markComplete("d1-t1");

    store.reset();

    expect(() => store.getPosition()).not.toThrow();
    expect(storage.data.get("v2r:progress:course-a")).toBeDefined();
  });
});

describe("createProgressStore — corrupt/missing data tolerance", () => {
  test("malformed JSON in storage is tolerated, returns defaults", () => {
    const storage = makeFakeStorage();
    storage.setItem("v2r:progress:course-a", "{not valid json!!!");
    const store = createProgressStore("course-a", storage);

    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
    expect(store.isComplete("d1-t1")).toBe(false);
  });

  test("valid JSON but wrong shape (array instead of object) is tolerated", () => {
    const storage = makeFakeStorage();
    storage.setItem("v2r:progress:course-a", JSON.stringify(["not", "an", "object"]));
    const store = createProgressStore("course-a", storage);

    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
  });

  test("valid JSON object with garbage field types is tolerated", () => {
    const storage = makeFakeStorage();
    storage.setItem(
      "v2r:progress:course-a",
      JSON.stringify({ position: "not-an-object", completed: "not-an-array" }),
    );
    const store = createProgressStore("course-a", storage);

    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
  });

  test("position missing dayId/taskId fields falls back to null", () => {
    const storage = makeFakeStorage();
    storage.setItem(
      "v2r:progress:course-a",
      JSON.stringify({ position: { dayId: "day-1" }, completed: [] }),
    );
    const store = createProgressStore("course-a", storage);

    expect(store.getPosition()).toBeNull();
  });

  test("completed array with non-string entries falls back to empty", () => {
    const storage = makeFakeStorage();
    storage.setItem(
      "v2r:progress:course-a",
      JSON.stringify({ position: null, completed: ["ok", 42, null] }),
    );
    const store = createProgressStore("course-a", storage);

    expect(store.getCompleted()).toEqual([]);
  });

  test("a storage backend that throws on getItem does not crash the store", () => {
    const throwingStorage: ProgressStorage = {
      getItem(): string {
        throw new Error("boom");
      },
      setItem(): void {},
    };
    const store = createProgressStore("course-a", throwingStorage);

    expect(() => store.getPosition()).not.toThrow();
    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
  });

  test("a storage backend that throws on setItem does not crash the store", () => {
    const throwingStorage: ProgressStorage = {
      getItem(): string | null {
        return null;
      },
      setItem(): void {
        throw new Error("quota exceeded");
      },
    };
    const store = createProgressStore("course-a", throwingStorage);

    expect(() => store.setPosition({ dayId: "day-1", taskId: "d1-t1" })).not.toThrow();
    expect(() => store.markComplete("d1-t1")).not.toThrow();
  });

  test("no storage backend at all (undefined) behaves like a no-op store", () => {
    const store = createProgressStore("course-a", undefined as unknown as ProgressStorage);

    expect(() => store.setPosition({ dayId: "day-1", taskId: "d1-t1" })).not.toThrow();
    expect(store.getPosition()).toBeNull();
    expect(store.getCompleted()).toEqual([]);
  });
});

describe("createProgressStore — key namespacing", () => {
  test("keys are namespaced as v2r:progress:<courseId>", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("vanilla-to-react", storage);

    store.setPosition({ dayId: "day-1", taskId: "d1-t1" });

    expect(storage.data.has("v2r:progress:vanilla-to-react")).toBe(true);
  });

  test("two different courseIds do not collide in the same storage backend", () => {
    const storage = makeFakeStorage();
    const storeA = createProgressStore("course-a", storage);
    const storeB = createProgressStore("course-b", storage);

    storeA.setPosition({ dayId: "day-1", taskId: "d1-t1" });
    storeA.markComplete("d1-t1");

    storeB.setPosition({ dayId: "day-2", taskId: "d2-t5" });
    storeB.markComplete("d2-t5");
    storeB.markComplete("d2-t6");

    expect(storeA.getPosition()).toEqual({ dayId: "day-1", taskId: "d1-t1" });
    expect(storeA.getCompleted()).toEqual(["d1-t1"]);

    expect(storeB.getPosition()).toEqual({ dayId: "day-2", taskId: "d2-t5" });
    expect(storeB.getCompleted()).toEqual(["d2-t5", "d2-t6"]);
  });

  test("reset on one course does not affect another course's progress", () => {
    const storage = makeFakeStorage();
    const storeA = createProgressStore("course-a", storage);
    const storeB = createProgressStore("course-b", storage);

    storeA.markComplete("d1-t1");
    storeB.markComplete("d2-t1");

    storeA.reset();

    expect(storeA.getCompleted()).toEqual([]);
    expect(storeB.getCompleted()).toEqual(["d2-t1"]);
  });
});

describe("bindNavigationPersistence", () => {
  test("forwards position changes from the subscribed source to the store", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    let handler: ((position: { dayId: string; taskId: string }) => void) | undefined;
    bindNavigationPersistence(store, (onChange) => {
      handler = onChange;
    });

    handler?.({ dayId: "day-2", taskId: "d2-t1" });

    expect(store.getPosition()).toEqual({ dayId: "day-2", taskId: "d2-t1" });
  });

  test("returns the subscribe-provided unsubscribe function when given", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    let unsubscribed = false;
    const unsubscribe = bindNavigationPersistence(store, () => () => {
      unsubscribed = true;
    });
    unsubscribe();

    expect(unsubscribed).toBe(true);
  });

  test("returns a no-op unsubscribe when subscribe provides none", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    const unsubscribe = bindNavigationPersistence(store, () => {});

    expect(() => unsubscribe()).not.toThrow();
  });
});

describe("bindCompletionSignal", () => {
  test("forwards completion signals from the subscribed source to the store", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    let handler: ((taskId: string) => void) | undefined;
    bindCompletionSignal(store, (onComplete) => {
      handler = onComplete;
    });

    handler?.("d1-t1");
    handler?.("d1-t2");

    expect(store.getCompleted()).toEqual(["d1-t1", "d1-t2"]);
  });

  test("returns the subscribe-provided unsubscribe function when given", () => {
    const storage = makeFakeStorage();
    const store = createProgressStore("course-a", storage);

    let unsubscribed = false;
    const unsubscribe = bindCompletionSignal(store, () => () => {
      unsubscribed = true;
    });
    unsubscribe();

    expect(unsubscribed).toBe(true);
  });
});
