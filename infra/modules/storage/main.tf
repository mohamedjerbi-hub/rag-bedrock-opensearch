resource "aws_kms_key" "documents" {
  description             = "Chiffrement bucket documents RAG"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "documents" {
  name          = "alias/${var.name_prefix}-documents"
  target_key_id = aws_kms_key.documents.key_id
}

resource "aws_s3_bucket" "documents" {
  bucket = "${var.name_prefix}-documents-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.documents.arn
    }
  }
}

resource "aws_dynamodb_table" "documents" {
  name         = "${var.name_prefix}-documents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "documentId"

  attribute {
    name = "documentId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }
}

locals {
  ssm_prefix = "/${var.name_prefix}"
}

resource "aws_ssm_parameter" "bedrock_embedding_model" {
  name  = "${local.ssm_prefix}/bedrock/embedding-model-id"
  type  = "String"
  value = var.bedrock_embedding_model
}

resource "aws_ssm_parameter" "bedrock_llm_model" {
  name  = "${local.ssm_prefix}/bedrock/llm-model-id"
  type  = "String"
  value = var.bedrock_llm_model
}

resource "aws_ssm_parameter" "opensearch_index_name" {
  name  = "${local.ssm_prefix}/opensearch/index-name"
  type  = "String"
  value = var.opensearch_index_name
}

resource "aws_ssm_parameter" "embedding_dimensions" {
  name  = "${local.ssm_prefix}/bedrock/embedding-dimensions"
  type  = "String"
  value = tostring(var.embedding_dimensions)
}

data "aws_caller_identity" "current" {}
