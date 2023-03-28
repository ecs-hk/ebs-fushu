# ebs-fushu (ebs-负鼠): automated EBS snapshots

## Synopsis

Enable EBS snapshots by adding the following *EC2 instance tag*:

![Screenshot](/README.md-img/aws-insttag.png?raw=true)

Now all EBS volumes that are attached to this EC2 instance will have snapshots created. (i.e. Three generations of rolling snapshots will be kept.)

## Install

1. Download and install [Node.js](https://nodejs.org/) LTS
2. Clone this repository
3. Install dependencies:

```bash
cd ebs-fushu
npm ci
npm audit fix
```

## Prepare environment

Export AWS environment variables:

```bash
export AWS_ACCESS_KEY_ID='xx'
export AWS_SECRET_ACCESS_KEY='zz'
export AWS_REGION='us-east-1'
# Optionally enable debug messages
export DEBUG='ebs-fushu:*'
```

## Run linting and unit tests

```bash
npm test
```

## Dry run

With dry run, no snapshots will be deleted and no snapshots will be created.

```bash
# Use _your_ AWS Owner ID
node app.js --owner-id=595959xxyybb --dry-run
```

## Run

As an example, if `tag:snapshots` is set to `6` for an EC2 instance:
* The seventh oldest (and any older) snapshots will be deleted.
* A snapshot will be created for each attached volume.

In the following output, three EC2 instances (with one attached EBS volume each) are processed. For each EBS volume, one snapshot is deleted and a new one is created.

```bash
# Use _your_ AWS Owner ID
node app.js --owner-id=595959xxyybb
..
Deleting snapshot snap-0cde08cbbbbbbbbbb
Deleting snapshot snap-0ed981ccccccccccc
Deleting snapshot snap-0de499eeeeeeeeeee
Creating snapshot for volume vol-08d979defaaaaaaaa
Creating snapshot for volume vol-05dc1747dcccbbbbb
Creating snapshot for volume vol-017d181ae88888888
```

## IAM policy

The IAM service account used with ebs-fushu will need the following permissions.
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "autoscaling:Describe*",
                "ec2:CreateTags",
                "elasticloadbalancing:Describe*",
                "ec2:*Snapshot",
                "cloudwatch:Describe*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Compatibility

Tested with:

- [Node.js v18 LTS](https://nodejs.org/en/blog/announcements/v18-release-announce)
- [AWS SDK for Javascript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)

## Caveat

Depending on your use case, the [Amazon Data Lifecycle Manager for EBS Snapshots](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/snapshot-lifecycle.html) service may be an alternative to `ebs-fushu` and similar custom-written apps.
