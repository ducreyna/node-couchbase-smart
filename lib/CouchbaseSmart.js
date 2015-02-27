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
  /* @member {Number} sort */
  this.sort = -1;
  /* @member {Number} limit */
  this.limit = 1000;

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

    options = self._getOptions(options);
    var docIds = [];
    // Get all documents from doc ids
    var getAll = function () {
      if(docIds.length === 0) {
        return cb(null, {
          'hits': [],
          'query': options
        });
      }
      self._db.getMulti(docIds, function (getErr, results) {
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
        resultsSorted.sort(function (a, b) {
          var timeA = a.time;
          var timeB = b.time;
          if(options.sort === -1) {
            return (timeA > timeB) ? -1 : (timeA < timeB) ? 1 : 0;
          } else {
            return (timeA < timeB) ? -1 : (timeA > timeB) ? 1 : 0;
          }
        });

        cb(null, {
          'hits': resultsSorted,
          'query': options
        });
      });
    };

    if(_.isArray(options.ids) && options.ids.length > 0) {
      var reg = new RegExp("^[0-9]*\\|" + key, "g");
      options.ids.forEach(function (elt) {
        if(!reg.test(elt)) {
          return cb(new Error("Doc ids must match the key"));
        }

        docIds.push(elt);
      });
      // Retrieve documents
      getAll();
    } else {
      var onQuery = function (queryErr, values) {
        if(queryErr) {
          if(queryErr.code === Couchbase.errors.timedOut) {
            self._db = null;
          }
          return cb(queryErr);
        }

        // Extract ids
        docIds = _.pluck(values, 'id');
        // Retrieve documents
        getAll();
      };

      var query = self._viewQuery.getQuery(key, {
        'view': self._config.views.search,
        'query': options
      });
      self._db.query(query, onQuery);
    }
  };

  this._getConnection(onConnection);
};
/**
 * @callback getCallback
 *
 * @param {Error} err
 * @param {Object} result
 */

// #####################################################################################################################

/**
 * @method remove
 *
 * @desc Method to remove records from a key
 *
 * @param  {String}           key
 * @param  {Object}           options
 * @param  {removeCallback}   cb
 *
 */
CouchbaseSmart.prototype.remove = function (key, options, cb) {
  if(typeof(key) !== 'string') {
    return cb(new TypeError("Key must be a String"));
  }

  var self = this;
  var onConnection = function (err) {
    if(err) {
      return cb(err);
    }

    options = self._getOptions(options);
    // Set up array of removals to apply
    var deleters = [];
    var addDeleter = function (id) {
      deleters.push(function (localCb) {
        self._db.remove(id, function (deleteErr) {
          if(deleteErr && deleteErr.code !== Couchbase.errors.keyNotFound) {
						return localCb(deleteErr);
					}
          localCb();
        });
      });
    };
    // Remove all documents
    var removeAll = function () {
      async.parallel(deleters, function (asyncErr, result) {
        if(asyncErr) {
          if(asyncErr.code === Couchbase.errors.timedOut) {
            self._db = null;
          }
          return cb(asyncErr);
        }

        cb(null, {
          'nbRemovals': result.length,
          'query': options
        });
      });
    };

    if(_.isArray(options.ids) && options.ids.length > 0) {
      var reg = new RegExp("^[0-9]*\\|" + key, "g");
      options.ids.forEach(function (elt) {
        if(!reg.test(elt)) {
          return cb(new Error("Doc ids must match the key"));
        }

        addDeleter(elt);
      });
      // Remove all docs
      removeAll();
    } else {
      var onQuery = function (queryErr, values) {
        if(queryErr) {
          if(queryErr.code === Couchbase.errors.timedOut) {
            self._db = null;
          }
          return cb(queryErr);
        }

        // Extract ids
        values = _.pluck(values, 'id');
        values.forEach(function (elt) {
          addDeleter(elt);
        });
        // Remove all docs
        removeAll();
      };

      var query = self._viewQuery.getQuery(key, {
        'view': self._config.views.search,
        'query': options
      });
      self._db.query(query, onQuery);
    }
  };

  this._getConnection(onConnection);
};
/**
 * @callback removeCallback
 *
 * @param {Error}   err
 * @param {Object}  result
 */

// #####################################################################################################################

/**
 * @method _getOptions
 *
 * @desc Private method to parse and get a right object query paramater for Couchbase
 *
 * @param {Object} query
 *
 * @return {Object} Query well formated for a Couchbase Query
 *
 */
CouchbaseSmart.prototype._getOptions = function (query) {
  var options = {
    'sort': (_.isNumber(query.sort) && query.sort > 0) ? 1 : this.sort,
    'skip': (_.isNumber(query.skip) && query.skip > 0) ? query.skip : 0,
    'limit': (_.isNumber(query.limit) && query.limit > 0) ? query.limit : this.limit,
    'afterIn': (_.isNumber(query.afterIn) && query.afterIn > 0) ? query.afterIn : undefined,
    'afterEx': (_.isNumber(query.afterEx) && query.afterEx > 0) ? query.afterEx : undefined,
    'beforeIn': (_.isNumber(query.beforeIn) && query.beforeIn > 0) ? query.beforeIn : undefined,
    'beforeEx': (_.isNumber(query.beforeEx) && query.beforeEx > 0) ? query.beforeEx : undefined,
  };

  // Check if the interval is correct relative to the sort parameter
	if(options.afterIn && (options.beforeIn || options.beforeEx)) {
    if(options.sort === 1) {
			if(options.afterIn > options.beforeIn) {
        options.afterIn = [options.beforeIn, options.beforeIn = options.afterIn][0];
			}
			else if(options.afterIn > options.beforeEx) {
        options.afterIn = [options.beforeEx, options.beforeEx = options.afterIn][0];
			}
		}
		else {
			if(options.afterIn < options.beforeIn) {
        options.afterIn = [options.beforeIn, options.beforeIn = options.afterIn][0];
			}
			else if(options.afterIn < options.beforeEx) {
        options.afterIn = [options.beforeEx, options.beforeEx = options.afterIn][0];
			}
		}
	}
	if(options.afterEx && (options.beforeIn || options.beforeEx)) {
		if(options.sort === 1) {
			if(options.afterEx > options.beforeIn) {
        options.afterEx = [options.beforeIn, options.beforeIn = options.afterEx][0];
			}
			else if(options.afterEx > options.beforeEx) {
        options.afterEx = [options.beforeEx, options.beforeEx = options.afterEx][0];
			}
		}
		else {
			if(options.afterEx < options.beforeIn) {
        options.afterEx = [options.beforeIn, options.beforeIn = options.afterEx][0];
			}
			else if(options.afterEx < options.beforeEx) {
        options.afterEx = [options.beforeEx, options.beforeEx = options.afterEx][0];
			}
		}
	}

  return options;
};

// #####################################################################################################################
// ################################################ E X P O R T S ######################################################
// #####################################################################################################################

module.exports = CouchbaseSmart;
