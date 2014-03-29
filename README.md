#hapi-ratelimit
A simple ip based rate limiting plugin for Hapi using Redis.

WARNING: This is not sufficient protection against DDoS attacks. 

##Installation
  npm install hapi-ratelimit

## Usage
In the Hapi init code:
```javascript
var Hapi = require('hapi');
var server = Hapi.createServer();
var rateOpts = {
  redis:{port:#redis-port#, host:#redis-host#}, 
  namespace:"clhr", //namespace for redis keys
  global: {limit: 200, bucketLength: 60 } //Set limit to -1 or leave out global to disable global limit
  //The global limit is not given priority over local limits
};
server.route({
  method: 'GET',
  path: '/someImportantRoute',
  handler: someHandler,
  configs: {
    plugins: {
       "hapi-ratelimit": {limit: 100, bucketLength: 60} //limits to one hundred hits per minute on a specific route
    }
  }
});
server.pack.require('hapi-ratelimit',rateOpts, function(err) { 
  console.log(err);
});
```

