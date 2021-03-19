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
const isRegularObject = pf.__get__('isRegularObject');
const processCliArgs = pf.__get__('processCliArgs');

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Test for regular, non-empty object', function() {
  const func = isRegularObject;
  it('should return true', function() {
    const o = {foo: 'baz'};
    const result = func(o);
    assert.equal(result, true);
  });
  it('should return true', function() {
    const o = {foo: null};
    const result = func(o);
    assert.equal(result, true);
  });
  it('should return true', function() {
    const o = {foo: 'baz', fuz: 'baz'};
    const result = func(o);
    assert.equal(result, true);
  });
  it('should return true', function() {
    const o = {};
    const result = func(o);
    assert.equal(result, true);
  });
  it('should return false', function() {
    const o = ['foo'];
    const result = func(o);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = 'foo';
    const result = func(o);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = null;
    const result = func(o);
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
    const err = new Error('Contact dev: CLI arg handling is broken');
    assert.throws(function() { func(o); }, err);
  });
  it('should return object with known key/value', function() {
    const o = ['yes', 'ok'];
    const err = new Error('Contact dev: CLI arg handling is broken');
    assert.throws(function() { func(o); }, err);
  });
  it('should return object with known key/value', function() {
    const o = null;
    const err = new Error('Contact dev: CLI arg handling is broken');
    assert.throws(function() { func(o); }, err);
  });
});
