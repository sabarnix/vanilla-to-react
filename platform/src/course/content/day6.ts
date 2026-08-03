/**
 * Burrow src/course/content — Day 6: useEffect & Data Fetching.
 *
 * Build target (SPEC.md §4 / README.md / §7): fetch **real** todos the React
 * way, against the same stable `/api/todos` contract as Day 3/Day 4:
 *
 *   GET /api/todos -> 200 JSON array of { id, title, done }
 *
 * Day 4 (d4-t2) already introduced `useEffect` for "fetch on mount" as a
 * shape, deliberately deferring its sharper edges. Day 6 is where those
 * edges get named and handled properly:
 *
 *   d6-t1 — same fetch-on-mount shape as d4-t2, but now paired with an
 *           explicit **loading/error** UI split rendered from `status`
 *           (mirrors d3-t1's three-state model, but as `useState` +
 *           conditional JSX instead of a hand-branched `render()`). This
 *           re-establishes the baseline "fetch the React way" pattern
 *           before layering the two things Day 4 didn't cover: cleanup and
 *           dependencies.
 *   d6-t2 — **cleanup and cancellation.** If the component unmounts (or the
 *           effect re-runs) before a fetch resolves, calling `setState` on
 *           an unmounted component is wasted work at best and a real bug at
 *           worst (React warns about state updates on unmounted
 *           components). `useEffect`'s **cleanup function** — the function
 *           an effect can `return` — is React's answer: it runs before the
 *           effect runs again and when the component unmounts. Wire an
 *           `AbortController` into the fetch and abort it in the cleanup
 *           function. This directly resolves the class of problem d3-t3
 *           patched by hand with a manual `requestId` counter — cleanup is
 *           the *framework-native* way to say "cancel the in-flight work
 *           this effect started," no counter required.
 *   d6-t3 — **effect dependencies.** A `todoId` prop drives a
 *           "fetch a single todo's detail" effect; changing `todoId` must
 *           re-run the fetch for the *new* id. This is where the
 *           dependency array stops being an empty "run once" ritual and
 *           becomes a real contract: list every reactive value the effect
 *           reads (`todoId`) so React knows precisely when to re-run it —
 *           and clean up the *previous* value's in-flight request first, so
 *           a slow response for an old `todoId` can never clobber a newer
 *           one (the same race d3-t3 fixed by hand, this time impossible by
 *           construction).
 *
 * Hidden tests follow Day 4/Day 5's proven approach exactly (see their doc
 * comments): every hidden test exercises a **pure, dependency-free helper
 * function** (co-authored in a plain `.js` file, no JSX, no React import, no
 * live network) that captures the essential *logic* a component's effect
 * embodies (status classification, an abort-aware fetch-result reducer, a
 * dependency-change decision) so `bun test` runs with zero npm installs,
 * zero JSX, zero DOM, zero live `/api/todos` server — same
 * `runHiddenTestsAgainst` machinery as day3-4.test.ts. The React components
 * themselves are reviewed via `evalPrompt` / visually in the running
 * sandbox.
 */

import type { Day } from "../schema.ts";

