# TASK-003 Outcome

## Outcome

Status: DONE

Changed:
- Command buttons now render `draggable="true"`.
- Command dragstart handler now writes command text to `text/plain`, `text`, and `Text`.
- Command dragend handler now sends fallback insert message to extension.
- Extension now inserts dragged command into active editor or terminal, or copies text when no target exists.
- Drag cursor style now shows grab/grabbing for command buttons.

Contract:
- Click copy path still posts same `data-text` to extension.
- Keyboard activation still routes through existing click behavior.
- Drag insert uses command text without trailing newline, so terminal drop does not auto-run command.

Verified:
- `npm test` -> pass, 39 tests pass with draggable command markup and drag handler fallback checks.
- `npm run compile` -> pass, `tsc --noEmit` and bundle pass.
- `bash scripts/build-and-install.sh` -> pass, `watchtower-0.1.0.vsix` built and installed.
