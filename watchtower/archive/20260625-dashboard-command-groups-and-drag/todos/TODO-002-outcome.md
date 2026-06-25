# TODO-002 Outcome

## Outcome

Status: DONE

Changed:
- Empty state command UI now renders Codex group and Claude group.
- Each empty group now exposes `new` and `research`.
- Empty command group CSS keeps command rows compact in sidebar width.

Contract:
- Copy buttons still use same `data-action="copy"` path.
- Open NEXT button still hides when `nextPath` is empty.

Verified:
- `npm test -- --test-name-pattern "null plan shows empty state"` -> pass, 38 tests pass under filter run.
- `npm test` -> pass, 38 tests pass.
- `npm run compile` -> pass, `tsc --noEmit` and bundle pass.
- `bash scripts/build-and-install.sh` -> pass, `watchtower-0.1.0.vsix` built and installed.
- Manual VS Code check in `/tmp/watchtower-empty-verification` -> no-plan dashboard shows Codex and Claude groups with `new` and `research`.
