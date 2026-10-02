# Legacy AWS Lambda Handlers

Ces fichiers sont les handlers Lambda de **l'architecture AWS d'origine** du projet :

| Fichier | Rôle |
|---|---|
| `ingest.ts` | Ingestion de documents depuis S3, vectorisation via Cohere, indexation dans OpenSearch Serverless |
| `opensearch.ts` | Client bas niveau OpenSearch Serverless (index + search) |
| `query.ts` | Handler Lambda pour la recherche RAG (embedding requête + OpenSearch KNN) |

## Contexte d'évolution

L'architecture initiale ciblait un déploiement entièrement AWS :
- **S3** → stockage documents → déclenche `ingest.ts` via event S3
- **OpenSearch Serverless** → index vectoriel (géré par `opensearch.ts`)
- **API Gateway + Lambda** → exposition RAG (handler `query.ts`)
- **Bedrock** → LLM pour la génération de réponse

Pour l'environnement de démo et de soutenance de stage, l'architecture a été simplifiée :
- **Express.js sur Railway** → remplace API Gateway + Lambda
- **Supabase pgvector** → remplace OpenSearch Serverless pour les vecteurs
- **Cohere Rerank + Azure OpenAI** → LLM de génération (identique à la cible)
- **Stockage local + Supabase Storage** → remplace S3

Ces handlers sont **conservés à titre d'archive** et référencés par les fichiers Terraform dans `infra/`. Ils ne sont pas compilés dans le build de production.
