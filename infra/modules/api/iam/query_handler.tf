variable "name_prefix" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "collection_name" {
  description = "Nom prévisible de la collection OpenSearch Serverless"
  type        = string
}

variable "documents_bucket_arn" {
  type = string
}

variable "documents_table_arn" {
  type = string
}

variable "bedrock_embedding_model" {
  type = string
}

variable "bedrock_llm_model" {
  type = string
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "query_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "query_handler" {
  name               = "${var.name_prefix}-query-handler"
  assume_role_policy = data.aws_iam_policy_document.query_assume.json
}

# Accès OpenSearch Serverless
data "aws_iam_policy_document" "query_opensearch_access" {
  statement {
    sid    = "OpenSearchServerless"
    effect = "Allow"
    actions = [
      "aoss:APIAccessAll",
    ]
    resources = [
      "arn:aws:aoss:${var.aws_region}:${data.aws_caller_identity.current.account_id}:collection/${var.collection_name}",
    ]
  }
}

resource "aws_iam_role_policy" "query_opensearch" {
  name   = "opensearch-access"
  role   = aws_iam_role.query_handler.id
  policy = data.aws_iam_policy_document.query_opensearch_access.json
}

# DynamoDB lecture statuts documents
data "aws_iam_policy_document" "query_dynamodb" {
  statement {
    sid    = "DynamoDBDocuments"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
    ]
    resources = [var.documents_table_arn, "${var.documents_table_arn}/index/*"]
  }
}

resource "aws_iam_role_policy" "query_dynamodb" {
  name   = "dynamodb-read-write"
  role   = aws_iam_role.query_handler.id
  policy = data.aws_iam_policy_document.query_dynamodb.json
}

# S3 — URLs pré-signées upload (admin)
data "aws_iam_policy_document" "query_s3" {
  statement {
    sid    = "S3PresignedUpload"
    effect = "Allow"
    actions = [
      "s3:PutObject",
    ]
    resources = ["${var.documents_bucket_arn}/documents/*"]
  }
}

resource "aws_iam_role_policy" "query_s3" {
  name   = "s3-upload"
  role   = aws_iam_role.query_handler.id
  policy = data.aws_iam_policy_document.query_s3.json
}

# Bedrock — embeddings + LLM
data "aws_iam_policy_document" "query_bedrock" {
  statement {
    sid    = "BedrockInvoke"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]
    resources = [
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_embedding_model}",
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_llm_model}",
    ]
  }
}

resource "aws_iam_role_policy" "query_bedrock" {
  name   = "bedrock-all"
  role   = aws_iam_role.query_handler.id
  policy = data.aws_iam_policy_document.query_bedrock.json
}

# SSM Parameter Store
data "aws_iam_policy_document" "query_ssm" {
  statement {
    sid    = "SSMRead"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.name_prefix}/*"]
  }
}

resource "aws_iam_role_policy" "query_ssm" {
  name   = "ssm-read"
  role   = aws_iam_role.query_handler.id
  policy = data.aws_iam_policy_document.query_ssm.json
}

resource "aws_iam_role_policy_attachment" "query_logs" {
  role       = aws_iam_role.query_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
