# Watchtower Mode Flows

Step-by-step flow for each watchtower mode. SKILL.md routes here after classifying `$ARGUMENTS`. Write all plan files per Writing Style and formats in [plan-format.md](plan-format.md). Honor Working Principles (SKILL.md) in `new` and `implement`.

## Author Plan

Use for `new`. Create fresh plan when none exists, or add TASKs to active plan. `new` never archives; to start a fresh unrelated plan while one is active, run `archive` first, then `new`. When writing a TASK, name a skill only when user named it, task plainly needs it, or it materially changes how implementer should work.

Skill naming rule: use skill names sparingly. Do not scan every installed skill for routine TASKs. Use [skill-routing.md](skill-routing.md) only when task domain is non-obvious or user asks for best skill. Name `/solve` only for root-cause bugs, unclear code paths, multi-file behavior changes, or regression-risk work. Do not name `/solve` for simple copy edits, command-list additions, small CSS tweaks, file-only updates, or obvious one-file changes. If unsure, write Prompt without skill name; implementer can invoke a skill later if investigation becomes necessary.

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
5. Write one sidecar per question: `watchtower/research/RESEARCH-NNN-kebab-question.md`, using the skeleton in [research-template.md](research-template.md). Quote real code with `path:line` before each block. Caveman-full English per Writing Style.
6. Append one row per question to `## Index` in `watchtower/RESEARCH.md`. Create `RESEARCH.md` from the template if absent.
7. Open new research files in VS Code (Open In VS Code).
8. Validate edits with `git diff --check` and `git status --short`. Report per question: ID, scope, Status, sidecar link.
9. `research team` only: after writing, run Team Cleanup (Implement step 11) - shut down every spawned search agent, list them in Recap.

## Run Verification

Use for `verify`. Run checks, record live results, and promote passing TASKs. Writes no code. `verify` only promotes to `DONE`; it never sets `IN PROGRESS` or `BLOCKED`.

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
6. If `watchtower/NEXT.VERIFY.md` exists, treat it as legacy and archive it in same directory. Before archiving it, if it has an unchecked `## Pre-commit gate` item, warn user and offer to run it first; if user archives anyway, note the open gate in Recap.
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
