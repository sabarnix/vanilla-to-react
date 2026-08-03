/**
 * Burrow src/course — minimal 1-day / 1-task sample course.
 *
 * This is the smallest possible valid Course under schema.ts: it exists so
 * the framework (T2: "load a task -> description + code editor") has a real,
 * tiny fixture to load and render before any of the 42 real tasks (T8-T11)
 * are authored. It doubles as the "golden" fixture for schema.test.ts.
 */

import type { Course } from "./schema.ts";

export const sampleCourse: Course = {
  id: "vanilla-to-react-sample",
  title: "Vanilla to React — Sample",
  days: [
    {
      id: "day-1",
      title: "HTML, CSS & the DOM",
      order: 1,
      tasks: [
        {
          id: "d1-t1",
          title: "Make the heading say Hello",
          description:
            "## Make the heading say Hello\n\n" +
            "Open `index.html` and change the `<h1>` element's text so the page " +
            "greets the learner.\n\n" +
            "**Goal:** the `<h1>` in `index.html` must contain the exact text `Hello`.",
          starterCode: {
            "index.html":
              "<!doctype html>\n" +
              '<html lang="en">\n' +
              "  <head>\n" +
              '    <meta charset="utf-8" />\n' +
              "    <title>Day 1</title>\n" +
              "  </head>\n" +
              "  <body>\n" +
              "    <h1>Change me</h1>\n" +
              "  </body>\n" +
              "</html>\n",
          },
          hints: [
            'Find the `<h1>` element inside the `<body>` of index.html.',
            'Replace the text between `<h1>` and `</h1>` with exactly "Hello".',
          ],
          hiddenTests: [
            {
              filename: "heading.test.ts",
              contents:
                'import { expect, test } from "bun:test";\n\n' +
                'test("h1 says Hello", async () => {\n' +
                '  const html = await Bun.file("index.html").text();\n' +
                "  const match = html.match(/<h1[^>]*>([^<]*)<\\/h1>/i);\n" +
                '  expect(match?.[1]?.trim()).toBe("Hello");\n' +
                "});\n",
            },
          ],
          solution: {
            "index.html":
              "<!doctype html>\n" +
              '<html lang="en">\n' +
              "  <head>\n" +
              '    <meta charset="utf-8" />\n' +
              "    <title>Day 1</title>\n" +
              "  </head>\n" +
              "  <body>\n" +
              "    <h1>Hello</h1>\n" +
              "  </body>\n" +
              "</html>\n",
          },
          evalPrompt:
            "Confirm the learner edited only the heading text and did not remove " +
            "the surrounding HTML structure.",
        },
      ],
    },
  ],
};
