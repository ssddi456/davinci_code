var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));

app.set('env','development');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var config = require('./config');
var expressSession = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(expressSession);
var sessionStore = new MongoDBStore(
                        {
                          uri: 'mongodb://localhost:27017/trpg',
                          collection: 'login_users'
                        });

app.use(expressSession({
    secret: 'This is a secret',
    name : '55ud',
    cookie: {
      // maxAge: 1000 * 60 * 60 * 24 * 7
    },
    store: sessionStore,
    // Boilerplate options, see: 
    // * https://www.npmjs.com/package/express-session#resave 
    // * https://www.npmjs.com/package/express-session#saveuninitialized 
    resave: true,
    saveUninitialized: true
}));


app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    var data = {
      message: err.message,
      error: err,
      err : 1,
      msg : err.message
    };
    if( req.xhr ){
      res.json(data)
    } else {
      res.render('error', data);
    }
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  var data = {
      message: err.message,
      error: {},
      err : 1,
      msg : err.message
    };
    if( req.xhr ){
      res.json(data)
    } else {
      res.render('error', data);
    }
});


module.exports = app;
