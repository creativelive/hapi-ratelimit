var redis = require('redis');

var internals = {};

internals.defaults = {
  namespace:"clhr",
  global:{limit: -1 , bucketLength: 1},
  redis:{}
};

exports.register = function(plugin, options, next) {
  var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);
  var redisClient  = redis.createClient(options.redis.port, options.redis.host, options.redis.options);
  plugin.state('cl-hapi-rate',{});

  plugin.ext('onPreAuth', function(request, callback) {
    var route = request.route;
    var limit = route.plugins && route.plugins['cl-hapi-rate'] ; 
    if(!limit && settings.global.limit > 0) {
      limit = settings.global;
    }
    if(limit) {
      var ipts = settings.namespace+':'+request.info.remoteAddress+':'+route.path;
      var error = null;
      redisClient.get(ipts,function(err, token) {
        request.plugins['cl-hapi-rate'] = {};
        request.plugins['cl-hapi-rate'].limit = limit.limit; 
        var left = limit.limit - token;
        request.plugins['cl-hapi-rate'].remaining = limit > 0 ? left : 0; //they've already reached it at this point
        request.plugins['cl-hapi-rate'].reset = limit.bucketLength; 

        if(token) { 
          if(token >= limit.limit ) {
            error = plugin.hapi.error.badRequest('Rate limit exceeded');
            error.response.code = 429;    // Assign a custom error code
            error.reformat();
          }
          redisClient.incr(ipts, function(err){
            return callback(error);
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

  plugin.ext('onPostHandler', function(request, callback) {
    var response;
    if('cl-hapi-rate' in request.plugins) {
      response = request.response();
      if(!response.isBoom) {
        response._headers['X-Rate-Limit-Limit'] = request.plugins['cl-hapi-rate'].limit;
        response._headers['X-Rate-Limit-Remaining'] = request.plugins['cl-hapi-rate'].remaining;
        response._headers['X-Rate-Limit-Reset'] = request.plugins['cl-hapi-rate'].reset;
      }else{
        response.response.headers['X-Rate-Limit-Limit'] = request.plugins['cl-hapi-rate'].limit;
        response.response.headers['X-Rate-Limit-Remaining'] = request.plugins['cl-hapi-rate'].remaining;
        response.response.headers['X-Rate-Limit-Reset'] = request.plugins['cl-hapi-rate'].reset;
      }
    }
    callback();
  });
  next();
};
