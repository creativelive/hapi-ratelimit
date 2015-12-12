'use strict';

const Boom = require('boom');
const Redis = require('ioredis');
const Hoek = require('hoek');
const Limiter = require('ratelimiter');

const internals = {
    defaults: {
        namespace: 'clhr',
        global: { limit: -1, duration: 1 },
        redis: null
    }
};

const MILLISECONDS = 1000;


exports.register = (server, options, next) => {

    const settings = Hoek.applyToDefaults(internals.defaults, options);
    const redis = new Redis(options.redis);

    server.ext('onPreAuth', (request, reply) => {

        const route = request.route;
        let routeLimit = route.settings.plugins && route.settings.plugins['hapi-ratelimit'];

        if (!routeLimit && settings.global.limit > 0) {
            routeLimit = settings.global;
        }

        if (routeLimit) {
            const ipts = [settings.namespace, request.info.remoteAddress, route.path].join(':');
            const routeLimiter = new Limiter({
                id: ipts,
                db: redis,
                max: routeLimit.limit,
                duration: routeLimit.duration * MILLISECONDS
            });

            routeLimiter.get((err, rateLimit) => {

                /* $lab:coverage:off$ */
                if (err) {
                    return reply(err);
                }
                /* $lab:coverage:on$ */

                request.plugins['hapi-ratelimit'] = {
                    limit: rateLimit.total,
                    remaining: rateLimit.remaining - 1,
                    reset: rateLimit.reset
                };

                if (rateLimit.remaining <= 0) {
                    const error = Boom.tooManyRequests('Rate limit exceeded');
                    error.output.headers['X-RateLimit-Limit'] = request.plugins['hapi-ratelimit'].limit;
                    error.output.headers['X-RateLimit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
                    error.output.headers['X-RateLimit-Reset'] = request.plugins['hapi-ratelimit'].reset;
                    error.reformat();
                    return reply(error);
                }

                return reply.continue();
            });
        }
        else {
            return reply.continue();
        }
    });

    server.ext('onPostHandler', (request, reply) => {

        if ('hapi-ratelimit' in request.plugins) {
            const response = request.response;

            if (!response.isBoom) {
                response.headers['X-RateLimit-Limit'] = request.plugins['hapi-ratelimit'].limit;
                response.headers['X-RateLimit-Remaining'] = request.plugins['hapi-ratelimit'].remaining;
                response.headers['X-RateLimit-Reset'] = request.plugins['hapi-ratelimit'].reset;
            }
        }

        reply.continue();
    });

    next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};
