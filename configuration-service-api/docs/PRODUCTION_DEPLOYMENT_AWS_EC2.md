# Production Deployment Guide - AWS EC2

## Overview

This guide provides step-by-step instructions for deploying each LeadPylot microservice on separate AWS EC2 instances, with solutions for the search service model access issue in production.

## Architecture

```
AWS Infrastructure:
├── VPC (Virtual Private Cloud)
│   ├── Public Subnets
│   │   ├── EC2 Instance 1: User Auth Service (Port 4000)
│   │   ├── EC2 Instance 2: Configuration Service (Port 4006)
│   │   ├── EC2 Instance 3: Document Service (Port 4002)
│   │   ├── EC2 Instance 4: Email Service (Port 4008)
│   │   ├── EC2 Instance 5: Lead Offer Service (Port 4003)
│   │   ├── EC2 Instance 6: Notification Service (Port 4004)
│   │   ├── EC2 Instance 7: PDF Service (Port 4009)
│   │   ├── EC2 Instance 8: Reporting Service (Port 4007)
│   │   └── EC2 Instance 9: Search Service (Port 3010)
│   └── Private Subnets
│       ├── MongoDB (Atlas or EC2)
│       └── Redis (ElastiCache or EC2)
├── S3 Buckets (File Storage)
├── Application Load Balancer (Optional)
└── CloudWatch (Monitoring & Logging)
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed on local machine
- Domain name (optional, for SSL certificates)
- MongoDB Atlas account or EC2 instance for MongoDB
- Redis instance (ElastiCache or EC2)

## Phase 1: Infrastructure Setup

### 1.1 Create VPC and Networking

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=leadpylot-vpc}]'

# Note the VPC ID
VPC_ID="vpc-xxxxxxxx"

# Create public subnets
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=leadpylot-public-subnet-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=leadpylot-public-subnet-1b}]'

# Create internet gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=leadpylot-igw}]'

# Note the Internet Gateway ID
IGW_ID="igw-xxxxxxxx"

# Attach internet gateway to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# Create route table
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=leadpylot-public-rt}]'

# Note the Route Table ID
RT_ID="rtb-xxxxxxxx"

# Add route to internet gateway
aws ec2 create-route \
  --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate route table with subnets
aws ec2 associate-route-table \
  --route-table-id $RT_ID \
  --subnet-id subnet-xxxxxxxx
```

### 1.2 Create Security Groups

```bash
# Create security group for microservices
aws ec2 create-security-group \
  --group-name leadpylot-microservices-sg \
  --description "Security group for LeadPylot microservices" \
  --vpc-id $VPC_ID

# Note the Security Group ID
SG_ID="sg-xxxxxxxx"

# Allow SSH access
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP access
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS access
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow inter-service communication (all ports within VPC)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3000-5000 \
  --source-group $SG_ID

# Allow MongoDB access
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 27017 \
  --cidr 0.0.0.0/0

# Allow Redis access
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 6379 \
  --cidr 0.0.0.0/0
```

### 1.3 Create IAM Role (Optional)

```bash
# Create IAM role for EC2 instances to access S3
aws iam create-role \
  --role-name leadpylot-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 access policy
aws iam attach-role-policy \
  --role-name leadpylot-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name leadpylot-ec2-profile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name leadpylot-ec2-profile \
  --role-name leadpylot-ec2-role
```

## Phase 2: Shared Models Package (Production Solution)

### 2.1 Create Shared Models Repository

```bash
# Create new repository
mkdir leadpylot-models
cd leadpylot-models

# Initialize npm package
npm init -y
```

**leadpylot-models/package.json:**

```json
{
  "name": "@leadpylot/models",
  "version": "1.0.0",
  "description": "Shared Mongoose models for LeadPylot microservices",
  "main": "src/index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["mongoose", "models", "leadpylot"],
  "author": "LeadPylot",
  "license": "PRIVATE",
  "dependencies": {
    "mongoose": "^7.0.0"
  },
  "peerDependencies": {
    "mongoose": "^7.0.0"
  }
}
```

**leadpylot-models/src/index.js:**

