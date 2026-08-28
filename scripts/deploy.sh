#!/usr/bin/env bash
# Déploie l'infrastructure Terraform (eu-west-1)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/terraform"
DIST="$ROOT/dist/lambdas"

echo "==> Build Lambdas"
"$ROOT/scripts/build-lambdas.sh"

echo "==> Terraform init + apply"
cd "$TF_DIR"
terraform init -input=false
terraform apply -input=false \
  -var="lambda_ingestion_zip_path=$DIST/ingestion-handler.zip" \
  -var="lambda_query_zip_path=$DIST/query-handler.zip" \
  "$@"

echo "==> Build frontend"
cd "$ROOT/frontend"
npm ci
npm run build

echo "Déploiement terminé. Voir terraform output pour les URLs."
