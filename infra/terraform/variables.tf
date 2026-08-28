variable "aws_region" {
  description = "Région AWS de déploiement"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Préfixe de nommage des ressources"
  type        = string
  default     = "rag"
}

variable "environment" {
  description = "Environnement (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "budget_limit_usd" {
  description = "Plafond alarme AWS Budgets en USD"
  type        = number
  default     = 50
}

variable "cloudfront_allowed_origins" {
  description = "Origines CORS autorisées (domaine CloudFront)"
  type        = list(string)
  default     = ["https://localhost:5173"]
}

variable "embedding_dimensions" {
  description = "Dimensions des embeddings Titan v2"
  type        = number
  default     = 1024
}

variable "opensearch_index_name" {
  description = "Nom de l'index vectoriel k-NN"
  type        = string
  default     = "documents-knn"
}

variable "bedrock_embedding_model_id" {
  description = "ID modèle Bedrock pour embeddings"
  type        = string
  default     = "amazon.titan-embed-text-v2:0"
}

variable "bedrock_llm_model_id" {
  description = "ID modèle Bedrock pour génération"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "lambda_query_zip_path" {
  description = "Chemin vers le zip de query-handler"
  type        = string
  default     = "../../dist/query-handler.zip"
}

variable "lambda_ingestion_zip_path" {
  description = "Chemin vers le zip de ingestion-handler"
  type        = string
  default     = "../../dist/ingestion-handler.zip"
}
