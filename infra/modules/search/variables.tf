variable "project" {
  type        = string
  description = "Nom du projet (ex: rag-bedrock)"
  default     = "rag-bedrock"
}

variable "index_name" {
  type        = string
  description = "Nom de l'index dans OpenSearch Serverless"
  default     = "docs-index"
}

variable "admin_arn" {
  type        = string
  description = "ARN du role admin utilise par le developpeur (pour creer l'index avec Terraform)"
}

variable "ingestion_lambda_arn" {
  type        = string
  description = "ARN du role de la Lambda d'ingestion (ecriture de documents)"
}

variable "query_lambda_arn" {
  type        = string
  description = "ARN du role de la Lambda de question (lecture de documents)"
}

variable "vpc_endpoint_id" {
  type        = string
  description = "ID du VPC Endpoint vers lequel on restreint l'access (OpenSearch Prive)"
}
