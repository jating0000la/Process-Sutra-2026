# Quick Start Guide for AWS Deployment

Follow these steps to deploy your FlowSense application to AWS:

## 🚀 Quick Deployment (5 minutes)

### Prerequisites
- AWS account with CLI configured
- Docker installed

### Step 1: Run the Deployment Script

**Windows (PowerShell):**
```powershell
cd "C:\Users\jkgku\OneDrive\Desktop\webpage\FlowSense"
.\scripts\aws\deploy.ps1
```

**Linux/macOS/WSL:**
```bash
cd /path/to/FlowSense
chmod +x scripts/aws/deploy.sh
./scripts/aws/deploy.sh
```

### Step 2: Wait for Completion
The script will:
- ✅ Create ECR repository
- ✅ Build and push Docker image  
- ✅ Create PostgreSQL database
- ✅ Deploy to App Runner
- ✅ Configure health checks

### Step 3: Access Your Application
After completion, you'll see:
```
Service URL: https://your-unique-id.us-east-1.awsapprunner.com
```

## 🔧 Manual Setup (if needed)

### 1. Configure AWS CLI
```bash
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Format (json)
```

### 2. Create & Push Docker Image
```bash
# Create ECR repository
aws ecr create-repository --repository-name flowsense

# Get login command
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build & push
docker build -t flowsense .
docker tag flowsense:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/flowsense:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/flowsense:latest
```

### 3. Create Database
```bash
aws rds create-db-instance \
  --db-instance-identifier flowsense-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --db-name flowsense \
  --allocated-storage 20
```

### 4. Create App Runner Service
Use the AWS Console:
1. Go to App Runner
2. Create service
3. Choose "Container registry" → "Amazon ECR"
4. Select your image
5. Configure environment variables
6. Deploy

## 🔑 Environment Variables (Required)

Set these in App Runner configuration:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://admin:YourPassword@your-db-endpoint:5432/flowsense
SESSION_SECRET=your-32-character-secret
FIREBASE_PROJECT_ID=taskflowpro-c62c1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## 💡 Quick Tips

- **Cost**: Expect ~$40-50/month for small-medium usage
- **Scaling**: App Runner scales automatically 0-25 instances  
- **Monitoring**: Check CloudWatch logs for issues
- **Updates**: Push new images to ECR and restart App Runner

## 🚨 Troubleshooting

**Database connection issues?**
- Check security group allows port 5432
- Verify database endpoint and credentials

**App not starting?**
- Check CloudWatch logs: `/aws/apprunner/flowsense-service/application`
- Verify all environment variables are set

**Build failing?**
- Ensure Docker is running
- Check for port conflicts (stop local dev server)

## 📞 Need Help?

Check the full `DEPLOYMENT.md` for detailed instructions, or:
1. Review CloudWatch logs
2. Test database connection
3. Verify environment variables
4. Check AWS service limits
