/**
 * Burrow src/ui — course-mode controller (C1, #18: wire the course shell
 * into the sandbox).
 *
 * Per ADR-0005, the course is a pane that ORCHESTRATES Burrow's real
 * panels — not a self-contained runner with its own mini-editor:
 *
 *   - #sidebar   -> Days -> Tasks nav (`renderNavView` from course/nav-view.ts)
 *   - #editor-pane -> the REAL Monaco editor (src/ui/editor.ts), seeded from
 *     the REAL VFS (src/vfs/index.ts) with the selected task's `starterCode`
 *   - #rightbar  -> a new "task" panel: rendered description
 *     (`renderTaskDescription`), hints/solution reveal (`mountHintsView`),
 *     Run (gated — ADR-0006) and "Mark done -> next"
 *   - #bottombar -> test-results tab. `mountTestResultsView` (course/
 *     test-results-view.ts) is the future in-tab-grading consumer of a real
 *     `TestHarnessReport`; on the static deploy there IS no such report
 *     (ADR-0006 §2), so Run instead renders a hand-rolled deferred-grading
 *     notice here — same host, same CSS class names, so nothing needs to
 *     change structurally when in-tab grading lands.
 *
 * Boot: `data-mode="course"` is the app-level default (kept distinct from
 * the pre-existing `data-mview` mobile pane-switcher attribute on #app —
 * see src/ui/mobile.ts — which is an orthogonal concern). A small
 * "course ⇄ sandbox" toggle in #topbar flips `data-mode` without touching
 * `data-mview`. The sandbox/editor experience is unchanged and fully
 * reachable; this module never deletes or replaces it.
 *
 * Split like every other course/* file: pure, DOM-free helpers first
 * (exported for unit tests — `decideBootView`, `advanceAfterMarkDone`),
 * then the DOM-touching `initCourse()` orchestration below.
 *
 * Progress + resume (ADR-0005 §3/§4): `createProgressStore(course.id)` is
 * consulted once at boot — a saved position means AUTO-RESUME straight into
 * that task; otherwise the learner sees a course overview (Days grid) one
 * click from any task. "Mark done -> next" calls `progress.markComplete`
 * then `navigation.next()`.
 */

import type { Course, Task } from "../course/schema.ts";
import { buildCourse } from "../course/build-course.ts";
import { createNavigation, type Navigation, type NavigationPosition } from "../course/navigation.ts";
import { renderNavView, type NavViewCallbacks } from "../course/nav-view.ts";
import { renderTaskDescription } from "../course/task-runner.ts";
import { createHintController } from "../course/hints.ts";
import { mountHintsView, type HintsViewHandle } from "../course/hints-view.ts";
import {
  bindCompletionSignal,
  bindNavigationPersistence,
  createProgressStore,
  type ProgressStore,
} from "../course/progress.ts";
import type { FileMap } from "../course/schema.ts";
import { days as contentDays } from "../course/content/index.ts";
import { tryUse } from "../contract/registry.ts";
import { WORKSPACE_ROOT } from "../contract/types.ts";
import { h } from "./util.ts";

// NOTE: ./editor.ts pulls in monaco (which touches `window` at import time and
// can't load under `bun test`'s non-DOM env). course.test.ts imports THIS file
// for its pure helpers, so editor is imported LAZILY inside the runtime-only
// paths below rather than statically — keeping the static graph DOM-free.

// ── pure helpers (unit-testable, no DOM) ────────────────────────────────────

/**
 * Boot decision (ADR-0005 §3): a saved position means auto-resume straight
 * into that task; otherwise land on the course overview. Pure function of
 * "what did the progress store return" so it's trivially unit-testable
 * without booting a real store/localStorage.
 */
export type BootView = { kind: "overview" } | { kind: "task"; position: NavigationPosition };

export function decideBootView(savedPosition: NavigationPosition | null): BootView {
  if (savedPosition === null) return { kind: "overview" };
  return { kind: "task", position: savedPosition };
}

/**
 * "Mark done -> next" (ADR-0005 §4): given the navigation's position right
 * before advancing and the position right after calling `next()`, decide
 * whether the advance actually moved (vs. clamping at the course's very
 * last task). Pure — takes plain positions in/out, no Navigation instance
 * required, so it's unit-testable without constructing a course.
 */
export interface AdvanceResult {
  advanced: boolean;
  position: NavigationPosition;
}