```javascript
// Import all models from their respective services
const Lead = require('./models/Lead')
const Offer = require('./models/Offer')
const Opening = require('./models/Opening')
const Confirmation = require('./models/Confirmation')
const PaymentVoucher = require('./models/PaymentVoucher')
const Netto1 = require('./models/Netto1')
const Netto2 = require('./models/Netto2')
const Lost = require('./models/Lost')
const Reclamation = require('./models/Reclamation')
const AssignLeads = require('./models/AssignLeads')
const Appointment = require('./models/Appointment')
const Todo = require('./models/Todo')
const TodoType = require('./models/TodoType')
const Favourite = require('./models/Favourite')
const Activity = require('./models/activity')
const User = require('./models/User')
const Role = require('./models/Role')
const Team = require('./models/Team')
const UserSession = require('./models/UserSession')
const UserInactivity = require('./models/UserInactivity')
const Settings = require('./models/Settings')
const Source = require('./models/Source')
const Bank = require('./models/Bank')
const Document = require('./models/Document')
const PdfTemplate = require('./models/PdfTemplate')
const GeneratedPdf = require('./models/GeneratedPdf')
const Font = require('./models/Font')
const ImportHistory = require('./models/ImportHistory')
const OfferImportHistory = require('./models/offerImportHistory')
const LeadTransfer = require('./models/leadTransfer')
const Transaction = require('./models/transaction')
const QueueTop = require('./models/queueTop')
const AgentQueuePosition = require('./models/agentQueuePosition')
const Assignment = require('./models/Assignment')
const ColumnPreference = require('./models/ColumnPreference')
const Project = require('./models/Project')
const Email = require('./models/Email')
const Notification = require('./models/Notification')
const NotificationReadReceipt = require('./models/NotificationReadReceipt')
const LoginAttempt = require('./models/loginAttempt')
const IpBlocklist = require('./models/ipBlocklist')
const DeviceBlocklist = require('./models/deviceBlocklist')

// Export all models
module.exports = {
  Lead,
  Offer,
  Opening,
  Confirmation,
  PaymentVoucher,
  Netto1,
  Netto2,
  Lost,
  Reclamation,
  AssignLeads,
  Appointment,
  Todo,
  TodoType,
  Favourite,
  Activity,
  User,
  Role,
  Team,
  UserSession,
  UserInactivity,
  Settings,
  Source,
  Bank,
  Document,
  PdfTemplate,
  GeneratedPdf,
  Font,
  ImportHistory,
  OfferImportHistory,
  LeadTransfer,
  Transaction,
  QueueTop,
  AgentQueuePosition,
  Assignment,
  ColumnPreference,
  Project,
  Email,
  Notification,
  NotificationReadReceipt,
  LoginAttempt,
  IpBlocklist,
  DeviceBlocklist,
}
```

### 2.2 Copy Models to Shared Package

```bash
# Copy models from each service to the shared package
mkdir -p leadpylot-models/src/models

# Copy Lead-Offer Service models
cp lead-offer-service-api/src/models/*.js leadpylot-models/src/models/

# Copy Email Service models
cp email-service-api/src/models/*.js leadpylot-models/src/models/

# Copy Notification Service models
cp notification-service-api/src/models/*.js leadpylot-models/src/models/

# Copy User Auth Service models
cp user-auth-service-api/src/models/*.js leadpylot-models/src/models/

# Copy Configuration Service models
cp configuration-service-api/src/models/*.js leadpylot-models/src/models/

# Copy PDF Service models
cp pdf-service-api/src/models/*.js leadpylot-models/src/models/
```

### 2.3 Publish Shared Models Package

**Option A: Private npm registry (recommended)**

```bash
# Setup .npmrc
echo "@leadpylot:registry=http://your-private-registry.com" > leadpylot-models/.npmrc

# Login to registry
npm login --registry=http://your-private-registry.com

# Publish package
cd leadpylot-models
npm publish
```

**Option B: Git-based package (free alternative)**

```bash
# Initialize git repository
cd leadpylot-models
git init
git add .
git commit -m "Initial commit: Shared models package v1.0.0"

# Push to GitHub/GitLab
git remote add origin https://github.com/your-org/leadpylot-models.git
git push -u origin main

# Create tag for version
git tag v1.0.0
git push --tags
```

