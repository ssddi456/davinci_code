var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()
var debug = require('debug')(debug_name);

var wilddog = require('../libs/wilddog');


// totally failed

wilddog.initializeApp({
  serviceAccount : path.join(__dirname,'../trpg-ea00ef2ba6c1.json'),
  sync : "https://trpg-1b9ab.firebaseio.com"
}, function( ) {
    
  var ref_to_a = wilddog.child('rest').child('a');

  var n = 0;
  var timer = setInterval(function() {
    n ++;
    ref_to_a.req('PUT', { a : 'test ' + n}, function(err, doc ) {
      console.log( err, doc, typeof doc);
    });

  }, 1e3);

  setTimeout(function() {
    process.exit(0);
  }, 4e3);

});


