variable "name_prefix" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "bedrock_embedding_model" {
  type = string
}

variable "bedrock_llm_model" {
  type = string
}

variable "opensearch_index_name" {
  type = string
}

variable "embedding_dimensions" {
  type = number
}
