var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()
var debug = require('debug')(debug_name);


var path = require('path');
var mongoclient = require('mongodb').MongoClient;
var events = require('events');
var util = require('./util');
var dbs = {};
/*
  实例化时自动连接mongodb
  方法调用先压入队列, 连接完成后调用队列。
  
*/

function mongo_collection( dbname, name ) {
  this.name = name;
  this.queue = [];
  
  this.ready = false;
  this.closed = false;

  this.db = null;
  this.collection = null;
  var self = this;

  mongoclient.connect('mongodb://localhost:27017/' + dbname, function( err, db ) {

    if( err ){
      debug(err);
      return;
    }
    debug('db connected', name);
    if( self.closed ){
      db.close();
      return;
    }
    self.ready = true;
    var collection = db.collection(name);
    self.db = db;
    self.collection = collection;
    self.queue.forEach(function( task ) {
      debug(name, typeof task);
      if (typeof task == 'function'){
        task(collection);
      } else{
        collection[task[0]].apply(collection, task[1]);
      }
    });
    self.queue = null;
  });
}
var proxy_methods = [
  'find',
  'findOne',
  'insert',
  'update',
  'updateOne',
  'updateMany',
  'drop'
];
proxy_methods.forEach(function( method ) {
  mongo_collection.prototype[method] = function() {
    if( this.closed ){
      return;
    }

    var args = util.slice(arguments);
    debug('call method', this.name, method, args);
    var collection = this.collection;


    if( method == 'find' ){
      var call = function( collection ) {
        collection.find(args[0]).toArray(args[1]);
      }
      if( this.ready ){
        call( collection );
      } else {
        this.queue.push(call);
      }
    } else {
      if( this.ready ){
        return collection[method].apply( this.collection, args);
      } else {
        this.queue.push([method, args]);
      }
    }
  }
});

mongo_collection.prototype.get_collection = function(handle) {
  if( this.closed ){
    return;
  }
  if( this.ready ){
    handle(this.collection);
  } else {
    this.queue.push(handle);
  }
};

mongo_collection.prototype.close = function() {
  if( this.ready ){ 
    this.db.close();
  }
  this.closed = true;
};

module.exports = function( dbname, collection_name ) {
  var name = dbname + '::' + collection_name;

  if( !dbs[name] ){
    dbs[name] = new mongo_collection( dbname, collection_name );
  }

  return dbs[name];
}
