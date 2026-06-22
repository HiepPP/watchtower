export type PlanStatus = "ACTIVE" | "DONE" | "ARCHIVED" | "UNKNOWN";
export type TodoStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "UNKNOWN";

export interface Section {
  name: string;
  line: number;
}

export interface Todo {
  order: number;
  id: string;
  title: string;
  group: string;
  status: TodoStatus;
  specPath: string | null;
  deps: string;
  notes: string;
}

export interface Plan {
  title: string;
  slug: string;
  status: PlanStatus;
  updated: string;
  nextMdPath: string;
  todos: Todo[];
  doneCount: number;
  totalCount: number;
}

export interface ArchivePlan {
  slug: string;
  nextMdPath: string;
}

export function toTodoStatus(raw: string): TodoStatus {
  const v = raw.trim().toUpperCase();
  if (v === "DONE") return "DONE";
  if (v === "IN PROGRESS" || v === "IN_PROGRESS") return "IN_PROGRESS";
  if (v === "BLOCKED") return "BLOCKED";
  if (v === "TODO") return "TODO";
  return "UNKNOWN";
}

export function toPlanStatus(raw: string): PlanStatus {
  const v = raw.trim().toUpperCase();
  if (v === "ACTIVE") return "ACTIVE";
  if (v === "DONE") return "DONE";
  if (v === "ARCHIVED") return "ARCHIVED";
  return "UNKNOWN";
}
