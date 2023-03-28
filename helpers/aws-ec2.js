'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const ec2 = require('@aws-sdk/client-ec2');
const appDebug = require('debug')('ebs-fushu:aws');

const APPNAME = 'ebs-fushu';

// ----------------------------------------------------------------------------
//                      HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Audit provided EBS volume information.
 *
 * @param {object} o - Metadata about EBS volume.
 * @returns {boolean} True if all expected metadata keys/types present.
 */
function isVolumeMetadataComplete(o) {
  if (!o || typeof o !== 'object') {
    return false;
  }
  const expectedKeys = ['devName', 'nameTag', 'instId'];
  for (let i = 0; i < expectedKeys.length; i++) {
    const k = expectedKeys[i];
    if (!o.hasOwnProperty(k) || !o[k]) {
      return false;
    }
  }
  return true;
}

// ----------------------------------------------------------------------------
//                      AWS FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Get EC2 instances associated with given AWS owner.
 *
 * @param {string} id - AWS owner ID.
 * @returns {Promise<object>} EC2 instances.
 */
async function getEc2Instances(id) {
  try {
    if (!id) {
      throw new Error('Owner ID must be specified');
    }
    const client = new ec2.EC2Client();
    const parms = {
      Filters: [{Name: 'owner-id', Values: [id]}],
    };
    const command = new ec2.DescribeInstancesCommand(parms);
    const res = await client.send(command);
    return res;
  } catch (err) {
    throw err;
  }
}

/**
 * Get completed EBS snapshots owned by given ID.
 *
 * @param {string} id - AWS owner ID.
 * @returns {Promise<object>} EBS snapshots.
 */
async function getSnapshots(id) {
  try {
    if (!id) {
      throw new Error('Owner ID must be specified');
    }
    const client = new ec2.EC2Client();
    const parms = {
      Filters: [{Name: 'status', Values: ['completed']}],
      OwnerIds: [id],
      MaxResults: 1000,
    };
    const command = new ec2.DescribeSnapshotsCommand(parms);
    const res = await client.send(command);
    return res;
  } catch (err) {
    throw err;
  }
}

/**
 * Delete a snapshot.
 *
 * @param {string} id - Snapshot ID.
 */
async function deleteSnapshot(id) {
  try {
    if (!id) {
      throw new Error('Snapshot ID must be specified');
    }
    const client = new ec2.EC2Client();
    const parms = {
      SnapshotId: id,
    };
    const command = new ec2.DeleteSnapshotCommand(parms);
    await client.send(command);
  } catch (err) {
    // A snapshot may legitimately be associated with an AMI, which means
    // it can't / shouldn't be deleted. Log about it instead of throwing.
    if (err.Code === 'InvalidSnapshot.InUse') {
      console.error(err.message);
    } else {
      throw err;
    }
  }
}

/**
 * Create a snapshot.
 *
 * @param {string} id - EBS volume ID.
 * @param {object} volMeta - Metadata about EBS volume.
 */
async function createSnapshot(id, volMeta) {
  try {
    if (!id) {
      throw new Error('Volume ID must be specified');
    }
    if (!isVolumeMetadataComplete(volMeta)) {
      throw new Error('Complete volume information must be specified');
    }
    const client = new ec2.EC2Client();
    const parms = {
      VolumeId: id,
      Description: `Created by ${APPNAME}`,
      TagSpecifications: [
        {
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'blockDev', Value: volMeta.devName },
            { Key: 'instName', Value: volMeta.nameTag },
            { Key: 'instId', Value: volMeta.instId },
          ],
        },
      ],
    };
    const command = new ec2.CreateSnapshotCommand(parms);
    await client.send(command);
  } catch (err) {
    throw err;
  }
}

// ----------------------------------------------------------------------------
//                      EXPORTS
// ----------------------------------------------------------------------------

exports.createSnapshot = createSnapshot;
exports.deleteSnapshot = deleteSnapshot;
exports.getEc2Instances = getEc2Instances;
exports.getSnapshots = getSnapshots;
