variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región de AWS para desplegar los recursos de Producción"
}

variable "aws_profile" {
  type        = string
  default     = null
  description = "Perfil de AWS CLI local a utilizar (dejar en null para usar variables de entorno)"
}

variable "instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Tipo de instancia EC2 para el servidor de aplicaciones de Producción"
}

variable "bastion_instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Tipo de instancia EC2 para el Bastion Host de Producción"
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
