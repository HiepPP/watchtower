# Plan Context

## Shared Context

- Dashboard webview renders command UI from [src/dashboardHtml.ts](src/dashboardHtml.ts).
- Tracker parsing and TODO id/title split live in [src/parser.ts](src/parser.ts).
- Click and keyboard copy actions run in [media/dashboard.js](media/dashboard.js).
- Command layout styles live in [media/dashboard.css](media/dashboard.css).
- Parser tests live in [test/parser.test.ts](test/parser.test.ts).
- Dashboard HTML tests live in [test/dashboardHtml.test.ts](test/dashboardHtml.test.ts).
- Extension code or media edits require `bash scripts/build-and-install.sh`.

## Decisions

- Keep both command syntaxes: `$watchtower` for Codex, `/watchtower` for Claude.
- Add `research` to copied commands for both agents.
- Drag uses text payload. Terminal/editor should receive same command text as copy.
- Row id display should prefer canonical `TASK-NNN`, never free-form title text.

## Open Decisions

- None.

## References

- [src/dashboardHtml.ts](src/dashboardHtml.ts)
- [src/parser.ts](src/parser.ts)
- [media/dashboard.js](media/dashboard.js)
- [media/dashboard.css](media/dashboard.css)
- [test/parser.test.ts](test/parser.test.ts)
- [test/dashboardHtml.test.ts](test/dashboardHtml.test.ts)
- `npm test`
- `npm run compile`
- `bash scripts/build-and-install.sh`
