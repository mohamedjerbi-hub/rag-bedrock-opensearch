terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "rag-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "rag-terraform-locks"
    encrypt        = true
  }
}
