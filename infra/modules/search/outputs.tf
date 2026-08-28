output "collection_endpoint" {
  description = "URL publique de l'API de donnees OpenSearch Serverless"
  value       = aws_opensearchserverless_collection.rag_collection.collection_endpoint
}

output "dashboard_endpoint" {
  description = "Lien vers la console Dashboard OpenSearch"
  value       = aws_opensearchserverless_collection.rag_collection.dashboard_endpoint
}

output "index_name" {
  description = "Le nom de l'index des documents a utiliser dans les variables des Lambdas"
  value       = opensearch_index.rag_index.name
}
