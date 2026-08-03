/**
 * Burrow src/course/content — Day 1: HTML, CSS & the DOM.
 *
 * Build target (SPEC.md §4 / README.md): a **static** to-do list. No
 * JavaScript interactivity yet — that's Day 2. Day 1 is entirely about
 * structure (semantic HTML) and presentation (CSS), plus a first, gentle
 * introduction to *reading* the DOM (not yet mutating it).
 *
 * Philosophy: "You can't appreciate the solution until you've felt the
 * problem." Day 1 has no problem to feel yet — it's the calm before Day 2's
 * event-handling and Day 3's async chaos. Keep it beginner-friendly, one
 * concept at a time:
 *
 *   d1-t1 — semantic HTML structure for a to-do list (no JS, no CSS reqs)
 *   d1-t2 — CSS styling of that structure (visual polish, class-based hooks)
 *   d1-t3 — reading the DOM: a small script that *counts* list items and
 *           reports it into the page, without adding/removing/toggling
 *           anything (that's Day 2). Plants the seam Day 2 will build on.
 *   d1-t4 — accessible form markup: a `<label for>` + `<input>` pair for
 *           adding a future to-do (still static — no submit handler, no
 *           JS). Plants the exact markup Day 2's d2-t1 wires up live.
 *   d1-t5 — CSS layout with flexbox: lay the `.todo-item` row out with
 *           `display: flex` so text and a (static, unwired) checkbox sit on
 *           one line, plus a `.todo-item.done` rule for strikethrough text
 *           — the same visual state Day 2's toggle task will drive live.
 *   d1-t6 — reading the DOM further: `data-*` attributes and traversing
 *           from a single element (`firstElementChild`/`lastElementChild`)
 *           to report the first and last to-do's text into the page,
 *           deepening the "read, don't mutate" DOM skill from d1-t3.
 *
 * Tests are authored as plain string/regex assertions against the file
 * contents (Bun's `bun:test`, no DOM library dependency — see COMPAT.md /
 * SPEC.md §1 "Known constraints": Bun-native, no jsdom in package.json).
 */

import type { Day } from "../schema.ts";

