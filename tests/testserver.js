'use strict';

var Hapi = require('hapi');
var ansi = require('simple-ansi');
var moment = require('moment');

var debug = true;
var server = new Hapi.Server('localhost', 8081, {});
server.route([{
  method: 'GET',
  path: '/test',
  handler: function(request, reply) {
    reply({
      success: 'Test Ok!'
    });
  },
  config: {
    plugins: {
      'hapi-ratelimit': {
        limit: 2,
        duration: 5
      }
    }
  }
}, {
  method: 'GET',
  path: '/testglobal',
  handler: function(request, reply) {
    reply({
      success: 'Test Ok!'
    });
  }
}]);

var rateopts = {
  redis: {
    port: 6379,
    host: 'localhost'
  },
  global: {
    limit: 10,
    duration: 20
  }
};
server.pack.register({
  options: rateopts,
  plugin: require('../../hapi-ratelimit')
}, {}, function(err) {
  if (err) {
    console.log(err);
  }
});

server.on('request', function(request, event, tags) {
  var now, time;

  if (debug === true) {
    now = moment().format('HH:mm:ss');
    time = ansi.bold + ansi.gray + now + ansi.reset;
    console.log(time, '[' + ansi.green + request.method.toUpperCase() + ansi.reset + ']', ansi.blue + ansi.bold + request.path + ansi.reset);
    if (request.params && request.params.length > 0) {
      console.log(ansi.yellow, '\tParams: ', request.params, ansi.reset);
    }
    if (request.payload) {
      console.log(ansi.cyan, '\tPayload: ', request.payload, ansi.reset);
    }
    if (request.query && Object.keys(request.query).length > 0) {
      console.log(ansi.magenta, '\tQuery: ', request.query, ansi.reset);
    }
  }
});

server.start(function() {
  console.log('Hapi Test Server Started');
});
