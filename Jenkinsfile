// Jenkinsfile — MD Maker  |  Local-Only Docker Compose Pipeline
// ─────────────────────────────────────────────────────────────────────────────
// This pipeline runs entirely on a local Jenkins agent using Docker and Docker Compose.
// No AWS, ECR, or SSH/SCP credentials are required.

pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        PROJECT_NAME = 'md-maker'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 2. Build & Deploy Application (Docker Compose) ─────────────────
        stage('Build & Deploy Application') {
            when {
                anyOf {
                    changeset 'src/**/*'
                    changeset 'server/**/*'
                    changeset 'server.ts'
                    changeset 'package.json'
                    changeset 'Dockerfile'
                    changeset 'vite.config.ts'
                    changeset 'tsconfig.json'
                    changeset 'docker-compose.yml'
                    changeset '.env'
                    expression { currentBuild.number == 1 }
                    expression { sh(script: 'docker ps -q --filter name=mdmaker-app-1', returnStdout: true).trim() == '' }
                }
            }
            stages {
                // ── 2a. Verify Code Quality ──────────────────────────────────────
                stage('Install & Verify') {
                    steps {
                        sh 'node --version && npm --version'
                        sh 'npm ci'
                        sh 'npm run lint'
                    }
                }

                // ── 2b. Rebuild & Start Containers ───────────────────────────────
                stage('Restart Containers') {
                    steps {
                        // Stop old containers and clean volumes if needed, then build and start
                        sh 'docker-compose down'
                        sh 'docker-compose up -d --build'
                    }
                }
            }
        }

        // ── 3. Verify Articles Integration ────────────────────────────────
        stage('Verify Articles Integration') {
            when {
                anyOf {
                    changeset 'raw_articles/**/*'
                    changeset 'src/**/*'
                    changeset 'server/**/*'
                    changeset 'server.ts'
                    changeset 'package.json'
                    changeset 'Dockerfile'
                    changeset 'vite.config.ts'
                    changeset 'tsconfig.json'
                    changeset 'docker-compose.yml'
                    changeset '.env'
                    expression { currentBuild.number == 1 }
                }
            }
            steps {
                script {
                    echo "Articles directory updated. The container automatically processes new files via bind-mount."
                }
            }
        }

        // ── 4. Health Check ───────────────────────────────────────────────
        stage('Health Check') {
            steps {
                script {
                    // Retry for up to 30 seconds while server boots up
                    retry(6) {
                        sleep(5)
                        sh 'curl -sf http://host.docker.internal:3000/api/articles || exit 1'
                    }
                }
            }
        }
    }

    // ── Post ──────────────────────────────────────────────────────────────────
    post {
        success {
            echo "✅ Local Docker Compose Deploy Succeeded! Application is available at http://localhost:3000"
        }
        failure {
            echo "❌ Pipeline failed. Check build logs."
        }
    }
}
