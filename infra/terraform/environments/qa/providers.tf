terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Configuración del Backend S3 para guardar el estado.
  # NOTA: El bucket S3 especificado debe ser creado ANTES de ejecutar 'terraform init'.
  backend "s3" {
    bucket         = "uce-nexus-terraform-state-qa"
    key            = "qa/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    # dynamodb_table = "uce-nexus-locks-qa" # Opcional para habilitar bloqueo de estado
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
