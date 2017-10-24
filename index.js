// cert: {
//   mode: 'https',
//     setup: {
//     http: {
//       port: 8080,
//     },
//     https: {
//       port: 8443,
//         path: {
//         key: './server/private/apache.key',
//           cert: './server/private/apache.crt'
//       },
//     },
//   },
// },
const fs = require('fs');
const http = require('http');
const https = require('https');
// Require `Nuxt` And `Builder` modules
const {Nuxt, Builder} = require('nuxt');

module.exports = function(nuxtConfig) {
  const cert = nuxtConfig.cert || {};
  const certMode = process.env.CERT_MODE || cert.mode || 'http';
  let httpPort = process.env.HTTP_PORT || 8080;
  let httpsPort = process.env.HTTPS_PORT || 8443;
  let pathKey = process.env.PATH_KEY;
  let pathCert = process.env.PATH_CERT;

  if (cert.setup) {
    if (cert.setup.http) {
      if (cert.setup.http.port) {
        httpPort = cert.setup.http.port;
      }
    }
    if (cert.setup.https) {
      if (cert.setup.https.port) {
        httpPort = cert.setup.https.port;
      }
    }
    if (cert.setup.https) {
      if (cert.setup.https.path) {
        pathKey = cert.setup.https.path.key;
        pathCert = cert.setup.https.path.key;
      }
    }
  }

  // Create a new Nuxt instance
  const nuxt = new Nuxt(nuxtConfig);
  // Enable live build & reloading on dev
  if (nuxt.options.dev) {
    const build = new Builder(nuxt).build();
    build.catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }

  if (certMode.toLowerCase() === 'http_https') {
    if (httpPort === httpsPort) {
      console.error('ERROR: HTTP and https ports must be different.');
      process.exit(1);
    }
  }

  // Creating http services on express
  if (certMode.toLowerCase() === 'http' || certMode.toLowerCase() === 'http_https') {
    const httpServer = http.createServer(nuxt.render);
    httpServer.listen(httpPort);
    console.log(`Server listening on http://localhost:${httpPort}`);
  }

  // Creating https services on express
  if (certMode.toLowerCase() === 'https' || certMode.toLowerCase() === 'http_https') {
    if (!pathKey || pathCert) {
      console.error('ERROR: Set key and cert file paths.');
      process.exit(1);
    }
    // HTTPS Server settings
    const privateKey  = fs.readFileSync(pathKey, 'utf8');
    const certificate = fs.readFileSync(pathCert, 'utf8');
    const credentials = {key: privateKey, cert: certificate};

    const httpsServer = https.createServer(credentials, nuxt.render);
    httpsServer.listen(httpsPort);
    console.log(`Server listening on https://localhost:${httpsPort}`);
  }
};

