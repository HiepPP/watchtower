import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { WatchtowerTreeProvider } from "./tree.ts";

const PLAN_DIR = "watchtower";
const PLAN_FILE = "NEXT.md";

function findRootDir(): string | undefined {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const paths = folders.map((f) => f.uri.fsPath);
  const withPlan = paths.find((p) => fs.existsSync(path.join(p, PLAN_DIR, PLAN_FILE)));
  if (withPlan) return withPlan;
  const withWatchtower = paths.find((p) => fs.existsSync(path.join(p, PLAN_DIR)));
  return withWatchtower ?? paths[0];
}

async function openFileAtLine(fsPath: string, line: number): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
    const editor = await vscode.window.showTextDocument(doc);
    const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
    const pos = new vscode.Position(safeLine, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtTop);
  } catch {
    void vscode.window.showWarningMessage(`Watchtower: cannot open ${fsPath}`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const rootDir = findRootDir();
  const provider = new WatchtowerTreeProvider(rootDir);

  context.subscriptions.push(
    provider,
    vscode.window.registerTreeDataProvider("watchtower.tree", provider),
    vscode.commands.registerCommand("watchtower.refresh", () => provider.refresh()),
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
    watcher.onDidChange(() => provider.refresh());
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    context.subscriptions.push(watcher);
  }
}

export function deactivate(): void {}
