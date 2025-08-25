# FlowSense AWS Deployment Guide

This guide provides multiple options to deploy your FlowSense application to AWS with a PostgreSQL database.

## 🏗️ Architecture Overview

Your FlowSense application will be deployed with:
- **Frontend**: React app served statically
- **Backend**: Node.js/Express API server  
- **Database**: AWS RDS PostgreSQL
- **Authentication**: Firebase Auth
- **Real-time**: WebSocket support
- **Container**: Docker containerized application

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed (for containerization)
4. **Node.js 18+** installed
5. **Git** (optional, for CI/CD)

### Install AWS CLI
```bash
# Windows (PowerShell)
winget install Amazon.AWSCLI

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (us-east-1), and output format (json)
```

## 🚀 Deployment Options

### Option 1: AWS App Runner (Recommended - Simplest)

**Best for**: Quick deployment, minimal configuration, automatic scaling

1. **Deploy using PowerShell script** (Windows):
   ```powershell
   cd "C:\Users\jkgku\OneDrive\Desktop\webpage\FlowSense"
   .\scripts\aws\deploy.ps1
   ```

2. **Deploy using Bash script** (Linux/macOS/WSL):
   ```bash
   cd /path/to/FlowSense
   chmod +x scripts/aws/deploy.sh
   ./scripts/aws/deploy.sh
   ```

3. **Manual deployment**:
   ```bash
   # 1. Create ECR repository
   aws ecr create-repository --repository-name flowsense --region us-east-1
   
   # 2. Build and push Docker image
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker build -t flowsense .
   docker tag flowsense:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/flowsense:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/flowsense:latest
   
   # 3. Create App Runner service (use AWS Console or CLI with apprunner.yaml)
   ```

### Option 2: AWS ECS Fargate (Production-Ready)

**Best for**: Production workloads, fine-grained control, high availability

1. **Deploy using AWS CDK**:
   ```bash
   cd aws-cdk
   npm install
   npm run build
   
   # Bootstrap CDK (first time only)
   npx cdk bootstrap
   
   # Deploy infrastructure
   npx cdk deploy FlowSense-Prod
   ```

2. **Manual ECS deployment**:
   ```bash
   # Create ECS cluster
   aws ecs create-cluster --cluster-name flowsense-cluster
   
   # Register task definition
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   
   # Create service
   aws ecs create-service --cluster flowsense-cluster --service-name flowsense-service --task-definition flowsense
   ```

### Option 3: AWS EC2 (Maximum Control)

**Best for**: Custom configurations, specific requirements

1. **Launch EC2 instance**:
   ```bash
   aws ec2 run-instances \
     --image-id ami-0abcdef1234567890 \
     --instance-type t3.medium \
     --key-name your-key-pair \
     --security-group-ids sg-12345678 \
     --subnet-id subnet-12345678
   ```

2. **Install Docker and deploy**:
   ```bash
   # SSH into instance
   ssh -i your-key.pem ec2-user@your-instance-ip
   
   # Install Docker
   sudo yum update -y
   sudo yum install docker -y
   sudo service docker start
   
   # Pull and run your container
   docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/flowsense:latest
   docker run -p 5000:5000 -e DATABASE_URL=... flowsense:latest
   ```

## 🗄️ Database Setup

### AWS RDS PostgreSQL

The deployment scripts automatically create an RDS PostgreSQL instance, but you can also create it manually:

```bash
aws rds create-db-instance \
  --db-instance-identifier flowsense-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username flowsense_admin \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --db-name flowsense \
  --storage-encrypted \
  --backup-retention-period 7
```

### Alternative: Neon Database (Serverless PostgreSQL)

If you prefer serverless PostgreSQL:

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Get your connection string
4. Update your environment variables

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production` with these variables:

```env
# Database
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/flowsense

# Session
SESSION_SECRET=your-super-secure-session-secret

# Firebase (Backend)
FIREBASE_PROJECT_ID=taskflowpro-c62c1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_ID=104843425969082480520

# Firebase (Frontend)
VITE_FIREBASE_API_KEY=AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0
VITE_FIREBASE_AUTH_DOMAIN=taskflowpro-c62c1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taskflowpro-c62c1
VITE_FIREBASE_STORAGE_BUCKET=taskflowpro-c62c1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=975860144476
VITE_FIREBASE_APP_ID=1:975860144476:web:678bc5d5e4c4030e450999
VITE_FIREBASE_MEASUREMENT_ID=G-GVQGWCF9EK

