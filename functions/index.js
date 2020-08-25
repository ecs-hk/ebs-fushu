'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const AWS = require('aws-sdk');
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

const APPNAME = 'ebs-fushu';
const RADIX = 10;

// ----------------------------------------------------------------------------
//                      AWS FUNCTIONS
// ----------------------------------------------------------------------------

function getInstances(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Owner ID must be specified'));
    }
    let parms = {
      Filters: [{Name: 'owner-id', Values: [id]}],
    };
    ec2.describeInstances(parms, (err, data) => {
      if (err) {
        reject(new Error(err));
      }
      resolve(data);
    });
  });
}

function getSnapshots(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Owner ID must be specified'));
    }
    let parms = {
      Filters: [{Name: 'status', Values: ['completed']}],
      OwnerIds: [id],
      MaxResults: 1000,
    };
    ec2.describeSnapshots(parms, (err, data) => {
      if (err) {
        reject(new Error(err));
      }
      resolve(data);
    });
  });
}

function deleteSnapshot(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Snapshot ID must be specified'));
    }
    let parms = {
      SnapshotId: id,
    };
    ec2.deleteSnapshot(parms, (err, data) => {
      if (err) {
        reject(new Error(err));
      }
      resolve(data);
    });
  });
}

function createSnapshot(id, descObj) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error('Volume ID must be specified'));
    }
    let parms = {
      VolumeId: id,
      Description: 'Created by ' + APPNAME,
      TagSpecifications: [
        {
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'blockDev', Value: descObj.devName },
            { Key: 'instName', Value: descObj.nameTag },
            { Key: 'instId', Value: descObj.instId },
          ],
        },
      ],
    };
    ec2.createSnapshot(parms, (err, data) => {
      if (err) {
        reject(new Error(err));
      }
      resolve(data);
    });
  });
}

// ----------------------------------------------------------------------------
//                      HELPER FUNCTIONS
// ----------------------------------------------------------------------------

function getVolIdsAndBkupMetadata(awsObj) {
  // This function iterates over AWS' formiddable EC2 instance
  // response JSON, and extracts data from it to build an object
  // of objects that will contain EBS vol ID as the key, a la:
  // {
  //    'vol-xxxyyyzzz': {
  //      instId: 'i-aaabbbccc',
  //      devName: '/dev/sda1',
  //      nameTag: 'agon',
  //      bkupGens: 8,
  //     }, ..
  // }
  // Note that vol IDs are _only_ added to this structure if they
  // have tag:snapshots = n set, where 'n' is an integer.
  let o = {};
  for (let i = 0; i < awsObj.Reservations.length; i++) {
    let inst = awsObj.Reservations[i].Instances;
    for (let j = 0; j < inst.length; j++) {
      let bkupGens = teaseOutSnapshotTagValue(inst[j].Tags, inst[j].InstanceId);
      // If we didn't get a legit tag:snapshots value, move on.
      if (!bkupGens) {
        continue;
      }
      let nameTag = teaseOutNameTagValue(inst[j].Tags);
      let instId = inst[j].InstanceId;
      let ebsVols = inst[j].BlockDeviceMappings;
      o = appendToBkupObj(o, ebsVols, bkupGens, nameTag, instId);
    }
  }
  return o;
}

function teaseOutSnapshotTagValue(tags, instId) {
  let num;
  let tagFound = false;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].Key === 'snapshots') {
      num = parseInt(tags[i].Value, RADIX);
      tagFound = true;
      break;
    }
  }
  if (!tagFound) {
    // In this case, the EC2 instance doesn't have a tag:snapshot, so just
    // quietly get out.
    return null;
  }
  if (isNaN(num)) {
    // This is a little bit worrisome case, because it means tag:snapshot
    // has been assigned to an EC2 instance, but the value (probably
    // accidentally) was not numeric. At least give 'em a warning.
    console.error('WARNING tag:snapshots non-numeric value (' + instId + ')');
    return null;
  }
  return num;
}

