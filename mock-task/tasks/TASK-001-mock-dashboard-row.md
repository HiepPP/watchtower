# TASK-001 Mock dashboard row

Group: standalone

## Brief

Goal: Keep one mock TODO row for dashboard visual check. No code change.

Change: no code before -> mock row visible in Watchtower dashboard.

How:

- Keep Tracker row in [watchtower/NEXT.md](../NEXT.md).
- Keep this spec short.
- Use dashboard to confirm row render.

Files:

- [watchtower/NEXT.md](../NEXT.md) (Tracker owns row)
- [watchtower/tasks/TASK-001-mock-dashboard-row.md](TASK-001-mock-dashboard-row.md) (mock brief)
- [watchtower/tasks/TASK-001-outcome.md](TASK-001-outcome.md) (future outcome)

Expected result:

- Dashboard shows `TASK-001` row under Todo.
- Clicking row opens this spec preview.

Prompt:

```text
Inspect TASK-001 mock row. Do not change code. Confirm dashboard can show and open this TODO spec.
```

## Verify

- Open Watchtower dashboard -> `TASK-001` row shows under Todo.
- Click `TASK-001` row -> this spec opens in Markdown preview.
