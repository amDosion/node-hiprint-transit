#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

IMAGE_NAME="${DOCKER_SMOKE_IMAGE:-node-hiprint-transit:local}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI is required for Docker smoke testing." >&2
  exit 127
fi

if docker buildx version >/dev/null 2>&1; then
  docker buildx build --load -t "$IMAGE_NAME" .
else
  docker build -t "$IMAGE_NAME" .
fi