function teaseOutNameTagValue(tags) {
  // It's not especially efficient to walk the tags array twice,
  // but.. this is much easier on the eyes. (And the tags array
  // is pretty small.)
  let name;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].Key === 'Name') {
      name = tags[i].Value;
      break;
    }
  }
  return name;
}

function appendToBkupObj(bkupObj, ebsVols, bkupGens, nameTag, instId) {
  for (let i = 0; i < ebsVols.length; i++) {
    let vol = ebsVols[i];
    let volId;
    // We only deal in EBS volumes in this program. If not an EBS volume,
    // or if no string-based vol ID (for some strange reason), skip it.
    if (typeof vol !== 'object' || !vol.hasOwnProperty('Ebs')) {
      continue;
    }
    if (typeof vol.Ebs !== 'object' || !vol.Ebs.hasOwnProperty('VolumeId')) {
      continue;
    }
    volId = vol.Ebs.VolumeId;
    if (typeof volId !== 'string' || volId.length < 8) {
      continue;
    }
    // Per AWS official docs, an EBS volume can only be mounted to a single
    // EC2 instance, ergo we should never encounter a duplicate vol ID during
    // a single (entire) program execution.
    // https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSVolumes.html
    bkupObj[volId] = {
      instId: instId,
      devName: vol.DeviceName,
      nameTag: nameTag,
      bkupGens: bkupGens,
    };
  }
  return bkupObj;
}

function getListOfSnapshotsToPrune(id, snapshots, numToKeep) {
  // AWS' response data for snapshots is sorted by creation time, newest
  // to oldest. (If we wanted to be extra safe, we could explicitly sort
  // before this function.)
  let l = [];
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].VolumeId !== id) {
      continue;
    }
    numToKeep--;
    if (numToKeep >= 0) {
      continue;
    }
    l.push(snapshots[i].SnapshotId);
  }
  return l;
}

// ----------------------------------------------------------------------------
//                      EXPORTED FUNCTIONS
// ----------------------------------------------------------------------------

exports.getInstanceMetadata = async function(ownerId) {
  try {
    let p = await getInstances(ownerId);
    return p;
  } catch (err) {
    throw new Error(err);
  }
};

exports.getSnapshotMetadata = async function(ownerId) {
  try {
    let p = await getSnapshots(ownerId);
    return p;
  } catch (err) {
    throw new Error(err);
  }
};

exports.buildBkupObj = async function(awsObj) {
  try {
    let o = getVolIdsAndBkupMetadata(awsObj);
    return o;
  } catch (err) {
    throw new Error(err);
  }
};

exports.buildPruneList = async function(bkupObj, ebsSnapshotObj) {
  try {
    let volIds = Object.keys(bkupObj);
    let snapshots = ebsSnapshotObj.Snapshots;
    let pruneList = [];
    for (let i = 0; i < volIds.length; i++) {
      let volId = volIds[i];
      let numToKeep = bkupObj[volId]['bkupGens'];
      // Add the snapshot IDs we want to prune to the big ol' list,
      // plucking them from the AWS EBS snapshot output by comparing
      // against vol ID, and then just using the ones that are greater
      // than numToKeep.
      let result = getListOfSnapshotsToPrune(volId, snapshots, numToKeep);
      pruneList = pruneList.concat(result);
    }
    return pruneList;
  } catch (err) {
    throw new Error(err);
  }
};

exports.pruneSnapshot = async function(snapshotId) {
  try {
    let p = await deleteSnapshot(snapshotId);
    return p;
  } catch (err) {
    console.error(`Problem deleting snapshot (${snapshotId})`);
    console.error(err);
  }
};

exports.createSnapshot = async function(volId, volDescObj) {
  try {
    let p = await createSnapshot(volId, volDescObj);
    return p;
  } catch (err) {
    throw new Error(err);
  }
};
