'use strict';

var request = require('supertest');
describe('Hapi route based rate limiting', function() {
  var url = 'http://localhost:8081';
  it('Should return 429 if local limit is reached', function(done) {
    request(url).get('/test').expect(200, function() {
      request(url).get('/test').expect(200, function() {
        request(url).get('/test').expect(429, done);
      });
    });
  });

  it('Should allow new requests after time period and then return 429 if local limit is reached', function(done) {
    this.timeout(10 * 1000);
    setTimeout(function() {
      request(url).get('/test').expect(200, function() {
        request(url).get('/test').expect(200, function() {
          request(url).get('/test').expect(429, done);
        });
      });
    }, 7 * 1000);
  });
});
