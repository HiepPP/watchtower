## NEXT Explorer

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/HiepPP/next-explorer)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](#license)

A read-only VS Code sidebar that shows your workspace's active next-todo plan as a live status tree.

NEXT Explorer reads the `next/` directory and never edits your plan files. It gives you a quick view of plan progress, TODO status, and past plans without opening Markdown by hand.

<!-- Demo: replace with a screenshot or GIF of the NEXT sidebar in action. -->

## Table of Contents

- [Features](#features)
- [Why NEXT Explorer](#why-next-explorer)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [Expected Plan Layout](#expected-plan-layout)
- [Commands](#commands)
- [Status Icons](#status-icons)
- [Architecture](#architecture)
- [Develop](#develop)
- [Build and Package](#build-and-package)
- [Contributing](#contributing)
- [License](#license)

## Features

- Shows the active plan from `next/NEXT.md`: title, plan status, and a done/total count.
- Lists one node per Tracker TODO with a status icon (TODO, IN PROGRESS, BLOCKED, DONE).
- Expands a TODO to open its spec file or jump to its Brief, Verify, or Outcome section.
- Prefers the spec file's Outcome `Status:` over the Tracker status when both exist.
- Shows a collapsed Archive section listing past plans under `next/archive/`.
- Refreshes on its own when any file under `next/` changes.
- Read-only by design. It never writes to your plan files.

## Why NEXT Explorer

The next-todo workflow keeps plans as plain Markdown in a `next/` directory. That is easy to edit but hard to scan at a glance.

| Without the extension | With NEXT Explorer |
|---|---|
| Open `NEXT.md` and read the table by hand | See the plan and its TODOs in the sidebar |
| Guess current progress | Read a done/total count up top |
| Hunt for a spec file path | Click a TODO to open its spec |
| Scroll to find a section | Jump straight to Brief, Verify, or Outcome |
| Lose track of finished plans | Browse them under the Archive node |

## Requirements

- Visual Studio Code 1.85.0 or newer.
- A workspace that contains a `next/NEXT.md` file. The extension only activates when this file is present.

## Install

Install from a packaged VSIX:

```bash
git clone https://github.com/HiepPP/next-explorer.git
cd next-explorer
npm install
npm run package
code --install-extension next-explorer-0.1.0.vsix
```

Once installed, the NEXT icon appears in the Activity Bar of any workspace that contains a `next/NEXT.md` file.

## Usage

1. Open a workspace that has a `next/NEXT.md` file.
2. Click the NEXT icon in the Activity Bar.
3. The Plan view shows the active plan, its TODOs, and an Archive section.

What each node does:

- Plan node: click to open `next/NEXT.md`. The description shows status and progress, like `ACTIVE - 2/4 done`.
- TODO node: click to open its spec file. The tooltip shows status, group, deps, and notes.
- spec child: opens the TODO's spec file.
- Brief / Verify / Outcome child: jumps to that section inside the spec file.
- Archive node: expand to browse past plans from `next/archive/`.

If a workspace has a `next/` folder but no `next/NEXT.md`, the view shows `No active plan in next/`.

## Expected Plan Layout

The extension reads a fixed layout inside the `next/` directory.

```text
next/
  NEXT.md                 # active plan: header block + Tracker table
  todos/
    TODO-001-...md        # spec files with Brief / Verify / Outcome
  archive/
    20260620-some-slug/
      NEXT.md             # an archived plan
```

`NEXT.md` needs a `## Current Active Plan` header block and a `## Tracker` table:

```markdown
## Current Active Plan

Title: Gacha Size Quiz
Slug: 20260620-gacha-size-quiz
Status: ACTIVE
Updated: 2026-06-21

## Tracker

| Order | TODO | Group | Status | Spec | Deps | Context | Notes |
|---|---|---|---|---|---|---|---|
| 1 | TODO-001 Build the shell | standalone | DONE | next/todos/TODO-001-build-the-shell.md | - | CONTEXT.md | Done. |
```

Notes on parsing:

- The Tracker header must contain the columns `Order`, `TODO`, and `Status`.
- The Spec cell may be a plain path or a Markdown link. Only the file name is used, resolved against `next/todos/`.
- A spec file may end with an `## Outcome` section that carries a `Status:` line. That status wins over the Tracker status.
- The extension ignores any `NEXT.md` at the repo root. It reads the `next/` directory only.

## Commands

| Command | Title | Where |
|---|---|---|
| `nextExplorer.refresh` | NEXT: Refresh Plan | Refresh icon in the view title bar |
| `nextExplorer.openNext` | NEXT: Open NEXT.md | Command Palette |

The view also refreshes on its own when files under `next/` change, so manual refresh is rarely needed.

## Status Icons

| Status | Icon | Meaning |
|---|---|---|
| TODO | outline circle | Not started |
| IN PROGRESS | sync (blue) | Being worked on |
| BLOCKED | error (red) | Stuck on a blocker |
| DONE | check (green) | Finished |
| Plan ACTIVE | play circle | Plan in progress |
| Plan DONE | check-all | Plan finished |
| Plan ARCHIVED | archive | Plan archived |

## Architecture

The extension activates on a workspace that contains `next/NEXT.md`, builds a tree provider, and re-reads the plan whenever `next/` changes.

```text
VS Code activates (workspaceContains:next/NEXT.md)
  |
  v
activate()  -->  findRootDir()  picks the workspace folder with next/NEXT.md
  |
  v
NextTreeProvider  -->  readPlan(next/NEXT.md)
  |                       |
  |                       v
  |                  parsePlanContent()  reads header + Tracker table
  |                       |
  |                       v
  |                  per TODO: readTodoFile(spec)  reads Brief/Verify/Outcome
  |
  v
Tree nodes:  Plan  ->  TODOs  ->  spec + sections,  plus  Archive
  ^
  |
File watcher on next/**  -->  provider.refresh()  on change/create/delete
```

| File | Responsibility |
|---|---|
| `src/extension.ts` | Activation, root folder resolution, commands, file watcher |
| `src/parser.ts` | Reads and parses `NEXT.md` and spec files, lists the archive |
| `src/model.ts` | Types and status mapping for plans and TODOs |
| `src/tree.ts` | Tree data provider, node building, icons, and tooltips |

## Develop

```bash
npm install
npm run compile
npm test
```

Press F5 from the project folder to launch the Extension Development Host. Open a workspace with a `next/NEXT.md` file to see the tree.

Use watch mode to rebuild on save:

```bash
npm run watch
```

## Build and Package

```bash
npm run package
```

This type-checks, bundles with esbuild, and produces `next-explorer-0.1.0.vsix`. Install it with:

```bash
code --install-extension next-explorer-0.1.0.vsix
```

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch.
2. Make your change and add or update tests under `test/`.
3. Run `npm run compile` and `npm test` to confirm everything passes.
4. Open a pull request describing the change.

## License

Released under the MIT License.

[Back to top](#next-explorer)
