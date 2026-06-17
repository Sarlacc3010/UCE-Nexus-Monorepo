output "bastion_public_ip" {
  value       = module.compute.bastion_public_ip
  description = "IP pública del Bastion Host en QA"
}

output "db_server_private_ip" {
  value       = module.compute.db_server_private_ip
  description = "IP privada del servidor de bases de datos en QA"
}

output "alb_dns_name" {
  value       = module.compute.alb_dns_name
  description = "DNS del ALB de QA"
}
