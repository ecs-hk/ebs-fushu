'use strict';

/* eslint consistent-return: 0 */

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const appDebug = require('debug')('ebs-fushu:munge');

const RADIX = 10;

// ----------------------------------------------------------------------------
//                      EC2 INSTANCE MUNGE FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Get value of tag:snapshots.
 *
 * @param {object[]} tags - EC2 instance tags.
 * @param {string} id - EC2 instance ID.
 * @returns {number|null} Tag value.
 */
function getSnapshotsTagValue(tags, id) {
  if (!tags || !Array.isArray(tags)) {
    appDebug(`${id} tags missing`);
    return null;
  }
  const o = tags.find(x => x.Key === 'snapshots');
  if (o && o.hasOwnProperty('Value')) {
    return parseInt(o.Value, RADIX);
  }
}

/**
 * Get value of tag:Name.
 *
 * @param {object[]} tags - EC2 instance tags.
 * @param {string} id - EC2 instance ID.
 * @returns {string} Tag value.
 */
function getNameTagValue(tags, id) {
  if (!tags || !Array.isArray(tags)) {
    appDebug(`${id} tags missing`);
    return null;
  }
  const o = tags.find(x => x.Key === 'Name');
  if (o && o.hasOwnProperty('Value')) {
    return o.Value;
  }
}

/**
 * Format provided values and append to volume information.
 *
 * @todo Write unit tests.
 * @param {object} volsInfo - All volume information, to be appended to.
 * @param {object[]} ebsVols - EBS volume information for an EC2 instance.
 * @param {number} snapGens - Number of rolling snapshots to keep.
 * @param {string} nameTag - Value of tag:Name for an EC2 instance.
 * @param {string} instId - EC2 instance ID.
 * @returns {object} All volume information, with new addition/s.
 */
function appendToVolObj(volsInfo, ebsVols, snapGens, nameTag, instId) {
  ebsVols.filter(x => {
    // We only deal in EBS volumes in this program. If not an EBS volume,
    // or if no string-based vol ID (for some strange reason), skip it.
    if (typeof x !== 'object' || !x.hasOwnProperty('Ebs')) {
      appDebug(`Missing Ebs key for ${instId}`);
      return false;
    }
    if (typeof x.Ebs !== 'object' || !x.Ebs.hasOwnProperty('VolumeId')) {
      appDebug(`Missing VolumeId key for ${instId}`);
      return false;
    }
    const volId = x.Ebs.VolumeId;
    if (typeof volId !== 'string' || volId.length < 8) {
      appDebug(`Malformed VolumeId for ${instId}`);
      return false;
    }
    // Per AWS official docs, an EBS volume can only be mounted to a single
    // EC2 instance, ergo we should never encounter a duplicate vol ID during
    // a single (entire) program execution.
    // https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSVolumes.html
    volsInfo[volId] = {
      instId: instId,
      devName: x.DeviceName,
      nameTag: nameTag,
      bkupGens: snapGens,
    };
    appDebug(`Volume information for ${volId}:`);
    appDebug(volsInfo[volId]);
  });
  return volsInfo;
}

/**
 * Process AWS' EC2 instance response object to build an object of objects.
 *
 * @todo Write unit tests.
 * @param {object} res - AWS response.
 * @returns {object} Formatted volume information.
 */
function buildVolObjFromAwsResponse(res) {
  // Note that vol IDs are _only_ added to this structure if they
  // have tag:snapshots = n set, where 'n' is an integer.
  let volsInfo = {};
  res.Reservations.forEach(x => {
    x.Instances.filter(y => {
      const tags = y.Tags;
      const instId = y.InstanceId;
      const bkupGens = getSnapshotsTagValue(tags, instId);
      // If we didn't get a legit tag:snapshots value, move on.
      if (!bkupGens) return false;
      const nameTag = getNameTagValue(tags, instId);
      const ebsVols = y.BlockDeviceMappings;
      volsInfo = appendToVolObj(volsInfo, ebsVols, bkupGens, nameTag, instId);
    });
  });
  return volsInfo;
}

// ----------------------------------------------------------------------------
//                      SNAPSHOT MUNGE FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Sort list of objects by StartTime (Date type) value in descending order.
 *
 * @param {object[]} snapshots - Snapshot information.
 * @returns {object[]} Sorted snapshots.
 */
function sortByStartTime(snapshots) {
  if (!snapshots || !Array.isArray(snapshots)) {
    appDebug('Snapshots missing');
    return [];
  }
  snapshots.sort(function(a, b) {
    if (!a.hasOwnProperty('StartTime')) {
      throw new Error(`${a.SnapshotId} missing "StartTime" property`);
    }
    if (!b.hasOwnProperty('StartTime')) {
      throw new Error(`${b.SnapshotId} missing "StartTime" property`);
    }
    return b.StartTime - a.StartTime;
  });
  return snapshots;
}

/**
 * Calculate which snapshots to prune given desired number to keep.
 *
 * @param {string} id - EBS volume ID.
 * @param {object[]} snapshots - Snapshot information.
 * @param {number} generations - Number of rolling snapshots to keep.
 * @returns {string} Tag value.
 */
function buildPruneListForOneInstance(id, snapshots, generations) {
  if (!id || typeof id !== 'string') {
    appDebug('Invalid volume ID, cannot build prune list');
    return [];
  }
  if (!snapshots || !Array.isArray(snapshots)) {
    appDebug(`${id} Invalid snapshots, cannot build prune list`);
    return [];
  }
  if (isNaN(generations) || generations <= 0) {
    appDebug(`${id} Invalid generations, cannot build prune list`);
    return [];
  }
  const l = [];
  let count = 0;
  for (let i = 0; i < snapshots.length; i++) {
    // Only process snapshots for the specified volume ID.
    if (snapshots[i].VolumeId !== id) {
      continue;
    }
    count++;
    if (count > generations) {
      const snapId = snapshots[i].SnapshotId;
      appDebug(`Adding snapshot ${count} (${snapId}) to prune list`);
      l.push(snapId);
    }
  }
  return l;
}

/**
 * Build list of EBS snapshots to prune for all EC2 instances.
 *
 * @todo Write unit tests.
 * @param {object[]} volInfo - EBS volume information.
 * @param {object[]} snapshotInfo - Snapshot information.
 * @returns {string[]} List of all snapshot IDs to prune.
 */
function buildPruneList(volInfo, snapshotInfo) {
  const volIds = Object.keys(volInfo);
  const snapshots = sortByStartTime(snapshotInfo.Snapshots);
  let pruneList = [];
  for (let i = 0; i < volIds.length; i++) {
    const volId = volIds[i];
    const generations = volInfo[volId]['bkupGens'];
    appDebug(`${volId} to keep ${generations} generations of snapshots`);
    const l = buildPruneListForOneInstance(volId, snapshots, generations);
    pruneList = pruneList.concat(l);
  }
  return pruneList;
}

// ----------------------------------------------------------------------------
//                      EXPORTS
// ----------------------------------------------------------------------------

exports.buildVolObjFromAwsResponse = buildVolObjFromAwsResponse;
exports.buildPruneList = buildPruneList;
