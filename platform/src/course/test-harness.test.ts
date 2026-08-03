/**
 * Burrow src/course — hidden-test harness tests (T3, SPEC.md §5).
 *
 * Two layers, matching test-harness.ts's own split:
 *   (a) pure parser tests over canned bun-test junit XML (pass / fail /
 *       mixed / no-report-written) — zero I/O, no live sandbox;
 *   (b) an integration test that drives the REAL toolchain
 *       (`runHiddenTests` -> `Bun.spawn(["bun","test",...])`, same machinery
 *       T8's content-QA suite established) against the shipped sample course
 *       task (sample-course.ts): the authored `solution` must pass+complete,
 *       and both `starterCode` and a deliberately-wrong edit must fail.
 */

import { describe, expect, test } from "bun:test";
import { sampleCourse } from "./sample-course.ts";
import { parseFailureReport, parseJunitReport, runHiddenTests } from "./test-harness.ts";

const sampleTask = sampleCourse.days[0]!.tasks[0]!;

// ---------------------------------------------------------------------------
// (a) pure parser tests
// ---------------------------------------------------------------------------

const ALL_PASS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="2" assertions="2" failures="0" skipped="0" time="0.01">
  <testsuite name="a.test.ts" file="a.test.ts" tests="2" assertions="2" failures="0" skipped="0" time="0" hostname="h">
    <testcase name="pass one" classname="" time="0.0001" file="a.test.ts" line="2" assertions="1" />
    <testcase name="pass two" classname="" time="0.0001" file="a.test.ts" line="3" assertions="1" />
  </testsuite>
</testsuites>`;

const ALL_FAIL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="2" assertions="1" failures="2" skipped="0" time="0.01">
  <testsuite name="a.test.ts" file="a.test.ts" tests="2" assertions="1" failures="2" skipped="0" time="0" hostname="h">
    <testcase name="fail one" classname="" time="0.0001" file="a.test.ts" line="2" assertions="0">
      <failure type="AssertionError">Expected: 2\nReceived: 1</failure>
    </testcase>
    <testcase name="fail two" classname="" time="0.0001" file="a.test.ts" line="3" assertions="0">
      <failure type="AssertionError" />
    </testcase>
  </testsuite>
</testsuites>`;

const MIXED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" assertions="2" failures="1" skipped="0" time="0.02">
  <testsuite name="mixed.test.ts" file="mixed.test.ts" tests="3" assertions="2" failures="1" skipped="0" time="0" hostname="h">
    <testcase name="pass one" classname="" time="0.0001" file="mixed.test.ts" line="2" assertions="1" />
    <testcase name="fail one" classname="" time="0.0001" file="mixed.test.ts" line="3" assertions="0">
      <failure type="AssertionError">Expected: "b"\nReceived: "a"</failure>
    </testcase>
    <testcase name="pass two" classname="" time="0.0001" file="mixed.test.ts" line="4" assertions="1" />
  </testsuite>
</testsuites>`;

describe("parseJunitReport — pure parsing over sample bun-test output", () => {
  test("all-pass report: overall pass, complete true, every test marked pass", () => {
    const report = parseJunitReport(ALL_PASS_XML);
    expect(report.overall).toBe("pass");
    expect(report.complete).toBe(true);
    expect(report.tests).toEqual([
      { name: "pass one", status: "pass" },
      { name: "pass two", status: "pass" },
    ]);
  });

  test("all-fail report: overall fail, complete false, every test marked fail with a message", () => {
    const report = parseJunitReport(ALL_FAIL_XML);
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
    expect(report.tests.length).toBe(2);
    expect(report.tests[0]!.status).toBe("fail");
    expect(report.tests[0]!.name).toBe("fail one");
    expect(report.tests[0]!.message).toContain("Expected: 2");
    expect(report.tests[1]!.status).toBe("fail");
    // No <failure> body/message/type text beyond the bare tag -> falls back to "type" attr.
    expect(report.tests[1]!.message).toBe("AssertionError");
  });

  test("mixed report: overall fail (any failure fails the whole task), per-test statuses preserved", () => {
    const report = parseJunitReport(MIXED_XML);
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
    expect(report.tests).toEqual([
      { name: "pass one", status: "pass" },
      { name: "fail one", status: "fail", message: 'Expected: "b"\nReceived: "a"' },
      { name: "pass two", status: "pass" },
    ]);
  });

  test("rawOutput is carried through unchanged for debugging", () => {
    const report = parseJunitReport(ALL_PASS_XML, "some console output\n");
    expect(report.rawOutput).toBe("some console output\n");
  });

  test("empty testsuites (0 tests found) is not a pass — overall fail, complete false", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="0" assertions="0" failures="0" skipped="0" time="0.01">
</testsuites>`;
    const report = parseJunitReport(xml);
    expect(report.tests).toEqual([]);
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
  });
});

describe("parseFailureReport — synthetic failure when no junit XML was written", () => {
  test("builds a single failing synthetic test carrying the raw output", () => {
    const report = parseFailureReport("syntax error", "error: Expected \";\" but found \"error\"\n");
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
    expect(report.tests.length).toBe(1);
    expect(report.tests[0]!.status).toBe("fail");
    expect(report.tests[0]!.message).toContain("Expected");
  });

  test("falls back to the reason string when rawOutput is blank", () => {
    const report = parseFailureReport("no output produced", "   \n");
    expect(report.tests[0]!.message).toBe("no output produced");
  });
});

// ---------------------------------------------------------------------------
// (b) integration test — real toolchain against the shipped sample course task
// ---------------------------------------------------------------------------

describe("runHiddenTests — integration against sample-course.ts's task (real bun test)", () => {
  test("correct solution -> overall pass, complete true", async () => {
    expect(sampleTask.solution).toBeDefined();
    const report = await runHiddenTests(sampleTask.solution!, sampleTask.hiddenTests);
    if (report.overall !== "pass") {
      throw new Error(`expected pass, got fail. rawOutput:\n${report.rawOutput}`);
    }
    expect(report.overall).toBe("pass");
    expect(report.complete).toBe(true);
    expect(report.tests.length).toBeGreaterThan(0);
    expect(report.tests.every((t) => t.status === "pass")).toBe(true);
  });

  test("starterCode (unsolved) -> overall fail, complete false", async () => {
    const report = await runHiddenTests(sampleTask.starterCode, sampleTask.hiddenTests);
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
    expect(report.tests.some((t) => t.status === "fail")).toBe(true);
  });

  test("wrong code (learner typo'd the heading) -> overall fail, complete false", async () => {
    const wrongFiles = { ...sampleTask.starterCode, "index.html": sampleTask.starterCode["index.html"]!.replace("Change me", "Hallo") };
    const report = await runHiddenTests(wrongFiles, sampleTask.hiddenTests);
    expect(report.overall).toBe("fail");
    expect(report.complete).toBe(false);
  });

  test("per-test name matches the hidden test's authored test() name", async () => {
    const report = await runHiddenTests(sampleTask.solution!, sampleTask.hiddenTests);
    expect(report.tests.map((t) => t.name)).toContain("h1 says Hello");
  });
});
