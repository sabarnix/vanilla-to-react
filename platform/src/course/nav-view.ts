/**
 * Burrow src/course — Day/Task sidebar view (T4, #7).
 *
 * Thin DOM rendering layer over the pure `Navigation` model in
 * `navigation.ts`. Deliberately kept separate from the model: this file may
 * touch `document`/DOM APIs, the model never does. Renders a Days -> Tasks
 * list and invokes callbacks on selection; it does not decide what happens
 * next (e.g. loading a task into the runner) — that's the caller's job.
 */

import type { Navigation } from "./navigation.ts";

/** Callbacks fired when the learner picks a Day or a Task in the sidebar. */
export interface NavViewCallbacks {
  onSelectDay?(dayId: string): void;
  onSelectTask?(dayId: string, taskId: string): void;
}

const DAY_LIST_CLASS = "nav-view__days";
const DAY_ITEM_CLASS = "nav-view__day";
const DAY_ITEM_ACTIVE_CLASS = "nav-view__day--active";
const DAY_TITLE_CLASS = "nav-view__day-title";
const TASK_LIST_CLASS = "nav-view__tasks";
const TASK_ITEM_CLASS = "nav-view__task";
const TASK_ITEM_ACTIVE_CLASS = "nav-view__task--active";

/**
 * Render a Days -> Tasks sidebar for `navigation` into `container`, wiring
 * up click handlers that call `selectDay`/`selectTask` on the model and then
 * `callbacks.onSelectDay`/`onSelectTask`, followed by `render()` again so the
 * active-state highlighting reflects the new position.
 *
 * Returns a `render()` function the caller can invoke to redraw after moving
 * the model externally (e.g. via `next()`/`prev()` triggered elsewhere).
 */
export function renderNavView(
  container: HTMLElement,
  navigation: Navigation,
  callbacks: NavViewCallbacks = {},
): { render(): void } {
  function render(): void {
    container.replaceChildren();

    const current = navigation.current;
    const dayList = document.createElement("ul");
    dayList.className = DAY_LIST_CLASS;

    for (const day of navigation.days) {
      const dayItem = document.createElement("li");
      dayItem.className = DAY_ITEM_CLASS;
      const isActiveDay = day.id === current.dayId;
      if (isActiveDay) {
        dayItem.classList.add(DAY_ITEM_ACTIVE_CLASS);
      }

      const dayTitle = document.createElement("button");
      dayTitle.type = "button";
      dayTitle.className = DAY_TITLE_CLASS;
      dayTitle.textContent = day.title;
      dayTitle.addEventListener("click", () => {
        navigation.selectDay(day.id);
        callbacks.onSelectDay?.(day.id);
        render();
      });
      dayItem.appendChild(dayTitle);

      // Only render the task list for the active day, keeping the sidebar
      // compact for courses with many days/tasks.
      if (isActiveDay) {
        const taskList = document.createElement("ul");
        taskList.className = TASK_LIST_CLASS;

        for (const task of day.tasks) {
          const taskItem = document.createElement("li");
          taskItem.className = TASK_ITEM_CLASS;
          if (task.id === current.taskId) {
            taskItem.classList.add(TASK_ITEM_ACTIVE_CLASS);
          }

          const taskButton = document.createElement("button");
          taskButton.type = "button";
          taskButton.textContent = task.title;
          taskButton.addEventListener("click", () => {
            navigation.selectTask(task.id);
            callbacks.onSelectTask?.(day.id, task.id);
            render();
          });
          taskItem.appendChild(taskButton);
          taskList.appendChild(taskItem);
        }

        dayItem.appendChild(taskList);
      }

      dayList.appendChild(dayItem);
    }

    container.appendChild(dayList);
  }

  render();
  return { render };
}
