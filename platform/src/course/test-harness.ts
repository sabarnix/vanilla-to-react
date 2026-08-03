/**
 * Burrow src/course — hidden-test harness (T3, SPEC.md §5 "hidden test
 * harness + pass/fail evaluation").
 *
 * Given a task's `hiddenTests` (schema.ts — LOCKED contract from #4) and the
 * learner's current editor files (T2's `TaskRunnerHandle.getCurrentFiles()` /
 * `TaskFileState.getCurrentFiles()`), this module:
 *
 *   1. materializes both sets of files into a sandbox working directory,
 *   2. runs the hidden tests against them with the existing Burrow `bun`
 *      toolchain (see "which sandbox" below),
 *   3. parses the result into a structured, framework-agnostic report.
 *
 * Split in two halves on purpose, same shape as task-runner.ts:
 *   - Pure logic: `parseJunitReport()` / `parseFailureReport()` turn `bun
 *     test`'s output into a `TestHarnessReport`. Zero I/O, fully
 *     unit-testable with canned strings — no live sandbox required.
 *   - Sandbox glue: `runHiddenTests()` is the only impure piece. It shells
 *     out to the real toolchain (see below) and feeds the pure parser.
 *
 * WHICH SANDBOX, AND WHY `Bun.spawn` (not the in-browser Wasm VFS runner):
 *   Burrow ships TWO different "run code" surfaces and they solve different
 *   problems:
 *     - src/toolchain/{graph,session,commands}.ts: the in-browser bun.wasm
 *       module-graph runner used for the learner's live dev-server preview
 *       (`bun run`/`serve` in the in-tab terminal). It explicitly does NOT
 *       support hidden-test evaluation: `bun:*` specifiers are a hard
 *       `resolveSpecifier()` failure ("Bun builtins are not available in the
 *       browser sandbox", graph.ts), and `bun test` is listed in
 *       `UNSUPPORTED_SUBCOMMANDS` (commands.ts) — so `hiddenTests`, which are
 *       real `bun:test` source per SCHEMA.md, cannot execute there at all.
 *     - The real Bun binary this whole platform already runs under. T8's own
 *       content-QA suite (src/course/content/day1-2.test.ts) established the
 *       precedent this module reuses verbatim: write the task's files +
 *       hiddenTests into a fresh temp directory and run them with
 *       `Bun.spawn(["bun", "test", ...])`, the *real* Bun test runner —
 *       "the only faithful way to confirm they pass/fail as authored" per
 *       that file's own docstring. That is the "existing Burrow bun
 *       toolchain" this harness reuses; no new runtime is invented.
 *   This module is the generalization of that pattern for arbitrary
 *   (task, currentFiles) pairs instead of only (task, task.solution) —
 *   exactly what T3 needs to grade a learner's live editor state.
 *
 * `--reporter=junit --reporter-outfile=<path>` gives a structured, stable
 * report to parse (bun test's default console format is for humans and is
 * not meant to be scraped). One caveat, confirmed empirically: a file that
 * fails to even *parse* (syntax error) or a run that emits zero test files
 * writes NO junit XML at all — `runHiddenTests()` falls back to a synthetic
 * failing report built from stdout/stderr in that case (see
 * `parseFailureReport`).
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { FileMap, HiddenTest } from "./schema.ts";

/** Per-test outcome in a harness report. */
export interface TestResult {
  /** The test's name, as authored via `test("name", ...)` / bun test's junit `<testcase name>`. */
  name: string;
  status: "pass" | "fail";
  /** Best-effort failure detail (assertion diff / error message), absent for passing tests. */
  message?: string;
}

/**
 * Structured, framework-agnostic result of running a task's hiddenTests.
 * Consumed by `test-results-view.ts` (this module) and, per the issue,
 * intended for T6 (hints UI, gates on `complete`) and T12 (content QA).
 */
export interface TestHarnessReport {
  overall: "pass" | "fail";
  tests: TestResult[];
  /** True iff every hidden test passed — the "mark task complete" signal (persistence itself is T5). */
  complete: boolean;
  /** Raw combined stdout+stderr from the run, for debugging/QA — not needed for the pass/fail UI. */
  rawOutput: string;
}

// ---------------------------------------------------------------------------
// Pure parsing — no I/O, fully unit-testable.
// ---------------------------------------------------------------------------

/** One `<testcase>` extracted from a bun test junit XML report. */
interface JunitTestcase {
  name: string;
  failed: boolean;
  message?: string;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Extract an XML attribute's value from a tag's raw attribute string. */
function attr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeXmlEntities(match[1]!) : undefined;
}