## Phase 3: Deploy Individual Services

### 3.1 Create EC2 Instances

```bash
# Create EC2 instances for each service
SERVICES=(
  "user-auth-service:4000"
  "configuration-service:4006"
  "document-service:4002"
  "email-service:4008"
  "lead-offer-service:4003"
  "notification-service:4004"
  "pdf-service:4009"
  "reporting-service:4007"
  "search-service:3010"
)

for SERVICE in "${SERVICES[@]}"; do
  NAME="${SERVICE%%:*}"
  PORT="${SERVICE##*:}"

  aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --count 1 \
    --instance-type t3.medium \
    --key-name your-key-pair \
    --security-group-ids $SG_ID \
    --subnet-id subnet-xxxxxxxx \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME},{Key=Service,Value=$NAME},{Key=Port,Value=$PORT}]" \
    --iam-instance-profile Name=leadpylot-ec2-profile \
    --user-data file://user-data.sh
done
```

**user-data.sh (for all instances):**

```bash
#!/bin/bash
# Update system
yum update -y

# Install Docker
yum install -y docker
service docker start
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Create application directory
mkdir -p /home/ec2-user/leadpylot
chown -R ec2-user:ec2-user /home/ec2-user/leadpylot

# Enable Docker service
chkconfig docker on
```

### 3.2 Deploy Search Service (with Shared Models)

**search-service-api/package.json (update for production):**

```json
{
  "name": "search-service-api",
  "version": "1.0.0",
  "description": "Search service for LeadPylot",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "@leadpylot/models": "git+https://github.com/your-org/leadpylot-models.git#v1.0.0",
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1"
  }
}
```

**search-service-api/src/models/loader.js (production version):**

```javascript
const queryEngine = require('../services/queryEngine')
const logger = require('../utils/logger')

const loadModels = () => {
  try {
    // Production: Use shared models package
    logger.info('Loading models from @leadpylot/models package...')

    const models = require('@leadpylot/models')
    let loadedCount = 0

    Object.entries(models).forEach(([name, Model]) => {
      if (Model && Model.schema) {
        queryEngine.registerModel(name, Model.schema)
        logger.info(`Registered model: ${name}`)
        loadedCount++
      } else {
        logger.warn(`Failed to load model ${name}: No schema found`)
      }
    })

    logger.info(`Model loading complete: ${loadedCount} loaded`)
  } catch (error) {
    logger.error('Fatal error in model loader:', error)
    throw error
  }
}

module.exports = loadModels
```

**search-service-api/docker-compose.prod.yaml:**

```yaml
version: '3.8'

services:
  search-service-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: search-service-api
    ports:
      - '3010:3010'
    environment:
      - NODE_ENV=production
      - PORT=3010
      - MONGODB_URI=${MONGODB_URI}
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3010/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'awslogs'
      options:
        awslogs-group: '/aws/leadpylot/search-service'
        awslogs-region: us-east-1
        awslogs-stream-prefix: 'search-service'
```

**search-service-api/.env.prod:**

```bash
NODE_ENV=production
PORT=3010
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/leadpylot?retryWrites=true&w=majority
LOG_LEVEL=info
```

### 3.3 Deploy Other Services

Each service follows a similar pattern. Here's an example for the lead-offer-service:

**lead-offer-service-api/docker-compose.prod.yaml:**

```yaml
version: '3.8'

services:
  lead-offer-service-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: lead-offer-service-api
    ports:
      - '4003:4003'
    environment:
      - NODE_ENV=production
      - PORT=4003
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - CONFIGURATION_SERVICE_URL=http://configuration-service-ip:4006
      - USER_AUTH_SERVICE_URL=http://user-auth-service-ip:4000
      - DOCUMENT_SERVICE_URL=http://document-service-ip:4002
      - EMAIL_SERVICE_URL=http://email-service-ip:4008
      - NOTIFICATION_SERVICE_URL=http://notification-service-ip:4004
      - SEARCH_SERVICE_URL=http://search-service-ip:3010
      - FRONTEND_URL=https://your-domain.com
      - CORS_ORIGIN=https://your-domain.com
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - CLOUD_STORAGE_ENABLED=true
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:4003/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'awslogs'
      options:
        awslogs-group: '/aws/leadpylot/lead-offer-service'
        awslogs-region: us-east-1
        awslogs-stream-prefix: 'lead-offer-service'
```

