/**
 * Burrow — center editor: Monaco, file tabs, autosave (src/ui internal).
 * Edits write to the VFS on a ~400ms per-tab trailing debounce; cmd/ctrl+S
 * flushes immediately. There are no dirty markers and no prompts — content is
 * always saved (a transient saving…/saved indicator lives in the status bar).
 * Every save goes through vfs.writeFile, so WatchedFs emits "file:changed"
 * and the rest of the app (tree, git panel, hot reload) sees it instantly.
 *
 * MONACO WORKER STRATEGY: We run Monaco in "editor-only" mode — no background
 * language-worker processes (no TypeScript IntelliSense worker, no JSON schema
 * worker). This avoids worker URL / bundling complexity with Bun.build's
 * browser target. To do this, we set self.MonacoEnvironment.getWorker to
 * return a trivial no-op Worker (using a blob: URL). We still get syntax
 * highlighting for all supported languages via Monaco's built-in tokenizers,
 * which run on the main thread. The trade-off: no background type-checking,
 * no hover-info popups, no advanced completions. For a teaching environment
 * this is the right balance: simpler, more robust, no size penalty for worker
 * bundles.
 *
 * MARKDOWN PREVIEW: .md files open rendered (src/ui/markdown.ts) with an
 * edit ⇄ preview chip in the top-right of the pane; the choice sticks per
 * tab. Workspace-relative image paths resolve through the VFS into blob URLs
 * (revoked on every rerender); http(s)/data: URLs pass through untouched.
 */

// Configure Monaco's worker environment BEFORE importing monaco.
// We stub out all workers with a no-op blob worker so no external worker
// URLs are needed — syntax highlighting still works on the main thread.
// This must happen before any Monaco module is loaded.
(self as unknown as Record<string, unknown>)["MonacoEnvironment"] = {
  getWorker: (_workerId: string, _label: string): Worker => {
    // No-op worker: Monaco will fall back to main-thread tokenization.
    const blob = new Blob(["self.onmessage=function(){}"], { type: "text/javascript" });
    return new Worker(URL.createObjectURL(blob));
  },
};

// Import only the editor API (no LSP or full language support bundle).
// This avoids the monaco-lsp-client missing-module issue in editor.main.js.
import * as monaco from "monaco-editor/editor/editor.api";

// Register only the languages we need. Each register.js call registers
// a lazy loader — the tokenizer grammar loads on first use.
// Note: Monaco 0.56 ships JSON support only via `features/json` which depends
// on `external/jsonc-parser` (NOT included in the npm bundle). We skip the
// JSON import and fall back to plaintext for .json files. All others are in
// `definitions/` and self-contained (no missing external deps).
import "monaco-editor/languages/definitions/typescript/register";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/css/register";
import "monaco-editor/languages/definitions/html/register";
import "monaco-editor/languages/definitions/markdown/register";

import { use } from "../contract/registry.ts";
import { AutosaveScheduler } from "./autosave.ts";
import { renderMarkdownDoc } from "./markdown.ts";
import { basename, debounce, decodeText, extOf, h, looksBinary } from "./util.ts";

export interface EditorUiState {
  activePath: string | null;
  openPaths: string[];
}

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; detail: string };

interface OpenDoc {
  path: string;
  /** Saved Monaco model for this path — preserves undo history across tab switches. */
  model: monaco.editor.ITextModel;
  /** Per-tab view state (cursor, scroll) saved when switching away from a tab. */
  viewState: monaco.editor.ICodeEditorViewState | null;
  /** Last text known to be on disk (or in flight to it). */
  savedText: string;
  binary: boolean;
  byteSize: number;
  /** .md files only: rendered preview vs raw source. Sticky per tab. */
  mdPreview?: boolean;
}

const isMarkdown = (path: string): boolean => extOf(path) === "md";

