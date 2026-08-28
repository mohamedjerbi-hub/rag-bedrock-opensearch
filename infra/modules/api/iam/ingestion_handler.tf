variable "name_prefix" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "collection_name" {
  description = "Nom pr�visible de la collection OpenSearch Serverless"
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

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "ingestion_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ingestion_handler" {
  name               = "${var.name_prefix}-ingestion-handler"
  assume_role_policy = data.aws_iam_policy_document.ingestion_assume.json
}

# Acc�s OpenSearch Serverless
data "aws_iam_policy_document" "ingestion_opensearch_access" {
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

resource "aws_iam_role_policy" "ingestion_opensearch" {
  name   = "opensearch-access"
  role   = aws_iam_role.ingestion_handler.id
  policy = data.aws_iam_policy_document.ingestion_opensearch_access.json
}

# S3 lecture documents
data "aws_iam_policy_document" "ingestion_s3" {
  statement {
    sid    = "S3Read"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      var.documents_bucket_arn,
      "${var.documents_bucket_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "ingestion_s3" {
  name   = "s3-read"
  role   = aws_iam_role.ingestion_handler.id
  policy = data.aws_iam_policy_document.ingestion_s3.json
}

# DynamoDB statuts documents
data "aws_iam_policy_document" "ingestion_dynamodb" {
  statement {
    sid    = "DynamoDBDocuments"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
    ]
    resources = [var.documents_table_arn, "${var.documents_table_arn}/index/*"]
  }
}

resource "aws_iam_role_policy" "ingestion_dynamodb" {
  name   = "dynamodb-write"
  role   = aws_iam_role.ingestion_handler.id
  policy = data.aws_iam_policy_document.ingestion_dynamodb.json
}

# Bedrock � embeddings uniquement
data "aws_iam_policy_document" "ingestion_bedrock" {
  statement {
    sid    = "BedrockInvoke"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
    ]
    resources = [
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_embedding_model}",
    ]
  }
}

resource "aws_iam_role_policy" "ingestion_bedrock" {
  name   = "bedrock-embeddings"
  role   = aws_iam_role.ingestion_handler.id
  policy = data.aws_iam_policy_document.ingestion_bedrock.json
}

# SSM Parameter Store
data "aws_iam_policy_document" "ingestion_ssm" {
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

resource "aws_iam_role_policy" "ingestion_ssm" {
  name   = "ssm-read"
  role   = aws_iam_role.ingestion_handler.id
  policy = data.aws_iam_policy_document.ingestion_ssm.json
}

resource "aws_iam_role_policy_attachment" "ingestion_logs" {
  role       = aws_iam_role.ingestion_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
