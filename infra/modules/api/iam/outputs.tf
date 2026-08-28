output "ingestion_handler_role_arn" {
  value = aws_iam_role.ingestion_handler.arn
}

output "query_handler_role_arn" {
  value = aws_iam_role.query_handler.arn
}

output "ingestion_handler_role_name" {
  value = aws_iam_role.ingestion_handler.name
}

output "query_handler_role_name" {
  value = aws_iam_role.query_handler.name
}
