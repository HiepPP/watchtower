# Plan Context

## Shared Context

- Watcher already exists at [src/extension.ts](src/extension.ts) lines 101-113; glob `watchtower/**` calls `provider.refresh()` plus `updateStatus()`.
- `refresh()` at [src/dashboardProvider.ts](src/dashboardProvider.ts) line 21-23 rewrites `webview.html` wholesale; wipes scroll and JS-side state.
- Dashboard is a sidebar webview view `watchtower.tree`, not a panel.

## Decisions

- Keep single `watchtower/**` watcher; do not add second watcher.
- Coalesce events with a small debounce window, not a throttle.

## Open Decisions

- Debounce delay value: 200ms default; confirm during implement.

## References

- [src/extension.ts](src/extension.ts)
- [src/dashboardProvider.ts](src/dashboardProvider.ts)
- [src/dashboardHtml.ts](src/dashboardHtml.ts)
- [media/dashboard.js](media/dashboard.js)
