# Runbook opérationnel

## Déploiement initial

```bash
# 1. Bootstrap state Terraform (une seule fois)
cd infra/bootstrap && terraform init && terraform apply

# 2. Configurer les variables
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
# Éditer terraform.tfvars avec vos valeurs

# 3. Package des Lambdas
cd ../../
./scripts/build-lambdas.sh        # Linux/macOS
# ou .\scripts\build-lambdas.ps1  # Windows

# 4. Déployer l'infrastructure
./scripts/deploy.sh
```

## Tests locaux

```bash
# Backend (pytest)
./scripts/test-backend.sh

# Frontend (Vitest)
./scripts/test-frontend.sh
```

## Destruction (entre sessions)

```bash
./scripts/destroy.sh
```

> Vérifier dans la console AWS que la collection OpenSearch Serverless est bien supprimée.

## Relance ingestion d'un document en erreur

1. Vérifier le statut : `GET /documents/{id}/status`
2. Corriger la cause (format, taille, permissions)
3. Re-téléverser le fichier sur S3 (même clé ou nouvelle clé)
4. L'événement S3 relance automatiquement `ingestion-handler`

## Logs

```bash
aws logs tail /aws/lambda/rag-query-handler --follow --region eu-west-1
aws logs tail /aws/lambda/rag-ingestion-handler --follow --region eu-west-1
```
