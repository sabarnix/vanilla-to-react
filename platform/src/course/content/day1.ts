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
  ],
};
