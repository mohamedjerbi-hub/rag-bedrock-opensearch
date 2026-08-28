#!/usr/bin/env bash
# Tests unitaires backend (pytest)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"
pip install -r requirements.txt -r requirements-dev.txt -q
python -m pytest tests/ -v --tb=short
