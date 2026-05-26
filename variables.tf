variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"   # Mumbai region
}

variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
  default     = "md-maker"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t2.micro"     # Free-tier eligible
}

variable "ami_id" {
  description = "Ubuntu 22.04 LTS AMI ID for ap-south-1"
  type        = string
  default     = "ami-03f4fa076d2981b45" # Official Ubuntu 22.04 LTS (x86_64) in ap-south-1
}

variable "your_ip_cidr" {
  description = "Your public IP in CIDR notation for SSH/Jenkins access, e.g. 128.185.168.206/32"
  type        = string
}

variable "ssh_public_key" {
  description = "Contents of your local SSH public key (~/.ssh/id_ed25519.pub)"
  type        = string
}
