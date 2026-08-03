/**
 * Burrow src/course/content — Day 4: Why React Exists.
 *
 * Build target (SPEC.md §4 / README.md / §7): rebuild **Day 3's exact app**
 * — fetch todos from `/api/todos`, render loading/error/ready states, add a
 * to-do via POST — but in **React**. Same product, same `/api/todos`
 * contract, radically less hand-written bookkeeping.
 *
 * Philosophy: "You can't appreciate the solution until you've felt the
 * problem." Day 4 is the payoff: every piece of manual work from Day 3
 * disappears because the UI is now a **pure function of state**, and a
 * re-render is a state update, not a DOM-mutation the learner writes by
 * hand:
 *
 *   d4-t1 — `useState` for the same three-state model as d3-t1 (loading /
 *           error / ready), returning JSX conditionally instead of
 *           branching inside a hand-written `render()`. There is no
 *           `document.createElement`, no `innerHTML = ""` reset, no
 *           `appendChild` loop — React owns turning state into DOM. Feel
 *           the relief: the *entire* d3-t1 branch-by-hand problem is gone,
 *           replaced by "return different JSX for different state".
 *   d4-t2 — `useEffect` to fetch on mount (the React-idiomatic replacement
 *           for d3-t1's manual "call fetch, then setState in .then()").
 *           Sets up Day 6's deeper useEffect/cleanup lesson without
 *           requiring it yet — this task only needs the fetch-on-mount
 *           shape.
 *   d4-t3 — add-todo via `setTodos` (immutable array update, no manual
 *           reconciliation bookkeeping) that mirrors d3-t2's optimistic
 *           POST, but the "always re-render from current state" guarantee
 *           React provides means there's no `.map`-to-replace-by-temp-id
 *           dance required to keep the DOM in sync — one state update, one
 *           re-render, always consistent. This is the direct, felt contrast
 *           with d3-t2's manual reconciliation and d3-t3's race-condition
 *           bug: React always renders the *latest* state, so there is no
 *           equivalent of "an old response overwriting a newer one" inside
 *           a single render pass (Day 6 covers cancelling in-flight
 *           requests with `useEffect` cleanup for the *fetch itself*, but
 *           the DOM-sync class of bug from d3-t3 is gone here for free).
 *
 * React runs via Burrow's bun+esm toolchain per SPEC.md §1 (the learner's
 * sandbox `npm install`s react/react-dom, as declared in each task's
 * `package.json` starter file). Hidden tests, however, must stay runnable
 * under a **plain `bun test`** with no network installs (per the T9 ticket
 * rules and day1-2.test.ts's `runHiddenTestsAgainst`, which shells out to
 * real `bun test` in a throwaway temp dir seeded only with the task's own
 * files — no node_modules, no registry). So every hidden test here exercises
 * a **pure, dependency-free helper function** (co-authored alongside the
 * React component in a plain `.js`/`.ts` file, no JSX, no React import) that
 * captures the essential *logic* of the component (state-shape reducers,
 * derived render-decision logic, the fetch-on-mount shape as testable pure
 * functions) — the React component itself is reviewed via `evalPrompt` /
 * visually in the running sandbox, matching "prefer testable pure pieces"
 * from the ticket rules.
 */

import type { Day } from "../schema.ts";

