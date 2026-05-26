output "app_public_ip" {
  description = "Elastic IP of the EC2 instance (Your Web App is served here)"
  value       = aws_eip.app.public_ip
}

output "jenkins_url" {
  description = "Direct URL to access your Jenkins server (Restricted to your IP only)"
  value       = "http://${aws_eip.app.public_ip}:8080"
}
