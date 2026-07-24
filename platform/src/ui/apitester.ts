/**
 * Burrow — lightweight Swagger-style API tester panel (src/ui internal).
 *
 * Lets a learner hit their running API (served at /preview/<path>) without
 * leaving the IDE. Dependency-free: plain DOM via the h() helper.
 *
 * Usage: call initApiTester(el) from main.tsx with the panel's host element.
 */
import { h } from "./util.ts";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PREVIEW_PREFIX = "/preview";

export function initApiTester(el: HTMLElement): void {
  el.innerHTML = "";

  // ── toolbar row ──────────────────────────────────────────────────────────
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

  // ── body textarea row ────────────────────────────────────────────────────
  const bodyRow = h("div", "apitester-body-row");
  const bodyLabel = h("label", "apitester-body-label", "request body (JSON)");
  const bodyArea = document.createElement("textarea");
  bodyArea.className = "apitester-body";
  bodyArea.rows = 4;
  bodyArea.placeholder = '{\n  "key": "value"\n}';
  bodyArea.spellcheck = false;
  bodyRow.append(bodyLabel, bodyArea);

  // ── response area ─────────────────────────────────────────────────────────
  const responseEl = h("div", "apitester-response");
  responseEl.hidden = true;

  const statusEl = h("span", "apitester-status");
  const headersEl = h("pre", "apitester-headers");
  const bodyEl = h("pre", "apitester-body-out");

  const responseHeader = h("div", "apitester-response-header");
  responseHeader.append(statusEl);

  responseEl.append(responseHeader, headersEl, bodyEl);

  // ── assemble ─────────────────────────────────────────────────────────────
  el.append(toolbar, bodyRow, responseEl);

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateBodyVisibility(): void {
    const hasBody = METHODS_WITH_BODY.has(methodSelect.value);
    bodyRow.hidden = !hasBody;
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
    responseEl.hidden = false;
    statusEl.textContent = "sending…";
    statusEl.className = "apitester-status";
    headersEl.textContent = "";
    bodyEl.textContent = "";

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
