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
npm install --production
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

## Tips

### Jenkins integration

1. Configure build job parameters for `AWS_ACCESS_KEY_ID` (string parameter), `AWS_SECRET_ACCESS_KEY` (password parameter), and `AWS_REGION` (string parameter). See example below.
2. Set repository URL to this repo.
3. Set a periodic schedule.
4. Point the build job to a Node.js installation. (Install Node.js on the build server if not already done.)
5. Add "execute shell" build steps. See example below.

#### Parameters

![Screenshot](/README.md-img/jenkins-parm-accesskey.png?raw=true)

![Screenshot](/README.md-img/jenkins-parm-secret.png?raw=true)

#### Build

![Screenshot](/README.md-img/jenkins-execshell.png?raw=true)

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

- Node.js v12 LTS
- AWS SDK for Javascript (API Version: 2016-11-15)

## Caveat

Depending on your use case, the [AWS Data Lifecycle Manager](https://aws.amazon.com/about-aws/whats-new/2018/07/introducing-amazon-data-lifecycle-manager-for-ebs-snapshots/) service may be an alternative to ebs-fushu and similar custom-written apps.
