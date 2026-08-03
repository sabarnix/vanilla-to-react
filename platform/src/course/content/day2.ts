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
  ],
};
