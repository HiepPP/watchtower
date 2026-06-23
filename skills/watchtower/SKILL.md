---
name: watchtower
description: Use when creating, updating, archiving, reviewing, implementing, or asking what to do next on repo-local TODO plans in watchtower/NEXT.md. implement reads NEXT.md, then loads only current TODO specs and required shared context; outcome files are opt-in only. Also triggers on "what next?" during repo work.
argument-hint: "[new|progress|archive|verify|next|implement|implement team] [--repo path] [summary]"
disable-model-invocation: false
user-invocable: true
license: MIT
---

## Purpose

Maintain repo-local planning files. Keep `watchtower/NEXT.md` as active manifest, `watchtower/CONTEXT.md` as short shared context, TODO briefs under `watchtower/todos/`, and old plans under `watchtower/archive/`.

## When to Use

Use when the user invokes `/watchtower` or asks to write, revise, archive, review, verify, or implement a repo-local NEXT plan. Also use for natural-language "what next?" / "what's next?" / "next steps?" asks while in a repo: read `watchtower/NEXT.md`, gauge Tracker progress, and propose next action.

Only `implement` writes code. `new`, `progress`, `archive`, and `next` never write code. `verify` runs checks and records results in TODO outcome sidecar files.

Tip: say "fan out subagents" or "fan out a team" to run implement with a subagent team. Each agent digs deep on its work set so nothing gets missed; watchtower shuts every spawned agent down after (Team Cleanup).

## Arguments

Use `$ARGUMENTS` to classify request. Details links to mode flow; dash means table plus Workflow and Rules cover it.

