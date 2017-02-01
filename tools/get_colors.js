var clawer_aggregate = require('clawer_aggregate');
var _ = require('underscore');

var urls = _.range(1,23).map( x => `http://www.peise.net/color/${x}.html`);


clawer_aggregate()
  .grep(urls, {
    $context : '#main > div.border-bottom > div.span-8 > ul > li',
    name : ['text', 'h3 > a'],
    color : ['text', '.meta > h4']
  })
  .custom(function( nodes, done ) {
    nodes.forEach(function( node ) {
      var color = node.color.match(/^HEX:(.{2})(.{2})(.{2})$/);
      var rcolor= '';
      _.range(1,4).forEach(function( chr ) {
        var _color = parseInt(color[chr], 16);
        var _r_color = 255 - _color;

        if( Math.abs(_r_color - _color) < 50 ){
          _r_color += Math.floor(_color / 2)
        }
        chr =  _r_color.toString(16);
        if( chr.length < 2 ){
          chr = '0'+chr;
        }
        rcolor += chr
      });
      node.name = node.name.split(',')[0].replace(/(\(|（)[^\）\)]+(\)|）)/, '');
      node.rcolor = '#' + rcolor;
      node.color = ('#' + color[1] + color[2] + color[3]).toLowerCase();
    });
    done(null, nodes);
  })
  .exec(function(err, names) {
    console.log( names );
  });



