'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const AWS = require('aws-sdk');
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

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
function getEc2Instances(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Owner ID must be specified'));
    }
    const parms = {
      Filters: [{Name: 'owner-id', Values: [id]}],
    };
    ec2.describeInstances(parms, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Get completed EBS snapshots owned by given ID.
 *
 * @param {string} id - AWS owner ID.
 * @returns {Promise<object>} EBS snapshots.
 */
function getSnapshots(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Owner ID must be specified'));
    }
    const parms = {
      Filters: [{Name: 'status', Values: ['completed']}],
      OwnerIds: [id],
      MaxResults: 1000,
    };
    ec2.describeSnapshots(parms, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Delete a snapshot.
 *
 * @param {string} id - Snapshot ID.
 * @returns {Promise<object>} Response from AWS.
 */
function deleteSnapshot(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Snapshot ID must be specified'));
    }
    const parms = {
      SnapshotId: id,
    };
    ec2.deleteSnapshot(parms, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Create a snapshot.
 *
 * @param {string} id - EBS volume ID.
 * @param {object} volMeta - Metadata about EBS volume.
 * @returns {Promise<object>} Response from AWS.
 */
function createSnapshot(id, volMeta) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Volume ID must be specified'));
    }
    if (!isVolumeMetadataComplete(volMeta)) {
      reject(new Error('Complete volume information must be specified'));
    }
    const parms = {
      VolumeId: id,
      Description: 'Created by ' + APPNAME,
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
    ec2.createSnapshot(parms, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

// ----------------------------------------------------------------------------
//                      EXPORTS
// ----------------------------------------------------------------------------

exports.createSnapshot = createSnapshot;
exports.deleteSnapshot = deleteSnapshot;
exports.getEc2Instances = getEc2Instances;
exports.getSnapshots = getSnapshots;
