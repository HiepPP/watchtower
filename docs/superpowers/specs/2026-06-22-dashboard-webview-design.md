Watchtower Dashboard Webview - Design Spec
Created: 2026-06-22
Status: Approved, pending implementation plan

## Overview

Replace the Watchtower sidebar TreeView with a Webview View that renders a visual dashboard of the active plan. The dashboard shows progress, status-grouped TODOs, and the archive. It stays read-only: actions are limited to opening files and copying /watchtower commands. Nothing writes to disk.

## Context

The current extension shows watchtower/NEXT.md, watchtower/CONTEXT.md, and TODOS as a plain tree. It works but is hard to scan. The user wants the sidebar to be more useful and more visual. This spec adds a dashboard webview, chosen over three alternatives: an enhanced tree (option A), a wide tab-editor dashboard, and a fully interactive command center (option C).

Decisions from brainstorming:

| Decision | Choice |
|---|---|
| Placement | Sidebar webview, replaces the existing tree in the watchtower view container |
| Interactivity | Hybrid: read-only display plus light actions (open file, copy command). No status editing, no command execution, no file writes |
| Layout | Progress-first, TODOs grouped by status |

## Goals

- Visual progress at a glance: ring, bar, counts.
- TODO list grouped by status, scannable in a narrow sidebar.
- One-click open of spec files, NEXT.md, and archived plans.
- Copy-ready /watchtower commands the user can paste into their agent.
- Adapt to the active VS Code theme (dark, light, high-contrast).

## Non-Goals

- Editing TODO status from the UI.
- Running /watchtower commands directly from the dashboard.
- Writing to any plan file.
- A wide tab-editor dashboard.
- Timeline or activity history views.

## Architecture

The dashboard is a Webview View registered in the existing watchtower view container. It reuses the current parser and model. The status bar item and BLOCKED detection stay unchanged.

| File | Responsibility |
|---|---|
| src/extension.ts | Register WebviewViewProvider instead of TreeDataProvider. Keep watcher, status bar, commands |
| src/dashboardProvider.ts (new) | WebviewViewProvider. Owns the webview, rebuilds HTML on plan change, handles postMessage |
| src/dashboardHtml.ts (new) | Pure function renderDashboardHtml(plan, rootDir) returning an HTML string. Tested without VS Code |
| src/parser.ts | Unchanged. readPlan returns everything needed |
| src/model.ts | Unchanged |
| src/status.ts | Unchanged. summarize and detectNewlyBlocked still drive the status bar and BLOCKED warnings |
| src/tree.ts | Removed. The webview fully replaces the TreeView |
| media/dashboard.css (new) | Webview styles using VS Code theme CSS variables |
| media/dashboard.js (new) | Webview logic: postMessage on clicks, collapse sections, toast |

Data flow:

```
VS Code activates (workspaceContains:watchtower/NEXT.md)
  -> activate() -> findRootDir()
  -> register WatchtowerDashboardProvider for view id watchtower.tree
  -> resolveWebviewView() sets HTML via renderDashboardHtml(readPlan(rootDir))
  -> file watcher on watchtower/** -> provider.refresh() -> re-read + rebuild HTML
  -> webview clicks -> postMessage -> extension opens files / writes clipboard
```

The view id stays watchtower.tree so package.json views config is unchanged. Only the provider type changes from TreeDataProvider to WebviewViewProvider.

## Dashboard Layout

Top to bottom in a narrow sidebar column (~250-350px):

1. Header row: WATCHTOWER label plus a refresh icon button.
2. Plan card: title, slug, status badge, Updated date.
3. Progress block: conic-gradient ring with percent in the center, an "N of M todos" label, and a full-width progress bar.
4. Stats row: three chips - DONE count, ACTIVE count, BLOCKED count.
5. TODO sections in fixed order: ACTIVE, BLOCKED, TODO, DONE. Each header shows its count and is collapsible. DONE is collapsed by default. Each row has a status dot, the TODO id, and the title. Clicking a row opens the spec file in markdown preview.
6. Archive section, collapsed by default: lists archived plan slugs. Click opens that archived NEXT.md preview.
7. Action bar: Open NEXT, Copy /next, Copy /verify.

