# Skill Routing for TODOs

When authoring a TODO (`new`), look for an installed skill that fits the work and
name it in the TODO's `Prompt`, so implementer uses it. This list includes skills
installed under `/Users/hiep/.claude/skills` at time of writing. Also scan skills
available in current session and pick any that fit the TODO.

Before naming a slash skill, verify it exists in current session or under
`/Users/hiep/.claude/skills`. If not present, describe needed capability without
slash skill name.

## Prominent skills

| Skill | Use it when a TODO needs |
|-------|--------------------------|
| /voyager | Find code by meaning - "where is X", "how does Y work", "what depends on Z". |
| /solve | Fix bug or make multi-file behavior change that needs investigation, root-cause analysis, or regression tracing. Do not use for simple one-file edits, copy changes, command label additions, small CSS tweaks, or obvious test updates. |
| /sequential-thinking | Break down complex, fuzzy, or multi-step problem before coding. |
| /qmd | Search markdown notes, docs, or knowledge base. Not code, not web. |

## Frontend and design

For any TODO about UI, website, app screen, redesign, branding, or design images,
pick from these. Default to taste-skill for new frontend work; use narrower skill
only when TODO clearly matches it.

| TODO needs | Use skill |
|------------|-----------|
| New landing page, portfolio, or marketing site | taste-skill |
| Visual upgrade to an existing site (keep the stack) | redesign-skill |
| Design references first, then build the code | image-to-code-skill |
| Logo, identity board, or brand direction | brandkit |
| Clean, minimal, Notion-like editorial UI | minimalist-skill |

Avoid naming uninstalled historical skills. If TODO needs image-only output and no
installed image skill exists, write Prompt with plain image-generation requirement
instead of slash skill name.

Full guide (source, may be updated): `/Users/hiep/Library/Mobile Documents/iCloud~md~obsidian/Documents/hiep/skill-guide/20260617-172409-frontend-skill-routing-guide.md`

## How to use this in a TODO

- While writing a TODO (`new`), explore skills that fit its work - this list plus the
  session's available skills.
- If one fits and changes how implementer should work, name it in that TODO's `Prompt`, for example: "Use /solve to ...".
- If change is small or obvious, write plain Prompt without skill name.
- If none fit, write the Prompt without a skill. Do not force one.
