// Jenkinsfile — MD Maker  |  Smart CI/CD pipeline
// ─────────────────────────────────────────────────────────────────────────────
// Prerequisites (configure in Jenkins > Manage Jenkins > Credentials):
//   AWS_ACCOUNT_ID   — Secret text
//   AWS_REGION       — Secret text  (e.g. ap-south-1)
//   EC2_HOST         — Secret text  (Elastic IP from Terraform output)
//   DB_PASSWORD      — Secret text
//   SSH_KEY          — SSH private key credential (id: ec2-ssh-key)
//   TF_VAR_your_ip_cidr    — Secret text
//   TF_VAR_ssh_public_key  — Secret text

pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        PROJECT_NAME  = 'md-maker'
        IMAGE_TAG     = "${GIT_COMMIT}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 2. Build & Deploy Application ─────────────────────────────────
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
                    changeset 'md-maker.conf'
                    changeset 'infrastructure/**/*'
                    changeset 'main.tf'
                }
            }
            stages {
                // ── 2a. Install & Lint ─────────────────────────────────────────────
                stage('Install & Verify') {
                    steps {
                        sh 'node --version && npm --version'
                        sh 'npm ci'
                        sh 'npm run lint'
                    }
                }

                // ── 2b. Build ──────────────────────────────────────────────────────
                stage('Build Code') {
                    steps {
                        sh 'npm run build'
                    }
                }

                // ── 2c. Docker build & push to ECR ────────────────────────────────
                stage('Build & Push Docker Image') {
                    steps {
                        withCredentials([
                            string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID'),
                            string(credentialsId: 'AWS_REGION',     variable: 'AWS_REGION')
                        ]) {
                            script {
                                def ecrUrl = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                                def fullTag = "${ecrUrl}/${PROJECT_NAME}:${IMAGE_TAG}"

                                // Authenticate with ECR
                                sh """
                                    aws ecr get-login-password --region ${AWS_REGION} \
                                        | docker login --username AWS --password-stdin ${ecrUrl}
                                """

                                // Build and push
                                sh "docker build -t ${fullTag} ."
                                sh "docker push ${fullTag}"

                                // Also tag as latest for easy manual pulls
                                sh "docker tag ${fullTag} ${ecrUrl}/${PROJECT_NAME}:latest"
                                sh "docker push ${ecrUrl}/${PROJECT_NAME}:latest"

                                env.ECR_URL  = ecrUrl
                                env.FULL_TAG = fullTag
                            }
                        }
                    }
                }

                // ── 2d. Terraform — provision / update infra ───────────────────────
                stage('Terraform Apply') {
                    steps {
                        withCredentials([
                            string(credentialsId: 'AWS_ACCOUNT_ID',        variable: 'AWS_ACCOUNT_ID'),
                            string(credentialsId: 'AWS_REGION',             variable: 'AWS_REGION'),
                            string(credentialsId: 'DB_PASSWORD',            variable: 'DB_PASSWORD'),
                            string(credentialsId: 'TF_VAR_your_ip_cidr',   variable: 'TF_VAR_your_ip_cidr'),
                            string(credentialsId: 'TF_VAR_ssh_public_key', variable: 'TF_VAR_ssh_public_key')
                        ]) {
                            dir('infrastructure/terraform') {
                                sh 'terraform init -input=false'
                                sh """
                                    terraform apply -auto-approve -input=false \
                                        -var="image_tag=${IMAGE_TAG}" \
                                        -var="aws_region=${AWS_REGION}" \
                                        -var="db_password=${DB_PASSWORD}" \
                                        -var="your_ip_cidr=${TF_VAR_your_ip_cidr}" \
                                        -var="ssh_public_key=${TF_VAR_ssh_public_key}"
                                """

                                // Capture outputs for the deploy step
                                script {
                                    env.EC2_HOST_TF = sh(
                                        script: "terraform output -raw app_public_ip",
                                        returnStdout: true
                                    ).trim()
                                    env.DATABASE_URL = sh(
                                        script: "terraform output -raw database_url",
                                        returnStdout: true
                                    ).trim()
                                }
                            }
                        }
                    }
                }

                // ── 2e. Deploy — SSH into EC2 and run the new container ───────────
                stage('Deploy to EC2') {
                    steps {
                        withCredentials([
                            sshUserPrivateKey(
                                credentialsId: 'ec2-ssh-key',
                                keyFileVariable: 'SSH_KEY_FILE',
                                usernameVariable: 'SSH_USER'
                            ),
                            string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID'),
                            string(credentialsId: 'AWS_REGION',     variable: 'AWS_REGION')
                        ]) {
                            script {
                                def host = env.EC2_HOST_TF ?: env.EC2_HOST
                                def ecrUrl = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

                                sh """
                                    ssh -o StrictHostKeyChecking=no \
                                        -i ${SSH_KEY_FILE} \
                                        ec2-user@${host} << 'REMOTE'

                                      # Authenticate Docker on the EC2 instance
                                      aws ecr get-login-password --region ${AWS_REGION} \
                                          | docker login --username AWS --password-stdin ${ecrUrl}

                                      # Pull the specific image
                                      docker pull ${ecrUrl}/${PROJECT_NAME}:${IMAGE_TAG}

                                      # Stop and remove old container (ignore error if not running)
                                      docker stop md-maker || true
                                      docker rm   md-maker || true

                                      # Run new container
                                      docker run -d \
                                          --name md-maker \
                                          --restart unless-stopped \
                                          -p 127.0.0.1:3000:3000 \
                                          -e NODE_ENV=production \
                                          -e PORT=3000 \
                                          -e DATABASE_URL='${DATABASE_URL}' \
                                          -e RAW_ARTICLES_PATH=/app/raw_articles \
                                          -v /opt/md-maker/raw_articles:/app/raw_articles \
                                          ${ecrUrl}/${PROJECT_NAME}:${IMAGE_TAG}

                                      # Drop Nginx config and reload
                                      sudo cp /tmp/md-maker.conf /etc/nginx/conf.d/md-maker.conf || true
                                      sudo nginx -t && sudo systemctl reload nginx

                                      # Remove dangling images to save disk space
                                      docker image prune -f

                                    REMOTE
                                """

                                // Copy nginx config to EC2 before the remote script runs
                                sh """
                                    scp -o StrictHostKeyChecking=no \
                                        -i ${SSH_KEY_FILE} \
                                        infrastructure/nginx/md-maker.conf \
                                        ec2-user@${host}:/tmp/md-maker.conf
                                """
                            }
                        }
                    }
                }
            }
        }

        // ── 3. Sync Raw Articles ──────────────────────────────────────────
        stage('Sync Raw Articles') {
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
                    changeset 'md-maker.conf'
                    changeset 'infrastructure/**/*'
                    changeset 'main.tf'
                }
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'SSH_KEY_FILE',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    script {
                        def host = env.EC2_HOST_TF ?: env.EC2_HOST
                        if (!host) {
                            try {
                                dir('infrastructure/terraform') {
                                    sh 'terraform init -input=false'
                                    host = sh(
                                        script: "terraform output -raw app_public_ip",
                                        returnStdout: true
                                    ).trim()
                                }
                            } catch (e) {
                                echo "Could not fetch host dynamically from Terraform state: ${e.message}"
                            }
                        }
                        if (host) {
                            sh """
                                scp -o StrictHostKeyChecking=no \
                                    -i ${SSH_KEY_FILE} \
                                    -r raw_articles/* \
                                    ec2-user@${host}:/opt/md-maker/raw_articles/
                            """
                        } else {
                            error "Deploy failed: No public host IP could be resolved."
                        }
                    }
                }
            }
        }

        // ── 4. Health Check ───────────────────────────────────────────────
        stage('Health Check') {
            steps {
                script {
                    def host = env.EC2_HOST_TF ?: env.EC2_HOST
                    if (!host) {
                        try {
                            dir('infrastructure/terraform') {
                                sh 'terraform init -input=false'
                                host = sh(
                                    script: "terraform output -raw app_public_ip",
                                    returnStdout: true
                                ).trim()
                            }
                        } catch (e) {
                            echo "Could not fetch host dynamically from Terraform state: ${e.message}"
                        }
                    }
                    if (host) {
                        // Retry for up to 60 seconds while container starts
                        retry(6) {
                            sleep(10)
                            sh "curl -sf http://${host}/api/articles || exit 1"
                        }
                    } else {
                        echo "Skipping health check: host IP is unresolved."
                    }
                }
            }
        }
    }

    // ── Post ──────────────────────────────────────────────────────────────────
    post {
        success {
            echo "✅ Deploy succeeded — http://${env.EC2_HOST_TF ?: env.EC2_HOST}"
        }
        failure {
            echo "❌ Pipeline failed. Check logs above."
        }
        always {
            // Clean workspace to save disk on the Jenkins agent
            cleanWs()
        }
    }
}
