export type PlanStatus = "ACTIVE" | "DONE" | "ARCHIVED" | "UNKNOWN";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "UNKNOWN";

export interface Section {
  name: string;
  line: number;
}

export interface Task {
  order: number;
  id: string;
  title: string;
  group: string;
  status: TaskStatus;
  specPath: string | null;
  outcomePath: string | null;
  deps: string;
  notes: string;
}

export interface Plan {
  title: string;
  slug: string;
  status: PlanStatus;
  updated: string;
  manifestPath: string;
  tasks: Task[];
  doneCount: number;
  totalCount: number;
}

export interface ArchivePlan {
  slug: string;
  manifestPath: string;
}

export function toTaskStatus(raw: string): TaskStatus {
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
