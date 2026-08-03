/**
 * Burrow src/course — task runner tests (T2, headless: no DOM dependency —
 * see task-runner.ts's split between pure logic and mountTaskRunner()'s
 * DOM-only piece; Burrow has no happy-dom/jsdom dep, so DOM mounting itself
 * is exercised manually in-app, not here).
 */

import { describe, expect, test } from "bun:test";
import type { Task } from "./schema.ts";
import { sampleCourse } from "./sample-course.ts";
import { renderTaskDescription, starterFileNames, TaskFileState } from "./task-runner.ts";

const sampleTask: Task = sampleCourse.days[0]!.tasks[0]!;

function multiFileTask(): Task {
  return {
    id: "multi-t1",
    title: "Multi-file task",
    description: "## Two files\n\nEdit both.",
    starterCode: {
      "index.html": "<h1>hi</h1>\n",
      "app.ts": "export const x = 1;\n",
    },
    hints: [],
    hiddenTests: [{ filename: "x.test.ts", contents: 'test("x", () => {});\n' }],
  };
}

describe("renderTaskDescription", () => {
  test("renders the task's markdown description to HTML", () => {
    const html = renderTaskDescription(sampleTask);
    expect(html).toContain("<h2>Make the heading say Hello</h2>");
    expect(html).toContain("<code>index.html</code>");
    expect(html).toContain("<code>&lt;h1&gt;</code>");
  });

  test("escapes description content — cannot inject markup", () => {
    const task: Task = { ...sampleTask, description: '<img src=x onerror=alert(1)>' };
    const html = renderTaskDescription(task);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  test("different tasks render independently (no shared mutable state)", () => {
    const a = renderTaskDescription(sampleTask);
    const b = renderTaskDescription({ ...sampleTask, description: "# Other" });
    expect(a).toContain("Make the heading say Hello");
    expect(b).toBe("<h1>Other</h1>");
  });
});

describe("starterFileNames", () => {
  test("returns the single starterCode filename for the sample task", () => {
    expect(starterFileNames(sampleTask)).toEqual(["index.html"]);
  });

  test("preserves starterCode key order for multi-file tasks", () => {
    expect(starterFileNames(multiFileTask())).toEqual(["index.html", "app.ts"]);
  });
});

describe("TaskFileState — seeding", () => {
  test("seeds from the task's starterCode verbatim", () => {
    const state = new TaskFileState(sampleTask);
    expect(state.getFileContents("index.html")).toBe(sampleTask.starterCode["index.html"]!);
  });

  test("fileNames() reflects starterCode order", () => {
    const state = new TaskFileState(multiFileTask());
    expect(state.fileNames()).toEqual(["index.html", "app.ts"]);
  });

  test("getCurrentFiles() initially round-trips starterCode exactly", () => {
    const task = multiFileTask();
    const state = new TaskFileState(task);
    expect(state.getCurrentFiles()).toEqual(task.starterCode);
  });

  test("does not mutate the original Task's starterCode object", () => {
    const task = multiFileTask();
    const state = new TaskFileState(task);
    state.setFileContents("app.ts", "export const x = 2;\n");
    expect(task.starterCode["app.ts"]).toBe("export const x = 1;\n");
    expect(state.getFileContents("app.ts")).toBe("export const x = 2;\n");
  });
});

describe("TaskFileState — edits round-trip through getCurrentFiles()", () => {
  test("a single-file edit round-trips", () => {
    const state = new TaskFileState(sampleTask);
    state.setFileContents("index.html", "<h1>Hello</h1>\n");
    expect(state.getCurrentFiles()).toEqual({ "index.html": "<h1>Hello</h1>\n" });
  });

  test("multi-file: editing one file leaves the other untouched", () => {
    const task = multiFileTask();
    const state = new TaskFileState(task);
    state.setFileContents("app.ts", "export const x = 42;\n");
    const files = state.getCurrentFiles();
    expect(files["app.ts"]).toBe("export const x = 42;\n");
    expect(files["index.html"]).toBe(task.starterCode["index.html"]);
  });

  test("multiple sequential edits to the same file keep only the latest", () => {
    const state = new TaskFileState(sampleTask);
    state.setFileContents("index.html", "<h1>first</h1>\n");
    state.setFileContents("index.html", "<h1>second</h1>\n");
    expect(state.getFileContents("index.html")).toBe("<h1>second</h1>\n");
  });

  test("getCurrentFiles() returns a snapshot, not a live reference", () => {
    const state = new TaskFileState(sampleTask);
    const snap1 = state.getCurrentFiles();
    state.setFileContents("index.html", "<h1>changed</h1>\n");
    expect(snap1["index.html"]).not.toBe("<h1>changed</h1>\n");
    expect(state.getCurrentFiles()["index.html"]).toBe("<h1>changed</h1>\n");
  });

  test("unknown filename throws on read", () => {
    const state = new TaskFileState(sampleTask);
    expect(() => state.getFileContents("nope.txt")).toThrow();
  });

  test("unknown filename throws on write", () => {
    const state = new TaskFileState(sampleTask);
    expect(() => state.setFileContents("nope.txt", "x")).toThrow();
  });
});
