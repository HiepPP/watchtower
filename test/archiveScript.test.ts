import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("archive script moves active plan into watchtower/archive", () => {
  const root = mkdtempSync(join(tmpdir(), "watchtower-archive-"));
  const watchtowerDir = join(root, "watchtower");
  const todosDir = join(watchtowerDir, "todos");
  mkdirSync(todosDir, { recursive: true });
  writeFileSync(
    join(watchtowerDir, "NEXT.md"),
    [
      "# NEXT",
      "",
      "## Current Active Plan",
      "",
      "- Title: Test Plan",
      "- Slug: 20260623-test-plan",
      "- Status: DONE",
      "- Updated: 2026-06-23",
      "",
      "## Tracker",
      "",
      "| Order | TODO | Group | Status | Spec | Deps | Context | Notes |",
      "|-------|------|-------|--------|------|------|---------|-------|",
      "| 1 | TODO-001 Done | standalone | DONE | watchtower/todos/TODO-001-done.md | - | - | done |",
    ].join("\n"),
  );
  writeFileSync(join(watchtowerDir, "CONTEXT.md"), "# Context\n");
  writeFileSync(join(todosDir, "TODO-001-done.md"), "# TODO\n");

  const output = execFileSync(process.execPath, ["scripts/archive-watchtower-plan.mjs", root], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  const archiveDir = join(watchtowerDir, "archive", "20260623-test-plan");
  assert.match(output, /Archived 20260623-test-plan/);
  assert.equal(existsSync(join(watchtowerDir, "NEXT.md")), false);
  assert.equal(existsSync(join(watchtowerDir, "CONTEXT.md")), false);
  assert.equal(existsSync(todosDir), false);
  assert.equal(existsSync(join(archiveDir, "NEXT.md")), true);
  assert.equal(existsSync(join(archiveDir, "CONTEXT.md")), true);
  assert.equal(existsSync(join(archiveDir, "todos", "TODO-001-done.md")), true);

  const archivedNext = readFileSync(join(archiveDir, "NEXT.md"), "utf8");
  assert.match(archivedNext, /- Status: ARCHIVED/);
  assert.match(archivedNext, /- Archived: \d{4}-\d{2}-\d{2} -> watchtower\/archive\/20260623-test-plan\//);
});