# Application
NODE_ENV=production
PORT=5000
```

### AWS Systems Manager Parameter Store

For better security, store sensitive values in Parameter Store:

```bash
# Database URL
aws ssm put-parameter \
  --name "/flowsense/database/url" \
  --value "postgresql://username:password@endpoint:5432/flowsense" \
  --type "SecureString"

# Session Secret
aws ssm put-parameter \
  --name "/flowsense/session/secret" \
  --value "your-session-secret" \
  --type "SecureString"
```

## 🚦 CI/CD with GitHub Actions

The repository includes GitHub Actions workflows for automated deployment:

1. **Setup GitHub Secrets**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `APP_RUNNER_SERVICE_ARN_STAGING`
   - `ECS_CLUSTER_NAME`
   - `ECS_SERVICE_NAME`
   - `ECS_TASK_DEFINITION`

2. **Push to deploy**:
   - Push to `develop` branch → deploys to staging
   - Push to `main` branch → deploys to production

## 🔒 Security Considerations

### Network Security
- Use VPC with private subnets for database
- Configure security groups properly
- Enable encryption at rest and in transit

### Application Security
- Store secrets in AWS Parameter Store or Secrets Manager
- Use IAM roles instead of access keys where possible
- Enable CloudTrail for audit logging

### Database Security
- Enable encryption at rest
- Use strong passwords
- Configure backup and point-in-time recovery
- Enable Performance Insights for monitoring

## 📊 Monitoring & Logging

### CloudWatch Logs
```bash
# View App Runner logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner"

# Stream logs
aws logs tail /aws/apprunner/flowsense-service/application --follow
```

### Application Performance Monitoring
- Enable CloudWatch Container Insights
- Set up custom metrics for business KPIs
- Configure alarms for critical issues

## 💰 Cost Optimization

### AWS App Runner Pricing (Estimated)
- **Compute**: ~$25/month (0.25 vCPU, 0.5 GB RAM)
- **RDS t3.micro**: ~$13/month
- **Data transfer**: ~$5-10/month
- **Total**: ~$43-48/month

### Cost Reduction Tips
- Use reserved instances for predictable workloads
- Enable auto-scaling to handle traffic spikes
- Use lifecycle policies for log retention
- Monitor unused resources

## 🔄 Backup & Disaster Recovery

### Database Backups
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier flowsense-db \
  --db-snapshot-identifier flowsense-backup-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier flowsense-db-restored \
  --db-snapshot-identifier flowsense-backup-20241201
```

### Application Backups
- Docker images are automatically stored in ECR
- Code is backed up in GitHub
- Use AWS CodeCommit for additional redundancy

## 🚨 Troubleshooting

### Common Issues

1. **Database connection refused**:
   - Check security group rules
   - Verify VPC configuration
   - Test connection from EC2 instance in same VPC

2. **App Runner deployment failed**:
   - Check Docker image builds locally
   - Verify environment variables
   - Review CloudWatch logs

3. **Firebase authentication errors**:
   - Verify Firebase project configuration
   - Check API keys and service account
   - Ensure CORS is properly configured

### Debugging Commands
```bash
# Check service status
aws apprunner describe-service --service-arn your-service-arn

# View recent logs
aws logs tail /aws/apprunner/flowsense-service/application --since 1h

# Test database connection
psql postgresql://username:password@endpoint:5432/flowsense -c "SELECT version();"

# Check container health
curl https://your-app-url/api/health
```

## 🎯 Next Steps

After successful deployment:

1. **Configure Domain**: Set up custom domain with Route 53
2. **Enable HTTPS**: Use ACM for SSL certificates  
3. **Set up Monitoring**: Configure CloudWatch alarms
4. **Performance Testing**: Load test your application
5. **Backup Strategy**: Implement regular backup procedures
6. **Documentation**: Update team documentation with deployment details

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify all environment variables
3. Test database connectivity
4. Review security group rules
5. Check AWS service limits

For AWS-specific issues, consult the [AWS Documentation](https://docs.aws.amazon.com/) or contact AWS Support.
