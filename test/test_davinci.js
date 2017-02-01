var davinciCode = require('../libs/davinci-code');

console.log('davinciCodeCardPool start');

var davinciCodeCardPool = davinciCode.davinciCodeCardPool;
console.log( davinciCodeCardPool.allCards, davinciCodeCardPool.allCards.length );

console.log('game_with_2');
var game_with_2 = davinciCodeCardPool.generateGame(2);
Object.keys(game_with_2.ondesk).forEach(function( k ) {
  console.log( game_with_2.ondesk[k], game_with_2.ondesk[k].length );
});
console.log( game_with_2.rest );

console.log('game_with_3');
var game_with_3 = davinciCodeCardPool.generateGame(3);
Object.keys(game_with_3.ondesk).forEach(function( k ) {
  console.log( game_with_3.ondesk[k], game_with_3.ondesk[k].length );
});
console.log( game_with_3.rest );

console.log('game_with_4');
var game_with_4 = davinciCodeCardPool.generateGame(4);
Object.keys(game_with_4.ondesk).forEach(function( k ) {
  console.log( game_with_4.ondesk[k], game_with_4.ondesk[k].length );
});
console.log( game_with_4.rest );

console.log('davinciCodeCardPool end');
