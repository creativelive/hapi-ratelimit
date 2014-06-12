# hapi-ratelimit [![](https://travis-ci.org/creativelive/hapi-ratelimit.png)](https://travis-ci.org/creativelive/hapi-ratelimit)

A simple ip based rate limiting plugin for Hapi using Redis.


##Installation
  npm install hapi-ratelimit

## Usage

In the Hapi init code:
```javascript
var Hapi = require('hapi');
var hratelimit = require('hapi-ratelimit');
var server = Hapi.createServer();
var rateOpts = {
  redis:{port:#redis-port#, host:#redis-host#},
  namespace:"clhr", //namespace for redis keys
  global: {limit: 200, duration: 60 } //Set limit to -1 or leave out global to disable global limit
  //The global limit is not given priority over local limits
};
server.route({
  method: 'GET',
  path: '/someImportantRoute',
  handler: someHandler,
  configs: {
    plugins: {
       "hapi-ratelimit": {limit: 100, duration: 60} //limits to one hundred hits per minute on a specific route
    }
  }
});
server.pack.register({
    options: rateOpts,
    plugin: hratelimit
  }, 
  function(err) {
    console.log(err);
  }
);
```
