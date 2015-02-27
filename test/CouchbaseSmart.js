var assert = require('assert');
var async = require('async');
var _ = require('underscore');
var CouchbaseSmart = require('../lib/CouchbaseSmart.js');

var config = {
  'hosts': ['debian'],
  'ports': [8091],
  'password': undefined,
  'bucket': 'default',
  'views': {
    'search': {
      'designDoc': 'search',
      'designView': 'byKey'
    },
    'count': {
      'designDoc': 'search',
      'designView': 'count'
    }
  }
};
var couchbase = new CouchbaseSmart(config);

describe('Couchbase smart interface', function () {
  var key = 'myKey';
  var data = 'I_AM_DATA';

  describe('Single document operations', function () {
    var id = '';

    it('Set a new document with a bad key', function (done) {
      couchbase.insert(1, data, function (err) {
        // Asserts
        assert.equal(err.message, "Key must be a String");
        done();
      });
    });

    it('Set a new document', function (done) {
      couchbase.insert(key, data, function (err, docId) {
        // Asserts
        assert.ifError(err);
        assert.equal(typeof(docId), 'string');
        id = docId;
        done();
      });
    });

    it('Get document from its id', function (done) {
      couchbase.get(key, { 'ids': [id] }, function (err, result) {
        // Asserts
        assert.ifError(err);
        assert.equal(result.hits.length, 1);
        assert.equal(typeof(result.hits[0]), 'object');
        assert.equal(typeof(result.hits[0].time), 'number');
        assert.equal(result.hits[0].id, id);
        done();
      });
    });

    it('Remove document from its docId', function (done) {
      couchbase.remove(key, { 'ids': [id] }, function (err, result) {
        // Asserts
        assert.ifError(err);
        assert.equal(result.total, 1);
        done();
      });
    });
  });


  describe('Multi documents operations', function () {
    var nbDocs = 5;
    var timeBegin = Date.now();
    var timeEnd = 0;

    before(function (done) {
      // Fill the DB with a data sample
      var adders = [];
      for(var i = 0; i < nbDocs; i++) {
        adders.push(function (localCb) {
          couchbase.insert(key, data, localCb);
        });
      }

      async.series(adders, function (err) {
        // Asserts
        assert.ifError(err);
        timeEnd = Date.now();
        done();
      });
    });

    after(function (done) {
      // Empty the DB
      couchbase.remove(key, {}, done);
    });

    it('Get all documents from its key (sort DESCENDING)', function (done) {
      couchbase.get(key, { 'sort': -1 }, function (err, result) {
        // Asserts
        assert.ifError(err);

        var timesSrc = _.pluck(result.hits, 'time');
        var timesSorted = _.pluck(result.hits, 'time');
        timesSorted.sort().reverse();
        assert.deepEqual(timesSrc, timesSorted);
        assert.equal(result.hits.length, nbDocs);
        assert.equal(typeof(result.hits[0]), 'object');
        assert.equal(typeof(result.hits[0].time), 'number');
        assert.equal(typeof(result.hits[0].id), 'string');
        done();
      });
    });

    it('Get all documents from its key (sort ASCENDING)', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        // Asserts
        assert.ifError(err);

        var timesSrc = _.pluck(result.hits, 'time');
        var timesSorted = _.pluck(result.hits, 'time');
        timesSorted.sort();
        assert.deepEqual(timesSrc, timesSorted);
        assert.equal(result.hits.length, nbDocs);
        assert.equal(typeof(result.hits[0]), 'object');
        assert.equal(typeof(result.hits[0].time), 'number');
        assert.equal(typeof(result.hits[0].id), 'string');
        done();
      });
    });

    it('Get documents from its key and an interval (beforeIn)', function (done) {
      couchbase.get(key, { 'sort': 1, 'beforeIn': timeBegin}, function (err, result) {
        // Asserts
        assert.ifError(err);
        assert.equal(result.hits.length, 0); // No records before the beginning of the insertions
        done();
      });
    });

    it('Get documents from its key and an interval (beforeEx)', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        couchbase.get(key, {
          'sort': 1,
          'beforeEx': result.hits[4].time
        }, function (innerErr, innerResult) {
          // Asserts
          assert.ifError(innerErr);
          assert.equal(innerResult.hits.length, 4);
          done();
        });
      });
    });

    it('Get documents from its key and an interval (afterIn + beforeIn)', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        couchbase.get(key, {
          'sort': 1,
          'afterIn': result.hits[0].time,
          'beforeIn': result.hits[3].time
        }, function (innerErr, innerResult) {
          // Asserts
          assert.ifError(innerErr);
          assert.equal(innerResult.hits.length, 4);
          done();
        });
      });
    });

    it('Get documents from its key and an interval (afterEx + beforeEx)', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        couchbase.get(key, {
          'sort': 1,
          'afterEx': result.hits[0].time,
          'beforeEx': result.hits[4].time
        }, function (innerErr, innerResult) {
          // Asserts
          assert.ifError(innerErr);
          assert.equal(innerResult.hits.length, 3);
          done();
        });
      });
    });

    it('Get documents from its key and an interval (afterIn + beforeIn) with sort inversed', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        couchbase.get(key, {
          'sort': -1,
          'afterIn': result.hits[0].time,
          'beforeIn': result.hits[3].time
        }, function (innerErr, innerResult) {
          // Asserts
          assert.ifError(innerErr);
          assert.equal(innerResult.hits.length, 4);
          done();
        });
      });
    });

    it('Count documents from its key', function (done) {
      couchbase.count(key, function (err, result) {
        // Asserts
        assert.ifError(err);
        assert.equal(result.total, nbDocs);
        done();
      });
    });

    it('Remove documents from its key and an interval (afterIn + beforeEx)', function (done) {
      couchbase.get(key, { 'sort': 1 }, function (err, result) {
        couchbase.remove(key, {
          'sort': 1,
          'afterIn': result.hits[0].time,
          'beforeEx': result.hits[3].time
        }, function (innerErr, innerResult) {
          // Asserts
          assert.ifError(innerErr);
          assert.ok(innerResult.total > 0);
          done();
        });
      });
    });
  });
});
