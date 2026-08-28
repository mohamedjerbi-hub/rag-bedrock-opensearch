terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Requis pour gérer les index à l'intérieur de la collection Serverless
    opensearch = {
      source  = "opensearch-project/opensearch"
      version = ">= 2.2.0"
    }
  }
}

# 1. Politique de chiffrement
resource "aws_opensearchserverless_security_policy" "encryption" {
  name        = "${var.project}-encrypt"
  type        = "encryption"
  description = "Politique KMS (AWSOwnedKey pour reduire les couts)"
  policy      = templatefile("${path.module}/policies/encryption.json", {
    collection_name = "${var.project}-rag"
  })
}

# 2. Politique reseau
resource "aws_opensearchserverless_security_policy" "network" {
  name        = "${var.project}-network"
  type        = "network"
  description = "Restreint l'acces aux VPC Endpoints uniquement"
  policy      = templatefile("${path.module}/policies/network.json", {
    collection_name = "${var.project}-rag",
    vpc_endpoint_id = var.vpc_endpoint_id
  })
}

# 3. Politique d'acces aux donnees
resource "aws_opensearchserverless_access_policy" "data_access" {
  name        = "${var.project}-access"
  type        = "data"
  description = "Moindre privilege pour IAM roles"
  policy      = templatefile("${path.module}/policies/data_access.json", {
    collection_name = "${var.project}-rag",
    admin_arn       = var.admin_arn,
    ingestion_arn   = var.ingestion_lambda_arn,
    query_arn       = var.query_lambda_arn
  })
}

# 4. Collection OpenSearch Serverless
resource "aws_opensearchserverless_collection" "rag_collection" {
  name             = "${var.project}-rag"
  type             = "VECTORSEARCH"
  description      = "Base vectorielle pour les embeddings de documents RAG"

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network,
    aws_opensearchserverless_access_policy.data_access
  ]
}

# Provider opensearch (delegation SigV4 vers AWS pour authentifier)
provider "opensearch" {
  url         = aws_opensearchserverless_collection.rag_collection.collection_endpoint
  healthcheck = false
}

# 5. Creation de l'index k-NN HNSW cosinus 1024d
resource "opensearch_index" "rag_index" {
  name = var.index_name

  body = jsonencode({
    settings = {
      "index.knn" = true
    }
    mappings = {
      properties = {
        embedding = {
          type      = "knn_vector"
          dimension = 1024
          method = {
            name       = "hnsw"
            engine     = "nmslib"
            space_type = "cosinesimil"
          }
        }
        documentId = { type = "keyword" }
        title      = { type = "text" }
        content    = { type = "text" } # Texte complet pour LLM
      }
    }
  })

  depends_on = [
    aws_opensearchserverless_collection.rag_collection
  ]
}
