# NEXT

## Current Active Plan

- Title: Surface Status In Sidebar
- Slug: 20260622-surface-status
- Status: ARCHIVED
- Updated: 2026-06-22

## Tracker

One row per TODO. Group ties items that ship as one transaction.

| Order | TASK | Group | Status | Spec | Deps | Context | Notes |
|-------|------|-------|--------|------|------|---------|-------|
| 1 | TASK-001 Status mapping module | standalone | DONE | [watchtower/tasks/TASK-001-status-mapping-module.md](watchtower/tasks/TASK-001-status-mapping-module.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Pure src/status.ts. Foundation for rest. compile+test pass. |
| 2 | TASK-002 Tree status icons | standalone | DONE | [watchtower/tasks/TASK-002-tree-status-icons.md](watchtower/tasks/TASK-002-tree-status-icons.md) | TASK-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Icon+color+description per TODO node. compile pass; F5 GUI manual. |
| 3 | TASK-003 Progress surfaces | ext | DONE | [watchtower/tasks/TASK-003-progress-surfaces.md](watchtower/tasks/TASK-003-progress-surfaces.md) | TASK-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | createTreeView, title count, badge, status bar. compile pass; F5 GUI manual. |
| 4 | TASK-004 Blocked notifications | ext | DONE | [watchtower/tasks/TASK-004-blocked-notifications.md](watchtower/tasks/TASK-004-blocked-notifications.md) | TASK-003 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Snapshot diff toast. Same file as TASK-003. compile pass; F5 GUI manual. |

TODO Status labels: TODO, IN PROGRESS, BLOCKED, DONE.
Plan-level Status header: ACTIVE while any row open, DONE when all rows DONE, ARCHIVED after archive.

## Plan Verify

- `npm run compile` -> tsc passes, esbuild bundles, no type error.
- `npm test` -> all tests pass, including new status tests.
- F5 dev host on a workspace with `watchtower/NEXT.md`: TODO nodes show status icons; Plan title shows done/total; activity-bar badge shows remaining; status bar shows progress; flipping a TODO to BLOCKED fires one toast.

## Handoff

- All 4 TODOs shipped. compile + 17 tests pass.
- Next action: run F5 dev host to close manual GUI checks (Plan Verify item 3): tree status icons, title done/total, activity-bar badge, status bar click-focus, BLOCKED toast on save.
- Then commit/package when ready. Archive plan after.

## Archive

- Archived: 2026-06-22 -> watchtower/archive/20260622-surface-status/