### 3.4 Deployment Script

Create a deployment script to automate the process:

**deploy-service.sh:**

```bash
#!/bin/bash

SERVICE_NAME=$1
SERVICE_PORT=$2
EC2_IP=$3

if [ -z "$SERVICE_NAME" ] || [ -z "$SERVICE_PORT" ] || [ -z "$EC2_IP" ]; then
    echo "Usage: ./deploy-service.sh <service-name> <service-port> <ec2-ip>"
    exit 1
fi

echo "Deploying $SERVICE_NAME to $EC2_IP:$SERVICE_PORT"

# SSH into EC2 instance
ssh -i your-key.pem ec2-user@$EC2_IP << 'ENDSSH'
    # Clone repository
    cd /home/ec2-user/leadpylot
    if [ ! -d "leadpylot-microservices" ]; then
        git clone https://github.com/your-org/leadpylot-microservices.git
    else
        cd leadpylot-microservices
        git pull origin main
        cd ..
    fi

    # Navigate to service directory
    cd leadpylot-microservices/$SERVICE_NAME-api

    # Copy production environment file
    cp .env.prod .env

    # Build and start service
    docker-compose -f docker-compose.prod.yaml build
    docker-compose -f docker-compose.prod.yaml up -d

    # Check service status
    docker-compose -f docker-compose.prod.yaml ps
ENDSSH

echo "Deployment complete for $SERVICE_NAME"
```

**Usage:**

```bash
chmod +x deploy-service.sh

# Deploy search service
./deploy-service.sh search-service 3010 1.2.3.4

# Deploy lead-offer service
./deploy-service.sh lead-offer-service 4003 5.6.7.8
```

## Phase 4: Monitoring and Scaling

### 4.1 CloudWatch Logs Setup

```bash
# Create log groups for each service
SERVICES=(
  "user-auth-service"
  "configuration-service"
  "document-service"
  "email-service"
  "lead-offer-service"
  "notification-service"
  "pdf-service"
  "reporting-service"
  "search-service"
)

for SERVICE in "${SERVICES[@]}"; do
    aws logs create-log-group \
        --log-group-name "/aws/leadpylot/$SERVICE" \
        --region us-east-1

    # Set retention policy (30 days)
    aws logs put-retention-policy \
        --log-group-name "/aws/leadpylot/$SERVICE" \
        --retention-in-days 30 \
        --region us-east-1
done
```

### 4.2 Auto Scaling Setup

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name leadpylot-service-template \
  --version-description "Version 1" \
  --template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.medium",
    "KeyName": "your-key-pair",
    "SecurityGroupIds": ["'$SG_ID'"],
    "IamInstanceProfile": {"Name": "leadpylot-ec2-profile"},
    "UserData": "file://user-data.sh",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "leadpylot-service"}]
    }]
  }'

# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name leadpylot-search-service-asg \
  --launch-template LaunchTemplateId=lt-xxxxxxxx,Version=1 \
  --min-size 2 \
  --max-size 5 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account-id:targetgroup/leadpylot-search-tg/xxxxxxxx \
  --vpc-zone-identifier subnet-xxxxxxxx,subnet-yyyyyyyy

# Create scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name leadpylot-search-service-asg \
  --policy-name search-service-scale-up \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity \
  --cooldown 300
```

### 4.3 Load Balancer Setup (Optional)

```bash
# Create target groups
aws elbv2 create-target-group \
  --name leadpylot-search-service-tg \
  --protocol HTTP \
  --port 3010 \
  --vpc-id $VPC_ID \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold 3 \
  --unhealthy-threshold 3

# Create load balancer
aws elbv2 create-load-balancer \
  --name leadpylot-alb \
  --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
  --security-groups $SG_ID

# Note: Load Balancer ARN
ALB_ARN="arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/leadpylot-alb/xxxxxxxx"

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/leadpylot-search-tg/xxxxxxxx
```

## Phase 5: SSL/TLS Configuration

### 5.1 Obtain SSL Certificate

```bash
# Request SSL certificate using AWS Certificate Manager
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names *.your-domain.com \
  --validation-method DNS

