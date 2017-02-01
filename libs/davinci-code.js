var path    = require('path');
var debug_name = path.basename(__filename,'.js');
if( debug_name == 'index'){
  debug_name = path.basename(__dirname);
}
(require.main === module) && (function(){
    process.env.DEBUG = '*';
})()
var debug = require('debug')(debug_name);

var _ = require('underscore');
var async = require('async');
var wilddog = require('./wilddog');
wilddog.initializeApp({
  sync : 'https://trpgs.wilddogio.com'
});

var noop = function() {};

var davinciCodeCardPool  = {
  chrs : _.range(0,12).concat('-'),
  biggest : 12,
  // biggest : 4,
  // chrs : _.range(0,4).concat('-'),
  colors : ['white', 'black']
};
davinciCodeCardPool.allCards = [].concat.call.apply([].concat, davinciCodeCardPool.colors.map( x => davinciCodeCardPool.chrs.map( y => [x,y] ) ));
davinciCodeCardPool.generateGame = function( num ) {
  debug('generateGame for', num);

  var allCards = this.allCards.slice();
  var ret = {
    ondesk : {},
    rest  : {}
  };

  _.range(0, num).forEach( x => ret.ondesk[x] = []);
  allCards = _.shuffle(allCards);
  allCards.slice(0, allCards.length % num).map(( type, idx) =>{ ret.rest[idx] =  new davinciCodeCard( type[0], type[1] )});

  allCards.slice(allCards.length % num).map(function( type, idx ) {
    var card = new davinciCodeCard( type[0], type[1] );
    if( type[1] == '-' ){
      card.sort_by = Math.random() * davinciCodeCardPool.biggest;
    } else {
      card.sort_by = parseInt(type[1]);
    }
    ret.ondesk[idx%num].push(card);
  });

  _.range(0, num).forEach(( x )=>{
    ret.ondesk[x].sort(function( a, b ) {
      var delta =  a.sort_by - b.sort_by;
      if( delta == 0 ){
        if( a.back == 'black' ){
          return -1;
        } else {
          return 1;
        }
      } else {
        return delta;
      }
    });
  });

  return ret;
}

function davinciCodeCard ( back, num ) {
  this.back = back;
  this.num = (num + '').trim();
  /**
   * hide or show
   */
  this.status = 'hide' 
}

var dccp = davinciCodeCard.prototype;
dccp.toJSON = function() {
  return {
    back : this.back,
    num : this.status == 'hide' ? '' : this.num,
    status : this.status
  };
}

function davinciCodePlayer( user_id ) {
    this.id = user_id;
    /**
     * prepare
     * playing
     */
    this.status = 'prepare';
    /**
     * out
     * alive
     */
    this.success_status = 'alive';
    this.cards = {};
    this.last_guess = {};
}

var dcpp = davinciCodePlayer.prototype;

function davinciCodeGuess() {
    this.target = undefined;
    this.pos = undefined;
    this.num = undefined;
}

function davinciCode(id) {
    this.id = id;
    this.admin;
    this.players = {
      // user_id
    };

    this.rest_cards = {};
    
    this.count_down = 0;
    this.count_down_from = 30;
    this.current_player_id = undefined;

    /**
     * perpare
     * playing
     */
    this.status = 'perpare';
    this.ref = wilddog.child('/rooms/'+ id);
};

var dcgp = davinciCode.prototype;

dcgp.init = function( user_id, done ) {
  debug('init enter');

  this.admin = user_id;

  this.players = {};
  this.rest_cards = {};

  this.ref.init( this.toJSON(), done);
    
};

dcgp.start = function( user_id, done ) {
  done = done || noop;

  debug('start enter');
  var es = this.ref.es;
  var self = this;

  self.players = {};

  async.waterfall([
    function( done ) {
      self.ref.child('players').get(done);
    },
    function( players, done ) {
        
      var keys = Object.keys(players);

      if( self.status == 'playing' ){
        return done(new Error('游戏进行中'));
      }

      var player_len = keys.length;
      if( player_len < 2 ){
        return done(new Error('至少需要两个玩家'));
      }

      if( player_len > 6 ){
        return done(new Error('玩家数目太多')); 
      }

      var player_idx = 0;

      self.next_player = function() {
        debug('next_player enter');

        var start_from = player_idx;
        var player;
        var current_player_id;

        this.ref.child('players').get(function( err, players ) {
          if( err ) {
            debug('wtf???');
          } else {

            debug('player_idx', player_idx);
            while( true ) {
              player_idx = (player_idx + 1) % player_len;
              current_player_id = keys[player_idx];
              player = players[current_player_id];
              if( player.success_status == 'alive' ){
                break;
              }
            } 

            debug('next_player', player_idx, current_player_id, player.success_status);

            self.current_player_id = current_player_id;

            self.ref.update({ current_player_id : current_player_id }, function() {
                
            });
          }
        });
      }

      var cards = davinciCodeCardPool.generateGame(player_len);

      //
      // 确定玩家顺序
      //
      // 发牌,调整牌顺序 太麻烦先不写
      // 
      var updater_player = {};
      keys.forEach(function( k, idx ) {
        updater_player[ k + '/order' ] = idx;
        updater_player[ k + '/cards' ] = cards.ondesk[idx].map( x => x.toJSON() );
        updater_player[ k + '/status' ] = 'playing';
        updater_player[ k + '/success_status' ] = 'alive';
        updater_player[ k + '/last_guess' ] = null;
        self.players[k] = cards.ondesk[idx];
      });

      self.current_player_id = keys[player_idx];
      self.status = 'playing';
      self.count_down = self.count_down_from;
      self.result = {};

      var updater_game = {
        'current_player_id' : keys[player_idx],
        status : 'playing',
        count_down : self.count_down_from,
        result : {}
      };

      async.parallel([
        function( done ) {
          self.ref.child('players').update( updater_player, done);
        },
        function( done ) {
          self.ref.update( updater_game, done);
        }],
        function() {

          function tick () {
            if( self.count_down == 0 ){
              self.count_down = self.count_down_from;
              self.next_player();
            }

            self.ref.update({ count_down : self.count_down }, function() {
                
            });
            self.count_down --;
            self.timer = setTimeout(tick, 1e3);
          }

          self.timer = setTimeout( tick, 1e3 );
          
          done();
        });
    }], done);
};


