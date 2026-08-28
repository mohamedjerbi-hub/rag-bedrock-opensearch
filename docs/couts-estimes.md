# Estimation des coûts mensuels (eu-west-1)

> Budget alarme AWS Budgets : **50 $/mois** (alerte, pas plafond hard).

| Ressource | Coût estimé | Justification |
|-----------|-------------|---------------|
| OpenSearch Serverless (VECTORSEARCH, 2 OCU min) | ~350 $/mois | **Principal poste** — détruire entre sessions (`terraform destroy`) |
| Bedrock Titan Embeddings v2 | ~0,02 $ / 1M tokens | Ingestion corpus + requêtes utilisateur |
| Bedrock Claude 3 Haiku | ~0,25 $ / 1M tokens in | Génération réponses (~500 tokens/requête) |
| Lambda (2 fonctions) | < 1 $ | Free tier largement suffisant en dev |
| API Gateway REST | < 1 $ | Faible volume stage |
| S3 (documents + frontend) | < 1 $ | Quelques Go de documents test |
| CloudFront | < 1 $ | Trafic interne faible |
| Cognito | 0 $ | < 50 000 MAU |
| DynamoDB (on-demand) | < 1 $ | Table statuts documents |
| CloudWatch Logs | < 2 $ | Rétention 7 jours |
| KMS | < 1 $ | 1 clé S3 |

**Stratégie de réduction :**
- Détruire la collection OpenSearch Serverless hors sessions de travail (?350 $/mois)
- Limiter la taille du corpus de test
- Température Bedrock = 0.2 (réponses concises)
