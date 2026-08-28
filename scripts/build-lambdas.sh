#!/usr/bin/env bash
# Package les Lambdas Python (ingestion + query) avec dépendances et shared/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
DIST="$ROOT/dist/lambdas"

rm -rf "$DIST"
mkdir -p "$DIST/ingestion" "$DIST/query"

echo "==> Installation dépendances backend"
pip install -r "$BACKEND/requirements.txt" -t "$DIST/ingestion" -q
pip install -r "$BACKEND/requirements.txt" -t "$DIST/query" -q

echo "==> Copie code shared + handlers"
cp -r "$BACKEND/shared" "$DIST/ingestion/"
cp -r "$BACKEND/shared" "$DIST/query/"
cp -r "$BACKEND/ingestion_handler" "$DIST/ingestion/"
cp -r "$BACKEND/query_handler" "$DIST/query/"

echo "==> Création des ZIP"
(cd "$DIST/ingestion" && zip -r "$DIST/ingestion-handler.zip" . -q)
(cd "$DIST/query" && zip -r "$DIST/query-handler.zip" . -q)

echo "OK: $DIST/ingestion-handler.zip"
echo "OK: $DIST/query-handler.zip"
