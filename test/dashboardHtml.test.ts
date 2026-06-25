import { test } from "node:test";
import assert from "node:assert/strict";
import { type ArchivePlan, type Plan, type Task, type TaskStatus } from "../src/model.ts";
import { renderDashboardHtml, type DashboardData } from "../src/dashboardHtml.ts";

function makeTask(
  id: string,
  order: number,
  status: TaskStatus,
  specPath: string | null = null,
  title = "",
): Task {
  return {
    order,
    id,
    title: title || id,
    group: "standalone",
    status,
    specPath,
    outcomePath: null,
    deps: "",
    notes: "",
  };
}

function makePlan(tasks: Task[], overrides: Partial<Plan> = {}): Plan {
  return {
    title: "Gacha Size Quiz",
    slug: "20260620-gacha-size-quiz",
    status: "ACTIVE",
    updated: "2026-06-21",
    manifestPath: "/ws/watchtower/NEXT.md",
    tasks,
    doneCount: tasks.filter((t) => t.status === "DONE").length,
    totalCount: tasks.length,
    ...overrides,
  };
}

function data(
  plan: Plan | null,
  archive: ArchivePlan[] = [],
  nextPath = "/ws/watchtower/NEXT.md",
  contextPath = "/ws/watchtower/CONTEXT.md",
): DashboardData {
  return { plan, archive, nextPath, contextPath };
}

test("normal plan renders title, counts, and one row per task", () => {
  const plan = makePlan([
    makeTask("TASK-001", 1, "DONE", "/ws/watchtower/tasks/TASK-001-shell.md", "shell"),
    makeTask("TASK-002", 2, "IN_PROGRESS", "/ws/watchtower/tasks/TASK-002-quiz.md", "quiz logic"),
    makeTask("TASK-003", 3, "BLOCKED", "/ws/watchtower/tasks/TASK-003-api.md", "api endpoint"),
    makeTask("TASK-004", 4, "TODO", null, "scoring"),
    makeTask("TASK-005", 5, "TODO", null, "polish"),
  ]);
  const html = renderDashboardHtml(data(plan));

  assert.match(html, /Gacha Size Quiz/);
  assert.match(html, /1 of 5 done/);
  assert.match(html, /20%/);
  for (const id of ["TASK-001", "TASK-002", "TASK-003", "TASK-004", "TASK-005"]) {
    assert.ok(html.includes(id), `expected ${id} in html`);
  }
});

