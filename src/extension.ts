import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { NextTreeProvider } from "./tree.ts";

function findRootDir(): string | undefined {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const paths = folders.map((f) => f.uri.fsPath);
  const withPlan = paths.find((p) => fs.existsSync(path.join(p, "next", "NEXT.md")));
  if (withPlan) return withPlan;
  const withNext = paths.find((p) => fs.existsSync(path.join(p, "next")));
  return withNext ?? paths[0];
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
    void vscode.window.showWarningMessage(`NEXT Explorer: cannot open ${fsPath}`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const rootDir = findRootDir();
  const provider = new NextTreeProvider(rootDir);

  context.subscriptions.push(
    provider,
    vscode.window.registerTreeDataProvider("nextExplorer.tree", provider),
    vscode.commands.registerCommand("nextExplorer.refresh", () => provider.refresh()),
    vscode.commands.registerCommand("nextExplorer.open", (fsPath: string, line: number) =>
      openFileAtLine(fsPath, line ?? 0),
    ),
    vscode.commands.registerCommand("nextExplorer.openNext", () => {
      if (!rootDir) return;
      void openFileAtLine(path.join(rootDir, "next", "NEXT.md"), 0);
    }),
  );

  if (rootDir) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(rootDir, "next/**"),
    );
    watcher.onDidChange(() => provider.refresh());
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    context.subscriptions.push(watcher);
  }
}

export function deactivate(): void {}
