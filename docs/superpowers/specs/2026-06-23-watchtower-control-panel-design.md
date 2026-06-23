## Overview

Turn the Watchtower dashboard from a read-only display into a two-way control panel. The extension performs deterministic plan edits itself (status, notes, archive, add TODO). Generative work (new specs, implement, verify) routes to the `/watchtower` skill. An opt-in setting preserves the existing read-only promise for users who do not opt in.

## Context

The dashboard currently only renders `watchtower/` plan files. Clicks open files or copy commands; no click mutates a plan. The `/watchtower` skill is the sole writer and holds a careful state machine: slug rules, outcome sidecars, status recomputation, archive flow.

The parser already reads the Tracker table positionally (`Order|TODO|Group|Status|Spec|Deps|Context|Notes`), resolves each outcome sidecar path, and `status.ts` already tracks newly-blocked rows across refreshes. The provider already runs a clean `postMessage` switch with kinds `open`, `openNext`, `openArchive`, `copy`, `refresh`. The missing piece is the inverse of the parser: a writer.

## Goals

- Let the user change TODO status, add a note, archive the plan, and add a quick TODO from the dashboard, without leaving VS Code or typing slash commands.
- Keep the `/watchtower` skill as the single source of truth for plan semantics and the only writer of Brief/Verify prose and code.
- Preserve the read-only experience for users who do not opt in.
- Share the parser schema so the writer and parser cannot drift silently.

## Non-Goals

- The extension will not write or edit TODO Brief or Verify prose.
- The extension will not write code, run builds, or run verification checks.
- The extension will not edit `CONTEXT.md`.
- No multi-plan or multi-repo support. One active plan per workspace, as today.
- No rewrite of the renderer or the refresh/watch path.

## Approach

New `src/writer.ts` is the inverse of `src/parser.ts`. It edits files with surgical line replacements, not parse-modify-serialize.

- Find a Tracker row by TODO id using the same positional split the parser uses, replace one cell (`Status` or `Notes`), rejoin the row.
- Find the outcome sidecar `Status:` line under `## Outcome`, replace the value.
- Find the plan-level `Status:` line in the `## Current Active Plan` block, recompute it: `ACTIVE` when any Tracker row is not `DONE`, else `DONE`.

Rejected alternative: parse-modify-serialize the whole manifest. It would drop manual content the model does not capture (prose around tables, extra columns, comments, hand-edited formatting). Surgical edits leave everything else byte-for-byte.

## Architecture

```text
Webview click
  |
  v
postMessage { type, todoId?, payload? }
  |
  v
dashboardProvider.onMessage()
  |  validates message + opt-in flag
  v
writer.<op>(rootDir, ...)   -->  surgical edit on NEXT.md + outcome sidecar
  |
  v
parser.readPlan()           -->  re-read after write
  |
  v
provider.refresh()          -->  re-render dashboard
```

The file watcher path is unchanged. External edits still trigger refresh.

## Components

| File | Change |
|---|---|
| `src/writer.ts` | New. Pure functions operating on file paths, round-tripping through `parser.ts` and `model.ts` |
| `src/dashboardProvider.ts` | Extend the `DashboardMessage` union and the `onMessage` switch with the new kinds |
| `src/dashboardHtml.ts` | Render the new controls into the dashboard HTML |
| `media/dashboard.js` | Wire control clicks to `postMessage` |
| `media/dashboard.css` | Style the controls to match the existing dashboard |
| `src/extension.ts` | Register the `watchtower.editable` setting in `contributes.configuration` |
| `package.json` | Declare the `watchtower.editable` configuration entry |
| `test/writer.test.ts` | New. Round-trip tests against the existing `test/fixtures` |
| `test/dashboardProvider.test.ts` | Extend to cover the new message kinds |

## writer.ts surface

Four pure functions, each taking `rootDir` and returning a result or throwing on invalid state.

- `setTodoStatus(rootDir, todoId, status)` - Updates the Tracker `Status` cell for the row whose TODO cell starts with `todoId`. Updates the matching outcome sidecar `Status:` line. Recomputes and writes the plan-level `Status:` header. Refuses `DONE` when no verification evidence exists in the sidecar; the user must use `verify` (via the launcher) for that promotion. This matches the skill rule that `DONE` requires evidence.
- `setNote(rootDir, todoId, note)` - Writes one short line to the Tracker `Notes` cell for the row, and appends the same line to the outcome sidecar under `## Outcome`.
- `archivePlan(rootDir)` - Reads `Slug:` from the header block. Stops and throws if the slug is missing or empty; never derives it. Builds `watchtower/archive/<slug>/` (adds `-HHMM` if it already exists). Sets the plan-level `Status:` to `ARCHIVED`, sets `Updated:` to the current date, appends `- Archived: <date> -> watchtower/archive/<slug>/` under `## Archive`. Moves `NEXT.md`, `CONTEXT.md` if present, and `todos/` if present into the archive directory. Mirrors the skill archive flow exactly.
- `addTodo(rootDir, title, group)` - Picks the next id as the max existing `TODO-NNN` plus one. Writes a spec skeleton file `watchtower/todos/TODO-NNN-kebab-title.md` with `# TODO-NNN <title>`, a `Group: <tag>` line, and empty `## Brief` and `## Verify` sections. Writes the outcome sidecar `watchtower/todos/TODO-NNN-outcome.md` with `Status: TODO`. Appends one Tracker row with `Order` as max plus one, the new id, the group, `Status: TODO`, a markdown-link Spec cell, `-` for Deps and Context, and an empty Notes cell.

