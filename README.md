# hapi-ratelimit

A simple ip based rate limiting plugin for Hapi using Redis.

This is a fork from the [creativelive](https://github.com/creativelive/hapi-ratelimit) project. It adds support to **Hapi 8**.

##Installation

```
npm install franciscogouveia/hapi-ratelimit
```

## Usage

In the Hapi init code:
```javascript
var Hapi = require('hapi');
var hratelimit = require('hapi-ratelimit');
var server = new Hapi.Server();

// Config for ratelimit
var rateOpts = {
  redis:{
    port:#redis-port#,
    host:#redis-host#
  },
  namespace: "clhr", //namespace for redis keys
  global: {
    limit: 200, 
    duration: 60 
  } //Set limit to -1 or leave out global to disable global limit
  //The global limit is not given priority over local limits
};

var connection = server.connection({
  port: 80,
  labels: 'something'
});

connection.route({
  method: 'GET',
  path: '/someImportantRoute',
  handler: someHandler,
  configs: {
    plugins: { // If you want to override the default values
       "hapi-ratelimit": {
         limit: 100, 
         duration: 60
       } //limits to one hundred hits per minute on a specific route
    }
  }
});

connection.register({
    register: hratelimit,
    options: rateOpts
  },
  function(err) {
    console.log(err);
  }
);
```

