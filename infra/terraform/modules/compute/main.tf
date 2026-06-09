# 1. Security Group para el Bastion Host (Acceso SSH público)
resource "aws_security_group" "bastion_sg" {
  name        = "${var.project_name}-${lower(var.environment)}-bastion-sg"
  description = "Permitir SSH desde internet al Bastion"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-bastion-sg"
    Environment = var.environment
  }
}

# 2. Instancia Bastion Host
resource "aws_instance" "bastion" {
  ami                  = var.ami_id
  instance_type        = var.bastion_instance_type
  subnet_id            = var.subnet_id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]
  key_name             = var.key_name
  iam_instance_profile = var.use_academy_iam ? "LabInstanceProfile" : null

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-bastion"
    Environment = var.environment
  }
}

# 3. Security Group para el Servidor de Aplicaciones (App Server)
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-${lower(var.environment)}-app-sg"
  description = "Permitir HTTP publico y SSH solo a traves del Bastion"
  vpc_id      = var.vpc_id

  # Ingress SSH restringido exclusivamente al Security Group del Bastion
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # Ingress HTTP para la API Gateway expuesta públicamente
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTP para Micro-Frontend Host
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTP para Micro-Frontend Academic
  ingress {
    from_port   = 5001
    to_port     = 5001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTP para Micro-Frontend Campus (Gateway MFE)
  ingress {
    from_port   = 5002
    to_port     = 5002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTP para Keycloak Console
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-app-sg"
    Environment = var.environment
  }
}

# 4. Instancia Servidor de Aplicaciones (App Server)
resource "aws_instance" "app_server" {
  ami                  = var.ami_id
  instance_type        = var.instance_type
  subnet_id            = var.subnet_id
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  key_name             = var.key_name
  iam_instance_profile = var.use_academy_iam ? "LabInstanceProfile" : null

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install docker.io docker-compose -y
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu
              EOF

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-app-server"
    Environment = var.environment
  }
}
