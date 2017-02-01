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
var router = express.Router();

var storage = require('../libs/storage');

var user_store = storage('trpg', 'users');

user_store.get_collection(function( collection ) {
  collection.createIndex({ 'username' : 1 }, { unique : true });
});

router.post('/login', function(req, res, next) {
  /**
   * 
   * login success
   * 
   * login failed
   *   user not found
   *   pass word not match
   *   misc reasons
   *   retry times
   *
   */

  var body = req.body;

  user_store
    .findOne({ username : body.username }, function( err, user ) {
      if( err ){
        res.json({
          err : 1,
          msg : '未知错误'
        });
        debug('find user failed :', err);
        return;
      }
      if( user ){
        // do compare here
        if( body.username == user.password){

          req.sesssion.is_login = true;
          req.sesssion.user_id = user._id;

          res.json({
            err : 0
          });
        } else {
          res.json({
            err : 1,
            msg : '密码错误'
          });
        }
      }
    });


});

router.post('/regist', function( req, resp, next ) {
  /**
   * 
   * regist success
   * 
   * regist failed
   *   username found
   *   misc reasons
   *   retry times
   *
   */

  var body = req.body;


  user_store
    .findOne({ username : body.username }, function( err, user ) {
      if( err ){
        res.json({
          err : 1,
          msg : '未知错误'
        });
        debug('find user failed :', err);
        return;
      }
      if( user ){

        res.json({
          err : 1,
          msg : '用户已经存在'
        });

      } else {

        user_store.insert({ 
          username : body.username, 
          password : body.password
        }, function( err, doc ) {
          
          if( err ){
            res.json({
              err : 1,
              msg : '未知错误'
            });
            debug('insert user failed :', err);
            return;
          } else {
            res.json({
              err : 0
            });
          }
        });

      }
    });
});

module.exports = router;
