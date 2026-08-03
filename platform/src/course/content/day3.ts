/**
 * Burrow src/course/content — Day 3: The Pain — Async & State Management.
 *
 * Build target (SPEC.md §4 / README.md / §7): add a **real network call** on
 * top of Day 2's hand-rolled `todos` array + `render()` pattern, against the
 * platform's preconfigured in-sandbox REST API at `/api/todos` (GET/POST/PUT
 * /DELETE, backed by sql.js, same-origin — no CORS, see SPEC.md §7). The API
 * already exists in the runtime; these tasks are authored purely against its
 * stable contract:
 *
 *   GET  /api/todos       -> 200 JSON array of { id, title, done }
 *   POST /api/todos       -> body { title }        -> 201 JSON the created todo
 *
 * Philosophy: "You can't appreciate the solution until you've felt the
 * problem." Day 3 is where the hand-rolled state model from Day 2 (already
 * cracking under a single shortcut in d2-t3) meets **asynchrony** — and the
 * cracks become chasms:
 *
 *   d3-t1 — fetch todos from `/api/todos` on load, render loading/error/data
 *           states by hand. Introduces the "three UI states for one array"
 *           problem: every render() call must now also branch on a separate
 *           `state` variable (loading / error / ready), and forgetting a
 *           branch leaves stale UI on screen.
 *   d3-t2 — add-todo becomes a POST request: optimistic UI (push locally,
 *           re-render immediately) that must be **reconciled** with the
 *           server's response (real id) or **rolled back** on failure. This
 *           is where "the DOM and the array must always agree" (Day 2's
 *           rule) collides with "and now there's a third source of truth:
 *           whatever the server eventually says."
 *   d3-t3 — the race-condition/stale-state pain task: a search-style
 *           "reload todos" button re-fetches `/api/todos` on every click
 *           without any request sequencing. Slow requests can resolve
 *           **out of order**, so a fast, later click's response can be
 *           overwritten by a slow, earlier click's response that resolves
 *           after it — stale data silently wins. The learner must add a
 *           request-id/token guard so only the response matching the latest
 *           request is applied. This is the concrete "manual async state
 *           sync is unbounded work" moment Day 4 (React) resolves for free
 *           with declarative re-renders driven by a single state update
 *           (and later, in Day 6, `useEffect` cleanup/AbortController).
 *
 * Tests are Bun-native (bun:test), string/regex assertions against the
 * authored `app.js` plus a handful of pure-logic assertions that exercise
 * the request-sequencing logic directly against a **mocked** `fetch`
 * (globalThis.fetch replaced with `mock(...)`) so tests never require a
 * live `/api/todos` server or network access (COMPAT.md: no live server in
 * the `bun test` sandbox these hidden tests actually run under — see
 * day1-2.test.ts's `runHiddenTestsAgainst`, which shells out to real
 * `bun test` in a throwaway temp dir with only the task's own files).
 */

import type { Day } from "../schema.ts";

