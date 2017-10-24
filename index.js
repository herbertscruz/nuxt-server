const fs = require('fs');
const http = require('http');
const https = require('https');

function NuxtServer(Nuxt, Builder, nuxtConfig) {
  this._nuxt = Nuxt;
  this._builder = Builder;
  this._config = nuxtConfig;
}

NuxtServer.prototype.run = function () {
  const cert = this._config.cert || {};
  const certMode = (process.env.CERT_MODE || cert.mode || 'http').toLowerCase();

  if (!['http', 'https', 'http_https'].includes(certMode)) {
      console.error('ERROR: Cert mode only supports HTTP, HTTPS and HTTP_HTTPS.');
      process.exit(1);
  }

  let httpPort = process.env.HTTP_PORT;
  let httpsPort = process.env.HTTPS_PORT;
  let pathKey = process.env.PATH_KEY;
  let pathCert = process.env.PATH_CERT;

  if (cert.setup) {
      if (cert.setup.http) {
          if (cert.setup.http.port) {
              httpPort = cert.setup.http.port || 8080;
          }
      }
      if (cert.setup.https) {
          if (cert.setup.https.port) {
              httpsPort = cert.setup.https.port || 8443;
          }
      }
      if (cert.setup.https) {
          if (cert.setup.https.path) {
              pathKey = cert.setup.https.path.key;
              pathCert = cert.setup.https.path.cert;
          }
      }
  }

  httpPort = httpPort || 8080;
  httpsPort = httpsPort || 8443;

  // Create a new Nuxt instance
  const nuxt = new this._nuxt(this._config);
  // Enable live build & reloading on dev
  if (nuxt.options.dev) {
    const build = new this._builder(nuxt).build();
    build.catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }

  if (certMode === 'http_https') {
    if (httpPort === httpsPort) {
      console.error('ERROR: HTTP and https ports must be different.');
      process.exit(1);
    }
  }

  // Creating http services on express
  if (certMode === 'http' || certMode === 'http_https') {
    const httpServer = http.createServer(nuxt.render);
    httpServer.listen(httpPort);
    console.log(`Server listening on http://localhost:${httpPort}`);
  }

  // Creating https services on express
  if (certMode === 'https' || certMode === 'http_https') {
    if (!pathKey || !pathCert) {
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

module.exports = NuxtServer;

