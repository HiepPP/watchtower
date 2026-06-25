---
name: watchtower
description: Use when creating, updating, archiving, reviewing, verifying, researching, implementing, or asking what to do next on repo-local TASK plans in watchtower/NEXT.md. implement reads NEXT.md, then loads all remaining non-DONE TASK specs in Tracker order plus required shared context; outcome files are opt-in only. research maps codebase questions via /voyager into watchtower/RESEARCH.md, read-only re code. Also triggers on "what next?" during repo work.
argument-hint: "[new|progress|archive|verify|next|research|research team|implement|implement team] [--repo path] [summary]"
disable-model-invocation: false
user-invocable: true
license: MIT
---

## Purpose

Maintain repo-local planning files. Keep `watchtower/NEXT.md` as active manifest, `watchtower/CONTEXT.md` as short shared context, TASK briefs under `watchtower/tasks/`, and old plans under `watchtower/archive/`.

## When to Use

Use when the user invokes `/watchtower` or asks to write, revise, archive, review, verify, or implement a repo-local NEXT plan. Also use for natural-language "what next?" / "what's next?" / "next steps?" asks while in a repo: read `watchtower/NEXT.md`, gauge Tracker progress, and propose next action.

Only `implement` writes code. `new`, `progress`, `archive`, `next`, and `research` never write code. `verify` runs checks and records results in TASK outcome sidecar files. `research` writes only `watchtower/RESEARCH.md` and research sidecars; never code, never `NEXT.md` or TASK files.

Tip: say "fan out subagents" or "fan out a team" to run implement with a subagent team. Each agent digs deep on its work set so nothing gets missed; watchtower shuts every spawned agent down after (Team Cleanup). Same fan-out works for research: `research team` runs one search agent per question, then Team Cleanup.

## Arguments

Use `$ARGUMENTS` to classify request. Details links to mode flow; dash means table plus Workflow and Rules cover it.

