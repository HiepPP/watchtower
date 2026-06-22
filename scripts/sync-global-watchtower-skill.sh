#!/usr/bin/env bash
set -euo pipefail

GLOBAL_SKILL_DIR="/Users/hiep/.claude/skills/watchtower"
REPO_SKILL_DIR="/Users/hiep/Projects/watchtower/skills/watchtower"

if [[ ! -d "$GLOBAL_SKILL_DIR" ]]; then
  echo "Missing global skill: $GLOBAL_SKILL_DIR" >&2
  exit 1
fi

mkdir -p "$REPO_SKILL_DIR"
rsync -a "$GLOBAL_SKILL_DIR"/ "$REPO_SKILL_DIR"/

echo "Synced $GLOBAL_SKILL_DIR -> $REPO_SKILL_DIR"
