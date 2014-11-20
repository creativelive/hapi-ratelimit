'use strict';

var request = require('supertest');
var async = require('async');

describe('Hapi route based rate limiting', function() {
  var url = 'http://localhost:8081';
  this.timeout(10 * 1000);

  function testok(cb) {
    request(url).get('/testglobal').expect(200).end(cb);
  }

  function test429(cb) {
    request(url).get('/testglobal').expect(429, cb);
  }
  it('Should return 429 if global limit is reached', function(done) {
    async.series([
      testok,
      testok,
      testok,
      testok,
      testok,
      testok,
      testok,
      testok,
      testok,
      testok,
      test429
    ], done);
  });

});