export const day3: Day = {
  id: "day-3",
  title: "The Pain — Async & State Management",
  order: 3,
  tasks: [
    // ------------------------------------------------------------------
    // d3-t1 — fetch todos, hand-roll loading/error/ready state
    // ------------------------------------------------------------------
    {
      id: "d3-t1",
      title: "Fetch todos from the API (and hand-roll loading/error state)",
      description:
        "## Fetch todos from the API (and hand-roll loading/error state)\n\n" +
        "Up to now `todos` started as a hardcoded array. Today it starts " +
        "**empty**, and we load it from a real API: `GET /api/todos` " +
        "(same-origin, already running in this sandbox — see SPEC.md §7). " +
        "It returns a JSON array of `{ id, title, done }` objects.\n\n" +
        "Networks are slow and fail. Your `render()` now has to represent " +
        "**three different states** of the same page, by hand:\n\n" +
        "1. **Loading** — while the request is in flight, `#todo-list` " +
        '   should show a single `<li class="todo-status">Loading…</li>`.\n' +
        "2. **Error** — if the request rejects or the response is not `ok`, " +
        '   show a single `<li class="todo-status">Failed to load todos.</li>` ' +
        "   instead.\n" +
        "3. **Ready** — once todos arrive, render one `.todo-item` `<li>` per " +
        "   todo (same as Day 2), using each todo's `title` as the text.\n\n" +
        "In `app.js`:\n\n" +
        '1. Keep a `state` object: `{ status: "loading", todos: [], error: null }`.\n' +
        '2. On load, call `fetch("/api/todos")`.\n' +
        "3. If the response is ok, parse JSON, set " +
        '   `state = { status: "ready", todos: data, error: null }`, then `render()`.\n' +
        "4. If it throws or the response is not ok, set " +
        '   `state = { status: "error", todos: [], error: "Failed to load todos." }`, ' +
        "   then `render()`.\n" +
        "5. Update `render()` to branch on `state.status` and produce the " +
        "   three outputs above.\n\n" +
        "**Notice what just happened:** Day 2's `render()` only had to " +
        "reflect *one* array. Now it has to reflect an array **plus** a " +
        "separate status flag, and you — not a framework — are responsible " +
        "for remembering every branch, every time you touch either piece of " +
        "state. That's the first crack.",
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "// State: now has a `status` flag ALONGSIDE the todos array. Every\n" +
          "// render() call must account for all three statuses by hand.\n" +
          "//\n" +
          "// The status field is one of three lifecycle words. It starts at the\n" +
          "// first one below; after the fetch settles it becomes one of the other\n" +
          "// two, depending on whether the request succeeded:\n" +
          "//   1) still waiting on the network\n" +
          "//   2) got the data back\n" +
          "//   3) the request blew up\n" +
          "let state = {\n" +
          "  status: undefined, // TODO: pick the right lifecycle word from above\n" +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          "  // TODO: branch on state.status and produce one of three outputs\n" +
          "  // (see the task description above for the exact CSS classes/text):\n" +
          "  // - still waiting: one status <li> announcing the wait\n" +
          "  // - blew up: one status <li> announcing the failure\n" +
          "  // - got the data: one .todo-item <li> per state.todos entry\n" +
          "}\n\n" +
          "render();\n\n" +
          "// TODO: fetch the to-dos endpoint named in the task description, then:\n" +
          "// - on a successful, ok response: move state to the got-the-data case,\n" +
          "//   storing the parsed JSON as state.todos\n" +
          "// - on a thrown error OR a non-ok response: move state to the\n" +
          "//   blew-up case instead\n" +
          "// - call render() after updating state, in both branches\n" +
          'fetch("/replace-me-with-the-real-endpoint");\n',
      },
      hints: [
        'Wrap the fetch in an async IIFE or a `.then()/.catch()` chain — you need both the success path (response.ok) and the failure path (network error, or response.ok === false) to update state and re-render.',
        '`state.status` must be one of the three exact strings `"loading"`, `"ready"`, `"error"` — the tests check for these literal values in your source.',
        "render() should read from the single `state` object, not from separate loose variables — that's the whole point of grouping status+todos+error together.",
        "Don't forget: `render()` must be called again after the fetch settles (success or failure), or the loading message will be stuck on screen forever.",
      ],
      hiddenTests: [
        {
          filename: "fetch-todos.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("declares a state object with a status field starting at loading", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/status\\s*:\\s*["\']loading["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("fetches from /api/todos", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/fetch\\(\\s*["\']\\/api\\/todos["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("sets status to ready on success and error on failure", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/status\\s*:\\s*["\']ready["\']/.test(js)).toBe(true);\n' +
            '  expect(/status\\s*:\\s*["\']error["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("render() branches on state.status (all three literals present)", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/state\\.status/.test(js)).toBe(true);\n' +
            '  expect(/todo-status/.test(js)).toBe(true);\n' +
            '  expect(/Failed to load todos\\./.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("render() is called again after the fetch settles", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const calls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(calls.length).toBeGreaterThanOrEqual(2);\n" +
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "let state = {\n" +
          '  status: "loading",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "loading") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Loading\\u2026";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.title;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'fetch("/api/todos")\n' +
          "  .then((response) => {\n" +
          "    if (!response.ok) throw new Error(\"bad response\");\n" +
          "    return response.json();\n" +
          "  })\n" +
          "  .then((data) => {\n" +
          '    state = { status: "ready", todos: data, error: null };\n' +
          "    render();\n" +
          "  })\n" +
          "  .catch(() => {\n" +
          '    state = { status: "error", todos: [], error: "Failed to load todos." };\n' +
          "    render();\n" +
          "  });\n",
      },
      evalPrompt:
        "Confirm the learner grouped status/todos/error into one state object read by " +
        "render(), rather than using a loose boolean flag, and that all three UI " +
        "branches (loading, error, ready) are reachable.",
    },

    // ------------------------------------------------------------------
    // d3-t2 — optimistic POST + manual reconciliation/rollback
    // ------------------------------------------------------------------
    {
      id: "d3-t2",
      title: "Add a to-do with an optimistic POST (and a manual rollback)",
      description:
        "## Add a to-do with an optimistic POST (and a manual rollback)\n\n" +
        "The starter already fetches todos on load (from d3-t1) into " +
        "`state.todos`, and has a form (`#todo-form` / `#todo-input`). Now " +
        "let's add a to-do **through the API**: `POST /api/todos` with JSON " +
        'body `{ title }`, returning `201` and the created todo as JSON ' +
        "(`{ id, title, done }`).\n\n" +
        "A real request round-trip takes time, and users hate waiting for " +
        "a spinner just to see their own to-do appear. So we do it " +
        "**optimistically**: show the new to-do *immediately*, before the " +
        "server has even responded, then reconcile once it does.\n\n" +
        "In `app.js`'s submit handler:\n\n" +
        "1. Build a temporary optimistic todo: " +
        '   `{ id: "temp-" + Date.now(), title: value, done: false }` and ' +
        "   push it onto `state.todos`, then `render()` immediately (before " +
        "   the network call resolves).\n" +
        "2. `fetch(\"/api/todos\", { method: \"POST\", headers: " +
        "   { \"Content-Type\": \"application/json\" }, body: " +
        "   JSON.stringify({ title: value }) })`.\n" +
        "3. **On success:** find the optimistic todo in `state.todos` by its " +
        "   temporary id and **replace it** with the real todo the server " +
        "   returned (which has the server's real `id`). Then `render()`.\n" +
        "4. **On failure** (network error or non-ok response): **remove** " +
        "   the optimistic todo from `state.todos` by its temporary id (the " +
        "   **rollback**) and set `state.status = \"error\"`. Then `render()`.\n\n" +
        "**Notice what just happened:** we now have *two* copies of \"the " +
        "truth\" in flight at once — the optimistic local guess and the " +
        "server's eventual answer — and we, by hand, must remember to " +
        "reconcile or roll back every single optimistic update, forever, or " +
        "the UI silently drifts from what the server actually has.",
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "let state = {\n" +
          '  status: "loading",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "loading") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Loading\\u2026";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.title;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'fetch("/api/todos")\n' +
          "  .then((response) => response.json())\n" +
          "  .then((data) => {\n" +
          '    state = { status: "ready", todos: data, error: null };\n' +
          "    render();\n" +
          "  });\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (!value) return;\n" +
          '  input.value = "";\n\n' +
          "  // TODO: 1) push an optimistic todo with a temp id, render() now\n" +
          "  // 2) POST /api/todos with { title: value }\n" +
          "  // 3) on success: replace the optimistic todo with the server's real todo, render()\n" +
          "  // 4) on failure: remove the optimistic todo by its temp id, set state.status = 'error', render()\n" +
          "});\n",
      },
      hints: [
        'Give the optimistic todo an id like `"temp-" + Date.now()` so you can find and replace/remove it later without confusing it for a real server id.',
        '`state.todos = state.todos.map((t) => (t.id === tempId ? realTodo : t));` is a clean way to replace-in-place once the server responds.',
        '`state.todos = state.todos.filter((t) => t.id !== tempId);` is the rollback on failure — the optimistic guess never happened, as far as the UI is concerned.',
        'Remember `headers: { "Content-Type": "application/json" }` and `body: JSON.stringify({ title: value })` on the POST — a plain object body will not be sent as JSON.',
      ],
      hiddenTests: [
        {
          filename: "optimistic-add.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("pushes an optimistic todo with a temp id before the network call resolves", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/temp-/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("POSTs to /api/todos with a JSON title body", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/method\\s*:\\s*["\']POST["\']/.test(js)).toBe(true);\n' +
            '  expect(/JSON\\.stringify\\(\\s*\\{\\s*title/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("reconciles the optimistic todo with the server response on success", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.map\\(/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("rolls back the optimistic todo on failure", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.filter\\(/.test(js)).toBe(true);\n" +
            '  expect(/status\\s*:\\s*["\']error["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("renders again after both the optimistic push and the eventual settle", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const calls = js.match(/render\\(\\s*\\)/g) ?? [];\n" +
            "  expect(calls.length).toBeGreaterThanOrEqual(3);\n" +
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "let state = {\n" +
          '  status: "loading",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "loading") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Loading\\u2026";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.title;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'fetch("/api/todos")\n' +
          "  .then((response) => response.json())\n" +
          "  .then((data) => {\n" +
          '    state = { status: "ready", todos: data, error: null };\n' +
          "    render();\n" +
          "  });\n\n" +
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (!value) return;\n" +
          '  input.value = "";\n\n' +
          '  const tempId = "temp-" + Date.now();\n' +
          "  const optimisticTodo = { id: tempId, title: value, done: false };\n" +
          "  state = { ...state, todos: [...state.todos, optimisticTodo] };\n" +
          "  render();\n\n" +
          '  fetch("/api/todos", {\n' +
          '    method: "POST",\n' +
          '    headers: { "Content-Type": "application/json" },\n' +
          "    body: JSON.stringify({ title: value }),\n" +
          "  })\n" +
          "    .then((response) => {\n" +
          "      if (!response.ok) throw new Error(\"bad response\");\n" +
          "      return response.json();\n" +
          "    })\n" +
          "    .then((realTodo) => {\n" +
          "      state = {\n" +
          "        ...state,\n" +
          "        todos: state.todos.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "      };\n" +
          "      render();\n" +
          "    })\n" +
          "    .catch(() => {\n" +
          "      state = {\n" +
          '        status: "error",\n' +
          "        todos: state.todos.filter((t) => t.id !== tempId),\n" +
          '        error: "Failed to load todos.",\n' +
          "      };\n" +
          "      render();\n" +
          "    });\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner performs the optimistic push + immediate render BEFORE " +
        "the POST resolves, and correctly distinguishes reconciliation (map, keep the " +
        "server's real todo) from rollback (filter, remove the optimistic guess).",
    },

    // ------------------------------------------------------------------
    // d3-t3 — the race condition / stale-response pain task
    // ------------------------------------------------------------------
    {
      id: "d3-t3",
      title: "Fix the reload race condition (stale responses winning)",
      description:
        "## Fix the reload race condition (stale responses winning)\n\n" +
        "There's now a `<button id=\"reload-btn\">Reload</button>` that " +
        "re-fetches `/api/todos` and replaces `state.todos` with whatever " +
        "comes back — useful if the to-dos changed on the server.\n\n" +
        "Here's the bug: `/api/todos` doesn't always respond in the order " +
        "it was called. If a learner double-clicks Reload (or clicks it, " +
        "then clicks it again a moment later), **two requests are now in " +
        "flight at once**. If the *first* request happens to resolve " +
        "*after* the *second* one — a slow network hiccup, a retried " +
        "request, anything — its (older, possibly stale) data **overwrites** " +
        "the newer response that already rendered. The screen shows " +
        "*wrong* data, and nothing crashed or logged an error. This is a " +
        "**race condition**, and it gets worse, not better, the more async " +
        "calls a hand-rolled app accumulates.\n\n" +
        "The starter's `reloadTodos()` function has this bug: it fires a " +
        "fetch and applies whatever comes back, with no way to tell if a " +
        "*newer* `reloadTodos()` call has been made since.\n\n" +
        "**Your job:** add a request-sequencing guard.\n\n" +
        "1. Keep a module-level counter, e.g. `let requestId = 0;`.\n" +
        "2. At the **start** of `reloadTodos()`, increment it and capture " +
        "   the value for *this* call: `const thisRequestId = ++requestId;`.\n" +
        "3. When the fetch resolves, **only** apply the result (update " +
        "   `state` and call `render()`) if `thisRequestId === requestId` " +
        "   (i.e. no newer `reloadTodos()` call has started since this one " +
        "   began). If a newer call has started, silently discard this " +
        "   (now-stale) response — do not touch `state`.\n\n" +
        "**This is the pain of Day 3, distilled:** every single async call " +
        "in a hand-rolled app needs its own bookkeeping to avoid being " +
        "overwritten by a stale response, and there is no framework here " +
        "to remind you when you forget. (Day 4 doesn't need this trick " +
        "because React re-renders declaratively from the *latest* state " +
        "update — and Day 6's `useEffect` cleanup formalizes cancelling " +
        "stale requests entirely.)",
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
          '    <button id="reload-btn">Reload</button>\n\n' +
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "let state = {\n" +
          '  status: "loading",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "loading") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Loading\\u2026";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.title;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "// BUG: no request sequencing at all — whichever fetch resolves\n" +
          "// LAST wins, even if it was the FIRST one called (stale-response race).\n" +
          "// TODO: add a requestId counter; only apply a response if no newer\n" +
          "// call has started since this one began.\n" +
          "function reloadTodos() {\n" +
          '  fetch("/api/todos")\n' +
          "    .then((response) => response.json())\n" +
          "    .then((data) => {\n" +
          '      state = { status: "ready", todos: data, error: null };\n' +
          "      render();\n" +
          "    });\n" +
          "}\n\n" +
          "render();\n" +
          "reloadTodos();\n\n" +
          'document.getElementById("reload-btn").addEventListener("click", reloadTodos);\n',
      },
      hints: [
        'Declare the counter *outside* `reloadTodos()` (module scope), e.g. `let requestId = 0;`, so it survives across calls instead of resetting each time.',
        "Increment and capture in the same statement at the top of the function: `const thisRequestId = ++requestId;` — this must happen synchronously, before the `fetch()` call, so overlapping calls get different ids.",
        "Inside the `.then()` that receives the data, guard the state update: `if (thisRequestId !== requestId) return;` before touching `state` or calling `render()`.",
        "Don't reset `requestId` back to 0 anywhere — it should just keep counting up for the lifetime of the page.",
      ],
      hiddenTests: [
        {
          filename: "race-guard.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("declares a module-level requestId counter", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/let\\s+requestId\\s*=\\s*0/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("captures this call\'s request id before the fetch settles", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\+\\+requestId/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("guards the state update against a newer in-flight request", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/thisRequestId/.test(js)).toBe(true);\n" +
            "  expect(/thisRequestId\\s*(!==|===)\\s*requestId|requestId\\s*(!==|===)\\s*thisRequestId/.test(js)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("simulated race: a slow first response never overwrites a fast second response", async () => {\n' +
            "  // Run app.js's source in an isolated Function scope with a stubbed\n" +
            "  // document and a mocked fetch (no real DOM, no real network) so the\n" +
            "  // race can be reproduced deterministically: call 1 is slow+stale,\n" +
            "  // call 2 is fast+fresh, and call 1's response arrives LAST. The fixed\n" +
            "  // app must still end up showing call 2's (fresher) data.\n" +
            '  const appSource = await Bun.file("app.js").text();\n\n' +
            "  (globalThis as any).document = {\n" +
            "    getElementById: () => ({\n" +
            '      innerHTML: "",\n' +
            "      appendChild() {},\n" +
            "      addEventListener() {},\n" +
            "    }),\n" +
            "    createElement: () => ({}),\n" +
            "  };\n\n" +
            "  let callCount = 0;\n" +
            "  (globalThis as any).fetch = (url: string) => {\n" +
            "    callCount += 1;\n" +
            "    const thisCall = callCount;\n" +
            "    // call 1 (first) resolves slow; call 2 (second) resolves fast.\n" +
            "    const delay = thisCall === 1 ? 20 : 0;\n" +
            "    const body =\n" +
            "      thisCall === 1\n" +
            '        ? [{ id: 1, title: "stale-from-call-1", done: false }]\n' +
            '        : [{ id: 2, title: "fresh-from-call-2", done: false }];\n' +
            "    return new Promise((resolve) => {\n" +
            "      setTimeout(() => {\n" +
            "        resolve({ ok: true, json: async () => body });\n" +
            "      }, delay);\n" +
            "    });\n" +
            "  };\n\n" +
            "  // Evaluate app.js's top-level code with document/fetch as the\n" +
            "  // stubs/mocks above (not real globals), and hand back reloadTodos +\n" +
            "  // a state getter so the test can drive calls and inspect the result\n" +
            "  // deterministically without a real DOM or network.\n" +
            "  const exposed =\n" +
            "    appSource +\n" +
            '    "\\nreturn { reloadTodos: reloadTodos, getState: () => state };";\n' +
            '  const factory = new Function("document", "fetch", exposed);\n' +
            "  const { reloadTodos, getState } = factory(\n" +
            "    (globalThis as any).document,\n" +
            "    (globalThis as any).fetch,\n" +
            "  );\n\n" +
            "  reloadTodos(); // call 1: slow, stale, resolves last\n" +
            "  reloadTodos(); // call 2: fast, fresh, resolves first\n\n" +
            "  await new Promise((r) => setTimeout(r, 40));\n\n" +
            "  const titles = (getState().todos ?? []).map((t: any) => t.title);\n" +
            '  expect(titles).toEqual(["fresh-from-call-2"]);\n' +
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
          '    <button id="reload-btn">Reload</button>\n\n' +
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
          "}\n\n" +
          ".todo-status {\n" +
          "  padding: 10px;\n" +
          "  font-style: italic;\n" +
          "  color: rgb(90, 90, 90);\n" +
          "}\n",
        "app.js":
          "let state = {\n" +
          '  status: "loading",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "loading") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Loading\\u2026";\n' +
          "    list.appendChild(li);\n" +
          "    return;\n" +
          "  }\n\n" +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n' +
          "    li.textContent = todo.title;\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "let requestId = 0;\n\n" +
          "function reloadTodos() {\n" +
          "  const thisRequestId = ++requestId;\n" +
          '  fetch("/api/todos")\n' +
          "    .then((response) => response.json())\n" +
          "    .then((data) => {\n" +
          "      if (thisRequestId !== requestId) return; // stale response, discard\n" +
          '      state = { status: "ready", todos: data, error: null };\n' +
          "      render();\n" +
          "    });\n" +
          "}\n\n" +
          "render();\n" +
          "reloadTodos();\n\n" +
          'document.getElementById("reload-btn").addEventListener("click", reloadTodos);\n',
      },
      evalPrompt:
        "Confirm the learner captures a per-call request id BEFORE the async gap (the " +
        "fetch), and discards (does not apply) any response whose captured id no " +
        "longer matches the latest counter value when it resolves.",
    },
  ],
};
