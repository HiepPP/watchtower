# NEXT

## Current Active Plan

- Title: Auto-refresh dashboard keeps state on file change
- Slug: 20260623-autorefresh-keep-state
- Status: ARCHIVED
- Updated: 2026-06-23

## Tracker

One row per TODO. Group ties together items that ship as one transaction.

| Order | TASK | Group | Status | Spec | Deps | Context | Notes |
|-------|------|-------|--------|------|------|---------|-------|
| 1 | TASK-001 debounce watcher fires | A | DONE | [watchtower/tasks/TASK-001-debounce-watcher.md](watchtower/tasks/TASK-001-debounce-watcher.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Rapid saves coalesce to one refresh. |
| 2 | TASK-002 preserve scroll on refresh | A | DONE | [watchtower/tasks/TASK-002-preserve-scroll.md](watchtower/tasks/TASK-002-preserve-scroll.md) | TASK-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Re-render keeps scroll + collapse. |
| 3 | TASK-003 keep watcher when no root | standalone | DONE | [watchtower/tasks/TASK-003-watcher-no-root.md](watchtower/tasks/TASK-003-watcher-no-root.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Multi-root gap; watcher binds on first resolve. |

TODO Status labels: TODO, IN PROGRESS, BLOCKED, DONE.
Plan-level Status header: ACTIVE while any row is open, DONE when all rows DONE, ARCHIVED after archive.

## Plan Verify

- Edit watchtower/NEXT.md while dashboard open -> single debounced refresh, scroll stays.
- Run several saves in 200ms -> exactly one refresh, no flicker.

## Handoff

- All TODOs done. Reload VS Code to apply built VSIX. Run Plan Verify steps in a live window: save NEXT.md -> single debounced refresh, scroll stays; bursts -> one refresh; fresh workspace auto-refreshes on new NEXT.md.

## Archive

- Archived: 2026-06-23 -> watchtower/archive/20260623-autorefresh-keep-state/
