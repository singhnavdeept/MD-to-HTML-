# ─────────────────────────────────────────────────────────────────────────────
# main.tf  —  MD Maker  |  Single EC2 Local Docker Stack Deployment (Default VPC)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── Data ─────────────────────────────────────────────────────────────────────

# Reference the existing Default VPC in the account
data "aws_vpc" "default" {
  default = true
}

# Reference the existing Default Subnets in the Default VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for MD Maker application and Jenkins server"
  vpc_id      = data.aws_vpc.default.id

  # SSH access: restricted to your IP only
  ingress {
    description = "SSH from owner IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_cidr]
  }

  # Web App access: open to the world
  ingress {
    description = "HTTP Web App"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Jenkins Web UI access: restricted to your IP only
  ingress {
    description = "Jenkins Web UI from owner IP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_cidr]
  }

  # Outbound access: full internet access (to download packages, pull images, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-ec2-sg" }
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 25   # Free tier allows up to 30 GB
    volume_type = "gp3"
  }

  # Bootstrap: swap file, Docker, docker-compose-plugin, Node, Nginx
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # 1. Configure Swap Space (3GB) to prevent OOM crashes on t2.micro / t3.micro
    fallocate -l 3G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 2. Update and install basic dependencies
    apt-get update -y
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release nginx git

    # 3. Add official Docker repository and install Docker + Compose plugin
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Enable and start Docker service
    systemctl enable docker
    systemctl start docker

    # Allow ubuntu user to run docker without sudo
    usermod -aG docker ubuntu

    # 4. Configure directories for MD Maker volume mounts
    mkdir -p /opt/md-maker/raw_articles
    chown -R ubuntu:ubuntu /opt/md-maker

    # 5. Set up Nginx Reverse Proxy (Port 80 -> Port 3000)
    cat << 'NGINX_CFG' > /etc/nginx/sites-available/default
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
    }
    NGINX_CFG

    systemctl restart nginx
  EOF

  tags = { Name = "${var.project_name}-app-server" }
}

# Static IP assignment
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "${var.project_name}-eip" }
}
