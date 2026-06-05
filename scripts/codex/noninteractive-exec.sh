#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: scripts/codex/noninteractive-exec.sh <codex prompt or args>" >&2
  exit 64
fi

if [[ "${ALLOW_DESTRUCTIVE:-0}" != "1" ]]; then
  export CODEX_ALLOW_DESTRUCTIVE=0
fi

export CI="${CI:-1}"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI is required for noninteractive execution." >&2
  exit 127
fi

exec codex exec --approval-policy never "$@"