| Argument | Purpose | Mutates | Details |
|----------|---------|---------|---------|
| `new` | Create fresh manifest plan or add TODO files to active plan | `NEXT.md` + `CONTEXT.md` + `todos/` | [Author Plan](#author-plan) |
| `progress` | Mark TODO status or add session notes | `NEXT.md` Tracker + TODO outcome sidecar | [Progress](#progress) |
| `archive` | Archive active manifest, context, TODO files, and any legacy verify file | moves active plan files to `watchtower/archive/` | [Archive](#archive) |
| `verify` | Run checks from TODO files, record each result, promote passing TODOs to `DONE` | TODO outcome sidecar + Tracker Status | [Run Verification](#run-verification) |
| `next` | Read active plan and propose next action from Tracker | nothing | [Propose Next](#propose-next) |
| `implement` | Load current TODO specs plus required context, then build sequentially in this session | code + plan files + TODO outcome sidecars | [Implement](#implement) |
| `implement team` | Same as `implement`, but build with a team of subagents, then auto shut down every spawned background agent. Triggers include `team` and `fan out subagents` | code + plan files | [Implement](#implement) |

`--repo path` is a modifier, not a mode: use given repository instead of current git root.

`implement team` is `implement` plus the `team` keyword. Match `team`, `with team`, `team of subagent(s)`, `subagent team`, `fan out`, `fan out subagents`, or `fan out a team` after or around `implement`. Bare `fan out subagents` / `fan out a team` with no other mode means `implement team`. Without any team keyword, default to sequential `implement`.

Arguments may chain modes in one call, for example `new and implement`, or `archive, and /commit`. Run them in order given. A `/command` token is an external skill, not a watchtower mode. Invoke it after watchtower modes finish.

## Workflow

1. Resolve repo root. Use `--repo path` when given; else current git root. Prove it with `git -C <path> rev-parse --show-toplevel`. Stop if target repo cannot be proven.
2. For `new`, `progress`, `archive`, and `verify`, read before writing: `.gitignore`, `watchtower/NEXT.md` if present, `watchtower/CONTEXT.md` if present, `watchtower/NEXT.VERIFY.md` if present, TODO filenames and outcome filenames under `watchtower/todos/`, and archive filenames under `watchtower/archive/`. For `implement`, use the minimal load set in Implement. For `next`, skip this broad read; Propose Next owns minimal load.
3. Do not add `/watchtower/` to `.gitignore`. If `watchtower/` is already ignored, keep current state. If tracked, keep tracked.
4. Detect plan shape before routing:
   - New format: `watchtower/NEXT.md` Tracker has `Spec`, `Deps`, and `Context` columns. TODO detail lives under `watchtower/todos/`.
   - Legacy format: `watchtower/NEXT.md` has inline `## TODO N` sections or `watchtower/NEXT.VERIFY.md` exists as active verify file.
   - Do not migrate legacy plans during `next`, `verify`, or `implement`.
5. Classify from `$ARGUMENTS` and route:
   - `new` -> Author Plan
   - `next` or natural-language "what next?" -> Propose Next
   - `verify` -> Run Verification
   - `implement` -> Implement (sequential, this session)
   - `implement team` or `fan out subagents` -> Implement (team of subagents, then Team Cleanup)
   - `archive` -> Archive
   - `progress` -> Progress
6. Make smallest matching edit. For any new or revised TODO, follow TODO File Format and skeleton in `references/todo-template.md`.
7. Validate plan-file edits with `git diff --check` and `git status --short -- next .gitignore`. `next` skips this step. `implement` runs its own verification.

## Working Principles

Honor these in `new` and `implement`.

- Think first. State assumptions. If plan is unclear, or simpler approach exists, stop and ask with `AskUserQuestion`. Do not guess.
- Keep it simple. Build minimum TODO needs. No speculative features, abstractions, or config TODO did not ask for.
- Stay surgical. Touch only what TODO needs. Match existing style. Do not refactor unrelated code. Remove only orphans from this change.
- Drive to verified goal. Each TODO has checkable `## Verify` section. Loop until it passes, then record real results in its `TODO-NNN-outcome.md` sidecar.

## Author Plan

Use for `new`. Create fresh plan when none exists, or add TODOs to active plan. When writing a TODO, explore installed skills that fit its work (see `references/skill-routing.md`) and name any that fits in Brief or Prompt.

1. Decide by file presence:
   - `watchtower/NEXT.md` absent -> CREATE.
   - `watchtower/NEXT.md` present with Status `ARCHIVED` or empty Tracker -> CREATE.
   - `watchtower/NEXT.md` present with every Tracker row `DONE` -> ask with `AskUserQuestion`: extend this plan (ADD), or archive it and start fresh (`archive` then CREATE). Do not guess.
   - `watchtower/NEXT.md` present with open TODOs -> ADD.
2. CREATE: write `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, one spec file per TODO under `watchtower/todos/`, and one matching `TODO-NNN-outcome.md` sidecar per TODO. Do not create `watchtower/NEXT.VERIFY.md` for new-format plans. Assign plan `Slug:` once: `YYYYMMDD-kebab-title`, for example `20260619-arcade-mascot-spotlight`. Archive reuses this slug.
3. ADD: append only requested Tracker rows to `watchtower/NEXT.md` and create matching `watchtower/todos/TODO-NNN-kebab-title.md` plus `watchtower/todos/TODO-NNN-outcome.md` files. If added TODOs broaden work past current Title, update Title and shared context only as needed.
4. Open changed files in VS Code (Open In VS Code) after writing them.
5. Legacy plan ADD: add only when existing legacy plan already has clear inline TODO format. If verify mapping is unclear or `watchtower/NEXT.VERIFY.md` is missing, stop and ask before changing legacy files. Do not migrate unless user asks.

## Open In VS Code

Runs after `new` writes specs. Opens changed plan files in current VS Code window for review. Use `code -r -g` directly. Do not call another skill for this.

1. Build one `-g` target per file with absolute paths:
   - `watchtower/NEXT.md` at line 1 on CREATE, else added Tracker row line.
   - `watchtower/CONTEXT.md` at line 1 on CREATE, or on ADD only when context changed.
   - Each new TODO spec file at line 1.
2. Check `command -v code`. If present, run one command per target:

```bash
code -r -g "<absolute-path>":<line>:1
```

3. If `code` CLI is missing, do not fail `new`. Finish writing specs, tell user once, and print the exact commands.
4. Open only on CREATE or ADD. Never open in `next`, `verify`, `progress`, or `archive`.

## Propose Next

Use for `next` and natural-language "what next?" asks. Read-only. Never edit NEXT files here.

1. Read `watchtower/NEXT.md`. If absent, report no active plan and offer to start one with `new`. Stop.
2. Parse `## Tracker` table. Count items by Status: TODO, IN PROGRESS, BLOCKED, DONE.
3. Pick next item by priority: lowest-Order IN PROGRESS, else lowest-Order TODO, else surface BLOCKED items that need a decision.
4. New format: read only selected row's `Spec` file. Do not read full TODO files for `DONE` rows. Read `## Handoff` in `watchtower/NEXT.md`.
5. Legacy format: read selected inline `## TODO N` section and `## Handoff`.
6. Propose, do not edit:
   - Progress line, for example "9/12 DONE, 1 IN PROGRESS, 2 TODO".
   - Recommended next TODO with Brief and ready-to-run Prompt block when present.
   - BLOCKED items, with decision each needs.
   - If every item is DONE: report completion, recommend fresh plan with `new`, and echo Handoff next action.

## Run Verification

Use for `verify`. Run checks, record live results, and promote passing TODOs. Writes no code.

1. New format: read `watchtower/NEXT.md`, then read only TODO files that need verification from Tracker `Spec` column. Run each TODO's `## Verify` checks. Run `## Plan Verify` in `watchtower/NEXT.md` when present.
2. Legacy format: if `watchtower/NEXT.VERIFY.md` exists, use existing checklist exactly as written. Run each checkbox in order and record live results there. If legacy inline plan lacks `NEXT.VERIFY.md`, verify from inline TODO `Expected result` and `## Verification` only when those sections are clear. If not clear, stop and ask.
3. Run each check with real output: execute command, or do manual/browser check. Do not use recall.
4. New format: write results into each TODO's outcome sidecar: `watchtower/todos/TODO-NNN-outcome.md`, where `NNN` matches the TODO id. Set `Status: DONE` only when all checks pass. Include `Changed`, `Contract`, and `Verified` entries for each done TODO. Do not append outcome text to the TODO spec file.
5. Tracker update: for each TODO whose outcome sidecar status is `DONE`, set Tracker Status to `DONE` in `watchtower/NEXT.md`. Leave rows unchanged if any check failed or was skipped. Then recompute plan-level `Status:` header.
6. Report passed / failed / skipped, and which TODOs were promoted to `DONE`. If any pre-commit-gate or Plan Verify check failed, stop and surface it.

## Progress

Use for `progress`. Update plan state only. Do not run implementation work here.

1. Read `watchtower/NEXT.md` and selected TODO file when new format is active. Read matching outcome sidecar only when changing status to `DONE` or when user explicitly asks for outcome context.
2. Update Tracker `Status` and `Notes` for named TODOs only. Allowed statuses: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`.
3. For new format, update matching `watchtower/todos/TODO-NNN-outcome.md` when status changes:
   - `IN PROGRESS`: set `Status: IN PROGRESS`; add one short progress note only when useful.
   - `BLOCKED`: set `Status: BLOCKED`, add `Blocked:` with reason and next decision needed.
   - `DONE`: only set when verification evidence is already present in the outcome sidecar. Otherwise use `verify`.
   - `TODO`: clear only stale progress notes that belong to this plan update.
4. Recompute plan-level `Status:` after status changes. Keep `ACTIVE` while any Tracker row is not `DONE`.
5. Do not edit unrelated TODO files, context, code, or archive files.

## Implement

Use for `implement` and `implement team`. This is only mode that writes code. Honor Working Principles.

Two execution modes, same goal and same steps 1-9:

- `implement` (default): build the current work set yourself, sequentially in this session, one TODO at a time.
- `implement team`: build the current work set with a team of subagents (Agent tool), then run Team Cleanup (step 11). Dispatch rules:
  - Group TODOs that edit the same file go to ONE builder subagent. Never run parallel file-editing subagents on the same file; they clobber each other.
  - Independent work (no shared files) may run as parallel builders.
  - Add read-only reviewer subagents (parallel) and an optional fix pass when useful.
  - Subagents honor the same constraints: scope, impact analysis, no commit, preserve unrelated work.

1. Read latest `watchtower/NEXT.md`. If absent, report no active plan and offer to start one with `new`. Stop.
2. Read project rules first: `AGENTS.md` or `CLAUDE.md`, `DESIGN.md`, and any `.cursor/rules/` that apply. Honor every working rule, validation matrix, and DESIGN.md-first constraint.
3. Parse `## Tracker` table. Pick seed row by priority: lowest-Order IN PROGRESS, else lowest-Order TODO. If seed row Group is not `standalone`, the current work set is every non-DONE row with that same Group, sorted by Order. If Group is `standalone`, current work set is the seed row only.
4. Reconcile plan vs reality before coding. If plan state, target, or TODO conflicts with shipped work, or an Open Decisions item is unresolved, stop and surface it with `AskUserQuestion`. Do not overwrite shipped work plan misdescribes.
5. New format load set:
   - Read each current work set row's `Spec` file in full.
   - Read `watchtower/CONTEXT.md` once when any current work set row's `Context` column requires it.
   - For each current work set row's `Deps` entry, resolve TODO ids through Tracker `Spec` only to confirm dependency status and file identity. Do not read dependency outcome sidecars by default, even when they exist.
   - Read outcome sidecars only when the user's `implement` prompt explicitly asks for them, for example "read outcomes", "use previous outcomes", or "synthesize from outcomes". If explicit, read only matching `watchtower/todos/TODO-NNN-outcome.md` files, never full dependency TODO specs unless the prompt also asks for them.
   - Do not read full TODO files for `DONE` rows.
6. Legacy format load set: read inline TODO sections in Tracker order, skipping `DONE` items, using old flow.
7. For current work set:
   - Treat `## Brief` and any Prompt block as implementer brief. If Prompt names a skill, invoke it.
   - Run impact analysis required by project rules before editing a symbol, for example GitNexus `impact`. Warn user on HIGH or CRITICAL risk before proceeding. For edits with no symbol, like page template, CSS, asset, or docs, note that no symbol-level impact applies and proceed.
   - Read every file each TODO touches before editing. Never edit blind. Keep changes scoped to current work set.
   - Mark current work set rows `IN PROGRESS`, do work, then run each TODO's `## Verify` checks.
   - Mark each row `DONE` only after its verification passes and matching `TODO-NNN-outcome.md` is written with `Status: DONE`, `Changed`, `Contract`, and `Verified`. Record blockers in the outcome sidecar as `BLOCKED` with reason.
8. Run `## Plan Verify` commands in `watchtower/NEXT.md` when present. Fix failures before claiming done. Report real outcomes.
9. Update Tracker statuses, plan-level `Status:` header, and `## Handoff` to reflect what shipped. Do not archive unless user asks.
10. Do not commit or push unless user asks. If asked, follow repo commit flow and run required pre-commit checks, for example `gitnexus_detect_changes()`.
11. `implement team` only - Team Cleanup. After steps 1-10 finish, shut down the team. Send a `shutdown_request` (via SendMessage) to every subagent this run spawned: builders, reviewers, fixers. Confirm each background agent stops. Leave no idle background agents running. List which agents were shut down in the Recap. `implement` (sequential) skips this step.

## File Model

- `watchtower/NEXT.md`: active manifest. Holds plan metadata, Tracker, dependency paths, Handoff, Archive, and optional `## Plan Verify`.
- `watchtower/CONTEXT.md`: short shared context that applies across TODOs. Keep stable and brief.
- `watchtower/todos/TODO-NNN-kebab-title.md`: full TODO spec. Holds `## Brief` and `## Verify`. It does not hold outcome text.
- `watchtower/todos/TODO-NNN-outcome.md`: outcome sidecar. Holds status, changed facts, preserved/created contract, verification evidence, blockers, and handoff notes for TODO `NNN`.
- `watchtower/NEXT.VERIFY.md`: legacy verify file only. Do not create for new-format plans.
- `watchtower/archive/<slug>/NEXT.md`: archived manifest.
- `watchtower/archive/<slug>/CONTEXT.md`: archived shared context when present.
- `watchtower/archive/<slug>/todos/`: archived TODO files when present.
- `watchtower/archive/<slug>/NEXT.VERIFY.md`: archived legacy verify file when present.
- Root `NEXT.md`, `NEXT_*.md`, and `NEXT.VERIFY.md` are legacy ignored paths. Do not create new root NEXT files.

## Writing Style

Write every `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, and `watchtower/todos/*.md` in caveman-full style: shortest words, no waste, same logic. Reader still reviews plan files alone, before any code.

Always write plan files in English, even when user prompts in Vietnamese or any other language.

Apply to all prose: Brief, Verify, Outcome, Handoff, Tracker Notes, context, and verify notes.

- Drop articles (a/an). Drop filler (just/really/basically/actually/simply), hedging, and pleasantries.
- Fragments OK. Pattern: [thing] [action] [reason]. [next step].
- Short synonyms: big not extensive, fix not "implement a solution for", use not leverage, help not facilitate, to not "in order to", then not subsequently.
- Keep all logic and info. No step dropped, no number rounded. Shorter, not thinner.
- Keep exact tokens unchanged: file paths, commands, function names, variable names, state names, assertion names, error text, mermaid node labels, and Prompt blocks.
- File references in plan prose, lists, and tables MUST be markdown links, not plain text or inline code. Use `[path](path)` for repo-relative files, for example `[watchtower/todos/TODO-001-foo.md](watchtower/todos/TODO-001-foo.md)`. Keep raw paths only inside command blocks, file tree blocks, and exact command examples.
- Use full clarity for risky steps: irreversible actions, data loss, and pre-commit gates.

Quick check: read each TODO file aloud. If word drops without losing fact, cut it.

## NEXT.md Structure

Use this structure unless user gives more specific format. Write all prose per Writing Style. Full copy-paste skeleton lives in `references/todo-template.md`.

- `## Current Active Plan` with Title, Slug, Status, Updated.
- `## Tracker` table: one row per TODO, columns Order, TODO, Group, Status, Spec, Deps, Context, Notes.
- `Spec` points to TODO file as markdown link, for example `[watchtower/todos/TODO-NNN-kebab-title.md](watchtower/todos/TODO-NNN-kebab-title.md)`.
- `Deps` points to TODO ids or TODO files that must be complete before work starts. Use `-` when none. `implement` does not read dependency outcome sidecars unless the user explicitly asks.
- `Context` is usually `[watchtower/CONTEXT.md](watchtower/CONTEXT.md)` or `-`.
- `## Plan Verify` list when cross-TODO checks exist.
- `## Handoff` with next action.
- `## Archive` list of archived plans.

TODO Status labels: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`.

Plan-level `Status:` header: `ACTIVE` while any Tracker row is not `DONE`; `DONE` when every row is `DONE`; `ARCHIVED` after `archive` moves plan. `verify` and `implement` recompute this header after they promote rows.

## TODO File Format

Each TODO file is mandatory and contains, in order:

1. H1 heading `# TODO-NNN Title`; first line includes `Group: <tag>`.
2. `## Brief`: goal, logic/change chart or one-line change note, implementation steps, files, and ready-to-run Prompt when useful.
3. `## Verify`: concrete commands or manual/browser checks with expected results.
4. No `## Outcome` section. Outcomes live only in `watchtower/todos/TODO-NNN-outcome.md`.

When TODO is created, create matching outcome sidecar `watchtower/todos/TODO-NNN-outcome.md`:

```markdown
# TODO-NNN Outcome

## Outcome

Status: TODO
```

When TODO is done, update only the outcome sidecar to:

```markdown
# TODO-NNN Outcome

## Outcome

Status: DONE

Changed:
- <what changed>

Contract:
- <behavior or interface preserved/created>

Verified:
- <command/check> -> <real result>
```

Brief rules:

1. Number and group. Heading `# TODO-NNN <title>`; first line after heading is `Group: <tag>`. Group items that ship together under one tag, for example A or combined `3+4+5`. Use `standalone` when item has no group.
2. `Goal:` one or two sentences naming outcome.
3. One mermaid chart that best shows TODO logic or change, under short label like `Logic (before -> after):` or `Sequence:`. For doc-only or single-line TODO, chart is optional; replace it with one-line `Change:` note that states before -> after.
4. `How:` short bullet list of steps.
5. `Files:` exact paths TODO touches as markdown links, each with what changes.
6. `Expected result:` observable outcomes that prove TODO is done.
7. `Prompt:` fenced `text` block with exact prompt to hand implementer or agent for this TODO. If installed skill fits this TODO, name it here.

Do not emit TODO missing number and group, goal, how, files, expected result, prompt, verify, or matching outcome sidecar. Mermaid chart is required except for doc-only or single-line TODO.
Do not put outcome prose in TODO spec files. Keep specs clean so future `implement` runs can read briefs without inheriting old result noise.

## Archive

Use for `archive`. Archive active plan files together under plan slug. Do not delete archive files.

1. Read `Slug:` from `watchtower/NEXT.md`. Build archive directory `watchtower/archive/<slug>/`. If it exists, add `-HHMM` to avoid overwrite.
2. Before moving files, update `watchtower/NEXT.md`: set plan-level `Status: ARCHIVED`, set `Updated:` to current date, and append `- Archived: <YYYY-MM-DD> -> watchtower/archive/<slug>/` under `## Archive`.
3. Move `watchtower/NEXT.md`, `watchtower/CONTEXT.md` if present, and `watchtower/todos/` if present into that archive directory.
4. If `watchtower/NEXT.VERIFY.md` exists, treat it as legacy and archive it in same directory.
5. Do not remove old archive directories. Do not create fresh plan unless user also asked for `new`.

## Rules

- H1/H2/H3 headings only in NEXT files; no bold, no emojis.
- Write all `NEXT.md`, `CONTEXT.md`, and TODO prose per Writing Style. Keep technical tokens exact.
- Always write plan files in English, even when user prompts in Vietnamese or any other language.
- In plan prose, lists, and tables, write file references as markdown links. Do not leave file paths as plain text or inline code unless inside command blocks, file tree blocks, or exact command examples.
- `new` does not create `watchtower/NEXT.VERIFY.md` for new-format plans.
- `new` never archives. To start fresh unrelated plan while one is active, run `archive` first, then `new`.
- After `new` writes or updates specs, open changed plan files in VS Code with direct `code -r -g` commands. If `code` is missing, print fallback commands. No other mode opens VS Code.
- `verify` promotes TODO to `DONE` only when all `## Verify` checks pass live and the outcome sidecar is updated. It never sets `IN PROGRESS` or `BLOCKED`.
- `verify` writes `## Outcome` in `watchtower/todos/TODO-NNN-outcome.md`, never in the TODO spec file.
- `implement` does not read outcome sidecars by default, even when they exist. It reads them only when the user's implement prompt explicitly asks for outcome context.
- `implement` builds sequentially in-session. `implement team` builds with subagents and MUST run Team Cleanup at the end: shut down every spawned background agent. Same-file work goes to one builder; never parallel-edit one file.
- `archive` moves `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, `watchtower/todos/`, and any legacy `watchtower/NEXT.VERIFY.md` to `watchtower/archive/<slug>/`.
- Before archiving legacy plan, if `watchtower/NEXT.VERIFY.md` has unchecked `## Pre-commit gate` item, warn user and offer to run it first. If user archives anyway, note open gate in recap.
- `next` mode and "what next?" asks are read-only. Never edit NEXT files when only proposing.
- Do not delete archive files.
- Do not change `.gitignore` to ignore or unignore `watchtower/`.
- Preserve unrelated worktree changes.
- End task output with `## Recap`.

## References

- [references/todo-template.md](references/todo-template.md): Full copy-paste skeleton for `NEXT.md`, `CONTEXT.md`, and per-TODO files.
- [references/mermaid-template.md](references/mermaid-template.md): One concise mermaid example per chart type, with gotchas.
- [references/skill-routing.md](references/skill-routing.md): Prominent skills to pick from when a TODO fits one; named in TODO Brief or Prompt.
