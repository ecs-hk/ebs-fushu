'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const app_debug = require('debug')('ebs-fushu:args');

// ----------------------------------------------------------------------------
//                      FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Compare object keys with a list of known args.
 *
 * @param {object} args - CLI args.
 * @param {string[]} validArgs - Known valid args.
 * @returns {boolean} True if invalid args found.
 */
function hasGoodArgs(args, validArgs) {
  if (!args || typeof args !== 'object') {
    return false;
  }
  if (!validArgs || !Array.isArray(validArgs)) {
    return false;
  }
  const l = Object.getOwnPropertyNames(args);
  for (let i = 0; i < l.length; i++) {
    app_debug(`Checking whether "${l[i]}" is a valid CLI arg`);
    if (!validArgs.includes(l[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Process CLI args and build an object for further app action.
 *
 * @param {object} args - CLI args.
 * @returns {object} Processed args.
 */
function processCliArgs(args) {
  app_debug('Args received:');
  app_debug(args);
  if (!args || typeof args !== 'object') {
    return {help: true};
  }
  if (args.hasOwnProperty('help')) {
    return {help: true};
  }
  const knownArgs = ['help', 'dry-run', 'owner-id'];
  if (!hasGoodArgs(args, knownArgs)) {
    app_debug('At least one unknown arg received');
    return {help: true};
  }
  const o = {};
  if (args.hasOwnProperty('dry-run')) {
    o.dryRun = true;
  }
  if (args.hasOwnProperty('owner-id') && args['owner-id']) {
    // Coerce a (potentially all-numeric) number to string.
    o.ownerId = '' + args['owner-id'];
  } else {
    return {help: true};
  }
  return o;
}

// ----------------------------------------------------------------------------
//                      EXPORTS
// ----------------------------------------------------------------------------

exports.processCliArgs = processCliArgs;
