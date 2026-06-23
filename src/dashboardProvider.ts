import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { renderDashboardHtml, type DashboardData } from "./dashboardHtml.ts";
import { listArchive, readPlan } from "./parser.ts";

interface DashboardMessage {
  type: "open" | "openNext" | "openArchive" | "copy" | "refresh" | "archive";
  fsPath?: string;
  text?: string;
}

const execFileAsync = promisify(execFile);

export class WatchtowerDashboardProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly rootDir: string,
    private readonly extensionUri: vscode.Uri,
  ) {}

  refresh(): void {
    if (this.view) this.view.webview.html = this.document();
  }

  // Coalesce rapid watchtower/ file events into one refresh. Watcher fires per
  // save; bursts (multi-file save, formatter rewrite) would re-render per event
  // and flicker. Manual refresh command stays immediate via refresh().
  refreshDebounced(onDone?: () => void, delayMs = 200): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      this.refresh();
      onDone?.();
    }, delayMs);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };
    view.webview.html = this.document();
    view.webview.onDidReceiveMessage((msg: unknown) => {
      void this.onMessage(msg);
    });
    view.onDidDispose(() => {
      this.view = undefined;
    });
  }

  private data(): DashboardData {
    const plan = this.rootDir ? readPlan(this.rootDir) : null;
    const archive = this.rootDir ? listArchive(this.rootDir) : [];
    const nextAbs = this.rootDir ? path.join(this.rootDir, "watchtower", "NEXT.md") : "";
    const contextAbs = this.rootDir ? path.join(this.rootDir, "watchtower", "CONTEXT.md") : "";
    const nextPath = nextAbs && fs.existsSync(nextAbs) ? nextAbs : "";
    const contextPath = contextAbs && fs.existsSync(contextAbs) ? contextAbs : "";
    return { plan, archive, nextPath, contextPath };
  }

  private document(): string {
    const webview = this.view!.webview;
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "dashboard.css"),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "dashboard.js"),
    );
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
      `img-src 'none'`,
    ].join("; ");

    return [
      `<!doctype html>`,
      `<html lang="en">`,
      `<head>`,
      `<meta charset="UTF-8">`,
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
      `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      `<link rel="stylesheet" href="${cssUri.toString()}">`,
      `</head>`,
      `<body>`,
      renderDashboardHtml(this.data()),
      `<script nonce="${nonce}" src="${jsUri.toString()}"></script>`,
      `</body>`,
      `</html>`,
    ].join("\n");
  }

  private async onMessage(msg: unknown): Promise<void> {
    if (!isDashboardMessage(msg)) return;
    switch (msg.type) {
      case "open":
      case "openNext":
      case "openArchive":
        if (typeof msg.fsPath === "string") await this.openFile(msg.fsPath);
        break;
      case "copy":
        if (typeof msg.text === "string") {
          await vscode.env.clipboard.writeText(msg.text);
          this.toast("Copied");
        }
        break;
      case "refresh":
        this.refresh();
        break;
      case "archive":
        await this.archivePlan();
        break;
    }
  }

  private async archivePlan(): Promise<void> {
    if (!this.rootDir) {
      this.toast("No workspace");
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      "Archive the active Watchtower plan?",
      { modal: true },
      "Archive",
    );
    if (choice !== "Archive") return;

    const scriptPath = path.join(this.extensionUri.fsPath, "scripts", "archive-watchtower-plan.mjs");
    try {
      const { stdout } = await execFileAsync(process.execPath, [scriptPath, this.rootDir], {
        cwd: this.rootDir,
      });
      this.refresh();
      this.toast(stdout.trim() || "Archived");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Archive failed";
      void vscode.window.showWarningMessage(`Watchtower: ${message}`);
    }
  }

  private async openFile(fsPath: string): Promise<void> {
    const uri = vscode.Uri.file(fsPath);
    try {
      if (fsPath.toLowerCase().endsWith(".md")) {
        await vscode.commands.executeCommand("markdown.showPreview", uri);
        return;
      }
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch {
      void vscode.window.showWarningMessage(
        `Watchtower: cannot open ${path.basename(fsPath)}`,
      );
    }
  }

  private toast(text: string): void {
    this.view?.webview.postMessage({ type: "toast", text });
  }
}

function isDashboardMessage(msg: unknown): msg is DashboardMessage {
  if (!msg || typeof msg !== "object") return false;
  const type = (msg as { type?: unknown }).type;
  return (
    typeof type === "string" &&
    ["open", "openNext", "openArchive", "copy", "refresh", "archive"].includes(type)
  );
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
