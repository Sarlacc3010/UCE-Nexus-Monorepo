provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "qa_state" {
  bucket = "uce-nexus-terraform-state-qa-v2"
}

resource "aws_s3_bucket_versioning" "qa_state_versioning" {
  bucket = aws_s3_bucket.qa_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
