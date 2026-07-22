# Vendored: Burrow

This `platform/` directory is a vendored copy of **Burrow** (MIT) — the
in-browser Bun dev environment used as our tutorial runtime.

- **Upstream:** https://github.com/dhravya/burrow
- **Fork:** https://github.com/sabarnix/burrow
- **Vendored at commit:** 5db19587ed318df1f12010b3a49c6daee79732c7
- **Vendored on:** 2026-07-22

## Our modifications (vs upstream)
- Editor swapped: CodeMirror 6 → **Monaco** (see `src/ui/editor.ts`).
- Added: **Swagger-style API tester** panel (see `src/ui/apitester.ts`).
- Terminal + preview: kept as upstream (WTerm + `/preview/` iframe).

## Dev
```
cd platform
bun install
bun run dev     # http://localhost:4808
bun run build   # static bundle → dist/
```
