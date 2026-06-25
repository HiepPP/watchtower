# Learn 20260625-dashboard-command-groups-and-drag

## Summary

Discrepancy: 1 found. Dashboard command plan shipped, with drag fallback added after first manual check showed drop text missing.

## Per TODO

- TODO-001: plan add `research` to active command copy UI -> shipped active command list with `research` for Codex and Claude. Mistake: match. Fix: none.
- TODO-002: plan group no-plan commands by Codex and Claude with `new` and `research` -> shipped grouped empty state. Mistake: match. Fix: none.
- TODO-003: plan set drag payload from command text -> shipped drag payload plus extension fallback insert on `dragend`. Mistake: first pass trusted dataTransfer only, but VS Code drop did not paste text. Fix: send `insert` message on drag end and insert into active editor or terminal.
- TODO-004: plan derive canonical `TODO-NNN` from Spec filename or Order -> shipped parser fallback and row title preservation. Mistake: match. Fix: none.

## Plan-Level

- Cross-TODO issue: same command surface touched in active and empty states, while VS Code drag behavior needed extension-side fallback. Plan expected browser drag payload to be enough.

## Lessons

- Test webview drag with real VS Code target, not only markup.
- Keep copy text and drag text separate when terminal should not auto-run command.
- Default Watchtower implement must read all non-DONE TODOs, not stop after first row.
