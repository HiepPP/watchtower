import * as path from "node:path";
import * as fs from "node:fs";
import {
  type Plan,
  type Task,
  type ArchivePlan,
  type Section,
  type TaskStatus,
  toPlanStatus,
  toTaskStatus,
} from "./model.ts";

function headerBlock(content: string): string {
  const start = content.indexOf("## Current Active Plan");
  if (start === -1) return "";
  const rest = content.slice(start + "## Current Active Plan".length);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

function trackerBlock(content: string): string {
  const start = content.indexOf("## Tracker");
  if (start === -1) return content;
  const rest = content.slice(start);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

function field(block: string, name: string): string {
  const re = new RegExp(`^\\s*-?\\s*${name}:\\s*(.+)$`, "im");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{1,}:?$/.test(c) || c === "");
}

// Task spec id, e.g. TASK-001. Legacy TODO-NNN ids are still accepted so
// pre-rename plans keep resolving until they are migrated.
const TASK_ID = /^((?:TASK|TODO)-\d+)/;

// Spec files live in a sibling `tasks/` folder; fall back to the legacy
// `todos/` folder for plans that have not been migrated yet.
function tasksDirFor(baseDir: string): string {
  const tasks = path.join(baseDir, "tasks");
  if (fs.existsSync(tasks)) return tasks;
  const legacy = path.join(baseDir, "todos");
  if (fs.existsSync(legacy)) return legacy;
  return tasks;
}

function resolveSpec(tasksDir: string, cell: string): string | null {
  if (!cell || cell === "-") return null;
  const link = cell.match(/\]\(([^)]+)\)/);
  const raw = (link ? link[1] : cell).trim();
  if (!raw || raw === "-") return null;
  return path.join(tasksDir, path.basename(raw));
}

function resolveOutcome(tasksDir: string, taskId: string, specPath: string | null): string | null {
  if (!taskId) return null;
  const dir = specPath ? path.dirname(specPath) : tasksDir;
  const exact = path.join(dir, `${taskId}-outcome.md`);
  if (fs.existsSync(exact)) return exact;

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }

  const match = entries
    .filter((entry) => entry.startsWith(`${taskId}-`) && entry.endsWith("-outcome.md"))
    .sort((a, b) => a.localeCompare(b))[0];
  return match ? path.join(dir, match) : null;
}

function taskIdFromSpec(specPath: string | null): string {
  if (!specPath) return "";
  const match = path.basename(specPath).match(TASK_ID);
  return match ? match[1] : "";
}

function parseTracker(content: string, tasksDir: string): Task[] {
  const lines = trackerBlock(content).split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => {
    if (!l.includes("|")) return false;
    const cells = splitRow(l).map((c) => c.toLowerCase());
    const hasItem = cells.includes("task") || cells.includes("todo");
    return cells.includes("order") && hasItem && cells.includes("status");
  });
  if (headerIdx === -1) return [];

  const tasks: Task[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      if (line.trim() === "") continue;
      break;
    }
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    // Columns are positional per the Watchtower tracker schema:
    // [0]=Order [1]=TASK [2]=Group [3]=Status [4]=Spec [5]=Deps [6]=Context(unused) [7]=Notes
    const [orderCell, taskCell, groupCell, statusCell, specCell, depsCell, , notesCell] = cells;
    const idMatch = (taskCell ?? "").match(/^((?:TASK|TODO)-\d+)\s*(.*)$/);
    const order = Number.parseInt(orderCell ?? "", 10);
    const specPath = resolveSpec(tasksDir, specCell ?? "");
    const fallbackId = Number.isNaN(order) ? `TASK-${String(tasks.length + 1).padStart(3, "0")}` : `TASK-${String(order).padStart(3, "0")}`;
    const id = idMatch ? idMatch[1] : taskIdFromSpec(specPath) || fallbackId;
    const title = idMatch ? idMatch[2].trim() : (taskCell ?? "").trim();

    tasks.push({
      order: Number.isNaN(order) ? tasks.length + 1 : order,
      id,
      title,
      group: (groupCell ?? "").trim(),
      status: toTaskStatus(statusCell ?? ""),
      specPath,
      outcomePath: resolveOutcome(tasksDir, id, specPath),
      deps: (depsCell ?? "").trim(),
      notes: (notesCell ?? "").trim(),
    });
  }
  return tasks;
}

export function parsePlanContent(content: string, manifestPath: string): Plan {
  const block = headerBlock(content);
  const tasksDir = tasksDirFor(path.dirname(manifestPath));
  const tasks = parseTracker(content, tasksDir);
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return {
    title: field(block, "Title"),
    slug: field(block, "Slug"),
    status: toPlanStatus(field(block, "Status")),
    updated: field(block, "Updated"),
    manifestPath,
    tasks,
    doneCount,
    totalCount: tasks.length,
  };
}

const SECTION_NAMES = new Set(["Brief", "Verify", "Outcome"]);

export function parseTaskFile(content: string): {
  sections: Section[];
  outcomeStatus: TaskStatus | null;
} {
  const lines = content.split(/\r?\n/);
  const sections: Section[] = [];
  let outcomeLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(\w+)\s*$/);
    if (m && SECTION_NAMES.has(m[1])) {
      sections.push({ name: m[1], line: i });
      if (m[1] === "Outcome") outcomeLine = i;
    }
  }

  let outcomeStatus: TaskStatus | null = null;
  if (outcomeLine !== -1) {
    for (let i = outcomeLine + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) break;
      const sm = lines[i].match(/^Status:\s*(.+)$/i);
      if (sm) {
        const parsed = toTaskStatus(sm[1]);
        outcomeStatus = parsed === "UNKNOWN" ? null : parsed;
        break;
      }
    }
  }

  return { sections, outcomeStatus };
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

export function readPlanAt(manifestPath: string): Plan | null {
  const content = readFileSafe(manifestPath);
  if (content === null) return null;
  return parsePlanContent(content, manifestPath);
}

export function readPlan(rootDir: string): Plan | null {
  return readPlanAt(path.join(rootDir, "watchtower", "NEXT.md"));
}

export function readTaskFile(specPath: string): {
  sections: Section[];
  outcomeStatus: TaskStatus | null;
} {
  const content = readFileSafe(specPath);
  if (content === null) return { sections: [], outcomeStatus: null };
  return parseTaskFile(content);
}

export function listArchive(rootDir: string): ArchivePlan[] {
  const archiveDir = path.join(rootDir, "watchtower", "archive");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(archiveDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const plans: ArchivePlan[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(archiveDir, entry.name, "NEXT.md");
    if (fs.existsSync(manifestPath)) {
      plans.push({ slug: entry.name, manifestPath });
    }
  }
  return plans.sort((a, b) => b.slug.localeCompare(a.slug));
}
