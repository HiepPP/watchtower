# NEXT TASK Template

Use these skeletons for new-format plans.

Rules: H1/H2/H3 only, no bold, no emojis. Do not create `watchtower/NEXT.VERIFY.md` for new plans. File refs in prose, lists, and tables must be markdown links.

## File Tree

```text
watchtower/
  NEXT.md
  CONTEXT.md
  tasks/
    TASK-001-short-title.md
    TASK-001-outcome.md
    TASK-002-short-title.md
    TASK-002-outcome.md
  archive/
    <slug>/
      NEXT.md
      CONTEXT.md
      tasks/
```

## watchtower/NEXT.md

```markdown
# NEXT

## Current Active Plan

- Title: <plan title>
- Slug: <YYYYMMDD-kebab-title> (required; assigned once at create; archive reuses exact value)
- Status: <ACTIVE | DONE | ARCHIVED>
- Updated: <YYYY-MM-DD>

## Tracker

One row per TASK. Group ties together items that ship as one transaction.

| Order | TASK | Group | Status | Spec | Deps | Context | Notes |
|-------|------|-------|--------|------|------|---------|-------|
| 1 | TASK-001 <short title> | A | TODO | [watchtower/tasks/TASK-001-short-title.md](watchtower/tasks/TASK-001-short-title.md) | - | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | <one-line note> |
| 2 | TASK-002 <short title> | A | TODO | [watchtower/tasks/TASK-002-short-title.md](watchtower/tasks/TASK-002-short-title.md) | TASK-001 | [watchtower/CONTEXT.md](watchtower/CONTEXT.md) | Depends on TASK-001. |
| 3 | TASK-003 <short title> | standalone | TODO | [watchtower/tasks/TASK-003-short-title.md](watchtower/tasks/TASK-003-short-title.md) | - | - | <one-line note> |

TASK Status labels: TODO, IN PROGRESS, BLOCKED, DONE.
Plan-level Status header: ACTIVE while any row is open, DONE when all rows DONE, ARCHIVED after archive.

## Plan Verify

- <command or cross-TASK check that proves full plan works>

## Handoff

- Next action: <single next step fresh session should take>

## Archive

- None.
```

## watchtower/CONTEXT.md

```markdown
# Plan Context

## Shared Context

- <short fact that applies across TASKs>
- <constraint, command, or project rule used by more than one TASK>

## Decisions

- <decision already made>

## Open Decisions

- None.

## References

- [<path>](<path>) or `<command>`
```

## watchtower/tasks/TASK-001-short-title.md

````markdown
# TASK-001 <title>

Group: A (<why these items are grouped, or standalone>)

## Brief

Goal: <outcome in one or two sentences>.

Change: <before -> after in one line>

How:

- <step 1>
- <step 2>

Files:

- [<path>](<path>) (<what changes here>)
- [<path>](<path>) (<what changes here>)

Expected result:

- <observable outcome that proves done>
- <observable outcome that proves done>

Prompt (optional):

```text
<exact prompt only when it reduces ambiguity; if a skill clearly fits, name it, e.g. "Use /solve to ...">
```

## Verify

- <command or manual check> -> <expected result>
- <command or manual check> -> <expected result>
````

## watchtower/tasks/TASK-001-outcome.md

````markdown
# TASK-001 Outcome

## Outcome

Status: TODO
````

## TASK Outcome When Done

```markdown
# TASK-001 Outcome

## Outcome

Status: DONE

Changed:
- <what changed>

Contract:
- <behavior or interface preserved/created>

Verified:
- <command/check> -> <real result>
```

## Optional TASK Chart Example

Use one chart only when it makes logic clearer than text.

```mermaid
sequenceDiagram
  participant U as User
  participant S as Service
  U->>S: <request>
  S-->>U: <response>
```
