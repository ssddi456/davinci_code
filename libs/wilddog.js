var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()
var debug = require('debug')(debug_name);

var storage = require('./storage');
var room_store = storage('trpg', 'rooms');

var request = require('request');
var path = require('path');
var EventSource = require('eventsource');
var async = require('async');

var noop = function() {};

var wilddog = function() {
    this.sync = null;
    this.path = '/';

    this.parent = function() {
        return this;
    };

    this.root = function() {
        return this;
    }

    this.key = function() {
        return '';
    };



    this.req = function( method, data, done ) {
      var url = this.get_url();
      done = done || noop;
      request({
        url : url,
        method : method,
        json : data
      }, function( err, resp, body ) {
        if( body ){
          if( typeof body == 'string' ){
            try{
              body = JSON.parse(body);
            } catch(e){
              debug('json parse error', e, body);
              done(e, body);
              return;
            }
            done(err, body);
          } else {
            done(err, body);
          }
        } else {
          done(err, body);
        }
      })
    }
};

var wp = wilddog.prototype;

wp.get_url = function() {
  debug('get_url enter');
  if( !this.sync ){
    throw new Error('wilddog havnt init');
  }
  return this.sync + this.path + '.json';
}

wp.get_doc_path = function() {
  debug('get_doc_path enter');
  if( !this.r_root )  {
    throw new Error('mongo havnt init');
  }

  var doc_path = this.path.slice(this.r_root.length+1).replace(/\//g, '.');
  debug( this.path, this.r_root, doc_path);
  return doc_path;
};

wp.init = function( data, done ) {
  debug('init enter');
  // 
  // add r_root & root_doc_id for farther using
  // 
  var self = this;
  this.r_root = this.path;
  async.parallel([
    function( done ) {
      room_store.get_collection(function( collection ) {
          collection.insert(data, function( err, ops ) {
              debug('init result', err, ops, typeof ops.ops[0]._id );
              if( !err ){
                self.root_doc_id = { _id : ops.ops[0]._id };
              }
              done(err, ops.ops[0]);
          })
      })
    },
    function( done ) {
      self.req('PUT', data, done);
    }], done);

};

wp.initializeApp = function( optn ) {
  debug('initializeApp enter');
  this.sync = optn.sync;
};

wp.parse_path = function( path ) {
  debug('parse_path enter');
  var ret = {
    origin : path
  };

  path = path.replace(/\/$/, '');

  if( path[0] == '/' ){
    ret.is_absolute = true;
    var r_path = path.slice(this.path.length+1);
  } else {
    ret.is_absolute = false;
    var r_path = path;
    path = this.path + path;
  }


  ret.path = path.slice(1).split('/');
  ret.r_path = r_path.split('/');

  return ret;
};

wp.child = function( _path ) {
  debug('child enter');
  var child = new wilddog();
  var self = this;
  var root = this.root();

  child.r_root = this.r_root;
  child.root_doc_id = this.root_doc_id;

  child.parent = function() {
    return self;
  };
  child.root = function() {
    return root;
  };
  child.key = function() {
      return _path;
  };
  child.initializeApp({ sync : this.sync });
  child.path = path.join(this.path, _path).replace(/\\/g, '/');
  return child;
};

wp.set = function( val, done ) {
  debug('set enter');
  var self = this;
  async.parallel([
    function( done ) {
      self.req('PUT', val, done);
    },
    function( done ) {
      var doc_path = self.get_doc_path();
      if( doc_path == '' ){
        room_store.updateOne(self.root_doc_id, val, done);
      } else {
        var updater = { };
        updater[doc_path] = val;
        room_store.updateOne(self.root_doc_id, { $set : updater }, done);
      }
    }], done);
};

wp.push = function( val, done ) {
  debug('push enter');
  throw new Error('dont use this, different from mongodb');
  var self = this;
  this.req('POST', val, done);
};




wp.update = function( val, done ) {
  debug('update enter');
  var self = this;
  var self = this;
  async.parallel([
    function( done ) {
      self.req('PATCH', val, done);
    },
    function( done ) {
      var updater = { };
      var doc_path = self.get_doc_path();
      for(var k in val ){
        if( val.hasOwnProperty(k) ){
          updater[( doc_path ? ( doc_path + '.' ) : '' ) + path_to_doc_path(k) ] = val[k];
        }
      };

      room_store.updateOne(self.root_doc_id, { $set : updater }, done);
        
    }], done);
};


wp.remove = function( done ) {
  debug('remove enter');
  var self = this;
  async.parallel([
    function( done ) {
      self.req('DELETE', null, done);
    },
    function( done ) {
      var updater = {};
      var doc_path = self.get_doc_path();
      updater[doc_path] = 1;
      
      room_store.updateOne(self.root_doc_id, { $unset : updater }, done);
    }], done);
};

var path_to_doc_path = function( path ) {
  return path.replace(/^\/|\/$/g, '').replace(/\//g,'.');
};

var is_empty_obj = function( obj ) {
  for(var k in obj){
    if( obj.hasOwnProperty(k) ){
      return false;
    }
  }
  return true;
}
var get_by_path = function( obj, path ) {
  path = path.slice();
  try{
    while(path.length){
      obj = obj[path.shift()];
    }
    if( is_empty_obj(obj) ){
      return null
    }
    return obj;
  } catch(e){
    return null;
  }
};
var set_by_path = function( obj, path, val ) {
  path = path.slice();
  var last = path.pop();
  try{
    while(path.length){
      obj = (obj[path.shift()] = obj[path.shift()] || {});
    }
    obj[last] = val;
  } catch(e){
    return null;
  }  
};

wp.get = function( done ) {
  debug('get enter');
  debug('enter get by mongo');
  var filter = {};
  var doc_path = this.get_doc_path()
  filter[doc_path] = 1;
  doc_path = doc_path.split('.');
  room_store.findOne(this.root_doc_id, filter, function( err, doc ) {
    if( err ) {
        return done(err);
    }
    done(null, get_by_path(doc, doc_path));
  });
};

/**
 * wilddog 这个es同步不怎么稳定 mlgb.
 */
wp.watch = function() {
  debug('watch enter');
  if( this.es ){
    return this;
  }
  var cache_root = this.path;
  var len = cache_root.length;
  var self = this;

  var es = new EventSource(this.get_url());
  es.cache = null;

  function update_cache ( type, e ) {
    debug('update_cache enter', type);
    try{
      var data = JSON.parse(e.data);
    }catch(e){
      return;
    }

    var data_path = data.path;
    data = data.data;

    var r_root = data_path.slice(len);
    var r_path = r_root.split('/');

    if( data_path[0] == '/' && r_path[0] == '' ){
      r_path = r_path.slice(1);
    }
    if( data_path[data_path.length-1] == '/' && r_data_path[path.length-1] == ''){
      r_path = r_path.slice(0, -1); 
    }

    if( type == 'put' ){

      var old = get_by_path(es.cache, r_path);
      set_by_path(es.cache, r_path, data)
      var target = data;

    } else if( type == 'patch' ){

      var target = get_by_path(es.cache, r_path);
      var old = target;

      for(var k in data ){
        if( data.hasOwnProperty(k)){
          set_by_path(target, k.split('/'), data[k]);
        }
      }

    }
    if( target ){
      es.emit('change', [cache_root].concat(r_path).join('/'), old, target);
    }
  }

  es.on('open', function( e ) {
    debug('es open', e);
  });

  es.on('error', function( e ) {
    debug('es error', e);
  });

  es.on('message', function( e ) {
    debug('es message', e);
  });

  es.on('close', function( e ) {
    debug('es close', e);
  });

  es.on('end', function( e ) {
    debug('es end', e);
  });

  es.once('put', function( e ) {
    debug('first sync', self.path );
    var data = JSON.parse(e.data);

    var data_path = data.path;
    data = data.data;
    es.cache = data;

    es.emit('cache_init');

    es.on('put', function( e ) {
      update_cache('put', e);
    });

  });


  es.on('patch', function( e ) {
    update_cache('patch', e);
  });

  es.get = function( path ) {
    if( path[path.length-1] == '/' ){
      path = path.slice(0, -1); 
    }
    if( path[0] == '/' ){
      var r_path = path.slice(len).split('/');
      r_path = r_path.slice(1);
    } else {
      var r_path = path.split('/');
    }

    return get_by_path( es.cache, r_path );
  }

  this.es = es;
  this.stop = function() {
    this.es = null;
    es.close();
  }
  return this;
}
module.exports=  new wilddog();