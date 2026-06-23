#!/usr/bin/env bash
set -euo pipefail

# Build the Watchtower VSIX and install it into VS Code.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v code >/dev/null 2>&1; then
  echo "Missing 'code' CLI. In VS Code run: Shell Command: Install 'code' command in PATH." >&2
  exit 1
fi

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
VSIX="$NAME-$VERSION.vsix"

echo "Building $VSIX ..."
npm run package

if [[ ! -f "$VSIX" ]]; then
  echo "Expected $VSIX not found after package." >&2
  exit 1
fi

echo "Installing $VSIX ..."
code --install-extension "$VSIX" --force

echo "Done: installed $VSIX. Reload the VS Code window to apply."
