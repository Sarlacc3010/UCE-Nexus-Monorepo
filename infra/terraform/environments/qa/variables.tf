variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región de AWS para desplegar los recursos de QA"
}

variable "aws_profile" {
  type        = string
  default     = null
  description = "Perfil de AWS CLI local a utilizar (dejar en null para usar variables de entorno)"
}

variable "instance_type" {
  type        = string
  default     = "t3.small" # App Server
  description = "Tipo de instancia EC2 para el servidor de aplicaciones de QA"
}

variable "db_instance_type" {
  type        = string
  default     = "t3.medium" # DB Server
  description = "Tipo de instancia EC2 para el servidor de bases de datos de QA"
}

variable "bastion_instance_type" {
  type        = string
  default     = "t3.micro" # Bastion
  description = "Tipo de instancia EC2 para el Bastion Host de QA"
}

variable "key_name" {
  type        = string
  default     = "vockey"
  description = "Nombre de la llave SSH existente en AWS para acceder a las instancias"
}

variable "use_academy_iam" {
  type        = bool
  default     = true
  description = "Habilitar el uso del perfil de instancia LabInstanceProfile de AWS Academy"
}
