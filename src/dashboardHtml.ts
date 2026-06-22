import { type ArchivePlan, type Plan, type Todo, type TodoStatus } from "./model.ts";

export interface DashboardData {
  plan: Plan | null;
  archive: ArchivePlan[];
  nextPath: string;
}

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

function todoRow(todo: Todo): string {
  const title = todo.title || todo.id;
  if (todo.specPath) {
    return (
      `<div class="row" data-action="open" data-path="${escapeHtml(todo.specPath)}" tabindex="0" role="button">` +
      `<span class="dot ${statusClass(todo.status)}" aria-hidden="true"></span>` +
      `<span class="id">${escapeHtml(todo.id)}</span>` +
      `<span class="ttl">${escapeHtml(title)}</span>` +
      `</div>`
    );
  }
  return (
    `<div class="row static">` +
    `<span class="dot ${statusClass(todo.status)}" aria-hidden="true"></span>` +
    `<span class="id">${escapeHtml(todo.id)}</span>` +
    `<span class="ttl">${escapeHtml(title)}</span>` +
    `</div>`
  );
}

function section(label: string, todos: Todo[], collapsed: boolean): string {
  if (todos.length === 0) return "";
  const sorted = [...todos].sort((a, b) => a.order - b.order);
  return (
    `<div class="section${collapsed ? " collapsed" : ""}">` +
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
        `<span class="dot st-archive" aria-hidden="true"></span>` +
        `<span class="ttl">${escapeHtml(a.slug)}</span>` +
        `</div>`,
    )
    .join("");
  return (
    `<div class="section collapsed">` +
    `<button class="sec-head" type="button" aria-expanded="false">` +
    `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<span class="sec-label">Archive</span>` +
    `<span class="sec-count">${archive.length}</span>` +
    `</button>` +
    `<div class="sec-body">${rows}</div>` +
    `</div>`
  );
}

export function renderDashboardHtml(data: DashboardData): string {
  const { plan, archive, nextPath } = data;

  if (!plan) {
    return emptyState(nextPath);
  }

  const total = plan.totalCount;
  const done = plan.doneCount;
  const pct = percent(done, total);
  const buckets = bucketTodos(plan.todos);

  const sections = STATUS_SECTION_ORDER.map((s) =>
    section(s.label, buckets[s.status], s.status === "DONE"),
  ).join("");

  const ringFill = `var(--vscode-progressBar-background)`;
  const ringTrack = `var(--vscode-editorWidget-background)`;
  const ringStyle = `background: conic-gradient(${ringFill} 0 ${pct}%, ${ringTrack} ${pct}% 100%);`;

  const ringLabel =
    total === 0 ? `No TODOs yet` : `${done} of ${total} todos`;

  const planCardAttrs = nextPath
    ? ` data-action="openNext" data-path="${escapeHtml(nextPath)}" tabindex="0" role="button"`
    : "";

  return (
    `<div class="head">` +
    `<span class="brand">Watchtower</span>` +
    `<button class="icon-btn" data-action="refresh" title="Refresh" aria-label="Refresh">` +
    `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `</button>` +
    `</div>` +
    `<div class="plan-card"${planCardAttrs}>` +
    `<div class="plan-title">${escapeHtml(plan.title || "Untitled plan")}</div>` +
    `<div class="plan-meta">` +
    (plan.slug ? `<span class="slug">${escapeHtml(plan.slug)}</span>` : "") +
    `<span class="badge">${escapeHtml(plan.status)}</span>` +
    (plan.updated ? `<span class="muted">Updated ${escapeHtml(plan.updated)}</span>` : "") +
    `</div>` +
    `</div>` +
    `<div class="progress">` +
    `<div class="ring" style="${ringStyle}"><span class="ring-pct">${pct}%</span></div>` +
    `<div class="ring-label">${ringLabel}</div>` +
    `<div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>` +
    `</div>` +
    `<div class="stats">` +
    `<div class="stat"><b class="st-done">${done}</b><small>DONE</small></div>` +
    `<div class="stat"><b class="st-in_progress">${buckets.IN_PROGRESS.length}</b><small>ACTIVE</small></div>` +
    `<div class="stat"><b class="st-blocked">${buckets.BLOCKED.length}</b><small>BLOCKED</small></div>` +
    `</div>` +
    `<div class="actions">` +
    (nextPath
      ? `<button class="btn" data-action="openNext" data-path="${escapeHtml(nextPath)}">Open NEXT</button>`
      : "") +
    `<button class="btn" data-action="copy" data-text="/watchtower next">Copy /next</button>` +
    `<button class="btn" data-action="copy" data-text="/watchtower verify">Copy /verify</button>` +
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
    `<div class="empty-hint">Run <code>/watchtower new &lt;summary&gt;</code> to start a plan.</div>` +
    (nextPath
      ? `<button class="btn" data-action="openNext" data-path="${escapeHtml(nextPath)}">Open NEXT.md</button>`
      : "") +
    `</div>`
  );
}
