# ADR-0002 — Data layer: sql.js (SQLite-Wasm) + in-sandbox REST API

- **Status:** Accepted
- **Date:** 2026-07-20
- **Context tickets:** #12 (Day 3–4 content), #13 (Day 5–6 content), #4 (schema seam)
- **Depends on:** ADR-0001 (Burrow base)

## Context

Days 3, 4, and 6 of the course involve API calls and data fetching ("add an API
call, feel the chaos" → "fetch data the React way"). We want learners to work
against a **real, preconfigured database + API**, not hand-waved mocks — but
Burrow has **no raw TCP** (so no Postgres/MySQL/Redis/Mongo clients) and **no
native addons** (so no `better-sqlite3`, no `bun:sqlite` — the latter is a hard
build error in Burrow).

## Decision

1. **Database engine: `sql.js`** — SQLite compiled to pure Wasm. Real SQL, no
   native binary, no TCP, no key.
2. **Load pattern: feed wasm bytes directly** via `initSqlJs({ wasmBinary })`,
   **not** `locateFile`. This works identically under Node and in a browser
   worker, sidestepping the FS-vs-fetch difference.
3. **API surface: a preconfigured in-sandbox REST API** using `Bun.serve({ fetch })`
   (or a Hono `export default` app) that runs SQL against the sql.js DB and
   exposes `GET/POST/PUT/DELETE /api/todos`. Same-origin via Burrow's
   `/preview/<port>/` bridge → **no CORS**.
4. **Latency / error injection toggle** in the mock API — deliberately makes
   Day 3 "feel the chaos" (slow responses, flaky writes).
5. **Persistence: start in-memory** (DB resets each run — clean slate per lesson,
   which is pedagogically fine). Durable persistence is a **later** upgrade, and
   must go through the worker→host `postMessage` bridge to IndexedDB, because
   **Burrow run workers have no direct VFS access** (`Bun.file`/`Bun.write` = ❌).

## Rejected alternatives

- **`bun:sqlite`** — ❌ hard build error in Burrow ("Bun builtins not available").
- **`node:sqlite`** — no shim in Burrow.
- **`sqlite3` CLI** — not in Burrow's browser build.
- **`better-sqlite3`** — native addon; won't run.
- **Official `@sqlite.org/sqlite-wasm` + OPFS** — better durability/perf, but needs
  a Web Worker + OPFS + COOP/COEP cross-origin-isolation headers that can fight
  Burrow's service-worker preview bridge. Too much plumbing for the teaching
  altitude. **Noted as the upgrade path** if durability/perf ever matters.
- **Static `db.json` + fetch** — read-only; can't teach real CRUD/mutations.

## Verification (done, not assumed)

Ran `sql.js` locally to prove the engine + pattern:

- Naive `locateFile` → failed on native Bun (tried to `fs.open` a URL). Informative:
  confirms the `locateFile` path is environment-fragile.
- **`wasmBinary`-bytes pattern → worked:** created a `todos` table, inserted rows,
  `SELECT` returned correct data, and `db.export()` produced persistable bytes
  (`SQLITE_WASM_OK`). This is the pattern we standardize on.

## Consequences

- **Positive:** Learners get a genuine SQL database + real REST API, fully local,
  no key, MIT-friendly. The mock API doubles as a teaching artifact ("open the
  server file, see how it works"). Latency injection powers the Day 3 narrative.
- **Negative / constraints:**
  - In-memory by default → data resets on reload (acceptable, arguably desirable).
  - Durable persistence is deferred and requires the worker→host IndexedDB bridge.
  - `Bun.serve` is `fetch`-handler-only in Burrow (no routes/websocket) — the mock
    API must be written as a single `fetch` handler that routes internally.

## Contract note (for #4 schema seam)

Networking tasks (Days 3/4/6) should target a **known, stable API contract**:
`/api/todos` with standard REST verbs. Content authors (#12, #13) build tasks and
hidden tests against this contract so the framework and content stay decoupled.
