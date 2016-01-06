# hapi-ratelimiter

[![Build Status](https://travis-ci.org/cilindrox/hapi-ratelimiter.svg)](https://travis-ci.org/cilindrox/hapi-ratelimiter)

A simple IP based rate limiting plugin for Hapi using [Redis].

##Installation

```
npm install hapi-ratelimiter
```

## Usage

In the Hapi init code:

```javascript
const Hapi = require('hapi');
const Limiter = require('hapi-ratelimit');

const server = new Hapi.Server();
server.connection();

// Ratelimiter config

const options = {
    redis: process.env.REDIS_URL,  // Or any valid ioredis options
    namespace: 'clhr', // Namespace for redis keys
    global: {
        limit: 200,   // Set limit to -1 or leave out global to disable global limit
        duration: '30 minutes' 
    }
    // Global limit is not given priority over local limits
};

connection.register({ register: Limiter, options: options }, (err) => { 

    if (err) { 
        throw err;
    } 
});

connection.route({
    method: 'GET',
    path: '/someImportantRoute',
    handler: someHandler,
    config: {
        plugins: { // If you want to override the default values
            'hapi-ratelimit': {
                limit: 100, 
                duration: '1 hour'  // Any valid ms config (https://github.com/rauchg/ms.js)
            } // Limits to one hundred hits per minute on a specific route
        }
    }
});
```

## Credits

This module borrows heavily from [creativelive/hapi-ratelimit], so credit for original implementation goes there.
The rate-limiting logic in itself relies on [tj/node-ratelimiter], which is another awesome project.


[Redis]: https://github.com/luin/ioredis
[creativelive/hapi-ratelimit]: https://github.com/creativelive/hapi-ratelimit
[tj/node-ratelimiter]: https://github.com/tj/node-ratelimiter
