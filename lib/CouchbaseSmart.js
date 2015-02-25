// #####################################################################################################################
// ################################################ I M P O R T S ######################################################
// #####################################################################################################################

var Couchbase = require('couchbase');
var microtime = require('microtime');

// #####################################################################################################################
// ################################################## C L A S S ########################################################
// #####################################################################################################################

function CouchbaseSmart (config) {
  /* @member {Object} _config */
  this._config = config;
  /* @member {Couchbase} _db */
  this._db = null;
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

    var onInsert = function (insertErr, res) {
      return cb(insertErr);
    };

    self._db.insert(microtime.now() + '|' + key, { 'data': data }, onInsert);
  };

  this._getConnection(onConnection);
};
/**
 * @callback insertCallback
 *
 * @param {Error} err
 */

// #####################################################################################################################



// #####################################################################################################################
// ################################################ E X P O R T S ######################################################
// #####################################################################################################################

module.exports = CouchbaseSmart;
