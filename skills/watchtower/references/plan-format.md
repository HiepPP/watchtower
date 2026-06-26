# Watchtower Plan File Formats

File model, writing style, and structure for every watchtower plan file. SKILL.md and [mode-flows.md](mode-flows.md) reference this when authoring or revising plan files. Copy-paste skeletons live in [task-template.md](task-template.md) and [research-template.md](research-template.md).

## File Model

- `watchtower/NEXT.md`: active manifest. Holds plan metadata, Tracker, dependency paths, Handoff, Archive, and optional `## Plan Verify`.
- `watchtower/CONTEXT.md`: short shared context that applies across TASKs. Keep stable and brief.
- `watchtower/tasks/TASK-NNN-kebab-title.md`: full TASK spec. Holds `## Brief` and `## Verify`. It does not hold outcome text.
- `watchtower/tasks/TASK-NNN-outcome.md`: outcome sidecar. Holds status, changed facts, preserved/created contract, verification evidence, blockers, and handoff notes for TASK `NNN`.
- `watchtower/RESEARCH.md`: research index. Append-only table of research entries (ID, date, question, scope, status, sidecar link). Holds no findings body. Written by `research`.
- `watchtower/research/RESEARCH-NNN-kebab-question.md`: research sidecar. Holds one question's findings: meta, summary, evidence with `path:line` quotes, runtime/ASCII flow, file references. Written by `research`.
- `watchtower/NEXT.VERIFY.md`: legacy verify file only. Do not create for new-format plans.
- `watchtower/archive/<slug>/`: archived plan. Mirrors the active files present at archive time (`NEXT.md`, `CONTEXT.md`, `tasks/`, `RESEARCH.md`, `research/`, legacy `NEXT.VERIFY.md`), plus `LEARN.md`: one overall session review (per-TASK plan vs shipped with mistake/cause/fix, plan-level cross-TASK issues, lessons), written at archive time.
- Root `NEXT.md`, `NEXT_*.md`, and `NEXT.VERIFY.md` are legacy ignored paths. Do not create new root NEXT files.

## Writing Style

Write every `watchtower/NEXT.md`, `watchtower/CONTEXT.md`, `watchtower/tasks/*.md`, `watchtower/RESEARCH.md`, and `watchtower/research/*.md` in caveman-full style: shortest words, no waste, same logic. Reader reviews plan files alone, before any code. Always write in English, even when user prompts in another language. Apply to all prose: Brief, Verify, Outcome, Handoff, Tracker Notes, context, and verify notes.

- Drop articles (a/an). Drop filler (just/really/basically/actually/simply), hedging, and pleasantries.
- Fragments OK. Pattern: [thing] [action] [reason]. [next step].
- Short synonyms: big not extensive, fix not "implement a solution for", use not leverage, help not facilitate, to not "in order to", then not subsequently.
- Keep all logic and info. No step dropped, no number rounded. Shorter, not thinner.
- Keep exact tokens unchanged: file paths, commands, function names, variable names, state names, assertion names, error text, mermaid node labels, and Prompt blocks.
- File references in plan prose, lists, and tables MUST be markdown links, not plain text or inline code. Use `[path](path)` for repo-relative files, for example `[watchtower/tasks/TASK-001-foo.md](watchtower/tasks/TASK-001-foo.md)`. Keep raw paths only inside command blocks, file tree blocks, and exact command examples.
- Use full clarity for risky steps: irreversible actions, data loss, and pre-commit gates.

Quick check: read each TASK file aloud. If word drops without losing fact, cut it.

## NEXT.md Structure

Use this structure unless user gives more specific format. Write all prose per Writing Style. Full copy-paste skeleton lives in [task-template.md](task-template.md).

- `## Current Active Plan` with Title, Slug, Status, Updated.
- `## Tracker` table: one row per TASK, columns Order, TASK, Group, Status, Spec, Deps, Context, Notes.
- `Spec` points to TASK file as markdown link, for example `[watchtower/tasks/TASK-NNN-kebab-title.md](watchtower/tasks/TASK-NNN-kebab-title.md)`.
- `Deps` points to TASK ids or TASK files that must be complete before work starts. Use `-` when none.
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

Each TASK gets a matching outcome sidecar `watchtower/tasks/TASK-NNN-outcome.md`. At create: `## Outcome` with `Status: TODO`. When done, update only the sidecar (never the spec) to:

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