Ring math: percent equals doneCount divided by totalCount. When totalCount is 0 the ring renders empty (0 percent) and the label reads "No TODOs yet".

## Interactivity (Hybrid)

All actions are read-only or clipboard-only. Nothing writes to disk.

| Action | Trigger | Effect |
|---|---|---|
| Open spec | click TODO row | markdown.showPreview on specPath |
| Open NEXT | click plan title or Open NEXT button | markdown.showPreview on NEXT.md |
| Open archived plan | click archive row | markdown.showPreview on archived NEXT.md |
| Copy /next | Copy /next button | clipboard set to "/watchtower next"; toast "Copied" |
| Copy /verify | Copy /verify button | clipboard set to "/watchtower verify"; toast "Copied" |
| Refresh | refresh button | re-read plan, re-render |
| Collapse section | click section header | toggle local UI state, no re-render |

## Message Protocol

Webview to extension via postMessage. The extension validates every message before acting.

```
// webview -> extension
{ type: "open", fsPath: string }
{ type: "openNext" }
{ type: "openArchive", slug: string }
{ type: "copy", text: string }
{ type: "refresh" }

// extension -> webview
{ type: "toast", text: string }
{ type: "update", html: string }
```

Paths are resolved by the extension. The webview only sends identifiers it received from the rendered HTML, which the extension generated from readPlan. No raw user-supplied path is trusted.

Webview security:

- Content-Security-Policy: default-src 'none'; script-src 'nonce-<nonce>'; style-src 'nonce-<nonce>'; img-src 'none'.
- Scripts loaded with a per-webview nonce.
- Local CSS/JS via vscode-resource / asWebviewURI.
- No remote resources.

## Visual Styling

Use VS Code theme CSS variables so the dashboard adapts automatically. The only fixed colors are the status palette.

Semantic status colors, matching the current statusIcon:

| Status | Color |
|---|---|
| DONE | green |
| IN_PROGRESS | yellow |
| BLOCKED | red |
| TODO | muted |

Theme variables used:

- --vscode-editor-background, --vscode-sideBar-background (page background)
- --vscode-foreground (text), --vscode-descriptionForeground (meta text)
- --vscode-button-background, --vscode-button-foreground (chips, buttons)
- --vscode-list-hoverBackground (row hover)
- --vscode-icon-foreground

## States

| State | Trigger | Display |
|---|---|---|
| Empty | no watchtower/ dir or no NEXT.md | "No active plan in watchtower/" plus hint to run /watchtower new |
| No todos | plan with 0 todos | ring at 0 percent, "No TODOs yet", no sections |
| Parse error | readPlan throws or NEXT.md unreadable | "Could not read plan" plus an Open NEXT.md button |
| Normal | valid plan | full dashboard |

## Testing

Add tests under test/. Pure functions are tested directly; VS Code webview internals are not.

- renderDashboardHtml(plan, rootDir): given a sample Plan, the HTML contains the plan title, the done and total counts, one row per TODO, sections in ACTIVE/BLOCKED/TODO/DONE order, and the archive list.
- renderDashboardHtml with an empty plan: contains "No TODOs yet" and no TODO rows.
- renderDashboardHtml with a zero-total plan: ring percent is 0.
- Error state: when readPlan returns null, the HTML contains the empty-state message.
- Existing parser tests stay green.

Message handling in dashboardProvider is kept thin. Logic lives in renderDashboardHtml so it is testable without VS Code.

## Open Questions

| Question | Recommendation |
|---|---|
| Keep src/tree.ts as a fallback, or delete it? | Delete. The webview fully replaces it; dead code invites confusion |
| Incremental update vs full HTML rebuild on refresh | Full rebuild for v1. The plan is small and rebuild keeps state simple |
| Which copy buttons to ship | Ship /next and /verify first. Add /implement and /archive later |

## Out of Scope (Future)

- Interactive status editing and command execution (the command center direction, option C).
- A wide tab-editor dashboard.
- Timeline and activity history.
- Per-TODO progress or sub-task rendering.
