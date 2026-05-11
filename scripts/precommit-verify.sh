#!/usr/bin/env sh
set -eu

echo "[pre-commit] Formatting source files..."
pnpm format:write

if ! git diff --quiet; then
  echo ""
  echo "[pre-commit] ✗ Formatting changed files."
  echo "[pre-commit] Stage the formatting updates and retry commit."
  git --no-pager diff --stat
  exit 1
fi

echo "[pre-commit] Running type-check..."
pnpm type-check

echo "[pre-commit] ✓ All checks passed."
