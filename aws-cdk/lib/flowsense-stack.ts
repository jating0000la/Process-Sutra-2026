import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface FlowSenseStackProps extends cdk.StackProps {
  domainName?: string;
  hostedZoneId?: string;
}

export class FlowSenseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FlowSenseStackProps = {}) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'FlowSenseVpc', {
      maxAzs: 2,
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Database Security Group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for PostgreSQL database',
      allowAllOutbound: false,
    });

    // Database Subnet Group
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for PostgreSQL database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // Database Credentials
    const dbCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      description: 'PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'flowsense_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'PostgreSQLDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'flowsense',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      deleteAutomatedBackups: false,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      enablePerformanceInsights: true,
    });

    // Application Secrets
    const appSecrets = new secretsmanager.Secret(this, 'ApplicationSecrets', {
      description: 'FlowSense application secrets',
      secretObjectValue: {
        SESSION_SECRET: cdk.SecretValue.unsafePlainText('change-me-in-production'),
        FIREBASE_PROJECT_ID: cdk.SecretValue.unsafePlainText('taskflowpro-c62c1'),
        FIREBASE_CLIENT_EMAIL: cdk.SecretValue.unsafePlainText('firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com'),
        FIREBASE_PRIVATE_KEY: cdk.SecretValue.unsafePlainText('your-firebase-private-key'),
        FIREBASE_CLIENT_ID: cdk.SecretValue.unsafePlainText('104843425969082480520'),
        VITE_FIREBASE_API_KEY: cdk.SecretValue.unsafePlainText('AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0'),
        VITE_FIREBASE_AUTH_DOMAIN: cdk.SecretValue.unsafePlainText('taskflowpro-c62c1.firebaseapp.com'),
        VITE_FIREBASE_PROJECT_ID: cdk.SecretValue.unsafePlainText('taskflowpro-c62c1'),
        VITE_FIREBASE_STORAGE_BUCKET: cdk.SecretValue.unsafePlainText('taskflowpro-c62c1.appspot.com'),
        VITE_FIREBASE_MESSAGING_SENDER_ID: cdk.SecretValue.unsafePlainText('975860144476'),
        VITE_FIREBASE_APP_ID: cdk.SecretValue.unsafePlainText('1:975860144476:web:678bc5d5e4c4030e450999'),
        VITE_FIREBASE_MEASUREMENT_ID: cdk.SecretValue.unsafePlainText('G-GVQGWCF9EK'),
      },
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'FlowSenseCluster', {
      vpc,
      containerInsights: true,
    });

    // Task Role
    const taskRole = new iam.Role(this, 'FlowSenseTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Allow access to secrets
    dbCredentials.grantRead(taskRole);
    appSecrets.grantRead(taskRole);

    // Allow database access
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow ECS tasks to access PostgreSQL'
    );

    // Certificate (if domain provided)
    let certificate: acm.Certificate | undefined;
    if (props.domainName && props.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      certificate = new acm.Certificate(this, 'Certificate', {
        domainName: props.domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
    }

    // Fargate Service with Application Load Balancer
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FlowSenseService', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('your-account.dkr.ecr.region.amazonaws.com/flowsense:latest'),
        containerPort: 5000,
        taskRole,
        secrets: {
          DATABASE_URL: ecs.Secret.fromSecretsManager(
            dbCredentials,
            'engine,host,port,dbname,username,password'
          ),
          SESSION_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'SESSION_SECRET'),
          FIREBASE_PROJECT_ID: ecs.Secret.fromSecretsManager(appSecrets, 'FIREBASE_PROJECT_ID'),
          FIREBASE_CLIENT_EMAIL: ecs.Secret.fromSecretsManager(appSecrets, 'FIREBASE_CLIENT_EMAIL'),
          FIREBASE_PRIVATE_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'FIREBASE_PRIVATE_KEY'),
          FIREBASE_CLIENT_ID: ecs.Secret.fromSecretsManager(appSecrets, 'FIREBASE_CLIENT_ID'),
          VITE_FIREBASE_API_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_API_KEY'),
          VITE_FIREBASE_AUTH_DOMAIN: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_AUTH_DOMAIN'),
          VITE_FIREBASE_PROJECT_ID: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_PROJECT_ID'),
          VITE_FIREBASE_STORAGE_BUCKET: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_STORAGE_BUCKET'),
          VITE_FIREBASE_MESSAGING_SENDER_ID: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
          VITE_FIREBASE_APP_ID: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_APP_ID'),
          VITE_FIREBASE_MEASUREMENT_ID: ecs.Secret.fromSecretsManager(appSecrets, 'VITE_FIREBASE_MEASUREMENT_ID'),
        },
        environment: {
          NODE_ENV: 'production',
          PORT: '5000',
        },
      },
      memoryLimitMiB: 1024,
      cpu: 512,
      desiredCount: 2,
      publicLoadBalancer: true,
      domainName: props.domainName,
      domainZone: props.domainName && props.hostedZoneId 
        ? route53.HostedZone.fromHostedZoneAttributes(this, 'Domain', {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.domainName,
          })
        : undefined,
      certificate,
      redirectHTTP: !!certificate,
    });

    // Health Check
    fargateService.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
    });

    // Auto Scaling
    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint',
    });

    if (props.domainName) {
      new cdk.CfnOutput(this, 'DomainURL', {
        value: `https://${props.domainName}`,
        description: 'Application URL',
      });
    }
  }
}
