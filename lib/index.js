var redis = require('redis');

var internals = {};

internals.defaults = {
  global:{limit: -1 , bucketLength: 1},
  routes: {},
  redis:{}
};

exports.register = function(plugin, options, next) {
  var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);
  var redisClient  = redis.createClient(options.redis.port, options.redis.host, options.redis.options);
  plugin.state('cl-hapi-rate',{});

  plugin.route({
    method: 'GET',
    path: "/ratelimit",
    handler: function(request, reply) {
      reply(429);
    }
  });

  plugin.ext('onRequest', function(request, callback) {
    var ipts = request.info.remoteAddress+':'+Math.floor((new Date()).getTime()/1000)
    redisClient.get(ipts,function(err, token){
      if(token && token > 1) { //TODO: test for routes or global limit
        request.setUrl("/ratelimit");
        request.setMethod("GET");
        return callback();
      }else{
        redisClient.multi([['INCR',ipts],['EXPIRE', ipts, 120]]).exec(function(err) {
          return callback();
        });
      }
    }); 
  });
  next();
};
