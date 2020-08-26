'use strict';

/* eslint-env mocha */
/* eslint "jsdoc/require-jsdoc": 0 */

// --------------------------------------------------------------------------
//                      GLOBAL VAR DEFINITIONS
// --------------------------------------------------------------------------

const assert = require('assert');
const rewire = require('rewire');
const pf = rewire('./aws-ec2.js');

// Map rewired, private functions to friendlier names
const isVolumeMetadataComplete = pf.__get__('isVolumeMetadataComplete');

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Ensure object keys/values are truthy', function() {
  const func = isVolumeMetadataComplete;
  it('should return true', function() {
    const o = {
      devName: 'foo',
      nameTag: 'baz',
      instId: 'boo',
    };
    const result = func(o);
    assert.equal(result, true);
  });
  it('should return false', function() {
    const o = {
      devName: null,
      nameTag: 'baz',
      instId: 'boo',
    };
    const result = func(o);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = ['devName', 'nameTag', 'instId'];
    const result = func(o);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = {};
    const result = func(o);
    assert.equal(result, false);
  });
  it('should return false', function() {
    const o = null;
    const result = func(o);
    assert.equal(result, false);
  });
});
