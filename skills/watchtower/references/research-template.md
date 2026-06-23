# Research Template

Use these skeletons for `research`. Read-only re code. `research` writes only these files.

Rules: H1/H2/H3 only, no bold, no emojis. File refs in prose, lists, and tables must be markdown links. Write caveman-full English.

## File Tree

```text
watchtower/
  RESEARCH.md
  research/
    RESEARCH-001-short-question.md
    RESEARCH-002-short-question.md
  archive/
    <slug>/
      RESEARCH.md
      research/
```

## watchtower/RESEARCH.md

Index only. No findings body here. Append one row per research entry.

```markdown
# Research Log

## Index

| ID | Date | Question | Scope | Status | File |
|----|------|----------|-------|--------|------|
| 001 | <YYYY-MM-DD> | <short question> | <repo / module / symbol> | <DONE \| PARTIAL> | [research/RESEARCH-001-short-question.md](research/RESEARCH-001-short-question.md) |
```

Status labels: DONE when question answered with evidence; PARTIAL when GitNexus index stale or question unresolved.

## watchtower/research/RESEARCH-NNN-short-question.md

One sidecar per question. Quote real code with `path:line` before each block. Findings format follows /voyager explain format.

````markdown
# RESEARCH-NNN <question title>

## Meta

Question: <full question>
Date: <YYYY-MM-DD>
Scope: <repo / module / symbol>
Status: <DONE | PARTIAL>
Related: <TODO-NNN or ->

## Summary

<1-2 sentence direct answer>

## Core Evidence

`path/to/file.ts:123`

```ts
<short exact snippet>
```

## Runtime Flow

<concrete steps tied to quoted code>

## ASCII Flow

```text
<compact diagram: control flow, data flow, or dependency flow>
```

## Open Questions

- <what stays unknown or needs follow-up>

## File References

- `path/to/file.ts:123` - <what this proves>
````

Drop `## Open Questions` when none. `## ASCII Flow` optional for pure location answers ("where is X").
