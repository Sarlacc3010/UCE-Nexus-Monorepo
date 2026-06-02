provider "aws" {
  region = "us-east-1"
}

# 1. Grupo de Seguridad: Abre puertos para SSH y tu API Gateway
resource "aws_security_group" "uce_nexus_sg" {
  name        = "uce_nexus_sg_final"
  description = "Permitir trafico HTTP y SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Instancia QA
resource "aws_instance" "qa_server" {
  ami             = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS
  instance_type   = "t2.micro"
  security_groups = [aws_security_group.uce_nexus_sg.name]
  key_name        = "vockey"

  tags = {
    Name        = "UCE-Nexus-QA"
    Environment = "QA"
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install docker.io docker-compose -y
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu
              EOF
}

# 3. Instancia PRODUCCIÓN
resource "aws_instance" "prod_server" {
  ami             = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS
  instance_type   = "t2.micro"
  security_groups = [aws_security_group.uce_nexus_sg.name]
  key_name        = "vockey"

  tags = {
    Name        = "UCE-Nexus-PROD"
    Environment = "Production"
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install docker.io docker-compose -y
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu
              EOF
}

# 4. Mostrar las IPs al terminar
output "QA_IP" {
  value = aws_instance.qa_server.public_ip
}

output "PROD_IP" {
  value = aws_instance.prod_server.public_ip
}