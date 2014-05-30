'use strict';

var redis = require('redis');

var internals = {};

internals.defaults = {
  namespace: 'clhr',
  global: {
    limit: -1,
    bucketLength: 1
  },
  redis: {}
};

exports.register = function(plugin, options, next) {
  var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);
  var redisClient = redis.createClient(options.redis.port, options.redis.host, options.redis.options);

  plugin.ext('onPreAuth', function(request, callback) {
    var route = request.route;
    var limit = route.plugins && route.plugins['hapi-ratelimit'];
    if (!limit && settings.global.limit > 0) {
      limit = settings.global;
    }
    if (limit) {
      var ipts = settings.namespace + ':' + request.info.remoteAddress + ':' + route.path;
      var error = null;
      redisClient.get(ipts, function(err, token) {
        request.plugins['hapi-ratelimit'] = {};
        request.plugins['hapi-ratelimit'].limit = limit.limit;
        var left = limit.limit - token;
        request.plugins['hapi-ratelimit'].remaining = left > 0 ? left - 1 : 0; //they've already reached it at this point
        request.plugins['hapi-ratelimit'].reset = limit.bucketLength;

        if (token) {
          if (token >= limit.limit) {
            error = plugin.hapi.error.badRequest('Rate limit exceeded');
            error.output.statusCode = 429; // Assign a Too Many Requests response
            error.output.headers['X-Rate-Limit-Limit'] = request.plugins['hapi-ratelimit'].limit;
            error.output.headers['X-Rate-Limit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
            error.output.headers['X-Rate-Limit-Reset'] = request.plugins['hapi-ratelimit'].reset;
            error.reformat();
          }
          redisClient.incr(ipts, function(err) {
            return callback(error);
          });
        } else {
          redisClient.multi([
            ['INCR', ipts],
            ['EXPIRE', ipts, limit.bucketLength]
          ]).exec(function(err) {
            return callback();
          });
        }
      });
    } else {
      return callback();
    }
  });

  plugin.ext('onPostHandler', function(request, callback) {
    var response;
    if ('hapi-ratelimit' in request.plugins) {
      response = request.response;
      if (!response.isBoom) {
        response.headers['X-Rate-Limit-Limit'] = request.plugins['hapi-ratelimit'].limit;
        response.headers['X-Rate-Limit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
        response.headers['X-Rate-Limit-Reset'] = request.plugins['hapi-ratelimit'].reset;
      }
    }
    callback();
  });
  next();
};
