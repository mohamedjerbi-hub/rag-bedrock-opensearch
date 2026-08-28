output "api_gateway_url" {
  value = "${aws_api_gateway_stage.main.invoke_url}"
}

output "query_handler_arn" {
  value = aws_lambda_function.query_handler.arn
}

output "ingestion_handler_arn" {
  value = aws_lambda_function.ingestion_handler.arn
}
