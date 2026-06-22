# TODO-004 Outcome

## Outcome

Status: DONE

Changed:
- [src/extension.ts](../../src/extension.ts): module-level `prevStatus = new Map<string, TodoStatus>()`.
- Inside updateStatus(): call detectNewlyBlocked(prevStatus, plan.todos); for each id show warning toast `Watchtower: <id> is BLOCKED` with "Show" action that opens the todo specPath via openFileAtLine; then rebuild prevStatus from plan.todos.
- No plan: prevStatus cleared (reseeds without toast on return).

Contract:
- First activation never toasts (prev empty seeds snapshot). Non-BLOCKED -> BLOCKED fires exactly one toast. Re-save unchanged does not re-toast. "Show" opens that TODO spec. No setting; always on.

Verified:
- `npm run compile` -> no type error.
- `npm test` -> 17/17 pass; detectNewlyBlocked unit cases cover empty-prev, transition, absent-id.

Manual (F5 GUI, not run headless):
- F5 on workspace with a TODO already BLOCKED: no toast on activate.
- Change a Tracker Status to BLOCKED and save: one warning toast; "Show" opens that spec.
- Save again unchanged: no second toast.
