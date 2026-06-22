# Plan Context

## Shared Context

- Extension is read-only. It never writes plan files. These TODOs only add display surfaces.
- Parser already extracts all needed data. See [src/parser.ts](src/parser.ts) and [src/model.ts](src/model.ts). No parser change needed.
- `Plan` has `doneCount`, `totalCount`, `todos`. Each `Todo` has `status`, `id`, `group`, `specPath`, `deps`, `notes`.
- `TodoStatus` = TODO | IN_PROGRESS | BLOCKED | DONE | UNKNOWN. See [src/model.ts](src/model.ts).
- Build: `npm run compile` (tsc --noEmit then esbuild). Test: `npm test` (node:test, --experimental-strip-types). Tests live under [test/](test).
- Imports use `.ts` extension (e.g. `from "./model.ts"`), per existing code.
- VS Code engine ^1.85.0. `TreeView.badge` and themed `ThemeIcon` color are available at this version.

## Decisions

- Status icon+color map: DONE check/testing.iconPassed, IN_PROGRESS sync~spin/charts.blue, BLOCKED error/testing.iconFailed, TODO circle-outline/default, UNKNOWN question/disabledForeground.
- View shows done/total as `treeView.description`. Activity-bar badge value = remaining (total minus done); 0 hides badge.
- Status bar item left-aligned: `$(telescope) Watchtower <done>/<total>`, append `- <inProgressId>` when one TODO is IN_PROGRESS. Click runs `workbench.view.extension.watchtower` (focus sidebar). Hidden when no plan.
- Notifications: BLOCKED only, on by default, no setting. Toast only when a TODO moves from a known non-BLOCKED status to BLOCKED. First load seeds snapshot, no toast.
- Outcome node icon stays `output`. Status lives on the TODO node only.

## Open Decisions

- None.

## References

- [src/extension.ts](src/extension.ts), [src/tree.ts](src/tree.ts), [src/parser.ts](src/parser.ts), [src/model.ts](src/model.ts)
- [test/parser.test.ts](test/parser.test.ts) for test style.
