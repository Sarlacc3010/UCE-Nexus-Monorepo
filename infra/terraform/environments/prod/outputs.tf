output "bastion_public_ip" {
  value       = module.compute.bastion_public_ip
  description = "IP pública ELASTICA del Bastion Host (PONER EN GITHUB SECRETS)"
}

output "alb_dns_name" {
  value       = module.compute.alb_dns_name
  description = "DNS del Load Balancer (PONER EN CLOUDFLARE COMO CNAME)"
}
