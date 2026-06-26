import { type ArchivePlan, type Plan, type Task, type TaskStatus } from "./model.ts";

export interface DashboardData {
  plan: Plan | null;
  archive: ArchivePlan[];
  nextPath: string;
  contextPath: string;
}

const COMMANDS = [
  { label: "new", action: "add new task", suffix: " " },
  { label: "implement", action: "implement all", suffix: " "  },
  { label: "implement subagents", action: "implement with fan out subagents", suffix: " "  },
  { label: "research", action: "research", suffix: " "  },
  { label: "next", action: "next", suffix: " "  },
  { label: "verify", action: "verify", suffix: " "  },
  { label: "progress", action: "progress", suffix: " " },
  { label: "archive", action: "archive" },
];

const EMPTY_COMMANDS = [
  { label: "new", action: "new" },
  { label: "research", action: "research" },
];

const STATUS_SECTION_ORDER: { status: TaskStatus; label: string }[] = [
  { status: "IN_PROGRESS", label: "Active" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "TODO", label: "Todo" },
  { status: "DONE", label: "Done" },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusClass(status: TaskStatus): string {
  return `st-${status.toLowerCase()}`;
}

// Bucket tasks by status. UNKNOWN folds into the TODO bucket so the four
// display sections (Active/Blocked/Todo/Done) always cover every task.
function bucketTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  const buckets: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
    UNKNOWN: [],
  };
  for (const t of tasks) {
    const key = buckets[t.status] ? t.status : "UNKNOWN";
    buckets[key].push(t);
  }
  buckets.TODO.push(...buckets.UNKNOWN);
  return buckets;
}

function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function progressState(plan: Plan): "done" | "blocked" | "open" {
  if (plan.totalCount > 0 && plan.doneCount === plan.totalCount) return "done";
  if (plan.tasks.some((task) => task.status === "BLOCKED")) return "blocked";
  return "open";
}

function taskRow(task: Task): string {
  const title = task.title || task.id;
  const statusLabel = task.status === "IN_PROGRESS" ? "Active" : task.status.toLowerCase().replace("_", " ");
  // Dragging a task drops the implement command for that task into the editor/terminal.
  const dragText = `watchtower implement ${task.id}`;
  const dragAttrs = `draggable="true" data-drag-text="${escapeHtml(dragText)}"`;
  const rowInner =
    `<span class="id">${escapeHtml(task.id)}</span>` +
    `<span class="ttl">${escapeHtml(title)}</span>` +
    `<span class="row-status ${statusClass(task.status)}">${escapeHtml(statusLabel)}</span>`;
  if (task.specPath) {
    return (
      `<div class="row" data-action="open" data-path="${escapeHtml(task.specPath)}" ${dragAttrs} tabindex="0" role="button">` +
      rowInner +
      `</div>`
    );
  }
  return (
    `<div class="row static" ${dragAttrs}>` +
    rowInner +
    `</div>`
  );
}

function section(id: string, label: string, tasks: Task[], collapsed: boolean): string {
  if (tasks.length === 0) return "";
  const sorted = [...tasks].sort((a, b) => a.order - b.order);
  return (
    `<div class="section${collapsed ? " collapsed" : ""}" data-section-id="${escapeHtml(id)}">` +
    `<button class="sec-head" type="button" aria-expanded="${!collapsed}">` +
    `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<span class="sec-label">${escapeHtml(label)}</span>` +
    `<span class="sec-count">${tasks.length}</span>` +
    `</button>` +
    `<div class="sec-body">${sorted.map(taskRow).join("")}</div>` +
    `</div>`
  );
}

function archiveSection(archive: ArchivePlan[]): string {
  if (archive.length === 0) return "";
  const rows = archive
    .map(
      (a) =>
        `<div class="row" data-action="openArchive" data-path="${escapeHtml(a.manifestPath)}" tabindex="0" role="button">` +
        `<span class="id">Archive</span>` +
        `<span class="ttl">${escapeHtml(a.slug)}</span>` +
        `<span class="row-status st-archive">Saved</span>` +
        `</div>`,
    )
    .join("");
  return (
    `<div class="section collapsed" data-section-id="archive">` +
    `<button class="sec-head" type="button" aria-expanded="false">` +
    `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<span class="sec-label">Archive</span>` +
    `<span class="sec-count">${archive.length}</span>` +
    `</button>` +
    `<div class="sec-body">${rows}</div>` +
    `</div>`
  );
}

function blockedNote(tasks: Task[]): string {
  const blocked = tasks
    .filter((task) => task.status === "BLOCKED")
    .sort((a, b) => a.order - b.order);
  if (blocked.length === 0) return "";
  const preview = blocked.slice(0, 3).map((task) => task.id).join(", ");
  const suffix = blocked.length > 3 ? ` +${blocked.length - 3} more` : "";
  return (
    `<div class="blocked-note" role="status">` +
    `<span class="blocked-title">Blocked</span>` +
    `<span class="blocked-copy">${escapeHtml(`${preview}${suffix} needs attention.`)}</span>` +
    `</div>`
  );
}

function commandButtons(): string {
  return COMMANDS.map(
    (cmd) => {
      const command = `watchtower ${cmd.action}${cmd.suffix ?? ""}`;
      // Copy the command with a trailing newline so it runs on paste.
      const copyText = `${command}\n`;
      return (
        `<button class="cmd-btn" data-action="copy" data-text="${escapeHtml(copyText)}" data-drag-text="${escapeHtml(command)}" draggable="true" title="Copy ${escapeHtml(command)}">` +
        `${escapeHtml(cmd.label)}` +
        `</button>`
      );
    },
  ).join("");
}

