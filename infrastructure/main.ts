// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from 'constructs';
import { App, TerraformOutput, TerraformStack } from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';

import { CDN } from './cloudfront-dristribution';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // define resources here
    new AwsProvider(this, id, {
      region: 'eu-west-1',
      profile: 'tsh-team',
    });

    const cdn = new CDN(this, 'cf_distribution', {});

    new TerraformOutput(this, 'domainName', {
      value: cdn.cloudfrontDistribution.domainName,
    });

    new TerraformOutput(this, 'bucketName', {
      value: cdn.bucket.bucket.bucketDomainName,
    });
  }
}

const app = new App();
new MyStack(app, 'infrastructure');
app.synth();
