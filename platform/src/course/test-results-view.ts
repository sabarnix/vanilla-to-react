/**
 * Burrow src/course — hidden-test results view helper (T3, SPEC.md §5).
 *
 * A thin, DOM-free rendering layer over a `TestHarnessReport`
 * (test-harness.ts). Kept separate from the harness itself so the harness's
 * parsing/execution stays UI-agnostic (T6's hints UI and T12's content QA
 * consume the report directly; this module is only for the on-screen
 * per-test + overall pass/fail presentation).
 *
 * Two outputs, matching the split already used elsewhere in src/course/
 * (renderTaskDescription returns an HTML string; mountTaskRunner is the only
 * DOM-touching piece):
 *   - `renderTestResultsHtml()`: pure string builder, unit-testable without a
 *     DOM.
 *   - `mountTestResultsView()`: the DOM-touching piece, for wiring into a
 *     host element.
 */

import type { TestHarnessReport, TestResult } from "./test-harness.ts";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusIcon(status: TestResult["status"]): string {
  return status === "pass" ? "✓" : "✗";
}

function renderTestLine(test: TestResult): string {
  const cls = test.status === "pass" ? "test-result-pass" : "test-result-fail";
  const message =
    test.status === "fail" && test.message
      ? `<div class="test-result-message">${escapeHtml(test.message)}</div>`
      : "";
  return (
    `<li class="test-result ${cls}">` +
    `<span class="test-result-icon">${statusIcon(test.status)}</span> ` +
    `<span class="test-result-name">${escapeHtml(test.name)}</span>` +
    message +
    `</li>`
  );
}

/**
 * Render a `TestHarnessReport` to a self-contained HTML fragment: an overall
 * pass/fail banner (and completion note when `complete`) followed by a
 * per-test list. Pure string building — safe to unit test without a DOM.
 */
export function renderTestResultsHtml(report: TestHarnessReport): string {
  const overallCls = report.overall === "pass" ? "test-results-pass" : "test-results-fail";
  const overallLabel = report.overall === "pass" ? "All tests passed" : "Some tests failed";
  const completeNote = report.complete
    ? `<div class="test-results-complete">Task complete 🎉</div>`
    : "";

  if (report.tests.length === 0) {
    return (
      `<div class="test-results ${overallCls}">` +
      `<div class="test-results-summary">${escapeHtml(overallLabel)}</div>` +
      `<div class="test-results-empty">No tests ran.</div>` +
      `</div>`
    );
  }

  const items = report.tests.map(renderTestLine).join("");
  return (
    `<div class="test-results ${overallCls}">` +
    `<div class="test-results-summary">${escapeHtml(overallLabel)}</div>` +
    completeNote +
    `<ul class="test-results-list">${items}</ul>` +
    `</div>`
  );
}

/** Mount a `TestHarnessReport`'s rendered HTML into a host element. */
export function mountTestResultsView(host: HTMLElement, report: TestHarnessReport): void {
  host.innerHTML = renderTestResultsHtml(report);
}
