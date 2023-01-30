import { S3Bucket, S3BucketConfig } from '@cdktf/provider-aws/lib/s3-bucket';
import {
  S3BucketPublicAccessBlock,
  S3BucketPublicAccessBlockConfig,
} from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { Construct } from 'constructs';

export interface AwsS3BucketProps extends S3BucketConfig {
  publicAccessBlockOptions: Partial<S3BucketPublicAccessBlockConfig>;
}

export class AwsS3Bucket extends Construct {
  public readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, props: AwsS3BucketProps) {
    super(scope, id);

    this.bucket = new S3Bucket(this, 'AWS_S3_BUCKET', { ...props });

    // new S3BucketPublicAccessBlock(this, 'AWS_S3_BUCKET_PUBLIC_ACCESS_BLOCK', {
    //   bucket: props.bucket!,
    //   ...props.publicAccessBlockOptions,
    // });
    new S3BucketPublicAccessBlock(this, 'block_public_access', {
      bucket: props.bucket!,

      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });
  }
}
