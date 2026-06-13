variable "environment" {
  type        = string
  description = "Nombre del entorno (ej. QA, Prod)"
}

variable "project_name" {
  type        = string
  default     = "uce-nexus"
  description = "Nombre del proyecto"
}

variable "vpc_id" {
  type        = string
  description = "ID de la VPC donde se desplegarán las instancias y Security Groups"
}

variable "subnet_id" {
  type        = string
  description = "ID de la subred donde se desplegarán las instancias"
}

variable "subnet_b_id" {
  type        = string
  description = "ID de la subred secundaria para el ALB"
}

variable "instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Tipo de instancia para el App Server"
}

variable "bastion_instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Tipo de instancia para el Bastion Host"
}

variable "key_name" {
  type        = string
  default     = "vockey"
  description = "Nombre del par de llaves SSH preexistente"
}

variable "use_academy_iam" {
  type        = bool
  default     = true
  description = "Si es true, asocia el LabInstanceProfile preexistente de AWS Academy a las instancias"
}

variable "ami_id" {
  type        = string
  default     = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS en us-east-1
  description = "AMI ID para las instancias de Ubuntu"
}
