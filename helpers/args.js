'use strict';

// ----------------------------------------------------------------------------
//                      GLOBAL VARIABLES
// ----------------------------------------------------------------------------

const appDebug = require('debug')('ebs-fushu:args');

// ----------------------------------------------------------------------------
//                      FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Determine whether a variable is a regular (non-array) object with at least
 * one key.
 *
 * @param {*} suspect - Variable of unknown type.
 * @returns {boolean} True if a regular object with one or more keys.
 */
function isRegularObject(suspect) {
  if (!suspect || typeof suspect !== 'object' || Array.isArray(suspect)) {
    return false;
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
  appDebug(args);
  if (!isRegularObject(args)) {
    throw new Error('Contact dev: CLI arg handling is broken');
  }
  if (Object.keys(args).length === 0) {
    return {help: true};
  }
  // Process CLI arg object, and assume help is needed if any unknown args
  // were received.
  const mapped = Object.entries(args).map(([k, v]) => {
    // Coerce (possibly numeric) owner ID to string.
    if (k === 'owner-id') return {ownerId: '' + v};
    if (k === 'dry-run') return {dryRun: true};
    return {help: true};
  });
  // Spread the array of objects and combine into one object.
  const combined = Object.assign(...mapped);
  appDebug(combined);
  return combined;
}

// ----------------------------------------------------------------------------
//                      EXPORTS
// ----------------------------------------------------------------------------

exports.processCliArgs = processCliArgs;
