/**
 * Burrow src/course — task runner (T2, SPEC.md §5 "load a task -> description
 * + code editor").
 *
 * Given a `Task` (schema.ts — LOCKED contract from #4), this module renders
 * the task's `description` (Markdown) to HTML and manages the state needed to
 * seed an embedded CodeMirror 6 editor with the task's `starterCode` files.
 *
 * Split in two halves on purpose:
 *   - Pure logic (this file, minus `mountTaskRunner`): description rendering
 *     and a `TaskFileState` file-map manager. Fully unit-testable without a
 *     DOM (bun test runs no browser globals).
 *   - `mountTaskRunner()`: the only DOM-touching piece. It builds a file
 *     switcher (only shown when a task has >1 starterCode file) and a single
 *     reused CodeMirror 6 `EditorView`, following the exact pattern already
 *     used for the diff panel (src/ui/diff.ts): `basicSetup` from `codemirror`,
 *     `EditorView`/`keymap` from `@codemirror/view`, `EditorState` from
 *     `@codemirror/state`, `javascript` from `@codemirror/lang-javascript`,
 *     and the shared `burrowTheme` (src/ui/theme.ts). No new dependencies.
 *
 * Markdown rendering reuses `renderMarkdownDoc` (src/ui/markdown.ts) rather
 * than re-implementing escaping/transform rules — same safety model (all
 * text HTML-escaped before any transform runs).
 *
 * OUT OF SCOPE (T3): hidden-test evaluation, pass/fail UI. This module only
 * exposes `getCurrentFiles()` so a later test harness can read back whatever
 * the learner has typed; it does not run or grade anything.
 */

import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import type { Task, FileMap } from "./schema.ts";
import { renderMarkdownDoc } from "../ui/markdown.ts";
import { burrowTheme } from "../ui/theme.ts";

/** Render a Task's `description` (Markdown) to safe HTML. */
export function renderTaskDescription(task: Task): string {
  return renderMarkdownDoc(task.description);
}