Each function re-reads through `readPlan` after writing to confirm the edit landed and the plan still parses. If the post-write parse fails, the function restores the pre-edit file content from an in-memory backup and throws.

## Controls

| Control | Trigger | Confirmed | Effect |
|---|---|---|---|
| Status toggle | Click the status chip on a row | No | Cycles `TODO -> IN PROGRESS -> DONE`; shift-click sets `BLOCKED`. `DONE` refused without sidecar evidence |
| Inline note | Pencil button on a row | No | Opens a one-line input. Writes to Tracker Notes and the outcome sidecar |
| Archive plan | Button in the plan-card header | Yes | Runs `archivePlan`. Stops on missing slug |
| Add quick TODO | `+` button near the Tracker | Yes | Opens a form for title and group. Runs `addTodo` |

Status cycle detail: a click targets the next status in `TODO -> IN PROGRESS -> DONE`. When the target is `DONE` and the sidecar has no verification evidence, the toggle no-ops and posts a toast telling the user to run `/watchtower verify`. The row stays at `IN PROGRESS`.

Disabled states: when there is no active plan, every control is hidden. When `watchtower.editable` is off, every control is hidden and the dashboard renders exactly as today.

## Launchers (route to the skill)

Four buttons emit slash commands to the AI: `/watchtower next`, `/watchtower new`, `/watchtower implement`, `/watchtower verify`.

Transport is layered and degrades gracefully:

1. If an integrated terminal exists and is visible, send the command text to it via `vscode.window.activeTerminal.sendText(text, false)`.
2. Otherwise, copy the command to the clipboard and post a toast: `Copied <command> - paste in chat`.

The four direct edits never depend on this transport. Only the launchers do, and they remain useful even when the transport falls back to clipboard. The extension does not assume any specific AI client is present.

## Message Protocol

New `DashboardMessage` kinds, added to the existing union:

```text
{ type: "setStatus",  todoId: string, status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" }
{ type: "setNote",    todoId: string, note: string }
{ type: "archive" }
{ type: "addTodo",    title: string, group: string }
{ type: "run",        command: "/watchtower next" | "/watchtower new" | "/watchtower implement" | "/watchtower verify" }
```

`onMessage` validates each kind before dispatching. Edit kinds check `watchtower.editable` first and no-op with a toast when it is off. The `run` kind is allowed regardless of the setting, since it only emits a command.

## Opt-in and Safety

- New setting `watchtower.editable`, boolean, default `false`.
- On first dashboard open, when the setting is unset and a plan exists, show a one-time prompt: enable the control panel, or keep it read-only. The choice writes the setting.
- Confirmation dialogs on archive and add-TODO. No confirmation on status toggle or note (trivially reversible).
- Archive refuses a missing or empty slug and surfaces the error. No guessing.
- Every writer function backs up the file content it is about to change and restores it if the post-write re-parse fails. No half-written state.

## Drift Defense

`writer.ts` and `parser.ts` share the same positional Tracker schema (`Order|TODO|Group|Status|Spec|Deps|Context|Notes`) and the same outcome sidecar format. The writer re-parses after every write. `test/writer.test.ts` reuses the existing `test/fixtures` so a format change breaks parser tests and writer tests together.

## Testing

- `test/writer.test.ts`: for each of the four functions, assert the surgical edit lands on the right cell, the outcome sidecar updates, the plan-level status recomputes, and a second `readPlan` round-trips the change. Add a fixture with a multi-row Tracker and a populated outcome sidecar.
- `test/writer.test.ts`: archive stops on a missing slug; archive moves files and sets `ARCHIVED`.
- `test/writer.test.ts`: `setTodoStatus` refuses `DONE` without sidecar evidence.
- `test/dashboardProvider.test.ts`: the new message kinds dispatch to the writer when editable, and no-op with a toast when not.
- Existing parser, status, and dashboardHtml tests stay green.

## Open Questions

- Should the one-time enable prompt appear in the webview (as a banner) or as a VS Code notification? Leaning webview banner, to stay inside the dashboard surface.
- Should `addTodo` auto-open the new spec file for the user to fill Brief/Verify, or leave it closed? Leaning auto-open, to match the skill's `new` behavior of opening changed files.

## Out of Scope (Future)

- Dependency graph view of the Tracker.
- Cold-return rehydration and stale-TODO rot detection.
- Multi-plan and multi-repo dashboards.
- Editing Brief/Verify prose or `CONTEXT.md` from the dashboard.
