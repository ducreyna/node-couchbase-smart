var assert = require('assert');
var CouchbaseSmart = require('../lib/CouchbaseSmart.js');

var config = {
  'hosts': ['debian'],
  'ports': [8091],
  'bucket': 'default'
};
var couchbase = new CouchbaseSmart(config);

describe('Couchbase smart interface', function () {
  var key = 'myKey';
  var data = 'I_AM_DATA';

  it('Set a new document with a bad key', function (done) {
    couchbase.insert(1, data, function (err) {
      // Asserts
      assert.equal(err.message, "Key must be a String");
      done();
    });
  });

  it('Set a new document', function (done) {
    couchbase.insert(key, data, function (err) {
      // Asserts
      assert.ifError(err);
      done();
    });
  });

  it('Get all documents from a key', function (done) {

  });

  it('Remove all documents from a key', function (done) {

  });
});