/** Map file extension → Monaco language id. */
function langIdFor(path: string): string {
  switch (extOf(path)) {
    case "ts":
    case "mts":
    case "cts":
      return "typescript";
    case "tsx":
      return "typescript"; // Monaco typescript supports JSX via tsx uri
    case "jsx":
      return "javascript"; // Monaco javascript supports JSX via jsx uri
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "json":
      // Monaco 0.56 JSON support requires external/jsonc-parser (not bundled).
      // Use plaintext to avoid import errors; structure is still readable.
      return "plaintext";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

/** Create a Monaco model URI for a path (used to distinguish models). */
function uriFor(path: string): monaco.Uri {
  // Use tsx/jsx URI to enable JSX in Monaco's TypeScript/JavaScript tokenizer.
  return monaco.Uri.parse(`file://${path}`);
}

const docs = new Map<string, OpenDoc>();
const order: string[] = [];
const listeners = new Set<(s: EditorUiState) => void>();
const saveListeners = new Set<(s: SaveState) => void>();
const autosave = new AutosaveScheduler();
let inflightWrites = 0;
let lastSaveError: string | null = null;
let saveState: SaveState = { kind: "idle" };
let active: string | null = null;
/** The single Monaco editor instance, reused across all tabs. */
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let tabsEl: HTMLElement | null = null;
let hostEl: HTMLElement | null = null;
let emptyEl: HTMLElement | null = null;
let previewEl: HTMLElement | null = null;
let mdToggleEl: HTMLButtonElement | null = null;
/** Blob URLs minted for the current preview render — revoked on the next. */
let previewBlobUrls: string[] = [];
/** Guards against a stale async image-hydration pass writing into a newer render. */
let previewEpoch = 0;
/** Unsubscribe function for the active model's content-change listener. */
let activeModelListener: monaco.IDisposable | null = null;

// ── public surface ───────────────────────────────────────────────────────────

export function onEditorChange(cb: (s: EditorUiState) => void): () => void {
  listeners.add(cb);
  cb(uiState());
  return () => listeners.delete(cb);
}

/** Autosave lifecycle feed for the status bar indicator. */
export function onSaveState(cb: (s: SaveState) => void): () => void {
  saveListeners.add(cb);
  cb(saveState);
  return () => saveListeners.delete(cb);
}

export function getActivePath(): string | null {
  return active;
}

/** Force-write every pending buffer right now (cmd/ctrl+S path). */
export function flushPendingSaves(): void {
  autosave.flushAll();
}

/**
 * Close every open editor tab (ADR-0007): flushes pending saves first so no
 * edits are lost, then disposes each doc/model. Used by course mode on task
 * switch so tabs from a previous problem don't accumulate.
 */
export function closeAllTabs(): void {
  autosave.flushAll();
  for (const path of [...order]) {
    close(path);
  }
}

export function initEditor(tabs: HTMLElement, host: HTMLElement, empty: HTMLElement): void {
  tabsEl = tabs;
  hostEl = host;
  emptyEl = empty;
  const events = use("events");

  // Create the single Monaco editor instance. It is reused across tabs by
  // swapping the model via editor.setModel().
  editor = monaco.editor.create(host, {
    theme: "vs-dark",
    tabSize: 2,
    insertSpaces: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontFamily: "Berkeley Mono, ui-monospace, SF Mono, JetBrains Mono, Fira Code, Menlo, Consolas, monospace",
    fontSize: 13,
    lineHeight: 20,
    automaticLayout: true, // handles ResizeObserver automatically
    wordWrap: "off",
    renderWhitespace: "none",
    glyphMargin: false,
    folding: true,
    lineNumbers: "on",
    renderLineHighlight: "line",
    occurrencesHighlight: "off",
    // Disable features that need workers
    // hover.enabled is "on"|"off" in Monaco 0.56 (string enum, not boolean)
    parameterHints: { enabled: false },
    suggestOnTriggerCharacters: false,
    quickSuggestions: false,
    wordBasedSuggestions: "off",
  });

  // Preview surface + mode chip live beside the Monaco host in #editor-body.
  previewEl = h("div", "md-preview");
  previewEl.style.display = "none";
  mdToggleEl = h("button", "md-toggle") as HTMLButtonElement;
  mdToggleEl.type = "button";
  mdToggleEl.style.display = "none";
  mdToggleEl.addEventListener("click", () => {
    const doc = active ? docs.get(active) : undefined;
    if (!doc || !isMarkdown(doc.path)) return;
    doc.mdPreview = !doc.mdPreview;
    render();
    if (!doc.mdPreview) editor?.focus();
  });
  host.parentElement?.append(previewEl, mdToggleEl);

  events.on("editor:open", (e) => {
    void open(e.path, e.line, e.column);
  });
  events.on("file:changed", (e) => {
    if (e.kind === "deleted") {
      // A deleted directory collapses into one event for the top path —
      // close every open doc at or under it.
      for (const path of [...docs.keys()]) {
        if (path === e.path || path.startsWith(`${e.path}/`)) handleGone(path);
      }
    } else if (docs.has(e.path)) {
      void reload(e.path);
    }
  });
  events.on("fs:batch", () => reconcileAll());

  // One global save shortcut: flush pending autosaves immediately and always
  // eat the browser's save dialog.
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      flushPendingSaves();
    }
  });

  // Autosave means closing never prompts; the last debounce window is flushed
  // synchronously so not even a just-typed character is lost.
  window.addEventListener("beforeunload", () => {
    for (const key of autosave.keys()) {
      autosave.cancel(key);
      const doc = docs.get(key);
      if (!doc || doc.binary) continue;
      const text = textOf(doc);
      if (text === doc.savedText) continue;
      try {
        use("vfs").writeFileSync(key, text);
      } catch {
        /* the in-memory fs is going away with the page anyway */
      }
    }
  });

  render();
}

