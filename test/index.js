'use strict';

// Load modules

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Limit = require('../lib/');

// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const it = lab.it;
const expect = Code.expect;


it('adds rate-limiting headers on each request', (done) => {

    const server = new Hapi.Server();
    server.connection();

    const plugin = {
        register: Limit,
        options: {
            redis: { host: '127.0.0.1', port: 6379 }
        }
    };

    server.register(plugin, (err) => {

        expect(err).to.not.exist();

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {

                reply({ success: true });
            },
            config: {
                plugins: { 'hapi-ratelimit': { limit: 2, duration: 1 } }
            }
        });

        const request = {
            method: 'GET',
            url: '/'
        };

        server.inject(request, (response) => {

            expect(response.statusCode).to.equal(200);
            expect(response.result).to.deep.equal({ success: true });
            expect(response.headers).to.include(
                'x-ratelimit-limit',
                'x-ratelimit-remaining',
                'x-ratelimit-reset'
            );

            expect(response.headers['x-ratelimit-remaining']).to.equal(1);
            expect(response.headers['x-ratelimit-limit']).to.equal(2);
            expect(response.headers['x-ratelimit-reset']).to.be.greaterThan(10000);
            done();
        });
    });
});


it('returns 429 when request limit is reached', (done) => {

    const server = new Hapi.Server();
    server.connection();

    const plugin = {
        register: Limit,
        options: {
            global: { limit: 1, duration: 1 },
            redis: { host: '127.0.0.1', port: 6379 }
        }
    };

    server.register(plugin, (err) => {

        expect(err).to.not.exist();

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {

                reply({ success: true });
            }
        });

        const request = {
            method: 'GET',
            url: '/'
        };

        server.inject(request, (okResponse) => {

            expect(okResponse.statusCode).to.equal(200);
            expect(okResponse.headers['x-ratelimit-remaining']).to.equal(0);
            expect(okResponse.headers['x-ratelimit-limit']).to.equal(2);

            server.inject(request, (response) => {

                expect(response.statusCode).to.equal(429);
                expect(response.headers['x-ratelimit-remaining']).to.equal(-1);
                expect(response.headers['x-ratelimit-limit']).to.equal(2);
                expect(response.headers['x-ratelimit-reset']).to.be.greaterThan(10000);
                done();
            });
        });
    });
});


it('ignores unconfigured routes', (done) => {

    const server = new Hapi.Server();
    server.connection();

    const plugin = {
        register: Limit,
        options: {
            redis: { host: '127.0.0.1', port: 6379 }
        }
    };

    server.register(plugin, (err) => {

        expect(err).to.not.exist();

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {

                reply({ success: true });
            }
        });

        const request = {
            method: 'GET',
            url: '/'
        };

        server.inject(request, (response) => {

            expect(response.statusCode).to.equal(200);
            expect(response.headers).to.not.include(
                'x-ratelimit-remaining',
                'x-ratelimit-limit',
                'x-ratelimit-reset'
            );
            done();
        });
    });
});
