#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run verify

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  npm run check:docker
fi