export const day6: Day = {
  id: "day-6",
  title: "useEffect & Data Fetching",
  order: 6,
  tasks: [
    // ------------------------------------------------------------------
    // d6-t1 — fetch on mount, explicit loading/error split
    // ------------------------------------------------------------------
    {
      id: "d6-t1",
      title: "Fetch todos on mount with loading/error state",
      description:
        "## Fetch todos on mount with loading/error state\n\n" +
        "Same contract as Day 3/4: `GET /api/todos` (same-origin, already " +
        "running in this sandbox — SPEC.md §7), returning a JSON array of " +
        "`{ id, title, done }`. This time, build the fetch-on-mount " +
        "component **from scratch**, explicitly modeling all three states " +
        "with `useState` (loading / error / ready) — the same three states " +
        "d3-t1 hand-rolled and d4-t1 rebuilt with JSX, now as the starting " +
        "point for the rest of Day 6's effect work.\n\n" +
        "In `App.jsx`:\n\n" +
        "```jsx\n" +
        "function App() {\n" +
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
        "**Your job:** finish `App.jsx` to match this shape exactly, AND " +
        "implement the pure helper `deriveStatus(result)` in `view.js` — " +
        "given a result object shaped like `{ ok: boolean }` (mirroring " +
        "the `fetch` Response's `.ok` field), it returns exactly " +
        '`"ready"` when `ok` is `true` and `"error"` when `ok` is `false`. ' +
        "This is the same decision the effect's `.then()`/`.catch()` chain " +
        "makes, extracted so it's testable without React or a network call.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
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
          "  // TODO: add a useEffect (empty deps) that fetches /api/todos and\n" +
          '  // sets status to "ready" + todos to the data on success, or status\n' +
          '  // to "error" on failure/non-ok response.\n\n' +
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
          "// TODO: implement deriveStatus(result) -> \"ready\" | \"error\"\n" +
          "// given result = { ok: boolean }\n" +
          "export function deriveStatus(result) {\n" +
          "}\n",
      },
      hints: [
        'Import both hooks in one line: `import { useState, useEffect } from "react";` — same as d4-t2.',
        "The effect's dependency array must be `[]` (empty) so it runs exactly once, on mount, not on every render.",
        '`deriveStatus` is a one-line ternary: `return result.ok ? "ready" : "error";`.',
        "This task doesn't need a cleanup function yet — that's the very next task. Just get fetch-on-mount + loading/error/ready working first.",
      ],
      hiddenTests: [
        {
          filename: "derive-status.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { deriveStatus } from "./view.js";\n\n' +
            'test("deriveStatus({ ok: true }) is ready", () => {\n' +
            '  expect(deriveStatus({ ok: true })).toBe("ready");\n' +
            "});\n\n" +
            'test("deriveStatus({ ok: false }) is error", () => {\n' +
            '  expect(deriveStatus({ ok: false })).toBe("error");\n' +
            "});\n",
        },
        {
          filename: "mount-fetch-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx imports useState and useEffect from react", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/import\\s*\\{[^}]*useState[^}]*\\}\\s*from\\s*["\']react["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            '  expect(/import\\s*\\{[^}]*useEffect[^}]*\\}\\s*from\\s*["\']react["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx fetches /api/todos inside a useEffect with an empty deps array", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/fetch\\(\\s*["\']\\/api\\/todos["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/useEffect\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?\\},\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx sets status to ready on success and error on failure", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/setStatus\\(\\s*["\']ready["\']\\s*\\)/.test(jsx)).toBe(true);\n' +
            '  expect(/setStatus\\(\\s*["\']error["\']\\s*\\)/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("App.jsx renders all three states (loading/error/ready)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/Loading/.test(jsx)).toBe(true);\n" +
            '  expect(/Failed to load todos\\./.test(jsx)).toBe(true);\n' +
            "  expect(/todos\\.map/.test(jsx)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
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
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm the useEffect has an empty dependency array (runs once on mount), and " +
        "that the three status branches (loading/error/ready) are all reachable and " +
        "driven entirely by useState, matching d3-t1's three-state model rebuilt " +
        "declaratively.",
    },

    // ------------------------------------------------------------------
    // d6-t2 — cleanup + AbortController cancels the in-flight fetch
    // ------------------------------------------------------------------
    {
      id: "d6-t2",
      title: "Cancel the in-flight fetch on unmount with a cleanup function",
      description:
        "## Cancel the in-flight fetch on unmount with a cleanup function\n\n" +
        "Recall d3-t3: a hand-rolled `reloadTodos()` had no way to discard " +
        "a stale response, so the fix was a manual `requestId` counter " +
        "checked inside the `.then()`. React's `useEffect` has a " +
        "**built-in** answer to a closely related problem: **cleanup**.\n\n" +
        "An effect can `return` a function. React calls that function " +
        "**before the effect runs again**, and **when the component " +
        "unmounts**. That's the perfect place to cancel work the effect " +
        "started that's no longer wanted:\n\n" +
        "```jsx\n" +
        "useEffect(() => {\n" +
        "  const controller = new AbortController();\n\n" +
        '  fetch("/api/todos", { signal: controller.signal })\n' +
        "    .then((response) => {\n" +
        '      if (!response.ok) throw new Error("bad response");\n' +
        "      return response.json();\n" +
        "    })\n" +
        "    .then((data) => {\n" +
        "      setTodos(data);\n" +
        '      setStatus("ready");\n' +
        "    })\n" +
        "    .catch((err) => {\n" +
        '      if (err.name === "AbortError") return; // cancelled, not a real error\n' +
        '      setStatus("error");\n' +
        "    });\n\n" +
        "  return () => {\n" +
        "    controller.abort();\n" +
        "  };\n" +
        "}, []);\n" +
        "```\n\n" +
        "`AbortController` gives `fetch` a `signal` it watches; calling " +
        "`controller.abort()` makes the in-flight request reject with an " +
        "`AbortError`, which the `.catch()` must recognize and **ignore** " +
        "(it's an intentional cancellation, not a real failure — setting " +
        '`status` to `"error"` here would show a scary message for " +' +
        "something the user didn't do wrong). Compare this to d3-t3's " +
        "`requestId` guard: both solve \"discard a response we no longer " +
        "want,\" but cleanup is *automatic* — React calls it for you at " +
        "exactly the right moments, no counter to remember to check.\n\n" +
        "**Your job:** wire the `AbortController` + cleanup shape above " +
        "into `App.jsx`, AND implement the pure helper " +
        "`shouldShowError(errorName)` in `view.js` — given the `name` of a " +
        "caught error (a string, possibly `undefined`/`null` for a non-" +
        'Error rejection), it returns `false` when `errorName === "AbortError"` ' +
        "(a cancellation, not a real error — don't show it) and `true` for " +
        "any other value (a real failure — do show it).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
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
          "    // TODO: create an AbortController, pass its signal to fetch, and\n" +
          "    // return a cleanup function that calls controller.abort(). In the\n" +
          '    // catch handler, ignore AbortError (do not setStatus("error") for it).\n' +
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
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "// TODO: implement shouldShowError(errorName) -> boolean\n" +
          '// false when errorName === "AbortError", true otherwise.\n' +
          "export function shouldShowError(errorName) {\n" +
          "}\n",
      },
      hints: [
        "Create the `AbortController` **inside** the effect body (not outside it) so a fresh one is made every time the effect runs — a single controller can only be aborted once.",
        "Pass `{ signal: controller.signal }` as `fetch`'s second argument — this is what lets `controller.abort()` actually cancel the request.",
        "The cleanup function is whatever the effect callback `return`s: `return () => { controller.abort(); };` — no parameters, just closes over `controller`.",
        '`shouldShowError` is a one-line comparison: `return errorName !== "AbortError";` — remember an aborted fetch\'s caught error has `.name === "AbortError"`, so check `err.name`, not the whole error object, inside the `.catch()`.',
      ],
      hiddenTests: [
        {
          filename: "should-show-error.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { shouldShowError } from "./view.js";\n\n' +
            'test("shouldShowError is false for AbortError (intentional cancellation)", () => {\n' +
            '  expect(shouldShowError("AbortError")).toBe(false);\n' +
            "});\n\n" +
            'test("shouldShowError is true for a real error name", () => {\n' +
            '  expect(shouldShowError("TypeError")).toBe(true);\n' +
            "});\n\n" +
            'test("shouldShowError is true for undefined/missing error name", () => {\n' +
            "  expect(shouldShowError(undefined)).toBe(true);\n" +
            "  expect(shouldShowError(null)).toBe(true);\n" +
            "});\n",
        },
        {
          filename: "cleanup-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx creates an AbortController inside the effect", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/new AbortController\\(\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx passes the controller\'s signal to fetch", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/signal\\s*:\\s*controller\\.signal/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx\'s effect returns a cleanup function that aborts the controller", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/return\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?controller\\.abort\\(\\s*\\)[\\s\\S]*?\\}/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx ignores AbortError instead of treating it as a load failure", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/AbortError/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("the effect still has an empty dependency array", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/\\},\\s*\\[\\s*\\]\\s*\\)\\s*;/.test(jsx)).toBe(true);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
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
          "    const controller = new AbortController();\n\n" +
          '    fetch("/api/todos", { signal: controller.signal })\n' +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodos(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch((err) => {\n" +
          '        if (err.name === "AbortError") return;\n' +
          '        setStatus("error");\n' +
          "      });\n\n" +
          "    return () => {\n" +
          "      controller.abort();\n" +
          "    };\n" +
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
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm the effect creates a fresh AbortController each run, wires its signal " +
        "into fetch, returns a cleanup function that calls controller.abort(), and " +
        "treats AbortError as a silent cancellation rather than a status: \"error\" " +
        "failure — the framework-native counterpart to d3-t3's manual requestId guard.",
    },

    // ------------------------------------------------------------------
    // d6-t3 — effect dependencies: re-fetch when todoId changes
    // ------------------------------------------------------------------
    {
      id: "d6-t3",
      title: "Re-fetch on prop change with a correct dependency array",
      description:
        "## Re-fetch on prop change with a correct dependency array\n\n" +
        "So far every effect has used an empty dependency array `[]` — " +
        '"run once, on mount." But an effect\'s dependency array isn\'t ' +
        "just an on/off switch for re-running; it's a **contract**: list " +
        "every reactive value (props, state) the effect *reads*, and React " +
        "re-runs the effect whenever any of them change.\n\n" +
        "`TodoDetail` receives a `todoId` prop and must fetch **that " +
        "specific todo's** detail from `GET /api/todos/:id` whenever " +
        "`todoId` changes — including the very first render, and every " +
        "time a new `todoId` is passed in:\n\n" +
        "```jsx\n" +
        "function TodoDetail({ todoId }) {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todo, setTodo] = useState(null);\n\n" +
        "  useEffect(() => {\n" +
        "    const controller = new AbortController();\n" +
        '    setStatus("loading");\n\n' +
        "    fetch(`/api/todos/${todoId}`, { signal: controller.signal })\n" +
        "      .then((response) => {\n" +
        '        if (!response.ok) throw new Error("bad response");\n' +
        "        return response.json();\n" +
        "      })\n" +
        "      .then((data) => {\n" +
        "        setTodo(data);\n" +
        '        setStatus("ready");\n' +
        "      })\n" +
        "      .catch((err) => {\n" +
        '        if (err.name === "AbortError") return;\n' +
        '        setStatus("error");\n' +
        "      });\n\n" +
        "    return () => {\n" +
        "      controller.abort();\n" +
        "    };\n" +
        "  }, [todoId]); // re-run whenever todoId changes\n\n" +
        "  // ... render status/todo ...\n" +
        "}\n" +
        "```\n\n" +
        "Walk through *why* `[todoId]` matters: if a learner quickly " +
        "switches from viewing todo `1` to todo `2`, React runs the " +
        "cleanup for the **old** effect (aborting todo `1`'s still-in-" +
        "flight fetch) *before* running the new effect for todo `2`. Todo " +
        "`1`'s slow response can never land after todo `2`'s — the exact " +
        "race d3-t3 fixed by hand with a `requestId` counter is now " +
        "impossible **by construction**, because cleanup-before-re-run is " +
        "guaranteed by React itself, tied to the one value (`todoId`) that " +
        "actually changes.\n\n" +
        "**Your job:** finish `TodoDetail.jsx` matching the shape above " +
        "(effect depends on `[todoId]`, resets `status` to `\"loading\"` " +
        "at the start of each run, aborts the previous request on cleanup), " +
        "AND implement the pure helper `didTodoIdChange(prevId, nextId)` in " +
        "`view.js` — returns `true` when the two ids are different " +
        "(meaning the effect must re-run and the previous request must be " +
        "cancelled) and `false` when they're the same.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoDetail.jsx":
          'import { useState, useEffect } from "react";\n\n' +
          "function TodoDetail({ todoId }) {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todo, setTodo] = useState(null);\n\n" +
          "  // TODO: add a useEffect that:\n" +
          '  // - resets status to "loading" at the start of each run\n' +
          "  // - creates a fresh AbortController\n" +
          "  // - fetches `/api/todos/${todoId}` with { signal: controller.signal }\n" +
          '  // - on success: setTodo(data), setStatus("ready")\n' +
          '  // - on failure (not AbortError): setStatus("error")\n' +
          "  // - returns a cleanup function that aborts the controller\n" +
          "  // - depends on [todoId] so it re-runs whenever todoId changes\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todo.</p>;\n' +
          "  }\n\n" +
          '  return <p className="todo-item">{todo?.title}</p>;\n' +
          "}\n\n" +
          "export default TodoDetail;\n",
        "view.js":
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "// TODO: implement didTodoIdChange(prevId, nextId) -> boolean\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "}\n",
      },
      hints: [
        'The dependency array must be `[todoId]`, not `[]` — an empty array here would mean the effect never re-runs when a new todoId prop arrives, so the detail view would get stuck showing the first todoId forever.',
        '`setStatus("loading")` should be the very first line inside the effect body (before creating the controller or calling fetch) so the UI shows a loading state immediately when `todoId` changes, not stale data from the previous id.',
        "Use a template literal for the URL: `fetch(\\`/api/todos/${todoId}\\`, { signal: controller.signal })` — this is the same AbortController + cleanup shape as d6-t2, just parameterized by todoId.",
        "`didTodoIdChange` is a one-line inequality: `return prevId !== nextId;`.",
      ],
      hiddenTests: [
        {
          filename: "did-change.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { didTodoIdChange } from "./view.js";\n\n' +
            'test("didTodoIdChange is true when ids differ", () => {\n' +
            "  expect(didTodoIdChange(1, 2)).toBe(true);\n" +
            "});\n\n" +
            'test("didTodoIdChange is false when ids are the same", () => {\n' +
            "  expect(didTodoIdChange(5, 5)).toBe(false);\n" +
            "});\n\n" +
            'test("didTodoIdChange treats undefined -> defined as a change", () => {\n' +
            "  expect(didTodoIdChange(undefined, 1)).toBe(true);\n" +
            "});\n",
        },
        {
          filename: "dependency-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoDetail.jsx destructures todoId from props", async () => {\n' +
            '  const jsx = await Bun.file("TodoDetail.jsx").text();\n' +
            "  expect(/\\{\\s*todoId\\s*\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoDetail.jsx\'s effect depends on [todoId], not an empty array", async () => {\n' +
            '  const jsx = await Bun.file("TodoDetail.jsx").text();\n' +
            "  expect(/\\},\\s*\\[\\s*todoId\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoDetail.jsx fetches the todoId-specific endpoint", async () => {\n' +
            '  const jsx = await Bun.file("TodoDetail.jsx").text();\n' +
            "  expect(/fetch\\(\\s*`\\/api\\/todos\\/\\$\\{todoId\\}`/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoDetail.jsx resets status to loading at the start of the effect", async () => {\n' +
            '  const jsx = await Bun.file("TodoDetail.jsx").text();\n' +
            "  expect(/useEffect\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*setStatus\\(\\s*[\"']loading[\"']\\s*\\)/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("TodoDetail.jsx still uses AbortController + cleanup for the new fetch", async () => {\n' +
            '  const jsx = await Bun.file("TodoDetail.jsx").text();\n' +
            "  expect(/new AbortController\\(\\s*\\)/.test(jsx)).toBe(true);\n" +
            "  expect(/return\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?controller\\.abort\\(\\s*\\)[\\s\\S]*?\\}/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day6-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoDetail.jsx":
          'import { useState, useEffect } from "react";\n\n' +
          "function TodoDetail({ todoId }) {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todo, setTodo] = useState(null);\n\n" +
          "  useEffect(() => {\n" +
          '    setStatus("loading");\n' +
          "    const controller = new AbortController();\n\n" +
          "    fetch(`/api/todos/${todoId}`, { signal: controller.signal })\n" +
          "      .then((response) => {\n" +
          '        if (!response.ok) throw new Error("bad response");\n' +
          "        return response.json();\n" +
          "      })\n" +
          "      .then((data) => {\n" +
          "        setTodo(data);\n" +
          '        setStatus("ready");\n' +
          "      })\n" +
          "      .catch((err) => {\n" +
          '        if (err.name === "AbortError") return;\n' +
          '        setStatus("error");\n' +
          "      });\n\n" +
          "    return () => {\n" +
          "      controller.abort();\n" +
          "    };\n" +
          "  }, [todoId]);\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todo.</p>;\n' +
          "  }\n\n" +
          '  return <p className="todo-item">{todo?.title}</p>;\n' +
          "}\n\n" +
          "export default TodoDetail;\n",
        "view.js":
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm the effect's dependency array is exactly [todoId] (not empty, not " +
        "missing), that status resets to loading at the top of each run so stale data " +
        "never lingers across a todoId change, and that the previous request is " +
        "aborted via cleanup before the next one starts — making d3-t3's race " +
        "impossible by construction rather than patched with a manual counter.",
    },
  ],
};
