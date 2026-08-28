# Corpus de test

Placez ici les documents de démonstration pour valider la chaîne d'ingestion (Sprint 2).

Formats supportés : PDF, DOCX, Markdown.

## Indexation manuelle (dev)

```bash
aws s3 cp ./mon-document.pdf s3://BUCKET/documents/test/mon-document.pdf --region eu-west-1
```

L'événement S3 déclenche automatiquement `ingestion-handler`.
