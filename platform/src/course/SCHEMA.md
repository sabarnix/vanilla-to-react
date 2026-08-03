# Course-Content Schema (the T1a/T1b seam)

> Authoritative human-readable contract for the `Course -> Day[] -> Task[]`
> domain model described in `SPEC.md` §3. The TypeScript source of truth is
> [`schema.ts`](./schema.ts); this document explains it in prose with a
> worked example. If the two ever disagree, `schema.ts` wins.

This is the seam between **Workstream A** (the Burrow-fork framework —
loads/renders courses) and **Workstream B** (content — authors 42 tasks
across 7 days as data literals). Neither workstream needs to read the other's
code; they only need to agree on this file.

## Why hand-rolled (not zod)

`platform/package.json` has no schema-validation library as a dependency
(checked before writing this). Per the `/implement` ticket rules, zod is only
used if it's already a dep; since it isn't, `validateCourse()` in `schema.ts`
is a small hand-rolled structural validator with zero new dependencies. It
mirrors the TypeScript types field-for-field and returns **every** problem
found in one pass (`{ ok, errors: string[] }`) instead of throwing on the
first bad field — useful when a content author is iterating on a task and
wants the full list of what's wrong.

## Shape overview

```
Course
  id: string
  title: string
  days: Day[]            (non-empty, unique ids)
    Day
      id: string
      title: string
      order: number       (positive integer)
      tasks: Task[]       (non-empty, unique ids)
        Task
          id: string
          title: string
          description: string        (markdown)
          starterCode: FileMap        (non-empty: filename -> contents)
          hints: string[]             (may be empty)
          hiddenTests: HiddenTest[]   (non-empty)
            HiddenTest
              filename: string
              contents: string
          solution?: FileMap          (optional)
          evalPrompt?: string         (optional)
```

## Field-by-field contract

### `Course`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Non-empty. Stable identifier, e.g. `"vanilla-to-react"`. |
| `title` | `string` | yes | Non-empty. Human-readable. |
| `days` | `Day[]` | yes | Non-empty array. Day `id`s must be unique within the course. |

### `Day`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Non-empty, unique within the course, e.g. `"day-1"`. |
| `title` | `string` | yes | Non-empty, e.g. `"HTML, CSS & the DOM"`. |
| `order` | `number` | yes | Positive integer; display/sequence order. |
| `tasks` | `Task[]` | yes | Non-empty array. Task `id`s must be unique within the day. |

### `Task`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Non-empty, e.g. `"d1-t1"`. Kebab-case recommended. |
| `title` | `string` | yes | Non-empty; shown in navigation. |
| `description` | `string` | yes | Non-empty **Markdown** — the task prompt/instructions. |
| `starterCode` | `FileMap` | yes | Non-empty map of `filename -> file contents` seeded into the learner's editor/VFS. |
| `hints` | `string[]` | yes | May be an **empty array** (no hints), but the field itself must be present and be an array of strings. |
| `hiddenTests` | `HiddenTest[]` | yes | Non-empty array. Each entry is `{ filename, contents }` — a real test file (Bun test syntax) written into the sandbox and run to grade the task (see T3). |
| `solution` | `FileMap` | no | If present, same shape as `starterCode` and non-empty. Revealable per SPEC §3. |
| `evalPrompt` | `string` | no | Optional free-text prompt for an AI/heuristic check beyond the hidden tests. The framework decides how (or whether) to act on it. |

`FileMap` = `Record<string, string>` — a plain object mapping a relative
filename to its full text contents. Used for both `starterCode` and
`solution`.

## Validator behavior

```ts
import { validateCourse } from "./schema.ts";

const result = validateCourse(someUnknownValue);
// result: { ok: boolean, errors: string[] }
```

- Safe to call on **untrusted/parsed JSON** (e.g. content loaded at runtime,
  not just TS literals) — it does not assume the input is object-shaped.
- Collects **every** structural problem in one pass (missing fields, wrong
  types, empty required arrays, duplicate `Day`/`Task` ids) rather than
  stopping at the first one.
- Does **not** validate Markdown syntax inside `description`, does **not**
  execute `hiddenTests`, and does **not** check that `starterCode`/`solution`
  file contents are syntactically valid code. It only validates the
  **document shape** — running the hidden tests is the T3 harness's job.

## Worked example (abbreviated)

This mirrors the full 1-task sample shipped in
[`sample-course.ts`](./sample-course.ts):

```ts
const course: Course = {
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
          description: "## Make the heading say Hello\n\nChange the `<h1>`...",
          starterCode: {
            "index.html": "<html>...<h1>Change me</h1>...</html>",
          },
          hints: [
            "Find the <h1> element inside <body>.",
            'Replace its text with exactly "Hello".',
          ],
          hiddenTests: [
            {
              filename: "heading.test.ts",
              contents:
                'import { expect, test } from "bun:test";\n' +
                'test("h1 says Hello", async () => { /* ... */ });\n',
            },
          ],
          solution: {
            "index.html": "<html>...<h1>Hello</h1>...</html>",
          },
          evalPrompt: "Confirm only the heading text changed.",
        },
      ],
    },
  ],
};
```

## Files in this seam

| File | Purpose |
|---|---|
| `schema.ts` | TypeScript types (`Course`, `Day`, `Task`, `HiddenTest`, `FileMap`, `ValidationResult`) + `validateCourse()`. |
| `SCHEMA.md` | This document. |
| `sample-course.ts` | Minimal valid `Course` — 1 day, 1 task — used as a framework-loading fixture and as the validator's "golden" test input. |
| `schema.test.ts` | TDD suite: accepts the sample course, rejects malformed shapes (missing title, empty days, task missing `starterCode`, empty title, empty tasks, bad `hints` type, duplicate ids, non-object input, multi-error collection). |