export const day1: Day = {
  id: "day-1",
  title: "HTML, CSS & the DOM",
  order: 1,
  tasks: [
    // ------------------------------------------------------------------
    // d1-t1 — semantic HTML structure
    // ------------------------------------------------------------------
    {
      id: "d1-t1",
      title: "Build the to-do list markup",
      description:
        "## Build the to-do list markup\n\n" +
        "Every app starts as HTML. Before we write a single line of JavaScript, " +
        "let's build the **structure** of a to-do list.\n\n" +
        "Open `index.html`. It has a mostly-empty `<body>`. Your job:\n\n" +
        "1. Add an `<h1>` with the text `My To-Dos` somewhere in the `<body>`.\n" +
        "2. Add a `<ul>` element with `id=\"todo-list\"`.\n" +
        "3. Inside that `<ul>`, add **exactly three** `<li>` elements, each " +
        "   with `class=\"todo-item\"`, containing these three tasks (in this " +
        "   order):\n" +
        "   - `Learn HTML`\n" +
        "   - `Learn CSS`\n" +
        "   - `Learn the DOM`\n\n" +
        "**Why a `<ul>`?** A to-do list *is* a list — screen readers, browsers, " +
        "and CSS all understand `<ul>`/`<li>` as \"a group of items\" for free. " +
        "We get that meaning for nothing by picking the right tag.\n\n" +
        "No CSS or JavaScript needed for this task — just the HTML skeleton. " +
        "We'll style it next.",
      starterCode: {
        "index.html":
          "<!doctype html>\n" +
          '<html lang="en">\n' +
          "  <head>\n" +
          '    <meta charset="utf-8" />\n' +
          "    <title>My To-Do List</title>\n" +
          "  </head>\n" +
          "  <body>\n" +
          "    <!-- TODO: add an <h1>My To-Dos</h1> -->\n\n" +
          "    <!-- TODO: add a <ul id=\"todo-list\"> with three <li class=\"todo-item\"> -->\n" +
          "  </body>\n" +
          "</html>\n",
      },
      hints: [
        "The `<h1>` and `<ul>` can go directly inside `<body>`, in any order relative to each other, but the `<h1>` reads better first.",
        'The `<ul>` needs `id="todo-list"` exactly — the test looks for that id.',
        'Each `<li>` needs `class="todo-item"` exactly, and there must be exactly three of them.',
        "The three `<li>` texts must be exactly: `Learn HTML`, `Learn CSS`, `Learn the DOM` — in that order.",
      ],
      hiddenTests: [
        {
          filename: "markup.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("has an h1 that says My To-Dos", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            "  const match = html.match(/<h1[^>]*>([^<]*)<\\/h1>/i);\n" +
            '  expect(match?.[1]?.trim()).toBe("My To-Dos");\n' +
            "});\n\n" +
            'test("has a <ul id=\\"todo-list\\">", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  expect(/<ul[^>]*\\bid=["\']todo-list["\'][^>]*>/i.test(html)).toBe(true);\n' +
            "});\n\n" +
            'test("has exactly three .todo-item <li> elements in order", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const liRegex = /<li[^>]*\\bclass=["\']todo-item["\'][^>]*>([^<]*)<\\/li>/gi;\n' +
            "  const texts = [...html.matchAll(liRegex)].map((m) => m[1]!.trim());\n" +
            "  expect(texts).toEqual([\"Learn HTML\", \"Learn CSS\", \"Learn the DOM\"]);\n" +
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
          "  </head>\n" +
          "  <body>\n" +
          "    <h1>My To-Dos</h1>\n\n" +
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n" +
          "  </body>\n" +
          "</html>\n",
      },
      evalPrompt:
        "Confirm the learner used semantic <ul>/<li> elements (not <div>s pretending " +
        "to be a list) and did not add any JavaScript or inline styling yet.",
    },

    // ------------------------------------------------------------------
    // d1-t2 — CSS styling
    // ------------------------------------------------------------------
    {
      id: "d1-t2",
      title: "Style the to-do list",
      description:
        "## Style the to-do list\n\n" +
        "Structure without style is hard to look at. Let's give the list some " +
        "visual polish using **CSS**, linked from `index.html` into `style.css`.\n\n" +
        "Starting from the markup you built last time (already included in " +
        "`index.html` for this task), edit `style.css` so that:\n\n" +
        "1. The `<ul id=\"todo-list\">` has `list-style: none;` (no bullet " +
        "   points — we'll draw our own visual treatment) and `padding: 0;`.\n" +
        "2. Every `.todo-item` has a `background-color` set to exactly " +
        "   `rgb(240, 240, 240)` (light gray).\n" +
        "3. Every `.todo-item` has `padding: 10px;`.\n\n" +
        "**Why classes, not tag selectors?** We styled `.todo-item`, not `li`, " +
        "because not every `<li>` on a page is a to-do — a class selector " +
        "says \"style *this specific kind of thing*\", which will matter a lot " +
        "once the page has more than one list on it.\n\n" +
        "`index.html` already links `style.css` in its `<head>` — you only " +
        "need to edit `style.css`.",
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n" +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "/* TODO: remove the ul's bullets and padding */\n" +
          "#todo-list {\n" +
          "}\n\n" +
          "/* TODO: give .todo-item a light gray background and 10px padding */\n" +
          ".todo-item {\n" +
          "}\n",
      },
      hints: [
        "`list-style: none;` removes the bullet, and `padding: 0;` removes the browser's default left indent on `<ul>`.",
        'The background color must be exactly `rgb(240, 240, 240)` — the test checks for that literal string (whitespace-insensitive).',
        "`padding: 10px;` on `.todo-item` gives each row some breathing room.",
        "You're only editing `style.css` — `index.html` already links it.",
      ],
      hiddenTests: [
        {
          filename: "style.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'function ruleBody(css: string, selector: string): string | undefined {\n' +
            "  const escaped = selector.replace(/[.#]/g, \"\\\\$&\");\n" +
            '  const re = new RegExp(escaped + "\\\\s*\\\\{([^}]*)\\\\}", "i");\n' +
            "  return css.match(re)?.[1];\n" +
            "}\n\n" +
            'test("index.html links style.css", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  expect(/<link[^>]*href=["\']style\\.css["\'][^>]*>/i.test(html)).toBe(true);\n' +
            "});\n\n" +
            'test("#todo-list has no bullets and no padding", async () => {\n' +
            '  const css = await Bun.file("style.css").text();\n' +
            '  const body = ruleBody(css, "#todo-list");\n' +
            "  expect(body).toBeDefined();\n" +
            '  expect(/list-style\\s*:\\s*none\\s*;/i.test(body!)).toBe(true);\n' +
            '  expect(/padding\\s*:\\s*0(px)?\\s*;/i.test(body!)).toBe(true);\n' +
            "});\n\n" +
            'test(".todo-item has a light gray background and 10px padding", async () => {\n' +
            '  const css = await Bun.file("style.css").text();\n' +
            '  const body = ruleBody(css, ".todo-item");\n' +
            "  expect(body).toBeDefined();\n" +
            '  expect(/background-color\\s*:\\s*rgb\\(\\s*240\\s*,\\s*240\\s*,\\s*240\\s*\\)\\s*;/i.test(body!)).toBe(\n' +
            "    true,\n" +
            "  );\n" +
            '  expect(/padding\\s*:\\s*10px\\s*;/i.test(body!)).toBe(true);\n' +
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n" +
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
      },
      evalPrompt:
        "Confirm the learner styled the .todo-item class (not the li tag directly) " +
        "and did not change the HTML structure from the previous task.",
    },

    // ------------------------------------------------------------------
    // d1-t3 — reading the DOM (no mutation yet)
    // ------------------------------------------------------------------
    {
      id: "d1-t3",
      title: "Read the DOM: count your to-dos",
      description:
        "## Read the DOM: count your to-dos\n\n" +
        "So far, `index.html` and `style.css` describe what the browser " +
        "*draws*. But the browser also builds a live, in-memory tree of that " +
        "page called the **DOM** (Document Object Model) — and JavaScript can " +
        "*read* it.\n\n" +
        "We are **not** adding, removing, or toggling to-dos yet — that's " +
        "Day 2. Today we only *read*.\n\n" +
        "Create a new file `app.js` (already linked from `index.html`'s " +
        "`<body>` with `<script src=\"app.js\" defer></script>`). In `app.js`:\n\n" +
        "1. Select the `<ul id=\"todo-list\">` using " +
        "   `document.getElementById(\"todo-list\")`.\n" +
        "2. Select all of its `.todo-item` children using " +
        "   `document.querySelectorAll(\".todo-item\")`.\n" +
        "3. Select the element with `id=\"todo-count\"` (already in the " +
        "   markup) and set its `textContent` to a sentence reporting how " +
        "   many to-dos exist, in this exact format: `You have 3 to-dos.` " +
        "   (using the *actual* count, not a hardcoded `3` — though today " +
        "   there happen to be exactly three `<li>`s).\n\n" +
        "**Why this matters:** `document.querySelectorAll` returns a " +
        "`NodeList` — a live *snapshot* of what's on the page right now. " +
        "Reading the DOM is the first half of everything React exists to " +
        "help with. We'll feel why once we start also *writing* to the DOM " +
        "by hand, starting tomorrow.",
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          '    <p id="todo-count"></p>\n\n' +
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
          "// TODO: select #todo-list, count its .todo-item children,\n" +
          "// and set #todo-count's textContent to `You have N to-dos.`\n",
      },
      hints: [
        'Use `document.getElementById("todo-list")` to grab the list, then `.querySelectorAll(".todo-item")` on it (or on `document`) to grab the items.',
        "A NodeList has a `.length` property, just like an array.",
        'Build the message with a template literal: `` `You have ${count} to-dos.` ``.',
        'Set it with `document.getElementById("todo-count").textContent = message;` — don\'t use `innerHTML` for plain text.',
      ],
      hiddenTests: [
        {
          filename: "read-dom.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("app.js reads the todo list length, not a hardcoded number", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/querySelectorAll\\(\\s*["\'`]\\.todo-item["\'`]\\s*\\)/.test(js)).toBe(true);\n' +
            '  expect(/\\.length/.test(js)).toBe(true);\n' +
            "  // must not just hardcode the string learners would get from 3 items\n" +
            '  expect(/textContent\\s*=\\s*["\'`]You have 3 to-dos\\.["\'`]/.test(js)).toBe(false);\n' +
            "});\n\n" +
            'test("app.js targets #todo-count and #todo-list", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/todo-count/.test(js)).toBe(true);\n' +
            '  expect(/todo-list/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("app.js writes textContent (not innerHTML) for the count message", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/textContent\\s*=/.test(js)).toBe(true);\n' +
            "});\n\n" +
            'test("index.html still has exactly three .todo-item elements and links app.js", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const items = [...html.matchAll(/class=["\']todo-item["\']/g)];\n' +
            "  expect(items.length).toBe(3);\n" +
            '  expect(/<script[^>]*src=["\']app\\.js["\'][^>]*>/i.test(html)).toBe(true);\n' +
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          '    <p id="todo-count"></p>\n\n' +
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
          'const list = document.getElementById("todo-list");\n' +
          'const items = list.querySelectorAll(".todo-item");\n' +
          'const countEl = document.getElementById("todo-count");\n\n' +
          "countEl.textContent = `You have ${items.length} to-dos.`;\n",
      },
      evalPrompt:
        "Confirm the learner read the count from the DOM (querySelectorAll + .length) " +
        "instead of hardcoding the number 3, and used textContent rather than innerHTML.",
    },

    // ------------------------------------------------------------------
    // d1-t4 — accessible form markup (still static, no JS)
    // ------------------------------------------------------------------
    {
      id: "d1-t4",
      title: "Add an accessible new-to-do form",
      description:
        "## Add an accessible new-to-do form\n\n" +
        "Tomorrow (Day 2) you'll wire up a real \"add a to-do\" feature. Today, " +
        "still no JavaScript, let's build the **markup** for it \u2014 and make sure " +
        "it's accessible from the start.\n\n" +
        "Open `index.html`. Below the existing `<ul id=\"todo-list\">`, add:\n\n" +
        "1. A `<form id=\"todo-form\">` element.\n" +
        "2. Inside it, a `<label for=\"todo-input\">` with the text " +
        "   `New to-do` \u2014 labels are read aloud by screen readers and let " +
        "   sighted users click the label to focus the field.\n" +
        "3. An `<input id=\"todo-input\" type=\"text\">` immediately after the " +
        "   label (the matching `id`/`for` pair is what connects them).\n" +
        "4. A `<button type=\"submit\">Add</button>` inside the form.\n\n" +
        "**Why bother with `<label for>` when the placeholder text could just " +
        "say what the field is for?** Placeholders disappear the moment you " +
        "start typing, and screen readers don't reliably announce them. A " +
        "real `<label>` is always there \u2014 for every user, not just sighted " +
        "ones with a mouse.\n\n" +
        "No JavaScript yet \u2014 clicking \"Add\" won't do anything until Day 2. " +
        "That's expected.",
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          "    <!-- TODO: add a <form id=\"todo-form\"> with a <label for=\"todo-input\">New to-do</label>,\n" +
          "         an <input id=\"todo-input\" type=\"text\">, and a submit <button> -->\n" +
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
      },
      hints: [
        'The form needs `id="todo-form"` exactly — the test looks for that id.',
        'The `<label>` needs `for="todo-input"` and its visible text must be exactly `New to-do`.',
        'The `<input>` needs `id="todo-input"` — matching the label\'s `for` — and `type="text"`.',
        "The submit button can be `<button type=\"submit\">Add</button>`; it doesn't need an id.",
      ],
      hiddenTests: [
        {
          filename: "form.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("has a form with id todo-form", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  expect(/<form[^>]*\\bid=["\'\`]todo-form["\'\`][^>]*>/i.test(html)).toBe(true);\n' +
            "});\n\n" +
            'test("has a label for todo-input that says New to-do", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const match = html.match(/<label[^>]*\\bfor=["\'\`]todo-input["\'\`][^>]*>([^<]*)<\\/label>/i);\n' +
            '  expect(match?.[1]?.trim()).toBe("New to-do");\n' +
            "});\n\n" +
            'test("has an input with id todo-input and type text", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const match = html.match(/<input[^>]*>/gi) ?? [];\n' +
            '  const hasInput = match.some(\n' +
            '    (tag) => /\\bid=["\'\`]todo-input["\'\`]/i.test(tag) && /\\btype=["\'\`]text["\'\`]/i.test(tag),\n' +
            "  );\n" +
            "  expect(hasInput).toBe(true);\n" +
            "});\n\n" +
            'test("the form contains a submit button", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const formMatch = html.match(/<form[^>]*id=["\'\`]todo-form["\'\`][^>]*>([\\s\\S]*?)<\\/form>/i);\n' +
            "  expect(formMatch).not.toBeNull();\n" +
            '  expect(/<button[^>]*type=["\'\`]submit["\'\`][^>]*>/i.test(formMatch![1]!)).toBe(true);\n' +
            "});\n\n" +
            'test("the three original .todo-item elements are untouched", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const items = [...html.matchAll(/class=["\'\`]todo-item["\'\`]/g)];\n' +
            "  expect(items.length).toBe(3);\n" +
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item">Learn HTML</li>\n' +
          '      <li class="todo-item">Learn CSS</li>\n' +
          '      <li class="todo-item">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          '    <form id="todo-form">\n' +
          '      <label for="todo-input">New to-do</label>\n' +
          '      <input id="todo-input" type="text" />\n' +
          '      <button type="submit">Add</button>\n' +
          "    </form>\n" +
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
      },
      evalPrompt:
        "Confirm the learner used a real <label for> tied to the input's id (not just a " +
        "placeholder attribute), and did not add any JavaScript submit handling yet.",
    },

    // ------------------------------------------------------------------
    // d1-t5 — CSS flexbox layout + static done-state styling
    // ------------------------------------------------------------------
    {
      id: "d1-t5",
      title: "Lay out a to-do row with flexbox",
      description:
        "## Lay out a to-do row with flexbox\n\n" +
        "Tomorrow's toggle-done feature (Day 2) will add a checkbox to every " +
        "row and mark finished to-dos with a strikethrough. Let's build both " +
        "pieces of CSS today, against **static** markup, so Day 2 is pure " +
        "JavaScript with no new styling to figure out.\n\n" +
        "`index.html` for this task has a fourth `<li class=\"todo-item done\">` " +
        "with a `<input type=\"checkbox\" checked>` inside it, alongside the " +
        "three plain `<li class=\"todo-item\">` rows (each now also containing " +
        "an unchecked checkbox). Edit `style.css` so that:\n\n" +
        "1. `.todo-item` uses `display: flex;` and `align-items: center;` " +
        "   \u2014 so the checkbox and the text sit next to each other on one " +
        "   line, vertically centered.\n" +
        "2. `.todo-item.done` has `text-decoration: line-through;` \u2014 so " +
        "   finished to-dos visibly look finished.\n\n" +
        "**Why `.todo-item.done` and not a new unrelated class?** Chaining two " +
        "classes on one selector means \"only when both apply\" \u2014 the " +
        "strikethrough only shows up on rows that are *both* a to-do item " +
        "*and* done, without writing any duplicate background/padding rules.",
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn HTML</li>\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn CSS</li>\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn the DOM</li>\n' +
          '      <li class="todo-item done"><input type="checkbox" checked /> Learn flexbox</li>\n' +
          "    </ul>\n" +
          "  </body>\n" +
          "</html>\n",
        "style.css":
          "#todo-list {\n" +
          "  list-style: none;\n" +
          "  padding: 0;\n" +
          "}\n\n" +
          "/* TODO: lay .todo-item out as a flex row with centered items */\n" +
          ".todo-item {\n" +
          "  background-color: rgb(240, 240, 240);\n" +
          "  padding: 10px;\n" +
          "}\n\n" +
          "/* TODO: strike through the text of a done to-do */\n" +
          ".todo-item.done {\n" +
          "}\n",
      },
      hints: [
        "`display: flex;` on `.todo-item` makes its children (the checkbox and text) lay out in a row instead of stacking.",
        "`align-items: center;` vertically centers the checkbox against the text baseline.",
        'The done-state rule must be written as the compound selector `.todo-item.done` (no space between them) — a space would mean "a .done element *inside* a .todo-item" instead.',
        "`text-decoration: line-through;` is the exact property/value the test checks for.",
      ],
      hiddenTests: [
        {
          filename: "flex-layout.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'function ruleBody(css: string, selector: string): string | undefined {\n' +
            '  const escaped = selector.replace(/[.#]/g, "\\\\$&");\n' +
            '  const re = new RegExp(escaped + "\\\\s*\\\\{([^}]*)\\\\}", "i");\n' +
            "  return css.match(re)?.[1];\n" +
            "}\n\n" +
            'test(".todo-item is a flex row with centered items", async () => {\n' +
            '  const css = await Bun.file("style.css").text();\n' +
            '  const body = ruleBody(css, ".todo-item");\n' +
            "  expect(body).toBeDefined();\n" +
            '  expect(/display\\s*:\\s*flex\\s*;/i.test(body!)).toBe(true);\n' +
            '  expect(/align-items\\s*:\\s*center\\s*;/i.test(body!)).toBe(true);\n' +
            "});\n\n" +
            'test(".todo-item.done strikes through its text", async () => {\n' +
            '  const css = await Bun.file("style.css").text();\n' +
            '  const body = ruleBody(css, ".todo-item.done");\n' +
            "  expect(body).toBeDefined();\n" +
            '  expect(/text-decoration\\s*:\\s*line-through\\s*;/i.test(body!)).toBe(true);\n' +
            "});\n\n" +
            'test("index.html still has four .todo-item rows, one marked done", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const items = [...html.matchAll(/class=["\'\`]todo-item(?: done)?["\'\`]/g)];\n' +
            "  expect(items.length).toBe(4);\n" +
            '  const done = [...html.matchAll(/class=["\'\`]todo-item done["\'\`]/g)];\n' +
            "  expect(done.length).toBe(1);\n" +
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn HTML</li>\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn CSS</li>\n' +
          '      <li class="todo-item"><input type="checkbox" /> Learn the DOM</li>\n' +
          '      <li class="todo-item done"><input type="checkbox" checked /> Learn flexbox</li>\n' +
          "    </ul>\n" +
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
          "  display: flex;\n" +
          "  align-items: center;\n" +
          "}\n\n" +
          ".todo-item.done {\n" +
          "  text-decoration: line-through;\n" +
          "}\n",
      },
      evalPrompt:
        "Confirm the learner used the compound selector .todo-item.done (not a descendant " +
        "selector with a space) and did not alter the HTML structure.",
    },

    // ------------------------------------------------------------------
    // d1-t6 — reading the DOM further: data attributes + traversal
    // ------------------------------------------------------------------
    {
      id: "d1-t6",
      title: "Read the DOM: report the first and last to-do",
      description:
        "## Read the DOM: report the first and last to-do\n\n" +
        "`d1-t3` read *how many* to-dos exist. Let's go one step further and " +
        "read *which* ones \u2014 still only reading, never mutating (Day 2's job).\n\n" +
        "`index.html`'s `<li>` elements now each carry a `data-priority` " +
        "attribute (`\"high\"`, `\"medium\"`, or `\"low\"`). There's also an empty " +
        "`<p id=\"summary\"></p>` already in the markup. In `app.js`:\n\n" +
        "1. Select the `<ul id=\"todo-list\">`.\n" +
        "2. Use `.firstElementChild` and `.lastElementChild` on it to get the " +
        "   first and last `<li>` \u2014 don't use `querySelectorAll` with an " +
        "   index for this (that's the point: `firstElementChild`/`lastElementChild` " +
        "   are the direct way to grab the ends of a list of children).\n" +
        "3. Read each one's `.textContent` and its `data-priority` value via " +
        "   `.dataset.priority`.\n" +
        "4. Set `#summary`'s `textContent` to exactly: " +
        '   `First: <first text> (<first priority>). Last: <last text> (<last priority>).`\n\n' +
        "**Why `.dataset`?** Any `data-*` HTML attribute shows up on " +
        "`element.dataset` in camelCase automatically \u2014 `data-priority` becomes " +
        "`dataset.priority`. It's the standard, no-library way to attach extra " +
        "data to an element that JavaScript can read back later.",
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item" data-priority="high">Learn HTML</li>\n' +
          '      <li class="todo-item" data-priority="medium">Learn CSS</li>\n' +
          '      <li class="todo-item" data-priority="low">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          '    <p id="summary"></p>\n\n' +
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
          "// TODO: select #todo-list, grab its firstElementChild and lastElementChild,\n" +
          "// read their textContent + dataset.priority, and set #summary's textContent\n" +
          '// to: `First: <text> (<priority>). Last: <text> (<priority>).`\n',
      },
      hints: [
        '`document.getElementById("todo-list").firstElementChild` gives you the first `<li>` directly — no loop or index needed.',
        "`.lastElementChild` is the equivalent for the last child.",
        "`.textContent` on an `<li>` gives its trimmed-ish visible text; `.dataset.priority` reads the `data-priority` attribute.",
        'Build the final string with a template literal so it matches exactly: `` `First: ${firstText} (${firstPriority}). Last: ${lastText} (${lastPriority}).` ``.',
      ],
      hiddenTests: [
        {
          filename: "read-dom-more.test.ts",
          contents:
            'import { expect, test } from "bun:test";\n\n' +
            'test("app.js uses firstElementChild and lastElementChild, not an index lookup", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/firstElementChild/.test(js)).toBe(true);\n" +
            "  expect(/lastElementChild/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("app.js reads dataset.priority", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            "  expect(/dataset\\.priority/.test(js)).toBe(true);\n" +
            "});\n\n" +
            'test("app.js writes the exact summary sentence into #summary", async () => {\n' +
            '  const js = await Bun.file("app.js").text();\n' +
            '  expect(/summary/.test(js)).toBe(true);\n' +
            '  expect(/textContent\\s*=/.test(js)).toBe(true);\n' +
            '  // must not hardcode this task\'s specific sample sentence\n' +
            '  expect(\n' +
            "    /textContent\\s*=\\s*[\"'\`]First: Learn HTML \\(high\\)\\. Last: Learn the DOM \\(low\\)\\.[\"'\`]/.test(\n" +
            "      js,\n" +
            "    ),\n" +
            "  ).toBe(false);\n" +
            "});\n\n" +
            'test("index.html keeps three .todo-item elements with data-priority attributes", async () => {\n' +
            '  const html = await Bun.file("index.html").text();\n' +
            '  const items = [...html.matchAll(/class=["\'\`]todo-item["\'\`][^>]*data-priority=["\'\`](\\w+)["\'\`]/g)];\n' +
            "  expect(items.length).toBe(3);\n" +
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
          '    <ul id="todo-list">\n' +
          '      <li class="todo-item" data-priority="high">Learn HTML</li>\n' +
          '      <li class="todo-item" data-priority="medium">Learn CSS</li>\n' +
          '      <li class="todo-item" data-priority="low">Learn the DOM</li>\n' +
          "    </ul>\n\n" +
          '    <p id="summary"></p>\n\n' +
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
          'const list = document.getElementById("todo-list");\n' +
          "const first = list.firstElementChild;\n" +
          "const last = list.lastElementChild;\n\n" +
          "const firstText = first.textContent;\n" +
          "const firstPriority = first.dataset.priority;\n" +
          "const lastText = last.textContent;\n" +
          "const lastPriority = last.dataset.priority;\n\n" +
          'const summary = document.getElementById("summary");\n' +
          "summary.textContent = `First: ${firstText} (${firstPriority}). Last: ${lastText} (${lastPriority}).`;\n",
      },
      evalPrompt:
        "Confirm the learner used firstElementChild/lastElementChild + dataset.priority " +
        "instead of hardcoding the sample sentence, and did not add any mutation logic.",
    },
  ],
};
