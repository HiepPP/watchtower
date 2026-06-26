---
name: watchtower
description: Use when creating, updating, archiving, reviewing, verifying, researching, or implementing repo-local TASK plans in watchtower/NEXT.md, or asking "what next?" / "next steps?" during repo work.
argument-hint: "[new|progress|archive|verify|next|research|research team|implement|implement team] [--repo path] [summary]"
disable-model-invocation: false
user-invocable: true
license: MIT
---

## Purpose

Maintain repo-local planning files. Keep `watchtower/NEXT.md` as active manifest, `watchtower/CONTEXT.md` as short shared context, TASK briefs under `watchtower/tasks/`, and old plans under `watchtower/archive/`.

TASK specs and outcome sidecars stay separate: specs hold Brief + Verify, outcomes hold results. `implement` loads remaining non-DONE specs in Tracker order plus required context; it reads outcome sidecars only when the prompt asks. `research` maps codebase questions via `/voyager` into `watchtower/RESEARCH.md`, read-only re code.

This file routes. Mode flows live in `references/mode-flows.md`; plan file formats in `references/plan-format.md`. Read the routed mode flow before acting.

## When to Use

Use when the user invokes `/watchtower` or asks to write, revise, archive, review, verify, or implement a repo-local NEXT plan. Also for natural-language "what next?" / "what's next?" / "next steps?" asks while in a repo.

Only `implement` writes code. All other modes never write code. `verify` records results in TASK outcome sidecars. `research` writes only `watchtower/RESEARCH.md` and research sidecars.

Say "fan out" / "team" to run `implement` or `research` with subagents (see Arguments); every spawned agent is shut down after (Team Cleanup).

## Arguments

Use `$ARGUMENTS` to classify request. Each mode's step-by-step flow is the same-named section in `references/mode-flows.md`.

| Argument | Purpose | Mutates |
|----------|---------|---------|
| `new` | Create fresh manifest plan or add TASK files to active plan | `NEXT.md` + `CONTEXT.md` + `tasks/` |
| `progress` | Mark TASK status or add session notes | `NEXT.md` Tracker + TASK outcome sidecar |
| `archive` | Revise session, write LEARN.md, then archive manifest, context, TASK files, research files, and any legacy verify file | moves active plan files to `watchtower/archive/` + writes `LEARN.md` |
| `verify` | Run checks from TASK files, record each result, promote passing TASKs to `DONE` | TASK outcome sidecar + Tracker Status |
| `next` | Read active plan and propose next action from Tracker | nothing |
| `research` | Map 1+ codebase questions via /voyager, write findings | `RESEARCH.md` + `research/` sidecars |
| `research team` | Same as `research`, but one search subagent per question, then auto shut down every spawned agent | `RESEARCH.md` + `research/` sidecars |
| `implement` | Load all remaining non-DONE TASK specs plus required context, then build sequentially in this session | code + plan files + TASK outcome sidecars |
| `implement team` | Same as `implement`, but build with a team of subagents, then auto shut down every spawned background agent. Triggers include `team` and `fan out subagents` | code + plan files |

`--repo path` is a modifier, not a mode: use given repository instead of current git root.

Team keywords trigger the `*team` variant, alone or with the base mode: `team`, `with team`, `team of subagent(s)`, `subagent team`, `fan out`, `fan out subagents`, `fan out a team`. `implement team` runs subagents per work group; `research team` runs one search agent per question. No team keyword: run sequential.

Arguments may chain modes in one call, for example `new and implement`, or `archive, and /commit`. Run in order given. A `/command` token is an external skill, not a watchtower mode; invoke it after watchtower modes finish.

## Workflow

