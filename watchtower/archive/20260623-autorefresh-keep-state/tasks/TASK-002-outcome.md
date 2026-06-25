# TASK-002 Outcome

## Outcome

Status: DONE

Changed:
- Added `rememberScroll` in [media/dashboard.js](media/dashboard.js) that persists `window.scrollY` into `vscode.state` (debounced 80ms) on scroll.
- On script load, restore `state.scrollTop` via `window.scrollTo` and re-attach the scroll listener. Script reloads on each HTML rewrite so restore runs after every refresh.
- Collapse state already persisted via `vscode.getState()`/`applySectionState`; unchanged and still survives re-renders.

Contract:
- No new extension-to-webview message needed; restore runs on client load.
- Keeps TASK-001 debounce path as the refresh trigger.

Verified:
- `npx tsc --noEmit` -> exit 0 (script is `@ts-nocheck`).
- `bash scripts/build-and-install.sh` -> VSIX packaged and installed.
- Manual verify (needs reload): scroll to bottom, save NEXT.md -> scroll stays; collapsed section stays collapsed across refresh.
