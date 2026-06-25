# TASK-003 Keep watcher when no root yet

Group: standalone (independent; closes multi-root or no-plan workspace gap)

## Brief

Goal: Create the `watchtower/**` file watcher even when `findRootDir()` returns undefined at activation, so the dashboard still auto-refreshes once a plan appears, instead of being gated behind `if (rootDir)`.

Change (before -> after):

- Before: [src/extension.ts](src/extension.ts) line 101 gates whole watcher block on `if (rootDir)`. No root means no watcher ever, so dashboard never auto-refreshes.
- After: watcher created from workspace root always; refresh handler tolerates empty `rootDir` until a plan exists.

How:

- Move watcher creation out of the `if (rootDir)` gate.
- Build glob from workspace folder when available, else a sensible default; confirm by reading [src/extension.ts](src/extension.ts) `findRootDir` usage first.
- `onPlanChange` already calls `updateStatus` which returns early when no plan; safe under empty root. Verify `readPlan(rootDir)` path stays guarded (empty string -> null).

Files:

- [src/extension.ts](src/extension.ts) (de-gate watcher; guard glob source)

Expected result:

- Workspace with no watchtower dir yet: creating watchtower/NEXT.md triggers a refresh.
- Multi-root workspace: watcher tracks the workspace root, dashboard updates on new plan file.

Prompt:

```text
Remove the if (rootDir) gate around the FileSystemWatcher at src/extension.ts lines 101-113 so the watcher is created at activation regardless of findRootDir result. Move the RelativePattern to use workspace root or a default, reading findRootDir and createFileSystemWatcher usage first. Ensure onPlanChange and updateStatus handle empty root safely (readPlan returns null). Keep single watcher. No behavior change when rootDir is already present.
```

## Verify

- Fresh workspace empty of watchtower/, open dashboard, then create watchtower/NEXT.md -> dashboard shows plan without manual refresh.
- Existing known-root workspace still auto-refreshes on save (no regression).
- `npx tsc --noEmit` if present -> no type errors.