/** File extension (lowercase, no dot) of a path; "" if none/hidden-dotfile. */
function extOf(path: string): string {
  const name = path.split("/").pop() ?? path;
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Map a file extension to CodeMirror language extensions (best-effort). */
function langExtensionsFor(path: string): Extension[] {
  switch (extOf(path)) {
    case "ts":
    case "mts":
    case "cts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "jsx":
      return [javascript({ jsx: true })];
    case "js":
    case "mjs":
    case "cjs":
      return [javascript()];
    default:
      // html/css/md/plain files: no CodeMirror language package for these is
      // wired up elsewhere in Burrow either (see src/ui/diff.ts langFor) —
      // basicSetup still gives line numbers/highlighting infra without one.
      return [];
  }
}

/** Ordered list of a task's starterCode filenames (stable, insertion order). */
export function starterFileNames(task: Task): string[] {
  return Object.keys(task.starterCode);
}

/**
 * Pure, DOM-free manager for a task's editable file set. Seeded from
 * `starterCode`; `setFileContents`/`getCurrentFiles` let callers (the mount
 * helper, or tests) read and write the in-memory copy without touching the
 * original `Task` object.
 */
export class TaskFileState {
  readonly #files: FileMap;
  readonly #order: string[];

  constructor(task: Task) {
    // Shallow-copy so edits never mutate the caller's Task/starterCode object.
    this.#files = { ...task.starterCode };
    this.#order = Object.keys(task.starterCode);
  }

  /** Filenames in the task's original starterCode order. */
  fileNames(): string[] {
    return [...this.#order];
  }

  /** Current contents for one file (throws if the filename is unknown). */
  getFileContents(filename: string): string {
    if (!(filename in this.#files)) {
      throw new Error(`[burrow/course] unknown file "${filename}" in task file state`);
    }
    return this.#files[filename]!;
  }

  /** Overwrite one file's in-memory contents (used on every editor edit). */
  setFileContents(filename: string, contents: string): void {
    if (!(filename in this.#files)) {
      throw new Error(`[burrow/course] unknown file "${filename}" in task file state`);
    }
    this.#files[filename] = contents;
  }

  /** Snapshot of every file's current contents (filename -> contents). */
  getCurrentFiles(): FileMap {
    return { ...this.#files };
  }
}

/** Handle returned by `mountTaskRunner`, exposing the T3-facing read-back API. */
export interface TaskRunnerHandle {
  /** The task currently mounted. */
  readonly task: Task;
  /** Snapshot of every starterCode file's current (possibly edited) contents. */
  getCurrentFiles(): FileMap;
  /** Contents of one file (throws if unknown). */
  getFileContents(filename: string): string;
  /** Switch the editor to show a different starterCode file. */
  selectFile(filename: string): void;
  /** The filename currently shown in the editor. */
  getActiveFile(): string;
  /** Tear down the CodeMirror view and remove mounted DOM. */
  destroy(): void;
}

export interface TaskRunnerElements {
  /** Container the description HTML is rendered into. */
  descriptionHost: HTMLElement;
  /** Container the CodeMirror editor (and file switcher, if any) mounts into. */
  editorHost: HTMLElement;
}

/**
 * Mount a Task's description + an editable, starterCode-seeded CodeMirror 6
 * editor into the given DOM containers. Multi-file tasks (>1 starterCode
 * entry) get a simple file-switcher row above the editor.
 *
 * DOM-only concern: all seeding/read-back logic lives in `TaskFileState`
 * above, which this function simply drives.
 */
export function mountTaskRunner(task: Task, els: TaskRunnerElements): TaskRunnerHandle {
  els.descriptionHost.innerHTML = renderTaskDescription(task);

  const state = new TaskFileState(task);
  const fileNames = state.fileNames();
  const first = fileNames[0];
  if (first === undefined) {
    throw new Error("[burrow/course] task has no starterCode files");
  }
  let active = first;

  const langCompartment = new Compartment();

  els.editorHost.replaceChildren();

  let switcherEl: HTMLElement | null = null;
  const tabButtons = new Map<string, HTMLButtonElement>();
  if (fileNames.length > 1) {
    switcherEl = document.createElement("div");
    switcherEl.className = "task-file-switcher";
    for (const name of fileNames) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "task-file-tab";
      btn.textContent = name;
      btn.addEventListener("click", () => selectFile(name));
      tabButtons.set(name, btn);
      switcherEl.append(btn);
    }
    els.editorHost.append(switcherEl);
  }

  const cmHost = document.createElement("div");
  cmHost.className = "task-editor-host";
  els.editorHost.append(cmHost);

  function renderSwitcher(): void {
    for (const [name, btn] of tabButtons) {
      btn.classList.toggle("active", name === active);
    }
  }

  const view = new EditorView({
    doc: state.getFileContents(active),
    extensions: [
      basicSetup,
      keymap.of([]),
      langCompartment.of(langExtensionsFor(active)),
      burrowTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          state.setFileContents(active, update.state.doc.toString());
        }
      }),
    ],
    parent: cmHost,
  });

  function selectFile(filename: string): void {
    if (filename === active) return;
    if (!fileNames.includes(filename)) {
      throw new Error(`[burrow/course] unknown file "${filename}" in task file state`);
    }
    // Persist whatever's currently in the view before switching away.
    state.setFileContents(active, view.state.doc.toString());
    active = filename;
    view.setState(
      EditorState.create({
        doc: state.getFileContents(active),
        extensions: [
          basicSetup,
          keymap.of([]),
          langCompartment.of(langExtensionsFor(active)),
          burrowTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              state.setFileContents(active, update.state.doc.toString());
            }
          }),
        ],
      }),
    );
    renderSwitcher();
  }

  renderSwitcher();

  return {
    task,
    getCurrentFiles(): FileMap {
      // Make sure the currently-active buffer's latest edits are captured.
      state.setFileContents(active, view.state.doc.toString());
      return state.getCurrentFiles();
    },
    getFileContents(filename: string): string {
      if (filename === active) return view.state.doc.toString();
      return state.getFileContents(filename);
    },
    selectFile,
    getActiveFile(): string {
      return active;
    },
    destroy(): void {
      view.destroy();
      els.editorHost.replaceChildren();
    },
  };
}
