'use strict';

/* eslint-env mocha */
/* eslint "jsdoc/require-jsdoc": 0 */

// --------------------------------------------------------------------------
//                      GLOBAL VAR DEFINITIONS
// --------------------------------------------------------------------------

const assert = require('assert');
const rewire = require('rewire');
const pf = rewire('./munge.js');

// Map rewired, private functions to friendlier names
const getSnapshotsTagValue = pf.__get__('getSnapshotsTagValue');
const getNameTagValue = pf.__get__('getNameTagValue');
const sortByStartTime = pf.__get__('sortByStartTime');
const buildPruneListForOneInstance =
  pf.__get__('buildPruneListForOneInstance');

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Retrieve "snapshot" tag value', function() {
  const func = getSnapshotsTagValue;
  it('should return a known number', function() {
    const lob = [
      {Key: 'snapshots', Value: '10'},
      {Key: 'foo', Value: 'baz'},
    ];
    const id = 'id-buz';
    const result = func(lob, id);
    assert.equal(result, 10);
  });
  it('should return a known number', function() {
    const lob = [
      {Key: 'snapshots', Value: 10},
      {Key: 'foo', Value: 'baz'},
    ];
    const id = 'id-buz';
    const result = func(lob, id);
    assert.equal(result, 10);
  });
  it('should return null', function() {
    const lob = [
      {Key: 'snupshuts', Value: 10},
      {Key: 'foo', Value: 'baz'},
    ];
    const id = 'id-buz';
    const result = func(lob, id);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = [];
    const id = {};
    const result = func(lob, id);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = {};
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = 'snapshots';
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const result = func();
    assert.equal(result, null);
  });
});

describe('Retrieve "Name" tag value', function() {
  const func = getNameTagValue;
  it('should return a known string', function() {
    const lob = [
      {Key: 'Name', Value: 'webhost'},
      {Key: 'foo', Value: 'baz'},
    ];
    const id = 'id-buz';
    const result = func(lob, id);
    assert.equal(result, 'webhost');
  });
  it('should return null', function() {
    const lob = [
      {Key: 'name', Value: 'bastion'},
    ];
    const id = 'id-buz';
    const result = func(lob, id);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = [
      {Key: 'name'},
    ];
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = [];
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = {};
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const lob = 'Name';
    const result = func(lob);
    assert.equal(result, null);
  });
  it('should return null', function() {
    const result = func();
    assert.equal(result, null);
  });
});

describe('Sort by date', function() {
  const func = sortByStartTime;
  it('should return a sorted array', function() {
    const latest = new Date('March 2, 2020 12:30:00');
    const lob = [
      {StartTime: new Date('February 20, 2020 12:30:00')},
      {StartTime: latest},
      {StartTime: new Date('March 1, 2020 12:30:00')},
    ];
    const result = func(lob);
    assert.equal(result[0].StartTime, latest);
  });
  it('should return a sorted array', function() {
    const latest = new Date('April 8, 2020 06:00:31');
    const lob = [
      {StartTime: new Date('April 8, 2020 06:00:00')},
      {StartTime: latest},
      {StartTime: new Date('April 8, 2020 06:00:15')},
    ];
    const result = func(lob);
    assert.equal(result[0].StartTime, latest);
  });
  it('should throw an exception with known message', function() {
    const snapId = 'yyxxzz';
    const lob = [
      {StartTime: new Date('February 20, 2020 12:30:00')},
      {EndTime: new Date('April 8, 2020 06:00:00'), SnapshotId: snapId},
    ];
    const err = new Error(`${snapId} missing "StartTime" property`);
    assert.throws(function() { func(lob); }, err);
  });
  it('should throw an exception with known message', function() {
    const snapId = 'yyxxzz';
    const lob = [
      {EndTime: new Date('October 15, 2020 06:00:00'), SnapshotId: snapId},
      {StartTime: new Date('October 20, 2020 08:30:00')},
    ];
    const err = new Error(`${snapId} missing "StartTime" property`);
    assert.throws(function() { func(lob); }, err);
  });
  it('should return an empty array', function() {
    const lob = [];
    const result = func(lob);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const lob = {};
    const result = func(lob);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const lob = 'StartTime';
    const result = func(lob);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const result = func();
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
});

describe('Build prune list', function() {
  const func = buildPruneListForOneInstance;
  it('should return an array of known length/value', function() {
    const gens = 2;
    const volId = 'abc';
    const lob = [
      {VolumeId: 'ccc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
      {VolumeId: 'bbb', SnapshotId: 'yyz3'},
      {VolumeId: 'abc', SnapshotId: 'yyz4'},
      {VolumeId: 'abc', SnapshotId: 'yyz5'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 1);
    assert.equal(result[0], 'yyz5');
  });
  it('should return an array of known length/value', function() {
    const gens = 1;
    const volId = 'abc';
    const lob = [
      {VolumeId: 'ccc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
      {VolumeId: 'bbb', SnapshotId: 'yyz3'},
      {VolumeId: 'abc', SnapshotId: 'yyz4'},
      {VolumeId: 'ddd', SnapshotId: 'yyz5'},
      {VolumeId: 'abc', SnapshotId: 'yyz6'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'yyz4');
    assert.equal(result[1], 'yyz6');
  });
  it('should return an empty array', function() {
    const gens = 1;
    const volId = 'abc';
    const lob = [
      {VolumeId: 'ccc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
      {VolumeId: 'bbb', SnapshotId: 'yyz3'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = -1;
    const volId = 'abc';
    const lob = [
      {VolumeId: 'abc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = {};
    const volId = 'abc';
    const lob = [
      {VolumeId: 'abc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = 1;
    const volId = null;
    const lob = [
      {VolumeId: 'abc', SnapshotId: 'yyz1'},
      {VolumeId: 'abc', SnapshotId: 'yyz2'},
    ];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = 1;
    const volId = 'abc';
    const lob = [];
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = 1;
    const volId = 'abc';
    const lob = null;
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
  it('should return an empty array', function() {
    const gens = 1;
    const volId = 'abc';
    const lob = 'abc';
    const result = func(volId, lob, gens);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
});