/**
 * Extract every `<testcase>` from bun test's `--reporter=junit` XML output.
 * Deliberately a small hand-rolled scanner (no XML-parser dependency,
 * matching this package's "no new deps" / hand-rolled-parsing convention
 * already used by schema.ts's validator) — bun's junit output is a flat,
 * predictable shape, not arbitrary XML.
 */
function extractTestcases(xml: string): JunitTestcase[] {
  const cases: JunitTestcase[] = [];
  // Self-closing (no children, i.e. passed/skipped) OR a container with a
  // <failure>/<error> child (i.e. failed). Non-greedy so siblings don't merge.
  const re = /<testcase\s+([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const attrs = match[1] ?? "";
    const body = match[3];
    const name = attr(attrs, "name") ?? "(unnamed test)";
    if (body === undefined) {
      cases.push({ name, failed: false });
      continue;
    }
    const failureMatch = body.match(/<(failure|error)\b([^>]*?)(\/>|>([\s\S]*?)<\/(?:failure|error)>)/);
    if (!failureMatch) {
      cases.push({ name, failed: false });
      continue;
    }
    const failureAttrs = failureMatch[2] ?? "";
    const failureBody = failureMatch[4]?.trim();
    const message = failureBody || attr(failureAttrs, "message") || attr(failureAttrs, "type");
    cases.push({ name, failed: true, message });
  }
  return cases;
}

/**
 * Parse bun test's `--reporter=junit` XML into a `TestHarnessReport`. Pure
 * function — the primary target of the "sample bun-test output" unit tests
 * (pass / fail / mixed) called for in the issue.
 */
export function parseJunitReport(xml: string, rawOutput = ""): TestHarnessReport {
  const cases = extractTestcases(xml);
  const tests: TestResult[] = cases.map((c) => ({
    name: c.name,
    status: c.failed ? "fail" : "pass",
    ...(c.message ? { message: c.message } : {}),
  }));
  const allPass = tests.length > 0 && tests.every((t) => t.status === "pass");
  return {
    overall: allPass ? "pass" : "fail",
    tests,
    complete: allPass,
    rawOutput,
  };
}

/**
 * Build a synthetic failing report when no junit XML exists at all — e.g. a
 * hidden test file failed to parse (syntax error) before any test could run.
 * Keeps the harness's output contract uniform (callers never need to branch
 * on "did junit even get written").
 */
export function parseFailureReport(reason: string, rawOutput: string): TestHarnessReport {
  return {
    overall: "fail",
    tests: [{ name: reason, status: "fail", message: rawOutput.trim() || reason }],
    complete: false,
    rawOutput,
  };
}

// ---------------------------------------------------------------------------
// Sandbox execution glue — the only impure piece.
// ---------------------------------------------------------------------------

async function writeFileMap(dir: string, files: FileMap): Promise<void> {
  for (const [filename, contents] of Object.entries(files)) {
    const filePath = join(dir, filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }
}

/**
 * Run `hiddenTests` against `currentFiles` (the learner's live editor state —
 * `TaskRunnerHandle.getCurrentFiles()` / `TaskFileState.getCurrentFiles()`
 * from task-runner.ts, T2) inside a fresh sandbox directory, via the real
 * Bun test runner (see module docstring for why this — not the in-browser
 * bun.wasm VFS runner — is "the existing Burrow bun toolchain" for grading).
 *
 * Materializes `currentFiles` first, then `hiddenTests` on top (a hidden
 * test's filename always wins if it collides with a learner file — hidden
 * tests must not be overwritable by editing a same-named starter file).
 */
export async function runHiddenTests(
  currentFiles: Record<string, string>,
  hiddenTests: HiddenTest[],
): Promise<TestHarnessReport> {
  const dir = await mkdtemp(join(tmpdir(), "v2r-harness-"));
  try {
    await writeFileMap(dir, currentFiles);
    // Hidden tests are written last/on top so they always win filename collisions.
    const testFiles: FileMap = {};
    for (const t of hiddenTests) testFiles[t.filename] = t.contents;
    await writeFileMap(dir, testFiles);

    const reportPath = join(dir, ".v2r-junit-report.xml");
    const testFilenames = hiddenTests.map((t) => t.filename);

    const proc = Bun.spawn(
      ["bun", "test", "--reporter=junit", `--reporter-outfile=${reportPath}`, ...testFilenames],
      { cwd: dir, stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const rawOutput = stdout + stderr;

    let xml: string | null = null;
    try {
      xml = await readFile(reportPath, "utf8");
    } catch {
      xml = null;
    }

    if (xml === null) {
      return parseFailureReport("hidden tests failed to run (see rawOutput)", rawOutput);
    }
    return parseJunitReport(xml, rawOutput);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
