variable "environment" {
  type        = string
  description = "Nombre del entorno (ej. QA, Prod)"
}

variable "project_name" {
  type        = string
  default     = "uce-nexus"
  description = "Nombre del proyecto"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "Rango de red CIDR para la VPC"
}

variable "subnet_cidr" {
  type        = string
  default     = "10.0.1.0/24"
  description = "Rango de red CIDR para la Subred pública A"
}

variable "subnet_b_cidr" {
  type        = string
  default     = "10.0.2.0/24"
  description = "Rango de red CIDR para la Subred pública B (Requerida por ALB)"
}
