// #####################################################################################################################
// ################################################ I M P O R T S ######################################################
// #####################################################################################################################

var Couchbase = require('couchbase');

// #####################################################################################################################
// ################################################## C L A S S ########################################################
// #####################################################################################################################

/**
 * @class ViewQuery
 *
 * @desc Class to create custom Couchbase view queries
 *
 */
function ViewQuery () {
}

// #####################################################################################################################
// ################################################ M E T H O D S ######################################################
// #####################################################################################################################

/**
 * @method getQuery
 *
 * @desc Method which returns a Couchbase ViewQuery according to the options argument
 *
 * @param {String} key
 * @param {Object} options
 *
 * @return {Couchbase.ViewQuery}
 *
 */
ViewQuery.prototype.getQuery = function (key, options) {
  var query = Couchbase.ViewQuery.from(options.view.designDoc, options.view.designView);

	if(options.query.beforeIn !== undefined && options.query.afterIn !== undefined) {
		// Request an interval [... , ...]
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, (options.query.afterIn + 1), options.query.beforeIn));
		} else {
      query.custom(this._getCustom(key, options.query.afterIn, (options.query.beforeIn + 1)));
		}
	} else if(options.query.afterEx !== undefined && options.query.beforeIn !== undefined) {
		// Request an interval ]... , ...]
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, options.query.afterEx, options.query.beforeIn));
		} else {
      query.custom(this._getCustom(key, (options.query.afterEx + 1), (options.query.beforeIn + 1)));
		}
	} else if(options.query.afterIn !== undefined && options.query.beforeEx !== undefined) {
		// Request an interval [... , ...[
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, (options.query.afterIn + 1), (options.query.beforeEx + 1)));
		} else {
      query.custom(this._getCustom(key, options.query.afterIn, options.query.beforeEx));
		}
	} else if(options.query.afterEx !== undefined && options.query.beforeEx !== undefined) {
		// Request an interval ]... , ...[
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, options.query.afterEx, (options.query.beforeEx + 1)));
		} else {
      query.custom(this._getCustom(key, (options.query.afterEx + 1), (options.query.beforeEx - 1)));
		}
	} else if(options.query.beforeIn !== undefined) {
		// Request an interval ]-∞ , ... ]
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, '\u02ad', options.query.beforeIn));
		} else {
      query.custom(this._getCustom(key, '', (options.query.beforeIn + 1)));
		}
	} else if(options.query.beforeEx !== undefined) {
		// Request an interval ]-∞ , ... [
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, '\u02ad', (options.query.beforeEx + 1)));
		} else {
      query.custom(this._getCustom(key, '', (options.query.beforeEx - 1)));
		}
	} else if(options.query.afterIn !== undefined) {
		// Request an interval [... , +∞[
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, (options.query.afterIn + 1), ''));
		} else {
      query.custom(this._getCustom(key, options.query.afterIn, '\u02ad'));
		}
	} else if(options.query.afterEx !== undefined) {
		// Request an interval ]... , +∞[
		if(options.query.sort === -1) {
      query.custom(this._getCustom(key, options.query.afterEx, ''));
		} else {
      query.custom(this._getCustom(key, (options.query.afterEx + 1), '\u02ad'));
		}
	} else {
		// Classic request
    if(options.query.sort === -1) {
      query.custom(this._getCustom(key, '\u02ad', ''));
		} else {
      query.custom(this._getCustom(key, '', '\u02ad'));
		}
	}

	// How to index the query
	query.stale(Couchbase.ViewQuery.Update.BEFORE);

	if(options.query.skip !== undefined) {
		query.skip(options.query.skip);
	}
	if(options.query.limit !== undefined) {
		query.limit(options.query.limit);
	}
	if(options.query.sort === -1) {
		query.order(Couchbase.ViewQuery.Order.DESCENDING);
	} else {
		query.order(Couchbase.ViewQuery.Order.ASCENDING);
	}

	return query;
};

/**
 * @method _getCustom
 *
 * @param {String} key
 * @param {String} start
 * @param {String} end
 *
 * @return {Object} Object needed for custom query
 *
 */
ViewQuery.prototype._getCustom = function (key, start, end) {
  return {
    "startkey": '"' + key + start + '"',
    "endkey": '"' + key + end + '"'
  };
};

// #####################################################################################################################
// ################################################ E X P O R T S ######################################################
// #####################################################################################################################

module.exports = ViewQuery;
