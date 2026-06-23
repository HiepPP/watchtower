import { type ArchivePlan, type Plan, type Todo, type TodoStatus } from "./model.ts";

export interface DashboardData {
  plan: Plan | null;
  archive: ArchivePlan[];
  nextPath: string;
  contextPath: string;
}

type CommandMode = "codex" | "claude";

const COMMANDS = [
  { label: "implement", action: "implement" },
  { label: "implement subagents", action: "implement with fan out subagents" },
  { label: "next", action: "next" },
  { label: "verify", action: "verify" },
  { label: "progress", action: "progress", suffix: " " },
  { label: "archive", action: "archive" },
];

const STATUS_SECTION_ORDER: { status: TodoStatus; label: string }[] = [
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

function statusClass(status: TodoStatus): string {
  return `st-${status.toLowerCase()}`;
}

// Bucket todos by status. UNKNOWN folds into the TODO bucket so the four
// display sections (Active/Blocked/Todo/Done) always cover every todo.
function bucketTodos(todos: Todo[]): Record<TodoStatus, Todo[]> {
  const buckets: Record<TodoStatus, Todo[]> = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
    UNKNOWN: [],
  };
  for (const t of todos) {
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
  if (plan.todos.some((todo) => todo.status === "BLOCKED")) return "blocked";
  return "open";
}

function todoRow(todo: Todo): string {
  const title = todo.title || todo.id;
  const statusLabel = todo.status === "IN_PROGRESS" ? "Active" : todo.status.toLowerCase().replace("_", " ");
  const rowInner =
    `<span class="id">${escapeHtml(todo.id)}</span>` +
    `<span class="ttl">${escapeHtml(title)}</span>` +
    `<span class="row-status ${statusClass(todo.status)}">${escapeHtml(statusLabel)}</span>`;
  if (todo.specPath) {
    return (
      `<div class="row" data-action="open" data-path="${escapeHtml(todo.specPath)}" tabindex="0" role="button">` +
      rowInner +
      `</div>`
    );
  }
  return (
    `<div class="row static">` +
    rowInner +
    `</div>`
  );
}

function section(id: string, label: string, todos: Todo[], collapsed: boolean): string {
  if (todos.length === 0) return "";
  const sorted = [...todos].sort((a, b) => a.order - b.order);
  return (
    `<div class="section${collapsed ? " collapsed" : ""}" data-section-id="${escapeHtml(id)}">` +
    `<button class="sec-head" type="button" aria-expanded="${!collapsed}">` +
    `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<span class="sec-label">${escapeHtml(label)}</span>` +
    `<span class="sec-count">${todos.length}</span>` +
    `</button>` +
    `<div class="sec-body">${sorted.map(todoRow).join("")}</div>` +
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

function blockedNote(todos: Todo[]): string {
  const blocked = todos
    .filter((todo) => todo.status === "BLOCKED")
    .sort((a, b) => a.order - b.order);
  if (blocked.length === 0) return "";
  const preview = blocked.slice(0, 3).map((todo) => todo.id).join(", ");
  const suffix = blocked.length > 3 ? ` +${blocked.length - 3} more` : "";
  return (
    `<div class="blocked-note" role="status">` +
    `<span class="blocked-title">Blocked</span>` +
    `<span class="blocked-copy">${escapeHtml(`${preview}${suffix} needs attention.`)}</span>` +
    `</div>`
  );
}

function commandPrefix(mode: CommandMode): "$watchtower" | "/watchtower" {
  return mode === "codex" ? "$watchtower" : "/watchtower";
}

function commandModeLabel(mode: CommandMode): "Codex" | "Claude" {
  return mode === "codex" ? "Codex" : "Claude";
}

function commandButtons(mode: CommandMode): string {
  const prefix = commandPrefix(mode);
  return COMMANDS.map(
    (cmd) => {
      const text = `${prefix} ${cmd.action}${cmd.suffix ?? ""}`;
      return (
        `<button class="cmd-btn" data-action="copy" data-text="${escapeHtml(text)}" title="Copy ${escapeHtml(text)}">` +
      `${escapeHtml(cmd.label)}` +
        `</button>`
      );
    },
  ).join("");
}

function commandGroup(mode: CommandMode): string {
  return (
    `<div class="cmd-group">` +
    `<div class="cmd-agent">` +
    `<span class="cmd-prefix">${commandPrefix(mode)}</span>` +
    `<span class="cmd-mode">${commandModeLabel(mode)}</span>` +
    `</div>` +
    `<div class="cmd-actions">` +
    commandButtons(mode) +
    `</div>` +
    `</div>`
  );
}

function fileActions(nextPath: string, contextPath: string): string {
  const buttons = [
    nextPath
      ? `<button class="file-btn" data-action="openNext" data-path="${escapeHtml(nextPath)}">Open NEXT</button>`
      : "",
    contextPath
      ? `<button class="file-btn" data-action="open" data-path="${escapeHtml(contextPath)}">Open CONTEXT</button>`
      : "",
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
  const buckets = bucketTodos(plan.todos);

  const sections = STATUS_SECTION_ORDER.map((s) =>
    section(s.status.toLowerCase(), s.label, buckets[s.status], s.status === "DONE"),
  ).join("");

  const progressClass = `progress state-${progressState(plan)}`;

  const ringLabel =
    total === 0 ? `No TODOs yet` : `${done} of ${total} done`;

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
    blockedNote(plan.todos) +
    fileActions(nextPath, contextPath) +
    `<div class="command-bar" aria-label="Watchtower commands">` +
    commandGroup("codex") +
    commandGroup("claude") +
    `</div>` +
    `<div class="list">${sections}${archiveSection(archive)}</div>` +
    `<div class="toast" id="toast" hidden>Copied</div>`
  );
}

function emptyState(nextPath: string): string {
  return (
    `<div class="empty">` +
    `<div class="empty-title">No active plan</div>` +
    `<div class="empty-sub">No watchtower/NEXT.md found in this workspace.</div>` +
    `<div class="empty-hint">Run <code>$watchtower new &lt;summary&gt;</code> or <code>/watchtower new &lt;summary&gt;</code>.</div>` +
    (nextPath
      ? `<button class="cmd-btn" data-action="openNext" data-path="${escapeHtml(nextPath)}">Open NEXT.md</button>`
      : "") +
    `</div>`
  );
}
