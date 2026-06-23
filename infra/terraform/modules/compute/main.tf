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

# 2.1. Elastic IP estática para el Bastion Host
resource "aws_eip" "bastion_eip" {
  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-bastion-eip"
    Environment = var.environment
  }
}

# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-${lower(var.environment)}-alb-sg"
  description = "Permitir HTTP publico al ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Soporte para gRPC/REST de microservicios expuestos a través de puertos específicos
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5002
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
    Name        = "${var.project_name}-${lower(var.environment)}-alb-sg"
    Environment = var.environment
  }
}

# 3. Security Group para el Servidor de Aplicaciones (App Server)
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-${lower(var.environment)}-app-sg"
  description = "Permitir HTTP desde ALB y SSH desde Bastion"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # Ingress genérico desde ALB
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
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

# 4. Security Group para el Servidor de Bases de Datos (DB Server)
resource "aws_security_group" "db_sg" {
  name        = "${var.project_name}-${lower(var.environment)}-db-sg"
  description = "Permitir trafico de bases de datos desde App Server y SSH desde Bastion"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # PostgreSQL
  ingress {
    from_port       = 5432
    to_port         = 5434
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # Keycloak / IAM logical db port
  ingress {
    from_port       = 5431
    to_port         = 5431
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # MongoDB
  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # Redis
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # RabbitMQ
  ingress {
    from_port       = 5672
    to_port         = 5672
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }
  ingress {
    from_port       = 15672
    to_port         = 15672
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # Kafka / Zookeeper
  ingress {
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }
  ingress {
    from_port       = 29092
    to_port         = 29092
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # MQTT Mosquitto
  ingress {
    from_port       = 1883
    to_port         = 1883
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # Keycloak Web API (Auth Server)
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-db-sg"
    Environment = var.environment
  }
}

# 5. Instancia Servidor de Bases de Datos (DB Server - Persistente)
resource "aws_instance" "db_server" {
  ami                  = var.ami_id
  instance_type        = var.db_instance_type
  subnet_id            = var.subnet_id
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  key_name             = var.key_name
  iam_instance_profile = var.use_academy_iam ? "LabInstanceProfile" : null

  # Almacenamiento local raiz para el SO
  root_block_device {
    volume_size           = 12
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Script de inicio para instalar Docker, formatear/montar EBS persistente y configurar Swap
  user_data = base64encode(<<-EOF
              #!/bin/bash
              # Buscar dinamicamente el dispositivo EBS no montado
              DEVICE=""
              for i in {1..30}; do
                for dev in /dev/nvme[0-9]n1 /dev/xvd[f-z] /dev/sd[f-z]; do
                  if [ -b "$dev" ]; then
                    # Verificar si no esta montado y no es la particion root
                    if ! lsblk -no MOUNTPOINTS "$dev" | grep -q '/'; then
                      DEVICE="$dev"
                      break 2
                    fi
                  fi
                done
                sleep 2
              done

              if [ -z "$DEVICE" ]; then
                echo "ERROR: No EBS device found to mount!"
                exit 1
              fi

              echo "Selected device: $DEVICE"

              # Formatear si es necesario
              if ! file -s $DEVICE | grep -q ext4; then
                mkfs -t ext4 $DEVICE
              fi

              # Montar volumen en /var/lib/docker para conservar bases de datos de Docker
              mkdir -p /var/lib/docker
              mount $DEVICE /var/lib/docker
              echo "$DEVICE /var/lib/docker ext4 defaults,nofail 0 2" >> /etc/fstab

              # Instalar Docker
              apt-get update -y
              apt-get install -y docker.io docker-compose
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu

              # Configurar 4GB Swap
              fallocate -l 4G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile none swap sw 0 0' >> /etc/fstab
              EOF
  )

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-db-server"
    Environment = var.environment
  }
}

# 5.1. Volumen EBS Persistente para Bases de Datos (20 GB gp3)
resource "aws_ebs_volume" "db_data" {
  availability_zone = "us-east-1a"
  size              = 20
  type              = "gp3"

  tags = {
    Name        = "${var.project_name}-${lower(var.environment)}-db-data"
    Environment = var.environment
  }

  # Evita que Terraform destruya accidentalmente el volumen de datos en actualizaciones
  lifecycle {
    prevent_destroy = true
  }
}

# 5.2. Adjuntar volumen EBS a la instancia DB
resource "aws_volume_attachment" "db_attach" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.db_data.id
  instance_id = aws_instance.db_server.id
}

# 6. ALB para balancear el tráfico al App Server
resource "aws_lb" "app_alb" {
  name               = "${var.project_name}-${lower(var.environment)}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [var.subnet_id, var.subnet_b_id]

  tags = {
    Environment = var.environment
  }
}

# Target Group para el Gateway/App de Nginx (Puerto 5000)
resource "aws_lb_target_group" "app_tg" {
  name     = "${var.project_name}-${lower(var.environment)}-tg-v2"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    interval            = 45
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# Listener del ALB
resource "aws_lb_listener" "app_listener" {
  load_balancer_arn = aws_lb.app_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}

# 7. Launch Template del Servidor de Aplicaciones (App Server - Stateless)
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-${lower(var.environment)}-lt-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 16
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  network_interfaces {
    security_groups             = [aws_security_group.app_sg.id]
    associate_public_ip_address = true
  }

  iam_instance_profile {
    name = var.use_academy_iam ? "LabInstanceProfile" : null
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io docker-compose
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu

              # Configurar 4GB Swap
              fallocate -l 4G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile none swap sw 0 0' >> /etc/fstab
              EOF
  )

  lifecycle {
    create_before_destroy = true
  }
}

# 8. Auto Scaling Group para el Servidor de Aplicaciones (Capacidad Fija a 1 por costos)
resource "aws_autoscaling_group" "app_asg" {
  name                = "${aws_launch_template.app.name}-asg"
  vpc_zone_identifier = [var.subnet_id, var.subnet_b_id]
  target_group_arns   = [aws_lb_target_group.app_tg.arn]
  health_check_type   = "EC2"

  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${lower(var.environment)}-app-asg"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}
