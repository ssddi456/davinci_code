var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()
var debug = require('debug')(debug_name);
var davinciCode = require('../libs/davinci-code');

console.log('davinciCodeCardPool start');

var davinciCodeCardPool = davinciCode.davinciCodeCardPool;
console.log( davinciCodeCardPool.allCards, davinciCodeCardPool.allCards.length );


function check_desk ( cards ) {
    var prev;
    cards.forEach(function( card ) {
      if( card.num.length > 1){
        console.log( cards );
        throw new Error('illegal card ' + card.num);
      }
      if( prev == undefined ){
        prev = card.num;
      } else {
        if( prev == '-' ){
          if( card.num != '-' ){
            prev = card.num;
          }
        } else if( card.num == '-' ){

        } else if( parseInt(prev) > parseInt(card.num) ){
          console.log( cards );
          throw new Error('illegal card order' + prev + ' ' + card.num);
        } else if( parseInt(prev) <= parseInt(card.num) ){
          prev = card.num;
        }
      }
    })
}

var deck = [ { back: 'white', num: '2', status: 'hide' },
  { back: 'white', num: '-', status: 'hide' },
  { back: 'black', num: '0', status: 'hide' },
  { back: 'black', num: '3', status: 'hide' },
  { back: 'white', num: '3', status: 'hide' } ];

deck.forEach(function( card ) {
  if( card.num == '-' ){
    card.sort_by = Math.random() * 4;
  } else {
    card.sort_by = parseInt(card.num);
  }
})

var sorter = function( a, b ) {
  return a.sort_by - b.sort_by;
};

deck.sort(sorter);
console.log( deck );
check_desk(deck);

console.log('game_with_2');
var game_with_2 = davinciCodeCardPool.generateGame(2);
Object.keys(game_with_2.ondesk).forEach(function( k ) {
  console.log( check_desk(game_with_2.ondesk[k]), game_with_2.ondesk[k].length );
});
console.log( game_with_2.rest );

console.log('game_with_3');
var game_with_3 = davinciCodeCardPool.generateGame(3);
Object.keys(game_with_3.ondesk).forEach(function( k ) {
  console.log( check_desk(game_with_3.ondesk[k]), game_with_3.ondesk[k].length );
});
console.log( game_with_3.rest );

console.log('game_with_4');
var game_with_4 = davinciCodeCardPool.generateGame(4);
Object.keys(game_with_4.ondesk).forEach(function( k ) {
  console.log( check_desk(game_with_4.ondesk[k]), game_with_4.ondesk[k].length );
});
console.log( game_with_4.rest );

console.log('davinciCodeCardPool end');

process.exit();