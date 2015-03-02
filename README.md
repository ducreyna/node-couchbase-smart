# node-couchbase-smart

Node module to set and get documents with a same key on Couchbase 3.0.x

## Installation

You can git clone this repo with the following methods:

- `git clone https://github.com/ducreyna/node-couchbase-smart.git`

You can also add this project as a dependency in your nodejs project by editing the `package.json` file as follow:

```json
{
	"dependencies": {
		"pubsub": "https://github.com/ducreyna/node-couchbase-smart.git"
	}
}
```

## How to use

Before using module's methods, you need to set some config fields required for the connection and calls.

### Config

| Field			| Type		| Required  | Description 
|----------------|:-------:|:---------:|------------------------------------
| hosts			| Array	| Yes		  | Array of couchbase hostnames or IPs
| ports			| Array	| Yes		  | Array of ports for hosts
| bucket			| String	| Yes		  | Bucket's name
| password		| String	| No		  | Bucket's password
| views			| Object	| Yes		  | List of Couchbase views

For the field `views`, you need to set ids for `search` and `count` required for queries:

- __designDoc__: Your `Design Document` in Couchbase
- __designView__: Your `View` in the `Design Document`

You can also set `sort` and `limit` global query options for your queries. By default, it's:

```javascript
this.sort = -1;
this.limit = 1000;
```
__Example__:

```javascript
var CouchbaseSmart = require('couchbase-smart');

var config = {
  'hosts': ['couchbase'],
  'ports': [8091],
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

var couchbaseSmart = new CouchbaseSmart(config);
```

### Views

You need to add two functions for documents mapping. That's required to use Couchbase View queries.

#### Search

Create a View in your `Design Document` and add this map function to retrieve and format documents ids.

```javascript
function (doc, meta) {
  var reg = /(.*?)\|(.*)/;
  var res = reg.exec(meta.id);
  // res[1] => time
  // res[2] => key
  
  emit(res[2] + res[1], null);
}
```

#### Count

Create a View in your `Design Document` and add this map function to count all documents matching a key. __Don't forget to add the reduce primitive function *_count*__

```javascript
function (doc, meta) {
  var reg = /(.*?)\|(.*)/;
  var res = reg.exec(meta.id);
  // res[1] => time
  // res[2] => key
  
  emit(res[2] + res[1], null);
}
```

### API

#### insert(_key_, _data_, _cb_)

- @param {String} key **Key of the document**
- @param {Mixed} data **Data that you want to store**
- @param {insertCallback} cb

@callback **insertCallback(_err_)**

- @param {Error} err
- @param {Object} result

#### get(_key_, _options_, _cb_)

- {String} key **Key of the document**
- {Object} options **Get query options**
	- {Array} ids **Array of specific docIds to retrieve**
	- {Number} sort **-1 => decreasing ; 1 => increasing**
	- {Number} skip **Number of documents to skip**
	- {Number} limit **Max documents to retrieve**
	- {Number} afterIn **All documents after a timestamp included [..., +∞[**
	- {Number} afterEx **All documents after a timestamp excluded ]..., +∞[**
	- {Number} beforeIn **All documents before a timestamp included ]-∞, ...]**
	- {Number} beforeEx **All documents before a timestamp excluded ]-∞, ...[**
- {getCallback} cb

@callback **getCallback(_err_, _result_)**

- @param {Error} err
- @param {Object} result

#### remove(_key_, _options_, _cb_)

- {String} key **Key of the document**
- {Object} options **Remove query options**
	- {Array} ids **Array of specific docIds to retrieve**
	- {Number} sort **-1 => decreasing ; 1 => increasing**
	- {Number} afterIn **All documents after a timestamp included [..., +∞[**
	- {Number} afterEx **All documents after a timestamp excluded ]..., +∞[**
	- {Number} beforeIn **All documents before a timestamp included ]-∞, ...]**
	- {Number} beforeEx **All documents before a timestamp excluded ]-∞, ...
- {removeCallback} cb

@callback **removeCallback(_err_, _result_)**

- @param {Error} err
- @param {Object} result

#### count(_key_, _cb_)

- {String} key **Key of the document**
- {countCallback} cb

@callback **countCallback(_err_, _result_)**

- @param {Error} err
- @param {Object} result