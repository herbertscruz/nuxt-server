# What is nuxt-server?
It is HTTP and HTTPS server for nuxt.

## Setup

### nuxt.config.js
```js
// ... code ...
cert: {
  mode: 'http', // HTTP (default), HTTPS, HTTP_HTTPS
  setup: {
    http: {
      port: 8080 // default
    },
    https: {
      port: 8443,// default
      path: {
        key: './path/to/file/example.key', // Path to the certificate key
        cert: './path/to/file/example.crt', // Path to the certificate
        ca: ['./path/to/file/example.txt'] // Path to the certificate
      },
      handshakeTimeout: 120,
      requestCert: false,
      rejectUnauthorized: true
    }
  }
}
```
OU 

```sh
export CERT_MODE=http
export HTTP_PORT=8080
export HTTPS_PORT=8443
export PATH_KEY=./path/to/file/example.key
export PATH_CERT=./path/to/file/example.crt
export PATH_CA=./path/to/file/example.txt
export HANDSHAKE_TIMEOUT=120
export REQUEST_CERT=false
export REJECT_UNAUTHORIZED=true
```

### server.js
```js
// Require `Nuxt` And `Builder` modules
const {Nuxt, Builder} = require('nuxt');

const NuxtServer = require('nuxt-server');
// Require Nuxt config
const config = require('../nuxt.config.js');

const server = new NuxtServer(Nuxt, Builder, config);
server.run();
```

### package.json
```js
"scripts": {
  // ... code ...
  "start": "node server.js"
},
```