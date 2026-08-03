/**
 * Burrow — production bundle check / static build.
 *
 * The CLI `bun build` cannot apply bundler plugins (bun docs: "plugins are
 * only supported through Bun.build's API or through bunfig.toml with the
 * frontend dev server"), and just-bash's browser bundle statically imports
 * node:zlib — so bundling MUST go through this script, which applies the same
 * shim plugin the dev server gets from bunfig.toml [serve.static].
 *
 * Usage: bun run build.ts [outdir]   (default ./dist)
 *   BASE_PATH=/vanilla-to-react bun run build.ts   (subpath static hosts, e.g. GitHub Pages project sites)
 *
 * The output is a self-contained static site (/sw.js and /bun.wasm are copied
 * in below), except git clone/push over HTTP: the app calls /git-proxy/* to
 * dodge CORS, which needs a server-side handler on the host (the dev server
 * provides one via src/git/proxy.ts; any CORS proxy will do in production).
 *
 * BASE_PATH: index.html and the built asset graph use root-relative paths
 * (./src/..., ./index.html) so they already work unmodified under a subpath.
 * A handful of *runtime* fetches are hardcoded root-absolute in source
 * (src/toolchain/wasm.ts's "/bun.wasm", src/ai/config.ts's "/ai-worker.js")
 * because they're same-origin URLs, not module-graph imports, so bundling
 * can't rewrite them — an HTML <base> tag doesn't help either, since browsers
 * always resolve a leading "/" against the origin root regardless of <base>.
 * When BASE_PATH is set, this script rewrites those two literals in the built
 * output to `${BASE_PATH}/bun.wasm` / `${BASE_PATH}/ai-worker.js` and emits
 * the copied assets under BASE_PATH too, so a subpath deploy (e.g. GitHub
 * Pages at /vanilla-to-react/) can still load the transpiler + AI worker.
 * Left untouched: /sw.js registration (scope is hardcoded "/" in
 * src/toolchain/sw-bridge.ts — out of this script's scope to fix, and
 * rewriting only the URL without the scope would throw a SecurityError) and
 * /git-proxy (needs a server-side proxy Pages can't provide). Both degrade to
 * "preview / live git clone unavailable" on a subpath static deploy — the
 * core editor + hidden-test experience is unaffected. Default (BASE_PATH
 * unset) is a no-op: identical output to before this flag existed.
 */
import burrowShims from "./src/ui/build-plugins.ts";
import { AI_WORKER_URL } from "./src/ai/config.ts";
import { buildAiWorker } from "./src/ai/build-worker.ts";

const outdir = process.argv[2] ?? "./dist";
// Optional subpath prefix for static hosts that serve the site under a
// directory (e.g. BASE_PATH=/vanilla-to-react for a GitHub Pages project
// site). Empty by default — fully backward compatible with root hosting.
const basePath = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir,
  target: "browser",
  plugins: [burrowShims],
  sourcemap: "linked",
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// If BASE_PATH is set, rewrite the two hardcoded root-absolute runtime fetch
// URLs (see the header comment) in the built JS output before anything else
// touches disk. Exact string literals, quote-delimited, so this can't clobber
// unrelated text; verified 1 hit each against the current build.
if (basePath) {
  for (const artifact of result.outputs) {
    if (!artifact.path.endsWith(".js")) continue;
    const original = await Bun.file(artifact.path).text();
    const rewritten = original
      .replaceAll('"/bun.wasm"', `"${basePath}/bun.wasm"`)
      .replaceAll('"/ai-worker.js"', `"${basePath}/ai-worker.js"`);
    if (rewritten !== original) await Bun.write(artifact.path, rewritten);
  }
}

// The AI worker is fetched at runtime from AI_WORKER_URL, so index.html's graph
// never references it — emit it alongside the page for static deploys.
const workerCode = await buildAiWorker();
const workerPath = `${outdir}${basePath}${AI_WORKER_URL}`;
await Bun.write(workerPath, workerCode);

// Runtime assets fetched by URL (never in index.html's module graph): the
// service worker and the Bun transpiler WASM. The dev server serves these from
// routes; a static deploy needs them at the site root (or BASE_PATH, for the
// two that got rewritten above — sw.js still only works unprefixed, see the
// header comment).
const staticAssets = ["public/sw.js", "bun.wasm"] as const;
const copied: Array<{ path: string; size: number }> = [];
for (const src of staticAssets) {
  const file = Bun.file(src);
  const name = src.split("/").pop();
  const prefix = name === "bun.wasm" ? basePath : "";
  const dest = `${outdir}${prefix}/${name}`;
  await Bun.write(dest, file);
  copied.push({ path: dest, size: file.size });
}

for (const artifact of result.outputs) {
  console.log(`${artifact.path}  (${(artifact.size / 1024).toFixed(1)} KB)`);
}
console.log(`${workerPath}  (${(workerCode.length / 1024).toFixed(1)} KB)`);
for (const { path, size } of copied) {
  console.log(`${path}  (${(size / 1024).toFixed(1)} KB)`);
}
if (basePath) console.log(`base path: ${basePath}`);
