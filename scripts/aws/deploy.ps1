# FlowSense AWS Deployment Script (PowerShell)
# This script sets up the complete AWS infrastructure for FlowSense

param(
    [string]$Region = "us-east-1",
    [string]$AppName = "flowsense",
    [switch]$SkipDocker = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting FlowSense AWS Deployment" -ForegroundColor Green

# Configuration
$ECR_REPOSITORY = $AppName
$DB_NAME = "flowsense"
$DB_USERNAME = "flowsense_admin"

# Helper functions
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    exit 1
}

# Check requirements
function Test-Requirements {
    Write-Info "Checking requirements..."
    
    if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is required but not installed"
    }
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue) -and !$SkipDocker) {
        Write-Error "Docker is required but not installed (use -SkipDocker to skip Docker operations)"
    }
    
    try {
        aws sts get-caller-identity | Out-Null
    }
    catch {
        Write-Error "AWS CLI is not configured or credentials are invalid"
    }
    
    Write-Info "Requirements check passed ✅"
}

# Create ECR repository
function New-ECRRepository {
    Write-Info "Creating ECR repository..."
    
    try {
        aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $Region | Out-Null
        Write-Info "ECR repository $ECR_REPOSITORY already exists"
    }
    catch {
        aws ecr create-repository `
            --repository-name $ECR_REPOSITORY `
            --region $Region `
            --image-scanning-configuration scanOnPush=true `
            --encryption-configuration encryptionType=AES256
        Write-Info "ECR repository created successfully ✅"
    }
    
    if (!$SkipDocker) {
        # Get ECR login token and login to Docker
        $loginCommand = aws ecr get-login-password --region $Region
        $accountId = aws sts get-caller-identity --query Account --output text
        $loginCommand | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$Region.amazonaws.com"
    }
}

# Build and push Docker image
function Publish-DockerImage {
    if ($SkipDocker) {
        Write-Warn "Skipping Docker build and push"
        return
    }
    
    Write-Info "Building and pushing Docker image..."
    
    $accountId = aws sts get-caller-identity --query Account --output text
    $ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com/$ECR_REPOSITORY"
    
    # Build image
    docker build -t "${ECR_REPOSITORY}:latest" .
    docker tag "${ECR_REPOSITORY}:latest" "${ecrUri}:latest"
    
    try {
        $gitHash = git rev-parse --short HEAD
        docker tag "${ECR_REPOSITORY}:latest" "${ecrUri}:$gitHash"
    }
    catch {
        docker tag "${ECR_REPOSITORY}:latest" "${ecrUri}:manual"
        $gitHash = "manual"
    }
    
    # Push image
    docker push "${ecrUri}:latest"
    docker push "${ecrUri}:$gitHash"
    
    Write-Info "Docker image pushed successfully ✅"
}

# Create RDS subnet group
function New-DBSubnetGroup {
    Write-Info "Creating RDS subnet group..."
    
    # Get VPC and subnet info
    $vpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
    $subnetIds = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[*].SubnetId" --output text --region $Region
    
    try {
        aws rds describe-db-subnet-groups --db-subnet-group-name "$AppName-subnet-group" --region $Region | Out-Null
        Write-Info "DB subnet group already exists"
    }
    catch {
        aws rds create-db-subnet-group `
            --db-subnet-group-name "$AppName-subnet-group" `
            --db-subnet-group-description "Subnet group for FlowSense database" `
            --subnet-ids $subnetIds.Split() `
            --region $Region
        Write-Info "DB subnet group created successfully ✅"
    }
}

