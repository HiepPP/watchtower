## NEXT Explorer

VS Code extension that shows a workspace's active next-todo plan as a status
tree in its own sidebar. Read-only. It never edits plan files.

## What it shows

- The active plan from `next/NEXT.md`: title, plan status, and a done/total count.
- One node per Tracker TODO with a status icon (TODO, IN PROGRESS, BLOCKED, DONE).
- Expand a TODO to open its spec file or jump to its Brief, Verify, or Outcome section.
- A collapsed Archive section listing past plans under `next/archive/`.

It reads the `next/` directory only. It ignores any root `NEXT.md`.

## Develop

    cd tools/next-explorer
    npm install
    npm run compile
    npm test

Press F5 from this folder to launch the Extension Development Host.

## Build and install

    cd tools/next-explorer
    npm run package
    code --install-extension next-explorer-0.1.0.vsix

Once installed, the NEXT icon appears in the Activity Bar of any workspace that
contains a `next/NEXT.md` file.
