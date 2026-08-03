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
 *   GET    /api/todos       -> 200 JSON array of { id, title, done }
 *   POST   /api/todos       -> body { title }        -> 201 JSON the created todo
 *   PUT    /api/todos/:id   -> body { done }         -> 200 JSON the updated todo
 *   DELETE /api/todos/:id   ->                       -> 200/204 on success
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
 *   d3-t4 — toggling "done" becomes a `PUT /api/todos/:id` request: same
 *           optimistic-then-reconcile-or-rollback shape as d3-t2, but now
 *           the learner must find the *specific* todo to flip by id inside
 *           an array, mutate a copy of just that one item, and remember to
 *           revert **that exact item** (not the whole list) if the PUT
 *           fails. Every new mutation type multiplies the hand-written
 *           bookkeeping from scratch.
 *   d3-t5 — deleting a todo becomes a `DELETE /api/todos/:id` request:
 *           optimistic removal (splice it out, re-render immediately) that
 *           must be **rolled back by re-inserting the exact todo at its
 *           original position** if the DELETE fails — otherwise a failed
 *           delete silently succeeds on screen while the server still has
 *           the row. This is the sharpest edge yet: unlike add (rollback =
 *           remove) or toggle (rollback = flip back), delete's rollback
 *           requires remembering *where* the item was, or the list's order
 *           silently drifts from the server's.
 *   d3-t6 — the double-submit pain task: nothing stops a learner from
 *           clicking "Add" twice before the first POST resolves, firing two
 *           optimistic todos and two POSTs. The fix is a hand-rolled
 *           `isSubmitting` boolean that must be set to `true` before the
 *           POST and reset to `false` in **every** exit path (success *and*
 *           failure) — miss the failure path and the button stays disabled
 *           forever after one failed request. This is the same class of
 *           problem as d3-t1's status flag and d3-t3's requestId: one more
 *           piece of state a human must remember to keep in sync by hand,
 *           on every code path, forever.
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

    // ------------------------------------------------------------------
    // d3-t4 — optimistic PUT toggle + per-item rollback
    // ------------------------------------------------------------------
    {
      id: "d3-t4",
      title: "Toggle done with an optimistic PUT (and a per-item rollback)",
      description:
        "## Toggle done with an optimistic PUT (and a per-item rollback)\n\n" +
        "The starter renders each todo as a `.todo-item` `<li>` with a checkbox " +
        '(`<input type="checkbox" class="todo-toggle" data-id="...">`) reflecting ' +
        "`todo.done`. Toggling one should update the server: `PUT /api/todos/:id` " +
        "with JSON body `{ done }`, returning `200` and the updated todo as JSON.\n\n" +
        "Same optimistic idea as d3-t2's add, but now the mutation targets **one " +
        "specific item inside the array** instead of appending to the end — which " +
        "means rollback must restore **that exact item's previous value**, not just " +
        "remove something.\n\n" +
        "In `app.js`'s checkbox change handler:\n\n" +
        "1. Read the todo's `id` from the checkbox's `data-id`, and find the " +
        "   matching todo in `state.todos`. Remember its **current** `done` value " +
        "   before changing anything (you'll need it for rollback).\n" +
        "2. Optimistically flip that one todo's `done` in `state.todos` (leave every " +
        "   other todo untouched) and `render()` immediately.\n" +
        '3. `fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": ' +
        '   "application/json" }, body: JSON.stringify({ done: newDone }) })`.\n' +
        "4. **On success:** replace that todo in `state.todos` with the server's " +
        "   returned todo (in case other fields changed server-side), then `render()`.\n" +
        "5. **On failure:** put that todo's `done` back to the value you remembered " +
        "   in step 1 (**only that item** — do not touch any other todo), set " +
        '   `state.status = "error"`, then `render()`.\n\n' +
        "**Notice what just happened:** rollback is no longer \"remove the thing we " +
        "added\" (d3-t2) — it's \"remember and restore one field of one specific item " +
        "buried inside an array,\" by hand, every time. Multiply this by every field " +
        "a real to-do app might let you edit, and the bookkeeping compounds.",
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
          "let state = {\n" +
          '  status: "ready",\n' +
          "  todos: [\n" +
          '    { id: 1, title: "Buy milk", done: false },\n' +
          '    { id: 2, title: "Walk the dog", done: true },\n' +
          "  ],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n\n' +
          '    const checkbox = document.createElement("input");\n' +
          '    checkbox.type = "checkbox";\n' +
          '    checkbox.className = "todo-toggle";\n' +
          '    checkbox.dataset.id = String(todo.id);\n' +
          "    checkbox.checked = todo.done;\n" +
          "    li.appendChild(checkbox);\n\n" +
          '    const label = document.createElement("span");\n' +
          "    label.textContent = todo.title;\n" +
          "    li.appendChild(label);\n\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          "// TODO: delegate change events from #todo-list to handle checkbox toggles.\n" +
          '// document.getElementById("todo-list").addEventListener("change", (event) => {\n' +
          '//   if (!event.target.classList.contains("todo-toggle")) return;\n' +
          "//   1) read event.target.dataset.id, find the matching todo, remember its\n" +
          "//      current done value\n" +
          "//   2) flip ONLY that todo's done in state.todos, render() immediately\n" +
          '//   3) PUT `/api/todos/${id}` with { done: <new value> }\n' +
          "//   4) on success: replace that todo with the server's returned todo, render()\n" +
          "//   5) on failure: restore ONLY that todo's remembered done value,\n" +
          '//      set state.status = "error", render()\n' +
          "// });\n" +
          'document.getElementById("todo-list").addEventListener("change", (event) => {\n' +
          "});\n",
      },
      hints: [
        "Remember the pre-toggle `done` value BEFORE you mutate `state.todos`, e.g. " +
          "`const previousDone = todo.done;` — you can't recover it afterward once " +
          "you've already flipped it locally.",
        "Use `.map()` to produce a new todos array with only the matching id changed: " +
          "`state.todos.map((t) => (t.id === id ? { ...t, done: newDone } : t));` — " +
          "every other todo passes through unchanged.",
        "The PUT URL is a template literal with the id interpolated: " +
          "`` `/api/todos/${id}` `` — not the literal string `/api/todos/:id`.",
        "On failure, roll back using the SAME `.map()` shape, restoring `previousDone` " +
          "only for the matching id — do not `.filter()` the item out, it still exists, " +
          "it just failed to save.",
      ],
      hiddenTests: [
        {
          filename: "toggle-put.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("renders a todo-toggle checkbox per todo with a data-id", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/todo-toggle/.test(js)).toBe(true);\n" +
            "  expect(/dataset\\.id/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("PUTs to /api/todos/${id} with a JSON done body", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/method\\s*:\\s*["\']PUT["\']/.test(js)).toBe(true);\n' +
            "  expect(/\\/api\\/todos\\/\\$\\{/.test(js)).toBe(true);\n" +
            "  expect(/JSON\\.stringify\\(\\s*\\{\\s*done/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("optimistically flips only the matching todo via map", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.map\\(/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("rolls back to an error state on PUT failure", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/status\\s*:\\s*["\']error["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("simulated toggle: failed PUT restores only the toggled todo\'s done value", async () => {\n' +
            "  // Evaluate app.js in an isolated Function scope with a stubbed DOM and a\n" +
            "  // mocked fetch that always rejects the PUT, so the rollback path runs\n" +
            "  // deterministically without a real server (a mocked fetch stands in for\n" +
            "  // /api/todos, exactly like day3.ts's own doc comment describes).\n" +
            '  const appSource = await Bun.file("app.js").text();\n\n' +
            "  const listeners: Record<string, (event: any) => void> = {};\n" +
            "  const fakeList = {\n" +
            '    innerHTML: "",\n' +
            "    appendChild() {},\n" +
            "    addEventListener(type: string, handler: (event: any) => void) {\n" +
            "      listeners[type] = handler;\n" +
            "    },\n" +
            "  };\n\n" +
            "  (globalThis as any).document = {\n" +
            '    getElementById: (elId: string) => (elId === "todo-list" ? fakeList : { appendChild() {}, addEventListener() {} }),\n' +
            "    createElement: () => ({\n" +
            "      classList: { contains: () => false },\n" +
            "      appendChild() {},\n" +
            "      dataset: {},\n" +
            "    }),\n" +
            "  };\n\n" +
            "  (globalThis as any).fetch = () =>\n" +
            '    Promise.resolve({ ok: false, json: async () => ({}) });\n\n' +
            "  const exposed =\n" +
            "    appSource +\n" +
            '    "\\nreturn { getState: () => state };";\n' +
            '  const factory = new Function("document", "fetch", exposed);\n' +
            "  const { getState } = factory(\n" +
            "    (globalThis as any).document,\n" +
            "    (globalThis as any).fetch,\n" +
            "  );\n\n" +
            "  const before = getState().todos.find((t: any) => t.id === 2);\n" +
            "  expect(before.done).toBe(true);\n\n" +
            '  listeners["change"]({\n' +
            "    target: {\n" +
            "      classList: { contains: (c: string) => c === \"todo-toggle\" },\n" +
            '      dataset: { id: "2" },\n' +
            "      checked: false,\n" +
            "    },\n" +
            "  });\n\n" +
            "  await new Promise((r) => setTimeout(r, 10));\n\n" +
            "  const afterOther = getState().todos.find((t: any) => t.id === 1);\n" +
            "  const afterToggled = getState().todos.find((t: any) => t.id === 2);\n" +
            "  expect(afterOther.done).toBe(false); // untouched\n" +
            "  expect(afterToggled.done).toBe(true); // rolled back to its original value\n" +
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
          '  status: "ready",\n' +
          "  todos: [\n" +
          '    { id: 1, title: "Buy milk", done: false },\n' +
          '    { id: 2, title: "Walk the dog", done: true },\n' +
          "  ],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n\n' +
          '    const checkbox = document.createElement("input");\n' +
          '    checkbox.type = "checkbox";\n' +
          '    checkbox.className = "todo-toggle";\n' +
          '    checkbox.dataset.id = String(todo.id);\n' +
          "    checkbox.checked = todo.done;\n" +
          "    li.appendChild(checkbox);\n\n" +
          '    const label = document.createElement("span");\n' +
          "    label.textContent = todo.title;\n" +
          "    li.appendChild(label);\n\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'document.getElementById("todo-list").addEventListener("change", (event) => {\n' +
          '  if (!event.target.classList.contains("todo-toggle")) return;\n\n' +
          "  const id = Number(event.target.dataset.id);\n" +
          "  const todo = state.todos.find((t) => t.id === id);\n" +
          "  if (!todo) return;\n\n" +
          "  const previousDone = todo.done;\n" +
          "  const newDone = !previousDone;\n\n" +
          "  state = {\n" +
          "    ...state,\n" +
          "    todos: state.todos.map((t) => (t.id === id ? { ...t, done: newDone } : t)),\n" +
          "  };\n" +
          "  render();\n\n" +
          '  fetch(`/api/todos/${id}`, {\n' +
          '    method: "PUT",\n' +
          '    headers: { "Content-Type": "application/json" },\n' +
          "    body: JSON.stringify({ done: newDone }),\n" +
          "  })\n" +
          "    .then((response) => {\n" +
          '      if (!response.ok) throw new Error("bad response");\n' +
          "      return response.json();\n" +
          "    })\n" +
          "    .then((updatedTodo) => {\n" +
          "      state = {\n" +
          "        ...state,\n" +
          "        todos: state.todos.map((t) => (t.id === id ? updatedTodo : t)),\n" +
          "      };\n" +
          "      render();\n" +
          "    })\n" +
          "    .catch(() => {\n" +
          "      state = {\n" +
          '        status: "error",\n' +
          "        todos: state.todos.map((t) => (t.id === id ? { ...t, done: previousDone } : t)),\n" +
          '        error: "Failed to load todos.",\n' +
          "      };\n" +
          "      render();\n" +
          "    });\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner remembers the pre-toggle done value before mutating " +
        "state, uses map() (not filter/splice) for both the optimistic update and the " +
        "rollback, and that rollback restores only the affected todo's done field.",
    },

    // ------------------------------------------------------------------
    // d3-t5 — optimistic DELETE + positional rollback
    // ------------------------------------------------------------------
    {
      id: "d3-t5",
      title: "Delete a to-do with an optimistic DELETE (and a positional rollback)",
      description:
        "## Delete a to-do with an optimistic DELETE (and a positional rollback)\n\n" +
        "Each `.todo-item` now has a `<button class=\"delete-btn\" data-id=\"...\">" +
        "\u00d7</button>`. Clicking it should delete the todo through the API: " +
        "`DELETE /api/todos/:id`, returning `200` (or `204`) on success.\n\n" +
        "Optimistic delete is the sharpest rollback yet. d3-t2's rollback was " +
        "\"remove the thing we just added\" (easy: filter it out, it never really " +
        "existed on the server). This time we're removing something that **already " +
        "existed** — so if the DELETE fails, rollback means **putting it back, at the " +
        "same position it was in**, not just anywhere.\n\n" +
        "In `app.js`'s delete-button handler:\n\n" +
        "1. Find the todo's index in `state.todos` by id (`Array.prototype.findIndex`). " +
        "   Remember **both** the todo itself and **its index** — you'll need the exact " +
        "   position for rollback.\n" +
        "2. Optimistically remove it from `state.todos` (by index or by filtering the " +
        "   id out) and `render()` immediately.\n" +
        '3. `fetch(`/api/todos/${id}`, { method: "DELETE" })`.\n' +
        "4. **On success:** nothing further to do to `state.todos` — the optimistic " +
        "   removal was correct. (No `render()` needed here since nothing changed, " +
        "   but it's harmless to call it again.)\n" +
        "5. **On failure:** **re-insert** the remembered todo back into `state.todos` " +
        '   at the remembered index (`state.todos.toSpliced(index, 0, todo)` or ' +
        "   `[...before, todo, ...after]`), set `state.status = \"error\"`, then " +
        "   `render()`.\n\n" +
        "**Notice what just happened:** unlike add (rollback = remove) or toggle " +
        "(rollback = flip one field back), delete's rollback needs a **position**, not " +
        "just an id — lose track of the index and a failed delete either vanishes the " +
        "todo forever (client-side) or resurrects it in the wrong spot in the list.",
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
          "let state = {\n" +
          '  status: "ready",\n' +
          "  todos: [\n" +
          '    { id: 1, title: "Buy milk", done: false },\n' +
          '    { id: 2, title: "Walk the dog", done: true },\n' +
          '    { id: 3, title: "Read a book", done: false },\n' +
          "  ],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n\n' +
          '    const label = document.createElement("span");\n' +
          "    label.textContent = todo.title;\n" +
          "    li.appendChild(label);\n\n" +
          '    const del = document.createElement("button");\n' +
          '    del.className = "delete-btn";\n' +
          '    del.dataset.id = String(todo.id);\n' +
          '    del.textContent = "\u00d7";\n' +
          "    li.appendChild(del);\n\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          "// TODO: delegate click events from #todo-list to handle delete-btn clicks.\n" +
          '// document.getElementById("todo-list").addEventListener("click", (event) => {\n' +
          '//   if (!event.target.classList.contains("delete-btn")) return;\n' +
          "//   1) read event.target.dataset.id, findIndex the matching todo, remember\n" +
          "//      BOTH the todo and its index\n" +
          "//   2) optimistically remove it from state.todos, render() immediately\n" +
          '//   3) DELETE `/api/todos/${id}`\n' +
          "//   4) on success: nothing further needed\n" +
          "//   5) on failure: re-insert the remembered todo at the remembered index,\n" +
          '//      set state.status = "error", render()\n' +
          "// });\n" +
          'document.getElementById("todo-list").addEventListener("click", (event) => {\n' +
          "});\n",
      },
      hints: [
        "`const index = state.todos.findIndex((t) => t.id === id);` and " +
          "`const todo = state.todos[index];` — capture BOTH before you remove anything, " +
          "you need the index for rollback, not just the id.",
        "Optimistic removal: `state.todos.filter((t) => t.id !== id)` is fine for the " +
          "happy path since order among the *remaining* items doesn't change.",
        "Rollback re-insertion at a specific index: " +
          "`[...state.todos.slice(0, index), todo, ...state.todos.slice(index)]` — " +
          "plain `.push()` would put it back at the end, not its original spot.",
        "The DELETE call needs no body, just " +
          '`fetch(`/api/todos/${id}`, { method: "DELETE" })`.',
      ],
      hiddenTests: [
        {
          filename: "delete-rollback.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("renders a delete-btn button per todo with a data-id", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/delete-btn/.test(js)).toBe(true);\n" +
            "  expect(/dataset\\.id/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("DELETEs to /api/todos/${id}", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/method\\s*:\\s*["\']DELETE["\']/.test(js)).toBe(true);\n' +
            "  expect(/\\/api\\/todos\\/\\$\\{/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("remembers the index before optimistic removal", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/findIndex\\(/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("rolls back to an error state on DELETE failure", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/status\\s*:\\s*["\']error["\']/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("simulated delete: failed DELETE re-inserts the todo at its original position", async () => {\n' +
            "  // Same isolated-Function-scope technique as d3-t3/d3-t4: mocked fetch\n" +
            "  // always rejects the DELETE, so the rollback path runs deterministically\n" +
            "  // with no real server.\n" +
            '  const appSource = await Bun.file("app.js").text();\n\n' +
            "  const listeners: Record<string, (event: any) => void> = {};\n" +
            "  const fakeList = {\n" +
            '    innerHTML: "",\n' +
            "    appendChild() {},\n" +
            "    addEventListener(type: string, handler: (event: any) => void) {\n" +
            "      listeners[type] = handler;\n" +
            "    },\n" +
            "  };\n\n" +
            "  (globalThis as any).document = {\n" +
            '    getElementById: (elId: string) => (elId === "todo-list" ? fakeList : { appendChild() {}, addEventListener() {} }),\n' +
            "    createElement: () => ({\n" +
            "      classList: { contains: () => false },\n" +
            "      appendChild() {},\n" +
            "      dataset: {},\n" +
            "    }),\n" +
            "  };\n\n" +
            "  (globalThis as any).fetch = () =>\n" +
            '    Promise.resolve({ ok: false, json: async () => ({}) });\n\n' +
            "  const exposed =\n" +
            "    appSource +\n" +
            '    "\\nreturn { getState: () => state };";\n' +
            '  const factory = new Function("document", "fetch", exposed);\n' +
            "  const { getState } = factory(\n" +
            "    (globalThis as any).document,\n" +
            "    (globalThis as any).fetch,\n" +
            "  );\n\n" +
            "  expect(getState().todos.map((t: any) => t.id)).toEqual([1, 2, 3]);\n\n" +
            '  listeners["click"]({\n' +
            "    target: {\n" +
            "      classList: { contains: (c: string) => c === \"delete-btn\" },\n" +
            '      dataset: { id: "2" },\n' +
            "    },\n" +
            "  });\n\n" +
            "  await new Promise((r) => setTimeout(r, 10));\n\n" +
            "  const ids = getState().todos.map((t: any) => t.id);\n" +
            "  expect(ids).toEqual([1, 2, 3]); // id 2 restored at its original index (1)\n" +
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
          '  status: "ready",\n' +
          "  todos: [\n" +
          '    { id: 1, title: "Buy milk", done: false },\n' +
          '    { id: 2, title: "Walk the dog", done: true },\n' +
          '    { id: 3, title: "Read a book", done: false },\n' +
          "  ],\n" +
          "  error: null,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  if (state.status === "error") {\n' +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-status";\n' +
          '    li.textContent = "Failed to load todos.";\n' +
          "    list.appendChild(li);\n" +
          "  }\n\n" +
          "  for (const todo of state.todos) {\n" +
          '    const li = document.createElement("li");\n' +
          '    li.className = "todo-item";\n\n' +
          '    const label = document.createElement("span");\n' +
          "    label.textContent = todo.title;\n" +
          "    li.appendChild(label);\n\n" +
          '    const del = document.createElement("button");\n' +
          '    del.className = "delete-btn";\n' +
          '    del.dataset.id = String(todo.id);\n' +
          '    del.textContent = "\u00d7";\n' +
          "    li.appendChild(del);\n\n" +
          "    list.appendChild(li);\n" +
          "  }\n" +
          "}\n\n" +
          "render();\n\n" +
          'document.getElementById("todo-list").addEventListener("click", (event) => {\n' +
          '  if (!event.target.classList.contains("delete-btn")) return;\n\n' +
          "  const id = Number(event.target.dataset.id);\n" +
          "  const index = state.todos.findIndex((t) => t.id === id);\n" +
          "  if (index === -1) return;\n" +
          "  const todo = state.todos[index];\n\n" +
          "  state = { ...state, todos: state.todos.filter((t) => t.id !== id) };\n" +
          "  render();\n\n" +
          '  fetch(`/api/todos/${id}`, { method: "DELETE" })\n' +
          "    .then((response) => {\n" +
          '      if (!response.ok) throw new Error("bad response");\n' +
          "    })\n" +
          "    .catch(() => {\n" +
          "      state = {\n" +
          '        status: "error",\n' +
          "        todos: [\n" +
          "          ...state.todos.slice(0, index),\n" +
          "          todo,\n" +
          "          ...state.todos.slice(index),\n" +
          "        ],\n" +
          '        error: "Failed to load todos.",\n' +
          "      };\n" +
          "      render();\n" +
          "    });\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm the learner captures BOTH the todo and its index before the optimistic " +
        "removal, and that a failed DELETE re-inserts the todo at its original index " +
        "(not just appended anywhere) via slice/splice, not push.",
    },

    // ------------------------------------------------------------------
    // d3-t6 — double-submit guard (isSubmitting bookkeeping on every path)
    // ------------------------------------------------------------------
    {
      id: "d3-t6",
      title: "Prevent double-submit with a hand-rolled isSubmitting flag",
      description:
        "## Prevent double-submit with a hand-rolled isSubmitting flag\n\n" +
        "The starter has d3-t2's optimistic-POST add form, but nothing stops a fast " +
        "clicker from submitting **twice** before the first POST resolves — firing two " +
        "optimistic todos and two POST requests for what the user thought was one " +
        "click.\n\n" +
        "The fix: a plain boolean, `state.isSubmitting`, that disables the submit " +
        "button while a request is in flight. This sounds trivial — until you realize " +
        "it must be set back to `false` on **every single exit path**, including the " +
        "ones that only happen on network failure.\n\n" +
        "In `app.js`'s submit handler:\n\n" +
        "1. At the very top, **bail out early** if `state.isSubmitting` is already " +
        "   `true` (a guard against a click that slipped through before the button's " +
        "   `disabled` attribute visually updated).\n" +
        "2. Immediately set `state.isSubmitting = true` and `render()` (this is what " +
        "   disables the submit button — `render()` must set the button's `disabled` " +
        "   property from `state.isSubmitting`).\n" +
        "3. Do the optimistic push + POST, exactly like d3-t2.\n" +
        "4. **On success:** reconcile the todo (like d3-t2) AND set " +
        "   `state.isSubmitting = false`, then `render()`.\n" +
        "5. **On failure:** roll back the todo (like d3-t2) AND **also** set " +
        "   `state.isSubmitting = false`, then `render()`.\n\n" +
        "**Notice what just happened:** step 5 is the trap. It's easy to remember to " +
        "reset `isSubmitting` in the success branch (you're already there editing that " +
        "code) and forget the failure branch entirely — and the bug is invisible until " +
        "someone's request fails, at which point the Add button is disabled **forever**, " +
        "with no error and no way to recover except reloading the page. Every new flag " +
        "you hand-roll (status, isSubmitting, requestId, ...) is one more thing that " +
        "must be correctly reset on every possible code path, forever, by a human.",
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
          '  status: "ready",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "  isSubmitting: false,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          "  // TODO: set the add button's disabled property from state.isSubmitting\n" +
          '  // document.getElementById("add-btn").disabled = state.isSubmitting;\n\n' +
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
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  const value = input.value.trim();\n" +
          "  if (!value) return;\n\n" +
          "  // TODO:\n" +
          "  // 1) bail out early if state.isSubmitting is already true\n" +
          "  // 2) set state.isSubmitting = true, render()\n" +
          '  // 3) push an optimistic todo with a temp id (like d3-t2), clear input.value, render()\n' +
          "  // 4) POST /api/todos with { title: value }\n" +
          "  // 5) on success: reconcile the todo AND set state.isSubmitting = false, render()\n" +
          "  // 6) on failure: roll back the todo AND set state.isSubmitting = false, render()\n" +
          "});\n",
      },
      hints: [
        "The early-bail guard is one line at the very top of the handler, before doing " +
          "anything else: `if (state.isSubmitting) return;`.",
        "`render()` must read `state.isSubmitting` to set the button's `disabled` " +
          'property — `document.getElementById("add-btn").disabled = state.isSubmitting;` — ' +
          "otherwise the guard exists in state but the button never visually disables.",
        "Both the `.then()` success branch AND the `.catch()` failure branch need their " +
          "own `state = { ...state, isSubmitting: false, ... }` — copy-pasting only the " +
          "success branch's reset is the exact bug this task is about.",
        "Structure it so resetting isSubmitting is impossible to forget, e.g. compute the " +
          "next state object in one place per branch that always includes " +
          "`isSubmitting: false` alongside whatever else that branch changes.",
      ],
      hiddenTests: [
        {
          filename: "double-submit-guard.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("declares an isSubmitting flag on state, defaulting to false", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/isSubmitting\\s*:\\s*false/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("guards against a submit while already submitting", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/if\\s*\\(\\s*state\\.isSubmitting\\s*\\)/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("render() disables the add button from state.isSubmitting", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/\\.disabled\\s*=\\s*state\\.isSubmitting/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("resets isSubmitting to false in BOTH the success and failure branches", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  const resets = js.match(/isSubmitting\\s*:\\s*false/g) ?? [];\n" +
            "  // one for the initial state literal, at least two more for the two\n" +
            "  // settle branches (success + failure) resetting it back to false\n" +
            "  expect(resets.length).toBeGreaterThanOrEqual(3);\n" +
            "});\n\n" +
            'test("simulated double-submit: a failed POST still resets isSubmitting to false", async () => {\n' +
            "  // Same isolated-Function-scope technique as the other d3 race/rollback\n" +
            "  // tests: a mocked fetch that always rejects the POST, so we can confirm\n" +
            "  // the failure path resets isSubmitting without a real server.\n" +
            '  const appSource = await Bun.file("app.js").text();\n\n' +
            "  const listeners: Record<string, (event: any) => void> = {};\n" +
            "  const fakeButton = { disabled: false };\n" +
            "  const fakeInput = { value: \"buy milk\" };\n" +
            "  const fakeList = {\n" +
            '    innerHTML: "",\n' +
            "    appendChild() {},\n" +
            "  };\n" +
            "  const fakeForm = {\n" +
            "    addEventListener(type: string, handler: (event: any) => void) {\n" +
            "      listeners[type] = handler;\n" +
            "    },\n" +
            "  };\n\n" +
            "  (globalThis as any).document = {\n" +
            "    getElementById: (elId: string) => {\n" +
            '      if (elId === "todo-list") return fakeList;\n' +
            '      if (elId === "add-btn") return fakeButton;\n' +
            '      if (elId === "todo-form") return fakeForm;\n' +
            '      if (elId === "todo-input") return fakeInput;\n' +
            "      return { appendChild() {}, addEventListener() {} };\n" +
            "    },\n" +
            "    createElement: () => ({ appendChild() {} }),\n" +
            "  };\n\n" +
            "  (globalThis as any).fetch = () =>\n" +
            '    Promise.resolve({ ok: false, json: async () => ({}) });\n\n' +
            "  const exposed =\n" +
            "    appSource +\n" +
            '    "\\nreturn { getState: () => state };";\n' +
            '  const factory = new Function("document", "fetch", exposed);\n' +
            "  const { getState } = factory(\n" +
            "    (globalThis as any).document,\n" +
            "    (globalThis as any).fetch,\n" +
            "  );\n\n" +
            "  expect(getState().isSubmitting).toBe(false);\n\n" +
            '  listeners["submit"]({ preventDefault() {} });\n\n' +
            "  expect(getState().isSubmitting).toBe(true); // disabled immediately\n\n" +
            "  await new Promise((r) => setTimeout(r, 10));\n\n" +
            "  expect(getState().isSubmitting).toBe(false); // reset even though the POST failed\n" +
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
          '  status: "ready",\n' +
          "  todos: [],\n" +
          "  error: null,\n" +
          "  isSubmitting: false,\n" +
          "};\n\n" +
          "function render() {\n" +
          '  const list = document.getElementById("todo-list");\n' +
          '  list.innerHTML = "";\n\n' +
          '  document.getElementById("add-btn").disabled = state.isSubmitting;\n\n' +
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
          'const form = document.getElementById("todo-form");\n' +
          'const input = document.getElementById("todo-input");\n\n' +
          'form.addEventListener("submit", (event) => {\n' +
          "  event.preventDefault();\n" +
          "  if (state.isSubmitting) return;\n\n" +
          "  const value = input.value.trim();\n" +
          "  if (!value) return;\n\n" +
          '  const tempId = "temp-" + Date.now();\n' +
          "  state = {\n" +
          "    ...state,\n" +
          "    isSubmitting: true,\n" +
          "    todos: [...state.todos, { id: tempId, title: value, done: false }],\n" +
          "  };\n" +
          '  input.value = "";\n' +
          "  render();\n\n" +
          '  fetch("/api/todos", {\n' +
          '    method: "POST",\n' +
          '    headers: { "Content-Type": "application/json" },\n' +
          "    body: JSON.stringify({ title: value }),\n" +
          "  })\n" +
          "    .then((response) => {\n" +
          '      if (!response.ok) throw new Error("bad response");\n' +
          "      return response.json();\n" +
          "    })\n" +
          "    .then((realTodo) => {\n" +
          "      state = {\n" +
          "        ...state,\n" +
          "        isSubmitting: false,\n" +
          "        todos: state.todos.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "      };\n" +
          "      render();\n" +
          "    })\n" +
          "    .catch(() => {\n" +
          "      state = {\n" +
          '        status: "error",\n' +
          "        isSubmitting: false,\n" +
          "        todos: state.todos.filter((t) => t.id !== tempId),\n" +
          '        error: "Failed to load todos.",\n' +
          "      };\n" +
          "      render();\n" +
          "    });\n" +
          "});\n",
      },
      evalPrompt:
        "Confirm isSubmitting is set to true synchronously before the POST, guarded " +
        "against re-entry at the top of the handler, and reset to false in BOTH the " +
        "success and failure branches (not only the success branch).",
    },
  ],
};
