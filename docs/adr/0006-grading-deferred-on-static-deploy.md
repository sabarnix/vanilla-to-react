# ADR-0006 — Hidden-test grading is deferred on the static (Pages) deploy

- **Status:** Accepted
- **Date:** 2026-08-03
- **Context tickets:** course build-out (2026-08-03); builds on ADR-0003 (test-harness runtime), ADR-0005 (course shell)

## Context

The framework grades a learner's code by running the task's `hiddenTests`
(authored as `bun:test`-syntax files). Per **ADR-0003**, grading executes via
`Bun.spawn(["bun","test", …])` — the *real* Bun binary on a **host**. The
in-browser `bun.wasm` runner **cannot** run `bun:test` (`bun:*` specifiers are a
hard build error in Burrow's browser sandbox).

The production deploy is **static GitHub Pages** (ADR-0004 deploy work): there is
**no host and no `Bun.spawn`**. So the as-built grader cannot run in the deployed
browser. We must decide what "Run tests" does on the static deploy.

Decision (grilled 2026-08-03): **defer grading on the static deploy** — ship the
full course UX now; do not block the feature on a browser-side grader.

## Decision

1. **Ship the course UX without live grading on Pages.** Navigation, task
   description, real editor, hints/solution reveal, progress, and **"Mark done →
   next"** advancement all work client-side on the static deploy.
2. **"Run tests" is present but gated.** On the static deploy it shows a clear
   deferred state (e.g. "grading runs in dev/CI — in-tab grading coming soon"),
   not a broken/failing button.
3. **The `Bun.spawn` harness remains the authoring + CI truth (unchanged).**
   ADR-0003 stands: the T12-style QA sweep and CI still prove every task's hidden
   tests pass-vs-solution / fail-vs-starter. Content correctness is guaranteed by
   CI, not by the deployed browser.
4. **Future upgrade path (not now):** a browser-side grader via a thin
   `bun:test`→assertion shim run on the in-tab `bun.wasm` runner (which *can*
   execute a module graph and capture stdout/exitCode), OR an optional server
   grading endpoint. When it lands, an all-pass run also auto-marks completion
   (ADR-0005 §4).

## Consequences

- The deployed course is a **fully usable learning UX** immediately, minus
  automated pass/fail feedback in the browser. This is an honest, shippable
  slice — not a stub.
- "A first-time learner can complete Day 1 with zero setup" (SPEC §8 DoD) is met
  for the *experience*; automated grading feedback on the deploy is a follow-up.
- No backend is introduced; "phones home to nobody" holds.

## Rejected alternatives

- **Server grading endpoint now** — ❌ adds a backend + hosting beyond Pages;
  defers the visible course for infra work.
- **In-tab `bun:test` shim now** — ✅ right long-term, ❌ real work that would delay
  shipping the UX; explicitly chosen as a *later* upgrade.
- **Ship "Run tests" that just fails on Pages** — ❌ looks broken; the gated
  deferred state is honest.
