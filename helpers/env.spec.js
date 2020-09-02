'use strict';

/* eslint-env mocha */
/* eslint "jsdoc/require-jsdoc": 0 */

// --------------------------------------------------------------------------
//                      GLOBAL VAR DEFINITIONS
// --------------------------------------------------------------------------

const assert = require('assert');
const process = require('process');
const rewire = require('rewire');
const pf = rewire('./env.js');

// Map rewired, private functions to friendlier names
const checkAwsEnvironment = pf.__get__('checkAwsEnvironment');

// --------------------------------------------------------------------------
//                      HELPER FUNCTIONS
// --------------------------------------------------------------------------

function deleteEnvVariable(name) {
  if (process.env.hasOwnProperty(name)) {
    delete process.env[name];
  }
}

function setEnvVariable(name, value) {
  process.env[name] = value;
}

function setAwsVariables() {
  const names = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
  ];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    setEnvVariable(name, 'bazboo');
  }
}

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Audit environment variables', function() {
  const func = checkAwsEnvironment;
  it('should do nothing', function() {
    setAwsVariables();
    const result = func();
    assert.equal(result, null);
  });
  it('should throw an exception with known message', function() {
    const envVar = 'AWS_ACCESS_KEY_ID';
    const err = new Error(`Set ${envVar} in your environment`);
    setAwsVariables();
    deleteEnvVariable(envVar);
    assert.throws(function() { func(); }, err);
  });
  it('should throw an exception with known message', function() {
    const envVar = 'AWS_SECRET_ACCESS_KEY';
    const err = new Error(`Set ${envVar} in your environment`);
    setAwsVariables();
    deleteEnvVariable(envVar);
    assert.throws(function() { func(); }, err);
  });
  it('should throw an exception with known message', function() {
    const envVar = 'AWS_REGION';
    const err = new Error(`Set ${envVar} in your environment`);
    setAwsVariables();
    deleteEnvVariable(envVar);
    assert.throws(function() { func(); }, err);
  });
});
