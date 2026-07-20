# ADR-0001 — Framework base: Burrow, not BrowserCode/BrowserPod

- **Status:** Accepted
- **Date:** 2026-07-20
- **Context tickets:** #1 (Workstream A epic), #3 (T1a fork base)

## Context

Workstream A needs an in-browser runtime that can (a) run a code editor, (b)
execute the learner's code for real, and (c) run hidden tests to grade it. The
original SPEC named **BrowserCode** (`leaningtech/browsercode`) as the fork base.

On investigation, BrowserCode's app code is open-source, but its execution engine
— **BrowserPod** (`leaningtech/browserpod-meta`, distributed via `npm.im/browserpod`)
— is **proprietary**: *"free to use only for personal and open-source projects,"*
and it **requires a `VITE_API_KEY`** that authenticates against Leaning Tech's
service (Wasm asset delivery + portal URL brokering + usage metering).

That puts a proprietary vendor and an API key on the critical path of a free,
open-source teaching course.

An alternative surfaced: **Burrow** (`dhravya/burrow`) — MIT-licensed, *"a whole
dev machine in a browser tab."* Real Bun transpiler compiled to Wasm, virtual
filesystem, shell, git, package manager, live `Bun.serve` preview — **fully
client-side, no API key, nothing leaves the tab.**

## Decision

**Use Burrow (`dhravya/burrow`, MIT) as the framework base.** Drop BrowserCode.

## Rationale

| Criterion | BrowserCode / BrowserPod | Burrow |
|---|---|---|
| License | Engine proprietary | **MIT throughout** |
| API key | Required (`VITE_API_KEY`) | **None** |
| Vendor on critical path | Yes (Leaning Tech service) | **No — fully local** |
| Real code execution | Node.js v22 (Wasm) | Real Bun transpiler (Wasm) |
| Test harness | `npm test` | Real transpile→worker exec (see ADR-0002) |
| Editor / FS / git / preview | Yes | Yes (CodeMirror 6, VFS→IndexedDB, isomorphic-git, SW preview) |

## Verification (done, not assumed)

Cloned Burrow and ran it locally on this machine:

- `bun install` → 191 packages, clean.
- `bun test` → **404/404 pass** (1347 assertions, 26 files).
- `bun run dev` → dev server boots on `http://localhost:4808` (HTTP 200).

So the "clone → install → run → boots" bar for #3 is already met against Burrow.

## Consequences

- **Positive:** No key, no proprietary dependency, MIT-compatible with our MIT
  course. Editor + VFS + git + preview + package manager come for free.
- **Negative / constraints (from Burrow's own COMPAT.md):**
  - **Bun-native, not Node** — author tasks/tests against Bun semantics. (Fine for
    a React course.)
  - **No raw TCP, no native addons** — see ADR-0002 for how this shapes the DB/API.
  - **Young project** — documented gaps: `Bun.serve` is `fetch`-handler-only (no
    routes/websocket yet), no `git push/pull`, run workers have **no VFS access yet**.
  - Requires **Bun ≥ 1.3** to develop; Chromium-based browser to run.

## Ceiling to watch

If the course later grows to teach **real backends with real databases over TCP**
(e.g. "connect to Postgres"), Burrow cannot do it — that would need a different
runtime or a hosted relay. Not a concern for the current Vanilla→React syllabus.
