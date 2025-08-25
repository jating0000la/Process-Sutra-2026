#!/bin/bash

# FlowSense AWS Deployment Script
# This script sets up the complete AWS infrastructure for FlowSense

set -e

echo "🚀 Starting FlowSense AWS Deployment"

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
APP_NAME="flowsense"
ECR_REPOSITORY="$APP_NAME"
DB_NAME="flowsense"
DB_USERNAME="flowsense_admin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check requirements
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is required but not installed"
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS CLI is not configured or credentials are invalid"
    fi
    
    log "Requirements check passed ✅"
}

# Create ECR repository
create_ecr_repository() {
    log "Creating ECR repository..."
    
    if aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>/dev/null; then
        log "ECR repository $ECR_REPOSITORY already exists"
    else
        aws ecr create-repository \
            --repository-name $ECR_REPOSITORY \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        log "ECR repository created successfully ✅"
    fi
    
    # Get ECR login token and login to Docker
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
    
    # Build image
    docker build -t $ECR_REPOSITORY:latest .
    docker tag $ECR_REPOSITORY:latest $ECR_URI:latest
    docker tag $ECR_REPOSITORY:latest $ECR_URI:$(git rev-parse --short HEAD 2>/dev/null || echo "manual")
    
    # Push image
    docker push $ECR_URI:latest
    docker push $ECR_URI:$(git rev-parse --short HEAD 2>/dev/null || echo "manual")
    
    log "Docker image pushed successfully ✅"
    echo "ECR_URI=$ECR_URI:latest" >> $GITHUB_ENV 2>/dev/null || true
}

# Create RDS subnet group
create_db_subnet_group() {
    log "Creating RDS subnet group..."
    
    # Get VPC and subnet info
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $AWS_REGION)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $AWS_REGION)
    
    if aws rds describe-db-subnet-groups --db-subnet-group-name $APP_NAME-subnet-group --region $AWS_REGION 2>/dev/null; then
        log "DB subnet group already exists"
    else
        aws rds create-db-subnet-group \
            --db-subnet-group-name $APP_NAME-subnet-group \
            --db-subnet-group-description "Subnet group for FlowSense database" \
            --subnet-ids $SUBNET_IDS \
            --region $AWS_REGION
        log "DB subnet group created successfully ✅"
    fi
}

# Create RDS database
create_database() {
    log "Creating RDS PostgreSQL database..."
    
    if aws rds describe-db-instances --db-instance-identifier $APP_NAME-db --region $AWS_REGION 2>/dev/null; then
        log "Database already exists"
        return
    fi
    
    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create database
    aws rds create-db-instance \
        --db-instance-identifier $APP_NAME-db \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage 20 \
        --max-allocated-storage 100 \
        --db-name $DB_NAME \
        --db-subnet-group-name $APP_NAME-subnet-group \
        --vpc-security-group-ids $(aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text --region $AWS_REGION) \
        --backup-retention-period 7 \
        --storage-encrypted \
        --deletion-protection \
        --region $AWS_REGION
    
    log "Database creation initiated. This may take several minutes..."
    
    # Wait for database to be available
    aws rds wait db-instance-available --db-instance-identifier $APP_NAME-db --region $AWS_REGION
    
    # Get database endpoint
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $APP_NAME-db --query "DBInstances[0].Endpoint.Address" --output text --region $AWS_REGION)
    
    log "Database created successfully ✅"
    log "Database endpoint: $DB_ENDPOINT"
    log "Database username: $DB_USERNAME"
    warn "Database password: $DB_PASSWORD (save this securely!)"
    
    # Store in Systems Manager Parameter Store
    aws ssm put-parameter \
        --name "/flowsense/database/password" \
        --value "$DB_PASSWORD" \
        --type "SecureString" \
        --overwrite \
        --region $AWS_REGION
    
    aws ssm put-parameter \
        --name "/flowsense/database/url" \
        --value "postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME" \
        --type "SecureString" \
        --overwrite \
        --region $AWS_REGION
    
    log "Database credentials stored in Parameter Store ✅"
}

# Create App Runner service
create_app_runner_service() {
    log "Creating App Runner service..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
    
    # Get database URL from Parameter Store
    DATABASE_URL=$(aws ssm get-parameter --name "/flowsense/database/url" --with-decryption --query "Parameter.Value" --output text --region $AWS_REGION)
    
    # Create service configuration
    cat > apprunner-service.json << EOF
{
  "ServiceName": "$APP_NAME-service",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageConfiguration": {
        "Port": "5000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "5000",
          "DATABASE_URL": "$DATABASE_URL",
          "SESSION_SECRET": "$(openssl rand -base64 32)",
          "FIREBASE_PROJECT_ID": "taskflowpro-c62c1",
          "FIREBASE_CLIENT_EMAIL": "firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com",
          "FIREBASE_CLIENT_ID": "104843425969082480520",
          "VITE_FIREBASE_API_KEY": "AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0",
          "VITE_FIREBASE_AUTH_DOMAIN": "taskflowpro-c62c1.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID": "taskflowpro-c62c1",
          "VITE_FIREBASE_STORAGE_BUCKET": "taskflowpro-c62c1.appspot.com",
          "VITE_FIREBASE_MESSAGING_SENDER_ID": "975860144476",
          "VITE_FIREBASE_APP_ID": "1:975860144476:web:678bc5d5e4c4030e450999",
          "VITE_FIREBASE_MEASUREMENT_ID": "G-GVQGWCF9EK"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/api/health",
    "Interval": 20,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF
    
    if aws apprunner describe-service --service-arn arn:aws:apprunner:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):service/$APP_NAME-service 2>/dev/null; then
        log "App Runner service already exists"
    else
        SERVICE_ARN=$(aws apprunner create-service --cli-input-json file://apprunner-service.json --query "Service.ServiceArn" --output text --region $AWS_REGION)
        
        log "App Runner service created successfully ✅"
        log "Service ARN: $SERVICE_ARN"
        
        # Wait for service to be running
        log "Waiting for service to be running..."
        aws apprunner wait service-running --service-arn $SERVICE_ARN --region $AWS_REGION
        
        # Get service URL
        SERVICE_URL=$(aws apprunner describe-service --service-arn $SERVICE_ARN --query "Service.ServiceUrl" --output text --region $AWS_REGION)
        log "Service URL: https://$SERVICE_URL"
    fi
    
    # Clean up
    rm -f apprunner-service.json
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # This would typically be done as part of the application startup
    # or through a separate migration job
    log "Migrations should be run automatically on application startup"
    log "Monitor the App Runner logs to ensure migrations complete successfully"
}

# Main deployment function
main() {
    log "Starting FlowSense deployment to AWS..."
    
    check_requirements
    create_ecr_repository
    build_and_push_image
    create_db_subnet_group
    create_database
    create_app_runner_service
    run_migrations
    
    log "🎉 Deployment completed successfully!"
    log ""
    log "Next steps:"
    log "1. Configure your domain name (if desired)"
    log "2. Set up monitoring and logging"
    log "3. Configure backup policies"
    log "4. Test the application thoroughly"
    log ""
    log "Your FlowSense application should be available at the App Runner URL shown above."
}

# Run main function
main "$@"
