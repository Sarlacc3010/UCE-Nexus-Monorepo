variable "environment" {
  type        = string
  description = "Nombre del entorno (ej. QA, Production)"
}

variable "project_name" {
  type        = string
  default     = "uce-nexus"
  description = "Nombre del proyecto"
}

variable "vpc_id" {
  type        = string
  description = "ID de la VPC para asociar los Security Groups"
}

variable "subnet_id" {
  type        = string
  description = "ID de la subred principal pública"
}

variable "subnet_b_id" {
  type        = string
  description = "ID de la subred secundaria"
}

variable "instance_type" {
  type        = string
  default     = "t3.small"
  description = "Tipo de instancia EC2 para el App Server"
}

variable "db_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "Tipo de instancia EC2 para el DB Server"
}

variable "bastion_instance_type" {
  type        = string
  default     = "t3.micro"
  description = "Tipo de instancia EC2 para el Bastion Host"
}

variable "key_name" {
  type        = string
  default     = "vockey"
  description = "Nombre del par de llaves SSH preexistente"
}

variable "use_academy_iam" {
  type        = bool
  default     = true
  description = "Asociar el LabInstanceProfile preexistente de AWS Academy"
}

variable "ami_id" {
  type        = string
  default     = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS en us-east-1
  description = "AMI ID por defecto para las instancias"
}
