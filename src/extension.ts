import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { WatchtowerTreeProvider } from "./tree.ts";
import { type TodoStatus } from "./model.ts";
import { readPlan } from "./parser.ts";
import { summarize, detectNewlyBlocked } from "./status.ts";

const PLAN_DIR = "watchtower";
const PLAN_FILE = "NEXT.md";

// Snapshot of last-seen status per TODO id. Module-level so it survives across
// updateStatus calls. Empty on first load: detectNewlyBlocked stays quiet, then seeds.
const prevStatus = new Map<string, TodoStatus>();

function findRootDir(): string | undefined {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const paths = folders.map((f) => f.uri.fsPath);
  const withPlan = paths.find((p) => fs.existsSync(path.join(p, PLAN_DIR, PLAN_FILE)));
  if (withPlan) return withPlan;
  const withWatchtower = paths.find((p) => fs.existsSync(path.join(p, PLAN_DIR)));
  return withWatchtower ?? paths[0];
}

async function openFileAtLine(fsPath: string, line: number): Promise<void> {
  const uri = vscode.Uri.file(fsPath);
  try {
    if (path.extname(fsPath).toLowerCase() === ".md") {
      await vscode.commands.executeCommand("markdown.showPreview", uri);
      return;
    }
    await openTextAtLine(uri, line);
  } catch {
    try {
      await openTextAtLine(uri, line);
    } catch {
      void vscode.window.showWarningMessage(`Watchtower: cannot open ${fsPath}`);
    }
  }
}

async function openTextAtLine(uri: vscode.Uri, line: number): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);
  const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
  const pos = new vscode.Position(safeLine, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtTop);
}

export function activate(context: vscode.ExtensionContext): void {
  const rootDir = findRootDir();
  const provider = new WatchtowerTreeProvider(rootDir);

  const treeView = vscode.window.createTreeView("watchtower.tree", {
    treeDataProvider: provider,
  });

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBar.command = "workbench.view.extension.watchtower";

  const updateStatus = (): void => {
    const plan = rootDir ? readPlan(rootDir) : null;
    if (!plan) {
      treeView.description = undefined;
      treeView.badge = undefined;
      statusBar.hide();
      prevStatus.clear();
      return;
    }

    const { done, total, remaining, inProgressId } = summarize(plan);
    treeView.description = `${done}/${total}`;
    treeView.badge =
      remaining > 0 ? { value: remaining, tooltip: `${remaining} remaining` } : undefined;
    statusBar.text =
      `$(telescope) Watchtower ${done}/${total}` + (inProgressId ? ` - ${inProgressId}` : "");
    statusBar.tooltip = `${done} of ${total} done`;
    statusBar.show();

    for (const id of detectNewlyBlocked(prevStatus, plan.todos)) {
      const specPath = plan.todos.find((t) => t.id === id)?.specPath ?? null;
      void vscode.window
        .showWarningMessage(`Watchtower: ${id} is BLOCKED`, "Show")
        .then((choice) => {
          if (choice === "Show" && specPath) void openFileAtLine(specPath, 0);
        });
    }

    prevStatus.clear();
    for (const t of plan.todos) prevStatus.set(t.id, t.status);
  };

  context.subscriptions.push(
    provider,
    treeView,
    statusBar,
    vscode.commands.registerCommand("watchtower.refresh", () => {
      provider.refresh();
      updateStatus();
    }),
    vscode.commands.registerCommand("watchtower.open", (fsPath: string, line: number) =>
      openFileAtLine(fsPath, line ?? 0),
    ),
    vscode.commands.registerCommand("watchtower.openNext", () => {
      if (!rootDir) return;
      void openFileAtLine(path.join(rootDir, PLAN_DIR, PLAN_FILE), 0);
    }),
  );

  if (rootDir) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(rootDir, `${PLAN_DIR}/**`),
    );
    const onPlanChange = (): void => {
      provider.refresh();
      updateStatus();
    };
    watcher.onDidChange(onPlanChange);
    watcher.onDidCreate(onPlanChange);
    watcher.onDidDelete(onPlanChange);
    context.subscriptions.push(watcher);
  }

  updateStatus();
}

export function deactivate(): void {}
