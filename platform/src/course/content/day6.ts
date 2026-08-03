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
 *   d6-t4 — **derived loading state from a manual refetch, not just
 *           mount.** A "Refresh" button re-runs the same fetch d6-t1 ran on
 *           mount, but this time the trigger is a state value (`refreshKey`)
 *           bumped by a click handler, not the empty-deps mount-only case.
 *           Puts a **non-empty dependency array to work** for the first
 *           time in this course: `[refreshKey]` means "re-run whenever the
 *           user asks for a refresh," while still resetting to a loading
 *           state each time so the UI never shows stale data mixed with a
 *           new request in flight.
 *   d6-t5 — **polling with `setInterval` inside `useEffect`, cleaned up
 *           with `clearInterval`.** Where d6-t2 cancelled a single in-
 *           flight request, this task cancels a **repeating** side effect:
 *           an interval that re-fetches `/api/todos` every N seconds needs
 *           `clearInterval` in the effect's cleanup or the interval keeps
 *           firing (and calling `setState`) forever after the component
 *           unmounts — a textbook memory/update leak. Same cleanup
 *           mechanism as d6-t2, applied to a timer instead of a fetch.
 *   d6-t6 — **two independent effects with different dependency arrays on
 *           the same component**, a shape that must not be conflated into
 *           one `useEffect` even though both fetch from `/api/todos`: one
 *           effect (deps `[]`) loads the full list once on mount; a second,
 *           separate effect (deps `[query]`) re-runs a *search* fetch only
 *           when the search text changes. This is the payoff lesson of the
 *           whole dependency-array arc (d6-t1 empty deps -> d6-t3
 *           `[todoId]` deps -> d6-t4 `[refreshKey]` deps): different
 *           reactive values changing for different reasons belong in
 *           **separate** effects, each with the dependency array that
 *           matches *only* what it reads — not one mega-effect trying to
 *           react to everything at once.
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

    // ------------------------------------------------------------------
    // d6-t4 — manual refetch via a refreshKey dependency, not just mount
    // ------------------------------------------------------------------
    {
      id: "d6-t4",
      title: "Refresh todos on demand with a refreshKey dependency",
      description:
        "## Refresh todos on demand with a refreshKey dependency\n\n" +
        "Every effect so far has used `[]` (run once, on mount) or " +
        "`[todoId]` (re-run when a *prop* changes). Now put a non-empty " +
        "dependency array to work for a value **you** control: a " +
        '"Refresh" button that re-runs the exact same `/api/todos` fetch ' +
        "as d6-t1, on demand.\n\n" +
        "The trick: `useEffect` can't be called directly from a click " +
        "handler — effects only run in response to a render where a " +
        "dependency changed. So the click handler doesn't fetch anything " +
        "itself; it just bumps a piece of state, `refreshKey`, and the " +
        "effect's dependency array listens for that bump:\n\n" +
        "```jsx\n" +
        "function App() {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todos, setTodos] = useState([]);\n" +
        "  const [refreshKey, setRefreshKey] = useState(0);\n\n" +
        "  useEffect(() => {\n" +
        "    const controller = new AbortController();\n" +
        '    setStatus("loading");\n\n' +
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
        "  }, [refreshKey]); // re-run whenever Refresh is clicked\n\n" +
        "  function handleRefresh() {\n" +
        "    setRefreshKey((key) => key + 1);\n" +
        "  }\n\n" +
        "  // ... render status/todos, plus a Refresh button calling handleRefresh ...\n" +
        "}\n" +
        "```\n\n" +
        "`refreshKey`'s actual numeric value is never read anywhere except " +
        "the dependency array — its only job is to *change* every time the " +
        "user wants fresh data, which is exactly the signal `useEffect` " +
        "needs to know it should run again. This is the same `[todoId]` " +
        "mechanics as d6-t3, just driven by a click instead of a prop.\n\n" +
        "**Your job:** finish `App.jsx` to match the shape above " +
        "(`refreshKey` state, effect depends on `[refreshKey]`, resets " +
        "`status` to `\"loading\"` at the top of each run, a Refresh " +
        "`<button>` calling `handleRefresh`), AND implement the pure " +
        "helper `nextRefreshKey(current)` in `view.js` — given the current " +
        "`refreshKey` number, returns the next one (`current + 1`), the " +
        "exact update `handleRefresh` applies via `setRefreshKey`.",
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
          "  const [todos, setTodos] = useState([]);\n" +
          "  // TODO: add refreshKey state (useState(0))\n\n" +
          "  useEffect(() => {\n" +
          "    const controller = new AbortController();\n" +
          '    setStatus("loading");\n\n' +
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
          "    // TODO: depend on [refreshKey] instead of []\n" +
          "  }, []);\n\n" +
          "  // TODO: add handleRefresh() that bumps refreshKey via setRefreshKey\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      {/* TODO: add a Refresh button calling handleRefresh */}\n" +
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
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "// TODO: implement nextRefreshKey(current) -> current + 1\n" +
          "export function nextRefreshKey(current) {\n" +
          "}\n",
      },
      hints: [
        "`refreshKey`'s value is never displayed and never inspected — it exists purely so the dependency array has something to notice changing. Any incrementing number works.",
        "`setRefreshKey((key) => key + 1)` is the functional updater form (same pattern as `handleToggle`/`handleAdd` in Day 5) — safer than `setRefreshKey(refreshKey + 1)` if multiple clicks happen quickly.",
        "The effect's dependency array must change from `[]` to `[refreshKey]` — forgetting this means the Refresh button's click updates state but the fetch never re-runs.",
        "`nextRefreshKey` is a one-line increment: `return current + 1;`.",
      ],
      hiddenTests: [
        {
          filename: "next-refresh-key.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { nextRefreshKey } from "./view.js";\n\n' +
            'test("nextRefreshKey increments from 0", () => {\n' +
            "  expect(nextRefreshKey(0)).toBe(1);\n" +
            "});\n\n" +
            'test("nextRefreshKey increments from an arbitrary current value", () => {\n' +
            "  expect(nextRefreshKey(7)).toBe(8);\n" +
            "});\n",
        },
        {
          filename: "refresh-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx has refreshKey state initialized to 0", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/useState\\(\\s*0\\s*\\)/.test(jsx)).toBe(true);\n" +
            "  expect(/refreshKey/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx\'s fetch effect depends on [refreshKey]", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/\\},\\s*\\[\\s*refreshKey\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx defines handleRefresh that bumps refreshKey via setRefreshKey", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleRefresh/.test(jsx)).toBe(true);\n" +
            "  expect(/setRefreshKey\\(/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx renders a button wired to handleRefresh", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/onClick=\\{handleRefresh\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx still resets status to loading at the top of the effect", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/useEffect\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]{0,80}?setStatus\\(\\s*[\"']loading[\"']\\s*\\)/.test(jsx)).toBe(\n" +
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
        "App.jsx":
          'import { useState, useEffect } from "react";\n\n' +
          "export default function App() {\n" +
          '  const [status, setStatus] = useState("loading");\n' +
          "  const [todos, setTodos] = useState([]);\n" +
          "  const [refreshKey, setRefreshKey] = useState(0);\n\n" +
          "  useEffect(() => {\n" +
          "    const controller = new AbortController();\n" +
          '    setStatus("loading");\n\n' +
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
          "  }, [refreshKey]);\n\n" +
          "  function handleRefresh() {\n" +
          "    setRefreshKey((key) => key + 1);\n" +
          "  }\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <button onClick={handleRefresh}>Refresh</button>\n" +
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
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "export function nextRefreshKey(current) {\n" +
          "  return current + 1;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm refreshKey is used only as a dependency-array trigger (its value isn't " +
        "otherwise displayed), that clicking Refresh calls setRefreshKey via the " +
        "functional updater form, and that the effect's [refreshKey] dependency array " +
        "is what actually causes the re-fetch — not a direct fetch call inside the click " +
        "handler.",
    },

    // ------------------------------------------------------------------
    // d6-t5 — polling with setInterval, cleaned up with clearInterval
    // ------------------------------------------------------------------
    {
      id: "d6-t5",
      title: "Poll /api/todos on an interval, cleaned up with clearInterval",
      description:
        "## Poll /api/todos on an interval, cleaned up with clearInterval\n\n" +
        "d6-t2's cleanup cancelled a single in-flight fetch. This task " +
        "cleans up a **repeating** side effect instead: a `setInterval` " +
        "that re-fetches `/api/todos` every few seconds, so the list stays " +
        "fresh without the user clicking Refresh.\n\n" +
        "```jsx\n" +
        "function App() {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todos, setTodos] = useState([]);\n\n" +
        "  useEffect(() => {\n" +
        "    function loadTodos() {\n" +
        '      fetch("/api/todos")\n' +
        "        .then((response) => {\n" +
        '          if (!response.ok) throw new Error("bad response");\n' +
        "          return response.json();\n" +
        "        })\n" +
        "        .then((data) => {\n" +
        "          setTodos(data);\n" +
        '          setStatus("ready");\n' +
        "        })\n" +
        "        .catch(() => {\n" +
        '          setStatus("error");\n' +
        "        });\n" +
        "    }\n\n" +
        "    loadTodos(); // fetch immediately on mount too, don't wait for the first tick\n" +
        "    const intervalId = setInterval(loadTodos, 5000);\n\n" +
        "    return () => {\n" +
        "      clearInterval(intervalId);\n" +
        "    };\n" +
        "  }, []);\n\n" +
        "  // ... render status/todos as usual ...\n" +
        "}\n" +
        "```\n\n" +
        "Without the cleanup function calling `clearInterval`, the timer " +
        "keeps firing every 5 seconds **forever** — even after the " +
        "component unmounts — silently calling `setState` on a component " +
        "that no longer exists (React logs a warning for exactly this) and " +
        "wasting a network request every tick. `clearInterval(intervalId)` " +
        "in the cleanup function stops the timer the instant the effect " +
        "would otherwise re-run or the component unmounts — the same " +
        "cleanup mechanism as d6-t2's `controller.abort()`, just aimed at " +
        "a different kind of ongoing work (a repeating timer instead of a " +
        "single fetch).\n\n" +
        "**Your job:** wire the `setInterval` + `clearInterval` shape " +
        "above into `App.jsx` (fetch immediately on mount, *and* set up an " +
        "interval that repeats the same fetch every 5000ms, cleaned up via " +
        "`clearInterval`), AND implement the pure helper " +
        "`pollIntervalMs(seconds)` in `view.js` — given a poll interval " +
        "expressed in whole seconds, returns the equivalent number of " +
        "milliseconds `setInterval` expects (`seconds * 1000`).",
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
          "    function loadTodos() {\n" +
          '      fetch("/api/todos")\n' +
          "        .then((response) => {\n" +
          '          if (!response.ok) throw new Error("bad response");\n' +
          "          return response.json();\n" +
          "        })\n" +
          "        .then((data) => {\n" +
          "          setTodos(data);\n" +
          '          setStatus("ready");\n' +
          "        })\n" +
          "        .catch(() => {\n" +
          '          setStatus("error");\n' +
          "        });\n" +
          "    }\n\n" +
          "    loadTodos();\n" +
          "    // TODO: setInterval(loadTodos, 5000), keep the id, and return a\n" +
          "    // cleanup function that calls clearInterval(intervalId).\n" +
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
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "export function nextRefreshKey(current) {\n" +
          "  return current + 1;\n" +
          "}\n\n" +
          "// TODO: implement pollIntervalMs(seconds) -> seconds * 1000\n" +
          "export function pollIntervalMs(seconds) {\n" +
          "}\n",
      },
      hints: [
        "`setInterval` returns an id — capture it in a variable (e.g. `const intervalId = setInterval(loadTodos, 5000);`) so the cleanup function can reference it in its closure.",
        "The cleanup function is `return () => { clearInterval(intervalId); };` — same shape as d6-t2's `controller.abort()`, just calling `clearInterval` instead.",
        "Call `loadTodos()` once immediately, outside/before the `setInterval` call, so the first render doesn't sit in a loading state for the full 5 seconds waiting for the first tick.",
        "`pollIntervalMs` is a one-line multiplication: `return seconds * 1000;`.",
      ],
      hiddenTests: [
        {
          filename: "poll-interval-ms.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { pollIntervalMs } from "./view.js";\n\n' +
            'test("pollIntervalMs converts 5 seconds to 5000ms", () => {\n' +
            "  expect(pollIntervalMs(5)).toBe(5000);\n" +
            "});\n\n" +
            'test("pollIntervalMs converts 1 second to 1000ms", () => {\n' +
            "  expect(pollIntervalMs(1)).toBe(1000);\n" +
            "});\n\n" +
            'test("pollIntervalMs converts 30 seconds to 30000ms", () => {\n' +
            "  expect(pollIntervalMs(30)).toBe(30000);\n" +
            "});\n",
        },
        {
          filename: "polling-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx calls loadTodos immediately, then sets up a 5000ms interval", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/loadTodos\\(\\s*\\)\\s*;/.test(jsx)).toBe(true);\n" +
            "  expect(/setInterval\\(\\s*loadTodos\\s*,\\s*5000\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx\'s effect returns a cleanup function that calls clearInterval", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/return\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?clearInterval\\([\\s\\S]*?\\)[\\s\\S]*?\\}/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx stores the setInterval id in a variable used by clearInterval", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/const\\s+(\\w+)\\s*=\\s*setInterval/.test(jsx)).toBe(true);\n" +
            "  const match = jsx.match(/const\\s+(\\w+)\\s*=\\s*setInterval/);\n" +
            "  const idName = match ? match[1] : null;\n" +
            "  expect(idName).not.toBeNull();\n" +
            "  expect(jsx.includes(`clearInterval(${idName})`)).toBe(true);\n" +
            "});\n\n" +
            'test("the polling effect still has an empty dependency array", async () => {\n' +
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
          "    function loadTodos() {\n" +
          '      fetch("/api/todos")\n' +
          "        .then((response) => {\n" +
          '          if (!response.ok) throw new Error("bad response");\n' +
          "          return response.json();\n" +
          "        })\n" +
          "        .then((data) => {\n" +
          "          setTodos(data);\n" +
          '          setStatus("ready");\n' +
          "        })\n" +
          "        .catch(() => {\n" +
          '          setStatus("error");\n' +
          "        });\n" +
          "    }\n\n" +
          "    loadTodos();\n" +
          "    const intervalId = setInterval(loadTodos, 5000);\n\n" +
          "    return () => {\n" +
          "      clearInterval(intervalId);\n" +
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
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "export function nextRefreshKey(current) {\n" +
          "  return current + 1;\n" +
          "}\n\n" +
          "export function pollIntervalMs(seconds) {\n" +
          "  return seconds * 1000;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm the effect fetches immediately on mount (not waiting for the first " +
        "interval tick), sets up setInterval with the loadTodos function, stores the " +
        "interval id, and returns a cleanup function that calls clearInterval on that " +
        "same id — the repeating-timer counterpart to d6-t2's AbortController cleanup.",
    },

    // ------------------------------------------------------------------
    // d6-t6 — two independent effects, two independent dependency arrays
    // ------------------------------------------------------------------
    {
      id: "d6-t6",
      title: "Split mount-load and search into two independent effects",
      description:
        "## Split mount-load and search into two independent effects\n\n" +
        "Last Day 6 task: a component that both loads the full todo list " +
        "once on mount **and** searches todos by title as the user types, " +
        "hitting `GET /api/todos?q=<query>`. The temptation is to cram " +
        "both behaviors into one `useEffect` — resist it. These are two " +
        "**independent** reactive concerns (\"load once\" vs. \"re-search " +
        "when `query` changes\") and belong in two **separate** effects, " +
        "each with only the dependency array it actually needs:\n\n" +
        "```jsx\n" +
        "function App() {\n" +
        '  const [status, setStatus] = useState("loading");\n' +
        "  const [todos, setTodos] = useState([]);\n" +
        '  const [query, setQuery] = useState("");\n' +
        "  const [results, setResults] = useState([]);\n\n" +
        "  // Effect 1: load the full list once, on mount.\n" +
        "  useEffect(() => {\n" +
        "    const controller = new AbortController();\n" +
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
        "      });\n" +
        "    return () => controller.abort();\n" +
        "  }, []); // <- runs once\n\n" +
        "  // Effect 2: re-search whenever `query` changes.\n" +
        "  useEffect(() => {\n" +
        '    if (query === "") {\n' +
        "      setResults([]);\n" +
        "      return;\n" +
        "    }\n" +
        "    const controller = new AbortController();\n" +
        "    fetch(`/api/todos?q=${encodeURIComponent(query)}`, {\n" +
        "      signal: controller.signal,\n" +
        "    })\n" +
        "      .then((response) => response.json())\n" +
        "      .then((data) => setResults(data))\n" +
        "      .catch((err) => {\n" +
        '        if (err.name === "AbortError") return;\n' +
        "      });\n" +
        "    return () => controller.abort();\n" +
        "  }, [query]); // <- runs whenever query changes\n\n" +
        "  // ... render todos/results/status ...\n" +
        "}\n" +
        "```\n\n" +
        "Neither effect knows the other exists. Effect 1's `[]` deps say " +
        "\"I only care about mount.\" Effect 2's `[query]` deps say \"I " +
        "only care about `query` changing\" — and it correctly cleans up " +
        "*its own* previous in-flight search (same `[todoId]` mechanics as " +
        "d6-t3) every time `query` changes, completely independent of " +
        "whatever effect 1 is doing. Trying to force this into one effect " +
        "would mean either re-running the full-list fetch every keystroke " +
        "(wasteful and wrong) or reaching for awkward manual guards to " +
        "skip parts of a single effect body — the dependency array is " +
        "already the tool for expressing \"these two things change for " +
        "different reasons and should run independently.\"\n\n" +
        "**Your job:** build `App.jsx` matching the two-effects shape " +
        "above (effect 1 deps `[]` loads `todos`, effect 2 deps `[query]` " +
        "loads `results` and resets to an empty array when `query` is " +
        "empty), AND implement the pure helper `buildSearchUrl(query)` in " +
        "`view.js` — given a search string, returns the endpoint effect 2 " +
        "fetches: `/api/todos?q=` followed by the **URL-encoded** query " +
        "(use `encodeURIComponent`).",
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
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [query, setQuery] = useState("");\n' +
          "  const [results, setResults] = useState([]);\n\n" +
          "  // TODO: Effect 1 — load the full list once, on mount (deps []).\n" +
          "  // Same fetch-on-mount + AbortController + cleanup shape as d6-t2.\n\n" +
          "  // TODO: Effect 2 — re-search whenever `query` changes (deps [query]).\n" +
          '  // If query is "", setResults([]) and skip fetching. Otherwise fetch\n' +
          "  // `/api/todos?q=${encodeURIComponent(query)}`, setResults(data) on\n" +
          "  // success, ignore AbortError, clean up the previous request via\n" +
          "  // AbortController + cleanup (same shape as effect 1 / d6-t3).\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <input\n" +
          "        value={query}\n" +
          "        onChange={(event) => setQuery(event.target.value)}\n" +
          "      />\n" +
          "      <ul>\n" +
          "        {todos.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-item">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "      <ul>\n" +
          "        {results.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-result">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "export function nextRefreshKey(current) {\n" +
          "  return current + 1;\n" +
          "}\n\n" +
          "export function pollIntervalMs(seconds) {\n" +
          "  return seconds * 1000;\n" +
          "}\n\n" +
          "// TODO: implement buildSearchUrl(query) -> \"/api/todos?q=\" + encodeURIComponent(query)\n" +
          "export function buildSearchUrl(query) {\n" +
          "}\n",
      },
      hints: [
        "Write two completely separate `useEffect(() => { ... }, [...])` calls — do not try to merge the mount-load and the search into one effect body with an `if` guard.",
        "Effect 1's dependency array is `[]` (same shape as d6-t1/d6-t2); effect 2's is `[query]` (same shape as d6-t3's `[todoId]`, just a different reactive value).",
        'Guard the empty-query case at the *top* of effect 2, before creating an AbortController or calling fetch: `if (query === "") { setResults([]); return; }`.',
        '`buildSearchUrl` is a one-line template string: `return "/api/todos?q=" + encodeURIComponent(query);` — use `encodeURIComponent` so special characters in the search text don\'t break the URL.',
      ],
      hiddenTests: [
        {
          filename: "build-search-url.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { buildSearchUrl } from "./view.js";\n\n' +
            'test("buildSearchUrl builds the search endpoint for a plain query", () => {\n' +
            '  expect(buildSearchUrl("milk")).toBe("/api/todos?q=milk");\n' +
            "});\n\n" +
            'test("buildSearchUrl URL-encodes special characters", () => {\n' +
            '  expect(buildSearchUrl("buy milk & eggs")).toBe(\n' +
            '    "/api/todos?q=buy%20milk%20%26%20eggs",\n' +
            "  );\n" +
            "});\n\n" +
            'test("buildSearchUrl handles an empty query", () => {\n' +
            '  expect(buildSearchUrl("")).toBe("/api/todos?q=");\n' +
            "});\n",
        },
        {
          filename: "two-effects-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("App.jsx has exactly two useEffect calls", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  const matches = jsx.match(/useEffect\\(/g) ?? [];\n" +
            "  expect(matches.length).toBe(2);\n" +
            "});\n\n" +
            'test("one effect has an empty dependency array (mount-load)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/\\},\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("the other effect depends on [query] (search)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/\\},\\s*\\[\\s*query\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx fetches the mount-load endpoint and the search endpoint separately", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/fetch\\(\\s*["\']\\/api\\/todos["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/\\/api\\/todos\\?q=\\$\\{encodeURIComponent\\(query\\)\\}/.test(jsx)).toBe(\n" +
            "    true,\n" +
            "  );\n" +
            "});\n\n" +
            'test("App.jsx resets results to empty when query is empty", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/query\\s*===\\s*["\']["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/setResults\\(\\s*\\[\\s*\\]\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("both effects use AbortController + cleanup", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  const controllerCount = (jsx.match(/new AbortController\\(\\s*\\)/g) ?? []).length;\n" +
            "  expect(controllerCount).toBe(2);\n" +
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
          "  const [todos, setTodos] = useState([]);\n" +
          '  const [query, setQuery] = useState("");\n' +
          "  const [results, setResults] = useState([]);\n\n" +
          "  useEffect(() => {\n" +
          "    const controller = new AbortController();\n" +
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
          "  useEffect(() => {\n" +
          '    if (query === "") {\n' +
          "      setResults([]);\n" +
          "      return;\n" +
          "    }\n\n" +
          "    const controller = new AbortController();\n" +
          "    fetch(`/api/todos?q=${encodeURIComponent(query)}`, {\n" +
          "      signal: controller.signal,\n" +
          "    })\n" +
          "      .then((response) => response.json())\n" +
          "      .then((data) => {\n" +
          "        setResults(data);\n" +
          "      })\n" +
          "      .catch((err) => {\n" +
          '        if (err.name === "AbortError") return;\n' +
          "      });\n\n" +
          "    return () => {\n" +
          "      controller.abort();\n" +
          "    };\n" +
          "  }, [query]);\n\n" +
          '  if (status === "loading") {\n' +
          '    return <p className="todo-status">Loading…</p>;\n' +
          "  }\n\n" +
          '  if (status === "error") {\n' +
          '    return <p className="todo-status">Failed to load todos.</p>;\n' +
          "  }\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <input\n" +
          "        value={query}\n" +
          "        onChange={(event) => setQuery(event.target.value)}\n" +
          "      />\n" +
          "      <ul>\n" +
          "        {todos.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-item">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "      <ul>\n" +
          "        {results.map((todo) => (\n" +
          '          <li key={todo.id} className="todo-result">\n' +
          "            {todo.title}\n" +
          "          </li>\n" +
          "        ))}\n" +
          "      </ul>\n" +
          "    </>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function deriveStatus(result) {\n" +
          '  return result.ok ? "ready" : "error";\n' +
          "}\n\n" +
          "export function shouldShowError(errorName) {\n" +
          '  return errorName !== "AbortError";\n' +
          "}\n\n" +
          "export function didTodoIdChange(prevId, nextId) {\n" +
          "  return prevId !== nextId;\n" +
          "}\n\n" +
          "export function nextRefreshKey(current) {\n" +
          "  return current + 1;\n" +
          "}\n\n" +
          "export function pollIntervalMs(seconds) {\n" +
          "  return seconds * 1000;\n" +
          "}\n\n" +
          "export function buildSearchUrl(query) {\n" +
          '  return "/api/todos?q=" + encodeURIComponent(query);\n' +
          "}\n",
      },
      evalPrompt:
        "Confirm the component has exactly two useEffect calls with different " +
        "dependency arrays ([] for the mount-load, [query] for the search), that " +
        "neither effect's logic leaks into the other, and that both independently use " +
        "AbortController + cleanup — demonstrating that separate reactive concerns get " +
        "separate effects rather than one effect trying to branch on everything.",
    },
  ],
};
