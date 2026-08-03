/**
 * Burrow src/course/content — Day 5: Components, Props & State.
 *
 * Build target (SPEC.md §4 / README.md): break the Day 4 monolith — one
 * `App` function doing everything (list rendering, form handling, item
 * markup) — into **reusable pieces**. Same product, same todos array, but
 * now composed from small components that talk to each other only through
 * **props** (data down) and **callbacks** (events up), plus each piece
 * owning only the local state it actually needs.
 *
 * Philosophy: "You can't appreciate the solution until you've felt the
 * problem." Day 4 already removed the manual DOM/reconciliation pain, but
 * it left every concern — the todo item's markup, the list's rendering
 * loop, the add-form's input state — living in one `App` function. That's
 * fine for a to-do list. It stops being fine the moment a real app grows a
 * second screen that needs a `TodoItem`, or a designer wants to restyle
 * just the item markup, or two different lists need the same row look. Day
 * 5 is about giving every recurring "piece of UI" (SPEC.md §3's philosophy
 * — extending it to the component level) its own name, its own props
 * contract, and — where it makes sense — its own local state:
 *
 *   d5-t1 — extract `TodoItem` as its own component that receives a single
 *           `todo` object as a **prop** and renders that one row. This is
 *           the smallest possible "reusable piece": pure data in, JSX out,
 *           no state of its own yet. Establishes the prop-flow vocabulary
 *           (`todo.title`, `todo.id` as `key`) the rest of Day 5 builds on.
 *   d5-t2 — `TodoItem` grows a **toggle-done** interaction: a checkbox that
 *           flips `todo.done`. The done-ness *lives in the parent* (`App`'s
 *           `todos` array is still the single source of truth — same
 *           "state lives where it's shared" lesson Day 2 taught by hand),
 *           so `TodoItem` receives `onToggle` as a **callback prop** and
 *           calls it on change instead of managing its own copy of `done`.
 *           This is "lift state up" in miniature: the child *reports* an
 *           intent, the parent *owns* the truth and re-renders the child
 *           with the new prop.
 *   d5-t3 — a `TodoList` component that owns the array-to-JSX `.map()` +
 *           `key` loop (extracted out of `App`), rendering one `TodoItem`
 *           per todo and forwarding `onToggle` through. `App` becomes a
 *           thin composition root: it owns the `todos` state and renders
 *           `<TodoList todos={todos} onToggleTodo={...} />`. This is
 *           component **composition**: three small, single-purpose pieces
 *           (`App` → `TodoList` → `TodoItem`) instead of one function doing
 *           everything, each provably correct on its own via a pure helper.
 *
 * Hidden tests follow Day 4's proven approach exactly (see day4.ts's doc
 * comment): every hidden test exercises a **pure, dependency-free helper
 * function** (co-authored in a plain `.js` file alongside the JSX, no JSX,
 * no React import) that captures the essential *logic* a component embodies
 * (an item's checkbox-state derivation, the toggle-by-id reducer, the
 * array-to-rendered-keys shape) so `bun test` runs with zero npm installs,
 * zero JSX, zero DOM — same `runHiddenTestsAgainst` machinery as
 * day3-4.test.ts. The React components themselves are reviewed via
 * `evalPrompt` / visually in the running sandbox.
 */

import type { Day } from "../schema.ts";

