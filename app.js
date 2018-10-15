'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const path = require('path');
const process = require('process');
const argv = require('minimist')(process.argv.slice(2));
const f = require('./functions');

function printVerboseChatter(verbose, data, title) {
  if (verbose) {
    console.log('[VERBOSE - ' + title + ' - begin]');
    console.log(JSON.stringify(data, null, 2));
    console.log('[VERBOSE - ' + title + ' - end]');
  }
  return;
}

// ----------------------------------------------------------------------------
//                      FUNCTIONS
// ----------------------------------------------------------------------------

function parseCliArgs() {
  let o = {help: false};
  let knownArgs = ['help', 'verbose', 'dry-run', 'owner-id'];
  if (argv.hasOwnProperty('help')) {
    o.help = true;
    return o;
  }
  // If any (possibly misspelled) arguments made it in, let's be safe
  // and just assume they need help.
  if (hasUnknownArgs(argv, knownArgs)) {
    o.help = true;
    return o;
  }
  if (argv.hasOwnProperty('verbose')) {
    o.verbose = true;
  }
  if (argv.hasOwnProperty('dry-run')) {
    o.dryRun = true;
  }
  if (argv.hasOwnProperty('owner-id') && argv['owner-id']) {
    o.ownerId = '' + argv['owner-id'];
  } else {
    o.ownerId = null;
  }
  return o;
}

function hasUnknownArgs(argv, validArgs) {
  let cliArgs = Object.getOwnPropertyNames(argv);
  if (cliArgs.length > 0) {
    for (let i = 0; i < cliArgs.length; i++) {
      let valid = false;
      for (let j = 0; j < validArgs.length; j++) {
        // The special (minimist) property '_' can be ignored.
        if (cliArgs[i] === validArgs[j] || cliArgs[i] === '_') {
          valid = true;
          break;
        }
      }
      if (!valid) {
        return true;
      }
    }
  }
  return false;
}

function printUsage() {
  console.log('Usage: ' + path.basename(__filename) + ' --help|' +
		'--owner-id=AWS_OWNER_ID [--verbose] [--dry-run]');
}

async function runBackupsAndPruning(ownerId, verbose, dryRun) {
  try {
    const ec2InstObj = await f.getInstanceMetadata(ownerId);
    printVerboseChatter(verbose, ec2InstObj, 'AWS response: EC2 instances');
    const bkupObj = await f.buildBkupObj(ec2InstObj);
    printVerboseChatter(verbose, bkupObj, 'Backup object');
    const snapObj = await f.getSnapshotMetadata(ownerId);
    printVerboseChatter(verbose, snapObj, 'AWS response: snapshots');
    const pruneList = await f.buildPruneList(bkupObj, snapObj);
    printVerboseChatter(verbose, pruneList, 'Prune list');
    if (dryRun) {
      console.log('Dry run complete (no pruning, no snapshots)');
    } else {
      let volIds;
      for (let i = 0; i < pruneList.length; i++) {
        let snapId = pruneList[i];
        await f.pruneSnapshot(snapId);
        console.log('Deleting snapshot ' + snapId);
      }
      volIds = Object.keys(bkupObj);
      for (let i = 0; i < volIds.length; i++) {
        let volId = volIds[i];
        await f.createSnapshot(volId, bkupObj[volId]);
        console.log('Creating snapshot for volume ' + volId);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------------------------------
//                      MAIN LOGIC
// ----------------------------------------------------------------------------

let cliObj = parseCliArgs();

if (cliObj.help || !cliObj.ownerId) {
  printUsage();
  process.exit(1);
}

runBackupsAndPruning(cliObj.ownerId, cliObj.verbose, cliObj.dryRun);
