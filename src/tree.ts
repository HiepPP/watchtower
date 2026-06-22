import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Plan, type Todo } from "./model.ts";
import { readPlan } from "./parser.ts";

type NodeKind = "empty" | "file" | "todosRoot" | "todo";

interface NodeData {
  fsPath?: string;
  plan?: Plan;
  todo?: Todo;
}

class WatchtowerNode extends vscode.TreeItem {
  constructor(
    public readonly kind: NodeKind,
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    public readonly data: NodeData = {},
  ) {
    super(label, collapsible);
  }
}

function openCommand(fsPath: string, line: number): vscode.Command {
  if (fsPath.toLowerCase().endsWith(".md")) {
    return {
      command: "markdown.showPreview",
      title: "Open Preview",
      arguments: [vscode.Uri.file(fsPath)],
    };
  }
  return {
    command: "watchtower.open",
    title: "Open",
    arguments: [fsPath, line],
  };
}

export class WatchtowerTreeProvider implements vscode.TreeDataProvider<WatchtowerNode> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly rootDir: string | undefined) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  getTreeItem(element: WatchtowerNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WatchtowerNode): WatchtowerNode[] {
    if (!element) return this.rootNodes();
    switch (element.kind) {
      case "todosRoot": {
        const plan = element.data.plan;
        return plan ? this.todoFileNodes(plan) : [];
      }
      default:
        return [];
    }
  }

  private rootNodes(): WatchtowerNode[] {
    const nodes: WatchtowerNode[] = [];

    if (!this.rootDir) {
      nodes.push(
        new WatchtowerNode("empty", "No active plan in watchtower/", vscode.TreeItemCollapsibleState.None),
      );
      return nodes;
    }

    const plan = readPlan(this.rootDir);
    const watchtowerDir = path.join(this.rootDir, "watchtower");
    const nextPath = path.join(watchtowerDir, "NEXT.md");
    const contextPath = path.join(watchtowerDir, "CONTEXT.md");

    if (fs.existsSync(nextPath)) {
      nodes.push(this.fileNode("NEXT.md", nextPath));
    }

    if (fs.existsSync(contextPath)) {
      nodes.push(this.fileNode("CONTEXT.md", contextPath));
    }

    if (plan && plan.todos.length > 0) {
      const todosNode = new WatchtowerNode(
        "todosRoot",
        "TODOS",
        vscode.TreeItemCollapsibleState.Expanded,
        { plan },
      );
      todosNode.iconPath = new vscode.ThemeIcon("folder");
      nodes.push(todosNode);
    }

    if (nodes.length === 0) {
      nodes.push(
        new WatchtowerNode("empty", "No active plan in watchtower/", vscode.TreeItemCollapsibleState.None),
      );
    }

    return nodes;
  }

  private fileNode(label: string, fsPath: string, data: NodeData = {}): WatchtowerNode {
    const node = new WatchtowerNode("file", label, vscode.TreeItemCollapsibleState.None, {
      ...data,
      fsPath,
    });
    node.resourceUri = vscode.Uri.file(fsPath);
    node.iconPath = new vscode.ThemeIcon("file");
    node.command = openCommand(fsPath, 0);
    return node;
  }

  private todoFileNodes(plan: Plan): WatchtowerNode[] {
    return plan.todos
      .filter((todo): todo is Todo & { specPath: string } => Boolean(todo.specPath))
      .sort((a, b) => a.order - b.order)
      .map((todo) => {
        const fileName = path.basename(todo.specPath);
        const node = new WatchtowerNode("todo", fileName, vscode.TreeItemCollapsibleState.None, {
          fsPath: todo.specPath,
          todo,
        });
        node.resourceUri = vscode.Uri.file(todo.specPath);
        node.iconPath = new vscode.ThemeIcon("file");
        node.command = openCommand(todo.specPath, 0);
        node.tooltip = fileName;
        return node;
      });
  }
}
