output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID de la VPC creada"
}

output "public_subnet_id" {
  value       = aws_subnet.public.id
  description = "ID de la subred pública A"
}

output "public_subnet_b_id" {
  value       = aws_subnet.public_b.id
  description = "ID de la subred pública B"
}
