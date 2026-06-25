import * as path from "node:path";
import * as fs from "node:fs";
import {
  type Plan,
  type Todo,
  type ArchivePlan,
  type Section,
  type TodoStatus,
  toPlanStatus,
  toTodoStatus,
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

function resolveSpec(todosDir: string, cell: string): string | null {
  if (!cell || cell === "-") return null;
  const link = cell.match(/\]\(([^)]+)\)/);
  const raw = (link ? link[1] : cell).trim();
  if (!raw || raw === "-") return null;
  return path.join(todosDir, path.basename(raw));
}

function resolveOutcome(todosDir: string, todoId: string, specPath: string | null): string | null {
  if (!todoId) return null;
  const dir = specPath ? path.dirname(specPath) : todosDir;
  const exact = path.join(dir, `${todoId}-outcome.md`);
  if (fs.existsSync(exact)) return exact;

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }

  const match = entries
    .filter((entry) => entry.startsWith(`${todoId}-`) && entry.endsWith("-outcome.md"))
    .sort((a, b) => a.localeCompare(b))[0];
  return match ? path.join(dir, match) : null;
}

function todoIdFromSpec(specPath: string | null): string {
  if (!specPath) return "";
  const match = path.basename(specPath).match(/^(TODO-\d+)/);
  return match ? match[1] : "";
}

function parseTracker(content: string, todosDir: string): Todo[] {
  const lines = trackerBlock(content).split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => {
    if (!l.includes("|")) return false;
    const cells = splitRow(l).map((c) => c.toLowerCase());
    return cells.includes("order") && cells.includes("todo") && cells.includes("status");
  });
  if (headerIdx === -1) return [];

  const todos: Todo[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      if (line.trim() === "") continue;
      break;
    }
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    // Columns are positional per the Watchtower tracker schema:
    // [0]=Order [1]=TODO [2]=Group [3]=Status [4]=Spec [5]=Deps [6]=Context(unused) [7]=Notes
    const [orderCell, todoCell, groupCell, statusCell, specCell, depsCell, , notesCell] = cells;
    const idMatch = (todoCell ?? "").match(/^(TODO-\d+)\s*(.*)$/);
    const order = Number.parseInt(orderCell ?? "", 10);
    const specPath = resolveSpec(todosDir, specCell ?? "");
    const fallbackId = Number.isNaN(order) ? `TODO-${String(todos.length + 1).padStart(3, "0")}` : `TODO-${String(order).padStart(3, "0")}`;
    const id = idMatch ? idMatch[1] : todoIdFromSpec(specPath) || fallbackId;
    const title = idMatch ? idMatch[2].trim() : (todoCell ?? "").trim();

    todos.push({
      order: Number.isNaN(order) ? todos.length + 1 : order,
      id,
      title,
      group: (groupCell ?? "").trim(),
      status: toTodoStatus(statusCell ?? ""),
      specPath,
      outcomePath: resolveOutcome(todosDir, id, specPath),
      deps: (depsCell ?? "").trim(),
      notes: (notesCell ?? "").trim(),
    });
  }
  return todos;
}

export function parsePlanContent(content: string, manifestPath: string): Plan {
  const block = headerBlock(content);
  const todosDir = path.join(path.dirname(manifestPath), "todos");
  const todos = parseTracker(content, todosDir);
  const doneCount = todos.filter((t) => t.status === "DONE").length;

  return {
    title: field(block, "Title"),
    slug: field(block, "Slug"),
    status: toPlanStatus(field(block, "Status")),
    updated: field(block, "Updated"),
    manifestPath,
    todos,
    doneCount,
    totalCount: todos.length,
  };
}

const SECTION_NAMES = new Set(["Brief", "Verify", "Outcome"]);

export function parseTodoFile(content: string): {
  sections: Section[];
  outcomeStatus: TodoStatus | null;
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

  let outcomeStatus: TodoStatus | null = null;
  if (outcomeLine !== -1) {
    for (let i = outcomeLine + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) break;
      const sm = lines[i].match(/^Status:\s*(.+)$/i);
      if (sm) {
        const parsed = toTodoStatus(sm[1]);
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

export function readTodoFile(specPath: string): {
  sections: Section[];
  outcomeStatus: TodoStatus | null;
} {
  const content = readFileSafe(specPath);
  if (content === null) return { sections: [], outcomeStatus: null };
  return parseTodoFile(content);
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
