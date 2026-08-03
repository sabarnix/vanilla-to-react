# CONTEXT — Ubiquitous Language

> Glossary for the "Vanilla to React" project. Terms only — no implementation
> details. Decisions live in `docs/adr/`.

## Vanilla to React
The **product / course**: a 7-day, 21-task interactive tutorial that teaches React
by first building in vanilla JS. This is the name shown on course/product-facing
surfaces (browser title, landing/header). Standardized spelling: "Vanilla to
React" (not "Zero to React", not "From Vanilla JS to React"). See ADR-0004.

## sandbox
The **dev-environment chrome** the learner works inside — the in-tab editor,
shell, filesystem, and preview. Shown in terminal-flavored surfaces (shell
prompt `user@sandbox$`, hostname, banner). Deliberately a neutral word, distinct
from the course name. See ADR-0004.

## Burrow
The **upstream framework** this platform is a vendored MIT fork of
(`dhravya/burrow`). "Burrow" is retained in (a) license/attribution files —
legally required — and (b) internal code identifiers (types, storage keys,
headers). It is **not** used on any user-visible surface. See ADR-0001, ADR-0004.

## OpenClaw red (accent)
The brand accent color, an OpenClaw-family warm orange-red. Canonical roles:
primary `#FF5A2D`, bright `#FF7A3D`, dim `#D14A22`. Single source of truth via
CSS `--acc*` tokens. See ADR-0004.

## Course → Day → Task
The content hierarchy. A **Course** has ordered **Days**; each Day has **Tasks**.
A Task carries a description, starter code, hints, and hidden tests. (Schema:
ADR at the schema seam; 21 tasks total = 7 days × 3.)

## Hidden tests
The graded tests a learner's code is run against. They **pass against the task's
solution** and **fail against its starter code**. Executed by the real Bun test
runner, not the in-tab wasm runner. See ADR-0003.