1. Resolve repo root. Use `--repo path` when given; else current git root. Prove it with `git -C <path> rev-parse --show-toplevel`. Stop if target repo cannot be proven.
2. For `new`, `progress`, `archive`, and `verify`, read before writing: `.gitignore`, `watchtower/NEXT.md` if present, `watchtower/CONTEXT.md` if present, `watchtower/NEXT.VERIFY.md` if present, TASK filenames and outcome filenames under `watchtower/tasks/`, and archive filenames under `watchtower/archive/`. For `implement`, use the minimal load set in Implement. For `next`, skip this broad read; Propose Next owns minimal load. For `research`, skip this broad read; Map Research owns minimal load.
3. Do not add `/watchtower/` to `.gitignore`. If `watchtower/` is already ignored, keep current state. If tracked, keep tracked.
4. Detect plan shape before routing:
   - New format: `watchtower/NEXT.md` Tracker has `Spec`, `Deps`, and `Context` columns. TASK detail lives under `watchtower/tasks/`.
   - Legacy format: `watchtower/NEXT.md` has inline `## TODO N` sections or `watchtower/NEXT.VERIFY.md` exists as active verify file.
   - Do not migrate legacy plans during `next`, `verify`, or `implement`.
5. Classify from `$ARGUMENTS`, then read and follow that mode's flow in `references/mode-flows.md`:
   - `new` -> Author Plan
   - `next` or natural-language "what next?" -> Propose Next
   - `research` -> Map Research (sequential, this session)
   - `research team` or `research` with `fan out` -> Map Research (team of subagents, then Team Cleanup)
   - `verify` -> Run Verification
   - `implement` -> Implement (sequential, this session)
   - `implement team` or `fan out subagents` -> Implement (team of subagents, then Team Cleanup)
   - `archive` -> Archive
   - `progress` -> Progress
6. Make smallest matching edit. Author or revise plan files per `references/plan-format.md` (File Model, Writing Style, NEXT.md Structure, TASK File Format); copy-paste skeleton in `references/task-template.md`.
7. Validate plan-file edits with `git diff --check` and `git status --short -- next .gitignore`. `next` skips this step. `implement` runs its own verification.

## Working Principles

Honor these in `new` and `implement`.

- Lean first. For clear tasks, choose simplest path and continue. Ask only when plan is unclear, data may be lost, shipped work conflicts with plan, or user choice changes outcome.
- Keep it simple. Build minimum TASK needs. No speculative features, abstractions, or config TASK did not ask for.
- Stay surgical. Touch only what TASK needs. Match existing style. Do not refactor unrelated code. Remove only orphans from this change.
- Verify real result. Each TASK has checkable `## Verify` section. Run needed checks, then record real results in its `TASK-NNN-outcome.md` sidecar.

## Rules

Mode-specific rules live in each mode flow (`references/mode-flows.md`). Global invariants:

- NEXT files use H1/H2/H3 headings only; no bold, no emojis. Write all plan prose per Writing Style, in English, with file references as markdown links and technical tokens exact.
- Slug: `new` assigns and writes `Slug:` at CREATE; `archive` reuses that exact slug and MUST NOT guess or derive it. Stop if `Slug:` is missing or empty.
- `implement` is the only mode that writes code. `next`, `research`, and `research team` never edit `NEXT.md`, `CONTEXT.md`, or TASK files; `research` writes only `watchtower/RESEARCH.md` and `research/` sidecars.
- `*team` modes MUST run Team Cleanup at the end: shut down every spawned agent.
- Do not delete archive files. Do not change `.gitignore` to ignore or unignore `watchtower/`.
- Preserve unrelated worktree changes.
- End task output with `## Recap`.

## References

- [references/mode-flows.md](references/mode-flows.md): Step-by-step flow per mode (Author Plan, Open In VS Code, Propose Next, Map Research, Run Verification, Progress, Implement, Archive + LEARN skeleton).
- [references/plan-format.md](references/plan-format.md): File Model, Writing Style, NEXT.md Structure, TASK File Format, outcome sidecar shape.
- [references/task-template.md](references/task-template.md): Full copy-paste skeleton for `NEXT.md`, `CONTEXT.md`, and per-TASK files.
- [references/mermaid-template.md](references/mermaid-template.md): One concise mermaid example per chart type, with gotchas.
- [references/skill-routing.md](references/skill-routing.md): Prominent skills to pick from when a TASK fits one; named in TASK Brief or Prompt.
- [references/research-template.md](references/research-template.md): Skeleton for `RESEARCH.md` index and per-question research sidecar.
