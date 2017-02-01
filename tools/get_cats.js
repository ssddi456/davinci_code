var clawer_aggregate = require('clawer_aggregate');
var _ = require('underscore');

var urls = _.range(1,5).map( x => `http://baike.lelezone.com/maomao/pinzhong/list_11_${x}.html`);
console.log( urls );

clawer_aggregate()
  .grep(urls, {
    name : ['text', '.cateList > div > div > div.right.fl > h3 > a']
  })
  .unwind(['name'])
  .custom(function( nodes, done ) {
    var names = nodes.map(x => (x.name.trim().match(/宠物猫之(.*)$/) || [])[1] ).filter(Boolean);
    done(null, names)
  })
  .exec(function(err, names) {
    console.log( names );
  });