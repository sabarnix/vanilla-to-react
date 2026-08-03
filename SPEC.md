# SPEC — Vanilla to React (Interactive Tutorial Platform)

> Product & engineering spec for turning the "From Vanilla JS to React" course
> into an **interactive, in-browser tutorial** built on a BrowserCode fork.

---

## 1. Vision

Today the course is a repo of lessons + starter/solution folders (see `README.md`).
The goal is an **interactive platform** where a learner:

1. Opens the app in a browser.
2. Reads a task, writes code in an embedded editor.
3. Runs hidden tests → gets pass/fail feedback.
4. Progresses through **Days → Tasks**, with progress saved.

We build this by **forking Burrow** (the framework, Workstream A) and
**authoring 21 tasks** (3/day × 7 days) of content against a shared schema (Workstream B).

> **Note (2026-08-03):** earlier drafts said "42 tasks" — that was an early
> estimate. Actual authored + QA'd scope is **21 tasks** (7 days × 3). See
> ADR-0003.

### Framework Base — Burrow (`dhravya/burrow`, MIT) — see ADR-0001

- **Repo:** https://github.com/dhravya/burrow
- **What it is:** *"a whole dev machine in a browser tab."* An MIT-licensed,
  Bun-native, open-source alternative to WebContainers/BrowserCode.
- **Runtime it gives us for free:**
  - Real **Bun transpiler** compiled to Wasm — genuine TS/TSX/JSX semantics
  - A shared **virtual filesystem**, snapshotted to IndexedDB (survives reload)
  - Interactive **shell** (bash), **git** (isomorphic-git), a from-scratch **npm** client
  - **CodeMirror 6** editor + file tree + live git diff panel
  - Live **server preview** via a service worker (`/preview/<port>/`)
  - A local WebGPU AI coding agent (bonus, not needed by us)
- **Stack:** Bun + TypeScript + Vite-style dev server (`bun run dev`).
- **Why this base:** **MIT throughout, no API key, nothing leaves the tab.** No
  proprietary engine, no vendor on the critical path. (BrowserCode was rejected
  because its engine, BrowserPod, is proprietary and requires an API key — see
  ADR-0001.)
- **Requires:** Bun ≥ 1.3 to develop; a Chromium-based browser to run.
- **Verified locally (2026-07-20):** `bun install` clean → `bun test` **404/404
  pass** → `bun run dev` boots on `:4808`. The #3 "clone→install→run→boots" bar
  is already met against Burrow.

#### Known constraints (from Burrow COMPAT.md)

- **Bun-native, not Node** — author tasks/tests against Bun semantics.
- **No raw TCP** (no Postgres/Redis/etc. clients) and **no native addons**
  (no `better-sqlite3`, and `bun:sqlite` is a hard build error). This shapes the
  data layer — see §7 and ADR-0002.
- `Bun.serve` is **`fetch`-handler-only** (no routes/websocket yet); no `git
  push/pull`; run workers currently have **no direct VFS access**.

> Philosophy (unchanged): *"You can't appreciate the solution until you've felt the problem."*

---

## 2. Two Workstreams