# Create RDS database
function New-Database {
    Write-Info "Creating RDS PostgreSQL database..."
    
    try {
        aws rds describe-db-instances --db-instance-identifier "$AppName-db" --region $Region | Out-Null
        Write-Info "Database already exists"
        return
    }
    catch {
        # Database doesn't exist, continue with creation
    }
    
    # Generate random password
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 25 | ForEach-Object {[char]$_})
    
    # Get default security group
    $defaultSG = aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text --region $Region
    
    # Create database
    aws rds create-db-instance `
        --db-instance-identifier "$AppName-db" `
        --db-instance-class db.t3.micro `
        --engine postgres `
        --engine-version 15.4 `
        --master-username $DB_USERNAME `
        --master-user-password $dbPassword `
        --allocated-storage 20 `
        --max-allocated-storage 100 `
        --db-name $DB_NAME `
        --db-subnet-group-name "$AppName-subnet-group" `
        --vpc-security-group-ids $defaultSG `
        --backup-retention-period 7 `
        --storage-encrypted `
        --deletion-protection `
        --region $Region
    
    Write-Info "Database creation initiated. This may take several minutes..."
    
    # Wait for database to be available
    aws rds wait db-instance-available --db-instance-identifier "$AppName-db" --region $Region
    
    # Get database endpoint
    $dbEndpoint = aws rds describe-db-instances --db-instance-identifier "$AppName-db" --query "DBInstances[0].Endpoint.Address" --output text --region $Region
    
    Write-Info "Database created successfully ✅"
    Write-Info "Database endpoint: $dbEndpoint"
    Write-Info "Database username: $DB_USERNAME"
    Write-Warn "Database password: $dbPassword (save this securely!)"
    
    # Store in Systems Manager Parameter Store
    aws ssm put-parameter `
        --name "/flowsense/database/password" `
        --value $dbPassword `
        --type "SecureString" `
        --overwrite `
        --region $Region
    
    $databaseUrl = "postgresql://$DB_USERNAME`:$dbPassword@$dbEndpoint`:5432/$DB_NAME"
    aws ssm put-parameter `
        --name "/flowsense/database/url" `
        --value $databaseUrl `
        --type "SecureString" `
        --overwrite `
        --region $Region
    
    Write-Info "Database credentials stored in Parameter Store ✅"
}

# Create App Runner service
function New-AppRunnerService {
    Write-Info "Creating App Runner service..."
    
    $accountId = aws sts get-caller-identity --query Account --output text
    $ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com/$ECR_REPOSITORY`:latest"
    
    # Get database URL from Parameter Store
    $databaseUrl = aws ssm get-parameter --name "/flowsense/database/url" --with-decryption --query "Parameter.Value" --output text --region $Region
    
    # Generate session secret
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    # Create service configuration
    $serviceConfig = @{
        ServiceName = "$AppName-service"
        SourceConfiguration = @{
            ImageRepository = @{
                ImageIdentifier = $ecrUri
                ImageConfiguration = @{
                    Port = "5000"
                    RuntimeEnvironmentVariables = @{
                        NODE_ENV = "production"
                        PORT = "5000"
                        DATABASE_URL = $databaseUrl
                        SESSION_SECRET = $sessionSecret
                        FIREBASE_PROJECT_ID = "taskflowpro-c62c1"
                        FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com"
                        FIREBASE_CLIENT_ID = "104843425969082480520"
                        VITE_FIREBASE_API_KEY = "AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0"
                        VITE_FIREBASE_AUTH_DOMAIN = "taskflowpro-c62c1.firebaseapp.com"
                        VITE_FIREBASE_PROJECT_ID = "taskflowpro-c62c1"
                        VITE_FIREBASE_STORAGE_BUCKET = "taskflowpro-c62c1.appspot.com"
                        VITE_FIREBASE_MESSAGING_SENDER_ID = "975860144476"
                        VITE_FIREBASE_APP_ID = "1:975860144476:web:678bc5d5e4c4030e450999"
                        VITE_FIREBASE_MEASUREMENT_ID = "G-GVQGWCF9EK"
                    }
                }
                ImageRepositoryType = "ECR"
            }
            AutoDeploymentsEnabled = $false
        }
        InstanceConfiguration = @{
            Cpu = "0.25 vCPU"
            Memory = "0.5 GB"
        }
        HealthCheckConfiguration = @{
            Protocol = "HTTP"
            Path = "/api/health"
            Interval = 20
            Timeout = 5
            HealthyThreshold = 1
            UnhealthyThreshold = 5
        }
    }
    
    $configJson = $serviceConfig | ConvertTo-Json -Depth 10
    $configJson | Out-File -FilePath "apprunner-service.json" -Encoding UTF8
    
    try {
        aws apprunner describe-service --service-arn "arn:aws:apprunner:${Region}:${accountId}:service/$AppName-service" | Out-Null
        Write-Info "App Runner service already exists"
    }
    catch {
        $serviceArn = aws apprunner create-service --cli-input-json file://apprunner-service.json --query "Service.ServiceArn" --output text --region $Region
        
        Write-Info "App Runner service created successfully ✅"
        Write-Info "Service ARN: $serviceArn"
        
        # Wait for service to be running
        Write-Info "Waiting for service to be running..."
        aws apprunner wait service-running --service-arn $serviceArn --region $Region
        
        # Get service URL
        $serviceUrl = aws apprunner describe-service --service-arn $serviceArn --query "Service.ServiceUrl" --output text --region $Region
        Write-Info "Service URL: https://$serviceUrl"
    }
    
    # Clean up
    Remove-Item "apprunner-service.json" -ErrorAction SilentlyContinue
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting FlowSense deployment to AWS..."
    
    Test-Requirements
    New-ECRRepository
    Publish-DockerImage
    New-DBSubnetGroup
    New-Database
    New-AppRunnerService
    
    Write-Info "🎉 Deployment completed successfully!"
    Write-Info ""
    Write-Info "Next steps:"
    Write-Info "1. Configure your domain name (if desired)"
    Write-Info "2. Set up monitoring and logging"
    Write-Info "3. Configure backup policies"
    Write-Info "4. Test the application thoroughly"
    Write-Info ""
    Write-Info "Your FlowSense application should be available at the App Runner URL shown above."
}

# Run main function
Start-Deployment
