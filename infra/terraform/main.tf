locals {
  name_prefix     = "${var.project_name}-${var.environment}"
  collection_name = "${local.name_prefix}-vectors"
}

# --- Module réseau (placeholder Sprint 1) ---
module "network" {
  source = "../modules/network"

  name_prefix = local.name_prefix
  aws_region  = var.aws_region
}

# --- Authentification Cognito ---
module "auth" {
  source = "../modules/auth"

  name_prefix = local.name_prefix
}

# --- Stockage S3 + DynamoDB + SSM ---
module "storage" {
  source = "../modules/storage"

  name_prefix             = local.name_prefix
  aws_region              = var.aws_region
  bedrock_embedding_model = var.bedrock_embedding_model_id
  bedrock_llm_model       = var.bedrock_llm_model_id
  opensearch_index_name   = var.opensearch_index_name
  embedding_dimensions    = var.embedding_dimensions
}

# --- IAM Lambda (créé avant OpenSearch pour éviter la dépendance circulaire) ---
module "lambda_iam" {
  source = "../modules/api/iam"

  name_prefix            = local.name_prefix
  aws_region             = var.aws_region
  collection_name        = local.collection_name
  documents_bucket_arn   = module.storage.documents_bucket_arn
  documents_table_arn    = module.storage.documents_table_arn
  bedrock_embedding_model = var.bedrock_embedding_model_id
  bedrock_llm_model      = var.bedrock_llm_model_id
}

# --- OpenSearch Serverless ---
module "search" {
  source = "../modules/search"

  name_prefix          = local.name_prefix
  aws_region           = var.aws_region
  aws_account_id       = data.aws_caller_identity.current.account_id
  index_name           = var.opensearch_index_name
  embedding_dimensions = var.embedding_dimensions
  ingestion_role_arn   = module.lambda_iam.ingestion_handler_role_arn
  query_role_arn       = module.lambda_iam.query_handler_role_arn
}

# --- API Gateway + Lambdas ---
module "api" {
  source = "../modules/api"

  name_prefix               = local.name_prefix
  aws_region                = var.aws_region
  cognito_user_pool_arn     = module.auth.user_pool_arn
  cognito_user_pool_id      = module.auth.user_pool_id
  documents_bucket_name     = module.storage.documents_bucket_name
  documents_bucket_arn      = module.storage.documents_bucket_arn
  documents_table_name      = module.storage.documents_table_name
  documents_table_arn       = module.storage.documents_table_arn
  opensearch_collection_arn = module.search.collection_arn
  opensearch_endpoint       = module.search.collection_endpoint
  opensearch_index_name     = var.opensearch_index_name
  bedrock_embedding_model   = var.bedrock_embedding_model_id
  bedrock_llm_model         = var.bedrock_llm_model_id
  embedding_dimensions      = var.embedding_dimensions
  lambda_query_zip_path     = var.lambda_query_zip_path
  lambda_ingestion_zip_path = var.lambda_ingestion_zip_path
  ssm_parameter_prefix      = module.storage.ssm_parameter_prefix
  cloudfront_allowed_origins = var.cloudfront_allowed_origins
  ingestion_handler_role_arn = module.lambda_iam.ingestion_handler_role_arn
  query_handler_role_arn    = module.lambda_iam.query_handler_role_arn
  collection_name           = local.collection_name

  depends_on = [module.search]
}

# --- Frontend S3 + CloudFront ---
module "frontend" {
  source = "../modules/frontend"

  name_prefix = local.name_prefix
}

data "aws_caller_identity" "current" {}

# --- Alarme budget ---
resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = []
  }
}
