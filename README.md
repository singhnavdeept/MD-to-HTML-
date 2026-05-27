# Cloud-Native Markdown Publishing Platform

## Architecture
- **Frontend**: React + TypeScript + Tailwind
- **Backend API**: Node.js + Express (Layered Architecture)
- **Processor**: File-watching microservice
- **Storage**: PostgreSQL
- **Infrastructure**: Terraform (AWS), Docker, Jenkins

## Local Development
1. `npm install`
2. `npm run dev`

## Deployment
- **Docker**: `docker compose up --build` (runs locally or on EC2)
- **Terraform**: `cd infrastructure/terraform && terraform apply` (codified infra)

## Production Environment
- **Live Platform**: [http://43.204.233.55](http://43.204.233.55)
- **Jenkins CI/CD**: [http://43.204.233.55:8080](http://43.204.233.55:8080)