function commandGroup(): string {
  return (
    `<div class="cmd-group">` +
    `<div class="cmd-agent">` +
    `<span class="cmd-prefix">watchtower</span>` +
    `</div>` +
    `<div class="cmd-actions">` +
    commandButtons() +
    `</div>` +
    `</div>`
  );
}

function fileActions(nextPath: string, contextPath: string): string {
  const buttons = [
    nextPath
      ? `<button class="file-btn" data-action="openNext" data-path="${escapeHtml(nextPath)}" title="Open NEXT">NEXT</button>`
      : "",
    contextPath
      ? `<button class="file-btn" data-action="open" data-path="${escapeHtml(contextPath)}" title="Open CONTEXT">CONTEXT</button>`
      : "",
    nextPath ? `<button class="file-btn archive-btn" data-action="archive" title="Archive plan">Archive</button>` : "",
  ].join("");
  return buttons ? `<div class="file-actions">${buttons}</div>` : "";
}

export function renderDashboardHtml(data: DashboardData): string {
  const { plan, archive, nextPath, contextPath } = data;

  if (!plan) {
    return emptyState(nextPath);
  }

  const total = plan.totalCount;
  const done = plan.doneCount;
  const pct = percent(done, total);
  const buckets = bucketTasks(plan.tasks);

  const sections = STATUS_SECTION_ORDER.map((s) =>
    section(s.status.toLowerCase(), s.label, buckets[s.status], s.status === "DONE"),
  ).join("");

  const progressClass = `progress state-${progressState(plan)}`;

  const ringLabel =
    total === 0 ? `No tasks yet` : `${done} of ${total} done`;

  const planCardAttrs = nextPath
    ? ` data-action="openNext" data-path="${escapeHtml(nextPath)}" tabindex="0" role="button"`
    : "";

  return (
    `<div class="plan-card"${planCardAttrs}>` +
    `<div class="plan-top">` +
    `<div class="plan-title">${escapeHtml(plan.title || "Untitled plan")}</div>` +
    `<span class="badge">${escapeHtml(plan.status)}</span>` +
    `</div>` +
    `<div class="plan-meta">` +
    (plan.slug ? `<span class="slug">${escapeHtml(plan.slug)}</span>` : "") +
    (plan.updated ? `<span class="muted">Updated ${escapeHtml(plan.updated)}</span>` : "") +
    `</div>` +
    `</div>` +
    `<div class="${progressClass}" aria-label="Plan progress">` +
    `<div class="progress-head">` +
    `<span class="progress-value">${pct}%</span>` +
    `<span class="ring-label">${ringLabel}</span>` +
    `</div>` +
    `<div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>` +
    `</div>` +
    `<div class="stats">` +
    `<div class="stat"><small>Done</small><b class="st-done">${done}</b></div>` +
    `<div class="stat"><small>Active</small><b class="st-in_progress">${buckets.IN_PROGRESS.length}</b></div>` +
    `<div class="stat"><small>Blocked</small><b class="st-blocked">${buckets.BLOCKED.length}</b></div>` +
    `</div>` +
    blockedNote(plan.tasks) +
    fileActions(nextPath, contextPath) +
    `<div class="command-bar" aria-label="Watchtower commands">` +
    commandGroup() +
    `</div>` +
    `<div class="list">${sections}${archiveSection(archive)}</div>` +
    `<div class="toast" id="toast" hidden>Copied</div>`
  );
}

function emptyState(nextPath: string): string {
  const copyIcon =
    `<svg class="copy-cmd-icon" viewBox="0 0 16 16" aria-hidden="true">` +
    `<rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
    `<path d="M3.5 10.5h-1A1.5 1.5 0 0 1 1 9V2.5A1.5 1.5 0 0 1 2.5 1H9a1.5 1.5 0 0 1 1.5 1.5v1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
  const buttons = EMPTY_COMMANDS.map((cmd) => {
    const label = `watchtower ${cmd.action}`;
    const copyText = `${label}\n`;
    return (
      `<button class="copy-cmd" data-action="copy" data-text="${escapeHtml(copyText)}" data-drag-text="${escapeHtml(label)}" draggable="true" title="Copy ${escapeHtml(label)}">` +
      `<span class="copy-cmd-label">` +
      `<span class="copy-cmd-text">${escapeHtml(label)}</span>` +
      `</span>` +
      copyIcon +
      `</button>`
    );
  }).join("");
  const copyButtons =
    `<div class="empty-command-group">` +
    `<div class="empty-command-head">` +
    `<span class="cmd-prefix">watchtower</span>` +
    `</div>` +
    buttons +
    `</div>`;
  return (
    `<div class="empty">` +
    `<div class="empty-title">No active plan</div>` +
    `<div class="empty-sub">No watchtower/NEXT.md found in this workspace.</div>` +
    `<div class="empty-hint">Copy a command to work with plans:</div>` +
    `<div class="empty-actions">${copyButtons}</div>` +
    (nextPath
      ? `<button class="cmd-btn" data-action="openNext" data-path="${escapeHtml(nextPath)}">Open NEXT.md</button>`
      : "") +
    `<div class="toast" id="toast" hidden>Copied</div>` +
    `</div>`
  );
}
