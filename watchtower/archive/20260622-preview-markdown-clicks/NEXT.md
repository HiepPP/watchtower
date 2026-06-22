# NEXT

## Current Active Plan

- Title: Preview Markdown Clicks And File Tree UI
- Slug: 20260622-preview-markdown-clicks
- Status: ARCHIVED
- Updated: 2026-06-22

## Tracker

| Order | TODO | Group | Status | Spec | Deps | Context | Notes |
|-------|------|-------|--------|------|------|---------|-------|
| 1 | TODO-001 Default clicks show Markdown preview | standalone | DONE | [watchtower/todos/TODO-001-default-clicks-show-markdown-preview.md](watchtower/todos/TODO-001-default-clicks-show-markdown-preview.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | User confirmed preview opens. |
| 2 | TODO-002 Show simple file tree UI | standalone | BLOCKED | [watchtower/todos/TODO-002-show-simple-file-tree-ui.md](watchtower/todos/TODO-002-show-simple-file-tree-ui.md) | TODO-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Full filename labels installed. Needs VS Code reload UI proof. |

## Plan Verify

- `npm run compile` -> TypeScript and bundle pass.
- `npm test` -> Parser tests pass.
- Manual VS Code Extension Development Host check -> Watchtower tree click opens rendered Markdown preview by default.
- Manual VS Code repo check -> Watchtower tree shows `NEXT.md`, `CONTEXT.md`, `TODOS`, and TODO files.

## Handoff

- Next action: Reload VS Code repo window, verify simple tree UI, then run `/watchtower verify`.

## Archive

- Archived: 2026-06-22 -> watchtower/archive/20260622-preview-markdown-clicks/
