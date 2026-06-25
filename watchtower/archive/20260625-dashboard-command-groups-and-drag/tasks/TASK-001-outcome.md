# TASK-001 Outcome

## Outcome

Status: DONE

Changed:
- Active command list now includes `research`.
- Codex command text is `$watchtower research\n`.
- Claude command text is `/watchtower research\n`.

Contract:
- Existing command copy text still keeps trailing newline.
- Active command bar keeps Codex and Claude groups.

Verified:
- `npm test -- --test-name-pattern "copy buttons carry Codex and Claude watchtower commands"` -> pass, 38 tests pass under filter run.
- `npm test` -> pass, 38 tests pass.
- `npm run compile` -> pass, `tsc --noEmit` and bundle pass.
- `bash scripts/build-and-install.sh` -> pass, `watchtower-0.1.0.vsix` built and installed.
- Manual VS Code check -> active dashboard shows `$watchtower research` and `/watchtower research` after reload.