export const day5: Day = {
  id: "day-5",
  title: "Components, Props & State",
  order: 5,
  tasks: [
    // ------------------------------------------------------------------
    // d5-t1 — extract TodoItem, pass a todo down as a prop
    // ------------------------------------------------------------------
    {
      id: "d5-t1",
      title: "Extract a TodoItem component that takes a todo prop",
      description:
        "## Extract a TodoItem component that takes a todo prop\n\n" +
        "In Day 4's `App.jsx`, the `<li>` markup for a single to-do lived " +
        "inline inside `todos.map(...)`. That's fine for one list, but the " +
        "moment you need that same row rendered somewhere else — a " +
        '"completed" screen, a search results view — you\'d have to copy-' +
        "paste the JSX and keep every copy in sync by hand. Sound " +
        "familiar? That's the same duplication problem Day 2 taught you to " +
        "fear, just one level up.\n\n" +
        "The fix: give the row its own name. Create a `TodoItem` " +
        "component in `TodoItem.jsx` that receives a single **prop** — " +
        "`todo` — and renders exactly the row `App.jsx` used to render " +
        "inline:\n\n" +
        "```jsx\n" +
        "function TodoItem({ todo }) {\n" +
        '  return <li className="todo-item">{todo.title}</li>;\n' +
        "}\n\n" +
        "export default TodoItem;\n" +
        "```\n\n" +
        "Then, in `App.jsx`, use it inside the existing `.map()`:\n\n" +
        "```jsx\n" +
        "<ul>\n" +
        "  {todos.map((todo) => (\n" +
        "    <TodoItem key={todo.id} todo={todo} />\n" +
        "  ))}\n" +
        "</ul>\n" +
        "```\n\n" +
        "Notice: `key` goes on `<TodoItem>` itself (React needs it to " +
        "track list identity across re-renders), while `todo` is the " +
        "**data prop** `TodoItem` actually reads from. `TodoItem` doesn't " +
        "know or care that it's being rendered in a loop — that's `App`'s " +
        "concern, not its own. That separation is the whole point of a " +
        "component: it only needs to know its own inputs (props), nothing " +
        "about where those inputs come from.\n\n" +
        "**Your job:** finish `TodoItem.jsx` (destructure `todo` from " +
        "props, render the `<li className=\"todo-item\">` with " +
        "`todo.title`) and wire it into `App.jsx`'s `.map()` with `key` " +
        "and `todo` props, AND implement the pure helper " +
        "`todoItemLabel(todo)` in `view.js` — given a todo object, it " +
        "should return exactly `todo.title` (the text `TodoItem` renders), " +
        "extracted so the row's *content* logic is testable without " +
        "mounting a component.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "// TODO: destructure `todo` from props and render the same <li> markup\n" +
          "// App.jsx used to render inline: <li className=\"todo-item\">{todo.title}</li>\n" +
          "function TodoItem(props) {\n" +
          "  return null;\n" +
          "}\n\n" +
          "export default TodoItem;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos] = useState([\n" +
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        // TODO: render a <TodoItem> here instead of inline markup.\n" +
          "        // Don't forget key AND the todo prop.\n" +
          "        <li key={todo.id}>{todo.title}</li>\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "// A pure helper extracting TodoItem.jsx's rendered text, so it's\n" +
          "// testable without React or a browser.\n" +
          "export function todoItemLabel(todo) {\n" +
          "  // TODO: implement — return todo.title\n" +
          "}\n",
      },
      hints: [
        "`function TodoItem({ todo }) { ... }` destructures the prop directly in the parameter list — you don't need `props.todo` anywhere if you destructure up front.",
        "The extracted component's JSX should be byte-for-byte the same markup that used to live inline: same tag, same className, same expression.",
        "In `App.jsx`, `key` is required on the element `.map()` produces (`<TodoItem key={todo.id} ... />`), but `key` itself is never read inside `TodoItem` — it's consumed by React's reconciler, not a prop your component receives.",
        "`todoItemLabel` is a one-line passthrough: `return todo.title;` — resist the urge to add extra formatting; it must match the JSX exactly.",
      ],
      hiddenTests: [
        {
          filename: "label.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { todoItemLabel } from "./view.js";\n\n' +
            'test("todoItemLabel returns the todo\'s title", () => {\n' +
            '  expect(todoItemLabel({ id: 1, title: "Buy milk", done: false })).toBe(\n' +
            '    "Buy milk",\n' +
            "  );\n" +
            "});\n\n" +
            'test("todoItemLabel reflects a different todo\'s title", () => {\n' +
            '  expect(todoItemLabel({ id: 2, title: "Walk the dog", done: true })).toBe(\n' +
            '    "Walk the dog",\n' +
            "  );\n" +
            "});\n",
        },
        {
          filename: "component-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoItem.jsx destructures todo from props and renders todo.title", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/\\{\\s*todo\\s*\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/todo\\.title/.test(jsx)).toBe(true);\n" +
            '  expect(/todo-item/.test(jsx)).toBe(true);\n' +
            "});\n\n" +
            'test("TodoItem.jsx is the default export", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/export default TodoItem/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx imports and renders TodoItem with key and todo props", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/import\\s+TodoItem\\s+from\\s+["\']\\.\\/TodoItem\\.jsx["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "  expect(/<TodoItem/.test(jsx)).toBe(true);\n" +
            "  expect(/key=\\{todo\\.id\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/todo=\\{todo\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx no longer inlines the todo-item <li> markup itself", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/<li[^>]*>\\{todo\\.title\\}<\\/li>/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "function TodoItem({ todo }) {\n" +
          '  return <li className="todo-item">{todo.title}</li>;\n' +
          "}\n\n" +
          "export default TodoItem;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos] = useState([\n" +
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem key={todo.id} todo={todo} />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function todoItemLabel(todo) {\n" +
          "  return todo.title;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm TodoItem.jsx is a standalone component that reads only its own `todo` " +
        "prop (no reference to App's internal state, no hardcoded todo data), and that " +
        "App.jsx composes it inside the .map() with both key and todo passed as props.",
    },

    // ------------------------------------------------------------------
    // d5-t2 — toggle-done via a callback prop, state lifted to the parent
    // ------------------------------------------------------------------
    {
      id: "d5-t2",
      title: "Toggle done with a callback prop (lift state up)",
      description:
        "## Toggle done with a callback prop (lift state up)\n\n" +
        "Now let's make `TodoItem` interactive: add a checkbox that marks " +
        "a todo as done. Here's the question that matters: **where does " +
        "`done` live?**\n\n" +
        "It's tempting to give `TodoItem` its own `useState` for whether " +
        "*it* is checked. Don't — if you do, `TodoItem`'s checkbox state " +
        "and `App`'s `todos` array immediately fall out of sync, and " +
        "you're back to Day 2's \"the DOM and the array must always agree\" " +
        "problem, just moved into a component. The todo's `done`-ness is " +
        "**shared data** (a to-do's completion state matters to the whole " +
        "app, not just one row), so it must live where it's shared: in " +
        "`App`'s `todos` state, the single source of truth. This is called " +
        "**lifting state up** — when two pieces of UI need to agree on a " +
        "value, the value lives in their closest common parent, not in " +
        "either child.\n\n" +
        "`TodoItem` doesn't own `done` — it only **reports intent**. Add " +
        "an `onToggle` callback prop:\n\n" +
        "```jsx\n" +
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
        "}\n" +
        "```\n\n" +
        "`TodoItem` doesn't know *how* toggling works — it just calls " +
        "`onToggle(todo.id)` and trusts its parent to handle the rest. In " +
        "`App.jsx`, `handleToggle` updates `todos` immutably (a `.map()` " +
        "that flips `done` only for the matching id, same shape as Day 4's " +
        "`reconcileTodos`):\n\n" +
        "```jsx\n" +
        "function handleToggle(id) {\n" +
        "  setTodos((current) =>\n" +
        "    current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "**Your job:** wire `onToggle` into `TodoItem.jsx` (checkbox with " +
        "`checked={todo.done}` and `onChange={() => onToggle(todo.id)}`), " +
        "add `handleToggle` to `App.jsx` and pass it down as `TodoItem`'s " +
        "`onToggle` prop, AND implement the pure helper `toggleTodoDone" +
        "(todos, id)` in `view.js` — returns a **new** array with the " +
        "`done` field flipped only for the todo whose `id` matches, " +
        "everything else unchanged (must not mutate the input array).",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
          "// TODO: accept an `onToggle` prop and add a checkbox that calls\n" +
          "// onToggle(todo.id) on change. checked should reflect todo.done.\n" +
          "function TodoItem({ todo }) {\n" +
          '  return <li className="todo-item">{todo.title}</li>;\n' +
          "}\n\n" +
          "export default TodoItem;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos, setTodos] = useState([\n" +
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  // TODO: add handleToggle(id) that flips the matching todo's `done`\n" +
          "  // field immutably via setTodos, then pass it to each TodoItem as\n" +
          "  // the onToggle prop.\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem key={todo.id} todo={todo} />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function todoItemLabel(todo) {\n" +
          "  return todo.title;\n" +
          "}\n\n" +
          "// TODO: implement toggleTodoDone(todos, id) -> new array, `done` flipped\n" +
          "// only for the todo whose id matches; do not mutate the input array.\n" +
          "export function toggleTodoDone(todos, id) {\n" +
          "}\n",
      },
      hints: [
        "`TodoItem` should never call `setTodos` or know that `todos` even exists — it only ever calls the `onToggle` function it was handed as a prop, with the one piece of information the parent needs: `todo.id`.",
        '`checked={todo.done}` makes the checkbox a **controlled** input, same idea as Day 4\'s controlled `<input>` — its displayed state always comes from a prop/state value, never from the DOM itself.',
        "`toggleTodoDone` is a one-line `.map()`: `return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));` — spread the matching todo to flip only `done`, leave every other todo's object reference untouched.",
        "`handleToggle` in App.jsx should call the functional `setTodos((current) => ...)` updater form (same pattern as Day 4's optimistic add), applying the same toggle logic as `toggleTodoDone`.",
      ],
      hiddenTests: [
        {
          filename: "toggle.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { toggleTodoDone } from "./view.js";\n\n' +
            'test("toggleTodoDone flips done for the matching id, false to true", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: false },\n' +
            "  ];\n" +
            "  const result = toggleTodoDone(todos, 1);\n" +
            "  expect(result).toEqual([\n" +
            '    { id: 1, title: "A", done: true },\n' +
            '    { id: 2, title: "B", done: false },\n' +
            "  ]);\n" +
            "});\n\n" +
            'test("toggleTodoDone flips done for the matching id, true to false", () => {\n' +
            '  const todos = [{ id: 5, title: "C", done: true }];\n' +
            "  const result = toggleTodoDone(todos, 5);\n" +
            '  expect(result).toEqual([{ id: 5, title: "C", done: false }]);\n' +
            "});\n\n" +
            'test("toggleTodoDone leaves non-matching todos untouched", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: true },\n' +
            "  ];\n" +
            "  const result = toggleTodoDone(todos, 999);\n" +
            "  expect(result).toEqual(todos);\n" +
            "});\n\n" +
            'test("toggleTodoDone does not mutate the original array", () => {\n' +
            '  const todos = [{ id: 1, title: "A", done: false }];\n' +
            "  const original = JSON.parse(JSON.stringify(todos));\n" +
            "  toggleTodoDone(todos, 1);\n" +
            "  expect(todos).toEqual(original);\n" +
            "});\n",
        },
        {
          filename: "toggle-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoItem.jsx accepts an onToggle prop and wires a checkbox to it", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/onToggle/.test(jsx)).toBe(true);\n" +
            '  expect(/type=["\']checkbox["\']/.test(jsx)).toBe(true);\n' +
            "  expect(/checked=\\{todo\\.done\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onToggle\\(\\s*todo\\.id\\s*\\)/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx defines handleToggle and updates todos via setTodos", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/function handleToggle/.test(jsx)).toBe(true);\n" +
            "  expect(/setTodos\\(/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx passes onToggle down to TodoItem", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/onToggle=\\{handleToggle\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoItem.jsx still has no useState of its own for done-ness", async () => {\n' +
            '  const jsx = await Bun.file("TodoItem.jsx").text();\n' +
            "  expect(/useState/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
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
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos, setTodos] = useState([\n" +
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  function handleToggle(id) {\n" +
          "    setTodos((current) =>\n" +
          "      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
          "    );\n" +
          "  }\n\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function todoItemLabel(todo) {\n" +
          "  return todo.title;\n" +
          "}\n\n" +
          "export function toggleTodoDone(todos, id) {\n" +
          "  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm TodoItem never manages its own done-state (no useState for it) and only " +
        "calls the onToggle prop with the todo's id; confirm App.jsx owns the todos " +
        "array and updates it immutably via setTodos inside handleToggle (state lifted " +
        "to the closest common parent).",
    },

    // ------------------------------------------------------------------
    // d5-t3 — TodoList composition: App -> TodoList -> TodoItem
    // ------------------------------------------------------------------
    {
      id: "d5-t3",
      title: "Compose a TodoList component (App -> TodoList -> TodoItem)",
      description:
        "## Compose a TodoList component (App -> TodoList -> TodoItem)\n\n" +
        "One more extraction: the `.map()` loop that turns an array of " +
        "todos into a list of `<TodoItem>`s is itself a reusable piece — " +
        "it doesn't need to live inside `App`. Pull it out into its own " +
        "`TodoList` component:\n\n" +
        "```jsx\n" +
        "function TodoList({ todos, onToggleTodo }) {\n" +
        "  return (\n" +
        "    <ul>\n" +
        "      {todos.map((todo) => (\n" +
        "        <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} />\n" +
        "      ))}\n" +
        "    </ul>\n" +
        "  );\n" +
        "}\n" +
        "```\n\n" +
        "`App.jsx` shrinks down to what it should always have been: a " +
        "**composition root** that owns the shared state and wires " +
        "components together, with none of the per-row rendering detail:\n\n" +
        "```jsx\n" +
        "export default function App() {\n" +
        "  const [todos, setTodos] = useState([...]);\n\n" +
        "  function handleToggle(id) { /* same as d5-t2 */ }\n\n" +
        "  return <TodoList todos={todos} onToggleTodo={handleToggle} />;\n" +
        "}\n" +
        "```\n\n" +
        "Look at what each piece knows now: `TodoItem` knows how to render " +
        "*one* todo and report a toggle. `TodoList` knows how to turn an " +
        "*array* of todos into a list of `TodoItem`s (the `key` prop lives " +
        "here — this is the layer that owns the loop, so it's the layer " +
        "responsible for giving React stable identities). `App` knows " +
        "*where the data lives* and wires the two together. None of them " +
        "know about each other's internals — only about the props contract " +
        "between them. That's component composition: complex UI built from " +
        "small, independently-understandable pieces, exactly the \"reusable " +
        "pieces\" SPEC.md §4 asks Day 5 to demonstrate.\n\n" +
        "**Your job:** create `TodoList.jsx` exactly as shown above, update " +
        "`App.jsx` to render `<TodoList todos={todos} onToggleTodo=" +
        "{handleToggle} />` instead of mapping directly, AND implement the " +
        "pure helper `todoKeys(todos)` in `view.js` — given an array of " +
        "todos, returns an array of their `id`s in the same order (the " +
        "exact sequence of `key` values `TodoList`'s `.map()` produces), so " +
        "the list's key-stability logic is testable without rendering " +
        "anything.",
      starterCode: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
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
          "// TODO: create TodoList({ todos, onToggleTodo }) that maps todos to\n" +
          "// <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} /> inside a <ul>.\n" +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "function TodoList(props) {\n" +
          "  return null;\n" +
          "}\n\n" +
          "export default TodoList;\n",
        "App.jsx":
          'import { useState } from "react";\n' +
          'import TodoItem from "./TodoItem.jsx";\n\n' +
          "export default function App() {\n" +
          "  const [todos, setTodos] = useState([\n" +
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  function handleToggle(id) {\n" +
          "    setTodos((current) =>\n" +
          "      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
          "    );\n" +
          "  }\n\n" +
          "  // TODO: import TodoList and render <TodoList todos={todos}\n" +
          "  // onToggleTodo={handleToggle} /> instead of mapping directly here.\n" +
          "  return (\n" +
          "    <ul>\n" +
          "      {todos.map((todo) => (\n" +
          "        <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />\n" +
          "      ))}\n" +
          "    </ul>\n" +
          "  );\n" +
          "}\n",
        "view.js":
          "export function todoItemLabel(todo) {\n" +
          "  return todo.title;\n" +
          "}\n\n" +
          "export function toggleTodoDone(todos, id) {\n" +
          "  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));\n" +
          "}\n\n" +
          "// TODO: implement todoKeys(todos) -> array of todo ids, same order\n" +
          "export function todoKeys(todos) {\n" +
          "}\n",
      },
      hints: [
        "`TodoList` should import `TodoItem`, not `App` — components import the pieces one level below them in the composition tree, not their own parent.",
        "`App.jsx` no longer needs to import `TodoItem` at all once `TodoList` owns that — only `TodoList.jsx` should import it.",
        "`onToggleTodo` is just a renamed pass-through: `TodoList` receives it as a prop and forwards it unchanged as `TodoItem`'s `onToggle` prop — it doesn't need to call it itself.",
        "`todoKeys` is a one-line `.map()`: `return todos.map((t) => t.id);` — this mirrors exactly what value ends up in each rendered element's `key`.",
      ],
      hiddenTests: [
        {
          filename: "keys.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n' +
            'import { todoKeys } from "./view.js";\n\n' +
            'test("todoKeys returns the ids in order", () => {\n' +
            "  const todos = [\n" +
            '    { id: 1, title: "A", done: false },\n' +
            '    { id: 2, title: "B", done: false },\n' +
            '    { id: 3, title: "C", done: true },\n' +
            "  ];\n" +
            "  expect(todoKeys(todos)).toEqual([1, 2, 3]);\n" +
            "});\n\n" +
            'test("todoKeys returns an empty array for an empty list", () => {\n' +
            "  expect(todoKeys([])).toEqual([]);\n" +
            "});\n\n" +
            'test("todoKeys works with non-numeric ids too", () => {\n' +
            '  const todos = [{ id: "temp-1", title: "A", done: false }];\n' +
            '  expect(todoKeys(todos)).toEqual(["temp-1"]);\n' +
            "});\n",
        },
        {
          filename: "composition-shape.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("TodoList.jsx imports TodoItem and maps todos to it with key + onToggle", async () => {\n' +
            '  const jsx = await Bun.file("TodoList.jsx").text();\n' +
            '  expect(/import\\s+TodoItem\\s+from\\s+["\']\\.\\/TodoItem\\.jsx["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "  expect(/todos\\.map/.test(jsx)).toBe(true);\n" +
            "  expect(/key=\\{todo\\.id\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onToggle=\\{onToggleTodo\\}/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("TodoList.jsx is the default export", async () => {\n' +
            '  const jsx = await Bun.file("TodoList.jsx").text();\n' +
            "  expect(/export default TodoList/.test(jsx)).toBe(true);\n" +
            "});\n\n" +
            'test("App.jsx renders TodoList with todos and onToggleTodo props, not a raw .map", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            '  expect(/import\\s+TodoList\\s+from\\s+["\']\\.\\/TodoList\\.jsx["\']/.test(jsx)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            "  expect(/<TodoList/.test(jsx)).toBe(true);\n" +
            "  expect(/todos=\\{todos\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/onToggleTodo=\\{handleToggle\\}/.test(jsx)).toBe(true);\n" +
            "  expect(/todos\\.map/.test(jsx)).toBe(false);\n" +
            "});\n\n" +
            'test("App.jsx no longer imports TodoItem directly (TodoList owns that now)", async () => {\n' +
            '  const jsx = await Bun.file("App.jsx").text();\n' +
            "  expect(/import\\s+TodoItem\\s+from/.test(jsx)).toBe(false);\n" +
            "});\n",
        },
      ],
      solution: {
        "package.json":
          "{\n" +
          '  "name": "day5-app",\n' +
          '  "private": true,\n' +
          '  "dependencies": {\n' +
          '    "react": "^18.3.1",\n' +
          '    "react-dom": "^18.3.1"\n' +
          "  }\n" +
          "}\n",
        "TodoItem.jsx":
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
          '    { id: 1, title: "Learn components", done: false },\n' +
          '    { id: 2, title: "Learn props", done: false },\n' +
          '    { id: 3, title: "Learn state", done: false },\n' +
          "  ]);\n\n" +
          "  function handleToggle(id) {\n" +
          "    setTodos((current) =>\n" +
          "      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),\n" +
          "    );\n" +
          "  }\n\n" +
          "  return <TodoList todos={todos} onToggleTodo={handleToggle} />;\n" +
          "}\n",
        "view.js":
          "export function todoItemLabel(todo) {\n" +
          "  return todo.title;\n" +
          "}\n\n" +
          "export function toggleTodoDone(todos, id) {\n" +
          "  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));\n" +
          "}\n\n" +
          "export function todoKeys(todos) {\n" +
          "  return todos.map((t) => t.id);\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm the composition tree is App -> TodoList -> TodoItem (App owns state and " +
        "wires TodoList's props, TodoList owns the .map()/key loop and forwards " +
        "onToggleTodo, TodoItem only knows its own todo + onToggle), with no component " +
        "reaching past its immediate child/parent's props contract.",
    },
  ],
};
