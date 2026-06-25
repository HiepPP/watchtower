import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("dashboard drag handler exports command text and sends insert fallback", () => {
  const listeners: Record<string, (event: any) => void> = {};
  const messages: unknown[] = [];
  const data: Record<string, string> = {};
  let effectAllowed = "";

  const context = {
    acquireVsCodeApi: () => ({
      getState: () => ({ collapsed: {} }),
      setState: () => {},
      postMessage: (msg: unknown) => messages.push(msg),
    }),
    document: {
      getElementById: () => ({ hidden: true, textContent: "" }),
      addEventListener: (type: string, fn: (event: any) => void) => {
        listeners[type] = fn;
      },
      querySelectorAll: () => [],
    },
    window: {
      clearTimeout: () => {},
      setTimeout: () => 0,
      scrollTo: () => {},
      addEventListener: () => {},
    },
  };

  vm.createContext(context);
  vm.runInContext(readFileSync("media/dashboard.js", "utf8"), context);

  listeners.dragstart({
    target: {
      closest: () => ({
        dataset: {
          text: "$watchtower research\n",
          dragText: "$watchtower research",
        },
      }),
    },
    dataTransfer: {
      setData: (type: string, text: string) => {
        data[type] = text;
      },
      set effectAllowed(value: string) {
        effectAllowed = value;
      },
    },
  });
  listeners.dragend({});

  assert.equal(data["text/plain"], "$watchtower research");
  assert.equal(data.text, "$watchtower research");
  assert.equal(data.Text, "$watchtower research");
  assert.equal(effectAllowed, "copy");
  assert.deepEqual(JSON.parse(JSON.stringify(messages)), [
    { type: "insert", text: "$watchtower research" },
  ]);
});