// ── internals ────────────────────────────────────────────────────────────────

function uiState(): EditorUiState {
  return { activePath: active, openPaths: [...order] };
}

function notify(): void {
  const s = uiState();
  for (const cb of listeners) {
    try {
      cb(s);
    } catch (err) {
      console.error("[burrow/ui] editor listener failed", err);
    }
  }
}

function emitSaveState(s: SaveState): void {
  if (s.kind === saveState.kind && s.kind !== "error") return;
  saveState = s;
  for (const cb of saveListeners) {
    try {
      cb(s);
    } catch (err) {
      console.error("[burrow/ui] save-state listener failed", err);
    }
  }
}

// ── autosave core ────────────────────────────────────────────────────────────

function textOf(doc: OpenDoc): string {
  return doc.model.getValue();
}

function scheduleSave(path: string): void {
  lastSaveError = null;
  emitSaveState({ kind: "saving" });
  autosave.schedule(path, () => void persist(path));
}

async function persist(path: string): Promise<void> {
  const doc = docs.get(path);
  if (!doc || doc.binary) {
    settleSaveState();
    return;
  }
  const text = textOf(doc);
  if (text === doc.savedText) {
    settleSaveState();
    return;
  }
  doc.savedText = text; // claim before the await so reload() keeps the buffer
  inflightWrites++;
  try {
    await use("vfs").writeFile(path, text);
  } catch (err) {
    console.error(`[burrow/ui] autosave failed for ${path}`, err);
    lastSaveError = basename(path);
  } finally {
    inflightWrites--;
    settleSaveState();
  }
}

function settleSaveState(outcome: "saved" | "idle" = "saved"): void {
  if (autosave.size > 0 || inflightWrites > 0) return;
  if (lastSaveError) emitSaveState({ kind: "error", detail: lastSaveError });
  else emitSaveState({ kind: outcome });
}

// ── open / close / reload ────────────────────────────────────────────────────

async function open(path: string, line?: number, column?: number): Promise<void> {
  if (!docs.has(path)) {
    const vfs = use("vfs");
    let buf: Uint8Array;
    try {
      buf = await vfs.readFileBuffer(path);
    } catch (err) {
      console.error(`[burrow/ui] cannot open ${path}`, err);
      return;
    }
    const binary = looksBinary(buf);
    const text = binary ? "" : decodeText(buf);
    const model = binary
      ? monaco.editor.createModel("", "plaintext", uriFor(path))
      : monaco.editor.createModel(text, langIdFor(path), uriFor(path));
    docs.set(path, {
      path,
      model,
      viewState: null,
      savedText: text,
      binary,
      byteSize: buf.byteLength,
      // Docs read best rendered; jumping to a line means the caller wants source.
      ...(isMarkdown(path) ? { mdPreview: line === undefined } : {}),
    });
    order.push(path);
  }
  const doc = docs.get(path);
  if (line !== undefined && doc?.mdPreview) doc.mdPreview = false; // reveal needs source
  activate(path);
  if (line !== undefined) reveal(line, column);
}

