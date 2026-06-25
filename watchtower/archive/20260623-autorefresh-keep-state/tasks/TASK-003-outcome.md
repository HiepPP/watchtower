# TASK-003 Outcome

## Outcome

Status: DONE

Changed:
- Removed `if (rootDir)` gate around the watcher in [src/extension.ts](src/extension.ts). Now derives `watchBase = rootDir ?? firstWorkspaceFolder` and creates the `watchtower/**` watcher when any base exists.
- Empty-root safety confirmed: `readPlan` -> `readFileSafe` returns null for missing file; `updateStatus` returns early on null plan; `data()` guards empty `rootDir`.

Contract:
- No behavior change when `rootDir` is already present.
- Single watcher kept.
- Watcher skipped only when no workspace folder base at all (no-folder window).

Verified:
- `npx tsc --noEmit` -> exit 0, no type errors.
- `bash scripts/build-and-install.sh` -> VSIX packaged and installed.
- Manual verify (needs reload): fresh workspace, open dashboard, create watchtower/NEXT.md -> dashboard shows plan without manual refresh.
