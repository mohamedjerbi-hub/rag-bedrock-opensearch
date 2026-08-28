#!/usr/bin/env bash
# Détruit l'infrastructure (OpenSearch Serverless inclus)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/terraform"

echo "ATTENTION: destruction de toutes les ressources Terraform."
read -r -p "Confirmer (oui/non) : " CONFIRM
if [[ "$CONFIRM" != "oui" ]]; then
  echo "Annulé."
  exit 0
fi

cd "$TF_DIR"
terraform destroy -input=false "$@"

echo "Destruction terminée."
