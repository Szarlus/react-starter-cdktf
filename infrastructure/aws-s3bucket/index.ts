import { S3Bucket, S3BucketConfig } from '@cdktf/provider-aws/lib/s3-bucket';
import {
  S3BucketPublicAccessBlock,
  S3BucketPublicAccessBlockConfig,
} from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';
import { Construct } from 'constructs';

export interface AwsS3BucketProps extends S3BucketConfig {
  publicAccessBlockOptions: Partial<S3BucketPublicAccessBlockConfig>;
  bucket: string;
}

export class AwsS3Bucket extends Construct {
  public readonly _bucket: S3Bucket;

  constructor(scope: Construct, id: string, props: AwsS3BucketProps) {
    super(scope, id);

    this._bucket = new S3Bucket(this, 'AWS_S3_BUCKET', { ...props });

    new S3BucketPublicAccessBlock(this, 'AWS_S3_BUCKET_PUBLIC_ACCESS_BLOCK', {
      bucket: props.bucket,
      ...props.publicAccessBlockOptions,
    });

    new S3BucketVersioningA(this, 'app_bucket_versioning', {
      bucket: this._bucket.bucket,
      versioningConfiguration: {
        status: 'Enabled',
      },
    });
  }

  get bucket() {
    return this._bucket;
  }
}
