/**
 * Burrow src/course/content — Day 7: Putting It All Together (the capstone).
 *
 * Build target (SPEC.md §4 / README.md / §7): ship a **complete** React
 * to-do app against the same stable `/api/todos` contract used since Day 3:
 *
 *   GET    /api/todos      -> 200 JSON array of { id, title, done }
 *   POST   /api/todos      -> 201 JSON { id, title, done }  (body: { title })
 *   PUT    /api/todos/:id  -> 200 JSON { id, title, done }  (body: { done })
 *   DELETE /api/todos/:id  -> 200/204
 *
 * This is the culminating day: every idea from Days 4-6 — `useState` for
 * declarative UI (d4-t1), `useEffect` for fetch-on-mount with cleanup
 * (d4-t2, d6-t1..t3), optimistic writes without manual reconciliation
 * bookkeeping (d4-t3), and component composition via props/callback-props
 * (d5-t1..t3) — gets assembled into one shippable app, plus the two CRUD
 * operations the course hasn't exercised yet: **toggling done** against the
 * server (Day 5's d5-t2 only toggled *local* state) and **deleting** a todo:
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
 *   d7-t3 — **ship it.** The capstone deliverable: the same app, fully
 *           polished — an explicit **empty state** ("nothing to do yet"),
 *           `d6-t1`'s three-state loading/error/ready split all reachable,
 *           and all four CRUD operations (create, read, toggle, delete)
 *           working together without regressing any earlier state. This is
 *           the "first-time learner can complete Day 1 with zero setup"
 *           promise (SPEC.md §8) turned around: by Day 7 the *same*
 *           learner ships a real, working app end to end.
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
  ],
};
