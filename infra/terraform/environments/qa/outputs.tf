output "bastion_public_ip" {
  value       = module.compute.bastion_public_ip
  description = "IP pública del Bastion Host en QA"
}

output "app_server_public_ip" {
  value       = module.compute.app_server_public_ip
  description = "IP pública de la App (API Gateway) en QA"
}

output "app_server_private_ip" {
  value       = module.compute.app_server_private_ip
  description = "IP privada de la App en QA (para salto SSH)"
}
