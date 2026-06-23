# Watchtower Control Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only Watchtower dashboard into a two-way control panel that performs deterministic plan edits itself (status, note, archive, add TODO) and routes generative work to the `/watchtower` skill.

**Architecture:** A new vscode-free `src/writer.ts` is the surgical, in-place inverse of `src/parser.ts`. The webview renders control buttons only when the new `watchtower.editable` setting is on. `media/dashboard.js` sends new `postMessage` kinds; `src/dashboardProvider.ts` dispatches them to the writer (for edits) or to the terminal/clipboard (for slash-command launchers).

**Tech Stack:** TypeScript, VS Code Extension API, esbuild, `node:test` + `node:assert`. Tests run via `node --experimental-strip-types --import ./test/register-vscode.mjs --test 'test/*.ts'`.

**Spec:** `docs/superpowers/specs/2026-06-23-watchtower-control-panel-design.md`

---

## Testability boundary (read before starting)

The test vscode stub (`test/vscode-loader.mjs`) only exposes `ThemeColor` and `ThemeIcon`. It does not provide `vscode.window`, `vscode.env`, or `vscode.workspace`. Therefore:

- All deterministic logic lives in `src/writer.ts` (imports only `node:fs`, `node:path`, `./parser.ts`, `./model.ts`) so it is fully unit-tested like `src/parser.ts`.
- Control-rendering logic lives in `src/dashboardHtml.ts` (no vscode import) and is unit-tested like today.
- `src/dashboardProvider.ts` glue (input boxes, confirmations, clipboard, terminal) calls vscode APIs and is verified by the manual F5 run in the final task. There are no provider unit tests today; this plan keeps that boundary.

## Impact analysis note

The GitNexus MCP tools are not loaded in every session. Before editing an existing symbol, run impact analysis if the tools are available:

- `dashboardProvider.onMessage` and `dashboardProvider.data` (`src/dashboardProvider.ts`)
- `renderDashboardHtml`, `todoRow` (`src/dashboardHtml.ts`)
- `activate` (`src/extension.ts`)

`src/writer.ts`, `test/writer.test.ts`, and `media/dashboard.css` are new files (zero blast radius).

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/writer.ts` | Create | Pure surgical plan editor: `setTodoStatus`, `setNote`, `archivePlan`, `addTodo`. Inverse of parser. No vscode. |
| `test/writer.test.ts` | Create | Unit tests for writer against temp dirs and fixtures. |
| `src/dashboardHtml.ts` | Modify | Add `editable` to `DashboardData`; render status toggle, note button, archive button, add-TODO button; switch command buttons to `run` when editable. |
| `test/dashboardHtml.test.ts` | Modify | Tests for control rendering on/off. |
| `media/dashboard.js` | Modify | Handle `setStatus`, `setNote`, `archive`, `addTodo`, `run` click actions; compute status cycle. |
| `src/dashboardProvider.ts` | Modify | Extend `DashboardMessage` union and `onMessage` switch; read `editable` config; input boxes and confirmations; terminal/clipboard launcher. |
| `src/extension.ts` | Modify | Pass `editable` into provider data (provider reads config itself; extension change is minimal). |
| `package.json` | Modify | Declare `watchtower.editable` configuration; add `onCommand` activation entries for any new palette commands (none required here). |
| `media/dashboard.css` | Modify | Styles for `.row-status` as button, `.row-act`, `.plan-act`, `.add-todo`. |

---

## Task 1: writer.ts foundation and setTodoStatus

**Files:**
- Create: `src/writer.ts`
- Test: `test/writer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/writer.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { setTodoStatus } from "../src/writer.ts";
import { parsePlanContent } from "../src/parser.ts";

const here = dirname(fileURLToPath(import.meta.url));

const HEADER = [
  "## Current Active Plan",
  "",
  "Title: Demo",
  "Slug: 20260101-demo",
  "Status: ACTIVE",
  "Updated: 2026-01-01",
].join("\n");

function tracker(rows: string[]): string {
  const head = [
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
  ];
  return [...head, ...rows, ""].join("\n");
}

function manifestContent(statusRows: string[], extra = ""): string {
  return ["# NEXT", "", HEADER, "", tracker(statusRows), extra].join("\n");
}

function seedPlan(root: string, rows: string[], outcome = ""): string {
  const dir = join(root, "watchtower");
  mkdirSync(join(dir, "todos"), { recursive: true });
  const mp = join(dir, "NEXT.md");
  writeFileSync(mp, manifestContent(rows), "utf8");
  if (outcome) writeFileSync(join(dir, "todos", "TODO-001-outcome.md"), outcome, "utf8");
  return mp;
}

function freshRoot(): string {
  return mkdtempSync(join(tmpdir(), "watchtower-writer-"));
}

test("setTodoStatus updates Tracker status, outcome sidecar, and recomputes plan status", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | TODO | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  const mp = seedPlan(root, rows, "# TODO-001 Outcome\n\n## Outcome\n\nStatus: TODO\n");
  setTodoStatus(root, "TODO-001", "IN_PROGRESS");

  const after = parsePlanContent(readFileSync(mp, "utf8"), mp);
  assert.equal(after.todos[0].status, "IN_PROGRESS");
  assert.equal(after.status, "ACTIVE", "plan stays ACTIVE while a row is not DONE");

  const oc = readFileSync(join(root, "watchtower", "todos", "TODO-001-outcome.md"), "utf8");
  assert.match(oc, /Status: IN PROGRESS/);
});

test("setTodoStatus promotes plan to DONE when every row is DONE", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | IN PROGRESS | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  const outcome = [
    "# TODO-001 Outcome",
    "",
    "## Outcome",
    "",
    "Status: IN PROGRESS",
    "",
    "Verified:",
    "- npm test -> all pass",
  ].join("\n");
  const mp = seedPlan(root, rows, outcome);
  setTodoStatus(root, "TODO-001", "DONE");

  const after = parsePlanContent(readFileSync(mp, "utf8"), mp);
  assert.equal(after.todos[0].status, "DONE");
  assert.equal(after.status, "DONE");
});

