# ADR-0008 — Per-task preview must be a generated, inlined `{fetch}` server

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context:** bug fix after ADR-0007 shipped a preview that showed "nothing listening"
- **Amends:** ADR-0007 §4 (continuous per-task preview)

## Context

ADR-0007 §4 specified a per-task static file server that serves the task
directory over `Bun.serve` and hot-reloads on edits. Shipped, it showed
**"nothing listening yet"** — the preview never came up. Two hard runtime
constraints (both in `platform/COMPAT.md`, missed when writing ADR-0007) explain
why that design cannot work:

1. **Server-shape detection.** The preview pipeline only registers a server when
   the entry module has **`export default { fetch }`** (or a bare function / Hono
   app) — see `toolchain/handler-shape.ts`. An **imperative `Bun.serve({...})`
   call is not detected**, so the first implementation's server ran but was never
   wired to `/preview/*`.
2. **No VFS access in run workers.** Run workers have **no filesystem access** —
   `Bun.file`, `Bun.write`, and `node:fs` all throw (COMPAT.md: "Run workers
   can't touch the VFS … files are only reachable from the shell/editor/git").
   So a server **cannot read sibling task files at runtime**; the first
   implementation's `Bun.file(ROOT + path)` could never resolve.

## Decision

Generate the preview server as a **`export default { fetch }`** module with the
task's files **inlined as in-memory string constants** (`buildPreviewServerSrc`
in `src/ui/course.ts`):

- Correct detected shape → the runner wires it to `/preview/*`, the preview panel
  auto-selects the new port and shows it.
- Files served from memory → no VFS reads from the worker.
- Router: `/` → `index.html`, SPA-style fallback to `index.html`, per-extension
  content types.
- Run via the normal `bun run <file>` shell path (`echo:true`) so it flows
  through the same machinery as a manual run.

## Consequences

- **Snapshot, not keystroke-live.** The inlined server reflects file contents at
  generation time. It is regenerated + re-run on **task entry** and via an
  explicit **"↻ refresh preview"** action (reads current VFS contents, re-inlines,
  re-runs). True live refresh is impossible without worker VFS access.
- The `_preview-server.ts` is generated per task (not a static constant), so it
  always matches that task's files.
- Only text assets (HTML/CSS/JS/JSON/SVG) are inlined — sufficient for the course
  tasks. Binary assets would need a different path (not needed now).
- Grading remains deferred (ADR-0006); this is only about preview.

## Rejected alternatives

- **Imperative `Bun.serve({...})`** — ❌ not the detected shape; never registers.
- **Server reads task files from disk** — ❌ run workers have no VFS access.
- **Hot-reload on every keystroke** — ❌ impossible without worker VFS access; the
  explicit refresh button is the honest substitute.
