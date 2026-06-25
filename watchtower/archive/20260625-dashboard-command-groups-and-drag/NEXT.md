# NEXT

## Current Active Plan

- Title: Dashboard Command And Row Fixes
- Slug: 20260625-dashboard-command-groups-and-drag
- Status: ARCHIVED
- Updated: 2026-06-25

## Tracker

| Order | TASK | Group | Status | Spec | Deps | Context | Notes |
|-------|------|-------|--------|------|------|---------|-------|
| 1 | TASK-001 Add research command | commands | DONE | [watchtower/tasks/TASK-001-add-research-command.md](watchtower/tasks/TASK-001-add-research-command.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Research command shipped. |
| 2 | TASK-002 Group empty commands by agent | commands | DONE | [watchtower/tasks/TASK-002-group-empty-commands-by-agent.md](watchtower/tasks/TASK-002-group-empty-commands-by-agent.md) | TASK-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Empty state groups shipped. |
| 3 | TASK-003 Drag commands as text | commands | DONE | [watchtower/tasks/TASK-003-drag-commands-as-text.md](watchtower/tasks/TASK-003-drag-commands-as-text.md) | TASK-002 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Drag text payload shipped. |
| 4 | TASK-004 Show TODO code in rows | commands | DONE | [watchtower/tasks/TASK-004-show-todo-code-in-rows.md](watchtower/tasks/TASK-004-show-todo-code-in-rows.md) | TASK-003 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Row id shows TODO code. |

## Plan Verify

- `npm test` -> all tests pass.
- `npm run compile` -> TypeScript and bundle pass.
- `bash scripts/build-and-install.sh` -> VSIX builds and installs into VS Code.
- Manual VS Code check -> no active plan empty state shows Codex and Claude command groups, includes `watchtower research`, and dragged command drops as text into terminal/editor.
- Manual VS Code check -> TODO list id column always shows `TASK-NNN`, even when Tracker TODO cell holds only title text.

## Handoff

- Next action: reload VS Code window if current window still shows old extension host. Then archive plan when ready.

## Archive

- Archived: 2026-06-25 -> [watchtower/archive/20260625-dashboard-command-groups-and-drag/](watchtower/archive/20260625-dashboard-command-groups-and-drag/)
