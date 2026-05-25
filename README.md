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
- **Docker**: `docker-compose up --build`
- **Terraform**: `cd infrastructure/terraform && terraform apply`
