'use strict';

/* eslint-env mocha */

// --------------------------------------------------------------------------
//                      GLOBAL VAR DEFINITIONS
// --------------------------------------------------------------------------

const assert = require('assert');
const fs = require('fs');
const rewire = require('rewire');
const pf = rewire('../functions');

// Map rewired, private functions to friendlier names
const getVolIdsAndBkupMetadata = pf.__get__('getVolIdsAndBkupMetadata');
const teaseOutSnapshotTagValue = pf.__get__('teaseOutSnapshotTagValue');
const teaseOutNameTagValue = pf.__get__('teaseOutNameTagValue');
const appendToBkupObj = pf.__get__('appendToBkupObj');
const getListOfSnapshotsToPrune = pf.__get__('getListOfSnapshotsToPrune');

// Don't mess with the JSON in ./sample-data (.. or tests will break)
const instSampleData = './test/sample-data/ec2Inst.json';
const sampleVolumes = ['vol-08d08d08d08d08d08', 'vol-0bd0bd0bd0bd0cd0c'];
const snapSampleData = './test/sample-data/snapshots.json';
const sampleVol = sampleVolumes[0];

// --------------------------------------------------------------------------
//                      MOCHA TESTS
// --------------------------------------------------------------------------

describe('Object traversal', function() {
  describe('Sample AWS response (EC2) parsing', function() {
    let instJson = fs.readFileSync(instSampleData, {encoding: 'utf8'});
    let instObj = JSON.parse(instJson);
    it('should build an object with sample keys', function() {
      let o = getVolIdsAndBkupMetadata(instObj);
      assert.equal(typeof o, 'object');
      for (let i = 0; i < sampleVolumes.length; i++) {
        assert.equal(o.hasOwnProperty(sampleVolumes[i]), true);
      }
    });
  });
  describe('Program-generated backup object', function() {
    let bkupObj = {
      'vol-08d979deeeeeeeeee': {
        instId: 'i-01b1fffffffffffff',
        devName: '/dev/sda1',
        nameTag: 'baz',
        bkupGens: 8,
      },
      'vol-078ddddababababab': {
        instId: 'i-01b1eeeeeeeeeeeee',
        devName: '/dev/sda1',
        nameTag: 'boo',
        bkupGens: 6,
      },
    };
    let nameTag = 'newhost';
    let instId = 'i-086be0186ffeeddba';
    let volId = 'vol-0d965888bbb888bbb';
    let ebs = [
      {
        DeviceName: '/dev/sda1',
        Ebs: {
          Status: 'attached',
          VolumeId: volId,
        },
      },
    ];
    it('should add a new key and data to object', function() {
      let o = appendToBkupObj(bkupObj, ebs, 10, nameTag, instId);
      assert.equal(typeof o, 'object');
      assert.equal(Object.keys(o).length, 3);
      assert.equal(o.hasOwnProperty(volId), true);
    });
  });
  describe('Sample AWS response (snapshot) parsing', function() {
    let snapJson = fs.readFileSync(snapSampleData, {encoding: 'utf8'});
    let snapshots = JSON.parse(snapJson).Snapshots;
    let numGens = 1;
    it('should build an array', function() {
      let res = getListOfSnapshotsToPrune(sampleVol, snapshots, numGens);
      assert.equal(Array.isArray(res), true);
      assert.equal(res.length, 1);
    });
  });
});

describe('Tags array parsing', function() {
  describe('tag:snapshots string', function() {
    it('should return a number', function() {
      let tags = [
        {Key: 'Name', Value: 'gogs'},
        {Key: 'snapshots', Value: '14'},
      ];
      let res = teaseOutSnapshotTagValue(tags);
      assert.equal(!isNaN(res), true);
    });
  });
  describe('tag:snapshots number', function() {
    it('should return a known value', function() {
      let tags = [
        {Key: 'Name', Value: 'gogs'},
        {Key: 'snapshots', Value: 21},
      ];
      let res = teaseOutSnapshotTagValue(tags);
      assert.equal(res, tags[1].Value);
    });
  });
  describe('Missing tag:snapshots', function() {
    it('should return null', function() {
      let tags = [
        {Key: 'Name', Value: 'gogs'},
      ];
      let res = teaseOutSnapshotTagValue(tags);
      assert.equal(res, null);
    });
  });
  describe('tag:Name', function() {
    it('should return a known value', function() {
      let tags = [
        {Key: 'Name', Value: 'gogs'},
        {Key: 'snapshots', Value: 'xx'},
      ];
      let res = teaseOutNameTagValue(tags);
      assert.equal(res, tags[0].Value);
    });
  });
  describe('Missing tag:Name', function() {
    it('should return null', function() {
      let tags = [
        {Key: 'snapshots', Value: 'xx'},
      ];
      let res = teaseOutNameTagValue(tags);
      assert.equal(res, null);
    });
  });
});