| Workstream | Epic | Owner surface | Depends on |
|------------|------|---------------|------------|
| **A — Framework** | [#1] | The BrowserCode fork + runtime | — |
| **B — Content** | [#2] | 21 authored tasks across 7 days | Schema seam (#4) |

The **seam** between them is the **course-content schema** (defined in #4).
Once that contract is frozen, both workstreams proceed in parallel.

---

## 3. Core Domain Model

```
Course
 └── Day (×7)
      └── Task (×N)   ← 21 tasks total (3/day × 7)
           ├── description   (markdown)
           ├── starterCode   (files the learner starts from)
           ├── hints[]       (progressive)
           ├── solution      (revealable)
           ├── tests         (hidden, run to evaluate)
           └── evalPrompt    (optional AI/heuristic check)
```

See #4 for the authoritative schema. Domain terms live in `CONTEXT.md`.

---

## 4. The 7 Days (from README)

| Day | Topic | Build target |
|-----|-------|--------------|
| 1 | HTML, CSS & the DOM | A static to-do list |
| 2 | Vanilla JS — Events & State | Make the to-do list interactive |
| 3 | The Pain — Async & State | Add an API call. Feel the chaos. |
| 4 | Why React Exists | Rebuild Day 3 in React |
| 5 | Components, Props & State | Break app into reusable pieces |
| 6 | useEffect & Data Fetching | Fetch data the React way |
| 7 | Putting It All Together | Ship a complete React app |

---

## 5. Ticket Plan (Tracer-Bullet Ordered)

Foundational split (already published):

- **#3 — [A][T1a]** Fork BrowserCode + get it building
- **#4 — [A][T1b]** Define course-content schema + sample course *(the seam)*

### Sub-issues (this batch — 11)

**Workstream A — Framework**

| T | Title | Blocked by |
|---|-------|-----------|
| T2 | Task runner: load a task → description + code editor | 1b (#4) |
| T3 | Hidden test harness + pass/fail evaluation | T2 |
| T4 | Day/Course navigation (Days → Tasks) | T2 |
| T5 | Progress persistence (localStorage) | T4 |
| T6 | Hints + solution reveal UI | T3 |
| T7 | Deploy pipeline (build + host) | T3, T4 |

**Workstream B — Content**

| T | Title | Blocked by |
|---|-------|-----------|
| T8 | Author Day 1–2 content (DOM + interactivity) | 1b (#4) |
| T9 | Author Day 3–4 (the pain → why React) | T8 |
| T10 | Author Day 5–6 (components, props, hooks) | T9 |
| T11 | Author Day 7 (capstone: ship a React app) | T10 |
| T12 | Content QA: run all 21 tasks through the framework | T7, T11 |

### Critical path

```
1a (#3) → 1b (#4) → T2 → T3 → T6/T7 → T12
                       ↘ T8 → T9 → T10 → T11 ↗
```

---

## 7. Data Layer — Preconfigured SQLite + REST API (see ADR-0002)

Days 3, 4, and 6 need a **real preconfigured database + API** for learners to
work against. Because Burrow has no raw TCP and no native addons, we run the DB
**inside the sandbox**:

- **Engine:** **`sql.js`** — SQLite compiled to pure Wasm. Real SQL, no native
  binary, no TCP, no key. Loaded via `initSqlJs({ wasmBinary })` (bytes fed
  directly — verified to work; the `locateFile` path is environment-fragile).
- **API:** a **preconfigured in-sandbox REST API** (`Bun.serve({ fetch })` /
  Hono) exposing `GET/POST/PUT/DELETE /api/todos`, backed by the sql.js DB.
  Same-origin via `/preview/<port>/` → **no CORS**. Ships in starter code;
  students never configure it.
- **"Feel the chaos":** the mock API has a **latency / error injection** toggle to
  power the Day 3 narrative.
- **Persistence:** **in-memory by default** (resets per run — clean slate per
  lesson). Durable persistence is a later upgrade via the worker→host IndexedDB
  bridge (run workers can't touch the VFS directly).
- **Contract:** networking tasks target the stable `/api/todos` REST contract so
  the framework (Workstream A) and content (Workstream B) stay decoupled.

> Verified locally (2026-07-20): sql.js created a table, inserted rows, ran
> `SELECT`, and exported persistable bytes (`SQLITE_WASM_OK`).

---

## 8. Definition of Done (platform-level)

_Status as of 2026-08-03 (all 13 tickets T1a–T12 landed; suite 635 pass / 1
pre-existing unrelated fail):_

- [x] Framework boots, loads any valid course (schema-driven). — Burrow baseline
  (T1a #3) + schema/validator (T1b #4); boots over Tailscale.
- [x] All **21** tasks authored and passing their own hidden tests. — T8–T11;
  QA gate T12 (#15) verified 21/21 (solution=PASS, starter=FAIL). See
  `platform/src/course/content/QA-REPORT.md`.
- [x] Progress persists across reloads. — T5 (#8), localStorage store.
- [~] Deployed to a public URL. — CI pipeline built (T7 #10, GitHub Pages);
  **owner must enable Pages + push the branch** to go live. Currently reachable
  on the tailnet only.
- [ ] A first-time learner can complete Day 1 with zero setup. — **pending:** the
  course shell is not yet mounted as Burrow's landing page (no ticket covered
  replacing the stock home UI). Next natural ticket.

> Task-count correction (42 → 21) and the test-harness runtime decision are
> recorded in **ADR-0003**.

---

_Spec is living. Update it when the ticket plan or schema changes._
