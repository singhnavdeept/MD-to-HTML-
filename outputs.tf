output "app_public_ip" {
  description = "Elastic IP of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "ecr_repository_url" {
  description = "ECR repository URL for docker push"
  value       = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  description = "RDS hostname (private — accessible only from EC2)"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "database_url" {
  description = "Full DATABASE_URL to inject into the container"
  value       = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
  sensitive   = true
}
