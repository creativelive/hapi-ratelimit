'use strict';

const Boom = require('boom');
const redis = require('redis');
const Hoek = require('hoek');
const Limiter = require('ratelimiter');

const internals = {};

internals.defaults = {
    namespace: 'clhr',
    global: {
        limit: -1,
        duration: 1
    },
    redis: {}
};

const MILLISECONDS = 1000;

exports.name = 'hapi-ratelimit';

exports.register = (server, options, next) => {

  const settings = Hoek.applyToDefaults(internals.defaults, options);
  const redisClient = redis.createClient(options.redis.port, options.redis.host, options.redis.options);

    server.ext('onPreAuth', (request, reply) => {

        const route = request.route;
        const routeLimit = route.settings.plugins && route.settings.plugins['hapi-ratelimit'];

        if (!routeLimit && settings.global.limit > 0) {
            routeLimit = settings.global;
        }

        if (routeLimit) {
            const ipts = settings.namespace + ':' + request.info.remoteAddress + ':' + route.path;
            const routeLimiter = new Limiter({
                id: ipts,
                db: redisClient,
                max: routeLimit.limit,
                duration: routeLimit.duration * MILLISECONDS
            });

            const error = null;
            routeLimiter.get((err, rateLimit) => {

                if (err) {
                    return reply(err);
                }

                request.plugins['hapi-ratelimit'] = {};
                request.plugins['hapi-ratelimit'].limit = rateLimit.total;
                request.plugins['hapi-ratelimit'].remaining = rateLimit.remaining - 1;
                request.plugins['hapi-ratelimit'].reset = rateLimit.reset;

                if (rateLimit.remaining <= 0) {
                    error = Boom.tooManyRequests('Rate limit exceeded');
                    error.output.headers['X-Rate-Limit-Limit'] = request.plugins['hapi-ratelimit'].limit;
                    error.output.headers['X-Rate-Limit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
                    error.output.headers['X-Rate-Limit-Reset'] = request.plugins['hapi-ratelimit'].reset;
                    error.reformat();
                    return reply(error);
                } else {
                    return reply.continue();
                }
            });
        } else {
            return reply.continue();
        }
    });

    server.ext('onPostHandler', (request, reply) => {

        const response;
        if ('hapi-ratelimit' in request.plugins) {
            response = request.response;
            if (!response.isBoom) {
                response.headers['X-Rate-Limit-Limit'] = request.plugins['hapi-ratelimit'].limit;
                response.headers['X-Rate-Limit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
                response.headers['X-Rate-Limit-Reset'] = request.plugins['hapi-ratelimit'].reset;
            }
        }
        reply.continue();
    });

    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