/** Wire content-change listener for the currently active model. */
function wireModelListener(path: string): void {
  // Dispose any previous listener first.
  activeModelListener?.dispose();
  activeModelListener = null;

  const doc = docs.get(path);
  if (!doc || doc.binary) return;

  activeModelListener = doc.model.onDidChangeContent(() => {
    scheduleSave(path);
  });
}

function activate(path: string): void {
  const next = docs.get(path);
  if (!next) return;

  // Stash view state (cursor/scroll) for the current tab before switching.
  if (active && editor) {
    const prev = docs.get(active);
    if (prev && !prev.binary) {
      prev.viewState = editor.saveViewState();
    }
  }

  active = path;

  if (!next.binary && editor) {
    editor.setModel(next.model);
    // Restore the saved view state (cursor/scroll) for this tab.
    if (next.viewState) {
      editor.restoreViewState(next.viewState);
    }
    wireModelListener(path);
  } else if (next.binary) {
    // Detach the editor from the model for binary files.
    editor?.setModel(null);
    activeModelListener?.dispose();
    activeModelListener = null;
  }

  render();
  if (!next.binary && !next.mdPreview) editor?.focus();
}

function reveal(line: number, column?: number): void {
  if (!editor) return;
  try {
    const pos: monaco.IPosition = {
      lineNumber: Math.max(1, line),
      column: Math.max(1, column ?? 1),
    };
    editor.setPosition(pos);
    editor.revealPositionInCenter(pos);
  } catch (err) {
    console.error("[burrow/ui] reveal failed", err);
  }
}

/** User closed the tab: flush any pending save (never prompts), then drop it. */
function close(path: string): void {
  autosave.flush(path); // persist() captures the text synchronously
  removeDoc(path);
}

/** The file vanished from disk: drop the tab, discard any pending save. */
function handleGone(path: string): void {
  if (!docs.has(path)) return;
  autosave.cancel(path);
  settleSaveState("idle");
  removeDoc(path);
}

function removeDoc(path: string): void {
  const doc = docs.get(path);
  if (!doc) return;

  // If this is the active doc, clean up the listener before disposing.
  if (active === path) {
    activeModelListener?.dispose();
    activeModelListener = null;
  }

  // Dispose the Monaco model to release memory.
  doc.model.dispose();

  docs.delete(path);
  const i = order.indexOf(path);
  if (i !== -1) order.splice(i, 1);

  if (active === path) {
    active = null;
    editor?.setModel(null);
    const neighbor = order[Math.min(i, order.length - 1)];
    if (neighbor) {
      activate(neighbor);
      return;
    }
  }
  render();
}

const reconcileAll = debounce(() => {
  for (const path of [...docs.keys()]) void reload(path);
}, 100);

async function reload(path: string): Promise<void> {
  const doc = docs.get(path);
  if (!doc || doc.binary) return;
  const vfs = use("vfs");
  let exists = false;
  try {
    exists = await vfs.exists(path);
  } catch {
    return;
  }
  if (!exists) {
    handleGone(path);
    return;
  }
  let buf: Uint8Array;
  try {
    buf = await vfs.readFileBuffer(path);
  } catch {
    return;
  }
  const text = decodeText(buf);
  if (text === doc.savedText) return; // our own autosave echoing back
  doc.savedText = text;
  doc.byteSize = buf.byteLength;
  if (!autosave.has(path)) {
    // No pending edits → follow the disk (git checkout, shell edits, …).
    // Update the model WITHOUT triggering our content-change listener
    // (which would schedule a spurious save loop). We do this by temporarily
    // disconnecting the listener, then pushing the value via model.setValue(),
    // then reconnecting.
    if (active === path) {
      // Disconnect listener to avoid save loop.
      activeModelListener?.dispose();
      activeModelListener = null;
      doc.model.setValue(text);
      // Reconnect.
      wireModelListener(path);
    } else {
      // Background tab: just update the model value (no listener active).
      doc.model.setValue(text);
    }
    // A previewed doc follows the disk immediately (agent edits, git checkout).
    if (active === path && doc.mdPreview) renderPreview(doc);
  }
  // With edits pending, the buffer wins: the scheduled autosave will
  // overwrite the disk in <400ms anyway.
}