export function advanceAfterMarkDone(before: NavigationPosition, after: NavigationPosition): AdvanceResult {
  const advanced = before.dayId !== after.dayId || before.taskId !== after.taskId;
  return { advanced, position: after };
}

/** The full, real course: content/index.ts's `days` wrapped via buildCourse(). */
export function loadCourse(): Course {
  return buildCourse(contentDays);
}

// ── DOM orchestration ───────────────────────────────────────────────────────

export interface CourseElements {
  /** The Task tab's left sub-panel host for the Days->Tasks nav (ADR-0007: nav moved out of #sidebar). */
  sidebar: HTMLElement;
  /** The Task tab's right column: task description / hints / actions (ADR-0007). */
  taskDetail: HTMLElement;
  /** The real editor-pane's tabs/host/empty triplet lives in src/ui/editor.ts; course.ts only opens files into it. */
  overviewHost: HTMLElement;
  /** New "task" panel host inside #rightbar. */
  taskPanel: HTMLElement;
  /** #bottombar's test-results host (a tab alongside terminal/console/preview). */
  testResults: HTMLElement;
  /** #topbar mode-toggle button ("course ⇄ sandbox"). */
  modeToggle: HTMLButtonElement;
}

export interface CourseHandle {
  navigation: Navigation;
  progress: ProgressStore;
  destroy(): void;
}

const MODE_KEY = "mode";
const MODE_COURSE = "course";
const MODE_SANDBOX = "sandbox";

function setMode(app: HTMLElement, mode: typeof MODE_COURSE | typeof MODE_SANDBOX): void {
  app.dataset[MODE_KEY] = mode;
}

/** Join the workspace root with a task-relative filename (course files live under a per-task dir). */
function taskDir(task: Task): string {
  return `${WORKSPACE_ROOT}/course/${task.id}`;
}

function primaryFileFor(task: Task): string {
  // First starterCode entry, in authored order — same "first file" rule
  // task-runner.ts's mountTaskRunner uses for its own embedded editor.
  const first = Object.keys(task.starterCode)[0];
  if (first === undefined) throw new Error(`[burrow/course] task "${task.id}" has no starterCode files`);
  return first;
}

/**
 * A course-provided static preview server, seeded alongside each task's files
 * (ADR-0007 §4). It serves the task directory over Bun.serve so EVERY task
 * type (static HTML/CSS/JS, React bundles, etc.) gets a live preview — not just
 * tasks that ship their own server. Runs on the in-tab bun.wasm runtime
 * (which supports Bun.serve; distinct from grading, which stays deferred per
 * ADR-0006). `bun run --hot` re-serves on file change, so edits refresh live.
 */
const PREVIEW_SERVER_FILENAME = "_preview-server.ts";
const PREVIEW_SERVER_SRC = `// Auto-generated per task (ADR-0007) — static file server for live preview.
import { serve, file } from "bun";
const ROOT = new URL(".", import.meta.url).pathname;
serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    if (p === "/" || p.endsWith("/")) p += "index.html";
    const f = file(ROOT + p.replace(/^\\/+/, ""));
    if (await f.exists()) return new Response(f);
    const idx = file(ROOT + "index.html");
    if (await idx.exists()) return new Response(idx);
    return new Response("not found", { status: 404 });
  },
});
`;

/** Write a task's FileMap into the real VFS under its task directory, then open the primary file in the real editor. */
async function seedTaskFiles(task: Task, files: FileMap, opts?: { openPrimary?: boolean }): Promise<void> {
  const vfs = tryUse("vfs");
  const events = tryUse("events");
  if (!vfs || !events) return;
  const dir = taskDir(task);
  await vfs.mkdir(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    const path = `${dir}/${name}`;
    const parent = path.slice(0, path.lastIndexOf("/"));
    if (parent !== dir) await vfs.mkdir(parent, { recursive: true });
    await vfs.writeFile(path, contents);
  }
  // Seed the static preview server alongside the task files (only if the task
  // doesn't already ship one of its own).
  if (!(PREVIEW_SERVER_FILENAME in files)) {
    await vfs.writeFile(`${dir}/${PREVIEW_SERVER_FILENAME}`, PREVIEW_SERVER_SRC);
  }
  if (opts?.openPrimary !== false) {
    const primary = `${dir}/${primaryFileFor(task)}`;
    events.emit("editor:open", { path: primary });
  }
}

