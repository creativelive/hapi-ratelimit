#cl-hapi-rate
A simple ip based rate limiting plugin for Hapi using Redis.

##Installation
  npm install cl-hapi-rate

## Usage
In the Hapi init code:
```javascript
var Hapi = require('hapi');
var server = Hapi.createServer();
var rateOpts = {
  redis:{port:redis-port#, host:redis-host#}, 
  routes: server._router,
  global: {limit: -1, bucketLength: 60 } //-1 to disable global limit
};
server.route({
  method: 'GET',
  path: '/someImportantRoute',
  handler: someHandler,
  configs: {
    plugins: {
       "cl-hapi-rate": {limit: 100, bucketLength: 60} //limits to one hundred hits per minute
    }
  }
});
server.pack.require('cl-hapi-rate',rateOpts, function(err) { 
  console.log(err);
});
```

