output "bastion_public_ip" {
  value       = aws_eip.bastion_eip.public_ip
  description = "IP pública del Bastion Host"
}

output "db_server_private_ip" {
  value       = aws_instance.db_server.private_ip
  description = "IP privada del servidor de bases de datos"
}

output "alb_dns_name" {
  value       = aws_lb.app_alb.dns_name
  description = "DNS público del Application Load Balancer"
}
