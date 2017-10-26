var fs = require('fs');
var http = require('http');
var https = require('https');
var _ = require('lodash');

function NuxtServer(Nuxt, Builder, nuxtConfig) {
    this._nuxt = Nuxt;
    this._builder = Builder;
    this._config = _.merge(nuxtConfig, {
        cert: {
            mode: 'http',
            setup: {
                http: {
                    port: 8080
                },
                https: {
                    port: 8443,
                    path: {
                        key: null,
                        cert: null,
                        ca: []
                    },
                    handshakeTimeout: 120,
                    requestCert: false,
                    rejectUnauthorized: true,
                }
            }
        }
    });
}

NuxtServer.prototype.run = function () {
    var certMode = (process.env.CERT_MODE || this._config.cert.mode).toLowerCase();
    var httpPort = process.env.HTTP_PORT || this._config.cert.setup.http.port;
    var httpsPort = process.env.HTTPS_PORT || this._config.cert.setup.https.port;
    var pathKey = process.env.PATH_KEY || this._config.cert.setup.https.path.key;
    var pathCert = process.env.PATH_CERT || this._config.cert.setup.https.path.cert;
    var pathCa = _.uniq(_.concat([process.env.PATH_CA] || this._config.cert.setup.https.path.ca));
    var handshakeTimeout = this._config.cert.setup.https.handshakeTimeout;
    if (!_.isUndefined(process.env.HANDSHAKE_TIMEOUT)) {
        handshakeTimeout = parseInt(process.env.HANDSHAKE_TIMEOUT);
    }
    var requestCert = this._config.cert.setup.https.requestCert;
    if (!_.isUndefined(process.env.REQUEST_CERT)) {
        requestCert = (process.env.REQUEST_CERT === 'true');
    }
    var rejectUnauthorized = this._config.cert.setup.https.rejectUnauthorized;
    if (!_.isUndefined(process.env.REJECT_UNAUTHORIZED)) {
        rejectUnauthorized = (process.env.REJECT_UNAUTHORIZED === 'true');
    }
    if (!['http', 'https', 'http_https'].includes(certMode)) {
        console.error('ERROR: Cert mode only supports HTTP, HTTPS and HTTP_HTTPS.');
        process.exit(1);
    }
    // Create a new Nuxt instance
    var nuxt = new this._nuxt(this._config);
    // Enable live build & reloading on dev
    if (nuxt.options.dev) {
        var build = new this._builder(nuxt).build();
        build.catch(function(error) {
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
        var httpServer = http.createServer(nuxt.render);
        httpServer.listen(httpPort);
        console.log('Server listening on http://localhost:' + httpPort);
    }
    // Creating https services on express
    if (certMode === 'https' || certMode === 'http_https') {
        if (!pathKey || !pathCert) {
            console.error('ERROR: Set key and cert file paths.');
            process.exit(1);
        }
        // HTTPS Server settings
        var privateKey  = fs.readFileSync(pathKey, 'utf8');
        var certificate = fs.readFileSync(pathCert, 'utf8');
        var ca = _.compact(_.map(pathCa, function(item) {
            if (item) {
                return fs.readFileSync(item, 'utf8');
            }
        }));
        var options = {
            key: privateKey,
            cert: certificate,
            ca: ca,
            handshakeTimeout: handshakeTimeout,
            requestCert: requestCert,
            rejectUnauthorized: rejectUnauthorized,
        };
        var httpsServer = https.createServer(options, nuxt.render);
        httpsServer.listen(httpsPort);
        console.log('Server listening on https://localhost:' + httpsPort);
    }
};

module.exports = NuxtServer;