dcgp.guess = function( user_id, guess, done ) {
  debug('guess enter');
  var self = this;
  if( user_id != this.current_player_id ){
    return done();
  }


  var card = self.get_card( guess ); 
  if( card.status == 'show' ){
    return done(new Error('那张卡已经被猜中'));
  }

  self.count_down = self.count_down_from;

  self.ref.child('players/' + user_id + '/last_guess').set(guess);
  debug('check', 'card.num', card.num, 'guess.num', guess.num);
  if( (card.num + '').trim() == ( guess.num + '').trim() ){
    card.status = 'show';
    self.ref.child('players/' + guess.target + '/cards/' + guess.pos ).update({
      status : 'show',
      num    : guess.num
    }, function() {
        
    });
    debug('猜对了')
    done(null, '猜对了');
    self.check_game_status();
  } else {
    debug('猜错了')
    done(new Error('猜错了') );
    self.next_player();
  }
}

dcgp.get_cards = function( user_id ) {
  return this.players[user_id].map(function( card ) {
      return {
        num : card.num,
        back: card.back,
        status: card.status
      };
  });
};

dcgp.get_card = function( guess ) {
  return this.players[guess.target][guess.pos];
};


dcgp.check_game_status = function( done ) {
  debug('check_game_status enter');
  done = done || noop;
  var self = this;
  this.ref.child('players').get(function( err, players ) {
    if( players ){

      var updater = {};
      var alives = 0;
      var winner;
      Object.keys(players).forEach(function( k ) {
        var player = players[k];

        if( player.success_status == 'out' ){

        } else {
          var cards = self.players[k];
          if( cards.every(function( card ) {
                return card.status == 'show';
              })
          ){
            updater['players/' + k + '/success_status'] = 'out';
          } else {
            winner = player;
            alives ++;
          }
        }
      });
        
      if( alives == 1 ){
        updater.status = self.status = 'perpare';

        updater.result = {
          id : winner.id,
          display_name : winner.display_name
        };

        self.ref.update(updater, done);
        clearTimeout(self.timer);
      } else {
        done();
      }
    }
  })
  
};

dcgp.empty = function( done ) {
  debug('empty enter');
  var players = this.ref.child('players').get(function( err, players ) {
    done(err, !players || Object.keys(players).length == 0);
  });
};

dcgp.destroy = function() {
  debug('destroy enter');
  this.ref.stop && this.ref.stop();
};

dcgp.get_player = function( user_id, done ) {
  debug('get_player enter');
  done = done || noop;

  this.ref.child('players/'+user_id).get(function( err, player ) {
    debug( 'get_player', player, typeof player );
    done(err, player );
  });
};

dcgp.add_player = function( user_id, user_name, done ) {
  debug('add_player enter');

  var self = this;
  var data_path = 'players/'+user_id;
  done = done || noop;

  self.ref.child('players').get(function( err, players ) {
    debug('add_player check step');
    if( err ){
      done(err);
    } else if( players && players[user_id] ){
      done(null, players[user_id]);
    } else {
      if( players && Object.keys(players).length > 6 ){
        done(new Error('玩家数目已达上限'));
      } else {
        var new_player = new davinciCodePlayer(user_id);
        new_player.display_name = user_name;
        debug('add_player add new player');
        self.ref.child(data_path).set(new_player,function(err, res) {
          debug('add_player add new player finish');
            done();
        });
      }
    }
  })

};

dcgp.remove_player = function( user_id, done ) {
  debug('remove_player enter');
  var es = this.ref.es;
  var data_path = 'players/'+user_id;
  var self = this;
  this.ref.child(data_path).remove(function() {
    done();

    self.ref.child('players').get(function( err, doc ) {
      if( err ){
        return;
      }
      if( !doc ){
        self.destroy();
      } else {
        if( self.admin == user_id ){
          self.admin = Object.keys(doc)[0];
          self.ref.child('admin').set(self.admin);
        }
      }
    })
  });
};

dcgp.get_status = function() {
  return this.status;
};

dcgp.toJSON = function() {
  debug('toJSON enter');
  return {
    id : this.id,
    admin : this.admin,
    status : this.status,
    rest_cards : this.rest_cards
  };
};

module.exports = davinciCode;
davinciCode.davinciCodeCardPool = davinciCodeCardPool;