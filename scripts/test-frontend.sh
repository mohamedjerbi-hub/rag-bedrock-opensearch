#!/usr/bin/env bash
# Tests unitaires frontend (Vitest)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

cd "$FRONTEND"
npm ci
npm run test
