# TASK-001 Outcome

## Outcome

Status: DONE

Changed:
- [src/dashboardHtml.ts](../../src/dashboardHtml.ts) renders TODO row `...` menu with Codex and Claude implement copy actions.
- [media/dashboard.js](../../media/dashboard.js) stops menu clicks and key presses from opening TODO spec.
- [media/dashboard.js](../../media/dashboard.js) closes row menu after copy action.
- [media/dashboard.css](../../media/dashboard.css) styles row menu without moving row text.
- [test/dashboardHtml.test.ts](../../test/dashboardHtml.test.ts) covers row command output and escaped TODO ids.

Contract:
- TODO row click still opens spec when spec path exists.
- Global command buttons keep existing copy text.
- Copied row commands include TODO id and trailing newline.
- Row menu closes after copy command fires.

Verified:
- npm test -> 35 tests pass.
- npm run compile -> TypeScript check and esbuild pass.
- bash scripts/build-and-install.sh -> watchtower-0.1.0.vsix built and installed; VS Code reload needed.
- Follow-up npm test -> 35 tests pass.
- Follow-up npm run compile -> TypeScript check and esbuild pass.
- Follow-up bash scripts/build-and-install.sh -> watchtower-0.1.0.vsix rebuilt and installed; VS Code reload needed.
