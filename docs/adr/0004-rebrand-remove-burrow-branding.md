# ADR-0004 — Rebrand: remove Burrow user-visible branding, adopt OpenClaw-red accent

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context tickets:** rebrand request (2026-08-03); builds on ADR-0001 (Burrow base)

## Context

The platform is a vendored fork of **Burrow** (MIT, `dhravya/burrow` — see
ADR-0001). Out of the box it carries Burrow's own branding: the shell banner
("burrow — a dev machine in this tab…"), the `user@burrow` prompt/hostname, an
inline brand mark, a baked-amber accent color (`#f2a34c`), and Burrow-flavored
page titles ("Zero to React — a dev machine in one tab").

We want the running product to read as **our course**, not as Burrow, and to use
**OpenClaw's red/orange accent** as the brand color — without stripping the
upstream MIT attribution and without a risky mass-rename of internal code.

## The problem: "burrow" appears in 157 files, but not all of it is *branding*

The 157 occurrences fall into three buckets with very different removal semantics:

| Bucket | Examples | Decision |
|---|---|---|
| **A — user-visible branding** | shell banner, `user@burrow` prompt, `HOSTNAME`, page `<title>`, inline brand mark, amber accent | **Rebrand** |
| **B — internal identifiers** | `BurrowVfs` type, `burrow/ui` log tags, `burrow-command-memory` IndexedDB key, `__burrowCjs`, `x-burrow` header, git author `burrow@localhost` | **Keep** |
| **C — license / attribution** | `VENDORED.md`, `LICENSE`, `CONTRIBUTING.md` | **Keep (legally required)** |

## Decision

1. **Scope the rebrand to Bucket A only.** Renaming Bucket B (esp. the
   `burrow-command-memory` IndexedDB name) risks **data loss** for users with
   saved work and buys no user-facing benefit — internal names aren't branding a
   user sees. Bucket C **must** stay: MIT requires preserving the copyright and
   attribution, so "remove Burrow completely" cannot mean stripping upstream
   credit.

2. **Hybrid naming.** Course/product surfaces (browser `<title>`, landing/header)
   read **"Vanilla to React"**. Dev-environment chrome (shell prompt, hostname,
   banner) uses a neutral **`sandbox`** — keeps prompts tidy (`user@sandbox$`)
   and avoids over-claiming a product name in terminal chrome.

3. **Accent = OpenClaw CLI triad**, applied everywhere including CodeMirror syntax
   highlighting (a split accent would look like a bug):
   - `--acc: #FF5A2D`  (primary)
   - `--acc-hi: #FF7A3D`  (bright / emphasis)
   - `--acc-dim: #D14A22`  (secondary)
   - `--acc-rgb: 255, 90, 45`  (channel var for `rgba(var(--acc-rgb), <a>)` tints)

   Chosen over a pure fire-engine red because OpenClaw's own palette is a warm
   orange-red, and it sits harmoniously with the existing warm theme.

4. **Tokenize to one source of truth.** The amber was hardcoded 52× (38× `#f2a34c`,
   14× `rgba(242,163,76,…)`) in addition to the 3 `--acc*` token definitions.
   Point the tokens at the triad and replace the 52 literals with `var(--acc*)` /
   `rgba(var(--acc-rgb), …)` so future rebrands touch one place.

5. **Page title** → `Vanilla to React — learn React by building` (drops Burrow's
   "dev machine in one tab" tagline from the course-facing surface).

6. **Tests.** Exactly one test asserts Bucket-A branding
   (`src/shell/driver.test.ts` → `toContain("user@burrow")`); update it to
   `user@sandbox`. The ~9 other burrow-referencing tests assert Bucket B/C
   internals and stay unchanged.

## Consequences

- Users see a "Vanilla to React" product with an OpenClaw-red accent; the terminal
  chrome reads `sandbox`. Upstream Burrow credit remains intact in `VENDORED.md`
  et al.
- The accent now lives in `src/ui/styles.css` tokens only; syntax highlighting
  and chrome share one source of truth.
- Internal code still says `Burrow`/`burrow` (types, keys, headers) — intentional.
  A future reader should not read that as "incomplete rebrand"; per this ADR it is
  deliberately out of scope to avoid churn and data-loss.

## Rejected alternatives

- **Rename Bucket B too** — ❌ invasive; renaming the IndexedDB key wipes saved
  learner work; no user-facing gain.
- **Strip MIT attribution (Bucket C)** — ❌ license violation.
- **Pure/fire-engine red** — ❌ clashes with the warm theme; OpenClaw's real
  accent is orange-red anyway.
- **Literal find-replace of the 52 amber values** — ❌ perpetuates hardcoded
  color; next rebrand repeats the toil.
