// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { S3BucketAcl } from '@cdktf/provider-aws/lib/s3-bucket-acl';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';
import { CloudfrontDistribution } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';
import { CloudfrontOriginAccessIdentity } from '@cdktf/provider-aws/lib/cloudfront-origin-access-identity';

// const S3_BACKEND_BUCKET_NAME = 'fe-bootcamp-cdktf-remote-backend';
const S3_ORIGIN_ID = 'react_app_origin';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // define resources here
    new AwsProvider(this, id, {
      region: 'eu-west-1',
      profile: 'tsh-team',
    });

    // new S3Backend(this, {
    //   bucket: S3_BACKEND_BUCKET_NAME,
    //   key: 'fe_bootcamp/terraform.tfstate',
    //   encrypt: true,
    // });

    const appBucket = new S3Bucket(this, 'static_react_bucket', {
      // acl: 'private',
      bucket: 'fe-bootcamp-app',

      tags: {
        name: 'fe-bootcamp-app',
      },
    });

    new S3BucketPublicAccessBlock(this, 'block_public_access', {
      bucket: appBucket.bucket,

      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    new S3BucketAcl(this, 'private_bucket_acl', {
      bucket: appBucket.bucket,
      acl: 'private',
    });

    new S3BucketVersioningA(this, 'app_bucket_versioning', {
      bucket: appBucket.bucket,
      versioningConfiguration: {
        status: 'Enabled',
      },
    });

    const cfOai = new CloudfrontOriginAccessIdentity(this, 'oai', {
      comment: 'react-app OAI',
    });

    new CloudfrontDistribution(this, 'cf_distribution', {
      origin: [
        {
          domainName: appBucket.bucketRegionalDomainName,
          originId: S3_ORIGIN_ID,
          s3OriginConfig: {
            originAccessIdentity: cfOai.cloudfrontAccessIdentityPath,
          },
        },
      ],
      enabled: true,
      defaultCacheBehavior: {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        targetOriginId: S3_ORIGIN_ID,
        viewerProtocolPolicy: 'redirect-to-https', // ensure we serve https
        forwardedValues: { queryString: true, cookies: { forward: 'none' } },
      },
      restrictions: { geoRestriction: { restrictionType: 'none' } },
      viewerCertificate: { cloudfrontDefaultCertificate: true }, // we use the default SSL Certificate
      defaultRootObject: 'index.html',
    });

    // const pipelineAssumeRolePolicyDocument = new DataAwsIamPolicyDocument(this, "codepipeline_assume_role_policy", {
    //   version: "2012-10-17",
    //   statement: [{
    //     effect: "Allow",
    //     principals: [{
    //       type: "Service",
    //       identifiers: [
    //         "codepipeline.amazonaws.com",
    //       ],
    //     }],
    //     actions: [
    //       "sts:AssumeRole",
    //     ],
    //   }],
    // })

    const policyDocument = new DataAwsIamPolicyDocument(this, 'react_app_s3_policy', {
      statement: [
        {
          actions: ['s3:GetObject'],
          resources: [appBucket.arn + '/*'],
          principals: [
            {
              type: 'AWS',
              identifiers: [cfOai.iamArn],
            },
          ],
        },
      ],
    });

    new S3BucketPolicy(this, 'react_app_bucket_policy', {
      bucket: appBucket.bucket,
      policy: policyDocument.json,
    });
  }
}

const app = new App();
new MyStack(app, 'infrastructure');
app.synth();
