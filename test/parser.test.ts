import { test } from "node:test";
import assert from "node:assert/strict";
import { toTaskStatus, toPlanStatus } from "../src/model.ts";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { parsePlanContent, parseTaskFile, readTaskFile } from "../src/parser.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sampleNext = readFileSync(join(here, "fixtures", "sample-NEXT.md"), "utf8");
const sampleTask = readFileSync(join(here, "fixtures", "sample-task.md"), "utf8");

test("toTaskStatus maps known labels", () => {
  assert.equal(toTaskStatus("DONE"), "DONE");
  assert.equal(toTaskStatus("IN PROGRESS"), "IN_PROGRESS");
  assert.equal(toTaskStatus("in progress"), "IN_PROGRESS");
  assert.equal(toTaskStatus("BLOCKED"), "BLOCKED");
  assert.equal(toTaskStatus("TODO"), "TODO");
  assert.equal(toTaskStatus("weird"), "UNKNOWN");
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

  assert.equal(plan.tasks.length, 4);
  assert.deepEqual(
    plan.tasks.map((t) => t.status),
    ["DONE", "DONE", "DONE", "BLOCKED"],
  );

  const first = plan.tasks[0];
  assert.equal(first.id, "TASK-001");
  assert.equal(first.title, "Build quiz state and markup shell");
  assert.equal(first.order, 1);
  assert.equal(first.group, "standalone");
  assert.ok(first.notes.length > 0);
  assert.equal(
    first.specPath,
    "/ws/watchtower/tasks/TASK-001-build-quiz-state-and-markup-shell.md",
  );

  const fourth = plan.tasks[3];
  assert.equal(fourth.id, "TASK-004");
  assert.equal(
    fourth.specPath,
    "/ws/watchtower/tasks/TASK-004-integrate-responsive-flow-and-qa.md",
  );
});

test("parseTaskFile finds sections and outcome status", () => {
  const result = parseTaskFile(sampleTask);
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

test("parseTaskFile returns null outcome when absent", () => {
  const result = parseTaskFile("# TASK-009 X\n\n## Brief\n\nGoal: x.\n");
  assert.equal(result.outcomeStatus, null);
  assert.deepEqual(result.sections.map((s) => s.name), ["Brief"]);
});

test("readTaskFile returns empty result for a missing file", () => {
  const result = readTaskFile(join(here, "fixtures", "does-not-exist.md"));
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
    "| Order | TASK | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 1 | TASK-001 Foo | A | IN PROGRESS | [watchtower/tasks/TASK-001-foo.md](watchtower/tasks/TASK-001-foo.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | a note |",
    "",
    "## Handoff",
    "",
    "- Next action: x",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.status, "ACTIVE");
  assert.equal(plan.totalCount, 1);
  assert.equal(plan.tasks[0].status, "IN_PROGRESS");
  assert.equal(plan.tasks[0].group, "A");
  assert.equal(plan.tasks[0].specPath, "/ws/watchtower/tasks/TASK-001-foo.md");
  assert.equal(plan.tasks[0].outcomePath, null);
});

test("parsePlanContent derives task id from Spec when TASK cell is title only", () => {
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
    "| Order | TASK | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 4 | Show task code in rows | A | TODO | [watchtower/tasks/TASK-004-show-task-code-in-rows.md](watchtower/tasks/TASK-004-show-task-code-in-rows.md) | - | - | title-only cell |",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.tasks[0].id, "TASK-004");
  assert.equal(plan.tasks[0].title, "Show task code in rows");
  assert.equal(plan.tasks[0].specPath, "/ws/watchtower/tasks/TASK-004-show-task-code-in-rows.md");
});

test("parsePlanContent falls back to padded order when TASK cell and Spec lack id", () => {
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
    "| Order | TASK | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 5 | Row title | A | TODO | watchtower/tasks/row-title.md | - | - | no code |",
  ].join("\n");
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.tasks[0].id, "TASK-005");
  assert.equal(plan.tasks[0].title, "Row title");
});

test("parsePlanContent resolves existing outcome files beside TASK specs", () => {
  const root = mkdtempSync(join(tmpdir(), "watchtower-parser-"));
  const tasksDir = join(root, "watchtower", "tasks");
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(join(tasksDir, "TASK-001-outcome.md"), "# Outcome\n");

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
    "| Order | TASK | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 1 | TASK-001 Foo | A | DONE | watchtower/tasks/TASK-001-foo.md | - | - | done |",
  ].join("\n");

  const plan = parsePlanContent(content, join(root, "watchtower", "NEXT.md"));
  assert.equal(plan.tasks[0].outcomePath, join(tasksDir, "TASK-001-outcome.md"));
});

test("parsePlanContent returns no tasks when Tracker section is absent", () => {
  const content = "# NEXT\n\n## Current Active Plan\n\nTitle: Empty\nStatus: ACTIVE\n\n## Handoff\n\n- none\n";
  const plan = parsePlanContent(content, "/ws/watchtower/NEXT.md");
  assert.equal(plan.title, "Empty");
  assert.equal(plan.totalCount, 0);
  assert.deepEqual(plan.tasks, []);
});

test("parsePlanContent still parses legacy TODO plans (back-compat)", () => {
  const root = mkdtempSync(join(tmpdir(), "watchtower-legacy-"));
  const todosDir = join(root, "watchtower", "todos");
  mkdirSync(todosDir, { recursive: true });

  const content = [
    "# NEXT",
    "",
    "## Current Active Plan",
    "",
    "- Title: Legacy",
    "- Slug: 20260101-legacy",
    "- Status: ACTIVE",
    "- Updated: 2026-01-01",
    "",
    "## Tracker",
    "",
    "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
    "|-------|------|-------|--------|------|------|---------|-------|",
    "| 1 | TODO-001 Foo | A | TODO | watchtower/todos/TODO-001-foo.md | - | - | legacy |",
  ].join("\n");

  const plan = parsePlanContent(content, join(root, "watchtower", "NEXT.md"));
  assert.equal(plan.totalCount, 1);
  assert.equal(plan.tasks[0].id, "TODO-001");
  assert.equal(plan.tasks[0].specPath, join(todosDir, "TODO-001-foo.md"));
});