# Note: Certificate ARN
CERT_ARN="arn:aws:acm:region:account-id:certificate/xxxxxxxx"

# Add DNS validation records to your domain registrar
# Follow AWS ACM instructions for DNS validation
```

### 5.2 Configure HTTPS on Load Balancer

```bash
# Update listener to use HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/leadpylot-search-tg/xxxxxxxx
```

## Phase 6: Backup and Disaster Recovery

### 6.1 MongoDB Backup

```bash
# Configure MongoDB Atlas automated backups
# Or create backup script for self-hosted MongoDB

# Create backup script
cat > backup-mongodb.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://username:password@mongodb-host:27017/leadpylot" \
  --out=$BACKUP_DIR/backup_$DATE

# Upload to S3
aws s3 sync $BACKUP_DIR/backup_$DATE s3://leadpylot-backups/mongodb/backup_$DATE

# Keep last 7 days only
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x backup-mongodb.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ec2-user/backup-mongodb.sh
```

### 6.2 Application Backup

```bash
# Create application backup script
cat > backup-apps.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/apps"
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm \
  -v /var/lib/docker/volumes:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/docker-volumes_$DATE.tar.gz /data

# Upload to S3
aws s3 cp $BACKUP_DIR/docker-volumes_$DATE.tar.gz \
  s3://leadpylot-backups/apps/docker-volumes_$DATE.tar.gz

# Keep last 7 days only
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x backup-apps.sh
```

## Troubleshooting

### Issue: Service fails to start

```bash
# Check service logs
docker logs search-service-api

# Check container status
docker ps -a

# Restart service
docker-compose restart search-service-api
```

### Issue: Models not loading in production

```bash
# Verify shared models package is installed
docker exec search-service-api npm list @leadpylot/models

# Check model loader logs
docker logs search-service-api | grep "Model loading"

# Rebuild container
docker-compose down search-service-api
docker-compose build search-service-api
docker-compose up -d search-service-api
```

### Issue: Network connectivity between services

```bash
# Test connectivity between services
docker exec search-service-api ping -c 3 lead-offer-service-ip

# Check security group rules
aws ec2 describe-security-groups --group-ids $SG_ID

# Test service endpoints
curl http://lead-offer-service-ip:4003/health
```

## Cost Optimization

### 1. Use Reserved Instances

```bash
# Purchase reserved instances for long-running services
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id xxxxxxxx \
  --instance-count 1
```

### 2. Use Spot Instances for Non-Critical Services

```bash
# Create launch template for spot instances
aws ec2 create-launch-template \
  --launch-template-name leadpylot-spot-template \
  --version-description "Spot instance template" \
  --template-data '{
    "InstanceType": "t3.medium",
    "InstanceMarketOptions": {
      "MarketType": "spot",
      "SpotOptions": {
        "SpotInstanceType": "one-time"
      }
    }
  }'
```

### 3. Monitor and Optimize

```bash
# View cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Set up cost alerts
aws cloudwatch put-metric-alarm \
  --alarm-name leadpylot-cost-alert \
  --alarm-description "Alert when costs exceed threshold" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

## Summary

✅ **Infrastructure:**

- VPC with public subnets
- Security groups for inter-service communication
- IAM roles for S3 access
- EC2 instances for each service

✅ **Model Access Solution:**

- Shared models package (@leadpylot/models)
- Git-based or npm registry distribution
- Production-ready model loader

✅ **Deployment:**

- Docker Compose for each service
- Automated deployment scripts
- Health checks and monitoring

✅ **Operations:**

- CloudWatch logging
- Auto Scaling
- Load Balancing
- SSL/TLS certificates
- Backup and disaster recovery

✅ **Next Steps:**

1. Implement shared models package
2. Deploy services to EC2 instances
3. Configure monitoring and alerting
4. Set up CI/CD pipeline
5. Implement disaster recovery procedures

## Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Docker Compose Production](https://docs.docker.com/compose/production/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [AWS CloudWatch](https://docs.aws.amazon.com/cloudwatch/)
- [AWS Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/)
