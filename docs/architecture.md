# Architecture

## Flux de lecture (query)

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant CF as CloudFront
    participant AG as API_Gateway
    participant Q as query_handler
    participant B as Bedrock
    participant OS as OpenSearch

    U->>CF: Question via React
    CF->>AG: POST /query + JWT
    AG->>Q: Invoke Lambda
    Q->>B: Titan Embeddings (question)
    Q->>OS: k-NN top 5 (filtre droits)
    Q->>B: Claude 3 Haiku (prompt + passages)
    Q-->>U: answer + sources[] + métriques
```

## Flux d'écriture (ingestion)

```mermaid
sequenceDiagram
    participant A as Admin
    participant S3 as S3_documents
    participant I as ingestion_handler
    participant B as Bedrock
    participant OS as OpenSearch
    participant DDB as DynamoDB

    A->>S3: Upload via URL pré-signée
    S3->>I: Event ObjectCreated
    I->>S3: Lecture document
    I->>I: Extraction + chunking 500/50
    I->>B: Titan Embeddings (lots)
    I->>OS: Bulk index vecteurs
    I->>DDB: Statut indexed / error
```

## Composants Terraform

| Module | Ressources principales |
|--------|------------------------|
| network | VPC endpoints (optionnel dev) |
| auth | Cognito User Pool, groupes user/admin |
| storage | S3 KMS, DynamoDB documents, SSM |
| search | OpenSearch Serverless collection + index k-NN |
| api | API Gateway, Lambdas, IAM |
| frontend | S3 site statique, CloudFront |
