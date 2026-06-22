import * as vscode from "vscode";
import {
  type ArchivePlan,
  type Plan,
  type PlanStatus,
  type Section,
  type Todo,
  type TodoStatus,
} from "./model.ts";
import { listArchive, readPlan, readPlanAt, readTodoFile } from "./parser.ts";

type NodeKind = "empty" | "plan" | "todo" | "spec" | "section" | "archiveRoot" | "archivePlan";

interface NodeData {
  plan?: Plan;
  todo?: Todo;
  archive?: ArchivePlan;
  sections?: Section[];
}

class NextNode extends vscode.TreeItem {
  constructor(
    public readonly kind: NodeKind,
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    public readonly data: NodeData = {},
  ) {
    super(label, collapsible);
  }
}

function todoIcon(status: TodoStatus): vscode.ThemeIcon {
  switch (status) {
    case "DONE":
      return new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
    case "IN_PROGRESS":
      return new vscode.ThemeIcon("sync", new vscode.ThemeColor("charts.blue"));
    case "BLOCKED":
      return new vscode.ThemeIcon("error", new vscode.ThemeColor("testing.iconFailed"));
    case "TODO":
      return new vscode.ThemeIcon("circle-large-outline", new vscode.ThemeColor("descriptionForeground"));
    default:
      return new vscode.ThemeIcon("question");
  }
}

function planIcon(status: PlanStatus): vscode.ThemeIcon {
  switch (status) {
    case "ACTIVE":
      return new vscode.ThemeIcon("play-circle");
    case "DONE":
      return new vscode.ThemeIcon("check-all");
    case "ARCHIVED":
      return new vscode.ThemeIcon("archive");
    default:
      return new vscode.ThemeIcon("list-tree");
  }
}

function openCommand(fsPath: string, line: number): vscode.Command {
  return {
    command: "nextExplorer.open",
    title: "Open",
    arguments: [fsPath, line],
  };
}

export class NextTreeProvider implements vscode.TreeDataProvider<NextNode> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly rootDir: string | undefined) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  getTreeItem(element: NextNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: NextNode): NextNode[] {
    if (!element) return this.rootNodes();
    switch (element.kind) {
      case "plan": {
        const plan = element.data.plan;
        return plan ? this.todoNodes(plan) : [];
      }
      case "todo": {
        const todo = element.data.todo;
        return todo ? this.todoChildren(todo, element.data.sections ?? []) : [];
      }
      case "archiveRoot":
        return this.archiveNodes();
      case "archivePlan": {
        const archive = element.data.archive;
        if (!archive) return [];
        const plan = readPlanAt(archive.nextMdPath);
        return plan ? this.todoNodes(plan) : [];
      }
      default:
        return [];
    }
  }

  private rootNodes(): NextNode[] {
    const nodes: NextNode[] = [];
    const plan = this.rootDir ? readPlan(this.rootDir) : null;

    if (plan) {
      const node = new NextNode(
        "plan",
        plan.title || "NEXT",
        vscode.TreeItemCollapsibleState.Expanded,
        { plan },
      );
      node.description = `${plan.status} - ${plan.doneCount}/${plan.totalCount} done`;
      node.iconPath = planIcon(plan.status);
      node.command = openCommand(plan.nextMdPath, 0);
      node.tooltip = `${plan.title}\nSlug: ${plan.slug}\nUpdated: ${plan.updated}`;
      nodes.push(node);
    } else {
      nodes.push(
        new NextNode("empty", "No active plan in next/", vscode.TreeItemCollapsibleState.None),
      );
    }

    const archives = this.rootDir ? listArchive(this.rootDir) : [];
    if (archives.length > 0) {
      const archiveRoot = new NextNode(
        "archiveRoot",
        `Archive (${archives.length})`,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      archiveRoot.iconPath = new vscode.ThemeIcon("archive");
      nodes.push(archiveRoot);
    }

    return nodes;
  }

  private todoNodes(plan: Plan): NextNode[] {
    return plan.todos.map((todo) => {
      const info = todo.specPath
        ? readTodoFile(todo.specPath)
        : { sections: [], outcomeStatus: null };
      const status = info.outcomeStatus ?? todo.status;

      const hasChildren = Boolean(todo.specPath) || info.sections.length > 0;
      const node = new NextNode(
        "todo",
        `${todo.id} ${todo.title}`.trim(),
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        { todo, sections: info.sections },
      );
      node.iconPath = todoIcon(status);
      if (todo.group && todo.group !== "standalone") node.description = todo.group;
      node.tooltip = [
        `Status: ${status}`,
        `Group: ${todo.group || "-"}`,
        `Deps: ${todo.deps || "-"}`,
        todo.notes ? `Notes: ${todo.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (todo.specPath) node.command = openCommand(todo.specPath, 0);
      return node;
    });
  }

  private todoChildren(todo: Todo, sections: Section[]): NextNode[] {
    const out: NextNode[] = [];
    if (!todo.specPath) return out;

    const spec = new NextNode("spec", "spec", vscode.TreeItemCollapsibleState.None);
    spec.resourceUri = vscode.Uri.file(todo.specPath);
    spec.iconPath = new vscode.ThemeIcon("file");
    spec.command = openCommand(todo.specPath, 0);
    out.push(spec);

    for (const section of sections) {
      const node = new NextNode("section", section.name, vscode.TreeItemCollapsibleState.None);
      node.iconPath = new vscode.ThemeIcon("symbol-string");
      node.command = openCommand(todo.specPath, section.line);
      out.push(node);
    }
    return out;
  }

  private archiveNodes(): NextNode[] {
    const archives = this.rootDir ? listArchive(this.rootDir) : [];
    return archives.map((archive) => {
      const node = new NextNode(
        "archivePlan",
        archive.slug,
        vscode.TreeItemCollapsibleState.Collapsed,
        { archive },
      );
      node.iconPath = new vscode.ThemeIcon("history");
      node.command = openCommand(archive.nextMdPath, 0);
      return node;
    });
  }
}
