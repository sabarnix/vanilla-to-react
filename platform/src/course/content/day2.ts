/**
 * Burrow src/course/content — Day 2: Vanilla JS — Events & State.
 *
 * Build target (SPEC.md §4 / README.md): make the static Day 1 to-do list
 * **interactive** — add, toggle-done, and delete — using only vanilla JS
 * events and a hand-managed array as "state".
 *
 * Philosophy: "You can't appreciate the solution until you've felt the
 * problem." Day 2 is where the problem starts to appear:
 *
 *   d2-t1 — add a to-do: form submit event, push into a `todos` array,
 *           re-render the list from that array (first taste of "state
 *           drives the DOM", but still by hand).
 *   d2-t2 — toggle done: click event delegation, flip a boolean in the
 *           `todos` array, re-render — introduces "the array and the DOM
 *           must always agree" as an *explicit rule* the learner enforces
 *           themselves.
 *   d2-t3 — delete a to-do: **deliberately** written against a starter that
 *           updates the DOM directly (removes the clicked `<li>`) WITHOUT
 *           updating the `todos` array first. The task requires the learner
 *           to fix the desync bug — i.e. re-derive the DOM from state,
 *           never mutate the DOM as the source of truth. This is the
 *           concrete "manual-DOM-sync pain" moment: two sources of truth
 *           (array + DOM) that can silently drift apart. It plants the Day 3
 *           narrative (adding async on top of this will make the drift much
 *           worse) and the Day 4 payoff (React removes this whole class of
 *           bug by re-rendering from state automatically).
 *   d2-t4 — edit a to-do's text in place (double-click to edit, Enter/blur
 *           to commit): another array-is-truth mutation, using an extra
 *           piece of transient UI state ("which index is being edited") to
 *           show an `<input>` in place of the `<span>` for one row only.
 *   d2-t5 — filter the visible list (All / Active / Completed) without
 *           touching `todos` at all: `render()` is taught to read a
 *           separate `currentFilter` variable and skip todos that don't
 *           match — the first time "what render() renders" and "what state
 *           holds" are allowed to differ, on purpose, foreshadowing derived
 *           UI state in React.
 *   d2-t6 — "Clear completed": a keyboard shortcut (Escape cancels an
 *           in-progress edit from d2-t4) plus a button that removes every
 *           `done` to-do in one batch mutation (`todos.filter(...)`) instead
 *           of one `splice` per item — reinforces "mutate the array once,
 *           re-render once" as the pattern scales past single-item edits.
 *
 * Tests are string/regex assertions against `app.js` source (Bun-native,
 * no DOM library dependency — see COMPAT.md / SPEC.md §1).
 */

import type { Day } from "../schema.ts";

