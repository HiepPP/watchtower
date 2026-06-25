# TASK-003 Outcome

## Outcome

Status: DONE

Changed:
- [src/extension.ts](../../src/extension.ts): swap registerTreeDataProvider for vscode.window.createTreeView; push view to subscriptions.
- Add left StatusBarItem; command = `workbench.view.extension.watchtower`.
- Add updateStatus(): reads plan via readPlan(rootDir), then sets treeView.description = `done/total`, treeView.badge = remaining (undefined when 0), status bar text `$(telescope) Watchtower done/total` (append ` - inProgressId` when set), tooltip `done of total done`, show/hide by plan presence.
- Call updateStatus() in activate, in refresh command, and in each watcher handler (onPlanChange).

Contract:
- View title shows done/total; activity-bar badge = remaining (gone at 0); status bar shows progress + current IN_PROGRESS id; click focuses sidebar; all clear/hide when no plan.

Verified:
- `npm run compile` -> no type error.
- `npm test` -> 17/17 pass, no regression.

Manual (F5 GUI, not run headless):
- F5 dev host: Plan title shows done/total; badge shows remaining; status bar shows `Watchtower done/total`.
- Click status bar item: Watchtower sidebar gets focus.
- Edit a Tracker Status in NEXT.md and save: title, badge, status bar update.
