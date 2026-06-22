# Plan Context

## Shared Context

- Repo is VS Code extension. Main click path starts in [src/tree.ts](src/tree.ts) and calls command registered in [src/extension.ts](src/extension.ts).
- Current `openFileAtLine` uses `vscode.workspace.openTextDocument` plus `vscode.window.showTextDocument`, so click opens raw Markdown editor.
- User wants default click to show rendered Markdown preview, not raw Markdown source.

## Decisions

- Default tree click opens Markdown preview.
- Raw source editor may remain available only through explicit command or fallback, not default tree click.

## Open Decisions

- None.

## References

- [src/extension.ts](src/extension.ts)
- [src/tree.ts](src/tree.ts)
- [README.md](README.md)
- `npm run compile`
- `npm test`
