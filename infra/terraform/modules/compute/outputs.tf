output "bastion_public_ip" {
  value       = aws_instance.bastion.public_ip
  description = "IP pública del Bastion Host"
}

output "app_server_public_ip" {
  value       = aws_instance.app_server.public_ip
  description = "IP pública del Servidor de Aplicaciones"
}

output "app_server_private_ip" {
  value       = aws_instance.app_server.private_ip
  description = "IP privada del Servidor de Aplicaciones (usar para saltar con el Bastion)"
}
