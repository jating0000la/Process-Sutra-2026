#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FlowSenseStack } from '../lib/flowsense-stack';

const app = new cdk.App();

// Development environment
new FlowSenseStack(app, 'FlowSense-Dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  // Uncomment and configure if you have a domain:
  // domainName: 'dev.yourdomain.com',
  // hostedZoneId: 'YOUR_HOSTED_ZONE_ID',
});

// Production environment
new FlowSenseStack(app, 'FlowSense-Prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  // Uncomment and configure if you have a domain:
  // domainName: 'yourdomain.com',
  // hostedZoneId: 'YOUR_HOSTED_ZONE_ID',
});
