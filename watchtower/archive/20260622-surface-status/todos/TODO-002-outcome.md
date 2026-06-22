# TODO-002 Outcome

## Outcome

Status: DONE

Changed:
- [src/tree.ts](../../src/tree.ts) todoFileNodes: import statusIcon from ./status.ts; TODO node iconPath = statusIcon(todo.status); description = `group - status` (status only when group empty); tooltip lists id, status, deps, notes.
- Outcome node icon stays `output`. NEXT.md / CONTEXT.md / TODOS folder nodes unchanged.

Contract:
- TODO node shows status-colored icon, gray `group - status` description, hover tooltip with id/status/deps/notes.

Verified:
- `npm run compile` -> no type error.
- `npm test` -> 17/17 pass, no regression.

Manual (F5 GUI, not run headless):
- F5 dev host on this repo: TODO nodes show status-colored icons and `group - status`.
- Hover a TODO node: tooltip shows id, status, deps, notes.
