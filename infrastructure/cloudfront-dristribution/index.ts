import { CloudfrontDistribution, CloudfrontDistributionConfig } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { CloudfrontOriginAccessIdentity } from '@cdktf/provider-aws/lib/cloudfront-origin-access-identity';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { S3BucketAcl } from '@cdktf/provider-aws/lib/s3-bucket-acl';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';
import { Construct } from 'constructs';

import { AwsS3Bucket } from '../aws-s3bucket';

const S3_ORIGIN_ID = 'react_app_origin';

export class CDN extends Construct {
  private _cloudfrontDistribution: CloudfrontDistribution;
  private _cfOai: CloudfrontOriginAccessIdentity;
  private _bucket: AwsS3Bucket;

  constructor(scope: Construct, id: string, config: Partial<CloudfrontDistributionConfig>) {
    super(scope, id);

    this._cfOai = new CloudfrontOriginAccessIdentity(scope, 'oai', {
      comment: 'react-app OAI',
    });

    this._bucket = this.makeBucket();

    this._cloudfrontDistribution = new CloudfrontDistribution(scope, 'CF_DISTRIBUTION', {
      origin: [
        {
          domainName: this._bucket._bucket.bucketRegionalDomainName,
          originId: S3_ORIGIN_ID,
          s3OriginConfig: {
            originAccessIdentity: this._cfOai.cloudfrontAccessIdentityPath,
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
      ...config,
    });

    this.allowCdnAccessToBucket();
  }

  public get bucket(): AwsS3Bucket {
    return this._bucket;
  }

  public get cloudfrontDistribution() {
    return this._cloudfrontDistribution;
  }

  public get oai() {
    return this._cfOai;
  }

  private allowCdnAccessToBucket() {
    const policyDocument = new DataAwsIamPolicyDocument(this, 'react_app_s3_policy', {
      statement: [
        {
          actions: ['s3:GetObject'],
          resources: [`${this._bucket._bucket.arn}/*`, this._bucket._bucket.arn],
          principals: [
            {
              type: 'AWS',
              identifiers: [this._cfOai.iamArn],
            },
          ],
        },
      ],
    });

    new S3BucketPolicy(this, 'react_app_bucket_policy', {
      bucket: this._bucket._bucket.bucket,
      policy: policyDocument.json,
    });
  }

  private makeBucket() {
    const newBucket = new AwsS3Bucket(this, 'static_react_bucket', {
      bucket: 'fe-bootcamp-app',
      tags: {
        name: 'fe-bootcamp-app',
      },
      publicAccessBlockOptions: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
    });

    new S3BucketAcl(this, 'private_bucket_acl', {
      bucket: newBucket._bucket.bucket,
      acl: 'private',
    });

    new S3BucketVersioningA(this, 'app_bucket_versioning', {
      bucket: newBucket._bucket.bucket,
      versioningConfiguration: {
        status: 'Enabled',
      },
    });

    return newBucket;
  }
}
