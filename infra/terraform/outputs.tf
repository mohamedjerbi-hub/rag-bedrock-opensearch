output "cloudfront_url" {
  description = "URL du frontend CloudFront"
  value       = module.frontend.cloudfront_url
}

output "api_gateway_url" {
  description = "URL de base API Gateway"
  value       = module.api.api_gateway_url
}

output "cognito_user_pool_id" {
  description = "ID du Cognito User Pool"
  value       = module.auth.user_pool_id
}

output "cognito_client_id" {
  description = "ID du client Cognito (app React)"
  value       = module.auth.user_pool_client_id
}

output "documents_bucket_name" {
  description = "Bucket S3 documents bruts"
  value       = module.storage.documents_bucket_name
}

output "opensearch_collection_endpoint" {
  description = "Endpoint OpenSearch Serverless"
  value       = module.search.collection_endpoint
}

output "opensearch_index_name" {
  description = "Nom de l'index k-NN"
  value       = module.search.index_name
}
