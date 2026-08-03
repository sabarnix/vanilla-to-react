/**
 * Burrow src/course — hints + solution reveal view (T6, #9, SPEC.md §5).
 *
 * A thin DOM-touching layer over `HintController` (hints.ts). Same split as
 * task-runner.ts and test-results-view.ts: all gating/state logic lives in
 * the pure controller; this module only renders it and wires up clicks.
 *
 * Renders:
 *   - a list of hints revealed so far,
 *   - a "Show next hint" button, disabled once every hint is revealed (or
 *     the task has none),
 *   - a "Reveal solution" button, disabled until `canRevealSolution()` is
 *     true, gated behind a confirm step so reveal is a deliberate action,
 *     not an accidental click.
 *
 * On confirmed reveal, this module does not touch the editor itself — it
 * hands the resulting `FileMap` to the caller's `onSolutionRevealed`
 * callback, which is expected to load the files into the T2 task runner
 * (`TaskRunnerHandle`/`TaskFileState`). Keeping that wiring external avoids
 * this file importing task-runner.ts and keeps the view-layer dependency
 * graph a strict one-way fan-out from hints.ts.
 */

import type { FileMap } from "./schema.ts";
import type { HintController } from "./hints.ts";

/** DOM host + optional callbacks for mounting the hints/solution view. */
export interface HintsViewOptions {
  /** Container the hints list + buttons render into. Its contents are replaced. */
  host: HTMLElement;
  /**
   * Called with the solution's `FileMap` once reveal is confirmed. The
   * caller is responsible for loading these files into the editor — this
   * view never imports/touches task-runner.ts.
   */
  onSolutionRevealed?: (files: FileMap) => void;
  /**
   * Confirmation gate shown before actually revealing the solution.
   * Defaults to `window.confirm` when available. Injectable for tests /
   * custom UX (e.g. a modal instead of a native confirm dialog).
   */
  confirm?: (message: string) => boolean;
}

/** Handle returned by `mountHintsView`. */
export interface HintsViewHandle {
  /** Re-render the view from the controller's current state. */
  refresh(): void;
  /** Remove all mounted DOM from the host. */
  destroy(): void;
}

function defaultConfirm(message: string): boolean {
  return typeof window !== "undefined" && typeof window.confirm === "function"
    ? window.confirm(message)
    : true;
}

/**
 * Mount a hints/solution reveal UI driven by `controller` into `options.host`.
 * Pure rendering + event wiring only — every gating decision comes from the
 * controller (hints.ts), never re-derived here.
 */
export function mountHintsView(controller: HintController, options: HintsViewOptions): HintsViewHandle {
  const { host } = options;
  const confirm = options.confirm ?? defaultConfirm;

  const container = document.createElement("div");
  container.className = "hints-view";

  const list = document.createElement("ul");
  list.className = "hints-view-list";

  const nextHintBtn = document.createElement("button");
  nextHintBtn.type = "button";
  nextHintBtn.className = "hints-view-next-hint";
  nextHintBtn.textContent = "Show next hint";

  const revealSolutionBtn = document.createElement("button");
  revealSolutionBtn.type = "button";
  revealSolutionBtn.className = "hints-view-reveal-solution";
  revealSolutionBtn.textContent = "Reveal solution";

  container.append(list, nextHintBtn, revealSolutionBtn);

  function render(): void {
    list.replaceChildren();
    for (const hint of controller.revealedHints()) {
      const li = document.createElement("li");
      li.className = "hints-view-hint";
      li.textContent = hint;
      list.append(li);
    }

    const exhausted = controller.revealedCount() >= controller.totalHints;
    nextHintBtn.disabled = exhausted;
    nextHintBtn.textContent = exhausted
      ? "No more hints"
      : `Show next hint (${controller.revealedCount()}/${controller.totalHints})`;

    revealSolutionBtn.disabled = !controller.canRevealSolution();
    revealSolutionBtn.textContent = controller.solutionRevealed()
      ? "Solution revealed"
      : "Reveal solution";
  }

  function handleNextHint(): void {
    controller.revealNextHint();
    render();
  }

  function handleRevealSolution(): void {
    if (!controller.canRevealSolution()) return;
    const confirmed = confirm(
      "Reveal the full solution? This will overwrite hints-based problem solving for this task.",
    );
    if (!confirmed) return;
    const files = controller.revealSolution();
    render();
    if (files) {
      options.onSolutionRevealed?.(files);
    }
  }

  nextHintBtn.addEventListener("click", handleNextHint);
  revealSolutionBtn.addEventListener("click", handleRevealSolution);

  host.replaceChildren(container);
  render();

  return {
    refresh: render,
    destroy(): void {
      nextHintBtn.removeEventListener("click", handleNextHint);
      revealSolutionBtn.removeEventListener("click", handleRevealSolution);
      host.replaceChildren();
    },
  };
}