/**
 * Start (or restart) the continuous static preview for a task (ADR-0007 §4).
 * Best-effort: runs the seeded static server via the shell so it flows through
 * the same run/preview machinery the sandbox uses; failures are non-fatal
 * (preview simply stays on its "nothing listening" placeholder).
 */
async function startTaskPreview(task: Task): Promise<void> {
  const shell = tryUse("shell");
  if (!shell) return;
  const server = `${taskDir(task)}/${PREVIEW_SERVER_FILENAME}`;
  try {
    // --hot keeps it serving and re-runs on edits so the preview refreshes live.
    await shell.exec(`bun run --hot ${JSON.stringify(server)}`, { echo: false });
  } catch (err) {
    console.error("[burrow/course] preview start failed", err);
  }
}

/** Render the Days -> Tasks landing grid (shown when there's no saved position yet). */
function renderOverview(host: HTMLElement, course: Course, onEnter: (dayId: string, taskId: string) => void): void {
  host.replaceChildren();
  const wrap = h("div", "course-overview");
  const heading = h("h2", "course-overview-title", course.title);
  wrap.append(heading);

  const grid = h("div", "course-overview-grid");
  for (const day of [...course.days].sort((a, b) => a.order - b.order)) {
    const card = h("section", "course-overview-day");
    card.append(h("h3", "course-overview-day-title", day.title));
    const list = document.createElement("ul");
    list.className = "course-overview-tasks";
    for (const task of day.tasks) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "course-overview-task";
      btn.textContent = task.title;
      btn.addEventListener("click", () => onEnter(day.id, task.id));
      li.append(btn);
      list.append(li);
    }
    card.append(list);
    grid.append(card);
  }
  wrap.append(grid);
  host.append(wrap);
}

/** The deferred-grading message shown for Run (ADR-0006 §2) — an honest, non-broken gated state. */
const DEFERRED_GRADING_MESSAGE =
  "grading runs in dev/CI — in-tab grading coming soon. " +
  "Use \u201cMark done \u2192 next\u201d once you're satisfied with your solution.";

function renderDeferredGradingNotice(host: HTMLElement): void {
  host.innerHTML =
    `<div class="test-results test-results-deferred">` +
    `<div class="test-results-summary">Run (deferred)</div>` +
    `<div class="test-results-empty">${DEFERRED_GRADING_MESSAGE}</div>` +
    `</div>`;
}

/**
 * Mount the full course-mode controller. Called once at boot, after the
 * rest of Burrow's panels have initialized (main.tsx's resilient `step()`
 * pattern — a failure here only degrades course mode, never the app).
 */
