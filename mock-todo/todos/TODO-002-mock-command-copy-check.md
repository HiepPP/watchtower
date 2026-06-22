# TODO-002 Mock command copy check

Group: standalone

## Brief

Goal: Keep second mock TODO row for command area check. No code change.

Change: no code before -> second mock row helps scan dashboard density.

How:

- Keep Tracker row in [watchtower/NEXT.md](../NEXT.md).
- Keep this spec short.
- Use dashboard command buttons to copy one Watchtower command.

Files:

- [watchtower/NEXT.md](../NEXT.md) (Tracker owns row)
- [watchtower/todos/TODO-002-mock-command-copy-check.md](TODO-002-mock-command-copy-check.md) (mock brief)
- [watchtower/todos/TODO-002-outcome.md](TODO-002-outcome.md) (future outcome)

Expected result:

- Dashboard shows `TODO-002` row under Todo.
- Copy button writes selected Watchtower command to clipboard.

Prompt:

```text
Inspect TODO-002 mock row. Do not change code. Confirm dashboard can show this TODO and copy one Watchtower command.
```

## Verify

- Open Watchtower dashboard -> `TODO-002` row shows under Todo.
- Click one command button -> clipboard receives matching Watchtower command.
