var wilddog = require('../libs/wilddog');

wilddog.initializeApp({
  sync : 'https://trpgs.wilddogio.com'
});

var ref_to_a = wilddog.child('rest').child('a').watch();

ref_to_a.es.on('cache_init', function() {
    var data = ref_to_a.es.get('/res/a/c');

    console.log( data );
    
});

ref_to_a.es.on('change', function( path, old, change_to ) {
    console.log('change');
    console.log( old );
    console.log( change_to );
});


var ref = wilddog.child('rest/a/c/d');

var n = 0;
var timer = setInterval(function() {
  n ++;
  ref.set( 'test ' + n, function(err, doc ) {
    console.log( err, doc, typeof doc);
  });
}, 1e3);

setTimeout(function() {
  wilddog.stop();
  clearInterval(timer);
}, 12e3);