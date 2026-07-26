/**
 * Burrow — lightweight Swagger-style API tester panel (src/ui internal).
 *
 * Lets a learner hit their running API (served at /preview/<path>) without
 * leaving the IDE. Dependency-free: plain DOM via the h() helper.
 *
 * Layout: variant B "split pane" (validated in proto/apitester, DECISION.md).
 * A full-width method/path strip on top, then two columns — request builder
 * (JSON body) on the left, response on the right — so the request and its
 * response stay visible together, Postman-style. Body-only for now ("B-lite");
 * a Headers tab can be added later without disturbing this layout.
 *
 * Usage: call initApiTester(el) from main.tsx with the panel's host element.
 */
import { h } from "./util.ts";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PREVIEW_PREFIX = "/preview";

export function initApiTester(el: HTMLElement): void {
  el.innerHTML = "";

  // ── method/path strip (full width, top) ───────────────────────────────────
  const toolbar = h("div", "apitester-toolbar");

  const methodSelect = document.createElement("select");
  methodSelect.className = "apitester-method";
  for (const m of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    methodSelect.appendChild(opt);
  }

  const pathInput = h("input") as HTMLInputElement;
  pathInput.type = "text";
  pathInput.className = "apitester-path";
  pathInput.value = "/api/todos";
  pathInput.placeholder = "/api/todos";
  pathInput.spellcheck = false;

  const sendBtn = h("button", "apitester-send t-btn t-run", "▸ send");
  (sendBtn as HTMLButtonElement).type = "button";

  toolbar.append(methodSelect, pathInput, sendBtn);

  // ── split pane (request left | response right) ─────────────────────────────
  const split = h("div", "apitester-split");

  // request column (left) ─ JSON body
  const requestPane = h("div", "apitester-pane apitester-request");
  const bodyRow = h("div", "apitester-body-row");
  const bodyLabel = h("label", "apitester-body-label", "request body (JSON)");
  const bodyArea = document.createElement("textarea");
  bodyArea.className = "apitester-body";
  bodyArea.placeholder = '{\n  "key": "value"\n}';
  bodyArea.spellcheck = false;
  bodyRow.append(bodyLabel, bodyArea);

  // Shown when the current method carries no body (GET), so the left pane
  // never looks empty/broken.
  const bodyEmpty = h(
    "div",
    "apitester-body-empty",
    "This method has no request body.",
  );
  bodyEmpty.hidden = true;

  requestPane.append(bodyRow, bodyEmpty);

  // response column (right)
  const responsePane = h("div", "apitester-pane apitester-response");

  const statusEl = h("span", "apitester-status");
  const metaEl = h("span", "apitester-meta");
  const responseHeader = h("div", "apitester-response-header");
  responseHeader.append(statusEl, metaEl);

  const headersEl = h("pre", "apitester-headers");
  const bodyEl = h("pre", "apitester-body-out");

  // Placeholder until the first request is sent.
  const responseEmpty = h(
    "div",
    "apitester-response-empty",
    "Send a request to see the response here.",
  );

  responsePane.append(responseHeader, headersEl, bodyEl, responseEmpty);

  split.append(requestPane, responsePane);

  // Start in the "empty" state: hide the live response bits.
  responseHeader.hidden = true;
  headersEl.hidden = true;
  bodyEl.hidden = true;

  // ── assemble ─────────────────────────────────────────────────────────────
  el.append(toolbar, split);

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateBodyVisibility(): void {
    const hasBody = METHODS_WITH_BODY.has(methodSelect.value);
    bodyRow.hidden = !hasBody;
    bodyEmpty.hidden = hasBody;
  }

  function setStatus(code: number, text: string): void {
    statusEl.textContent = `${code} ${text}`;
    statusEl.className = "apitester-status";
    if (code >= 200 && code < 300) {
      statusEl.classList.add("apitester-status-ok");
    } else if (code >= 400 && code < 500) {
      statusEl.classList.add("apitester-status-warn");
    } else if (code >= 500 || code === 0) {
      statusEl.classList.add("apitester-status-err");
    }
  }

  function renderHeaders(headers: Headers): void {
    const lines: string[] = [];
    headers.forEach((value, key) => {
      lines.push(`${key}: ${value}`);
    });
    headersEl.textContent = lines.join("\n") || "(no headers)";
  }

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setMeta(ms: number, bytes: number): void {
    metaEl.textContent = `${Math.round(ms)} ms · ${fmtBytes(bytes)}`;
  }

  async function send(): Promise<void> {
    const method = methodSelect.value;
    const rawPath = pathInput.value.trim() || "/";
    // Always prefix with /preview so the service worker intercepts it.
    const url = `${PREVIEW_PREFIX}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;

    let body: string | undefined;
    if (METHODS_WITH_BODY.has(method)) {
      const raw = bodyArea.value.trim();
      body = raw || undefined;
    }

    sendBtn.textContent = "…";
    (sendBtn as HTMLButtonElement).disabled = true;

    // Enter live response state.
    responseEmpty.hidden = true;
    responseHeader.hidden = false;
    headersEl.hidden = false;
    bodyEl.hidden = false;
    statusEl.textContent = "sending…";
    statusEl.className = "apitester-status";
    metaEl.textContent = "";
    headersEl.textContent = "";
    bodyEl.textContent = "";

    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: body !== undefined ? { "content-type": "application/json" } : {},
        body,
      });

      setStatus(res.status, res.statusText);
      renderHeaders(res.headers);

      const ct = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const elapsed = performance.now() - t0;
      setMeta(elapsed, new Blob([raw]).size);

      if (ct.includes("json")) {
        try {
          bodyEl.textContent = JSON.stringify(JSON.parse(raw) as unknown, null, 2);
        } catch {
          bodyEl.textContent = raw;
        }
      } else {
        bodyEl.textContent = raw;
      }
    } catch (err) {
      // Network error (e.g. fetch itself threw — unusual, but guard it).
      setStatus(0, "network error");
      setMeta(performance.now() - t0, 0);
      headersEl.textContent = "";
      bodyEl.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      sendBtn.textContent = "▸ send";
      (sendBtn as HTMLButtonElement).disabled = false;
    }
  }

  // ── events ────────────────────────────────────────────────────────────────
  updateBodyVisibility();
  methodSelect.addEventListener("change", updateBodyVisibility);
  sendBtn.addEventListener("click", () => void send());

  // Send on Enter in the path field.
  pathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void send();
  });
}
