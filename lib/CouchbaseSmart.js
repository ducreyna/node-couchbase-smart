// #####################################################################################################################
// ################################################ I M P O R T S ######################################################
// #####################################################################################################################

var Couchbase = require('couchbase');
var microtime = require('microtime');
var _  = require('underscore');
var async = require('async');
var ViewQuery = require('./ViewQuery.js');

// #####################################################################################################################
// ################################################## C L A S S ########################################################
// #####################################################################################################################

function CouchbaseSmart (config) {
  /* @member {Object} _config */
  this._config = config;
  /* @member {Couchbase} _db */
  this._db = null;
  /* @member {ViewQuery} _viewQuery */
  this._viewQuery = new ViewQuery();
}

// #####################################################################################################################
// ################################################ M E T H O D S ######################################################
// #####################################################################################################################

/**
 * @method _getConnection
 *
 * @desc Private method handling Couchbase connection
 *
 * @param {_getConnectionCallback} cb
 *
 */
CouchbaseSmart.prototype._getConnection = function (cb) {
  if(this._db) {
    return cb();
  }

	var hosts = "";
	// Build the array of couchbase hosts
	for(var i = 0; i < this._config.hosts.length; i++) {
		hosts += this._config.hosts[i] + ":" + this._config.ports[i];
		if(i < (this._config.hosts.length - 1)) {
			hosts += ",";
		}
	}
	// DB connection
	var cluster = new Couchbase.Cluster(hosts);
	this._db = cluster.openBucket(this._config.bucket, function (err) {
		return cb(err);
	});
};
/**
 * @callback _getConnectionCb
 *
 * @param {Error} err
 */

// #####################################################################################################################

/**
 * @method insert
 *
 * @param {String}        key
 * @param {Mixed}         data
 * @param {insertCallback}   cb
 *
 */
CouchbaseSmart.prototype.insert = function (key, data, cb) {
  if(typeof(key) !== 'string') {
    return cb(new TypeError("Key must be a String"));
  }

  var self = this;
  var onConnection = function (err) {
    if(err) {
      return cb(err);
    }

    var time = microtime.now();
    var docId = time + '|' + key;

    var onInsert = function (insertErr) {
      if(insertErr && insertErr.code === Couchbase.errors.timedOut) {
        self._db = null;
      }
      return cb(insertErr, docId);
    };

    self._db.insert(docId, { 'data': data, 'time': Math.floor(time / 1000) }, onInsert);
  };

  this._getConnection(onConnection);
};
/**
 * @callback insertCallback
 *
 * @param {Error}   err
 * @param {String}  docId
 */

// #####################################################################################################################

/**
 * @method get
 *
 * @desc Method to get documents from a single key
 *
 * @param  {String}   key
 * @param  {Object}   options
 * @param  {getCallback} cb
 *
 */
CouchbaseSmart.prototype.get = function (key, options, cb) {
  if(typeof(key) !== 'string') {
    return cb(new TypeError("Key must be a String"));
  }

  var self = this;
  var onConnection = function (err) {
    if(err) {
      return cb(err);
    }

    var onQuery = function (queryErr, values) {
      if(queryErr) {
        if(queryErr.code === Couchbase.errors.timedOut) {
          self._db = null;
        }
        return cb(queryErr);
      }

      // Extract ids
      values = _.pluck(values, 'id');
      // Retrieve data
      self._db.getMulti(values, function (getErr, results) {
        if(getErr && getErr.code !== Couchbase.errors.keyNotFound) {
          if(getErr.code === Couchbase.errors.timedOut) {
            self._db = null;
          }
          return cb(getErr);
        }

        var resultsSorted = [];
        for(var r in results) {
          resultsSorted.push({
            'id': r,
            'data': results[r].value.data,
            'time': results[r].value.time
          });
        }
        resultsSorted.sort(function(a, b) {
          var timeA = a.time;
          var timeB = b.time;
          if(options.sort === -1) {
            return (timeA > timeB) ? -1 : (timeA < timeB) ? 1 : 0;
          } else {
            return (timeA < timeB) ? -1 : (timeA > timeB) ? 1 : 0;
          }
        });

        cb(null, resultsSorted);
      });
    };

    var query = self._viewQuery.getQuery(key, {
      'view': self._config.views.search,
      'query': options
    });
    self._db.query(query, onQuery);
  };

  this._getConnection(onConnection);
};
/**
 * @callback getCallback
 *
 * @param {Error} err
 * @param {Array} results
 */

// #####################################################################################################################

CouchbaseSmart.prototype.remove = function (key, options, cb) {
  if(typeof(key) !== 'string') {
    return cb(new TypeError("Key must be a String"));
  }

  var onConnection = function (err) {
    if(err) {
      return cb(err);
    }

    var onRemove = function (err, result) {

    };

    if(options.ids !== undefined) {

    }
  };

  this._getConnection(onConnection);
};

// #####################################################################################################################
// ################################################ E X P O R T S ######################################################
// #####################################################################################################################

module.exports = CouchbaseSmart;
