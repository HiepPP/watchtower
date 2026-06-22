import * as vscode from "vscode";
import { type Plan, type Todo, type TodoStatus } from "./model.ts";

// Single source of truth for status -> icon/color, so tree and extension stay in sync.
// Values per the decided map in watchtower/CONTEXT.md.
export const STATUS_ICON: Record<TodoStatus, { icon: string; color?: string }> = {
  DONE: { icon: "check", color: "testing.iconPassed" },
  IN_PROGRESS: { icon: "sync~spin", color: "charts.blue" },
  BLOCKED: { icon: "error", color: "testing.iconFailed" },
  TODO: { icon: "circle-outline" },
  UNKNOWN: { icon: "question", color: "disabledForeground" },
};

export function statusIcon(status: TodoStatus): vscode.ThemeIcon {
  const { icon, color } = STATUS_ICON[status];
  return new vscode.ThemeIcon(icon, color ? new vscode.ThemeColor(color) : undefined);
}

export interface PlanSummary {
  done: number;
  total: number;
  remaining: number;
  inProgressId: string | null;
  blockedIds: string[];
}

export function summarize(plan: Plan): PlanSummary {
  const done = plan.doneCount;
  const total = plan.totalCount;
  const inProgress = plan.todos
    .filter((t) => t.status === "IN_PROGRESS")
    .sort((a, b) => a.order - b.order);
  return {
    done,
    total,
    remaining: total - done,
    inProgressId: inProgress.length > 0 ? inProgress[0].id : null,
    blockedIds: plan.todos.filter((t) => t.status === "BLOCKED").map((t) => t.id),
  };
}

// Returns ids that moved from a known non-BLOCKED status to BLOCKED.
// Empty when prev has no record of the id (first load seeds, no signal).
export function detectNewlyBlocked(prev: Map<string, TodoStatus>, todos: Todo[]): string[] {
  const ids: string[] = [];
  for (const todo of todos) {
    if (prev.has(todo.id) && prev.get(todo.id) !== "BLOCKED" && todo.status === "BLOCKED") {
      ids.push(todo.id);
    }
  }
  return ids;
}