test("stats show done, active, blocked counts", () => {
  const plan = makePlan([
    makeTask("TASK-001", 1, "DONE"),
    makeTask("TASK-002", 2, "DONE"),
    makeTask("TASK-003", 3, "IN_PROGRESS"),
    makeTask("TASK-004", 4, "BLOCKED"),
    makeTask("TASK-005", 5, "TODO"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /<b class="st-done">2<\/b>/);
  assert.match(html, /<b class="st-in_progress">1<\/b>/);
  assert.match(html, /<b class="st-blocked">1<\/b>/);
});

test("sections render in ACTIVE, BLOCKED, TODO, DONE order", () => {
  const plan = makePlan([
    makeTask("TASK-004", 4, "TODO"),
    makeTask("TASK-001", 1, "DONE"),
    makeTask("TASK-003", 3, "BLOCKED"),
    makeTask("TASK-002", 2, "IN_PROGRESS"),
  ]);
  const html = renderDashboardHtml(data(plan));
  const active = html.indexOf('<span class="sec-label">Active</span>');
  const blocked = html.indexOf('<span class="sec-label">Blocked</span>');
  const todo = html.indexOf('<span class="sec-label">Todo</span>');
  const done = html.indexOf('<span class="sec-label">Done</span>');
  assert.ok(active > -1 && blocked > -1 && todo > -1 && done > -1, "all sections present");
  assert.ok(active < blocked, "active before blocked");
  assert.ok(blocked < todo, "blocked before todo");
  assert.ok(todo < done, "todo before done");
});

test("empty sections are omitted", () => {
  const plan = makePlan([makeTask("TASK-001", 1, "DONE")]);
  const html = renderDashboardHtml(data(plan));
  assert.ok(!html.includes('<span class="sec-label">Blocked</span>'), "no blocked section when none blocked");
  assert.ok(html.includes('<span class="sec-label">Done</span>'), "done section present");
});

test("plan with zero tasks shows No tasks yet and 0%", () => {
  const plan = makePlan([], { doneCount: 0, totalCount: 0 });
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /No tasks yet/);
  assert.match(html, /0%/);
  assert.match(html, /class="progress state-open"/);
  assert.match(html, /class="bar-fill" style="width:0%"/);
  assert.ok(!html.includes("of "), "no N of M label");
});

test("progress state color follows open, blocked, and done state", () => {
  const open = renderDashboardHtml(data(makePlan([makeTask("TASK-001", 1, "TODO")])));
  const blocked = renderDashboardHtml(data(makePlan([makeTask("TASK-001", 1, "BLOCKED")])));
  const done = renderDashboardHtml(data(makePlan([makeTask("TASK-001", 1, "DONE")])));

  assert.match(open, /class="progress state-open"/);
  assert.match(blocked, /class="progress state-blocked"/);
  assert.match(done, /class="progress state-done"/);
});

test("null plan shows empty state", () => {
  const html = renderDashboardHtml(data(null));
  assert.match(html, /No active plan/);
  assert.match(html, /empty-command-group/);
  assert.match(html, /Codex/);
  assert.match(html, /Claude/);
  assert.match(html, /\$watchtower new/);
  assert.match(html, /\$watchtower research/);
  assert.match(html, /\/watchtower new/);
  assert.match(html, /\/watchtower research/);
  assert.match(html, /data-text="\$watchtower new\n" data-drag-text="\$watchtower new" draggable="true"/);
  assert.match(html, /data-text="\/watchtower research\n" data-drag-text="\/watchtower research" draggable="true"/);
});

test("null plan without nextPath hides Open NEXT.md button", () => {
  const html = renderDashboardHtml({ plan: null, archive: [], nextPath: "", contextPath: "" });
  assert.ok(!html.includes("Open NEXT.md"), "no open button when next missing");
});

test("archive section lists slugs", () => {
  const archive: ArchivePlan[] = [
    { slug: "20260601-a", manifestPath: "/ws/watchtower/archive/20260601-a/NEXT.md" },
    { slug: "20260602-b", manifestPath: "/ws/watchtower/archive/20260602-b/NEXT.md" },
  ];
  const html = renderDashboardHtml(data(makePlan([]), archive));
  assert.match(html, /Archive/);
  assert.match(html, /20260601-a/);
  assert.match(html, /20260602-b/);
});

test("spec paths are wired as data-path on task rows", () => {
  const plan = makePlan([
    makeTask("TASK-002", 2, "IN_PROGRESS", "/ws/watchtower/tasks/TASK-002-quiz.md", "quiz"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /data-action="open" data-path="\/ws\/watchtower\/tasks\/TASK-002-quiz\.md"/);
});

test("task rows expose row menu implement copy commands", () => {
  const plan = makePlan([
    makeTask("TASK-002", 2, "IN_PROGRESS", "/ws/watchtower/tasks/TASK-002-quiz.md", "quiz"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /class="row-menu"/);
  assert.match(html, /data-text="\$watchtower implement TASK-002\n"/);
  assert.match(html, /data-text="\/watchtower implement TASK-002\n"/);
  assert.match(html, /title="Copy \$watchtower implement TASK-002"/);
});

test("task row renders canonical id and readable title", () => {
  const plan = makePlan([
    makeTask("TASK-007", 7, "TODO", "/ws/watchtower/tasks/TASK-007-title-only.md", "Title only tracker cell"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /<span class="id">TASK-007<\/span>/);
  assert.match(html, /<span class="ttl">Title only tracker cell<\/span>/);
});

test("task row implement copy commands escape task ids", () => {
  const plan = makePlan([
    makeTask('TASK-006" onclick="x', 6, "TODO", null, "quoted"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.ok(!html.includes('data-text="$watchtower implement TASK-006" onclick="x'));
  assert.match(html, /data-text="\$watchtower implement TASK-006&quot; onclick=&quot;x\n"/);
});

test("archive rows use openArchive action with manifest path", () => {
  const archive: ArchivePlan[] = [
    { slug: "s1", manifestPath: "/ws/watchtower/archive/s1/NEXT.md" },
  ];
  const html = renderDashboardHtml(data(makePlan([]), archive));
  assert.match(html, /data-action="openArchive" data-path="\/ws\/watchtower\/archive\/s1\/NEXT\.md"/);
});

test("file actions open NEXT and CONTEXT when both files exist", () => {
  const html = renderDashboardHtml(data(makePlan([makeTask("TASK-001", 1, "TODO")])));
  assert.match(html, /class="file-actions"/);
  assert.match(html, /data-action="openNext" data-path="\/ws\/watchtower\/NEXT\.md"/);
  assert.match(html, /data-action="open" data-path="\/ws\/watchtower\/CONTEXT\.md"/);
  assert.match(html, /data-action="archive"/);
  assert.match(html, />NEXT<\/button>/);
  assert.match(html, />CONTEXT<\/button>/);
  assert.match(html, /title="Open NEXT"/);
  assert.match(html, /title="Open CONTEXT"/);
  assert.match(html, /Archive/);
});

test("blocked note shows blocked task ids", () => {
  const plan = makePlan([
    makeTask("TASK-001", 1, "TODO"),
    makeTask("TASK-002", 2, "BLOCKED"),
    makeTask("TASK-003", 3, "BLOCKED"),
  ]);
  const html = renderDashboardHtml(data(plan));
  assert.match(html, /class="blocked-note"/);
  assert.match(html, /TASK-002, TASK-003 needs attention\./);
});

test("html in title and slug is escaped", () => {
  const plan = makePlan([], {
    title: "<b>bold</b>",
    slug: '"><img src=x>',
  });
  const html = renderDashboardHtml(data(plan));
  assert.ok(!html.includes("<b>bold</b>"), "title not raw");
  assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt;"), "title escaped");
  assert.ok(!html.includes("<img src=x>"), "slug not raw-injected");
});

test("copy buttons carry Codex and Claude watchtower commands", () => {
  const html = renderDashboardHtml(data(makePlan([makeTask("TASK-001", 1, "TODO")])));
  assert.match(html, /\$watchtower/);
  assert.match(html, /\/watchtower/);
  assert.match(html, /Codex/);
  assert.match(html, /Claude/);
  assert.match(html, /data-text="\$watchtower next\n"/);
  assert.match(html, /data-text="\$watchtower verify\n"/);
  assert.match(html, /data-text="\$watchtower implement\n"/);
  assert.match(html, /data-text="\$watchtower implement with fan out subagents\n"/);
  assert.match(html, /data-text="\$watchtower research\n"/);
  assert.match(html, /data-text="\$watchtower progress \n"/);
  assert.match(html, /data-text="\$watchtower archive\n"/);
  assert.match(html, /data-text="\/watchtower next\n"/);
  assert.match(html, /data-text="\/watchtower verify\n"/);
  assert.match(html, /data-text="\/watchtower implement\n"/);
  assert.match(html, /data-text="\/watchtower implement with fan out subagents\n"/);
  assert.match(html, /data-text="\/watchtower research\n"/);
  assert.match(html, /data-text="\/watchtower progress \n"/);
  assert.match(html, /data-text="\/watchtower archive\n"/);
  assert.match(html, /data-text="\$watchtower research\n" data-drag-text="\$watchtower research" draggable="true"/);
  assert.match(html, /data-text="\/watchtower research\n" data-drag-text="\/watchtower research" draggable="true"/);
});