export const day2: Day = {
  id: "day-2",
  title: "Vanilla JS — Events & State",
  order: 2,
  tasks: [
    // ------------------------------------------------------------------
    // d2-t1 — add a to-do (form submit + array push + re-render)
    // ------------------------------------------------------------------
    {
      id: "d2-t1",
      title: "Add a to-do with an event listener",
      description:
        "## Add a to-do with an event listener\n\n" +
        "Yesterday's list was frozen in HTML. Today we make it grow.\n\n" +
        "`index.html` now has a form: an `<input id=\"todo-input\">` and a " +
        "`<button id=\"add-btn\">Add</button>` inside a `<form id=\"todo-form\">`. " +
        "`app.js` already has a `todos` array as our **state** (the one and " +
        "only source of truth) and a `render()` function that rebuilds the " +
        "`<ul id=\"todo-list\">` from that array — read them both before you " +
        "start.\n\n" +
        "Your job, in `app.js`:\n\n" +
        "1. Listen for the form's `submit` event on `#todo-form`.\n" +
        "2. Call `event.preventDefault()` so the page doesn't reload.\n" +
        "3. Read the input's value, and if it's non-empty (after trimming), " +
        "   push a new object `{ text, done: false }` onto the `todos` array.\n" +
        "4. Clear the input's value.\n" +
        "5. Call `render()` again so the DOM catches up with the array.\n\n" +
        "**The rule for today:** the `todos` array is the *only* thing you " +
        "change directly. The DOM is always rebuilt *from* the array by " +
        "`render()` — never edited by hand. Keep that rule and today will " +
        "feel simple. (Next task shows what happens when you don't.)",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "}\n",
        "app.js":
          "// State: the ONE source of truth for what to-dos exist.\n" +
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "// Rebuilds #todo-list from the todos array. Called after every\n" +
          "// change to `todos` so the DOM always reflects current state.\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  for (const todo of todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          "// TODO: listen for #todo-form's submit event.\n" +
          "// - event.preventDefault()\n" +
          "// - read #todo-input's value (trim it)\n" +
          '// - if non-empty, push { text, done: false } onto todos\n' +
          "// - clear the input\n" +
          "// - call render()\n",
      },
      hints: [
        'Grab the form with `document.getElementById("todo-form")` and add a `"submit"` listener.',
        "`event.preventDefault()` must be the first thing you do in the handler, or the page will reload and lose your state.",
        'Trim the input value with `.trim()` before checking `if (value)` — a string of only spaces should not be added.',
        "After pushing to `todos`, set the input's `.value` back to an empty string, then call `render()`.",
      ],
      hiddenTests: [
        {
          filename: "add-todo.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("listens for submit on #todo-form", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/todo-form["\'`\\)]*[\\s\\S]{0,80}addEventListener\\(\\s*["\']submit["\']/.test(js)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("calls preventDefault in the submit handler", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/preventDefault\\s*\\(\\s*\\)/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("pushes a new todo object onto the todos array", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/todos\\.push\\(/.test(js)).toBe(true);\n' +
            '  expect(/done\\s*:\\s*false/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("calls render() after adding (more than once = initial + after add)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const calls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(calls.length).toBeGreaterThanOrEqual(2);\n" +
            "});\n\n" +
            'test("trims the input value before checking it is non-empty", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.trim\\(\\s*\\)/.test(js)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  for (const todo of todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner treats `todos` as the single source of truth (push then " +
        "render) rather than calling document.createElement directly inside the submit handler.",
    },

    // ------------------------------------------------------------------
    // d2-t2 — toggle done (event delegation + flip boolean + re-render)
    // ------------------------------------------------------------------
    {
      id: "d2-t2",
      title: "Toggle a to-do as done",
      description:
        "## Toggle a to-do as done\n\n" +
        "Now let's mark to-dos as done. `render()` has been updated: each " +
        "`<li>` now gets a `data-index` attribute matching its position in " +
        "the `todos` array, and gets the extra class `done` when " +
        "`todo.done` is `true` (see the starter `app.js` and `style.css`, " +
        "which already strikes through `.todo-item.done`).\n\n" +
        "Your job, in `app.js`:\n\n" +
        "1. Add **one** click listener on the `<ul id=\"todo-list\">` itself " +
        "   (not on each `<li>` — this technique is called **event " +
        "   delegation**: one listener on the parent catches clicks that " +
        "   *bubble up* from any child, present or future).\n" +
        "2. Inside the handler, check `event.target` has class `todo-item` " +
        "   (ignore clicks elsewhere in the `<ul>`).\n" +
        "3. Read its `data-index` attribute (as a number) to find *which* " +
        "   to-do was clicked in the `todos` array.\n" +
        "4. Flip that to-do's `done` boolean (`todo.done = !todo.done`).\n" +
        "5. Call `render()`.\n\n" +
        "**Why delegation, not one listener per `<li>`?** Every time " +
        "`render()` runs it throws away the old `<li>` elements and makes " +
        "new ones — any listener attached directly to an old `<li>` would " +
        "be gone. A listener on the (never-recreated) `<ul>` survives every " +
        "re-render. Keep this in mind — it's the same idea, at a bigger " +
        "scale, behind why re-rendering everything by hand gets expensive " +
        "fast.",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          "// TODO: add ONE click listener on #todo-list (event delegation).\n" +
          "// - ignore clicks whose event.target is not a .todo-item\n" +
          "// - read event.target.dataset.index, convert to a number\n" +
          "// - flip todos[index].done\n" +
          "// - call render()\n",
      },
      hints: [
        'Attach the listener once: `document.getElementById("todo-list").addEventListener("click", ...)`.',
        '`event.target.classList.contains("todo-item")` tells you whether the actual clicked element is a to-do row (guard against clicks that hit the `<ul>` padding).',
        '`event.target.dataset.index` is a string — wrap it in `Number(...)` before using it to index into `todos`.',
        "Flip with `todos[index].done = !todos[index].done;` then call `render()` so the strikethrough class shows up.",
      ],
      hiddenTests: [
        {
          filename: "toggle-todo.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("adds exactly one click listener on #todo-list (event delegation)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const delegatedListener =\n" +
            '    /todo-list["\'`\\)]*[\\s\\S]{0,80}addEventListener\\(\\s*["\']click["\']/;\n' +
            "  expect(delegatedListener.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("checks the clicked element for the todo-item class", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/classList[\\s\\S]{0,40}todo-item/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("reads dataset.index and converts it to a number", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/dataset\\.index/.test(js)).toBe(true);\n" +
            "  expect(/Number\\(|parseInt\\(|\\+event\\.target/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("flips the done boolean on the matched todo", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.done\\s*=\\s*!/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("still renders from the todos array, never edits an <li> done class directly outside render", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const renderCalls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(renderCalls.length).toBeGreaterThanOrEqual(2);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("todo-item")) return;\n' +
          "  const index = Number(target.dataset.index);\n" +
          "  todos[index].done = !todos[index].done;\n" +
          "  render();\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner used a single delegated click listener on #todo-list " +
        "rather than attaching a listener to each <li>, and that the click handler " +
        "mutates the todos array (never the DOM node's class directly).",
    },

    // ------------------------------------------------------------------
    // d2-t3 — delete a to-do — fix the manual-DOM-sync bug (Day 3 setup)
    // ------------------------------------------------------------------
    {
      id: "d2-t3",
      title: "Delete a to-do (and fix the state/DOM desync bug)",
      description:
        "## Delete a to-do (and fix the state/DOM desync bug)\n\n" +
        "Each to-do row now has a `<button class=\"delete-btn\">x</button>`. " +
        "Someone (an eager teammate!) already wired up delete — but they " +
        "took a shortcut, and it's already causing bugs. Let's find out why.\n\n" +
        "Look at the delete handler in the starter `app.js`. It finds the " +
        "clicked button's parent `<li>` and calls `li.remove()` to make it " +
        "disappear from the page. **It never touches the `todos` array.**\n\n" +
        "Try it mentally (or once the app runs): delete the *first* item, " +
        "then toggle the *new* first item as done. Because `todos` still has " +
        "the deleted item sitting at index 0, and `data-index` attributes are " +
        "recalculated from `todos` on every `render()`, the moment anything " +
        "calls `render()` again the deleted item **reappears** — the DOM and " +
        "the array disagree about reality, and `render()` always wins because " +
        "it rebuilds from `todos`. This is exactly the bug the array/DOM " +
        "rule from d2-t1 was protecting you from.\n\n" +
        "**Your job:** fix the delete handler so it behaves like every other " +
        "handler this week:\n\n" +
        "1. Find the index of the to-do to delete (same `data-index` " +
        "   technique as toggling).\n" +
        "2. Remove it from the `todos` array — e.g. " +
        "   `todos.splice(index, 1)`. **Do not** call `li.remove()` or any " +
        "   other direct DOM removal.\n" +
        "3. Call `render()` so the DOM is rebuilt from the now-correct " +
        "   array.\n\n" +
        "**This is the moment to notice:** we now have *three* handlers, " +
        "each carefully hand-synchronizing an array and a tree of DOM nodes, " +
        "and it only took one shortcut to introduce a real bug. Tomorrow " +
        "(Day 3) we add an API call on top of this same hand-rolled state " +
        "— and the timing problems get much worse. That's the pain this " +
        "course is building toward feeling on purpose.",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          '    const span = document.createElement("span");\n' +
          "    span.textContent = todo.text;\n" +
          "    li.appendChild(span);\n\n" +
          '    const deleteBtn = document.createElement("button");\n' +
          '    deleteBtn.className = "delete-btn";\n' +
          '    deleteBtn.textContent = "x";\n' +
          "    li.appendChild(deleteBtn);\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n\n" +
          "  // BUG: this branch mutates the DOM directly and never touches\n" +
          "  // `todos` — the array and the page silently disagree after this.\n" +
          "  // TODO: fix this to splice `todos` instead, then call render().\n" +
          '  if (target.classList && target.classList.contains("delete-btn")) {\n' +
          "    const li = target.closest(\"li\");\n" +
          "    li.remove();\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (!target.classList || !target.classList.contains("todo-item")) return;\n' +
          "  const index = Number(target.dataset.index);\n" +
          "  todos[index].done = !todos[index].done;\n" +
          "  render();\n" +
          "});\n",
      },
      hints: [
        'Inside the delete branch, find the index the same way toggle does: `target.closest("li").dataset.index`, converted with `Number(...)`.',
        "`todos.splice(index, 1)` removes exactly one element at that index from the array — that's the fix, not `li.remove()`.",
        "After splicing, call `render()` — do NOT also call `li.remove()`; render() will already omit the deleted item because it's no longer in `todos`.",
        "The bug exists because `li.remove()` changes the DOM but leaves `todos` (the real source of truth) stale — the next render() call rebuilds from the stale array and the row comes back.",
      ],
      hiddenTests: [
        {
          filename: "delete-todo.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("delete handler no longer calls li.remove() directly", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.remove\\(\\s*\\)/.test(js)).toBe(false);\n" +
            "});\n\n" +
            'test("delete handler removes the todo from the todos array via splice", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/todos\\.splice\\(/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("delete branch still checks for the delete-btn class", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/delete-btn/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("render() is called after every mutation (add, toggle, delete)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const renderCalls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(renderCalls.length).toBeGreaterThanOrEqual(3);\n" +
            "});\n\n" +
            'test("toggle-done logic is untouched: still flips .done via !", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.done\\s*=\\s*!/.test(js)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          '    const span = document.createElement("span");\n' +
          "    span.textContent = todo.text;\n" +
          "    li.appendChild(span);\n\n" +
          '    const deleteBtn = document.createElement("button");\n' +
          '    deleteBtn.className = "delete-btn";\n' +
          '    deleteBtn.textContent = "x";\n' +
          "    li.appendChild(deleteBtn);\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n\n" +
          '  if (target.classList && target.classList.contains("delete-btn")) {\n' +
          "    const li = target.closest(\"li\");\n" +
          "    const index = Number(li.dataset.index);\n" +
          "    todos.splice(index, 1);\n" +
          "    render();\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (!target.classList || !target.classList.contains("todo-item")) return;\n' +
          "  const index = Number(target.dataset.index);\n" +
          "  todos[index].done = !todos[index].done;\n" +
          "  render();\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner removed the direct li.remove() DOM mutation entirely and " +
        "instead spliced the todos array before calling render(), restoring the array " +
        "as the single source of truth for the DOM.",
    },

    // ------------------------------------------------------------------
    // d2-t4 — edit a to-do's text in place (extra UI state: editingIndex)
    // ------------------------------------------------------------------
    {
      id: "d2-t4",
      title: "Edit a to-do's text in place",
      description:
        "## Edit a to-do's text in place\n\n" +
        "Add, toggle, and delete all mutate `todos` and call `render()`. Now " +
        "let's add editing \u2014 which needs a *second* kind of state: not " +
        "\"what the to-dos are\", but \"which one (if any) is currently being " +
        "edited *right now*, in this browser tab\". That's UI state, and it " +
        "lives in its own variable, separate from `todos`.\n\n" +
        "The starter `app.js` already declares `let editingIndex = null;` at " +
        "the top, and `render()` already checks it: when `render()` builds " +
        "the `<li>` at `editingIndex`, it renders an `<input class=\"edit-input\">` " +
        "(pre-filled with the to-do's text) instead of a `<span>`. Each row's " +
        "text `<span>` also already has a `dblclick` listener stub. Your job:\n\n" +
        "1. In the `dblclick` handler, set `editingIndex` to that row's index " +
        "   and call `render()` \u2014 this swaps the `<span>` for the `<input>`.\n" +
        "2. Add a `keydown` listener on `#todo-list` (delegation again) that, " +
        "   when the key is `\"Enter\"` **and** `event.target` is an " +
        "   `.edit-input`: writes the input's (trimmed) value back onto " +
        "   `todos[editingIndex].text`, sets `editingIndex = null`, and calls " +
        "   `render()`.\n\n" +
        "**Why a plain variable and not another array field?** `editingIndex` " +
        "describes *this tab's* transient UI, not a fact about the to-do " +
        "itself \u2014 it shouldn't be saved, shared, or persisted alongside " +
        "`todos`. Keeping it separate is exactly the distinction between " +
        "\"application state\" and \"UI state\" that React later gives you two " +
        "different tools for (`useState` for both, but you'll learn to tell " +
        "them apart).",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n\n" +
          ".edit-input {\n" +
          "  flex: 1;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "// UI state: which todo (by index) is currently being edited, if any.\n" +
          "// This is NOT part of `todos` — it's transient, per-tab UI state.\n" +
          "let editingIndex = null;\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          "    if (index === editingIndex) {\n" +
          '      const input = document.createElement("input");\n' +
          '      input.className = "edit-input";\n' +
          '      input.type = "text";\n' +
          "      input.value = todo.text;\n" +
          "      li.appendChild(input);\n" +
          "    } else {\n" +
          '      const span = document.createElement("span");\n' +
          "      span.textContent = todo.text;\n" +
          '      span.className = "todo-text";\n' +
          "      li.appendChild(span);\n" +
          "    }\n\n" +
          '    const deleteBtn = document.createElement("button");\n' +
          '    deleteBtn.className = "delete-btn";\n' +
          '    deleteBtn.textContent = "x";\n' +
          "    li.appendChild(deleteBtn);\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n\n" +
          '  if (target.classList && target.classList.contains("delete-btn")) {\n' +
          "    const li = target.closest(\"li\");\n" +
          "    const index = Number(li.dataset.index);\n" +
          "    todos.splice(index, 1);\n" +
          "    render();\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (!target.classList || !target.classList.contains("todo-item")) return;\n' +
          "  const index = Number(target.dataset.index);\n" +
          "  todos[index].done = !todos[index].done;\n" +
          "  render();\n" +
          "});\n\n" +
          "// TODO: double-click a to-do's text to edit it.\n" +
          '// - listen for "dblclick" on #todo-list (delegation)\n' +
          '// - if event.target has class "todo-text", set editingIndex to its\n' +
          "//   row's data-index (as a number), then call render()\n" +
          '// - listen for "keydown" on #todo-list (delegation)\n' +
          '// - if event.key === "Enter" and event.target has class "edit-input":\n' +
          "//   write the (trimmed) input value onto todos[editingIndex].text,\n" +
          "//   set editingIndex = null, and call render()\n",
      },
      hints: [
        'Listen for `"dblclick"` on `#todo-list` (not on each `<span>` — delegation, same reason as click/toggle).',
        'Guard with `event.target.classList.contains("todo-text")`, then read `event.target.closest("li").dataset.index`.',
        'For the Enter-to-commit listener, guard with both `event.key === "Enter"` AND `event.target.classList.contains("edit-input")` — otherwise every keystroke elsewhere would try to commit an edit.',
        "Don't forget to reset `editingIndex = null` after committing — otherwise `render()` will keep showing an `<input>` for that row forever.",
      ],
      hiddenTests: [
        {
          filename: "edit-todo.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("listens for dblclick on #todo-list (event delegation), not per-<li>", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/addEventListener\\(\\s*["\'\`]dblclick["\'\`]/.test(js)).toBe(true);\n' +
            '  // must be delegated on the list/document, not attached inside the render loop\n' +
            '  const renderMatch = js.match(/function render\\(\\)\\s*\\{([\\s\\S]*?)\\n\\}/);\n' +
            "  expect(renderMatch).not.toBeNull();\n" +
            '  expect(/addEventListener\\(\\s*["\'\`]dblclick["\'\`]/.test(renderMatch![1]!)).toBe(false);\n' +
            "});\n\n" +
            'test("sets editingIndex from the double-clicked row\'s index (a number, not the raw dataset string)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/editingIndex\\s*=\\s*(Number\\(|index)/.test(js)).toBe(true);\n" +
            "  expect(/Number\\(/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("listens for keydown on #todo-list and checks for the Enter key", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/addEventListener\\(\\s*["\'\`]keydown["\'\`]/.test(js)).toBe(true);\n' +
            '  expect(/event\\.key\\s*(===|!==)\\s*["\'\`]Enter["\'\`]/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("commits the edit back onto todos[editingIndex].text and clears editingIndex", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/todos\\[editingIndex\\]\\.text\\s*=/.test(js)).toBe(true);\n" +
            "  expect(/editingIndex\\s*=\\s*null/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("render() is called after both entering and committing an edit", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const renderCalls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(renderCalls.length).toBeGreaterThanOrEqual(5);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n\n" +
          ".edit-input {\n" +
          "  flex: 1;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "let editingIndex = null;\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          "    if (index === editingIndex) {\n" +
          '      const input = document.createElement("input");\n' +
          '      input.className = "edit-input";\n' +
          '      input.type = "text";\n' +
          "      input.value = todo.text;\n" +
          "      li.appendChild(input);\n" +
          "    } else {\n" +
          '      const span = document.createElement("span");\n' +
          "      span.textContent = todo.text;\n" +
          '      span.className = "todo-text";\n' +
          "      li.appendChild(span);\n" +
          "    }\n\n" +
          '    const deleteBtn = document.createElement("button");\n' +
          '    deleteBtn.className = "delete-btn";\n' +
          '    deleteBtn.textContent = "x";\n' +
          "    li.appendChild(deleteBtn);\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n\n" +
          '  if (target.classList && target.classList.contains("delete-btn")) {\n' +
          "    const li = target.closest(\"li\");\n" +
          "    const index = Number(li.dataset.index);\n" +
          "    todos.splice(index, 1);\n" +
          "    render();\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (!target.classList || !target.classList.contains("todo-item")) return;\n' +
          "  const index = Number(target.dataset.index);\n" +
          "  todos[index].done = !todos[index].done;\n" +
          "  render();\n" +
          "});\n\n" +
          'list.addEventListener("dblclick", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("todo-text")) return;\n' +
          "  const index = Number(target.closest(\"li\").dataset.index);\n" +
          "  editingIndex = index;\n" +
          "  render();\n" +
          "});\n\n" +
          'list.addEventListener("keydown", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (event.key !== "Enter") return;\n' +
          '  if (!target.classList || !target.classList.contains("edit-input")) return;\n' +
          "  todos[editingIndex].text = target.value.trim();\n" +
          "  editingIndex = null;\n" +
          "  render();\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner kept editingIndex as UI state separate from the todos array, " +
        "used delegation for both dblclick and keydown on #todo-list, and reset " +
        "editingIndex to null after committing an edit.",
    },

    // ------------------------------------------------------------------
    // d2-t5 — filter the list (All/Active/Completed) — derived UI state
    // ------------------------------------------------------------------
    {
      id: "d2-t5",
      title: "Filter to-dos: All, Active, Completed",
      description:
        "## Filter to-dos: All, Active, Completed\n\n" +
        "So far `render()` has always shown *every* item in `todos`. Let's " +
        "add filtering \u2014 without ever touching the `todos` array itself.\n\n" +
        "The starter `app.js` already declares `let currentFilter = \"all\";` " +
        "and `index.html` already has three buttons: " +
        '`<button class="filter-btn" data-filter="all">All</button>`, ' +
        '`data-filter="active"`, and `data-filter="completed"`. Your job, ' +
        "in `app.js`:\n\n" +
        "1. Inside `render()`, before building `<li>`s, compute a " +
        "   `visibleTodos` array from `todos` using `.filter(...)`: when " +
        '   `currentFilter === "active"` keep only `!todo.done`; when \n' +
        '   `currentFilter === "completed"` keep only `todo.done`; otherwise \n' +
        "   (`\"all\"`) keep everything. **Loop over `visibleTodos`, not " +
        "   `todos`,** when building `<li>`s \u2014 but keep using each item's " +
        "   original index into `todos` for `data-index` (hint: `.filter` " +
        "   loses original indices, so filter `todos.map((todo, index) => ({ " +
        "   todo, index }))` instead of filtering `todos` directly).\n" +
        "2. Add **one** click listener (delegation) on the container that " +
        "   holds the filter buttons (`#filter-controls`) that reads the " +
        "   clicked button's `data-filter`, sets `currentFilter` to it, and " +
        "   calls `render()`.\n\n" +
        "**Why is this safe to do without touching `todos`?** `currentFilter` " +
        "changes *what render() shows*, not *what exists*. Switching from " +
        "\"Active\" back to \"All\" must bring every to-do back exactly as it " +
        "was \u2014 which only works if filtering never mutates or removes " +
        "anything from `todos`. This is your first taste of **derived UI**: " +
        "a view computed fresh from state each render, instead of state " +
        "that's edited in place.",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <div id="filter-controls">\n' +
          '      <button class="filter-btn" data-filter="all">All</button>\n' +
          '      <button class="filter-btn" data-filter="active">Active</button>\n' +
          '      <button class="filter-btn" data-filter="completed">Completed</button>\n' +
          "    </div>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: true },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          "// UI state: which subset of todos is currently visible.\n" +
          "// Does NOT remove anything from `todos` — only changes what render() shows.\n" +
          'let currentFilter = "all";\n\n' +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          "  // TODO: build `visibleTodos` from todos + currentFilter.\n" +
          "  // Keep each item's original todos index for data-index (map before filter).\n" +
          "  const visibleTodos = todos.map((todo, index) => ({ todo, index }));\n\n" +
          "  for (const { todo, index } of visibleTodos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          "// TODO: add ONE click listener on #filter-controls (event delegation).\n" +
          '// - read event.target.dataset.filter (guard: only if the clicked element\n' +
          '//   has class "filter-btn")\n' +
          "// - set currentFilter to it\n" +
          "// - call render()\n",
      },
      hints: [
        'Filter with an index-preserving map first: `todos.map((todo, index) => ({ todo, index })).filter(({ todo }) => ...)` — plain `todos.filter(...)` throws away the original index you need for `data-index`.',
        'The three conditions are exactly: `currentFilter === "active"` → `!todo.done`; `currentFilter === "completed"` → `todo.done`; anything else (`"all"`) → keep every item.',
        'Attach the filter-button listener once, on `#filter-controls`, and guard with `event.target.classList.contains("filter-btn")`.',
        "Setting `currentFilter` and calling `render()` is the entire handler — `render()` already knows how to read `currentFilter` once you've wired up the filtering logic in step 1.",
      ],
      hiddenTests: [
        {
          filename: "filter-todo.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("render() filters visibleTodos by currentFilter using .filter()", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.filter\\(/.test(js)).toBe(true);\n" +
            '  expect(/currentFilter\\s*===\\s*["\'\`]active["\'\`]/.test(js)).toBe(true);\n' +
            '  expect(/currentFilter\\s*===\\s*["\'\`]completed["\'\`]/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("filtering checks todo.done for active/completed branches", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.done/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("adds a click listener on #filter-controls (event delegation)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/filter-controls/.test(js)).toBe(true);\n' +
            '  expect(/addEventListener\\(\\s*["\'\`]click["\'\`]/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("reads dataset.filter and assigns it to currentFilter", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/dataset\\.filter/.test(js)).toBe(true);\n" +
            "  expect(/currentFilter\\s*=\\s*/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("todos array itself is never filtered/spliced by the filter feature (still 3 seed todos)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const seedMatches = js.match(/text:\\s*[\"'\`][^\"'\`]+[\"'\`]\\s*,\\s*done:\\s*(true|false)/g) ?? [];\n" +
            "  expect(seedMatches.length).toBe(3);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <div id="filter-controls">\n' +
          '      <button class="filter-btn" data-filter="all">All</button>\n' +
          '      <button class="filter-btn" data-filter="active">Active</button>\n' +
          '      <button class="filter-btn" data-filter="completed">Completed</button>\n' +
          "    </div>\n\n" +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: false },\n' +
          '  { text: "Learn CSS", done: true },\n' +
          '  { text: "Learn the DOM", done: false },\n' +
          "];\n\n" +
          'let currentFilter = "all";\n\n' +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          "  const visibleTodos = todos\n" +
          "    .map((todo, index) => ({ todo, index }))\n" +
          "    .filter(({ todo }) => {\n" +
          '      if (currentFilter === "active") return !todo.done;\n' +
          '      if (currentFilter === "completed") return todo.done;\n' +
          "      return true;\n" +
          "    });\n\n" +
          "  for (const { todo, index } of visibleTodos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n' +
          "    li.textContent = todo.text;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const filterControls = document.getElementById("filter-controls");\n' +
          'filterControls.addEventListener("click", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("filter-btn")) return;\n' +
          "  currentFilter = target.dataset.filter;\n" +
          "  render();\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner never mutates or filters the todos array in place " +
        "(only computes a derived visibleTodos inside render()), and preserves each " +
        "item's original todos index for data-index using a map-before-filter technique.",
    },

    // ------------------------------------------------------------------
    // d2-t6 — clear completed (batch mutation) + Escape cancels an edit
    // ------------------------------------------------------------------
    {
      id: "d2-t6",
      title: "Clear completed to-dos in one batch mutation",
      description:
        "## Clear completed to-dos in one batch mutation\n\n" +
        "Every mutation so far has changed **one** to-do at a time " +
        "(`push`, flip a `.done`, `splice` one index). Let's add a " +
        "\"Clear completed\" button that removes **many** at once \u2014 and do " +
        "it as a single array operation instead of one `splice` per item.\n\n" +
        "`index.html` already has a `<button id=\"clear-completed-btn\">Clear " +
        "completed</button>`. In `app.js`:\n\n" +
        "1. Listen for a `click` on `#clear-completed-btn`.\n" +
        "2. Replace the *entire contents* of the `todos` array with only the " +
        "   not-done ones. **Don't reassign `todos`** (it's declared with " +
        "   `const`, and other code already holds a reference to this same " +
        "   array) \u2014 instead compute `const remaining = todos.filter((t) " +
        "   => !t.done);`, then do `todos.length = 0;` followed by " +
        "   `todos.push(...remaining);` to empty and refill the *same* " +
        "   array in place.\n" +
        "3. Call `render()`.\n\n" +
        "While you're in there, also handle one more small case: pressing " +
        "**Escape** while editing a to-do (from the previous task) should " +
        "**cancel** the edit \u2014 set `editingIndex = null` and call " +
        "`render()` *without* writing the input's value back to `todos`.\n\n" +
        "Add this to your existing `#todo-list` `keydown` listener: if " +
        '`event.key === "Escape"` and the target is `.edit-input`, cancel \n' +
        "instead of commit.\n\n" +
        "**Why not just `todos = todos.filter(...)`?** `todos` is declared " +
        "with `const`, so reassigning it would throw \u2014 and more " +
        "importantly, every listener above closed over the *original* array " +
        "reference. Mutating that same array in place (`.length = 0` + " +
        "`.push(...)`) keeps every reference pointing at the same, now-updated " +
        "data \u2014 no stale references left holding the old contents.",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <button id="clear-completed-btn">Clear completed</button>\n\n' +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n\n" +
          ".edit-input {\n" +
          "  flex: 1;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: true },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: true },\n' +
          "];\n\n" +
          "let editingIndex = null;\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          "    if (index === editingIndex) {\n" +
          '      const input = document.createElement("input");\n' +
          '      input.className = "edit-input";\n' +
          '      input.type = "text";\n' +
          "      input.value = todo.text;\n" +
          "      li.appendChild(input);\n" +
          "    } else {\n" +
          '      const span = document.createElement("span");\n' +
          "      span.textContent = todo.text;\n" +
          '      span.className = "todo-text";\n' +
          "      li.appendChild(span);\n" +
          "    }\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("dblclick", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("todo-text")) return;\n' +
          "  editingIndex = Number(target.closest(\"li\").dataset.index);\n" +
          "  render();\n" +
          "});\n\n" +
          'list.addEventListener("keydown", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("edit-input")) return;\n\n' +
          "  // TODO: if event.key === \"Enter\": commit todos[editingIndex].text\n" +
          "  // from the (trimmed) input value, set editingIndex = null, render().\n" +
          "  if (event.key === \"Enter\") {\n" +
          "    todos[editingIndex].text = target.value.trim();\n" +
          "    editingIndex = null;\n" +
          "    render();\n" +
          "  }\n\n" +
          "  // TODO: if event.key === \"Escape\": CANCEL instead — set\n" +
          "  // editingIndex = null and render(), WITHOUT touching todos[...].text.\n" +
          "});\n\n" +
          "// TODO: listen for a click on #clear-completed-btn.\n" +
          "// - compute `const remaining = todos.filter((t) => !t.done);`\n" +
          "// - empty todos in place: `todos.length = 0;`\n" +
          "// - refill it in place: `todos.push(...remaining);`\n" +
          "// - do NOT reassign `todos` itself (it's declared with const)\n" +
          "// - call render()\n",
      },
      hints: [
        'Add a second `if` inside the existing `keydown` handler: `if (event.key === "Escape") { editingIndex = null; render(); }` — no write to `todos` in that branch.',
        '`todos.filter((t) => !t.done)` gives you the survivors as a brand-new array — assign that to a local `const remaining`, don\'t call it `todos`.',
        "`todos.length = 0;` truncates the array to zero elements in place (this is legal and does not reassign the `const` binding — only `const todos = ...` would be illegal).",
        "`todos.push(...remaining);` (spread) pushes every item from `remaining` back onto the now-empty `todos`, all in one batch, before a single `render()` call.",
      ],
      hiddenTests: [
        {
          filename: "clear-completed.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("listens for click on #clear-completed-btn", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/clear-completed-btn/.test(js)).toBe(true);\n' +
            '  expect(/addEventListener\\(\\s*["\'\`]click["\'\`]/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("computes remaining todos with .filter(...) checking !t.done, without reassigning todos", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.filter\\(/.test(js)).toBe(true);\n" +
            '  expect(/!\\s*\\w+\\.done/.test(js)).toBe(true);\n' +
            "  // must never reassign the todos binding itself\n" +
            '  expect(/(?<!\\.)\\btodos\\s*=\\s*todos\\.filter/.test(js)).toBe(false);\n' +
            "});\n\n" +
            'test("empties and refills todos in place via .length = 0 and .push(...)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/todos\\.length\\s*=\\s*0/.test(js)).toBe(true);\n" +
            "  expect(/todos\\.push\\(\\s*\\.\\.\\./.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("Escape cancels an edit without writing to todos[editingIndex].text in that branch", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/["\'\`]Escape["\'\`]/.test(js)).toBe(true);\n' +
            "  const escapeBranch = js.match(\n" +
            '    /event\\.key\\s*===\\s*["\'\`]Escape["\'\`]\\s*\\)?\\s*\\{([^}]*)\\}/,\n' +
            "  );\n" +
            "  expect(escapeBranch).not.toBeNull();\n" +
            "  expect(/editingIndex\\s*=\\s*null/.test(escapeBranch![1]!)).toBe(true);\n" +
            "  expect(/\\.text\\s*=/.test(escapeBranch![1]!)).toBe(false);\n" +
            "});\n\n" +
            'test("render() is still called after clearing completed", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const renderCalls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(renderCalls.length).toBeGreaterThanOrEqual(5);\n" +
            "});\n",
        },
      ],
      solution: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          '    <link rel="stylesheet" href="style.css" />\n' +
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <form id="todo-form">\n' +
          '      <input id="todo-input" type="text" placeholder="New to-do" />\n' +
          '      <button id="add-btn" type="submit">Add</button>\n' +
          "    </form>\n\n" +
          '    <button id="clear-completed-btn">Clear completed</button>\n\n' +
          '    <ul id="todo-list"></ul>\n\n' +
          '    <script src="app.js" defer></script>\n' +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "  cursor: pointer;\n" +
          "  display: flex;\n" +
          "  justify-content: space-between;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n\n" +
          ".edit-input {\n" +
          "  flex: 1;\n" +
          "}\n",
        "app.js":
          "const todos = [\n" +
          '  { text: "Learn HTML", done: true },\n' +
          '  { text: "Learn CSS", done: false },\n' +
          '  { text: "Learn the DOM", done: true },\n' +
          "];\n\n" +
          "let editingIndex = null;\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n' +
          "  todos.forEach((todo, index) => {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item" + (todo.done ? " done" : "");\n' +
          '    li.dataset.index = String(index);\n\n' +
          "    if (index === editingIndex) {\n" +
          '      const input = document.createElement("input");\n' +
          '      input.className = "edit-input";\n' +
          '      input.type = "text";\n' +
          "      input.value = todo.text;\n" +
          "      li.appendChild(input);\n" +
          "    } else {\n" +
          '      const span = document.createElement("span");\n' +
          "      span.textContent = todo.text;\n" +
          '      span.className = "todo-text";\n' +
          "      li.appendChild(span);\n" +
          "    }\n\n" +
          "    list.appendChild(li);\n" +
          "  });\n" +
          "}\n\n" +
          "render();\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (value) {\n" +
          "    todos.push({ text: value, done: false });\n" +
          '    input.value = "";\n' +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const list = document.getElementById("todo-list");\n' +
          'list.addEventListener("dblclick", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("todo-text")) return;\n' +
          "  editingIndex = Number(target.closest(\"li\").dataset.index);\n" +
          "  render();\n" +
          "});\n\n" +
          'list.addEventListener("keydown", (event) => {\n' +
          "  const target = event.target;\n" +
          '  if (!target.classList || !target.classList.contains("edit-input")) return;\n\n' +
          "  if (event.key === \"Enter\") {\n" +
          "    todos[editingIndex].text = target.value.trim();\n" +
          "    editingIndex = null;\n" +
          "    render();\n" +
          "    return;\n" +
          "  }\n\n" +
          "  if (event.key === \"Escape\") {\n" +
          "    editingIndex = null;\n" +
          "    render();\n" +
          "  }\n" +
          "});\n\n" +
          'const clearCompletedBtn = document.getElementById("clear-completed-btn");\n' +
          'clearCompletedBtn.addEventListener("click", () => {\n' +
          "  const remaining = todos.filter((t) => !t.done);\n" +
          "  todos.length = 0;\n" +
          "  todos.push(...remaining);\n" +
          "  render();\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner cleared completed todos with a single filter + length=0 + " +
        "push(...) batch mutation (not one splice per completed item), never reassigned " +
        "the todos const binding, and that Escape cancels an edit without writing to " +
        "todos[editingIndex].text.",
    },
  ],
};
