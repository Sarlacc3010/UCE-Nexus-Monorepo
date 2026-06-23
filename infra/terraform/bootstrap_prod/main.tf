provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "prod_state" {
  bucket = "uce-nexus-terraform-state-prod-v2"
}

resource "aws_s3_bucket_versioning" "prod_state_versioning" {
  bucket = aws_s3_bucket.prod_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
