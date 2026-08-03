/**
 * Burrow src/course/content — Day 7: Putting It All Together (the capstone).
 *
 * Build target (SPEC.md §4 / README.md / §7): ship a **complete** React
 * to-do app against the same stable `/api/todos` contract used since Day 3:
 *
 *   GET    /api/todos      -> 200 JSON array of { id, title, done }
 *   POST   /api/todos      -> 201 JSON { id, title, done }  (body: { title })
 *   PUT    /api/todos/:id  -> 200 JSON { id, title, done }  (body: { done } or { title })
 *   DELETE /api/todos/:id  -> 200/204
 *
 * This is the culminating day: every idea from Days 4-6 — `useState` for
 * declarative UI (d4-t1), `useEffect` for fetch-on-mount with cleanup
 * (d4-t2, d6-t1..t3), optimistic writes without manual reconciliation
 * bookkeeping (d4-t3), and component composition via props/callback-props
 * (d5-t1..t3) — gets assembled into one shippable app, plus the CRUD
 * operations the course hasn't exercised yet: **toggling done** against the
 * server (Day 5's d5-t2 only toggled *local* state), **deleting** a todo,
 * **renaming** a todo, and **filtering** / bulk-clearing a finished list:
 *
 *   d7-t1 — **app shell composition.** `App` fetches todos on mount
 *           (`d4-t2`/`d6-t1`'s shape) and renders `TodoList` (`d5-t3`'s
 *           composition root pattern), wiring `onToggleTodo`,
 *           `onDeleteTodo`, and an add-form's `onAddTodo` down as callback
 *           props. This task is purely about *shape*: get App -> TodoList
 *           -> TodoItem wired end-to-end with local state updates (no
 *           network calls yet — those are t2's job) so the composition
 *           tree is proven correct before layering async writes on top of
 *           it.
 *   d7-t2 — **data fetching + mutations end-to-end.** Wire every CRUD verb
 *           to the real `/api/todos` contract: `useEffect` fetch-on-mount
 *           with the loading/error split (d6-t1's shape), then optimistic
 *           create/toggle/delete that mirrors d4-t3's optimistic-update +
 *           reconcile-or-rollback protocol, extended to PUT (toggle) and
 *           DELETE for the first time. Same rule as every prior day: no
 *           `render()` to remember, no manual reconciliation — a
 *           `setTodos` call *is* the update, React re-renders from
 *           whatever the latest state is.
 *   d7-t3 — **ship it (v1).** The capstone deliverable: the same app, fully
 *           polished — an explicit **empty state** ("nothing to do yet"),
 *           `d6-t1`'s three-state loading/error/ready split all reachable,
 *           and all four CRUD operations (create, read, toggle, delete)
 *           working together without regressing any earlier state. This is
 *           the "first-time learner can complete Day 1 with zero setup"
 *           promise (SPEC.md §8) turned around: by Day 7 the *same*
 *           learner ships a real, working app end to end.
 *   d7-t4 — **filtering + derived state.** Add an All/Active/Completed
 *           filter, driven by exactly **one** new piece of state (the
 *           current filter string) — the visible list itself is never
 *           stored, it's *derived* from `todos` + `filter` on every render
 *           (same discipline as d7-t3's `deriveViewState`: don't store what
 *           you can compute). Also derive a "N items left" count the same
 *           way. This is the lesson that not every UI concern needs a
 *           `useState` — most of the time it needs a pure function of
 *           state that already exists.
 *   d7-t5 — **optimistic rename.** The one CRUD write the course hasn't
 *           touched: editing a todo's `title` in place. Applies the exact
 *           same optimistic-update-then-reconcile-or-rollback protocol as
 *           d7-t2's toggle/delete — now for the fourth time — extended
 *           with a validation rule real apps need (reject an empty/
 *           whitespace-only rename rather than optimistically saving
 *           blank text).
 *   d7-t6 — **ship it (v2): bulk actions + final polish.** The last
 *           capstone task: a "Clear completed" bulk action (optimistic,
 *           same rollback discipline, now acting on *multiple* todos in
 *           one optimistic update instead of one), combined with d7-t4's
 *           filter + count so the finished app can answer "how many are
 *           left" and clear a filtered batch without a page reload. This
 *           is the final, fully-loaded version of the app every earlier
 *           d7 task built toward.
 *
 * Hidden tests follow Day 4/5/6's proven approach exactly (see their doc
 * comments): every hidden test exercises either (a) a **pure,
 * dependency-free helper function** (co-authored in a plain `.js` file, no
 * JSX, no React import, no live network — `fetch` itself is mocked inside
 * the pure-helper tests only where a helper models a fetch-derived
 * decision) or (b) a string/regex "shape" assertion against the authored
 * `.jsx` source (same technique as day3-4.test.ts's shape tests), so
 * `bun test` runs with zero npm installs, zero JSX execution, zero DOM,
 * zero live `/api/todos` server — same `runHiddenTestsAgainst` machinery as
 * day5-6.test.ts. The React components themselves are reviewed via
 * `evalPrompt` / visually in the running sandbox.
 */

import type { Day } from "../schema.ts";

