output "bastion_public_ip" {
  value       = aws_instance.bastion.public_ip
  description = "IP pública del Bastion Host"
}

output "alb_dns_name" {
  value       = aws_lb.app_alb.dns_name
  description = "DNS del Application Load Balancer"
}
