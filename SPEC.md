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

We build this by **forking BrowserCode** (the framework, Workstream A) and
**authoring 42 tasks** of content against a shared schema (Workstream B).

> Philosophy (unchanged): *"You can't appreciate the solution until you've felt the problem."*

---

## 2. Two Workstreams

| Workstream | Epic | Owner surface | Depends on |
|------------|------|---------------|------------|
| **A — Framework** | [#1] | The BrowserCode fork + runtime | — |
| **B — Content** | [#2] | 42 authored tasks across 7 days | Schema seam (#4) |

The **seam** between them is the **course-content schema** (defined in #4).
Once that contract is frozen, both workstreams proceed in parallel.

---

## 3. Core Domain Model

```
Course
 └── Day (×7)
      └── Task (×N)   ← 42 tasks total
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
| T12 | Content QA: run all 42 tasks through the framework | T7, T11 |

### Critical path

```
1a (#3) → 1b (#4) → T2 → T3 → T6/T7 → T12
                       ↘ T8 → T9 → T10 → T11 ↗
```

---

## 6. Definition of Done (platform-level)

- [ ] Framework boots, loads any valid course (schema-driven).
- [ ] All 42 tasks authored and passing their own hidden tests.
- [ ] Progress persists across reloads.
- [ ] Deployed to a public URL.
- [ ] A first-time learner can complete Day 1 with zero setup.

---

_Spec is living. Update it when the ticket plan or schema changes._
