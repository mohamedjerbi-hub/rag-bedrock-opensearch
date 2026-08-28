locals {
  lambda_env = {
    AWS_REGION_NAME        = var.aws_region
    SSM_PARAMETER_PREFIX   = var.ssm_parameter_prefix
    DOCUMENTS_BUCKET       = var.documents_bucket_name
    DOCUMENTS_TABLE        = var.documents_table_name
    OPENSEARCH_ENDPOINT    = var.opensearch_endpoint
    OPENSEARCH_INDEX       = var.opensearch_index_name
    EMBEDDING_MODEL_ID     = var.bedrock_embedding_model
    LLM_MODEL_ID           = var.bedrock_llm_model
    EMBEDDING_DIMENSIONS   = tostring(var.embedding_dimensions)
    MIN_RELEVANCE_SCORE    = "0.65"
    KNN_TOP_K              = "5"
    CHUNK_SIZE_TOKENS      = "500"
    CHUNK_OVERLAP_TOKENS   = "50"
    EMBEDDING_BATCH_SIZE   = "25"
  }
}

resource "aws_lambda_function" "query_handler" {
  function_name = "${var.name_prefix}-query-handler"
  role          = var.query_handler_role_arn
  handler       = "handler.lambda_handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 512

  filename         = var.lambda_query_zip_path
  source_code_hash = filebase64sha256(var.lambda_query_zip_path)

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "ingestion_handler" {
  function_name = "${var.name_prefix}-ingestion-handler"
  role          = var.ingestion_handler_role_arn
  handler       = "handler.lambda_handler"
  runtime       = "nodejs20.x"
  timeout       = 300
  memory_size   = 1024

  filename         = var.lambda_ingestion_zip_path
  source_code_hash = filebase64sha256(var.lambda_ingestion_zip_path)

  environment {
    variables = local.lambda_env
  }
}

# Déclencheur S3 ? ingestion-handler
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingestion_handler.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.documents_bucket_arn
}

resource "aws_s3_bucket_notification" "documents" {
  bucket = var.documents_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.ingestion_handler.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "documents/"
  }

  depends_on = [aws_lambda_permission.allow_s3]
}

# API Gateway REST
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.name_prefix}-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.name_prefix}-cognito"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [var.cognito_user_pool_arn]
}

resource "aws_api_gateway_resource" "query" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "query"
}

resource "aws_api_gateway_method" "query_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.query.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "query_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.query.id
  http_method             = aws_api_gateway_method.query_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.query_handler.invoke_arn
}

resource "aws_lambda_permission" "allow_apigw_query" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.query_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.query.id,
      aws_api_gateway_method.query_post.id,
      aws_api_gateway_integration.query_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = var.name_prefix
}

# CORS — restreint au domaine CloudFront
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${var.cloudfront_allowed_origins[0]}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'POST,GET,OPTIONS'"
  }
}

resource "aws_cloudwatch_log_group" "query_handler" {
  name              = "/aws/lambda/${aws_lambda_function.query_handler.function_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "ingestion_handler" {
  name              = "/aws/lambda/${aws_lambda_function.ingestion_handler.function_name}"
  retention_in_days = 7
}
