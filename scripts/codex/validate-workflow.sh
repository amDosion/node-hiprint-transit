#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

required_files=(
  "PLANS.md"
  "docs/runbook/STATUS.md"
  "scripts/run-all.sh"
  "scripts/codex/noninteractive-exec.sh"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required Codex workflow file: $file" >&2
    exit 1
  fi
done

if ! grep -q "ALLOW_DESTRUCTIVE=1" PLANS.md; then
  echo "PLANS.md must document the destructive-operation gate." >&2
  exit 1
fi

if ! grep -q "npm run verify" PLANS.md; then
  echo "PLANS.md must document the default verification command." >&2
  exit 1
fi

echo "Codex workflow files verified."
