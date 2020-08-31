'use strict';

// ---------------------------------------------------------------------------
//                  GLOBAL VARIABLE DEFINITION
// ---------------------------------------------------------------------------

const process = require('process');

// ---------------------------------------------------------------------------
//                  HELPER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Check whether variable is set in the environment.
 *
 * @param {string} name - Name of environment variable.
 * @returns {boolean} True if variable is set and has a truthy value.
 */
function isSetInEnv(name) {
  if (!process.env.hasOwnProperty(name)) {
    return false;
  }
  if (!process.env[name]) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
//                  ENVIRONMENT VARIABLE FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Confirm AWS variables are set and exported to environment.
 */
function checkAwsEnvironment() {
  const names = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
  ];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!isSetInEnv(name)) {
      throw new Error('Set ' + name + ' in your environment');
    }
  }
}

// ---------------------------------------------------------------------------
//                  EXPORTS
// ---------------------------------------------------------------------------

exports.checkAwsEnvironment = checkAwsEnvironment;