// ── rendering ────────────────────────────────────────────────────────────────

function render(): void {
  renderTabs();
  const doc = active ? docs.get(active) : undefined;
  if (hostEl && emptyEl && previewEl && mdToggleEl) {
    const showPreview = !!doc && !doc.binary && !!doc.mdPreview;
    const showEditor = !!doc && !doc.binary && !showPreview;
    hostEl.style.display = showEditor ? "" : "none";
    previewEl.style.display = showPreview ? "" : "none";
    emptyEl.style.display = showEditor || showPreview ? "none" : "";
    const isMd = !!doc && !doc.binary && isMarkdown(doc.path);
    mdToggleEl.style.display = isMd ? "" : "none";
    if (isMd) {
      mdToggleEl.textContent = showPreview ? "✎ edit" : "◫ preview";
      mdToggleEl.title = showPreview ? "edit the source" : "render the markdown";
    }
    if (showPreview && doc) renderPreview(doc);
    if (!doc) {
      emptyEl.textContent = "Nothing open yet. Pick a file from the tree, or type `edit index.ts` in the terminal.";
    } else if (doc.binary) {
      emptyEl.textContent = `// ${basename(doc.path)} is binary — ${doc.byteSize} bytes, no editor for that`;
    }
  }
  notify();
}

// ── markdown preview ─────────────────────────────────────────────────────────

const IMAGE_MIME: Record<string, string> = {
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", ico: "image/x-icon", bmp: "image/bmp",
};

/** Resolve a markdown-relative src against the doc's directory ("."/".." aware). */
function resolveDocPath(docPath: string, src: string): string {
  const base = src.startsWith("/") ? [] : docPath.split("/").slice(0, -1);
  const segments = [...base, ...src.split("/")];
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return `/${out.join("/")}`;
}

function renderPreview(doc: OpenDoc): void {
  if (!previewEl) return;
  const epoch = ++previewEpoch;
  for (const url of previewBlobUrls) URL.revokeObjectURL(url);
  previewBlobUrls = [];
  previewEl.innerHTML = renderMarkdownDoc(textOf(doc));
  previewEl.scrollTop = 0;

  // Hydrate images: http(s)/data: pass through; anything else is a workspace
  // path served out of the VFS as a blob URL (async — epoch-guarded).
  for (const img of previewEl.querySelectorAll<HTMLImageElement>("img[data-md-src]")) {
    const src = img.getAttribute("data-md-src") ?? "";
    if (/^(https?:|data:)/i.test(src)) {
      img.src = src;
      continue;
    }
    const path = resolveDocPath(doc.path, src);
    void use("vfs")
      .readFileBuffer(path)
      .then((buf) => {
        if (epoch !== previewEpoch) return;
        const mime = IMAGE_MIME[extOf(path)] ?? "application/octet-stream";
        const url = URL.createObjectURL(new Blob([buf as BlobPart], { type: mime }));
        previewBlobUrls.push(url);
        img.src = url;
      })
      .catch(() => {
        img.alt = `${img.alt || src} (missing: ${path})`;
        img.classList.add("md-img-missing");
      });
  }
}

function renderTabs(): void {
  if (!tabsEl) return;
  const frag = document.createDocumentFragment();
  for (const path of order) {
    const doc = docs.get(path);
    if (!doc) continue;
    const tab = h("div", "ftab");
    tab.classList.toggle("active", path === active);
    tab.title = path;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(path === active));

    const name = h("button", "name", basename(path));
    name.addEventListener("click", () => activate(path));
    tab.append(name);

    const x = h("button", "x", "×");
    x.title = `close ${basename(path)}`;
    x.addEventListener("click", (e) => {
      e.stopPropagation();
      close(path);
    });
    tab.append(x);

    tab.addEventListener("auxclick", (e) => {
      if (e.button === 1) close(path);
    });
    frag.append(tab);
  }
  tabsEl.replaceChildren(frag);
}
