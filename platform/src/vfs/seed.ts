/**
 * Burrow — src/vfs/seed.ts
 * Initial workspace content: a README (rendered by the editor's markdown
 * preview on first load, with ./burrow.svg proving VFS-relative images), a
 * zero-import index.ts server at the root ("bun run index.ts" → preview tab,
 * no install needed), and a small multi-file TypeScript demo project under
 * /home/user/demo that uses two esm.sh-resolvable dependencies (nanoid, hono)
 * so `bun run` exercises the whole toolchain path (graph build → esm.sh
 * rewrite → worker run → handler-shape detection → /preview bridge).
 *
 * The server example (a plain Hono app, `export default app`, no Bun.serve)
 * is authored by the toolchain builder in ../toolchain/seed-server-example.ts
 * — a self-contained data module with zero imports, handed to the seed here
 * so the demo proves the run worker's handler-shape detection end to end.
 */

import { WORKSPACE_ROOT } from "../contract/types.ts";
import { SERVER_EXAMPLE_PACKAGE_JSON, SERVER_EXAMPLE_TS } from "../toolchain/seed-server-example.ts";

export const DEMO_DIR = `${WORKSPACE_ROOT}/demo`;

const README_MD = `![burrow](./burrow.svg)

# Burrow

A whole dev machine in this browser tab. Bun's real transpiler (compiled to
WASM), a bash-like shell, git, npm packages, and a local WebGPU AI agent —
**phones home to nobody**.

## Try it right now

\`\`\`sh
bun run index.ts     # spins up a web server → watch the preview tab light up
\`\`\`

Then edit \`index.ts\` and run it again. That's the whole loop.

## Ask the agent

The panel on the right is a coding agent that runs a model on **your GPU** —
load one (a click, weights cache after the first download) and hand it work:

- *"Create a Bun HTTP server in src/server.ts and run it"*
- *"Run the tests and fix any failures"*
- *"Explain what this project does"*

It reads and edits these files and runs shell commands, step by step, right
here in the tab. Every action is visible; nothing is sent anywhere.

## What's in the box

- **shell** — a real bash-like environment in the terminal below
  (\`grep\`, \`sed\`, \`awk\`, \`jq\`, \`find\`, pipes, the works).
- **bun** — \`bun run <file>\` transpiles with Bun's actual Rust transpiler
  and runs the module graph in a worker. Servers get a live preview tab.
- **packages** — \`bun add <pkg>\` fetches real npm tarballs into
  \`node_modules\`; imports fall back to esm.sh when you skip the install.
- **git** — \`git clone/status/add/commit/log\` via isomorphic-git.
  Clone anything public: \`git clone https://github.com/Dhravya/burrow\`.
- **edit** — \`edit <file>\` opens anything in this editor. This README is
  rendered — hit the ✎ chip in the corner to see the raw markdown.

## More to poke at

\`\`\`sh
cd demo && bun run server.ts   # a Hono app from npm, previewed live
bun add ms                     # install a real package
git init && git add . && git commit -m "first"
\`\`\`

> Your workspace persists in this browser (IndexedDB) and survives reloads.
> \`workspace info\` shows what's stored; \`workspace reset\` gives you a fresh box.
`;

/**
 * Seed logo, referenced by the README ("![burrow](./burrow.svg)") — it proves
 * the markdown preview resolves workspace-relative images through the VFS.
 * Hand-drawn on purpose; Burrow should look like a person made it.
 */
const BURROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="160" viewBox="0 0 520 160">
  <!-- burrow — hand-drawn on purpose. palette matches src/ui/styles.css -->
  <rect width="520" height="160" rx="12" fill="#17150f" stroke="#2e2920" stroke-width="1.5"/>
  <!-- the mound -->
  <path d="M34 122 Q 72 54 126 62 Q 168 68 180 122 Z" fill="#322b20" stroke="#f2a34c" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- the hole -->
  <ellipse cx="110" cy="122" rx="32" ry="9" fill="#0c0b0a" stroke="#f2a34c" stroke-width="2"/>
  <!-- the resident: ears -->
  <ellipse cx="102" cy="76" rx="5" ry="14" fill="#0c0b0a" stroke="#ffc27a" stroke-width="2" transform="rotate(-14 102 76)"/>
  <ellipse cx="120" cy="76" rx="5" ry="14" fill="#0c0b0a" stroke="#ffc27a" stroke-width="2" transform="rotate(14 120 76)"/>
  <ellipse cx="102" cy="78" rx="1.8" ry="8" fill="#f2a34c" opacity="0.55" transform="rotate(-14 102 78)"/>
  <ellipse cx="120" cy="78" rx="1.8" ry="8" fill="#f2a34c" opacity="0.55" transform="rotate(14 120 78)"/>
  <!-- head, peeking -->
  <circle cx="111" cy="100" r="12" fill="#0c0b0a" stroke="#ffc27a" stroke-width="2"/>
  <!-- happy closed eyes + nose + whiskers -->
  <path d="M104 99 q 2.5 -3 5 0 M113 99 q 2.5 -3 5 0" fill="none" stroke="#ffc27a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="111" cy="104" r="1.4" fill="#f2a34c"/>
  <path d="M97 103 l -7 -1.5 M97 106 l -7 1.5 M125 103 l 7 -1.5 M125 106 l 7 1.5" stroke="#7c7261" stroke-width="1.2" stroke-linecap="round"/>
  <!-- the ai sparkle it just thought of -->
  <path d="M146 64 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#ffc27a"/>
  <circle cx="160" cy="52" r="1.8" fill="#f2a34c"/>
  <!-- ground -->
  <path d="M24 122 H 196" stroke="#3d3629" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 7"/>
  <path d="M446 122 H 496" stroke="#3d3629" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 7"/>
  <!-- wordmark -->
  <text x="208" y="86" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="36" fill="#ece3d2">burrow</text>
  <text x="210" y="108" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#7c7261">a dev machine in a browser tab</text>
  <text x="210" y="124" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#7c7261">phones home to nobody</text>
</svg>
`;

/**
 * Root-level server sample: zero imports, Bun's \`export default { fetch }\`
 * shape (handler-shape.ts → "fetch-object"), so \`bun run index.ts\` from the
 * workspace root spins up a server and lights the preview tab with no
 * package.json and no install — the shortest possible path to "it runs!".
 */
const ROOT_INDEX_TS = `// try it:  bun run index.ts   ← type that in the terminal below
//
// Burrow detects the \`export default { fetch }\` server shape, runs it in a
// worker, and serves it in the preview tab (and via the port switcher).
// Edit something — the page below is yours.

const page = \`<!doctype html>
<html>
  <head>
    <style>
      body { background: #17150f; color: #ece3d2; font-family: ui-monospace, monospace;
             display: grid; place-items: center; min-height: 90vh; text-align: center; }
      h1 { color: #f2a34c; } a { color: #ffc27a; } code { color: #b3c186; }
    </style>
  </head>
  <body>
    <div>
      <h1>it runs!</h1>
      <p>this page is served by <code>index.ts</code>, from a worker, in your tab.</p>
      <p>the server clock says <b id="t">…</b></p>
      <script>
        setInterval(async () => {
          const r = await fetch("/api/time");
          document.getElementById("t").textContent = (await r.json()).now;
        }, 1000);
      </script>
    </div>
  </body>
</html>\`;

export default {
  fetch(req: Request): Response {
    const url = new URL(req.url);
    if (url.pathname === "/api/time") {
      return Response.json({ now: new Date().toLocaleTimeString() });
    }
    return new Response(page, { headers: { "content-type": "text/html" } });
  },
};
`;

const DEMO_INDEX_TS = `import { nanoid } from "nanoid";
import { greet } from "./greet.ts";

console.log(greet("Burrow"));
console.log("fresh session id:", nanoid());
`;

const DEMO_GREET_TS = `export function greet(name: string): string {
  return \`Hello, \${name}! Edit me, then \\\`bun run index.ts\\\` again.\`;
}
`;

export const SEED_FILES: Record<string, string> = {
  [`${WORKSPACE_ROOT}/README.md`]: README_MD,
  [`${WORKSPACE_ROOT}/burrow.svg`]: BURROW_SVG,
  [`${WORKSPACE_ROOT}/index.ts`]: ROOT_INDEX_TS,
  [`${DEMO_DIR}/package.json`]: SERVER_EXAMPLE_PACKAGE_JSON,
  [`${DEMO_DIR}/index.ts`]: DEMO_INDEX_TS,
  [`${DEMO_DIR}/greet.ts`]: DEMO_GREET_TS,
  [`${DEMO_DIR}/server.ts`]: SERVER_EXAMPLE_TS,
};