export const day4: Day = {
  id: "day-4",
  title: "Why React Exists",
  order: 4,
  tasks: [
    // ------------------------------------------------------------------
    // d4-t1 — useState + conditional JSX replaces hand-branched render()
    // ------------------------------------------------------------------
    {
      id: "d4-t1",
      title: "Rebuild the loading/error/ready states with useState + JSX",
      description:
        "## Rebuild the loading/error/ready states with useState + JSX\n\n" +
        "Remember d3-t1? You had to hand-write a `render()` function that " +
        "reset `innerHTML`, then branched on `state.status` to build " +
        '`<li>` elements one by one with `document.createElement`. Every ' +
        "single state change meant remembering to call `render()` again, " +
        "and remembering every branch.\n\n" +
        "Today, in `App.jsx`, we describe the **same three states** — but " +
        "as data, not DOM operations:\n\n" +
        "```jsx\n" +
        "function App() {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todos, setTodos] = useState([]);\n\n" +
        "  // ... (fetch wiring comes in d4-t2)\n\n" +
        '  if (status === "loading") return <p className="todo-status">Loading…</p>;\n' +
        '  if (status === "error") return <p className="todo-status">Failed to load todos.</p>;\n\n' +
        "  return (\n" +
        "    <ul>\n" +
        "      {todos.map((todo) => (\n" +
        '        <li key={todo.id} className="todo-item">{todo.title}</li>\n' +
        "      ))}\n" +
        "    </ul>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "There is no `render()` function to remember to call. There is no " +
        "`innerHTML = \"\"` reset. There is no `appendChild` loop. Calling " +
        "`setStatus(...)` or `setTodos(...)` is enough — React re-runs the " +
        "component and reconciles the DOM for you, every time, without " +
        "exception.\n\n" +
        "**Your job:** finish `App.jsx` so it matches the shape above " +
        "exactly (three `useState`-driven branches: loading / error / " +
        "ready), AND implement the small **pure helper** `pickView(status)` " +
        "in `view.js` that returns the exact string `\"loading\"`, " +
        "`\"error\"`, or `\"ready\"` for a given status — this is the " +
        "decision `App.jsx` makes, extracted so it can be tested without a " +
        "browser or React installed. `pickView` must return `\"ready\"` for " +
        "**any** status value that isn't exactly `\"loading\"` or " +
        '`\"error\"` (a safe default, same as the `if`/`if`/else-fallthrough ' +
        "shape in the JSX above).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState } from "react";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n\n" +
          "  // TODO: return the loading <p>, the error <p>, or the todos <ul>,\n" +
          "  // matching the JSX shape from the task description exactly.\n" +
          "  return null;\n" +
          "}\n",
        "view.js":
          "// A pure helper extracting App.jsx's branch decision so it's testable\n" +
          "// without React or a browser. Must return exactly one of:\n" +
          '// "loading", "error", "ready".\n' +
          "export function pickView(status) {\n" +
          "  // TODO: implement\n" +
          "}\n",
      },
      hints: [
        'The three JSX branches map 1:1 onto d3-t1\'s three render() branches — same three states, just returned as JSX instead of built with document.createElement.',
        '`if (status === "loading") return <p className="todo-status">Loading…</p>;` should be the first line of the returned logic — an early return, no else needed.',
        "`pickView` should be a simple chain of comparisons: check for the loading and error strings explicitly, and treat everything else (including `\"ready\"` itself) as `\"ready\"`.",
        "Don't reach for `document` or `innerHTML` anywhere in `App.jsx` — if you find yourself doing DOM manipulation, you're fighting the framework instead of using it.",
      ],
      hiddenTests: [
        {
          filename: "view.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { pickView } from "./view.js";\n\n' +
            'test(\'pickView("loading") returns "loading"\', () => {\n' +
            '  expect(pickView("loading")).toBe("loading");\n' +
            "});\n\n" +
            'test(\'pickView("error") returns "error"\', () => {\n' +
            '  expect(pickView("error")).toBe("error");\n' +
            "});\n\n" +
            'test(\'pickView("ready") returns "ready"\', () => {\n' +
            '  expect(pickView("ready")).toBe("ready");\n' +
            "});\n\n" +
            'test("pickView defaults to \\"ready\\" for any other status (safe fallthrough)", () => {\n' +
            '  expect(pickView("anything-else")).toBe("ready");\n' +
            '  expect(pickView(undefined)).toBe("ready");\n' +
            "});\n",
        },
        {
          filename: "app-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx uses useState for status and todos", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/useState/.test(jsx)).toBe(true);\n" +
            '  expect(/status/.test(jsx)).toBe(true);\n' +
            '  expect(/todos/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx has no manual DOM manipulation (no render(), no innerHTML, no createElement)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "  expect(/function render\\s*\\(/.test(jsx)).toBe(false);\n" +
            "});\n\n" +
            'test("App.jsx returns JSX for all three states", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/Loading/.test(jsx)).toBe(true);\n' +
            '  expect(/Failed to load todos\\./.test(jsx)).toBe(true);\n' +
            '  expect(/todos\\.map/.test(jsx)).toBe(true);\n' +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState } from "react";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          '        <li key={todo.id} className="todo-item">\n' +
          "          {todo.title}\n" +
          "        </li>\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function pickView(status) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return "ready";\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm App.jsx contains zero manual DOM operations (no document.*, no " +
        "innerHTML, no createElement, no hand-written render() function) and instead " +
        "returns JSX conditionally based on useState-managed status/todos.",
    },

    // ------------------------------------------------------------------
    // d4-t2 — useEffect fetch-on-mount replaces manual fetch + setState wiring
    // ------------------------------------------------------------------
    {
      id: "d4-t2",
      title: "Fetch on mount with useEffect",
      description:
        "## Fetch on mount with useEffect\n\n" +
        "In d3-t1, kicking off the initial `/api/todos` fetch meant a " +
        "loose `fetch(...)` call sitting at the bottom of `app.js`, wired " +
        "by hand to update `state` and call `render()` in its `.then()`/" +
        "`.catch()`. Nothing tied that fetch's *lifetime* to the page's " +
        "lifetime — it was just script-level code that happened to run " +
        "once, and you had to trust that nothing else called `render()` " +
        "before or interfered with it.\n\n" +
        "React has a dedicated hook for \"run this side effect when the " +
        "component mounts\": **`useEffect`**. Finish wiring it up in " +
        "`App.jsx`:\n\n" +
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
        "    .catch(() => {\n" +
        '      setStatus("error");\n' +
        "    });\n" +
        "}, []); // empty deps: run once, on mount\n" +
        "```\n\n" +
        "Notice there's no equivalent of d3-t1's grouped `state` object " +
        "with a manual `render()` call afterward — `setTodos` and " +
        "`setStatus` *are* the update, and React re-renders on its own. " +
        "You also don't juggle a combined `{ status, todos, error }` object " +
        "by hand; each piece of state gets its own setter and React batches " +
        "the re-render.\n\n" +
        "**Your job:** wire the `useEffect` above into `App.jsx` (import " +
        "`useEffect` from `\"react\"`, empty dependency array so it runs " +
        "exactly once on mount), AND implement the pure helper " +
        "`classifyTodosResponse(ok)` in `view.js` — given a boolean " +
        '`response.ok`, it should return `"ready"` when `ok` is `true` and ' +
        '`"error"` when `ok` is `false`, capturing the same branch the ' +
        "`.then()`/`.catch()` chain above makes, as a pure, testable " +
        "function.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState } from "react";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n\n" +
          "  // TODO: import useEffect from react, then add a useEffect with an\n" +
          "  // empty dependency array that fetches /api/todos, and on success\n" +
          '  // calls setTodos(data) + setStatus("ready"), and on failure calls\n' +
          '  // setStatus("error").\n\n' +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          '        <li key={todo.id} className="todo-item">\n' +
          "          {todo.title}\n" +
          "        </li>\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function pickView(status) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return "ready";\n' +
          "}\n\n" +
          "// TODO: implement classifyTodosResponse(ok) -> \"ready\" | \"error\"\n" +
          "export function classifyTodosResponse(ok) {\n" +
          "}\n",
      },
      hints: [
        'Import both hooks in one line: `import { useState, useEffect } from "react";`.',
        "The empty array `[]` as the second argument to `useEffect` is what makes it run exactly once, on mount — forgetting it (or omitting it) would re-run the effect on every render, an infinite fetch loop here.",
        '`classifyTodosResponse` is a one-line ternary: `return ok ? "ready" : "error";`.',
        "The useEffect body itself doesn't need to return anything for this task (no cleanup function required yet — that's Day 6).",
      ],
      hiddenTests: [
        {
          filename: "classify.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { classifyTodosResponse } from "./view.js";\n\n' +
            'test("classifyTodosResponse(true) is ready", () => {\n' +
            '  expect(classifyTodosResponse(true)).toBe("ready");\n' +
            "});\n\n" +
            'test("classifyTodosResponse(false) is error", () => {\n' +
            '  expect(classifyTodosResponse(false)).toBe("error");\n' +
            "});\n",
        },
        {
          filename: "effect-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx imports useEffect from react", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/import\\s*\\{[^}]*useEffect[^}]*\\}\\s*from\\s*["\']react["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx calls useEffect with an empty dependency array (fetch on mount only)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/useEffect\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?\\},\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("the effect fetches /api/todos and calls setTodos + setStatus", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/fetch\\(\\s*["\']\\/api\\/todos["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/setTodos\\(/.test(jsx)).toBe(true);\n" +
            "  expect(/setStatus\\(/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx still has zero manual DOM operations", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n\n" +
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
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          '        <li key={todo.id} className="todo-item">\n' +
          "          {todo.title}\n" +
          "        </li>\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function pickView(status) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return "ready";\n' +
          "}\n\n" +
          "export function classifyTodosResponse(ok) {\n" +
          '  return ok ? "ready" : "error";\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm useEffect has an empty dependency array (fetch-once-on-mount, not on " +
        "every render), and that the effect updates state via setTodos/setStatus " +
        "rather than any manual DOM write.",
    },

    // ------------------------------------------------------------------
    // d4-t3 — add-todo via setTodos, no manual reconciliation bookkeeping
    // ------------------------------------------------------------------
    {
      id: "d4-t3",
      title: "Add a to-do with setTodos (no manual reconciliation)",
      description:
        "## Add a to-do with setTodos (no manual reconciliation)\n\n" +
        "Recall d3-t2: adding a to-do meant hand-rolling an *optimistic* " +
        "todo with a temp id, splicing it into `state.todos`, calling " +
        "`render()`, POSTing, then on success **finding** the temp todo by " +
        "id and **replacing** it with the server's real todo (`.map`), or " +
        "on failure **finding and removing** it (`.filter`) — a whole " +
        "reconciliation protocol you had to get right by hand, twice, for " +
        "every async write in the app. d3-t3 showed what happens when this " +
        "kind of manual bookkeeping is missing entirely: stale responses " +
        "silently win.\n\n" +
        "In React the shape is the same idea (optimistic update, then " +
        "reconcile-or-rollback) but there's no separate `render()` to " +
        "remember, and no risk of a stale *render* overwriting a fresher " +
        "one — every `setTodos(...)` call schedules a re-render from " +
        "*that* update, and React guarantees the component re-renders with " +
        "the latest state:\n\n" +
        "```jsx\n" +
        "function handleSubmit(event) {\n" +
        "  event.preventDefault();\n" +
        "  const value = input.trim();\n" +
        "  if (!value) return;\n\n" +
        '  const tempId = "temp-" + Date.now();\n' +
        "  setTodos((current) => [...current, { id: tempId, title: value, done: false }]);\n" +
        "  setInput(\"\");\n\n" +
        '  fetch("/api/todos", {\n' +
        '    method: "POST",\n' +
        '    headers: { "Content-Type": "application/json" },\n' +
        "    body: JSON.stringify({ title: value }),\n" +
        "  })\n" +
        "    .then((response) => response.json())\n" +
        "    .then((realTodo) => {\n" +
        "      setTodos((current) =>\n" +
        "        current.map((t) => (t.id === tempId ? realTodo : t)),\n" +
        "      );\n" +
        "    })\n" +
        "    .catch(() => {\n" +
        "      setTodos((current) => current.filter((t) => t.id !== tempId));\n" +
        "    });\n" +
        "}\n" +
        "```\n\n" +
        "**Your job:** wire `handleSubmit` (and a controlled `<input>` " +
        "using an `input`/`setInput` state pair, plus a `<form>` calling " +
        "`handleSubmit` on submit) into `App.jsx`, AND implement two pure " +
        "helpers in `view.js` that capture the reconciliation logic so it's " +
        "testable without React:\n\n" +
        "- `reconcileTodos(todos, tempId, realTodo)` — returns a **new** " +
        "  array with the item whose `id === tempId` replaced by " +
        "  `realTodo` (same shape as the `.map` above; must not mutate the " +
        "  input array).\n" +
        "- `rollbackTodos(todos, tempId)` — returns a **new** array with " +
        "  the item whose `id === tempId` removed (same shape as the " +
        "  `.filter` above; must not mutate the input array).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n\n' +
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
          "  // TODO: handleSubmit — optimistic add via setTodos, then POST\n" +
          "  // /api/todos, then reconcile (on success) or roll back (on failure).\n" +
          "  function handleSubmit(event) {\n" +
          "    event.preventDefault();\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleSubmit}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <ul>\n" +
          "        {todos.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-item">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function pickView(status) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return "ready";\n' +
          "}\n\n" +
          "export function classifyTodosResponse(ok) {\n" +
          '  return ok ? "ready" : "error";\n' +
          "}\n\n" +
          "// TODO: implement reconcileTodos(todos, tempId, realTodo) -> new array\n" +
          "export function reconcileTodos(todos, tempId, realTodo) {\n" +
          "}\n\n" +
          "// TODO: implement rollbackTodos(todos, tempId) -> new array\n" +
          "export function rollbackTodos(todos, tempId) {\n" +
          "}\n",
      },
      hints: [
        '`setTodos((current) => [...current, newTodo])` is the optimistic push — the functional updater form avoids depending on a possibly-stale `todos` closure variable.',
        "`reconcileTodos` is a one-line `.map`: `return todos.map((t) => (t.id === tempId ? realTodo : t));` — do not use `.forEach` + push, and do not mutate `todos` in place.",
        "`rollbackTodos` is a one-line `.filter`: `return todos.filter((t) => t.id !== tempId);`.",
        "handleSubmit needs `event.preventDefault()`, a non-empty trimmed `input` check, clearing `input` via `setInput(\"\")`, and the same POST + `.then`/`.catch` shape shown in the task description, calling `reconcileTodos`/`rollbackTodos`-equivalent updates via `setTodos`.",
      ],
      hiddenTests: [
        {
          filename: "reconcile.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { reconcileTodos, rollbackTodos } from "./view.js";\n\n' +
            'test("reconcileTodos replaces the temp todo with the real todo", () => {\n' +
            '  const todos = [\n' +
            '    { id: "temp-1", title: "Buy milk", done: false },\n' +
            '    { id: 2, title: "Existing", done: false },\n' +
            "  ];\n" +
            '  const realTodo = { id: 99, title: "Buy milk", done: false };\n' +
            '  const result = reconcileTodos(todos, "temp-1", realTodo);\n' +
            "  expect(result).toEqual([\n" +
            "    { id: 99, title: \"Buy milk\", done: false },\n" +
            '    { id: 2, title: "Existing", done: false },\n' +
            "  ]);\n" +
            "});\n\n" +
            'test("reconcileTodos does not mutate the original array", () => {\n' +
            '  const todos = [{ id: "temp-1", title: "Buy milk", done: false }];\n' +
            '  const original = [...todos];\n' +
            '  reconcileTodos(todos, "temp-1", { id: 5, title: "Buy milk", done: false });\n' +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("rollbackTodos removes exactly the temp todo", () => {\n' +
            '  const todos = [\n' +
            '    { id: "temp-1", title: "Buy milk", done: false },\n' +
            '    { id: 2, title: "Existing", done: false },\n' +
            "  ];\n" +
            '  const result = rollbackTodos(todos, "temp-1");\n' +
            '  expect(result).toEqual([{ id: 2, title: "Existing", done: false }]);\n' +
            "});\n\n" +
            'test("rollbackTodos does not mutate the original array", () => {\n' +
            '  const todos = [{ id: "temp-1", title: "Buy milk", done: false }];\n' +
            '  const original = [...todos];\n' +
            '  rollbackTodos(todos, "temp-1");\n' +
            "  expect(todos).toEqual(original);\n" +
            "});\n\n" +
            'test("rollbackTodos leaves the array untouched if the id is not found", () => {\n' +
            '  const todos = [{ id: 2, title: "Existing", done: false }];\n' +
            '  const result = rollbackTodos(todos, "temp-missing");\n' +
            "  expect(result).toEqual(todos);\n" +
            "});\n",
        },
        {
          filename: "submit-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx wires a controlled input with input/setInput state", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/useState\\(\\s*["\']["\']\\s*\\)/.test(jsx)).toBe(true);\n' +
            "  expect(/onChange=\\{/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("handleSubmit prevents default and optimistically updates todos", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleSubmit/.test(jsx)).toBe(true);\n" +
            "  expect(/preventDefault\\(\\s*\\)/.test(jsx)).toBe(true);\n" +
            "  expect(/setTodos\\(/.test(jsx)).toBe(true);\n" +
            '  expect(/temp-/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("handleSubmit POSTs to /api/todos with a JSON title body", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/method\\s*:\\s*["\']POST["\']/.test(jsx)).toBe(true);\n' +
            '  expect(/JSON\\.stringify\\(\\s*\\{\\s*title/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx has zero manual DOM operations, even with the form added", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/document\\.createElement/.test(jsx)).toBe(false);\n" +
            "  expect(/innerHTML/.test(jsx)).toBe(false);\n" +
            "  expect(/\\.splice\\(/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day4-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "App.jsx":
          'import { useState, useEffect } from "react";\n\n' +
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
          "  function handleSubmit(event) {\n" +
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
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <form onSubmit={handleSubmit}>\n" +
          "        <input\n" +
          "          value={input}\n" +
          "          onChange={(event) => setInput(event.target.value)}\n" +
          "        />\n" +
          '        <button type="submit">Add</button>\n' +
          "      </form>\n" +
          "      <ul>\n" +
          "        {todos.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-item">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function pickView(status) {\n" +
          '  if (status === "loading") return "loading";\n' +
          '  if (status === "error") return "error";\n' +
          '  return "ready";\n' +
          "}\n\n" +
          "export function classifyTodosResponse(ok) {\n" +
          '  return ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function reconcileTodos(todos, tempId, realTodo) {\n" +
          "  return todos.map((t) => (t.id === tempId ? realTodo : t));\n" +
          "}\n\n" +
          "export function rollbackTodos(todos, tempId) {\n" +
          "  return todos.filter((t) => t.id !== tempId);\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm handleSubmit performs the optimistic setTodos update before the POST " +
        "resolves, uses functional setTodos updaters (not a stale closed-over todos " +
        "variable), and that reconcileTodos/rollbackTodos are pure (return new arrays, " +
        "never mutate their input).",
    },
  ],
};
