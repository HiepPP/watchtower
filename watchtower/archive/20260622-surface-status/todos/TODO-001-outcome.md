# TODO-001 Outcome

## Outcome

Status: DONE

Changed:
- Add [src/status.ts](../../src/status.ts): STATUS_ICON map, statusIcon(status), summarize(plan), detectNewlyBlocked(prev, todos).
- Add [test/status.test.ts](../../test/status.test.ts): 9 node:test cases.
- Add [test/vscode-loader.mjs](../../test/vscode-loader.mjs) + [test/register-vscode.mjs](../../test/register-vscode.mjs): redirect "vscode" import to data-URL stub (ThemeIcon, ThemeColor) so node tests can load status.ts.
- Edit [package.json](../../package.json) test script: add `--import ./test/register-vscode.mjs`.

Contract:
- statusIcon returns vscode.ThemeIcon with id per STATUS_ICON; color via ThemeColor when set, else undefined (TODO has no color).
- summarize returns { done, total, remaining, inProgressId, blockedIds }; inProgressId = lowest-order IN_PROGRESS id or null.
- detectNewlyBlocked returns ids where prev has id, prev status != BLOCKED, current = BLOCKED; empty when prev empty.

Verified:
- `npm run compile` -> tsc --noEmit + esbuild ok, no type error.
- `npm test` -> 17/17 pass.
- detectNewlyBlocked empty-prev case asserts `[]` -> ok 13.
- statusIcon id per status -> ok 16 (check, sync~spin, error, circle-outline, question).
