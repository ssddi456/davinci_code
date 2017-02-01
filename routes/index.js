var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()

var debug = require('debug')(debug_name);

var express = require('express');
var davinciCode = require('../libs/davinci-code');
var router = express.Router();

var config = require('../config');
var wilddogTokenGenerator = require('../libs/wilddog-token-generator');

var mongodb = require('mongodb');
var storage = require('../libs/storage');
var user_store = storage('trpg', 'users');
var room_store = storage('trpg', 'rooms');

var _ = require('underscore');

var random_avatar = require('../libs/random_avatar');
var util = require('../libs/util');

router.use(function( req, resp, next ) {

  if( !req.session.is_login 
    && !req.session.pear_name
  ){
    req.session.pear_name = random_avatar();
  }

  if( req.session.pear_name ){
    resp.locals.session = req.session;
  }

  if( req.session.is_login 
    && req.session.user_id 
  ){
    user_store.findOne({ _id : mongodb.objectId(req.session.user_id) }, function( err, doc ) {
      if( doc ){
        req.user = doc;
        resp.locals.user = doc;
        resp.locals.user_id = doc._id || req.session.id;
      } else {
        resp.locals.user_id = req.session.id;
      }
      next();
    });
  } else {
    resp.locals.user_id = req.session.id;
    next();
  }

});


/* GET home page. */
router.get('/', function(req, res, next) {

  var wilddogTokenInstance = new wilddogTokenGenerator(config.wilddogSuperToken);
  var render_params = {
    title: 'Express'
  };

  if( req.session.is_login && req.user ){
    render_params.wilddogToken = wilddogTokenInstance.createToken({ uid : req.user._id, display_name : req.session.pear_name });
  } else {
    render_params.wilddogToken = wilddogTokenInstance.createToken({ uid : req.session.id, display_name : req.session.pear_name });
  }

  res.render('index', render_params);

});


var room_refs = {};
router.get('/rooms', function( req, resp, next ) {
  var query = req.query;
  var body = req.body;
  
  room_store.find({}, function(err, docs) {
    if( !err ){
      resp.json({ err : 0, rooms : docs });
    } else {
      next(err);
    }
  });
});

router.post('/create', function( req, resp, next ) {
  var query = req.query;
  var body = req.body;
  
  var user_id = (req.user && req.user._id) || req.session.id;
  var user_name = (req.user && req.user.name) || req.session.pear_name.name;

  var roomId = util.uuid();

  //
  //  在wilddog 里创建一个游戏实例
  //  


  if( !room_refs[roomId] ){
    var game = new davinciCode(roomId);
    room_refs[roomId] = game;
    game.init( user_id, function(err) {
      if( err ){
        resp.json({
          err : 1,
          msg : '创建房间失败 ' + err.message + '\n' + err.stack
        }); 
      } else {
        game.add_player(user_id, user_name, function( err, player ) {
          if( err ){
            return next(err);
          }

          debug('reload page');

          resp.json({ 
            err: 0,
            ru : '/room?id=' + roomId
          });

        });
      }
    });

  } else {
    resp.json({ 
      err: 0,
      ru : '/room?id=' + roomId 
    });
  }
});

router.use('/room*', function( req, resp, next ) {
  var query = req.query;
  var roomId = query.id;

  if( !roomId ){
    next(new Error('请提供房间编号'));
    return;
  }

  if( !room_refs[roomId] ){
    next(new Error('无此房间'));
    return;
  }

  req.game_room = room_refs[roomId];

  next();
});

router.get('/room', function( req, resp, next ) {
  var query = req.query;

  var user_id = (req.user && req.user._id) || req.session.id;
  var user_name = (req.user && req.user.name) || req.session.pear_name.name;
  // 这里实现有点不对 得想想。
  req.game_room.get_player(user_id, function( err, player ) {
    if( err ){
      return done(err);
    }

    if( player ){
      resp.render('room', { room : req.game_room.toJSON() });
    } else {
      if( req.game_room.get_status() == 'playing' ){

        next(new Error('游戏进行中，不能加入此房间'));

      } else {
        resp.render('room', { room : req.game_room.toJSON(), need_join : true });
      }
    }
  });
});

router.post('/room/join', function( req, resp, next ) {
  var query = req.query;

  var user_id = (req.user && req.user._id) || req.session.id;
  var user_name = (req.user && req.user.name) || req.session.pear_name.name;

  req.game_room.add_player(user_id, user_name, function( err, player ) {
    if( err ){
      next(err);
    } else {
      resp.json({
        err : 0,
        ru : '/room?id=' + query.id
      });
    }
  });
});

router.post('/room/guess', function( req, resp, next ) {
  var user_id = (req.user && req.user._id) || req.session.id;
  var user_name = (req.user && req.user.name) || req.session.pear_name.name;
  var body = req.body;

  req.game_room.guess(user_id, body, function( err, msg ) {
    if( err ){
      next(err);
    } else {
      resp.json({
        err : 0,
        msg : msg
      });
    }
  });

});

router.post('/room/game_card', function( req, resp, next ) {

  var query = req.query;
  var roomId = query.id;

  var user_id = (req.user && req.user._id) || req.session.id;

  resp.json({
    err : 0,
    cards : req.game_room.get_cards(user_id)
  });

});

router.post('/room/exit', function( req, resp, next ) {

  var query = req.query;
  var roomId = query.id;


  
  var user_id = (req.user && req.user._id) || req.session.id;
  var user_name = (req.user && req.user.name) || req.session.pear_name.name;



  if( req.game_room.get_status() == 'playing' ){
    // 需要提示不能中途退出
    resp.json({
      err : 1,
      msg : '游戏进行中，不能退出房间'
    })
    return;
  } else {
    req.game_room.remove_player( user_id, function( err ) {
      if( err ){
        resp.json({
          err : 1,
          msg : '未知错误'
        });
        return;
      }

      resp.json({
        err : 0,
        ru : '/'
      });

      req.game_room.empty(function(err, empty ) {
        if( empty ){
          delete room_refs[roomId];
        }
      });

    });
  }

});

router.post('/room/start', function( req, resp, next ) {
  var query = req.query;
  var roomId = query.id;

  var user_id = (req.user && req.user._id) || req.session.id;

  req.game_room.start( user_id, function( err ) {
      if( err ){
        next(err);
        return;
      }
      resp.json({
        err : 0
      });
  });
});


module.exports = router;
