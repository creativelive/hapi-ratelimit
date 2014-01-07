var redis = require('redis');

var internals = {};

internals.defaults = {
  global:{limit: -1 , bucketLength: 1},
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
      var error = plugin.hapi.error.badRequest('Rate limit exceeded');
      error.response.code = 429;    // Assign a custom error code
      error.reformat();
      reply(error);
    }
  });

  plugin.ext('onRequest', function(request, callback) {
    //var route = plugin.Server._router.route(request.path);
    var route = options.routes.route(request);
    var limit = route.settings.plugins && route.settings.plugins['cl-hapi-rate'] ; 
    if(!limit && settings.global.limit > 0) {
      limit = settings.global;
    }
    if(limit) {
      var ipts = request.info.remoteAddress;//+':'+Math.floor((new Date()).getTime()/1000)
      redisClient.get(ipts,function(err, token){
        if(token) { //TODO: test for routes or global limit
          if(token > limit.limit ) {
            request.setUrl("/ratelimit");
            request.setMethod("GET");
          }
          redisClient.incr(ipts, function(err){
            return callback();
          });
        }else{
          redisClient.multi([['INCR',ipts],['EXPIRE', ipts, limit.bucketLength]]).exec(function(err) {
            return callback();
          });
        }
      }); 
    }else{
      return callback();
    }
  });
  next();
};
