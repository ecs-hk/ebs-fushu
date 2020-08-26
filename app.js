'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const path = require('path');
const process = require('process');
const argv = require('minimist')(process.argv.slice(2));
const args = require('./helpers/args.js');
const aws = require('./helpers/aws-ec2.js');
const munge = require('./helpers/munge.js');

// ----------------------------------------------------------------------------
//                      FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Print program usage.
 */
function printUsage() {
  const p = path.basename(__filename);
  console.log(`Usage: ${p} --help|--owner-id=AWS_OWNER_ID [--dry-run]`);
}

/**
 * Gather EC2 instance and EBS snapshot information, prune snapshots based
 * on desired generations to keep, then create snapshots.
 *
 * @param {string} id - AWS owner ID.
 * @param {boolean} dryRun - True if "dry run" (meaning: no action taken).
 */
async function runPruningAndSnapshots(id, dryRun) {
  try {
    const ec2Instances = await aws.getEc2Instances(id);
    const snapshots = await aws.getSnapshots(id);
    const volInfo = munge.buildVolObjFromAwsResponse(ec2Instances);
    const snapshotsToPrune = munge.buildPruneList(volInfo, snapshots);
    if (dryRun) {
      console.log('DRY RUN\n\nSnapshots that would be pruned:');
      console.dir(snapshotsToPrune);
      console.log('Volumes that would be snapshotted:');
      console.dir(Object.keys(volInfo));
      return;
    }
    for (let i = 0; i < snapshotsToPrune.length; i++) {
      const snapId = snapshotsToPrune[i];
      console.log(`Deleting snapshot ${snapId}`);
      await aws.deleteSnapshot(snapId);
    }
    const volIds = Object.keys(volInfo);
    for (let i = 0; i < volIds.length; i++) {
      const volId = volIds[i];
      console.log('Creating snapshot for volume ' + volId);
      await aws.createSnapshot(volId, volInfo[volId]);
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------------------------------
//                      MAIN LOGIC
// ----------------------------------------------------------------------------

// Remove the special '_' key (used by the minimist library)
delete argv['_'];
const cliObj = args.processCliArgs(argv);

if (cliObj.help || !cliObj.ownerId) {
  printUsage();
  process.exit(1);
}

runPruningAndSnapshots(cliObj.ownerId, cliObj.dryRun);
