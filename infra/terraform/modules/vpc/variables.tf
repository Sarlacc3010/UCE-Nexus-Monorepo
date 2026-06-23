variable "environment" {
  type        = string
  description = "Nombre del entorno (ej. QA, Production)"
}

variable "project_name" {
  type        = string
  default     = "uce-nexus"
  description = "Nombre del proyecto"
}

variable "vpc_cidr" {
  type        = string
  description = "Rango de red CIDR para la VPC"
}

variable "subnet_cidr" {
  type        = string
  description = "Rango de red CIDR para la subred A"
}

variable "subnet_b_cidr" {
  type        = string
  description = "Rango de red CIDR para la subred B"
}