| Argument | Purpose | Mutates | Details |
|----------|---------|---------|---------|
| `new` | Create fresh manifest plan or add TASK files to active plan | `NEXT.md` + `CONTEXT.md` + `tasks/` | [Author Plan](#author-plan) |
| `progress` | Mark TASK status or add session notes | `NEXT.md` Tracker + TASK outcome sidecar | [Progress](#progress) |
| `archive` | Revise session, write LEARN.md, then archive manifest, context, TASK files, research files, and any legacy verify file | moves active plan files to `watchtower/archive/` + writes `LEARN.md` | [Archive](#archive) |
| `verify` | Run checks from TASK files, record each result, promote passing TASKs to `DONE` | TASK outcome sidecar + Tracker Status | [Run Verification](#run-verification) |
| `next` | Read active plan and propose next action from Tracker | nothing | [Propose Next](#propose-next) |
| `research` | Map 1+ codebase questions via /voyager, write findings | `RESEARCH.md` + `research/` sidecars | [Map Research](#map-research) |
| `research team` | Same as `research`, but one search subagent per question, then auto shut down every spawned agent | `RESEARCH.md` + `research/` sidecars | [Map Research](#map-research) |
| `implement` | Load all remaining non-DONE TASK specs plus required context, then build sequentially in this session | code + plan files + TASK outcome sidecars | [Implement](#implement) |
| `implement team` | Same as `implement`, but build with a team of subagents, then auto shut down every spawned background agent. Triggers include `team` and `fan out subagents` | code + plan files | [Implement](#implement) |

`--repo path` is a modifier, not a mode: use given repository instead of current git root.

`implement team` = `implement` run by a team of subagents. Any of these keywords triggers it, alone or with `implement`: `team`, `with team`, `team of subagent(s)`, `subagent team`, `fan out`, `fan out subagents`, `fan out a team`. No team keyword: run sequential `implement`.

`research team` = `research` run by a team of subagents, one per question. Same team keywords trigger it, alone or with `research`. No team keyword: run sequential `research`.

Arguments may chain modes in one call, for example `new and implement`, or `archive, and /commit`. Run them in order given. A `/command` token is an external skill, not a watchtower mode. Invoke it after watchtower modes finish.

## Workflow

1. Resolve repo root. Use `--repo path` when given; else current git root. Prove it with `git -C <path> rev-parse --show-toplevel`. Stop if target repo cannot be proven.
2. For `new`, `progress`, `archive`, and `verify`, read before writing: `.gitignore`, `watchtower/NEXT.md` if present, `watchtower/CONTEXT.md` if present, `watchtower/NEXT.VERIFY.md` if present, TASK filenames and outcome filenames under `watchtower/tasks/`, and archive filenames under `watchtower/archive/`. For `implement`, use the minimal load set in Implement. For `next`, skip this broad read; Propose Next owns minimal load. For `research`, skip this broad read; Map Research owns minimal load.
3. Do not add `/watchtower/` to `.gitignore`. If `watchtower/` is already ignored, keep current state. If tracked, keep tracked.
4. Detect plan shape before routing:
   - New format: `watchtower/NEXT.md` Tracker has `Spec`, `Deps`, and `Context` columns. TASK detail lives under `watchtower/tasks/`.
   - Legacy format: `watchtower/NEXT.md` has inline `## TODO N` sections or `watchtower/NEXT.VERIFY.md` exists as active verify file.
   - Do not migrate legacy plans during `next`, `verify`, or `implement`.
5. Classify from `$ARGUMENTS` and route:
   - `new` -> Author Plan
   - `next` or natural-language "what next?" -> Propose Next
   - `research` -> Map Research (sequential, this session)
   - `research team` or `research` with `fan out` -> Map Research (team of subagents, then Team Cleanup)
   - `verify` -> Run Verification
   - `implement` -> Implement (sequential, this session)
   - `implement team` or `fan out subagents` -> Implement (team of subagents, then Team Cleanup)
   - `archive` -> Archive
   - `progress` -> Progress
6. Make smallest matching edit. For any new or revised TASK, follow TASK File Format and skeleton in `references/task-template.md`.
7. Validate plan-file edits with `git diff --check` and `git status --short -- next .gitignore`. `next` skips this step. `implement` runs its own verification.

## Working Principles

Honor these in `new` and `implement`.

- Lean first. For clear tasks, choose simplest path and continue. Ask only when plan is unclear, data may be lost, shipped work conflicts with plan, or user choice changes outcome.
- Keep it simple. Build minimum TASK needs. No speculative features, abstractions, or config TASK did not ask for.
- Stay surgical. Touch only what TASK needs. Match existing style. Do not refactor unrelated code. Remove only orphans from this change.
- Verify real result. Each TASK has checkable `## Verify` section. Run needed checks, then record real results in its `TASK-NNN-outcome.md` sidecar.

## Author Plan

Use for `new`. Create fresh plan when none exists, or add TASKs to active plan. When writing a TASK, name a skill only when user named it, task plainly needs it, or it materially changes how implementer should work.

Skill naming rule: use skill names sparingly. Do not scan every installed skill for routine TASKs. Use `references/skill-routing.md` only when task domain is non-obvious or user asks for best skill. Name `/solve` only for root-cause bugs, unclear code paths, multi-file behavior changes, or regression-risk work. Do not name `/solve` for simple copy edits, command-list additions, small CSS tweaks, file-only updates, or obvious one-file changes. If unsure, write Prompt without skill name; implementer can invoke a skill later if investigation becomes necessary.

1. Decide by file presence:
   - `watchtower/NEXT.md` absent -> CREATE.
   - `watchtower/NEXT.md` present with Status `ARCHIVED` or empty Tracker -> CREATE.
   - `watchtower/NEXT.md` present with every Tracker row `DONE` -> ask with `AskUserQuestion`: extend this plan (ADD), or archive it and start fresh (`archive` then CREATE). Do not guess.
   - `watchtower/NEXT.md` present with open TASKs -> ADD.
2. CREATE: before writing files, derive plan `Slug:` from current date plus final plan title: `YYYYMMDD-kebab-title`, for example `20260619-arcade-mascot-spotlight`. Write that exact `Slug:` into `watchtower/NEXT.md` under `## Current Active Plan`. Never create new-format `watchtower/NEXT.md` without `Slug:`. Do not defer slug choice to archive time.
3. CREATE: write `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, one spec file per TASK under `watchtower/tasks/`, and one matching `TASK-NNN-outcome.md` sidecar per TASK. Do not create `watchtower/NEXT.VERIFY.md` for new-format plans. Archive reuses existing `Slug:` only.
4. ADD: append only requested Tracker rows to `watchtower/NEXT.md` and create matching `watchtower/tasks/TASK-NNN-kebab-title.md` plus `watchtower/tasks/TASK-NNN-outcome.md` files. If added TASKs broaden work past current Title, update Title and shared context only as needed. If active new-format plan lacks `Slug:`, stop and repair metadata before adding TASK rows.
5. Open changed files in VS Code (Open In VS Code) after writing them.
6. Legacy plan ADD: add only when existing legacy plan already has clear inline TODO format. If verify mapping is unclear or `watchtower/NEXT.VERIFY.md` is missing, stop and ask before changing legacy files. Do not migrate unless user asks.

## Open In VS Code

Runs after `new` writes specs or `research` writes findings. Opens changed plan files in current VS Code window for review. Use `code -r -g` directly. Do not call another skill for this.

1. Build one `-g` target per file with absolute paths:
   - `new`: `watchtower/NEXT.md` at line 1 on CREATE, else added Tracker row line; `watchtower/CONTEXT.md` at line 1 on CREATE, or on ADD only when context changed; each new TASK spec file at line 1.
   - `research`: each new `watchtower/research/RESEARCH-NNN-*.md` at line 1, and `watchtower/RESEARCH.md` at line 1.
2. Check `command -v code`. If present, run one command per target:

```bash
code -r -g "<absolute-path>":<line>:1
```

3. If `code` CLI is missing, do not fail `new`. Finish writing specs, tell user once, and print the exact commands.
4. Open on CREATE or ADD (`new`) and on `research`. Never open in `next`, `verify`, `progress`, or `archive`.

## Propose Next

Use for `next` and natural-language "what next?" asks. Read-only. Never edit NEXT files here.

1. Read `watchtower/NEXT.md`. If absent, report no active plan and offer to start one with `new`. Stop.
2. Parse `## Tracker` table. Count items by Status: TODO, IN PROGRESS, BLOCKED, DONE.
3. Pick next item by priority: lowest-Order IN PROGRESS, else lowest-Order TODO, else surface BLOCKED items that need a decision.
4. New format: read only selected row's `Spec` file. Do not read full TASK files for `DONE` rows. Read `## Handoff` in `watchtower/NEXT.md`.
5. Legacy format: read selected inline `## TODO N` section and `## Handoff`.
6. Propose, do not edit:
   - Progress line, for example "9/12 DONE, 1 IN PROGRESS, 2 TODO".
   - Recommended next TASK with Brief and ready-to-run Prompt block when present.
   - BLOCKED items, with decision each needs.
   - If every item is DONE: report completion, recommend fresh plan with `new`, and echo Handoff next action.

## Map Research

Use for `research` and `research team`. Answer 1+ codebase questions with `/voyager`, write findings to `watchtower/RESEARCH.md` and per-question sidecars. Never writes code. Never edits `NEXT.md`, `CONTEXT.md`, or TASK files.

Two execution modes, same output:

- `research` (default): run each question sequentially in this session.
- `research team`: run one search subagent per question (Agent tool), in parallel, then Team Cleanup (Implement step 11). Main session synthesizes agent findings and writes `RESEARCH.md` plus sidecars, so parallel agents never clobber the same file.

1. Resolve repo root (Workflow step 1). Minimal load: read `watchtower/RESEARCH.md` if present to get max `RESEARCH-NNN`. Skip broad plan read. Active `NEXT.md` not required; research runs standalone.
2. Create `watchtower/` and `watchtower/research/` if absent. Do not create or touch `NEXT.md`, `CONTEXT.md`, or TASK files.
3. Parse questions from `$ARGUMENTS`. Each quoted string or distinct ask is one question. Assign next `RESEARCH-NNN` per question, continuing from index max.
4. For each question, run `/voyager` workflow: project code -> `gitnexus_query` first, then `gitnexus_context` for named symbols, then Grep/Glob, then Read. If GitNexus index is stale, tell user to run `npx gitnexus analyze`, finish with best Grep/Glob effort, and set sidecar `Status: PARTIAL`.
5. Write one sidecar per question: `watchtower/research/RESEARCH-NNN-kebab-question.md`, using the skeleton in [references/research-template.md](references/research-template.md). Quote real code with `path:line` before each block. Caveman-full English per Writing Style.
6. Append one row per question to `## Index` in `watchtower/RESEARCH.md`. Create `RESEARCH.md` from the template if absent.
7. Open new research files in VS Code (Open In VS Code).
8. Validate edits with `git diff --check` and `git status --short`. Report per question: ID, scope, Status, sidecar link.
9. `research team` only: after writing, run Team Cleanup (Implement step 11) - shut down every spawned search agent, list them in Recap.

## Run Verification

Use for `verify`. Run checks, record live results, and promote passing TASKs. Writes no code.

1. New format: read `watchtower/NEXT.md`, then read only TASK files that need verification from Tracker `Spec` column. Run each TASK's `## Verify` checks. Run `## Plan Verify` in `watchtower/NEXT.md` when present.
2. Legacy format: if `watchtower/NEXT.VERIFY.md` exists, use existing checklist exactly as written. Run each checkbox in order and record live results there. If legacy inline plan lacks `NEXT.VERIFY.md`, verify from inline TODO `Expected result` and `## Verification` only when those sections are clear. If not clear, stop and ask.
3. Run each check with real output: execute command, or do manual/browser check. Do not use recall.
4. New format: write results into each TASK's outcome sidecar: `watchtower/tasks/TASK-NNN-outcome.md`, where `NNN` matches the TASK id. Set `Status: DONE` only when all checks pass. Include `Changed`, `Contract`, and `Verified` entries for each done TASK. Do not append outcome text to the TASK spec file.
5. Tracker update: for each TASK whose outcome sidecar status is `DONE`, set Tracker Status to `DONE` in `watchtower/NEXT.md`. Leave rows unchanged if any check failed or was skipped. Then recompute plan-level `Status:` header.
6. Report passed / failed / skipped, and which TASKs were promoted to `DONE`. If any pre-commit-gate or Plan Verify check failed, stop and surface it.

## Progress

Use for `progress`. Update plan state only. Do not run implementation work here.

1. Read `watchtower/NEXT.md` and selected TASK file when new format is active. Read matching outcome sidecar only when changing status to `DONE` or when user explicitly asks for outcome context.
2. Update Tracker `Status` and `Notes` for named TASKs only. Allowed statuses: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`.
3. For new format, update matching `watchtower/tasks/TASK-NNN-outcome.md` when status changes:
   - `IN PROGRESS`: set `Status: IN PROGRESS`; add one short progress note only when useful.
   - `BLOCKED`: set `Status: BLOCKED`, add `Blocked:` with reason and next decision needed.
   - `DONE`: only set when verification evidence is already present in the outcome sidecar. Otherwise use `verify`.
   - `TODO`: clear only stale progress notes that belong to this plan update.
4. Recompute plan-level `Status:` after status changes. Keep `ACTIVE` while any Tracker row is not `DONE`.
5. Do not edit unrelated TASK files, context, code, or archive files.

## Implement

Use for `implement` and `implement team`. This is only mode that writes code. Honor Working Principles.

Two execution modes, same goal and same steps 1-9:

- `implement` (default): build every remaining non-DONE TASK sequentially in this session, one TASK at a time, from lowest Order to highest Order.
- `implement team`: build every remaining non-DONE TASK with a team of subagents (Agent tool), then run Team Cleanup (step 11). Dispatch rules:
  - Group TASKs that edit the same file go to ONE builder subagent. Never run parallel file-editing subagents on the same file; they clobber each other.
  - Independent work (no shared files) may run as parallel builders.
  - Add read-only reviewer subagents (parallel) and an optional fix pass when useful.
  - Subagents honor the same constraints: scope, impact analysis, no commit, preserve unrelated work.

1. Read latest `watchtower/NEXT.md`. If absent, report no active plan and offer to start one with `new`. Stop.
2. Read project rules first: `AGENTS.md` or `CLAUDE.md`, `DESIGN.md`, and any `.cursor/rules/` that apply. Honor every working rule, validation matrix, and DESIGN.md-first constraint.
3. Parse `## Tracker` table. Current work set is every non-DONE row, sorted by Order from lowest to highest. Include `IN PROGRESS`, `TODO`, and `BLOCKED` rows. Do not stop after `TASK-001`, and do not limit work to one Group or `standalone` row. Start with lowest-Order `IN PROGRESS` when present; otherwise start with lowest-Order `TODO`. If a `BLOCKED` row is reached, keep it blocked unless the plan or user gives enough information to unblock it.
4. Reconcile plan vs reality before coding. If plan state, target, or TASK conflicts with shipped work, or an Open Decisions item is unresolved, stop and surface it with `AskUserQuestion`. Do not overwrite shipped work plan misdescribes.
5. New format load set:
   - Read each non-DONE row's `Spec` file in full, in Tracker Order.
   - Read `watchtower/CONTEXT.md` once when any non-DONE row's `Context` column requires it.
   - For each non-DONE row's `Deps` entry, resolve TASK ids through Tracker `Spec` only to confirm dependency status and file identity. Do not read dependency outcome sidecars by default, even when they exist.
   - Read outcome sidecars only when the user's `implement` prompt explicitly asks for them, for example "read outcomes", "use previous outcomes", or "synthesize from outcomes". If explicit, read only matching `watchtower/tasks/TASK-NNN-outcome.md` files, never full dependency TASK specs unless the prompt also asks for them.
   - Do not read full TASK files for `DONE` rows.
6. Legacy format load set: read inline TODO sections in Tracker order, skipping `DONE` items, using old flow.
7. For each non-DONE TASK in Tracker Order:
   - Treat `## Brief` and any Prompt block as implementer brief. If Prompt names a skill, invoke it.
   - Run impact analysis required by project rules before editing a symbol, for example GitNexus `impact`. Warn user on HIGH or CRITICAL risk before proceeding. For edits with no symbol, like page template, CSS, asset, or docs, note that no symbol-level impact applies and proceed.
   - Read every file the current TASK touches before editing. Never edit blind. Keep changes scoped to the current TASK and required dependency fixes.
   - Mark the current row `IN PROGRESS`, do work, then run that TASK's `## Verify` checks.
   - Mark current row `DONE` only after its verification passes and matching `TASK-NNN-outcome.md` is written with `Status: DONE`, `Changed`, `Contract`, and `Verified`.
   - Continue to the next non-DONE row after a row is marked `DONE`.
   - If a row fails verification or cannot proceed, record blocker in the outcome sidecar as `BLOCKED` with reason, update Tracker, stop the sequence, and report next decision needed.
8. Run `## Plan Verify` commands in `watchtower/NEXT.md` when present. Fix failures before claiming done. Report real outcomes.
9. Update Tracker statuses, plan-level `Status:` header, and `## Handoff` to reflect what shipped. Do not archive unless user asks.
10. Do not commit or push unless user asks. If asked, follow repo commit flow and run required pre-commit checks, for example `gitnexus_detect_changes()`.
11. `implement team` only - Team Cleanup. After steps 1-10 finish, shut down the team. Send a `shutdown_request` (via SendMessage) to every subagent this run spawned: builders, reviewers, fixers. Confirm each background agent stops. Leave no idle background agents running. List which agents were shut down in the Recap. `implement` (sequential) skips this step.

## File Model

- `watchtower/NEXT.md`: active manifest. Holds plan metadata, Tracker, dependency paths, Handoff, Archive, and optional `## Plan Verify`.
- `watchtower/CONTEXT.md`: short shared context that applies across TASKs. Keep stable and brief.
- `watchtower/tasks/TASK-NNN-kebab-title.md`: full TASK spec. Holds `## Brief` and `## Verify`. It does not hold outcome text.
- `watchtower/tasks/TASK-NNN-outcome.md`: outcome sidecar. Holds status, changed facts, preserved/created contract, verification evidence, blockers, and handoff notes for TASK `NNN`.
- `watchtower/RESEARCH.md`: research index. Append-only table of research entries (ID, date, question, scope, status, sidecar link). Holds no findings body. Written by `research`.
- `watchtower/research/RESEARCH-NNN-kebab-question.md`: research sidecar. Holds one question's findings: meta, summary, evidence with `path:line` quotes, runtime/ASCII flow, file references. Written by `research`.
- `watchtower/NEXT.VERIFY.md`: legacy verify file only. Do not create for new-format plans.
- `watchtower/archive/<slug>/NEXT.md`: archived manifest.
- `watchtower/archive/<slug>/CONTEXT.md`: archived shared context when present.
- `watchtower/archive/<slug>/tasks/`: archived TASK files when present.
- `watchtower/archive/<slug>/NEXT.VERIFY.md`: archived legacy verify file when present.
- `watchtower/archive/<slug>/RESEARCH.md`: archived research index when present.
- `watchtower/archive/<slug>/research/`: archived research sidecars when present.
- `watchtower/archive/<slug>/LEARN.md`: one overall session review for archived plan. Holds per-TASK plan vs shipped with mistake/cause/fix, plan-level cross-TASK issues, and lessons. Written at archive time.
- Root `NEXT.md`, `NEXT_*.md`, and `NEXT.VERIFY.md` are legacy ignored paths. Do not create new root NEXT files.

## Writing Style

Write every `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, `watchtower/tasks/*.md`, `watchtower/RESEARCH.md`, and `watchtower/research/*.md` in caveman-full style: shortest words, no waste, same logic. Reader still reviews plan files alone, before any code.

Always write plan files in English, even when user prompts in Vietnamese or any other language.

Apply to all prose: Brief, Verify, Outcome, Handoff, Tracker Notes, context, and verify notes.

- Drop articles (a/an). Drop filler (just/really/basically/actually/simply), hedging, and pleasantries.
- Fragments OK. Pattern: [thing] [action] [reason]. [next step].
- Short synonyms: big not extensive, fix not "implement a solution for", use not leverage, help not facilitate, to not "in order to", then not subsequently.
- Keep all logic and info. No step dropped, no number rounded. Shorter, not thinner.
- Keep exact tokens unchanged: file paths, commands, function names, variable names, state names, assertion names, error text, mermaid node labels, and Prompt blocks.
- File references in plan prose, lists, and tables MUST be markdown links, not plain text or inline code. Use `[path](path)` for repo-relative files, for example `[watchtower/tasks/TASK-001-foo.md](watchtower/tasks/TASK-001-foo.md)`. Keep raw paths only inside command blocks, file tree blocks, and exact command examples.
- Use full clarity for risky steps: irreversible actions, data loss, and pre-commit gates.

Quick check: read each TASK file aloud. If word drops without losing fact, cut it.

## NEXT.md Structure

Use this structure unless user gives more specific format. Write all prose per Writing Style. Full copy-paste skeleton lives in `references/task-template.md`.

- `## Current Active Plan` with Title, Slug, Status, Updated.
- `## Tracker` table: one row per TASK, columns Order, TASK, Group, Status, Spec, Deps, Context, Notes.
- `Spec` points to TASK file as markdown link, for example `[watchtower/tasks/TASK-NNN-kebab-title.md](watchtower/tasks/TASK-NNN-kebab-title.md)`.
- `Deps` points to TASK ids or TASK files that must be complete before work starts. Use `-` when none. `implement` does not read dependency outcome sidecars unless the user explicitly asks.
- `Context` is usually `[watchtower/CONTEXT.md](watchtower/CONTEXT.md)` or `-`.
- `## Plan Verify` list when cross-TASK checks exist.
- `## Handoff` with next action.
- `## Archive` list of archived plans.

TASK Status labels: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`.

Plan-level `Status:` header: `ACTIVE` while any Tracker row is not `DONE`; `DONE` when every row is `DONE`; `ARCHIVED` after `archive` moves plan. `verify` and `implement` recompute this header after they promote rows.

## TASK File Format

Each TASK file is mandatory and contains, in order:

1. H1 heading `# TASK-NNN Title`; first line includes `Group: <tag>`.
2. `## Brief`: goal, one-line change note or small chart when useful, implementation steps, files, and optional ready-to-run Prompt.
3. `## Verify`: concrete commands or manual/browser checks with expected results.
4. No `## Outcome` section. Outcomes live only in `watchtower/tasks/TASK-NNN-outcome.md`.

When TASK is created, create matching outcome sidecar `watchtower/tasks/TASK-NNN-outcome.md`:

```markdown
# TASK-NNN Outcome

## Outcome

Status: TODO
```

When TASK is done, update only the outcome sidecar to:

```markdown
# TASK-NNN Outcome

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

1. Number and group. Heading `# TASK-NNN <title>`; first line after heading is `Group: <tag>`. Group items that ship together under one tag, for example A or combined `3+4+5`. Use `standalone` when item has no group.
2. `Goal:` one or two sentences naming outcome.
3. Use one-line `Change:` note by default. Add one small mermaid chart only when it makes logic clearer than text.
4. `How:` short bullet list of steps.
5. `Files:` exact paths TASK touches as markdown links, each with what changes.
6. `Expected result:` observable outcomes that prove TASK is done.
7. `Prompt:` fenced `text` block only when it reduces ambiguity for implementer or agent. If installed skill clearly fits this TASK, name it here.

Do not emit TASK missing number and group, goal, how, files, expected result, verify, or matching outcome sidecar. Prompt and mermaid chart are optional; omit them when they add noise.
Do not put outcome prose in TASK spec files. Keep specs clean so future `implement` runs can read briefs without inheriting old result noise.

## Archive

Use for `archive`. Revise session first, write LEARN.md, then archive active plan files together under existing plan slug. Do not delete archive files. Do not infer, derive, or guess slug during archive.

1. Read `Slug:` from `watchtower/NEXT.md`. If `Slug:` is missing or empty, stop before moving files and report invalid active plan metadata. Do not derive slug from title, date, folder, or H1 during archive.
2. Revise session before moving. Read each TASK `## Brief` and `## Verify` under `watchtower/tasks/`, each matching `TASK-NNN-outcome.md`, and `watchtower/NEXT.md` Tracker and Handoff. Compare plan vs shipped:
   - Use this session's implement knowledge when archive runs after implement.
   - Else compare spec `## Brief`/`## Verify` vs `## Outcome` (Changed, Contract, Verified) and real repo state (`git diff`/`git log`).
   Review per TASK first: each TASK plan vs shipped, flag missed step, wrong target, spec gap, skipped verify, blocker; suggest likely mistake and fix. Then review plan-level: cross-TASK issues like scope creep, wrong order, dep gap, plan misdescribes reality. Hold findings for step 7.
3. Build archive directory `watchtower/archive/<slug>/`. If it exists, add `-HHMM` to avoid overwrite.
4. Before moving files, update `watchtower/NEXT.md`: set plan-level `Status: ARCHIVED`, set `Updated:` to current date, and append `- Archived: <YYYY-MM-DD> -> watchtower/archive/<slug>/` under `## Archive`.
5. Move `watchtower/NEXT.md`, `watchtower/CONTEXT.md` if present, `watchtower/tasks/` if present, `watchtower/RESEARCH.md` if present, and `watchtower/research/` if present into that archive directory.
6. If `watchtower/NEXT.VERIFY.md` exists, treat it as legacy and archive it in same directory.
7. Write step 2 review into `watchtower/archive/<slug>/LEARN.md`, same level as archived `NEXT.md`. Write caveman-full English per Writing Style. Always write the file: when no discrepancy found, write `match` per TASK, `none` plan-level, note clean. Use skeleton below.
8. Do not remove old archive directories. Do not create fresh plan unless user also asked for `new`.

One overall LEARN.md per session. Per-TASK findings go under `## Per TASK`; cross-TASK findings under `## Plan-Level`. Skeleton:

```markdown
# Learn <slug>

## Summary

Discrepancy: <N found / none>. One line, plan vs shipped across plan.

## Per TASK

- TASK-NNN: plan <spec said> -> shipped <what shipped>. Mistake: <what + likely cause>. Fix: <suggest>. Write `match` when TASK went as planned.

## Plan-Level

- Cross-TASK issue: scope creep, wrong order, dep gap, plan misdescribes reality. `none` when clean.

## Lessons

- <do differently next plan>
```

## Rules

- H1/H2/H3 headings only in NEXT files; no bold, no emojis.
- Write all `NEXT.md`, `CONTEXT.md`, and TASK prose per Writing Style. Keep technical tokens exact.
- Always write plan files in English, even when user prompts in Vietnamese or any other language.
- In plan prose, lists, and tables, write file references as markdown links. Do not leave file paths as plain text or inline code unless inside command blocks, file tree blocks, or exact command examples.
- `new` does not create `watchtower/NEXT.VERIFY.md` for new-format plans.
- `new` MUST assign and write `Slug:` during CREATE. Archive later reuses that exact slug.
- `new` never archives. To start fresh unrelated plan while one is active, run `archive` first, then `new`.
- After `new` writes or updates specs, open changed plan files in VS Code with direct `code -r -g` commands. If `code` is missing, print fallback commands. No other mode opens VS Code.
- `verify` promotes TASK to `DONE` only when all `## Verify` checks pass live and the outcome sidecar is updated. It never sets `IN PROGRESS` or `BLOCKED`.
- `verify` writes `## Outcome` in `watchtower/tasks/TASK-NNN-outcome.md`, never in the TASK spec file.
- `implement` does not read outcome sidecars by default, even when they exist. It reads them only when the user's implement prompt explicitly asks for outcome context.
- `implement` builds all remaining non-DONE TASKs sequentially in-session, from lowest Order to highest Order, until every row is `DONE` or one row is `BLOCKED`. It does not stop after the first TASK. `implement team` builds with subagents and MUST run Team Cleanup at the end: shut down every spawned background agent. Same-file work goes to one builder; never parallel-edit one file.
- `archive` moves `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, `watchtower/tasks/`, `watchtower/RESEARCH.md`, `watchtower/research/`, and any legacy `watchtower/NEXT.VERIFY.md` to `watchtower/archive/<slug>/`.
- `archive` revises session and writes one overall `watchtower/archive/<slug>/LEARN.md`: per-TASK plan vs shipped with mistake/cause/fix, plan-level cross-TASK issues, lessons. Always write it; write `none`/`match` when no discrepancy.
- `archive` MUST NOT guess or derive slug. If `Slug:` is missing or empty, stop before moving files.
- Before archiving legacy plan, if `watchtower/NEXT.VERIFY.md` has unchecked `## Pre-commit gate` item, warn user and offer to run it first. If user archives anyway, note open gate in recap.
- `next` mode and "what next?" asks are read-only. Never edit NEXT files when only proposing.
- `research` and `research team` never write code and never edit `NEXT.md`, `CONTEXT.md`, or TASK files. They write only `watchtower/RESEARCH.md` and `watchtower/research/RESEARCH-NNN-*.md`.
- `research` runs standalone; active plan not required. It uses `/voyager` for project code: `gitnexus_query` first, then `gitnexus_context`, then Grep/Glob.
- `research` numbers entries `RESEARCH-NNN` continuing from the `watchtower/RESEARCH.md` index max. Sidecar `Status: PARTIAL` when GitNexus index stale or question unresolved.
- `research team` builds with one search subagent per question and MUST run Team Cleanup at the end. Only the main session writes `RESEARCH.md` and sidecars; subagents never write plan files.
- Do not delete archive files.
- Do not change `.gitignore` to ignore or unignore `watchtower/`.
- Preserve unrelated worktree changes.
- End task output with `## Recap`.

## References

- [references/task-template.md](references/task-template.md): Full copy-paste skeleton for `NEXT.md`, `CONTEXT.md`, and per-TASK files.
- [references/mermaid-template.md](references/mermaid-template.md): One concise mermaid example per chart type, with gotchas.
- [references/skill-routing.md](references/skill-routing.md): Prominent skills to pick from when a TASK fits one; named in TASK Brief or Prompt.
- [references/research-template.md](references/research-template.md): Skeleton for `RESEARCH.md` index and per-question research sidecar.
