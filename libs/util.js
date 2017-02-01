var utils = module.exports;
var crypto = require('crypto');

utils.uuid = function uuid() {
  var md5sum = crypto.createHash('md5');
  md5sum.update( Date.now() +'secret' + Math.random() );
  var md5_1 = md5sum.digest('base64').toUpperCase();
  md5sum = crypto.createHash('md5');
  md5sum.update( md5_1 + Math.random() );
  return md5sum.digest('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12) + Date.now();
};
var arr_proto = Array.prototype;
utils.slice = function( arr ) {
  return arr_proto.slice.call(arr);
}
;(require.main === module) && (function(){
  console.time('testuuid');
  console.log( utils.uuid() );
  console.timeEnd('testuuid');
})();