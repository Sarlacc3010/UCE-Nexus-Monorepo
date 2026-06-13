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

  # Ingress genérico desde ALB (por ej. si las apps exponen varios puertos)
  # O podemos simplemente permitir todo TCP desde el ALB
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

# 4. ALB
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

# Target Group principal
resource "aws_lb_target_group" "app_tg" {
  name     = "${var.project_name}-${lower(var.environment)}-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
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

# 5. Launch Template (Blue/Green compatible)
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-${lower(var.environment)}-lt-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  network_interfaces {
    security_groups = [aws_security_group.app_sg.id]
    associate_public_ip_address = true
  }

  iam_instance_profile {
    name = var.use_academy_iam ? "LabInstanceProfile" : null
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install docker.io docker-compose -y
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu
              EOF
  )

  lifecycle {
    create_before_destroy = true
  }
}

# 6. Auto Scaling Group (Alta Disponibilidad)
resource "aws_autoscaling_group" "app_asg" {
  name                = "${aws_launch_template.app.name}-asg"
  vpc_zone_identifier = [var.subnet_id, var.subnet_b_id]
  target_group_arns   = [aws_lb_target_group.app_tg.arn]
  health_check_type   = "ELB"

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
