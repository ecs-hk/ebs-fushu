'use strict';

/* eslint-env mocha */
/* eslint "jsdoc/require-jsdoc": 0 */

// --------------------------------------------------------------------------
//                      GLOBAL VAR DEFINITIONS
// --------------------------------------------------------------------------

const assert = require('assert');
const rewire = require('rewire');
const pf = rewire('./args.js');

// Map rewired, private functions to friendlier names
const hasGoodArgs = pf.__get__('hasGoodArgs');
const processCliArgs = pf.__get__('processCliArgs');

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Ensure object keys are present in array', function() {
  const func = hasGoodArgs;
  it('should return true', function() {
    const o = {baz: null, boo: null};
    const l = ['baz', 'boo'];
    const result = func(o, l);
    assert.equal(result, true);
  });
  it('should return true', function() {
    const o = {};
    const l = ['baz', 'boo'];
    const result = func(o, l);
    assert.equal(result, true);
  });
  it('should return false', function() {
    const o = {baz: null, boo: null, fuz: null};
    const l = ['baz', 'boo'];
    const result = func(o, l);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = null;
    const l = ['baz', 'boo'];
    const result = func(o, l);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = {baz: null, boo: null};
    const l = null;
    const result = func(o, l);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = {baz: null};
    const l = [];
    const result = func(o, l);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = 'baz';
    const l = ['baz', 'boo'];
    const result = func(o, l);
    assert.equal(result, false);
  });
});

describe('Process CLI args', function() {
  const func = processCliArgs;
  it('should return object with known keys/values', function() {
    const o = {
      'dry-run': null,
      'owner-id': 'xxyy',
    };
    const result = func(o);
    assert.equal(result.hasOwnProperty('help'), false);
    assert.equal(result.dryRun, true);
    assert.equal(result.ownerId, o['owner-id']);
  });
  it('should return object with known keys/values', function() {
    const o = {
      'owner-id': 'yyzz',
    };
    const result = func(o);
    assert.equal(result.hasOwnProperty('help'), false);
    assert.equal(result.hasOwnProperty('dryRun'), false);
    assert.equal(result.ownerId, o['owner-id']);
  });
  it('should return object with known key/value', function() {
    const o = {
      help: null,
      'dry-run': null,
      'owner-id': null,
    };
    const result = func(o);
    assert.equal(result.help, true);
  });
  it('should return object with known key/value', function() {
    const o = {
      'dryyy-run': null,
      'owner-id': null,
    };
    const result = func(o);
    assert.equal(result.help, true);
  });
  it('should return object with known key/value', function() {
    const o = {};
    const result = func(o);
    assert.equal(result.help, true);
  });
  it('should return object with known key/value', function() {
    const o = 'hi';
    const result = func(o);
    assert.equal(result.help, true);
  });
  it('should return object with known key/value', function() {
    const o = ['yes', 'ok'];
    const result = func(o);
    assert.equal(result.help, true);
  });
  it('should return object with known key/value', function() {
    const o = null;
    const result = func(o);
    assert.equal(result.help, true);
  });
});
