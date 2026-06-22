import { test } from "node:test";
import assert from "node:assert/strict";
import { type Plan, type Todo, type TodoStatus } from "../src/model.ts";
import { STATUS_ICON, statusIcon, summarize, detectNewlyBlocked } from "../src/status.ts";

function makeTodo(id: string, order: number, status: TodoStatus): Todo {
  return {
    order,
    id,
    title: id,
    group: "standalone",
    status,
    specPath: null,
    outcomePath: null,
    deps: "",
    notes: "",
  };
}

function makePlan(todos: Todo[]): Plan {
  return {
    title: "T",
    slug: "s",
    status: "ACTIVE",
    updated: "2026-06-22",
    manifestPath: "/ws/watchtower/NEXT.md",
    todos,
    doneCount: todos.filter((t) => t.status === "DONE").length,
    totalCount: todos.length,
  };
}

test("summarize counts done/total/remaining and blockedIds", () => {
  const plan = makePlan([
    makeTodo("TODO-001", 1, "DONE"),
    makeTodo("TODO-002", 2, "DONE"),
    makeTodo("TODO-003", 3, "IN_PROGRESS"),
    makeTodo("TODO-004", 4, "TODO"),
    makeTodo("TODO-005", 5, "BLOCKED"),
  ]);
  const s = summarize(plan);
  assert.equal(s.done, 2);
  assert.equal(s.total, 5);
  assert.equal(s.remaining, 3);
  assert.equal(s.inProgressId, "TODO-003");
  assert.deepEqual(s.blockedIds, ["TODO-005"]);
});

test("summarize picks lowest-order IN_PROGRESS id", () => {
  const plan = makePlan([
    makeTodo("TODO-009", 9, "IN_PROGRESS"),
    makeTodo("TODO-002", 2, "IN_PROGRESS"),
  ]);
  assert.equal(summarize(plan).inProgressId, "TODO-002");
});

test("summarize inProgressId is null when none in progress", () => {
  const plan = makePlan([makeTodo("TODO-001", 1, "DONE")]);
  assert.equal(summarize(plan).inProgressId, null);
});

test("detectNewlyBlocked returns [] for empty prev", () => {
  const todos = [makeTodo("TODO-001", 1, "BLOCKED")];
  assert.deepEqual(detectNewlyBlocked(new Map(), todos), []);
});

test("detectNewlyBlocked returns id only on non-BLOCKED -> BLOCKED", () => {
  const prev = new Map<string, TodoStatus>([
    ["TODO-001", "IN_PROGRESS"],
    ["TODO-002", "BLOCKED"],
    ["TODO-003", "DONE"],
  ]);
  const todos = [
    makeTodo("TODO-001", 1, "BLOCKED"),
    makeTodo("TODO-002", 2, "BLOCKED"),
    makeTodo("TODO-003", 3, "DONE"),
  ];
  assert.deepEqual(detectNewlyBlocked(prev, todos), ["TODO-001"]);
});

test("detectNewlyBlocked ignores ids absent from prev", () => {
  const prev = new Map<string, TodoStatus>([["TODO-001", "TODO"]]);
  const todos = [makeTodo("TODO-002", 2, "BLOCKED")];
  assert.deepEqual(detectNewlyBlocked(prev, todos), []);
});

test("statusIcon returns expected icon id per status", () => {
  assert.equal(statusIcon("DONE").id, "check");
  assert.equal(statusIcon("IN_PROGRESS").id, "sync~spin");
  assert.equal(statusIcon("BLOCKED").id, "error");
  assert.equal(statusIcon("TODO").id, "circle-outline");
  assert.equal(statusIcon("UNKNOWN").id, "question");
});

test("STATUS_ICON colors match the decided map", () => {
  assert.equal(STATUS_ICON.DONE.color, "testing.iconPassed");
  assert.equal(STATUS_ICON.IN_PROGRESS.color, "charts.blue");
  assert.equal(STATUS_ICON.BLOCKED.color, "testing.iconFailed");
  assert.equal(STATUS_ICON.TODO.color, undefined);
  assert.equal(STATUS_ICON.UNKNOWN.color, "disabledForeground");
});