export const day7: Day = {
  id: "day-7",
  title: "Putting It All Together",
  order: 7,
  tasks: [
    // ------------------------------------------------------------------
    // d7-t1 — app shell composition: App -> TodoList -> TodoItem, wired
    // ------------------------------------------------------------------
    {
      id: "d7-t1",
      title: "Assemble the app shell (App -> TodoList -> TodoItem, wired)",
      description:
        "## Assemble the app shell (App -> TodoList -> TodoItem, wired)\n\n" +
        "Day 5 built the composition tree — `App` owns state, `TodoList` " +
        "owns the `.map()`/`key` loop, `TodoItem` renders one row and " +
        "reports a toggle. Day 6 built the fetch-on-mount + loading/error " +
        "shape. Today's job is to put both shapes **in the same app** and " +
        "add the one piece neither day needed yet: an **add-todo form** " +
        "and a **delete** callback, wired all the way through the tree.\n\n" +
        "`App.jsx` becomes the composition root for the whole feature:\n\n" +
        "```jsx\n" +
        "function App() {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todos, setTodos] = useState([]);\n" +
        '  const [input, setInput] = useState("");\n\n' +
        "  // useEffect fetch-on-mount comes in d7-t2 — for this task, seed\n" +
        "  // todos directly so the composition tree can be proven correct\n" +
        "  // first, independent of the network.\n\n" +
        "  function handleAdd(event) {\n" +
        "    event.preventDefault();\n" +
        "    const value = input.trim();\n" +
        "    if (!value) return;\n" +
        '    const tempId = "temp-" + Date.now();\n' +
        "    setTodos((current) => [...current, { id: tempId, title: value, done: false }]);\n" +
        '    setInput("");\n' +
        "  }\n\n" +
        "  function handleToggle(id) {\n" +
        "    setTodos((current) =>\n" +
        "      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
        "    );\n" +
        "  }\n\n" +
        "  function handleDelete(id) {\n" +
        "    setTodos((current) => current.filter((t) => t.id !== id));\n" +
        "  }\n\n" +
        "  return (\n" +
        "    <>\n" +
        "      <form onSubmit={handleAdd}>\n" +
        "        <input value={input} onChange={(e) => setInput(e.target.value)} />\n" +
        '        <button type="submit">Add</button>\n' +
        "      </form>\n" +
        "      <TodoList\n" +
        "        todos={todos}\n" +
        "        onToggleTodo={handleToggle}\n" +
        "        onDeleteTodo={handleDelete}\n" +
        "      />\n" +
        "    </>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "`TodoList` forwards both callbacks down to `TodoItem` (same " +
        "pass-through pattern as d5-t3's `onToggleTodo`), and `TodoItem` " +
        "gains a delete button that calls `onDelete(todo.id)` — mirroring " +
        "exactly how it already calls `onToggle(todo.id)`:\n\n" +
        "```jsx\n" +
        "function TodoItem({ todo, onToggle, onDelete }) {\n" +
        "  return (\n" +
        '    <li className="todo-item">\n' +
        "      <input\n" +
        '        type="checkbox"\n' +
        "        checked={todo.done}\n" +
        "        onChange={() => onToggle(todo.id)}\n" +
        "      />\n" +
        "      {todo.title}\n" +
        '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
        "    </li>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "**Your job:** finish `TodoItem.jsx` (add the `onDelete` prop and " +
        "delete `<button>`), `TodoList.jsx` (forward `onDeleteTodo` to " +
        "`TodoItem`'s `onDelete` prop, alongside the existing " +
        "`onToggleTodo`), and `App.jsx` (own `todos`/`input` state, render " +
        "the add-`<form>`, and render `<TodoList>` with all three props: " +
        "`todos`, `onToggleTodo`, `onDeleteTodo`) to match the shapes " +
        "above, AND implement two pure helpers in `view.js`:\n\n" +
        "- `addTodoLocally(todos, title)` — returns a **new** array with a " +
        "  new todo appended, `id` starting with the literal prefix " +
        '  `"temp-"`, `title` set to the given (already-trimmed) title, ' +
        "  and `done: false`. Must not mutate the input array.\n" +
        "- `deleteTodoLocally(todos, id)` — returns a **new** array with " +
        "  the todo whose `id` matches removed, everything else unchanged. " +
        "  Must not mutate the input array.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "// TODO: accept an `onDelete` prop and render a Delete <button> that\n" +
          "// calls onDelete(todo.id) on click, alongside the existing checkbox\n" +
          "// wired to onToggle(todo.id).\n" +
          "function TodoItem({ todo, onToggle }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "TodoList.jsx":
          "// TODO: accept an `onDeleteTodo` prop and forward it to each TodoItem\n" +
          "// as its `onDelete` prop, alongside the existing onToggleTodo forwarding.\n" +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos, setTodos] = useState([\n" +
          '    { id: 1, title: "Learn composition", done: false },\n' +
          "  ]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  // TODO: add handleAdd(event) — prevent default, guard against an\n" +
          "  // empty trimmed input, append a new todo with a \"temp-\" id via\n" +
          '  // setTodos, and reset input to "".\n\n' +
          "  // TODO: add handleToggle(id) — flip the matching todo's done field\n" +
          "  // immutably via setTodos (same as d5-t2).\n\n" +
          "  // TODO: add handleDelete(id) — remove the matching todo via setTodos.\n\n" +
          "  // TODO: render a <form> with a controlled <input> + submit button\n" +
          "  // calling handleAdd, followed by <TodoList todos={todos}\n" +
          "  // onToggleTodo={handleToggle} onDeleteTodo={handleDelete} />.\n" +
          "  return <TodoList todos={todos} onToggleTodo={() => {}} onDeleteTodo={() => {}} />;\n" +
          "}\n",
        "view.js":
          "// TODO: implement addTodoLocally(todos, title) -> new array with a\n" +
          "// { id: \"temp-\" + ..., title, done: false } appended. Do not mutate input.\n" +
          "export function addTodoLocally(todos, title) {\n" +
          "}\n\n" +
          "// TODO: implement deleteTodoLocally(todos, id) -> new array with the\n" +
          "// matching todo removed. Do not mutate input.\n" +
          "export function deleteTodoLocally(todos, id) {\n" +
          "}\n",
      },
      hints: [
        "`onDelete`/`onDeleteTodo` should thread through the tree exactly like `onToggle`/`onToggleTodo` already does in d5-t2/d5-t3 — same shape, new name, one extra prop at each layer.",
        "`TodoItem`'s delete button only ever calls `onDelete(todo.id)` — it never touches `todos` or calls `setTodos` itself, same rule as the checkbox's `onToggle`.",
        '`addTodoLocally` is a one-line spread + push: `return [...todos, { id: "temp-" + Date.now(), title, done: false }];` — the exact `id` value doesn\'t need to be deterministic, just prefixed with `"temp-"`.',
        "`deleteTodoLocally` is a one-line `.filter()`: `return todos.filter((t) => t.id !== id);`.",
      ],
      hiddenTests: [
        {
          filename: "local-updates.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { addTodoLocally, deleteTodoLocally } from "./view.js";\n\n' +
            'test("addTodoLocally appends a new todo with a temp- id and done: false", () => {\n' +
            '  const todos = [{ id: 1, title: "Existing", done: false }];\n' +
            '  const result = addTodoLocally(todos, "Buy milk");\n' +
            "  expect(result.length).toBe(2);\n" +
            '  expect(result[0]).toEqual({ id: 1, title: "Existing", done: false });\n' +
            '  expect(String(result[1].id).startsWith("temp-")).toBe(true);\n' +
            '  expect(result[1].title).toBe("Buy milk");\n' +
            "  expect(result[1].done).toBe(false);\n" +
            "});\n\n" +
            'test("addTodoLocally does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "Existing", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            '  addTodoLocally(todos, "New");\n' +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("deleteTodoLocally removes exactly the matching todo", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ];\n" +
            "  const result = deleteTodoLocally(todos, 1);\n" +
            '  expect(result).toEqual([{ id: 2, title: "B", done: true }]);\n' +
            "});\n\n" +
            'test("deleteTodoLocally does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            "  deleteTodoLocally(todos, 1);\n" +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("deleteTodoLocally leaves the array untouched if the id is not found", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  const result = deleteTodoLocally(todos, 999);\n" +
            "  expect(result).toEqual(todos);\n" +
            "});\n",
        },
        {
          filename: "shell-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoItem.jsx accepts onDelete and renders a button calling onDelete(todo.id)", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/onDelete/.test(jsx)).toBe(true);\n" +
            "  expect(/onDelete\\(\\s*todo\\.id\\s*\\)/.test(jsx)).toBe(true);\n" +
            '  expect(/<button/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("TodoItem.jsx still wires the existing onToggle checkbox", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/onToggle\\(\\s*todo\\.id\\s*\\)/.test(jsx)).toBe(true);\n" +
            "  expect(/checked=\\{todo\\.done\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoList.jsx forwards onDeleteTodo to TodoItem\'s onDelete prop", async () => {\n' +
            '  const jsx = await Bun.file("TodoList.jsx").text();\n' +
            "  expect(/onDelete=\\{onDeleteTodo\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onToggle=\\{onToggleTodo\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx defines handleAdd, handleToggle, and handleDelete", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleAdd/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleToggle/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleDelete/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx renders TodoList wired with todos, onToggleTodo, and onDeleteTodo", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/<TodoList/.test(jsx)).toBe(true);\n" +
            "  expect(/todos=\\{todos\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onToggleTodo=\\{handleToggle\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onDeleteTodo=\\{handleDelete\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx renders a form with a controlled input calling handleAdd on submit", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/onSubmit=\\{handleAdd\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onChange=\\{/.test(jsx)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos, setTodos] = useState([\n" +
          '    { id: 1, title: "Learn composition", done: false },\n' +
          "  ]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n' +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    setTodos((current) =>\n" +
          "      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
          "    );\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    setTodos((current) => current.filter((t) => t.id !== id));\n" +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <TodoList\n" +
          "        todos={todos}\n" +
          "        onToggleTodo={handleToggle}\n" +
          "        onDeleteTodo={handleDelete}\n" +
          "      />\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function addTodoLocally(todos, title) {\n" +
          '  return [...todos, { id: "temp-" + Date.now(), title, done: false }];\n' +
          "}\n\n" +
          "export function deleteTodoLocally(todos, id) {\n" +
          "  return todos.filter((t) => t.id !== id);\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm the composition tree is App -> TodoList -> TodoItem with three " +
        "callback props (onToggleTodo/onDeleteTodo plus the add-form's onSubmit) all " +
        "wired end-to-end, and that neither TodoList nor TodoItem manage todos state " +
        "directly — App remains the single composition root, same discipline as d5-t3.",
    },

    // ------------------------------------------------------------------
    // d7-t2 — data fetching + mutations end-to-end against /api/todos
    // ------------------------------------------------------------------
    {
      id: "d7-t2",
      title: "Wire create/toggle/delete to /api/todos end-to-end",
      description:
        "## Wire create/toggle/delete to /api/todos end-to-end\n\n" +
        "d7-t1 proved the composition tree with local-only state updates. " +
        "Now connect every mutation to the real API (SPEC.md §7), the same " +
        "`/api/todos` contract used since Day 3, extended with the two " +
        "verbs this course hasn't exercised yet:\n\n" +
        "```\n" +
        "GET    /api/todos      -> 200 [{ id, title, done }, ...]\n" +
        "POST   /api/todos      -> 201 { id, title, done }   body: { title }\n" +
        "PUT    /api/todos/:id  -> 200 { id, title, done }   body: { done }\n" +
        "DELETE /api/todos/:id  -> 200/204\n" +
        "```\n\n" +
        "Fetch-on-mount reuses d6-t1's exact loading/error/ready shape. " +
        "Create reuses d4-t3's optimistic-add-then-reconcile-or-rollback " +
        "protocol unchanged. Toggle and delete are **new** — they apply " +
        "the *same* optimistic pattern to `PUT`/`DELETE`:\n\n" +
        "```jsx\n" +
        "useEffect(() => {\n" +
        '  fetch("/api/todos")\n' +
        "    .then((response) => {\n" +
        '      if (!response.ok) throw new Error("bad response");\n' +
        "      return response.json();\n" +
        "    })\n" +
        "    .then((data) => {\n" +
        "      setTodos(data);\n" +
        '      setStatus("ready");\n' +
        "    })\n" +
        "    .catch(() => setStatus(\"error\"));\n" +
        "}, []);\n\n" +
        "function handleToggle(id) {\n" +
        "  const previous = todos;\n" +
        "  const next = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));\n" +
        "  setTodos(next);\n\n" +
        "  const target = next.find((t) => t.id === id);\n" +
        "  fetch(`/api/todos/${id}`, {\n" +
        '    method: "PUT",\n' +
        '    headers: { "Content-Type": "application/json" },\n' +
        "    body: JSON.stringify({ done: target.done }),\n" +
        "  }).catch(() => {\n" +
        "    setTodos(previous); // roll back on failure\n" +
        "  });\n" +
        "}\n\n" +
        "function handleDelete(id) {\n" +
        "  const previous = todos;\n" +
        "  setTodos(todos.filter((t) => t.id !== id));\n\n" +
        '  fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
        "    setTodos(previous); // roll back on failure\n" +
        "  });\n" +
        "}\n" +
        "```\n\n" +
        "Notice the shape repeats across all three writes: **update local " +
        "state first** (the UI feels instant), **then** make the network " +
        "call, and **only touch state again on failure** (roll back to " +
        "what it was before the optimistic update) — success needs no " +
        "further action because the optimistic update already *is* the " +
        "correct end state. This is the same lesson as d4-t3, now applied " +
        "uniformly across create, toggle, and delete instead of just " +
        "create.\n\n" +
        "**Your job:** wire `useEffect` fetch-on-mount (d6-t1's shape), " +
        "`handleAdd` (d4-t3's optimistic-add + reconcile/rollback), " +
        "`handleToggle`, and `handleDelete` (both shown above) into " +
        "`App.jsx`, AND implement three pure helpers in `view.js` that " +
        "capture each mutation's optimistic-update logic so it's testable " +
        "without React or a network call:\n\n" +
        "- `applyOptimisticToggle(todos, id)` — returns a **new** array " +
        "  with the matching todo's `done` flipped (same shape as " +
        "  d5-t2's `toggleTodoDone`). Must not mutate the input.\n" +
        "- `applyOptimisticDelete(todos, id)` — returns a **new** array " +
        "  with the matching todo removed. Must not mutate the input.\n" +
        "- `rollbackOnFailure(previousTodos, latestTodos, requestFailed)` " +
        "  — returns `previousTodos` if `requestFailed` is `true` " +
        "  (undo the optimistic update), otherwise returns `latestTodos` " +
        "  unchanged (keep the optimistic update — the request succeeded).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  // TODO: add a useEffect (empty deps) that fetches /api/todos and\n" +
          '  // sets status to "ready" + todos to the data on success, or status\n' +
          '  // to "error" on failure/non-ok response (same shape as d6-t1).\n\n' +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          "    // TODO: optimistic add with a temp id via setTodos, clear input,\n" +
          '    // POST /api/todos, then reconcile (replace temp with real todo)\n' +
          "    // on success or roll back (filter out the temp todo) on failure.\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    // TODO: optimistic PUT — flip done locally via setTodos, then\n" +
          "    // PUT /api/todos/:id with { done }, rolling back to the previous\n" +
          "    // todos array on failure.\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    // TODO: optimistic DELETE — remove locally via setTodos, then\n" +
          "    // DELETE /api/todos/:id, rolling back to the previous todos array\n" +
          "    // on failure.\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <TodoList\n" +
          "        todos={todos}\n" +
          "        onToggleTodo={handleToggle}\n" +
          "        onDeleteTodo={handleDelete}\n" +
          "      />\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "// TODO: implement applyOptimisticToggle(todos, id) -> new array,\n" +
          "// matching todo's done flipped. Do not mutate input.\n" +
          "export function applyOptimisticToggle(todos, id) {\n" +
          "}\n\n" +
          "// TODO: implement applyOptimisticDelete(todos, id) -> new array,\n" +
          "// matching todo removed. Do not mutate input.\n" +
          "export function applyOptimisticDelete(todos, id) {\n" +
          "}\n\n" +
          "// TODO: implement rollbackOnFailure(previousTodos, latestTodos, requestFailed)\n" +
          "// -> previousTodos if requestFailed is true, otherwise latestTodos.\n" +
          "export function rollbackOnFailure(previousTodos, latestTodos, requestFailed) {\n" +
          "}\n",
      },
      hints: [
        "The fetch-on-mount `useEffect` is identical to d6-t1's — empty dependency array, sets `status` to `\"ready\"`/`\"error\"` from the same `.then()`/`.catch()` shape.",
        '`handleAdd` is d4-t3\'s `handleSubmit` unchanged in structure — optimistic push with a `"temp-"` id, POST, then reconcile via `.map()` or rollback via `.filter()`.',
        "For `handleToggle`/`handleDelete`, capture `const previous = todos;` **before** calling `setTodos` with the optimistic update — that's the value you roll back to if the request fails.",
        "`applyOptimisticToggle` and `applyOptimisticDelete` are one-liners: a `.map()` flipping `done` for the matching id, and a `.filter()` removing the matching id — same logic as d5-t2's `toggleTodoDone` and d7-t1's `deleteTodoLocally`, just named for their role in the mutation flow.",
        "`rollbackOnFailure` is a one-line ternary: `return requestFailed ? previousTodos : latestTodos;`.",
      ],
      hiddenTests: [
        {
          filename: "optimistic-mutations.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            "import {\n" +
            "  applyOptimisticToggle,\n" +
            "  applyOptimisticDelete,\n" +
            "  rollbackOnFailure,\n" +
            '} from "./view.js";\n\n' +
            'test("applyOptimisticToggle flips done for the matching id only", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ];\n" +
            "  const result = applyOptimisticToggle(todos, 1);\n" +
            "  expect(result).toEqual([\n" +
            '    { id: 1, title: "A", done: true },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ]);\n" +
            "});\n\n" +
            'test("applyOptimisticToggle does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            "  applyOptimisticToggle(todos, 1);\n" +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("applyOptimisticDelete removes exactly the matching todo", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ];\n" +
            "  const result = applyOptimisticDelete(todos, 2);\n" +
            '  expect(result).toEqual([{ id: 1, title: "A", done: false }]);\n' +
            "});\n\n" +
            'test("applyOptimisticDelete does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            "  applyOptimisticDelete(todos, 1);\n" +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("rollbackOnFailure returns previousTodos when the request failed", () => {\n' +
            '  const previous = [{ id: 1, title: "A", done: false }];\n' +
            '  const latest = [{ id: 1, title: "A", done: true }];\n' +
            "  expect(rollbackOnFailure(previous, latest, true)).toEqual(previous);\n" +
            "});\n\n" +
            'test("rollbackOnFailure returns latestTodos when the request succeeded", () => {\n' +
            '  const previous = [{ id: 1, title: "A", done: false }];\n' +
            '  const latest = [{ id: 1, title: "A", done: true }];\n' +
            "  expect(rollbackOnFailure(previous, latest, false)).toEqual(latest);\n" +
            "});\n",
        },
        {
          filename: "mutation-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx fetches /api/todos inside a useEffect with an empty deps array", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/import\\s*\\{[^}]*useEffect[^}]*\\}\\s*from\\s*["\']react["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            '  expect(/fetch\\(\\s*["\']\\/api\\/todos["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/useEffect\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?\\},\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("handleAdd POSTs to /api/todos with a JSON title body", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleAdd/.test(jsx)).toBe(true);\n" +
            '  expect(/method\\s*:\\s*["\']POST["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/JSON\\.stringify\\(\\s*\\{\\s*title/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("handleToggle PUTs to /api/todos/:id with a JSON done body", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleToggle/.test(jsx)).toBe(true);\n" +
            '  expect(/method\\s*:\\s*["\']PUT["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/JSON\\.stringify\\(\\s*\\{\\s*done/.test(jsx)).toBe(true);\n' +
            "  expect(/\\/api\\/todos\\/\\$\\{id\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("handleDelete DELETEs /api/todos/:id", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleDelete/.test(jsx)).toBe(true);\n" +
            '  expect(/method\\s*:\\s*["\']DELETE["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/\\/api\\/todos\\/\\$\\{id\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("handleToggle and handleDelete both roll back on failure via setTodos", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  const toggleBlock = jsx.slice(\n" +
            "    jsx.indexOf(\"function handleToggle\"),\n" +
            "    jsx.indexOf(\"function handleDelete\"),\n" +
            "  );\n" +
            "  const deleteBlock = jsx.slice(\n" +
            "    jsx.indexOf(\"function handleDelete\"),\n" +
            '    jsx.indexOf("if (status")\n' +
            "  );\n" +
            "  expect(/setTodos\\(\\s*previous\\s*\\)/.test(toggleBlock)).toBe(true);\n" +
            "  expect(/setTodos\\(\\s*previous\\s*\\)/.test(deleteBlock)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx has zero manual DOM operations even with full CRUD wired", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          "    fetch(`/api/todos/${id}`, { method: \"DELETE\" }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <TodoList\n" +
          "        todos={todos}\n" +
          "        onToggleTodo={handleToggle}\n" +
          "        onDeleteTodo={handleDelete}\n" +
          "      />\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "export function applyOptimisticToggle(todos, id) {\n" +
          "  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));\n" +
          "}\n\n" +
          "export function applyOptimisticDelete(todos, id) {\n" +
          "  return todos.filter((t) => t.id !== id);\n" +
          "}\n\n" +
          "export function rollbackOnFailure(previousTodos, latestTodos, requestFailed) {\n" +
          "  return requestFailed ? previousTodos : latestTodos;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm every mutation (create/toggle/delete) updates local state optimistically " +
        "before the network call resolves, that each targets the correct verb and URL " +
        "(POST /api/todos, PUT /api/todos/:id, DELETE /api/todos/:id), and that failure " +
        "handling rolls back to the pre-optimistic todos array rather than leaving the " +
        "UI in an inconsistent state relative to the server.",
    },

    // ------------------------------------------------------------------
    // d7-t3 — ship it: the polished, complete capstone app
    // ------------------------------------------------------------------
    {
      id: "d7-t3",
      title: "Ship it: empty state, error state, and full CRUD polished",
      description:
        "## Ship it: empty state, error state, and full CRUD polished\n\n" +
        "This is the capstone deliverable. Everything from d7-t1 and d7-t2 " +
        "already works — the composition tree is wired, all four CRUD " +
        "operations round-trip through `/api/todos`. What's missing is the " +
        "one state real apps always need and tutorials often skip: **what " +
        "does the user see when there's nothing to show?**\n\n" +
        "Add a fourth branch to the existing loading/error/ready split: an " +
        "**empty state**, shown only when the fetch succeeded (`status === " +
        '"ready"`) but the todos array is empty — distinct from `"loading"` ' +
        "(we don't know yet) and `\"error\"` (the fetch failed). Getting " +
        "this distinction right matters: a learner who deletes their last " +
        "todo should see \"Nothing to do yet — add your first todo above!\", " +
        "not a blank `<ul>` that looks broken:\n\n" +
        "```jsx\n" +
        '  if (status === "loading") {\n' +
        '    return <p className="todo-status">Loading…</p>;\n' +
        "  }\n\n" +
        '  if (status === "error") {\n' +
        '    return <p className="todo-status">Failed to load todos.</p>;\n' +
        "  }\n\n" +
        "  return (\n" +
        "    <>\n" +
        "      <form onSubmit={handleAdd}>{/* ... */}</form>\n" +
        "      {todos.length === 0 ? (\n" +
        '        <p className="todo-status">Nothing to do yet — add your first todo above!</p>\n' +
        "      ) : (\n" +
        "        <TodoList\n" +
        "          todos={todos}\n" +
        "          onToggleTodo={handleToggle}\n" +
        "          onDeleteTodo={handleDelete}\n" +
        "        />\n" +
        "      )}\n" +
        "    </>\n" +
        "  );\n" +
        "```\n\n" +
        "Notice the empty-state check happens **after** the loading/error " +
        "guards and **inside** the `\"ready\"` branch — it's a fourth, more " +
        "specific case of \"ready\", not a fifth top-level `status` value. " +
        "`status` still only ever holds `\"loading\"`, `\"error\"`, or " +
        '`"ready"`; whether the ready view shows the list or the empty ' +
        "message is a **derived** decision based on `todos.length`, not " +
        "new state to track.\n\n" +
        "Everything else about the app must keep working exactly as " +
        "d7-t1/d7-t2 left it: fetch-on-mount, optimistic create/toggle/" +
        "delete with rollback-on-failure, and the App -> TodoList -> " +
        "TodoItem composition tree — this task only adds the missing " +
        "fourth view, it doesn't change any of the CRUD wiring.\n\n" +
        "**Your job:** add the empty-state branch to `App.jsx` exactly as " +
        "shown above (rendered only when `status === \"ready\"` **and** " +
        "`todos.length === 0`, with the form still rendered above it so " +
        "the learner can immediately add a todo), keeping every existing " +
        "CRUD handler from d7-t2 intact, AND implement the pure helper " +
        "`deriveViewState(status, todos)` in `view.js` — given the current " +
        '`status` string and the `todos` array, returns exactly one of ' +
        '`"loading"`, `"error"`, `"empty"`, or `"list"`:\n\n' +
        '- `"loading"` when `status === "loading"`\n' +
        '- `"error"` when `status === "error"`\n' +
        '- `"empty"` when `status === "ready"` and `todos.length === 0`\n' +
        '- `"list"` when `status === "ready"` and `todos.length > 0`',
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          "    fetch(`/api/todos/${id}`, { method: \"DELETE\" }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  // TODO: this is the \"ready\" branch. Render the add-form, then EITHER\n" +
          "  // the empty-state message (todos.length === 0) OR the <TodoList>\n" +
          "  // (todos.length > 0) — not both, not neither.\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <TodoList\n" +
          "        todos={todos}\n" +
          "        onToggleTodo={handleToggle}\n" +
          "        onDeleteTodo={handleDelete}\n" +
          "      />\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "// TODO: implement deriveViewState(status, todos) -> one of\n" +
          '// "loading" | "error" | "empty" | "list", per the rules in the task description.\n' +
          "export function deriveViewState(status, todos) {\n" +
          "}\n",
      },
      hints: [
        'The empty-state check is `todos.length === 0`, and it only applies inside the "ready" branch — `status` itself never becomes `"empty"`, that would be a fifth status value duplicating information `todos.length` already tells you.',
        "Keep the `<form>` rendered above both the empty-state message and the `<TodoList>` — a learner looking at an empty list still needs the add-form visible to add their first todo, that's the whole point of the empty state.",
        '`deriveViewState` should check `status` for `"loading"`/`"error"` first (same order as the JSX\'s early returns), and only look at `todos.length` once `status === "ready"`.',
        "Don't touch `handleAdd`/`handleToggle`/`handleDelete`/the fetch-on-mount `useEffect` — this task only adds the empty-state branch to the final return; every CRUD handler from d7-t2 stays exactly as it was.",
      ],
      hiddenTests: [
        {
          filename: "view-state.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { deriveViewState } from "./view.js";\n\n' +
            'test(\'deriveViewState returns "loading" when status is loading\', () => {\n' +
            '  expect(deriveViewState("loading", [])).toBe("loading");\n' +
            '  expect(deriveViewState("loading", [{ id: 1, title: "A", done: false }])).toBe(\n' +
            '    "loading",\n' +
            "  );\n" +
            "});\n\n" +
            'test(\'deriveViewState returns "error" when status is error\', () => {\n' +
            '  expect(deriveViewState("error", [])).toBe("error");\n' +
            "});\n\n" +
            'test(\'deriveViewState returns "empty" when ready with zero todos\', () => {\n' +
            '  expect(deriveViewState("ready", [])).toBe("empty");\n' +
            "});\n\n" +
            'test(\'deriveViewState returns "list" when ready with at least one todo\', () => {\n' +
            '  expect(deriveViewState("ready", [{ id: 1, title: "A", done: false }])).toBe(\n' +
            '    "list",\n' +
            "  );\n" +
            "});\n\n" +
            'test("deriveViewState prioritizes loading/error over todos.length", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ];\n" +
            '  expect(deriveViewState("loading", todos)).toBe("loading");\n' +
            '  expect(deriveViewState("error", todos)).toBe("error");\n' +
            "});\n",
        },
        {
          filename: "ship-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx renders an empty-state message gated on todos.length === 0", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/todos\\.length\\s*===\\s*0/.test(jsx)).toBe(true);\n" +
            '  expect(/Nothing to do yet/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx still renders TodoList for the non-empty ready case", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/<TodoList/.test(jsx)).toBe(true);\n" +
            "  expect(/todos=\\{todos\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx still guards loading and error before reaching the ready branch", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/status === ["\']loading["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/status === ["\']error["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/Loading…/.test(jsx)).toBe(true);\n" +
            '  expect(/Failed to load todos\\./.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx still renders the add-form ahead of the empty/list branch", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/onSubmit=\\{handleAdd\\}/.test(jsx)).toBe(true);\n" +
            "  const formIndex = jsx.indexOf(\"onSubmit={handleAdd}\");\n" +
            '  const emptyIndex = jsx.indexOf("Nothing to do yet");\n' +
            "  expect(formIndex).toBeGreaterThan(-1);\n" +
            "  expect(emptyIndex).toBeGreaterThan(-1);\n" +
            "  expect(formIndex).toBeLessThan(emptyIndex);\n" +
            "});\n\n" +
            'test("App.jsx retains all three CRUD handlers from d7-t2, unmodified in name", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleAdd/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleToggle/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleDelete/.test(jsx)).toBe(true);\n" +
            '  expect(/method\\s*:\\s*["\']POST["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/method\\s*:\\s*["\']PUT["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/method\\s*:\\s*["\']DELETE["\']/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx has zero manual DOM operations in the finished, shipped app", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          "    fetch(`/api/todos/${id}`, { method: \"DELETE\" }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={todos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "export function deriveViewState(status, todos) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return todos.length === 0 ? "empty" : "list";\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm the finished app cleanly reaches all four view states (loading, error, " +
        "empty, list) purely from status + todos.length with no new status values " +
        "introduced, that the add-form remains visible in the empty state so a learner " +
        "can immediately add their first todo, and that every CRUD handler from d7-t2 " +
        "(create/toggle/delete, each optimistic with rollback-on-failure) is untouched " +
        "and still correct — this is the shippable, capstone version of the app.",
    },

    // ------------------------------------------------------------------
    // d7-t4 — filtering + derived state (All/Active/Completed, item count)
    // ------------------------------------------------------------------
    {
      id: "d7-t4",
      title: "Filter the list and derive a remaining-items count",
      description:
        "## Filter the list and derive a remaining-items count\n\n" +
        "d7-t3 shipped a working app, but every real to-do list needs a way " +
        "to focus on what's left to do. Add an **All / Active / Completed** " +
        "filter above the list, plus a small \"N items left\" summary — " +
        "both driven by data that already exists.\n\n" +
        "The important design decision: the filter needs exactly **one** " +
        "new piece of state, the currently selected filter value. The " +
        "*filtered list itself* is never stored in state — it's **derived** " +
        "on every render from `todos` + `filter`, the same discipline as " +
        "d7-t3's `deriveViewState`. If you catch yourself writing " +
        '`useState` for "visibleTodos", stop — that\'s a bug waiting to ' +
        "happen (the filtered copy would drift out of sync with `todos` " +
        "the moment a toggle/delete/add happens elsewhere).\n\n" +
        "```jsx\n" +
        'function App() {\n' +
        '  const [filter, setFilter] = useState("all"); // "all" | "active" | "completed"\n' +
        "  // ...existing status/todos/input state from d7-t1..t3, unchanged\n\n" +
        "  const visibleTodos = filterTodos(todos, filter);\n" +
        "  const remainingCount = countRemaining(todos);\n\n" +
        "  return (\n" +
        "    <>\n" +
        "      {/* ...existing form... */}\n" +
        '      <div className="todo-filters">\n' +
        '        <button onClick={() => setFilter("all")}>All</button>\n' +
        '        <button onClick={() => setFilter("active")}>Active</button>\n' +
        '        <button onClick={() => setFilter("completed")}>Completed</button>\n' +
        "      </div>\n" +
        '      <p className="todo-count">{remainingCount} items left</p>\n' +
        "      <TodoList todos={visibleTodos} onToggleTodo={handleToggle} onDeleteTodo={handleDelete} />\n" +
        "    </>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "Notice `TodoList` still receives a plain `todos` prop — it has no " +
        "idea filtering exists, it just renders whatever array it's handed. " +
        "Filtering is entirely `App`'s concern, computed fresh every render.\n\n" +
        "**Your job:** add the `filter` state and the three filter buttons " +
        "to `App.jsx`, render `<TodoList>` with the **filtered** list " +
        "(not raw `todos`), render the `{remainingCount} items left` " +
        "summary, and implement two pure helpers in `view.js`:\n\n" +
        '- `filterTodos(todos, filter)` — returns a **new** array: all ' +
        'todos when `filter === "all"`, only `done === false` todos when ' +
        '`filter === "active"`, only `done === true` todos when ' +
        '`filter === "completed"`. Must not mutate the input.\n' +
        "- `countRemaining(todos)` — returns the number of todos whose " +
        "`done` is `false` (works against the **full**, unfiltered list, " +
        "so the count doesn't change just because the filter view changes).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n' +
          "  // TODO: add filter state, initialized to \"all\".\n\n" +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  // TODO: compute visibleTodos via filterTodos(todos, filter) and\n" +
          "  // remainingCount via countRemaining(todos). Render the filter\n" +
          "  // buttons (All/Active/Completed, each calling setFilter), the\n" +
          '  // "{remainingCount} items left" summary, and pass visibleTodos\n' +
          "  // (not raw todos) to <TodoList>.\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={todos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "// TODO: implement filterTodos(todos, filter) -> new array filtered by\n" +
          '// "all" | "active" | "completed". Do not mutate input.\n' +
          "export function filterTodos(todos, filter) {\n" +
          "}\n\n" +
          "// TODO: implement countRemaining(todos) -> number of todos where\n" +
          "// done is false.\n" +
          "export function countRemaining(todos) {\n" +
          "}\n",
      },
      hints: [
        '`filterTodos` is a `.filter()` with a small switch/if on the `filter` string: return the array unchanged (a copy) for "all", `.filter((t) => !t.done)` for "active", `.filter((t) => t.done)` for "completed".',
        "`countRemaining` is `todos.filter((t) => !t.done).length` — one line, and it always looks at the **full** `todos` array, never the filtered view.",
        "Keep `filter` as its own `useState` — don't derive it from anything, it's genuine user input (which button they clicked). What's *derived* is the visible list and the count, not the filter selection itself.",
        "`<TodoList>` keeps the exact same props it already had (`todos`, `onToggleTodo`, `onDeleteTodo`) — only the *value* passed as `todos` changes, from `todos` to `visibleTodos`. `TodoList`/`TodoItem` don't need any changes at all.",
      ],
      hiddenTests: [
        {
          filename: "filter-helpers.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { filterTodos, countRemaining } from "./view.js";\n\n' +
            "const sample = [\n" +
            '  { id: 1, title: "A", done: false },\n' +
            '  { id: 2, title: "B", done: true },\n' +
            '  { id: 3, title: "C", done: false },\n' +
            "];\n\n" +
            'test(\'filterTodos returns every todo for "all"\', () => {\n' +
            '  expect(filterTodos(sample, "all")).toEqual(sample);\n' +
            "});\n\n" +
            'test(\'filterTodos returns only not-done todos for "active"\', () => {\n' +
            '  const result = filterTodos(sample, "active");\n' +
            "  expect(result).toEqual([\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 3, title: "C", done: false },\n' +
            "  ]);\n" +
            "});\n\n" +
            'test(\'filterTodos returns only done todos for "completed"\', () => {\n' +
            '  const result = filterTodos(sample, "completed");\n' +
            '  expect(result).toEqual([{ id: 2, title: "B", done: true }]);\n' +
            "});\n\n" +
            'test("filterTodos does not mutate the original array", () => {\n' +
            "  const original = JSON.parse(JSON.stringify(sample));\n" +
            '  filterTodos(sample, "active");\n' +
            "  expect(sample).toEqual(original);\n" +
            "});\n\n" +
            'test("countRemaining counts only not-done todos, ignoring filter concerns", () => {\n' +
            "  expect(countRemaining(sample)).toBe(2);\n" +
            "  expect(countRemaining([])).toBe(0);\n" +
            '  expect(countRemaining([{ id: 1, title: "X", done: true }])).toBe(0);\n' +
            "});\n",
        },
        {
          filename: "filter-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx has filter state initialized to \\"all\\"", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/useState\\(\\s*["\']all["\']\\s*\\)/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx renders All/Active/Completed filter buttons", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/>All</.test(jsx)).toBe(true);\n" +
            "  expect(/>Active</.test(jsx)).toBe(true);\n" +
            "  expect(/>Completed</.test(jsx)).toBe(true);\n" +
            '  expect(/setFilter\\(/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx passes a filtered list (not raw todos) into TodoList", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/filterTodos\\(/.test(jsx)).toBe(true);\n' +
            "  expect(/<TodoList[\\s\\S]*?todos=\\{visibleTodos\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx renders a remaining-items count derived from countRemaining", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/countRemaining\\(/.test(jsx)).toBe(true);\n' +
            "  expect(/items left/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx does not stash the filtered list in its own useState", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/useState\\(\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n' +
            "  const visibleTodosStateDeclared =\n" +
            '    /const\\s*\\[\\s*visibleTodos\\s*,\\s*setVisibleTodos\\s*\\]\\s*=\\s*useState/.test(\n' +
            "      jsx,\n" +
            "    );\n" +
            "  expect(visibleTodosStateDeclared).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n' +
          'import { filterTodos, countRemaining } from "./view.js";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n' +
          '  const [filter, setFilter] = useState("all");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  const visibleTodos = filterTodos(todos, filter);\n" +
          "  const remainingCount = countRemaining(todos);\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          '      <div className="todo-filters">\n' +
          '        <button onClick={() => setFilter("all")}>All</button>\n' +
          '        <button onClick={() => setFilter("active")}>Active</button>\n' +
          '        <button onClick={() => setFilter("completed")}>Completed</button>\n' +
          "      </div>\n" +
          '      <p className="todo-count">{remainingCount} items left</p>\n' +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={visibleTodos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "export function filterTodos(todos, filter) {\n" +
          '  if (filter === "active") return todos.filter((t) => !t.done);\n' +
          '  if (filter === "completed") return todos.filter((t) => t.done);\n' +
          "  return [...todos];\n" +
          "}\n\n" +
          "export function countRemaining(todos) {\n" +
          "  return todos.filter((t) => !t.done).length;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm exactly one new piece of state (`filter`) was introduced, that the " +
        "visible list and remaining count are both computed fresh on every render from " +
        "`todos` + `filter` rather than stored separately, and that `TodoList`/`TodoItem` " +
        "required no changes — filtering is entirely a derived-data concern owned by `App`.",
    },

    // ------------------------------------------------------------------
    // d7-t5 — optimistic rename (the fourth CRUD write, with validation)
    // ------------------------------------------------------------------
    {
      id: "d7-t5",
      title: "Add optimistic rename with validation",
      description:
        "## Add optimistic rename with validation\n\n" +
        "Three writes down (create/toggle/delete), one to go: **renaming** a " +
        "todo's title in place. It follows the exact same optimistic-update-" +
        "then-reconcile-or-rollback shape as every other mutation in this " +
        "course — update local state first, `PUT` in the background, roll " +
        "back only on failure — with one addition real apps need: **reject " +
        "an empty rename** instead of optimistically saving blank text.\n\n" +
        "`TodoItem` grows an edit affordance. Clicking \"Rename\" prompts for " +
        "a new title (any input mechanism is fine — a `prompt()` call keeps " +
        "this task focused on the state/network logic, not building a new " +
        "inline-edit UI) and calls `onRename(todo.id, newTitle)`:\n\n" +
        "```jsx\n" +
        "function TodoItem({ todo, onToggle, onDelete, onRename }) {\n" +
        "  function handleRenameClick() {\n" +
        '    const next = window.prompt("Rename todo", todo.title);\n' +
        "    if (next === null) return; // user cancelled\n" +
        "    onRename(todo.id, next);\n" +
        "  }\n\n" +
        "  return (\n" +
        '    <li className="todo-item">\n' +
        "      {/* ...existing checkbox... */}\n" +
        "      {todo.title}\n" +
        "      <button onClick={handleRenameClick}>Rename</button>\n" +
        "      {/* ...existing delete button... */}\n" +
        "    </li>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "`App.handleRename` mirrors `handleToggle` exactly, but **validates " +
        "first** — an empty/whitespace-only new title is rejected before any " +
        "state update or network call happens at all (no optimistic update, " +
        "no rollback needed, because nothing was ever applied):\n\n" +
        "```jsx\n" +
        "function handleRename(id, newTitle) {\n" +
        "  const trimmed = newTitle.trim();\n" +
        "  if (!trimmed) return; // reject blank renames outright\n\n" +
        "  const previous = todos;\n" +
        "  const next = todos.map((t) => (t.id === id ? { ...t, title: trimmed } : t));\n" +
        "  setTodos(next);\n\n" +
        "  fetch(`/api/todos/${id}`, {\n" +
        '    method: "PUT",\n' +
        '    headers: { "Content-Type": "application/json" },\n' +
        "    body: JSON.stringify({ title: trimmed }),\n" +
        "  }).catch(() => {\n" +
        "    setTodos(previous);\n" +
        "  });\n" +
        "}\n" +
        "```\n\n" +
        "**Your job:** add `onRename`/`handleRenameClick` to `TodoItem.jsx` " +
        "(threaded through `TodoList.jsx` exactly like `onToggle`/`onDelete` " +
        "already are), add `handleRename` to `App.jsx` and wire it into " +
        "`<TodoList onRenameTodo={handleRename} />`, AND implement two pure " +
        "helpers in `view.js`:\n\n" +
        "- `normalizeRename(newTitle)` — trims `newTitle` and returns " +
        '`{ valid: false }` if the trimmed result is empty, otherwise ' +
        '`{ valid: true, title: <trimmed> }`.\n' +
        "- `applyOptimisticRename(todos, id, title)` — returns a **new** " +
        "array with the matching todo's `title` replaced by the given " +
        "(already-validated/trimmed) `title`. Must not mutate the input.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "// TODO: accept an `onRename` prop. Add a \"Rename\" <button> that\n" +
          '// prompts for a new title via window.prompt("Rename todo", todo.title)\n' +
          "// and calls onRename(todo.id, next) if the user didn't cancel (next !== null).\n" +
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "TodoList.jsx":
          "// TODO: accept an `onRenameTodo` prop and forward it to each TodoItem\n" +
          "// as its `onRename` prop, alongside the existing onToggleTodo/onDeleteTodo.\n" +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  // TODO: add handleRename(id, newTitle) — validate via\n" +
          "  // normalizeRename(newTitle), return early if invalid, else optimistic\n" +
          '  // PUT /api/todos/:id with { title }, rolling back to the previous\n' +
          "  // todos array on failure (same pattern as handleToggle/handleDelete).\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={todos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "          onRenameTodo={() => {}}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "// TODO: implement normalizeRename(newTitle) -> { valid: false } if the\n" +
          "// trimmed title is empty, else { valid: true, title: <trimmed> }.\n" +
          "export function normalizeRename(newTitle) {\n" +
          "}\n\n" +
          "// TODO: implement applyOptimisticRename(todos, id, title) -> new array,\n" +
          "// matching todo's title replaced. Do not mutate input.\n" +
          "export function applyOptimisticRename(todos, id, title) {\n" +
          "}\n",
      },
      hints: [
        "`normalizeRename` is two lines: trim the input, then return `{ valid: false }` if the trimmed string's length is 0, otherwise `{ valid: true, title: trimmed }`.",
        "`applyOptimisticRename` is a one-line `.map()`, same shape as `applyOptimisticToggle` from d7-t2 but replacing `title` instead of flipping `done`.",
        "`handleRename` should call `normalizeRename` **before** touching `setTodos` at all — an invalid rename does nothing (no optimistic update, no rollback, no network call).",
        "Thread `onRename`/`onRenameTodo` through `TodoItem`/`TodoList` exactly like `onDelete`/`onDeleteTodo` already were threaded in d7-t1 — same shape, new name, one more prop at each layer.",
        '`window.prompt(...)` returns `null` when the user cancels the dialog — `handleRenameClick` must check for that and skip calling `onRename` entirely in that case, so cancelling never sends an empty rename.',
      ],
      hiddenTests: [
        {
          filename: "rename-helpers.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { normalizeRename, applyOptimisticRename } from "./view.js";\n\n' +
            'test("normalizeRename trims whitespace and reports valid: true for non-empty input", () => {\n' +
            '  expect(normalizeRename("  Buy milk  ")).toEqual({ valid: true, title: "Buy milk" });\n' +
            "});\n\n" +
            'test("normalizeRename reports valid: false for an empty string", () => {\n' +
            '  expect(normalizeRename("").valid).toBe(false);\n' +
            "});\n\n" +
            'test("normalizeRename reports valid: false for a whitespace-only string", () => {\n' +
            '  expect(normalizeRename("   ").valid).toBe(false);\n' +
            "});\n\n" +
            'test("applyOptimisticRename replaces only the matching todo\'s title", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "Old", done: false },\n' +
            '    { id: 2, title: "Other", done: true },\n' +
            "  ];\n" +
            '  const result = applyOptimisticRename(todos, 1, "New");\n' +
            "  expect(result).toEqual([\n" +
            '    { id: 1, title: "New", done: false },\n' +
            '    { id: 2, title: "Other", done: true },\n' +
            "  ]);\n" +
            "});\n\n" +
            'test("applyOptimisticRename does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "Old", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            '  applyOptimisticRename(todos, 1, "New");\n' +
            "  expect(todos).toEqual(original);\n" +
            "});\n",
        },
        {
          filename: "rename-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoItem.jsx accepts onRename and prompts for a new title", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/onRename/.test(jsx)).toBe(true);\n" +
            '  expect(/window\\.prompt\\(/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("TodoItem.jsx calls onRename(todo.id, ...) and guards against a null prompt result", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/onRename\\(\\s*todo\\.id\\s*,/.test(jsx)).toBe(true);\n" +
            "  expect(/=== null/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoList.jsx forwards onRenameTodo to TodoItem\'s onRename prop", async () => {\n' +
            '  const jsx = await Bun.file("TodoList.jsx").text();\n' +
            "  expect(/onRename=\\{onRenameTodo\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx defines handleRename and validates before mutating state", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleRename/.test(jsx)).toBe(true);\n" +
            '  expect(/normalizeRename\\(/.test(jsx)).toBe(true);\n' +
            "  const renameBlock = jsx.slice(\n" +
            '    jsx.indexOf("function handleRename"),\n' +
            '    jsx.indexOf("if (status"),\n' +
            "  );\n" +
            '  expect(/valid/.test(renameBlock)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx PUTs the renamed title to /api/todos/:id and rolls back on failure", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  const renameBlock = jsx.slice(\n" +
            '    jsx.indexOf("function handleRename"),\n' +
            '    jsx.indexOf("if (status"),\n' +
            "  );\n" +
            '  expect(/method\\s*:\\s*["\']PUT["\']/.test(renameBlock)).toBe(true);\n' +
            '  expect(/JSON\\.stringify\\(\\s*\\{\\s*title/.test(renameBlock)).toBe(true);\n' +
            "  expect(/setTodos\\(\\s*previous\\s*\\)/.test(renameBlock)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx wires handleRename into TodoList as onRenameTodo", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/onRenameTodo=\\{handleRename\\}/.test(jsx)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete, onRename }) {\n" +
          "  function handleRenameClick() {\n" +
          '    const next = window.prompt("Rename todo", todo.title);\n' +
          "    if (next === null) return;\n" +
          "    onRename(todo.id, next);\n" +
          "  }\n\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          "      <button onClick={handleRenameClick}>Rename</button>\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo, onRenameTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "          onRename={onRenameTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n' +
          'import { normalizeRename } from "./view.js";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleRename(id, newTitle) {\n" +
          "    const result = normalizeRename(newTitle);\n" +
          "    if (!result.valid) return;\n\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, title: result.title } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: result.title }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={todos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "          onRenameTodo={handleRename}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function normalizeRename(newTitle) {\n" +
          "  const trimmed = newTitle.trim();\n" +
          '  if (trimmed.length === 0) return { valid: false };\n' +
          "  return { valid: true, title: trimmed };\n" +
          "}\n\n" +
          "export function applyOptimisticRename(todos, id, title) {\n" +
          "  return todos.map((t) => (t.id === id ? { ...t, title } : t));\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm handleRename validates via normalizeRename BEFORE any state mutation or " +
        "network call (an empty/whitespace rename does nothing at all, not even an optimistic " +
        "update that then rolls back), that a valid rename follows the same optimistic-PUT-" +
        "then-rollback-on-failure shape as handleToggle/handleDelete, and that onRename/" +
        "onRenameTodo thread through TodoItem/TodoList the same way onDelete/onDeleteTodo did.",
    },

    // ------------------------------------------------------------------
    // d7-t6 — ship it (v2): bulk "clear completed" + filter/count, final polish
    // ------------------------------------------------------------------
    {
      id: "d7-t6",
      title: "Ship it (v2): bulk-clear completed todos, filter and count wired together",
      description:
        "## Ship it (v2): bulk-clear completed todos, filter and count wired together\n\n" +
        "This is the final capstone task. d7-t4 added filtering + a remaining-" +
        "count, d7-t5 added rename. The last piece a finished to-do app needs " +
        "is a **bulk action**: \"Clear completed\" — delete every `done: true` " +
        "todo in one click, applying the *same* optimistic-update-then-" +
        "rollback protocol used everywhere else in this course, just acting " +
        "on multiple todos in a single optimistic update instead of one.\n\n" +
        "```jsx\n" +
        "function handleClearCompleted() {\n" +
        "  const previous = todos;\n" +
        "  const cleared = todos.filter((t) => t.done);\n" +
        "  const next = todos.filter((t) => !t.done);\n" +
        "  setTodos(next);\n\n" +
        "  Promise.all(\n" +
        '    cleared.map((t) => fetch(`/api/todos/${t.id}`, { method: "DELETE" })),\n' +
        "  ).catch(() => {\n" +
        "    setTodos(previous); // roll back the whole batch on any failure\n" +
        "  });\n" +
        "}\n" +
        "```\n\n" +
        "Render the button only when there's something to clear (no point " +
        "showing \"Clear completed\" against an all-active list), right " +
        "alongside d7-t4's filter buttons and remaining-count:\n\n" +
        "```jsx\n" +
        '<div className="todo-filters">\n' +
        '  <button onClick={() => setFilter("all")}>All</button>\n' +
        '  <button onClick={() => setFilter("active")}>Active</button>\n' +
        '  <button onClick={() => setFilter("completed")}>Completed</button>\n' +
        "  {hasCompleted && (\n" +
        "    <button onClick={handleClearCompleted}>Clear completed</button>\n" +
        "  )}\n" +
        "</div>\n" +
        '<p className="todo-count">{remainingCount} items left</p>\n' +
        "```\n\n" +
        "Everything from d7-t1 through d7-t5 keeps working exactly as it was " +
        "— the composition tree, fetch-on-mount, create/toggle/delete/rename " +
        "all optimistic with rollback, the empty state, and the All/Active/" +
        "Completed filter with its derived count. This task adds the last " +
        "missing action and nothing else — the true \"ship it\" version of " +
        "the capstone.\n\n" +
        "**Your job:** add `handleClearCompleted` to `App.jsx` and render the " +
        "conditional \"Clear completed\" button next to the existing filter " +
        "buttons (gated on there being at least one completed todo), AND " +
        "implement two pure helpers in `view.js`:\n\n" +
        "- `hasCompletedTodos(todos)` — returns `true` if at least one todo " +
        "has `done === true`, otherwise `false`.\n" +
        "- `clearCompleted(todos)` — returns a **new** array containing only " +
        "the todos where `done === false` (i.e. every completed todo " +
        "removed). Must not mutate the input.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n' +
          'import { filterTodos, countRemaining } from "./view.js";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n' +
          '  const [filter, setFilter] = useState("all");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  // TODO: add handleClearCompleted() — optimistically remove every\n" +
          "  // done: true todo via setTodos, DELETE each cleared todo's id via\n" +
          "  // Promise.all, rolling back to the previous todos array on any failure.\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  const visibleTodos = filterTodos(todos, filter);\n" +
          "  const remainingCount = countRemaining(todos);\n" +
          "  // TODO: compute hasCompleted via hasCompletedTodos(todos) and use it\n" +
          '  // to conditionally render a "Clear completed" button next to the\n' +
          "  // existing filter buttons.\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          '      <div className="todo-filters">\n' +
          '        <button onClick={() => setFilter("all")}>All</button>\n' +
          '        <button onClick={() => setFilter("active")}>Active</button>\n' +
          '        <button onClick={() => setFilter("completed")}>Completed</button>\n' +
          "      </div>\n" +
          '      <p className="todo-count">{remainingCount} items left</p>\n' +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={visibleTodos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "export function filterTodos(todos, filter) {\n" +
          '  if (filter === "active") return todos.filter((t) => !t.done);\n' +
          '  if (filter === "completed") return todos.filter((t) => t.done);\n' +
          "  return [...todos];\n" +
          "}\n\n" +
          "export function countRemaining(todos) {\n" +
          "  return todos.filter((t) => !t.done).length;\n" +
          "}\n\n" +
          "// TODO: implement hasCompletedTodos(todos) -> true if at least one\n" +
          "// todo has done === true.\n" +
          "export function hasCompletedTodos(todos) {\n" +
          "}\n\n" +
          "// TODO: implement clearCompleted(todos) -> new array with every\n" +
          "// done === true todo removed. Do not mutate input.\n" +
          "export function clearCompleted(todos) {\n" +
          "}\n",
      },
      hints: [
        "`hasCompletedTodos` is `todos.some((t) => t.done)` — one line.",
        "`clearCompleted` is `todos.filter((t) => !t.done)` — the same filter d7-t4's `countRemaining` uses internally, just returning the array instead of a count.",
        "`handleClearCompleted` captures `previous = todos` and the list of `cleared` todos (the ones about to be removed) **before** calling `setTodos`, so it can both roll back state and know which ids to `DELETE` on the server.",
        "`Promise.all([...]).catch(...)` rolls back once if **any** of the batched `DELETE` requests fails — same all-or-nothing rollback semantics as a single mutation, just covering a batch.",
        'Gate the "Clear completed" button on `hasCompletedTodos(todos)` (the **full** list, not the filtered `visibleTodos`) so it appears/disappears correctly regardless of which filter tab is currently selected.',
      ],
      hiddenTests: [
        {
          filename: "clear-completed-helpers.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { hasCompletedTodos, clearCompleted } from "./view.js";\n\n' +
            'test("hasCompletedTodos returns true when at least one todo is done", () => {\n' +
            "  expect(\n" +
            "    hasCompletedTodos([\n" +
            '      { id: 1, title: "A", done: false },\n' +
            '      { id: 2, title: "B", done: true },\n' +
            "    ]),\n" +
            "  ).toBe(true);\n" +
            "});\n\n" +
            'test("hasCompletedTodos returns false when no todos are done", () => {\n' +
            '  expect(hasCompletedTodos([{ id: 1, title: "A", done: false }])).toBe(false);\n' +
            "  expect(hasCompletedTodos([])).toBe(false);\n" +
            "});\n\n" +
            'test("clearCompleted removes every done todo, keeping active ones", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            '    { id: 3, title: "C", done: true },\n' +
            "  ];\n" +
            "  const result = clearCompleted(todos);\n" +
            '  expect(result).toEqual([{ id: 1, title: "A", done: false }]);\n' +
            "});\n\n" +
            'test("clearCompleted does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: true }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            "  clearCompleted(todos);\n" +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("clearCompleted returns an equivalent array when nothing is completed", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  expect(clearCompleted(todos)).toEqual(todos);\n" +
            "});\n",
        },
        {
          filename: "ship-v2-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx defines handleClearCompleted using Promise.all for the batch DELETE", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleClearCompleted/.test(jsx)).toBe(true);\n" +
            '  expect(/Promise\\.all\\(/.test(jsx)).toBe(true);\n' +
            '  expect(/method\\s*:\\s*["\']DELETE["\']/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("handleClearCompleted rolls back to the previous todos array on failure", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  const block = jsx.slice(\n" +
            '    jsx.indexOf("function handleClearCompleted"),\n' +
            '    jsx.indexOf("if (status"),\n' +
            "  );\n" +
            "  expect(/setTodos\\(\\s*previous\\s*\\)/.test(block)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx conditionally renders a Clear completed button based on hasCompletedTodos", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/hasCompletedTodos\\(/.test(jsx)).toBe(true);\n' +
            "  expect(/Clear completed/.test(jsx)).toBe(true);\n" +
            "  expect(/onClick=\\{handleClearCompleted\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx still has the d7-t4 filter buttons and remaining count intact", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/>All</.test(jsx)).toBe(true);\n" +
            "  expect(/>Active</.test(jsx)).toBe(true);\n" +
            "  expect(/>Completed</.test(jsx)).toBe(true);\n" +
            '  expect(/countRemaining\\(/.test(jsx)).toBe(true);\n' +
            "  expect(/items left/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx retains all prior CRUD handlers (add/toggle/delete) unmodified in name", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleAdd/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleToggle/.test(jsx)).toBe(true);\n" +
            "  expect(/function handleDelete/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx has zero manual DOM operations in the final shipped app", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day7-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n' +
          'import TodoList from "./TodoList.jsx";\n' +
          'import { filterTodos, countRemaining, hasCompletedTodos } from "./view.js";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [input, setInput] = useState("");\n' +
          '  const [filter, setFilter] = useState("all");\n\n' +
          "  useEffect(() => {\n" +
          '    fetch("/api/todos")\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch(() => {\n" +
          '        setStatus("error");\n' +
          "      });\n" +
          "  }, []);\n\n" +
          "  function handleAdd(event) {\n" +
          "    event.preventDefault();\n" +
          "    const value = input.trim();\n" +
          "    if (!value) return;\n\n" +
          '    const tempId = "temp-" + Date.now();\n' +
          "    setTodos((current) => [\n" +
          "      ...current,\n" +
          "      { id: tempId, title: value, done: false },\n" +
          "    ]);\n" +
          '    setInput("");\n\n' +
          '    fetch("/api/todos", {\n' +
          '      method: "POST",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ title: value }),\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((realTodo) => {\n" +
          "        setTodos((current) =>\n" +
          "          current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
          "        );\n" +
          "      })\n" +
          "      .catch(() => {\n" +
          "        setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
          "      });\n" +
          "  }\n\n" +
          "  function handleToggle(id) {\n" +
          "    const previous = todos;\n" +
          "    const next = todos.map((t) =>\n" +
          "      t.id === id ? { ...t, done: !t.done } : t,\n" +
          "    );\n" +
          "    setTodos(next);\n\n" +
          "    const target = next.find((t) => t.id === id);\n" +
          "    fetch(`/api/todos/${id}`, {\n" +
          '      method: "PUT",\n' +
          '      headers: { "Content-Type": "application/json" },\n' +
          "      body: JSON.stringify({ done: target.done }),\n" +
          "    }).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleDelete(id) {\n" +
          "    const previous = todos;\n" +
          "    setTodos(todos.filter((t) => t.id !== id));\n\n" +
          '    fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {\n' +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          "  function handleClearCompleted() {\n" +
          "    const previous = todos;\n" +
          "    const cleared = todos.filter((t) => t.done);\n" +
          "    const next = todos.filter((t) => !t.done);\n" +
          "    setTodos(next);\n\n" +
          "    Promise.all(\n" +
          "      cleared.map((t) =>\n" +
          '        fetch(`/api/todos/${t.id}`, { method: "DELETE" }),\n' +
          "      ),\n" +
          "    ).catch(() => {\n" +
          "      setTodos(previous);\n" +
          "    });\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  const visibleTodos = filterTodos(todos, filter);\n" +
          "  const remainingCount = countRemaining(todos);\n" +
          "  const hasCompleted = hasCompletedTodos(todos);\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleAdd}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          '      <div className="todo-filters">\n' +
          '        <button onClick={() => setFilter("all")}>All</button>\n' +
          '        <button onClick={() => setFilter("active")}>Active</button>\n' +
          '        <button onClick={() => setFilter("completed")}>Completed</button>\n' +
          "        {hasCompleted && (\n" +
          "          <button onClick={handleClearCompleted}>Clear completed</button>\n" +
          "        )}\n" +
          "      </div>\n" +
          '      <p className="todo-count">{remainingCount} items left</p>\n' +
          "      {todos.length === 0 ? (\n" +
          '        <p className="todo-status">\n' +
          "          Nothing to do yet — add your first todo above!\n" +
          "        </p>\n" +
          "      ) : (\n" +
          "        <TodoList\n" +
          "          todos={visibleTodos}\n" +
          "          onToggleTodo={handleToggle}\n" +
          "          onDeleteTodo={handleDelete}\n" +
          "        />\n" +
          "      )}\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "TodoList.jsx":
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList({ todos, onToggleTodo, onDeleteTodo }) {\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem\n" +
          "          key={todo.id}\n" +
          "          todo={todo}\n" +
          "          onToggle={onToggleTodo}\n" +
          "          onDelete={onDeleteTodo}\n" +
          "        />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "TodoItem.jsx":
          "function TodoItem({ todo, onToggle, onDelete }) {\n" +
          "  return (\n" +
          '    <li className="todo-item">\n' +
          "      <input\n" +
          '        type="checkbox"\n' +
          "        checked={todo.done}\n" +
          "        onChange={() => onToggle(todo.id)}\n" +
          "      />\n" +
          "      {todo.title}\n" +
          '      <button onClick={() => onDelete(todo.id)}>Delete</button>\n' +
          "    </li>\n" +
          "  );\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "view.js":
          "export function filterTodos(todos, filter) {\n" +
          '  if (filter === "active") return todos.filter((t) => !t.done);\n' +
          '  if (filter === "completed") return todos.filter((t) => t.done);\n' +
          "  return [...todos];\n" +
          "}\n\n" +
          "export function countRemaining(todos) {\n" +
          "  return todos.filter((t) => !t.done).length;\n" +
          "}\n\n" +
          "export function hasCompletedTodos(todos) {\n" +
          "  return todos.some((t) => t.done);\n" +
          "}\n\n" +
          "export function clearCompleted(todos) {\n" +
          "  return todos.filter((t) => !t.done);\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm handleClearCompleted captures the previous todos array and the specific " +
        "cleared batch before the optimistic setTodos call, that the batch DELETE uses " +
        "Promise.all with an all-or-nothing rollback, that the Clear completed button only " +
        "renders when hasCompletedTodos(todos) is true, and that every earlier d7 feature " +
        "(composition tree, fetch-on-mount, create/toggle/delete/rename, empty state, filter " +
        "+ count) remains intact and correct — this is the final, fully-shipped capstone app.",
    },
  ],
};
