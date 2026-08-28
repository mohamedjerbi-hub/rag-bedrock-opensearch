output "documents_bucket_name" {
  value = aws_s3_bucket.documents.bucket
}

output "documents_bucket_arn" {
  value = aws_s3_bucket.documents.arn
}

output "documents_table_name" {
  value = aws_dynamodb_table.documents.name
}

output "documents_table_arn" {
  value = aws_dynamodb_table.documents.arn
}

output "kms_key_arn" {
  value = aws_kms_key.documents.arn
}

output "ssm_parameter_prefix" {
  value = local.ssm_prefix
}
