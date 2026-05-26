# ─────────────────────────────────────────────────────────────────────────────
# main.tf  —  MD Maker  |  Single EC2 Local Docker Stack Deployment
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

# Data source lookup removed to bypass DescribeImages permission limits

# ─── VPC & Networking ─────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for MD Maker application and Jenkins server"
  vpc_id      = aws_vpc.main.id

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

# ─── SSH Key Pair ─────────────────────────────────────────────────────────────

resource "aws_key_pair" "deployer" {
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = aws_key_pair.deployer.key_name

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