export function initCourse(app: HTMLElement, els: CourseElements): CourseHandle {
  const course = loadCourse();
  const navigation = createNavigation(course);
  const progress = createProgressStore(course.id);

  let hintsHandle: HintsViewHandle | null = null;
  let navRender: { render(): void } | null = null;

  function currentTask(): Task {
    return navigation.getActiveTask();
  }

  async function openCurrentTask(): Promise<void> {
    const task = currentTask();
    progress.setPosition(navigation.current);
    // ADR-0007: clear any tabs left open from the previous problem before
    // seeding + opening this task's files, so tabs don't accumulate.
    // Lazy import keeps monaco out of the pure-helper test graph (see top note).
    try {
      const { closeAllTabs } = await import("./editor.ts");
      closeAllTabs();
    } catch (err) {
      console.error("[burrow/course] closeAllTabs failed", err);
    }
    await seedTaskFiles(task, task.starterCode);
    renderTaskPanel(task);
    navRender?.render();
    // ADR-0007 §4: every task gets a continuous live preview, auto-started here.
    void startTaskPreview(task);
  }

  function renderTaskPanel(task: Task): void {
    // ADR-0007: nav lives in the Task tab's left sub-panel (els.sidebar host);
    // the description / hints / actions render into the right detail column.
    els.taskDetail.replaceChildren();

    const description = h("div", "task-panel-description");
    description.innerHTML = renderTaskDescription(task);
    els.taskDetail.append(description);

    const hintsHost = h("div", "task-panel-hints");
    els.taskDetail.append(hintsHost);
    hintsHandle?.destroy();
    const hintController = createHintController(task);
    hintsHandle = mountHintsView(hintController, {
      host: hintsHost,
      onSolutionRevealed: (files) => {
        void seedTaskFiles(task, files);
      },
    });

    const actions = h("div", "task-panel-actions");

    const runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "task-panel-run task-panel-run--deferred";
    runBtn.textContent = "\u25B8 run (deferred)";
    runBtn.title = "grading runs in dev/CI — in-tab grading coming soon";
    runBtn.addEventListener("click", () => {
      renderDeferredGradingNotice(els.testResults);
    });
    actions.append(runBtn);

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "task-panel-done";
    doneBtn.textContent = "Mark done \u2192 next";
    doneBtn.addEventListener("click", () => {
      const before = navigation.current;
      progress.markComplete(task.id);
      navigation.next();
      const after = navigation.current;
      const result = advanceAfterMarkDone(before, after);
      progress.setPosition(after);
      if (result.advanced) {
        void openCurrentTask();
      } else {
        // Clamped at the very last task of the very last day — nothing to
        // advance to; just reflect the completion state.
        renderTaskPanel(task);
        navRender?.render();
      }
    });
    actions.append(doneBtn);

    els.taskDetail.append(actions);

    // Reset the bottombar's test-results host back to its idle state for
    // the newly-opened task (a stale previous task's deferred notice
    // shouldn't linger).
    els.testResults.innerHTML =
      `<div class="test-results-empty">Press \u201crun\u201d in the task panel to see results here.</div>`;
  }

  function enterTask(dayId: string, taskId: string): void {
    navigation.selectDay(dayId);
    navigation.selectTask(taskId);
    void openCurrentTask();
    showTaskView();
  }

  // #course-overview is an absolutely-positioned overlay inside #editor-pane
  // (course.css) that visually covers the real editor host/tabs while shown;
  // #task-panel's own visibility is governed by the rightbar's tab machinery
  // (src/ui/tabs.ts — "task" is one of #right-tabs' tabs), not by course.ts.
  function showOverview(): void {
    els.overviewHost.hidden = false;
    renderOverview(els.overviewHost, course, enterTask);
  }

  function showTaskView(): void {
    els.overviewHost.hidden = true;
  }

  const navCallbacks: NavViewCallbacks = {
    onSelectTask: (dayId, taskId) => {
      enterTask(dayId, taskId);
    },
    onSelectDay: (dayId) => {
      // Selecting a Day alone (no task yet) resets to that day's first task
      // per navigation.ts's selectDay contract — drive the same open path.
      void openCurrentTask();
      showTaskView();
    },
  };

  const unbindPersistence = bindNavigationPersistence(progress, (onPositionChange) => {
    // navigation.ts has no built-in change subscription; course.ts already
    // calls progress.setPosition() directly on every move above, so this
    // binder is a no-op subscribe kept only to satisfy/exercise the shared
    // progress.ts wiring contract other course-module consumers rely on.
    return () => {
      void onPositionChange;
    };
  });
  const unbindCompletion = bindCompletionSignal(progress, () => () => {});

  const saved = progress.getPosition();
  const boot = decideBootView(saved);
  if (boot.kind === "task") {
    navigation.selectDay(boot.position.dayId);
    navigation.selectTask(boot.position.taskId);
    navRender = renderNavView(els.sidebar, navigation, navCallbacks);
    void openCurrentTask();
    showTaskView();
  } else {
    navRender = renderNavView(els.sidebar, navigation, navCallbacks);
    showOverview();
  }

  // ── course <-> sandbox mode toggle ─────────────────────────────────────
  function setToggleLabel(): void {
    const mode = app.dataset[MODE_KEY] === MODE_SANDBOX ? MODE_SANDBOX : MODE_COURSE;
    els.modeToggle.textContent = mode === MODE_COURSE ? "course \u21c4 sandbox" : "sandbox \u21c4 course";
    els.modeToggle.title =
      mode === MODE_COURSE ? "switch to the raw sandbox editor" : "switch back to the course";
  }
  function toggleMode(): void {
    const next = app.dataset[MODE_KEY] === MODE_SANDBOX ? MODE_COURSE : MODE_SANDBOX;
    setMode(app, next);
    setToggleLabel();
  }
  els.modeToggle.addEventListener("click", toggleMode);
  setToggleLabel();

  return {
    navigation,
    progress,
    destroy(): void {
      hintsHandle?.destroy();
      unbindPersistence();
      unbindCompletion();
      els.modeToggle.removeEventListener("click", toggleMode);
    },
  };
}
