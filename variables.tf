variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"   # Mumbai — closest to India
}

variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
  default     = "md-maker"
}

variable "image_tag" {
  description = "Docker image tag (Git commit SHA) — passed in by Jenkins"
  type        = string
}

variable "your_ip_cidr" {
  description = "Your public IP in CIDR notation for SSH access, e.g. 203.0.113.5/32"
  type        = string
}

variable "ssh_public_key" {
  description = "Contents of your ~/.ssh/id_rsa.pub (or id_ed25519.pub)"
  type        = string
}

variable "db_name" {
  description = "Postgres database name"
  type        = string
  default     = "mdmaker"
}

variable "db_username" {
  description = "Postgres master username"
  type        = string
  default     = "mdadmin"
}

variable "db_password" {
  description = "Postgres master password — use a secrets manager or tfvars"
  type        = string
  sensitive   = true
}
