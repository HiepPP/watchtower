# Plan Context

## Shared Context

- Extension view is webview dashboard registered as `watchtower.tree`.
- TODO rows render in [src/dashboardHtml.ts](src/dashboardHtml.ts).
- Row click behavior lives in [media/dashboard.js](media/dashboard.js).
- Row layout styles live in [media/dashboard.css](media/dashboard.css).
- Copy message path already exists in [src/dashboardProvider.ts](src/dashboardProvider.ts).
- Extension code change must run `bash scripts/build-and-install.sh` after compile/test.

## Decisions

- Keep scope to extension UI copy action only.
- Copy Codex command text as `$watchtower implement TODO-NNN\n`.
- If row menu also exposes Claude action, copy `/watchtower implement TODO-NNN\n`.

## Open Decisions

- None.

## References

- [src/dashboardHtml.ts](src/dashboardHtml.ts)
- [media/dashboard.js](media/dashboard.js)
- [media/dashboard.css](media/dashboard.css)
- [test/dashboardHtml.test.ts](test/dashboardHtml.test.ts)
- `npm test`
- `npm run compile`
- `bash scripts/build-and-install.sh`
