import { test } from "node:test";
import assert from "node:assert/strict";
import { toTodoStatus, toPlanStatus } from "../src/model.ts";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { parsePlanContent, parseTodoFile, readTodoFile } from "../src/parser.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sampleNext = readFileSync(join(here, "fixtures", "sample-NEXT.md"), "utf8");
const sampleTodo = readFileSync(join(here, "fixtures", "sample-todo.md"), "utf8");

test("toTodoStatus maps known labels", () => {
  assert.equal(toTodoStatus("DONE"), "DONE");
  assert.equal(toTodoStatus("IN PROGRESS"), "IN_PROGRESS");
  assert.equal(toTodoStatus("in progress"), "IN_PROGRESS");
  assert.equal(toTodoStatus("BLOCKED"), "BLOCKED");
  assert.equal(toTodoStatus("TODO"), "TODO");
  assert.equal(toTodoStatus("weird"), "UNKNOWN");
});

test("toPlanStatus maps known labels", () => {
  assert.equal(toPlanStatus("ACTIVE"), "ACTIVE");
  assert.equal(toPlanStatus("archived"), "ARCHIVED");
  assert.equal(toPlanStatus("DONE"), "DONE");
  assert.equal(toPlanStatus(""), "UNKNOWN");
});

test("parsePlanContent reads header and tracker", () => {
  const plan = parsePlanContent(sampleNext, "/ws/watchtower/NEXT.md");
  assert.equal(plan.title, "Gacha Size Quiz");
  assert.equal(plan.slug, "20260620-gacha-size-quiz");
  assert.equal(plan.status, "ARCHIVED");
  assert.equal(plan.totalCount, 4);
  assert.equal(plan.doneCount, 3);

  assert.equal(plan.todos.length, 4);
  assert.deepEqual(
    plan.todos.map((t) => t.status),
    ["DONE", "DONE", "DONE", "BLOCKED"],
  );

  const first = plan.todos[0];
  assert.equal(first.id, "TODO-001");
  assert.equal(first.title, "Build quiz state and markup shell");
  assert.equal(first.order, 1);
  assert.equal(first.group, "standalone");
  assert.ok(first.notes.length > 0);
  assert.equal(
    first.specPath,
    "/ws/watchtower/todos/TODO-001-build-quiz-state-and-markup-shell.md",
  );

  const fourth = plan.todos[3];
  assert.equal(fourth.id, "TODO-004");
  assert.equal(
    fourth.specPath,
    "/ws/watchtower/todos/TODO-004-integrate-responsive-flow-and-qa.md",
  );
});

test("parseTodoFile finds sections and outcome status", () => {
  const result = parseTodoFile(sampleTodo);
  const names = result.sections.map((s) => s.name);
  assert.deepEqual(names, ["Brief", "Verify", "Outcome"]);

  for (const s of result.sections) {
    assert.ok(s.line >= 0, `${s.name} should have a line number`);
  }
  // sections are in file order
  assert.ok(result.sections[0].line < result.sections[1].line);
  assert.ok(result.sections[1].line < result.sections[2].line);

  assert.equal(result.outcomeStatus, "BLOCKED");
});

test("parseTodoFile returns null outcome when absent", () => {
  const result = parseTodoFile("# TODO-009 X\n\n## Brief\n\nGoal: x.\n");
  assert.equal(result.outcomeStatus, null);
  assert.deepEqual(result.sections.map((s) => s.name), ["Brief"]);
});

test("readTodoFile returns empty result for a missing file", () => {
  const result = readTodoFile(join(here, "fixtures", "does-not-exist.md"));
  assert.deepEqual(result.sections, []);
  assert.equal(result.outcomeStatus, null);
});

test("parsePlanContent resolves markdown-link Spec cells (active-plan form)", () => {
  const content = [
    "# NEXT",
    "",
    "## Current Active Plan",
    "",
    "- Title: Link Form",
    "- Slug: 20260101-link-form",
    "- Status: ACTIVE",
    "- Updated: 2026-01-01",
    "",
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 1 | TODO-001 Foo | A | IN PROGRESS | [watchtower/todos/TODO-001-foo.md](watchtower/todos/TODO-001-foo.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | a note |",
    "",
    "## Handoff",
    "",
    "- Next action: x",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.status, "ACTIVE");
  assert.equal(plan.totalCount, 1);
  assert.equal(plan.todos[0].status, "IN_PROGRESS");
  assert.equal(plan.todos[0].group, "A");
  assert.equal(plan.todos[0].specPath, "/ws/watchtower/todos/TODO-001-foo.md");
  assert.equal(plan.todos[0].outcomePath, null);
});

test("parsePlanContent derives todo id from Spec when TODO cell is title only", () => {
  const content = [
    "# NEXT",
    "",
    "## Current Active Plan",
    "",
    "- Title: Title Only",
    "- Slug: 20260101-title-only",
    "- Status: ACTIVE",
    "- Updated: 2026-01-01",
    "",
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 4 | Show TODO code in rows | A | TODO | [watchtower/todos/TODO-004-show-todo-code-in-rows.md](watchtower/todos/TODO-004-show-todo-code-in-rows.md) | - | - | title-only cell |",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.todos[0].id, "TODO-004");
  assert.equal(plan.todos[0].title, "Show TODO code in rows");
  assert.equal(plan.todos[0].specPath, "/ws/watchtower/todos/TODO-004-show-todo-code-in-rows.md");
});

test("parsePlanContent falls back to padded order when TODO cell and Spec lack id", () => {
  const content = [
    "# NEXT",
    "",
    "## Current Active Plan",
    "",
    "- Title: Order Fallback",
    "- Slug: 20260101-order-fallback",
    "- Status: ACTIVE",
    "- Updated: 2026-01-01",
    "",
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 5 | Row title | A | TODO | watchtower/todos/row-title.md | - | - | no code |",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.todos[0].id, "TODO-005");
  assert.equal(plan.todos[0].title, "Row title");
});

test("parsePlanContent resolves existing outcome files beside TODO specs", () => {
  const root = mkdtempSync(join(tmpdir(), "watchtower-parser-"));
  const todosDir = join(root, "watchtower", "todos");
  mkdirSync(todosDir, { recursive: true });
  writeFileSync(join(todosDir, "TODO-001-outcome.md"), "# Outcome\n");

  const content = [
    "# NEXT",
    "",
    "## Current Active Plan",
    "",
    "- Title: Outcome File",
    "- Slug: 20260101-outcome-file",
    "- Status: ACTIVE",
    "- Updated: 2026-01-01",
    "",
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 1 | TODO-001 Foo | A | DONE | watchtower/todos/TODO-001-foo.md | - | - | done |",
  ].join("\n");

  const plan = parsePlanContent(content, join(root, "watchtower", "NEXT.md"));
  assert.equal(plan.todos[0].outcomePath, join(todosDir, "TODO-001-outcome.md"));
});

test("parsePlanContent returns no todos when Tracker section is absent", () => {
  const content = "# NEXT\n\n## Current Active Plan\n\nTitle: Empty\nStatus: ACTIVE\n\n## Handoff\n\n- none\n";
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.title, "Empty");
  assert.equal(plan.totalCount, 0);
  assert.deepEqual(plan.todos, []);
});
