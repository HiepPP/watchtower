# TODO-004 Outcome

## Outcome

Status: DONE

Changed:
- Parser now derives `TODO-NNN` from Spec basename when TODO cell holds title only.
- Parser now falls back to padded Order id when Spec lacks `TODO-NNN`.
- Row title keeps readable Tracker TODO cell text.

Contract:
- Rows still use `todo.id` for implement copy commands.
- Existing `TODO-NNN Title` Tracker cells still parse as before.

Verified:
- `npm test -- --test-name-pattern "parsePlanContent derives todo id from Spec when TODO cell is title only"` -> pass, 38 tests pass under filter run.
- `npm test` -> pass, 38 tests pass.
- `npm run compile` -> pass, `tsc --noEmit` and bundle pass.
- `bash scripts/build-and-install.sh` -> pass, `watchtower-0.1.0.vsix` built and installed.
- Manual VS Code check -> active dashboard row id column shows `TODO-001` through `TODO-004`; title column shows task text.
