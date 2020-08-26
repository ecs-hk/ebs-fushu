'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const app_debug = require('debug')('ebs-fushu:munge');

const RADIX = 10;

// ----------------------------------------------------------------------------
//                      FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Get value of tag:snapshots.
 *
 * @param {object[]} tags - EC2 instance tags.
 * @param {string} id - EC2 instance ID.
 * @returns {string} Tag value.
 */
function getSnapshotTagValue(tags, id) {
  let generations = null;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].Key === 'snapshots') {
      generations = parseInt(tags[i].Value, RADIX);
      break;
    }
  }
  if (!generations) {
    app_debug(`${id} no tag:snapshots found`);
    return null;
  }
  if (isNaN(generations)) {
    app_debug(`${id} tag:snapshots contains non-numeric value`);
    return null;
  }
  return generations;
}

/**
 * Get value of tag:Name.
 *
 * @param {object[]} tags - EC2 instance tags.
 * @returns {string} Tag value.
 */
function getNameTagValue(tags) {
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].Key === 'Name') {
      return tags[i].Value;
    }
  }
  return null;
}

/**
 * Format provided values and append to volume information.
 *
 * @param {object} volsInfo - All volume information, to be appended to.
 * @param {object[]} ebsVols - EBS volume information for an EC2 instance.
 * @param {number} snapGens - Number of rolling snapshots to keep.
 * @param {string} nameTag - Value of tag:Name for an EC2 instance.
 * @param {string} instId - EC2 instance ID.
 * @returns {string} Tag value.
 */
function appendToVolObj(volsInfo, ebsVols, snapGens, nameTag, instId) {
  for (let i = 0; i < ebsVols.length; i++) {
    const vol = ebsVols[i];
    // We only deal in EBS volumes in this program. If not an EBS volume,
    // or if no string-based vol ID (for some strange reason), skip it.
    if (typeof vol !== 'object' || !vol.hasOwnProperty('Ebs')) {
      app_debug(`Missing Ebs key for ${instId}`);
      continue;
    }
    if (typeof vol.Ebs !== 'object' || !vol.Ebs.hasOwnProperty('VolumeId')) {
      app_debug(`Missing VolumeId key for ${instId}`);
      continue;
    }
    const volId = vol.Ebs.VolumeId;
    if (typeof volId !== 'string' || volId.length < 8) {
      app_debug(`Malformed VolumeId for ${instId}`);
      continue;
    }
    // Per AWS official docs, an EBS volume can only be mounted to a single
    // EC2 instance, ergo we should never encounter a duplicate vol ID during
    // a single (entire) program execution.
    // https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSVolumes.html
    volsInfo[volId] = {
      instId: instId,
      devName: vol.DeviceName,
      nameTag: nameTag,
      bkupGens: snapGens,
    };
    app_debug(`Volume information for ${volId}:`);
    app_debug(volsInfo[volId]);
  }
  return volsInfo;
}

/**
 * Process AWS' EC2 instance response object to build an object of objects.
 *
 * @param {object} res - AWS response.
 * @returns {object} Formatted volume information.
 */
function buildVolObjFromAwsResponse(res) {
  // Note that vol IDs are _only_ added to this structure if they
  // have tag:snapshots = n set, where 'n' is an integer.
  let o = {};
  for (let i = 0; i < res.Reservations.length; i++) {
    const inst = res.Reservations[i].Instances;
    for (let j = 0; j < inst.length; j++) {
      const bkupGens = getSnapshotTagValue(inst[j].Tags, inst[j].InstanceId);
      // If we didn't get a legit tag:snapshots value, move on.
      if (!bkupGens) {
        continue;
      }
      const nameTag = getNameTagValue(inst[j].Tags);
      const instId = inst[j].InstanceId;
      const ebsVols = inst[j].BlockDeviceMappings;
      o = appendToVolObj(o, ebsVols, bkupGens, nameTag, instId);
    }
  }
  return o;
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
  // AWS' response data for snapshots is sorted by creation time, newest
  // to oldest. (If we wanted to be extra safe, we could explicitly sort
  // before this function.)
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
      app_debug(`Adding snapshot ${count} (${snapId}) to prune list`);
      l.push(snapId);
    }
  }
  return l;
}

/**
 * Build list of EBS snapshots to prune for all EC2 instances.
 *
 * @param {object[]} volInfo - EBS volume information.
 * @param {object[]} snapshotInfo - Snapshot information.
 * @returns {string[]} List of all snapshot IDs to prune.
 */
function buildPruneList(volInfo, snapshotInfo) {
  const volIds = Object.keys(volInfo);
  const snapshots = snapshotInfo.Snapshots;
  let pruneList = [];
  for (let i = 0; i < volIds.length; i++) {
    const volId = volIds[i];
    const generations = volInfo[volId]['bkupGens'];
    app_debug(`${volId} to keep ${generations} generations of snapshots`);
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
