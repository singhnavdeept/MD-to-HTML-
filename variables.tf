variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-north-1"   # Stockholm — matches your active AWS CLI profile
}

variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
  default     = "md-maker"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.micro"     # Free-tier eligible in eu-north-1
}

variable "your_ip_cidr" {
  description = "Your public IP in CIDR notation for SSH/Jenkins access, e.g. 128.185.168.206/32"
  type        = string
}

variable "ssh_public_key" {
  description = "Contents of your local SSH public key (~/.ssh/id_ed25519.pub)"
  type        = string
}
