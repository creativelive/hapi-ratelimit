'use strict';

var redis = require('redis');
var Hoek = require('hoek');
var Limiter = require('ratelimiter');

var internals = {};

internals.defaults = {
  namespace: 'clhr',
  global: {
    limit: -1,
    duration: 1
  },
  redis: {}
};

var MILLISECONDS = 1000;

exports.name = 'hapi-ratelimit';

exports.register = function(plugin, options, next) {
  var settings = Hoek.applyToDefaults(internals.defaults, options);
  var redisClient = redis.createClient(options.redis.port, options.redis.host, options.redis.options);

  plugin.ext('onPreAuth', function(request, callback) {
    var route = request.route;
    var routeLimit = route.plugins && route.plugins['hapi-ratelimit'];
    if (!routeLimit && settings.global.limit > 0) {
      routeLimit = settings.global;
    }
    if (routeLimit) {
      var ipts = settings.namespace + ':' + request.info.remoteAddress + ':' + route.path;
      var routeLimiter = new Limiter({
        id: ipts,
        db: redisClient,
        max: routeLimit.limit,
        duration: routeLimit.duration * MILLISECONDS
      });
      var error = null;
      routeLimiter.get(function(err, rateLimit) {
        if (err) {
          return callback(err);
        }
        request.plugins['hapi-ratelimit'] = {};
        request.plugins['hapi-ratelimit'].limit = rateLimit.total;
        request.plugins['hapi-ratelimit'].remaining = rateLimit.remaining - 1;
        request.plugins['hapi-ratelimit'].reset = rateLimit.reset;

        if (rateLimit.remaining <= 0) {
          error = plugin.hapi.error.badRequest('Rate limit exceeded');
          error.output.statusCode = 429; // Assign a Too Many Requests response
          error.output.headers['X-Rate-Limit-Limit'] = request.plugins['hapi-ratelimit'].limit;
          error.output.headers['X-Rate-Limit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
          error.output.headers['X-Rate-Limit-Reset'] = request.plugins['hapi-ratelimit'].reset;
          error.reformat();
        }
        return callback(error);
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

exports.register.attributes = {
  pkg: require('../package.json')
};