test("setTodoStatus refuses DONE without verification evidence in the sidecar", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | IN PROGRESS | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  seedPlan(root, rows, "# TODO-001 Outcome\n\n## Outcome\n\nStatus: IN PROGRESS\n");
  assert.throws(
    () => setTodoStatus(root, "TODO-001", "DONE"),
    /verification evidence/,
  );
});

test("setTodoStatus creates a missing outcome sidecar with the new status", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | TODO | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  seedPlan(root, rows);
  setTodoStatus(root, "TODO-001", "BLOCKED");
  const ocPath = join(root, "watchtower", "todos", "TODO-001-outcome.md");
  assert.ok(existsSync(ocPath), "outcome sidecar created");
  assert.match(readFileSync(ocPath, "utf8"), /Status: BLOCKED/);
});

test("setTodoStatus throws on unknown todo id", () => {
  const root = freshRoot();
  seedPlan(root, ["| 1 | TODO-001 Foo | standalone | TODO | watchtower/todos/TODO-001-foo.md | - | - | - |"]);
  assert.throws(() => setTodoStatus(root, "TODO-999", "TODO"), /not found/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../src/writer.ts'`.

- [ ] **Step 3: Write the writer foundation and setTodoStatus**

Create `src/writer.ts`:

```ts
import * as fs from "node:fs";
import * as path from "node:path";
import { type TodoStatus } from "./model.ts";
import { parsePlanContent, readPlan } from "./parser.ts";

const COL = { ORDER: 0, TODO: 1, GROUP: 2, STATUS: 3, SPEC: 4, DEPS: 5, CONTEXT: 6, NOTES: 7 } as const;

const STATUS_LABEL: Record<Exclude<TodoStatus, "UNKNOWN">, string> = {
  TODO: "TODO",
  IN_PROGRESS: "IN PROGRESS",
  BLOCKED: "BLOCKED",
  DONE: "DONE",
};

export class WriterError extends Error {}

function manifestPath(rootDir: string): string {
  return path.join(rootDir, "watchtower", "NEXT.md");
}

function readText(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function writeText(p: string, content: string): void {
  fs.writeFileSync(p, content, "utf8");
}

function splitRowPreserve(line: string): string[] {
  return line.split("|");
}

function cellAt(cells: string[], col: number): string {
  return cells[col + 1] ?? "";
}

function findTrackerRowLine(lines: string[], todoId: string): number {
  return lines.findIndex((l) => {
    if (!l.trim().startsWith("|")) return false;
    return cellAt(splitRowPreserve(l), COL.TODO).trim().startsWith(todoId);
  });
}

// Pure: replace one Tracker cell for the given todo id. Throws if the row is missing.
export function replaceTrackerCell(content: string, todoId: string, col: number, value: string): string {
  const lines = content.split(/\r?\n/);
  const idx = findTrackerRowLine(lines, todoId);
  if (idx === -1) throw new WriterError(`tracker row not found: ${todoId}`);
  const cells = splitRowPreserve(lines[idx]);
  cells[col + 1] = ` ${value} `;
  lines[idx] = cells.join("|");
  return lines.join("\n");
}

// Pure: replace a `- Name: value` field inside `## Current Active Plan`.
function replaceHeaderField(content: string, name: string, value: string): string {
  const start = content.indexOf("## Current Active Plan");
  if (start === -1) throw new WriterError("missing ## Current Active Plan");
  const restStart = start + "## Current Active Plan".length;
  const nextSec = content.indexOf("\n## ", restStart);
  const blockEnd = nextSec === -1 ? content.length : nextSec;
  const block = content.slice(restStart, blockEnd);
  const re = new RegExp(`(^|\\n)(\\s*-?\\s*${name}:)\\s*.+$`);
  if (!re.test(block)) throw new WriterError(`header field not found: ${name}`);
  const newBlock = block.replace(re, `$1$2 ${value}`);
  return content.slice(0, restStart) + newBlock + content.slice(blockEnd);
}

// Pure: replace the `Status:` line under `## Outcome` in a sidecar.
function replaceOutcomeStatus(content: string, label: string): string {
  const lines = content.split(/\r?\n/);
  const outIdx = lines.findIndex((l) => /^##\s+Outcome\s*$/.test(l));
  if (outIdx === -1) throw new WriterError("missing ## Outcome in sidecar");
  for (let i = outIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    const m = lines[i].match(/^(\s*Status:\s*).+$/i);
    if (m) {
      lines[i] = m[1] + label;
      return lines.join("\n");
    }
  }
  throw new WriterError("missing Status: line in outcome sidecar");
}

// Pure: true when the sidecar has a `Verified:` block with at least one bullet.
export function hasVerificationEvidence(outcomeContent: string): boolean {
  const lines = outcomeContent.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^Verified:\s*$/i.test(l));
  if (idx === -1) return false;
  return lines.slice(idx + 1).some((l) => /^\s*-\s+\S+/.test(l));
}

function outcomeSkeleton(todoId: string, status: Exclude<TodoStatus, "UNKNOWN">): string {
  return `# ${todoId} Outcome\n\n## Outcome\n\nStatus: ${STATUS_LABEL[status]}\n`;
}

function recomputePlanStatusLabel(content: string, mp: string): "ACTIVE" | "DONE" {
  const plan = parsePlanContent(content, mp);
  return plan.todos.every((t) => t.status === "DONE") ? "DONE" : "ACTIVE";
}

function writeWithRollback(p: string, backup: string, next: string, validate: (c: string) => boolean): void {
  writeText(p, next);
  if (!validate(readText(p))) {
    writeText(p, backup);
    throw new WriterError(`post-write validation failed: ${p}`);
  }
}

export function setTodoStatus(rootDir: string, todoId: string, status: TodoStatus): void {
  if (status === "UNKNOWN") throw new WriterError("cannot set status UNKNOWN");
  const mp = manifestPath(rootDir);
  const plan = readPlan(rootDir);
  if (!plan) throw new WriterError("no active plan");
  const todo = plan.todos.find((t) => t.id === todoId);
  if (!todo) throw new WriterError(`todo not found: ${todoId}`);

  const label = STATUS_LABEL[status];
  if (status === "DONE") {
    const oc = todo.outcomePath && fs.existsSync(todo.outcomePath) ? readText(todo.outcomePath) : "";
    if (!hasVerificationEvidence(oc)) {
      throw new WriterError(`refuse DONE without verification evidence: ${todoId}`);
    }
  }

  const preCount = plan.todos.length;
  const backup = readText(mp);
  let next = replaceTrackerCell(backup, todoId, COL.STATUS, label);
  next = replaceHeaderField(next, "Status", recomputePlanStatusLabel(next, mp));
  writeWithRollback(mp, backup, next, (c) => parsePlanContent(c, mp).todos.length === preCount);

  if (todo.outcomePath) {
    if (!fs.existsSync(todo.outcomePath)) {
      writeText(todo.outcomePath, outcomeSkeleton(todoId, status));
    } else {
      const ob = readText(todo.outcomePath);
      writeWithRollback(todo.outcomePath, ob, replaceOutcomeStatus(ob, label), () => true);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for the five `setTodoStatus` tests. Each later task extends the writer import as it adds a function.

- [ ] **Step 5: Commit**

```bash
git add src/writer.ts test/writer.test.ts
git commit -m "feat(writer): add surgical plan editor with setTodoStatus"
```

---

## Task 2: writer.ts setNote

**Files:**
- Modify: `src/writer.ts`
- Test: `test/writer.test.ts`

- [ ] **Step 1: Write the failing tests**

First, extend the writer import at the top of `test/writer.test.ts`: change `{ setTodoStatus }` to `{ setTodoStatus, setNote }`.

Append these tests to `test/writer.test.ts`:

```ts
test("setNote writes the Tracker Notes cell and appends to the outcome sidecar", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | IN PROGRESS | watchtower/todos/TODO-001-foo.md | - | - | old |"];
  seedPlan(root, rows, "# TODO-001 Outcome\n\n## Outcome\n\nStatus: IN PROGRESS\n");
  setNote(root, "TODO-001", "waiting on API key");

  const plan = parsePlanContent(readFileSync(join(root, "watchtower", "NEXT.md"), "utf8"), join(root, "watchtower", "NEXT.md"));
  assert.equal(plan.todos[0].notes, "waiting on API key");

  const oc = readFileSync(join(root, "watchtower", "todos", "TODO-001-outcome.md"), "utf8");
  assert.match(oc, /- waiting on API key/);
  assert.match(oc, /Status: IN PROGRESS/, "sidecar status preserved");
});

test("setNote creates a missing outcome sidecar", () => {
  const root = freshRoot();
  seedPlan(root, ["| 1 | TODO-001 Foo | standalone | TODO | watchtower/todos/TODO-001-foo.md | - | - | - |"]);
  setNote(root, "TODO-001", "first note");
  const oc = readFileSync(join(root, "watchtower", "todos", "TODO-001-outcome.md"), "utf8");
  assert.match(oc, /- first note/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `setNote is not a function`.

- [ ] **Step 3: Implement setNote**

Append to `src/writer.ts`:

```ts
function appendOutcomeNote(content: string, note: string): string {
  const trimmed = content.endsWith("\n") ? content : content + "\n";
  return `${trimmed}- ${note}\n`;
}

export function setNote(rootDir: string, todoId: string, note: string): void {
  const clean = note.trim();
  if (!clean) throw new WriterError("note is empty");
  const mp = manifestPath(rootDir);
  const plan = readPlan(rootDir);
  if (!plan) throw new WriterError("no active plan");
  const todo = plan.todos.find((t) => t.id === todoId);
  if (!todo) throw new WriterError(`todo not found: ${todoId}`);

  const preCount = plan.todos.length;
  const backup = readText(mp);
  const next = replaceTrackerCell(backup, todoId, COL.NOTES, clean);
  writeWithRollback(mp, backup, next, (c) => parsePlanContent(c, mp).todos.length === preCount);

  const sidecar = todo.outcomePath && todo.outcomePath.length > 0
    ? todo.outcomePath
    : path.join(path.dirname(mp), "todos", `${todoId}-outcome.md`);
  const ob = fs.existsSync(sidecar) ? readText(sidecar) : outcomeSkeleton(todoId, todoStatusOf(plan, todoId));
  writeWithRollback(sidecar, ob, appendOutcomeNote(ob, clean), () => true);
}

function todoStatusOf(plan: ReturnType<typeof readPlan>, todoId: string): Exclude<TodoStatus, "UNKNOWN"> {
  if (!plan) return "TODO";
  const t = plan.todos.find((x) => x.id === todoId);
  return t && t.status !== "UNKNOWN" ? t.status : "TODO";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for the two `setNote` tests.

- [ ] **Step 5: Commit**

```bash
git add src/writer.ts test/writer.test.ts
git commit -m "feat(writer): add setNote for tracker notes and sidecar"
```

---

## Task 3: writer.ts archivePlan

**Files:**
- Modify: `src/writer.ts`
- Test: `test/writer.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `test/writer.test.ts`:

```ts
test("archivePlan moves files under archive/<slug> and sets Status ARCHIVED", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | DONE | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  seedPlan(root, rows);
  writeFileSync(join(root, "watchtower", "CONTEXT.md"), "# Context\n", "utf8");

  archivePlan(root, "2026-01-02");

  const archiveDir = join(root, "watchtower", "archive", "20260101-demo");
  assert.ok(existsSync(join(archiveDir, "NEXT.md")), "NEXT moved");
  assert.ok(existsSync(join(archiveDir, "CONTEXT.md")), "CONTEXT moved");
  assert.ok(existsSync(join(archiveDir, "todos", "TODO-001-foo.md")), "todos moved");
  assert.ok(!existsSync(join(root, "watchtower", "NEXT.md")), "active NEXT removed");

  const moved = readFileSync(join(archiveDir, "NEXT.md"), "utf8");
  assert.match(moved, /Status: ARCHIVED/);
  assert.match(moved, /Updated: 2026-01-02/);
  assert.match(moved, /- Archived: 2026-01-02 -> watchtower\/archive\/20260101-demo/);
});

test("archivePlan throws on missing slug", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | DONE | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  seedPlan(root, rows);
  // Overwrite manifest with no Slug field.
  const noSlug = manifestContent(rows).replace("Slug: 20260101-demo\n", "");
  writeFileSync(join(root, "watchtower", "NEXT.md"), noSlug, "utf8");
  assert.throws(() => archivePlan(root, "2026-01-02"), /slug/i);
});

test("archivePlan adds -HHMM suffix when the archive dir already exists", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | DONE | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  seedPlan(root, rows);
  mkdirSync(join(root, "watchtower", "archive", "20260101-demo"), { recursive: true });
  archivePlan(root, "2026-01-02");
  const entries = readdirSync(join(root, "watchtower", "archive"));
  assert.ok(entries.some((e) => e.startsWith("20260101-demo-")), "suffixed dir created");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `archivePlan is not a function`.

- [ ] **Step 3: Implement archivePlan**

Append to `src/writer.ts`:

```ts
export function archivePlan(rootDir: string, today: string, now = new Date()): void {
  const mp = manifestPath(rootDir);
  const plan = readPlan(rootDir);
  if (!plan) throw new WriterError("no active plan");
  const slug = plan.slug.trim();
  if (!slug) throw new WriterError("cannot archive: Slug is missing or empty");

  let archiveName = slug;
  const archiveRoot = path.join(rootDir, "watchtower", "archive");
  if (fs.existsSync(path.join(archiveRoot, archiveName))) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    archiveName = `${slug}-${hh}${mm}`;
  }
  const archiveDir = path.join(archiveRoot, archiveName);
  mkdirRecursive(archiveDir);

  let content = readText(mp);
  content = replaceHeaderField(content, "Status", "ARCHIVED");
  content = replaceHeaderField(content, "Updated", today);
  content = appendArchiveRow(content, `${today} -> watchtower/archive/${archiveName}`);
  writeText(mp, content);

  moveInto(mp, path.join(archiveDir, "NEXT.md"));
  const ctx = path.join(rootDir, "watchtower", "CONTEXT.md");
  if (fs.existsSync(ctx)) moveInto(ctx, path.join(archiveDir, "CONTEXT.md"));
  const todosDir = path.join(rootDir, "watchtower", "todos");
  if (fs.existsSync(todosDir)) moveIntoDir(todosDir, path.join(archiveDir, "todos"));
}

function mkdirRecursive(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function moveInto(src: string, dest: string): void {
  mkdirRecursive(path.dirname(dest));
  fs.renameSync(src, dest);
}

function moveIntoDir(src: string, dest: string): void {
  mkdirRecursive(dest);
  for (const entry of fs.readdirSync(src)) {
    fs.renameSync(path.join(src, entry), path.join(dest, entry));
  }
  fs.rmdirSync(src);
}

function appendArchiveRow(content: string, entry: string): string {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^##\s+Archive\s*$/.test(l));
  const row = `- Archived: ${entry}`;
  if (idx === -1) {
    return [...lines, "", "## Archive", "", row].join("\n");
  }
  let insert = idx + 1;
  while (insert < lines.length && lines[insert].trim() === "") insert++;
  lines.splice(insert, 0, row);
  return lines.join("\n");
}
```

The helpers use the existing `import * as fs from "node:fs"` namespace from Task 1 (`fs.mkdirSync`, `fs.renameSync`, `fs.readdirSync`, `fs.rmdirSync`, `fs.existsSync`). No import change is needed.

Before starting Task 3, extend the writer import in `test/writer.test.ts`: change `{ setTodoStatus, setNote }` to `{ setTodoStatus, setNote, archivePlan }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for the three `archivePlan` tests.

- [ ] **Step 5: Commit**

```bash
git add src/writer.ts test/writer.test.ts
git commit -m "feat(writer): add archivePlan with slug safety"
```

---

## Task 4: writer.ts addTodo

**Files:**
- Modify: `src/writer.ts`
- Test: `test/writer.test.ts`

- [ ] **Step 1: Write the failing tests**

First, extend the writer import in `test/writer.test.ts`: change `{ setTodoStatus, setNote, archivePlan }` to `{ setTodoStatus, setNote, archivePlan, addTodo }`.

Append these tests to `test/writer.test.ts`:

```ts
test("addTodo appends a new TODO row and creates spec + outcome skeletons", () => {
  const root = freshRoot();
  const rows = ["| 1 | TODO-001 Foo | standalone | DONE | watchtower/todos/TODO-001-foo.md | - | - | - |"];
  const mp = seedPlan(root, rows);
  addTodo(root, "Add export button", "standalone");

  const plan = parsePlanContent(readFileSync(mp, "utf8"), mp);
  assert.equal(plan.todos.length, 2);
  const added = plan.todos.find((t) => t.id === "TODO-002");
  assert.ok(added, "TODO-002 present");
  assert.equal(added!.status, "TODO");
  assert.equal(added!.group, "standalone");
  assert.equal(added!.order, 2);
  assert.match(added!.title, /Add export button/);

  const todosDir = join(root, "watchtower", "todos");
  const spec = readdirSync(todosDir).find((f) => f.startsWith("TODO-002-") && !f.endsWith("-outcome.md"));
  assert.ok(spec, "spec file created");
  const specText = readFileSync(join(todosDir, spec!), "utf8");
  assert.match(specText, /## Brief/);
  assert.match(specText, /## Verify/);
  assert.ok(existsSync(join(todosDir, "TODO-002-outcome.md")), "outcome sidecar created");
});

test("addTodo numbers from the max existing id", () => {
  const root = freshRoot();
  const rows = [
    "| 1 | TODO-001 Foo | standalone | DONE | watchtower/todos/TODO-001-foo.md | - | - | - |",
    "| 5 | TODO-005 Bar | standalone | TODO | watchtower/todos/TODO-005-bar.md | - | - | - |",
  ];
  const mp = seedPlan(root, rows);
  addTodo(root, "Late add", "standalone");
  const plan = parsePlanContent(readFileSync(mp, "utf8"), mp);
  assert.ok(plan.todos.some((t) => t.id === "TODO-006"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `addTodo is not a function`.

- [ ] **Step 3: Implement addTodo**

Append to `src/writer.ts`:

```ts
function kebab(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function nextTodoId(plan: ReturnType<typeof readPlan>): string {
  const nums = (plan?.todos ?? [])
    .map((t) => Number.parseInt(t.id.replace(/^TODO-/, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `TODO-${String(max + 1).padStart(3, "0")}`;
}

function specSkeleton(id: string, title: string, group: string): string {
  return [
    `# ${id} ${title}`,
    "",
    `Group: ${group}`,
    "",
    "## Brief",
    "",
    "Goal: TODO.",
    "",
    "Change: TODO -> TODO.",
    "",
    "How:",
    "",
    "- TODO.",
    "",
    "Files:",
    "",
    "- TODO.",
    "",
    "Expected result:",
    "",
    "- TODO.",
    "",
    "## Verify",
    "",
    "- TODO.",
    "",
  ].join("\n");
}

function appendTrackerRow(content: string, row: string): string {
  const lines = content.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => {
    if (!l.includes("|")) return false;
    const cells = l.split("|").map((c) => c.trim().toLowerCase());
    return cells.includes("order") && cells.includes("todo") && cells.includes("status");
  });
  if (headerIdx === -1) throw new WriterError("missing Tracker header");
  let i = headerIdx + 1;
  // skip separator and collect data rows
  let lastDataRow = headerIdx;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    lastDataRow = i;
    i++;
  }
  lines.splice(lastDataRow + 1, 0, row);
  return lines.join("\n");
}

export function addTodo(rootDir: string, title: string, group: string): void {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new WriterError("title is empty");
  const plan = readPlan(rootDir);
  if (!plan) throw new WriterError("no active plan");

  const id = nextTodoId(plan);
  const slug = kebab(cleanTitle);
  const fileName = `${id}-${slug || "todo"}.md`;
  const todosDir = path.join(rootDir, "watchtower", "todos");
  mkdirRecursive(todosDir);

  writeText(path.join(todosDir, fileName), specSkeleton(id, cleanTitle, group));
  writeText(path.join(todosDir, `${id}-outcome.md`), outcomeSkeleton(id, "TODO"));

  const order = Math.max(0, ...plan.todos.map((t) => t.order)) + 1;
  const rel = `watchtower/todos/${fileName}`;
  const row = `| ${order} | ${id} ${cleanTitle} | ${group} | TODO | [${rel}](${rel}) | - | - | - |`;

  const mp = manifestPath(rootDir);
  const backup = readText(mp);
  const preCount = plan.todos.length;
  const next = appendTrackerRow(backup, row);
  writeWithRollback(mp, backup, next, (c) => parsePlanContent(c, mp).todos.length === preCount + 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for all writer tests (setTodoStatus, setNote, archivePlan, addTodo).

- [ ] **Step 5: Run type-check to confirm writer compiles standalone**

Run: `npm run compile`
Expected: no type errors. (`npm run compile` runs `tsc --noEmit && node esbuild.mjs`.)

- [ ] **Step 6: Commit**

```bash
git add src/writer.ts test/writer.test.ts
git commit -m "feat(writer): add addTodo with spec and outcome skeletons"
```

---

## Task 5: render status toggle and note button when editable

**Files:**
- Modify: `src/dashboardHtml.ts`
- Test: `test/dashboardHtml.test.ts`

- [ ] **Step 1: Write the failing tests**

In `test/dashboardHtml.test.ts`, extend the `data()` helper and add tests. First, update the `data()` helper signature so existing callers still compile:

```ts
function data(
  plan: Plan | null,
  archive: ArchivePlan[] = [],
  nextPath = "/ws/watchtower/NEXT.md",
  contextPath = "/ws/watchtower/CONTEXT.md",
  editable = false,
): DashboardData {
  return { plan, archive, nextPath, contextPath, editable };
}
```

Append tests:

```ts
test("editable plan renders status toggle button and note button on rows", () => {
  const plan = makePlan([makeTodo("TODO-001", 1, "TODO", "/ws/watchtower/todos/TODO-001-shell.md", "shell")]);
  const html = renderDashboardHtml(data(plan, [], undefined, undefined, true));
  assert.match(html, /data-action="setStatus"[^>]*data-todo="TODO-001"/);
  assert.match(html, /data-status="TODO"/);
  assert.match(html, /data-action="setNote"[^>]*data-todo="TODO-001"/);
});

test("non-editable plan renders no controls", () => {
  const plan = makePlan([makeTodo("TODO-001", 1, "TODO", "/ws/watchtower/todos/TODO-001-shell.md", "shell")]);
  const html = renderDashboardHtml(data(plan));
  assert.ok(!html.includes('data-action="setStatus"'));
  assert.ok(!html.includes('data-action="setNote"'));
  assert.ok(!html.includes('data-action="archive"'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - `editable` does not exist on `DashboardData`, and no `setStatus` markup.

- [ ] **Step 3: Implement control rendering**

In `src/dashboardHtml.ts`:

Update the `DashboardData` interface:

```ts
export interface DashboardData {
  plan: Plan | null;
  archive: ArchivePlan[];
  nextPath: string;
  contextPath: string;
  editable?: boolean;
}
```

Replace the `todoRow` function with an editable-aware version:

```ts
function todoRow(todo: Todo, editable: boolean): string {
  const title = todo.title || todo.id;
  const statusLabel = todo.status === "IN_PROGRESS" ? "Active" : todo.status.toLowerCase().replace("_", " ");
  const statusEl = editable
    ? `<button class="row-status ${statusClass(todo.status)}" type="button" data-action="setStatus" data-todo="${escapeHtml(todo.id)}" data-status="${escapeHtml(todo.status)}" title="Toggle status (shift-click for Blocked)">${escapeHtml(statusLabel)}</button>`
    : `<span class="row-status ${statusClass(todo.status)}">${escapeHtml(statusLabel)}</span>`;
  const noteBtn = editable
    ? `<button class="row-act" type="button" data-action="setNote" data-todo="${escapeHtml(todo.id)}" title="Add note" aria-label="Add note">+</button>`
    : "";
  const rowInner =
    `<span class="id">${escapeHtml(todo.id)}</span>` +
    `<span class="ttl">${escapeHtml(title)}</span>` +
    `<span class="row-controls">` +
    statusEl +
    noteBtn +
    `</span>`;
  if (todo.specPath) {
    return (
      `<div class="row" data-action="open" data-path="${escapeHtml(todo.specPath)}" tabindex="0" role="button">` +
      rowInner +
      `</div>`
    );
  }
  return `<div class="row static">${rowInner}</div>`;
}
```

Update the `section` function call site to pass `editable`:

```ts
function section(id: string, label: string, todos: Todo[], collapsed: boolean, editable: boolean): string {
  if (todos.length === 0) return "";
  const sorted = [...todos].sort((a, b) => a.order - b.order);
  return (
    `<div class="section${collapsed ? " collapsed" : ""}" data-section-id="${escapeHtml(id)}">` +
    `<button class="sec-head" type="button" aria-expanded="${!collapsed}">` +
    `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<span class="sec-label">${escapeHtml(label)}</span>` +
    `<span class="sec-count">${todos.length}</span>` +
    `</button>` +
    `<div class="sec-body">${sorted.map((t) => todoRow(t, editable)).join("")}</div>` +
    `</div>`
  );
}
```

Update the call in `renderDashboardHtml`:

```ts
const editable = data.editable ?? false;
...
const sections = STATUS_SECTION_ORDER.map((s) =>
  section(s.status.toLowerCase(), s.label, buckets[s.status], s.status === "DONE", editable),
).join("");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for the two new tests and all existing dashboardHtml tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboardHtml.ts test/dashboardHtml.test.ts
git commit -m "feat(dashboard): render status toggle and note controls when editable"
```

---

## Task 6: render archive button, add-TODO button, and run launcher

**Files:**
- Modify: `src/dashboardHtml.ts`
- Test: `test/dashboardHtml.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `test/dashboardHtml.test.ts`:

```ts
test("editable plan renders archive button in plan card and add-TODO button", () => {
  const plan = makePlan([makeTodo("TODO-001", 1, "TODO")]);
  const html = renderDashboardHtml(data(plan, [], undefined, undefined, true));
  assert.match(html, /data-action="archive"/);
  assert.match(html, /data-action="addTodo"/);
});

test("editable plan command buttons use run action; non-editable use copy", () => {
  const plan = makePlan([makeTodo("TODO-001", 1, "TODO")]);
  const editableHtml = renderDashboardHtml(data(plan, [], undefined, undefined, true));
  const lockedHtml = renderDashboardHtml(data(plan));
  assert.match(editableHtml, /data-action="run" data-text="\/watchtower next"/);
  assert.match(lockedHtml, /data-action="copy" data-text="\/watchtower next"/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - no `archive`, `addTodo`, or `run` markup.

- [ ] **Step 3: Implement the remaining controls**

In `src/dashboardHtml.ts`, update `commandButtons` to take an `editable` flag and choose the action:

```ts
function commandButtons(mode: CommandMode, editable: boolean): string {
  const prefix = commandPrefix(mode);
  const action = editable ? "run" : "copy";
  return COMMANDS.map((cmd) => {
    const text = `${prefix} ${cmd.action}${cmd.suffix ?? ""}`;
    return (
      `<button class="cmd-btn" data-action="${action}" data-text="${escapeHtml(text)}" title="Run ${escapeHtml(text)}">` +
      `${escapeHtml(cmd.label)}` +
      `</button>`
    );
  }).join("");
}
```

Update `commandGroup` to thread the flag:

```ts
function commandGroup(mode: CommandMode, editable: boolean): string {
  return (
    `<div class="cmd-group">` +
    `<div class="cmd-agent">` +
    `<span class="cmd-prefix">${commandPrefix(mode)}</span>` +
    `<span class="cmd-mode">${commandModeLabel(mode)}</span>` +
    `</div>` +
    `<div class="cmd-actions">` +
    commandButtons(mode, editable) +
    `</div>` +
    `</div>`
  );
}
```

Add an archive button into the plan card (inside `renderDashboardHtml`, right after the `<div class="plan-top">...</div>` block is built, or within plan-meta). Simplest is to append it to the plan-card opening. Replace the plan-card return's opening with an editable-aware header. Add this helper:

```ts
function planActions(editable: boolean): string {
  if (!editable) return "";
  return `<div class="plan-act"><button class="file-btn" type="button" data-action="archive" title="Archive this plan">Archive</button></div>`;
}
```

Insert `planActions(editable)` into the plan card markup, right after the closing of `.plan-meta` and before the closing `</div>` of `.plan-card`. Concretely, in `renderDashboardHtml`, change:

```ts
    (plan.updated ? `<span class="muted">Updated ${escapeHtml(plan.updated)}</span>` : "") +
    `</div>` +
    `</div>` +
```

to:

```ts
    (plan.updated ? `<span class="muted">Updated ${escapeHtml(plan.updated)}</span>` : "") +
    `</div>` +
    planActions(editable) +
    `</div>` +
```

Add the add-TODO button above the list. In `renderDashboardHtml`, replace:

```ts
    `<div class="list">${sections}${archiveSection(archive)}</div>` +
```

with:

```ts
    (editable ? `<button class="add-todo" type="button" data-action="addTodo" title="Add a TODO">+ Add TODO</button>` : "") +
    `<div class="list">${sections}${archiveSection(archive)}</div>` +
```

Update the `commandGroup` calls in `renderDashboardHtml`:

```ts
    commandGroup("codex", editable) +
    commandGroup("claude", editable) +
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for the new tests and all prior tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboardHtml.ts test/dashboardHtml.test.ts
git commit -m "feat(dashboard): render archive, add-TODO, and run launcher when editable"
```

---

## Task 7: wire control clicks in dashboard.js

**Files:**
- Modify: `media/dashboard.js`

- [ ] **Step 1: Add status cycling and the new actions to the click handler**

In `media/dashboard.js`, replace the `switch (action)` block inside the click listener with:

```js
  const action = el.dataset.action;
  switch (action) {
    case "open":
    case "openNext":
    case "openArchive":
      vscode.postMessage({ type: action, fsPath: el.dataset.path ?? "" });
      break;
    case "copy":
      vscode.postMessage({ type: "copy", text: el.dataset.text ?? "" });
      break;
    case "run":
      vscode.postMessage({ type: "run", text: el.dataset.text ?? "" });
      break;
    case "refresh":
      vscode.postMessage({ type: "refresh" });
      break;
    case "setStatus": {
      const todo = el.dataset.todo ?? "";
      const next = nextStatus(el.dataset.status ?? "TODO", e.shiftKey);
      vscode.postMessage({ type: "setStatus", todoId: todo, status: next });
      break;
    }
    case "setNote":
      vscode.postMessage({ type: "setNote", todoId: el.dataset.todo ?? "" });
      break;
    case "archive":
      vscode.postMessage({ type: "archive" });
      break;
    case "addTodo":
      vscode.postMessage({ type: "addTodo" });
      break;
  }
```

Add the `nextStatus` helper near the top of the file (after `isActivator`):

```js
function nextStatus(current, shift) {
  if (shift) return "BLOCKED";
  const cycle = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO", BLOCKED: "TODO" };
  return cycle[current] ?? "TODO";
}
```

Note: the existing `e.target.closest("[data-action]")` already returns the nearest ancestor with `data-action`, so a click on the status button resolves to the button (not the row's `open` action). No `stopPropagation` needed.

- [ ] **Step 2: Verify the file parses (no test harness for the webview JS)**

Run: `node --check media/dashboard.js`
Expected: no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add media/dashboard.js
git commit -m "feat(dashboard): wire status, note, archive, addTodo, run clicks"
```

---

## Task 8: handle new messages in dashboardProvider and read config

**Files:**
- Modify: `src/dashboardProvider.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`

- [ ] **Step 1: Extend the message type and dispatch**

In `src/dashboardProvider.ts`:

Update imports:

```ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { renderDashboardHtml, type DashboardData } from "./dashboardHtml.ts";
import { listArchive, readPlan } from "./parser.ts";
import { type TodoStatus, toTodoStatus } from "./model.ts";
import { setTodoStatus, setNote, archivePlan, addTodo, WriterError } from "./writer.ts";
```

Update the `DashboardMessage` interface:

```ts
interface DashboardMessage {
  type:
    | "open"
    | "openNext"
    | "openArchive"
    | "copy"
    | "refresh"
    | "setStatus"
    | "setNote"
    | "archive"
    | "addTodo"
    | "run";
  fsPath?: string;
  text?: string;
  todoId?: string;
  status?: string;
}
```

Update `isDashboardMessage`'s allowed list:

```ts
function isDashboardMessage(msg: unknown): msg is DashboardMessage {
  if (!msg || typeof msg !== "object") return false;
  const type = (msg as { type?: unknown }).type;
  return (
    typeof type === "string" &&
    [
      "open",
      "openNext",
      "openArchive",
      "copy",
      "refresh",
      "setStatus",
      "setNote",
      "archive",
      "addTodo",
      "run",
    ].includes(type)
  );
}
```

Add an `editable` getter and pass it into `data()`:

```ts
  private editable(): boolean {
    return vscode.workspace.getConfiguration("watchtower").get<boolean>("editable", false);
  }

  private data(): DashboardData {
    const plan = this.rootDir ? readPlan(this.rootDir) : null;
    const archive = this.rootDir ? listArchive(this.rootDir) : [];
    const nextAbs = this.rootDir ? path.join(this.rootDir, "watchtower", "NEXT.md") : "";
    const contextAbs = this.rootDir ? path.join(this.rootDir, "watchtower", "CONTEXT.md") : "";
    const nextPath = nextAbs && fs.existsSync(nextAbs) ? nextAbs : "";
    const contextPath = contextAbs && fs.existsSync(contextAbs) ? contextAbs : "";
    return { plan, archive, nextPath, contextPath, editable: this.editable() };
  }
```

Extend the `onMessage` switch. Replace the existing switch body with:

```ts
  private async onMessage(msg: unknown): Promise<void> {
    if (!isDashboardMessage(msg)) return;
    switch (msg.type) {
      case "open":
      case "openNext":
      case "openArchive":
        if (typeof msg.fsPath === "string") await this.openFile(msg.fsPath);
        break;
      case "copy":
        if (typeof msg.text === "string") {
          await vscode.env.clipboard.writeText(msg.text);
          this.toast("Copied");
        }
        break;
      case "run":
        if (typeof msg.text === "string") await this.runCommand(msg.text);
        break;
      case "refresh":
        this.refresh();
        break;
      case "setStatus":
        await this.handleSetStatus(msg);
        break;
      case "setNote":
        await this.handleSetNote(msg);
        break;
      case "archive":
        await this.handleArchive();
        break;
      case "addTodo":
        await this.handleAddTodo();
        break;
    }
  }
```

Add the handler methods and the launcher. Place them near `openFile`:

```ts
  private async handleSetStatus(msg: DashboardMessage): Promise<void> {
    if (!this.editable()) {
      this.toast("Editing is off");
      return;
    }
    if (typeof msg.todoId !== "string" || typeof msg.status !== "string") return;
    const status = toTodoStatus(msg.status);
    try {
      setTodoStatus(this.rootDir, msg.todoId, status);
      this.toast(`${msg.todoId} -> ${msg.status}`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "failed";
      this.toast(reason.includes("verification") ? `${msg.todoId}: run /watchtower verify` : reason);
    }
    this.refresh();
  }

  private async handleSetNote(msg: DashboardMessage): Promise<void> {
    if (!this.editable()) {
      this.toast("Editing is off");
      return;
    }
    if (typeof msg.todoId !== "string") return;
    const note = await vscode.window.showInputBox({
      prompt: `Note for ${msg.todoId}`,
      placeHolder: "One short line",
    });
    if (note === undefined) return;
    try {
      setNote(this.rootDir, msg.todoId, note);
      this.toast("Note saved");
    } catch (e) {
      this.toast(e instanceof Error ? e.message : "failed");
    }
    this.refresh();
  }

  private async handleArchive(): Promise<void> {
    if (!this.editable()) {
      this.toast("Editing is off");
      return;
    }
    const choice = await vscode.window.showWarningMessage(
      "Archive the active plan? This moves NEXT.md, CONTEXT.md, and todos/ into watchtower/archive/.",
      "Archive",
      "Cancel",
    );
    if (choice !== "Archive") return;
    try {
      archivePlan(this.rootDir, today());
      this.toast("Archived");
    } catch (e) {
      this.toast(e instanceof Error ? e.message : "failed");
    }
    this.refresh();
  }

  private async handleAddTodo(): Promise<void> {
    if (!this.editable()) {
      this.toast("Editing is off");
      return;
    }
    const title = await vscode.window.showInputBox({ prompt: "New TODO title", placeHolder: "Add export button" });
    if (!title) return;
    const group = await vscode.window.showInputBox({ prompt: "Group tag", value: "standalone" });
    if (!group) return;
    try {
      addTodo(this.rootDir, title, group);
      this.toast("TODO added");
    } catch (e) {
      this.toast(e instanceof Error ? e.message : "failed");
    }
    this.refresh();
  }

  private async runCommand(text: string): Promise<void> {
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
      terminal.sendText(text, false);
      terminal.show(false);
      this.toast("Sent to terminal");
    } else {
      await vscode.env.clipboard.writeText(text);
      this.toast(`Copied - paste in chat`);
    }
  }
```

Add the `today()` helper at module scope (bottom of file):

```ts
function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 2: Register the configuration in package.json**

In `package.json`, add a `configuration` block inside `contributes` (after the `menus` block):

```json
    "configuration": {
      "title": "Watchtower",
      "properties": {
        "watchtower.editable": {
          "type": "boolean",
          "default": false,
          "description": "Enable dashboard controls that edit plan files (status, note, archive, add TODO). Off keeps the dashboard read-only."
        }
      }
    }
```

- [ ] **Step 3: Confirm extension.ts needs no change**

`src/extension.ts` does not need changes. The provider reads `watchtower.editable` itself via `getConfiguration`, and the file watcher already refreshes after writer edits land on disk. Verify by reading `src/extension.ts`: the watcher calls `provider.refresh()` on any `watchtower/**` change, which re-reads config and re-renders.

- [ ] **Step 4: Type-check and build**

Run: `npm run compile`
Expected: no type errors, bundle written to `dist/extension.js`.

- [ ] **Step 5: Commit**

```bash
git add src/dashboardProvider.ts package.json
git commit -m "feat(provider): handle control-panel messages and read editable config"
```

---

## Task 9: style the controls

**Files:**
- Modify: `media/dashboard.css`

- [ ] **Step 1: Add styles for the new controls**

Append to `media/dashboard.css`:

```css
/* Control panel (editable) */
.row-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

button.row-status {
  font-family: inherit;
  background: transparent;
  cursor: pointer;
}

button.row-status:hover {
  background: var(--surface-strong);
}

.row-act {
  min-width: 18px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.row-act:hover {
  background: var(--surface-strong);
  border-color: var(--line);
}

.plan-act {
  margin-top: 8px;
}

.add-todo {
  width: 100%;
  margin-bottom: 8px;
  padding: 6px 8px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.add-todo:hover {
  background: var(--surface);
  color: var(--vscode-foreground);
}
```

- [ ] **Step 2: Build to confirm CSS is bundled**

Run: `npm run compile`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add media/dashboard.css
git commit -m "style(dashboard): add control-panel button styles"
```

---

## Task 10: manual F5 verification and final checks

**Files:** none (verification only)

- [ ] **Step 1: Seed a plan in a scratch workspace**

In a throwaway repo (or the project's own `watchtower/` after clearing it), create `watchtower/NEXT.md` with a Tracker of three TODOs (one TODO, one IN PROGRESS, one DONE with a `Verified:` bullet in its outcome sidecar), plus `watchtower/CONTEXT.md` and `watchtower/todos/`.

- [ ] **Step 2: Launch the Extension Development Host**

Press F5 from the project folder. Open the scratch workspace. Confirm the Watchtower sidebar shows the dashboard.

- [ ] **Step 3: Toggle the setting and confirm controls appear**

Set `watchtower.editable: true` in settings. Reload the dashboard. Confirm: status chips are buttons, a `+` note button appears per row, an `Archive` button sits in the plan card, an `+ Add TODO` button sits above the list, and the command buttons now say run (tooltip "Run ...").

- [ ] **Step 4: Exercise each control**

- Click the TODO row's status chip: it moves to IN PROGRESS; the file watcher refreshes the dashboard; the outcome sidecar `Status:` updates.
- Try to click a row to DONE without evidence: confirm the toast says to run `/watchtower verify`.
- Add a note via the `+` button: confirm the Tracker Notes cell and the sidecar both update.
- Click `+ Add TODO`: enter a title and group; confirm a new row, spec, and outcome sidecar appear.
- Click `Archive`: confirm the plan moves under `watchtower/archive/<slug>/` and `Status: ARCHIVED`.
- Click a run button with an integrated terminal open: confirm the command is sent. Close the terminal and click again: confirm it copies to clipboard with a toast.

- [ ] **Step 5: Confirm read-only mode is unchanged**

Set `watchtower.editable: false`. Reload. Confirm the dashboard looks and behaves exactly as before this feature (no buttons, command buttons copy).

- [ ] **Step 6: Run the full test suite and type-check**

Run: `npm test && npm run compile`
Expected: all tests pass, no type errors.

- [ ] **Step 7: Commit any fixture or doc updates, then update the README**

If you added scratch fixtures, remove them before committing. Update `README.md` features list to mention the opt-in control panel and the `watchtower.editable` setting. Commit:

```bash
git add README.md
git commit -m "docs(readme): document the editable control panel"
```

---

## Self-review notes

- Spec coverage: status toggle (Task 1, 5, 7, 8), inline note (Task 2, 5, 7, 8), archive (Task 3, 6, 7, 8), add quick TODO (Task 4, 6, 7, 8), launchers route to terminal/clipboard (Task 6, 7, 8), opt-in setting default off (Task 8 + package.json), confirmation on archive/addTodo (Task 8), slug safety (Task 3), drift defense via shared fixtures (Tasks 1-4), no generative work in extension (writer never edits Brief/Verify prose; addTodo writes skeletons only).
- Open questions from the spec remain open and are not blocking: the enable prompt (webview banner vs notification) is deferred - users set `watchtower.editable` manually for now; addTodo does not auto-open the spec (matches minimal scope).
- Type consistency: `setTodoStatus`, `setNote`, `archivePlan`, `addTodo` signatures match across writer.ts, the provider handlers, and the tests. `DashboardData.editable` is optional and read as `data.editable ?? false` everywhere. `WriterError` is the single thrown error type the provider formats into toasts.
