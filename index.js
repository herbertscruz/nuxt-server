var fs = require('fs');
var http = require('http');
var https = require('https');
var _ = require('lodash');
var chalk = require('chalk');

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

NuxtServer.prototype.run = function (callback) {
    var self = this;
    function result(cb) {
        try {
            var certMode = (process.env.CERT_MODE || self._config.cert.mode).toLowerCase();
            var httpPort = process.env.HTTP_PORT || self._config.cert.setup.http.port;
            var httpsPort = process.env.HTTPS_PORT || self._config.cert.setup.https.port;
            var pathKey = process.env.PATH_KEY || self._config.cert.setup.https.path.key;
            var pathCert = process.env.PATH_CERT || self._config.cert.setup.https.path.cert;
            var pathCa = _.compact(_.uniq(_.concat([process.env.PATH_CA] || self._config.cert.setup.https.path.ca)));
            var handshakeTimeout = self._config.cert.setup.https.handshakeTimeout;
            if (!_.isUndefined(process.env.HANDSHAKE_TIMEOUT)) {
                handshakeTimeout = parseInt(process.env.HANDSHAKE_TIMEOUT);
            }
            var requestCert = self._config.cert.setup.https.requestCert;
            if (!_.isUndefined(process.env.REQUEST_CERT)) {
                requestCert = (process.env.REQUEST_CERT === 'true');
            }
            var rejectUnauthorized = self._config.cert.setup.https.rejectUnauthorized;
            if (!_.isUndefined(process.env.REJECT_UNAUTHORIZED)) {
                rejectUnauthorized = (process.env.REJECT_UNAUTHORIZED === 'true');
            }

            //TRACE
            console.log('-- TRACE --');
            console.log('CERT_MODE', certMode);
            console.log('HTTP_PORT', httpPort);
            console.log('HTTPS_PORT', httpsPort);
            console.log('PATH_KEY', pathKey);
            console.log('PATH_CERT', pathCert);
            console.log('PATH_CA', pathCa);
            console.log('HANDSHAKE_TIMEOUT', handshakeTimeout);
            console.log('REQUEST_CERT', requestCert);
            console.log('REQUEST_CERT', requestCert);
            console.log('REJECT_UNAUTHORIZED', rejectUnauthorized);
            console.log('-- TRACE --');

            if (!['http', 'https', 'http_https'].includes(certMode)) {
                return cb(new Error('Cert mode only supports HTTP, HTTPS and HTTP_HTTPS.'));
            }
            if (certMode === 'http_https') {
                if (httpPort === httpsPort) {
                    return cb(new Error('HTTP and HTTPS ports must be different.'));
                }
            }
            if (certMode === 'https' || certMode === 'http_https') {
                if (!pathKey || !pathCert) {
                    return cb(new Error('ERROR: Set key and cert file paths.'));
                }
            }

            var promises = [];
            // Create a new Nuxt instance
            var nuxt = new self._nuxt(self._config);
            // Enable live build & reloading on dev
            if (nuxt.options.dev) {
                var build = new self._builder(nuxt).build();
                promises.push(build);
            }

            var psPromiseAll = Promise.all(promises);
            psPromiseAll.then(function() {
                try {
                    var ports = [];
                    // Creating http services on express
                    if (certMode === 'http' || certMode === 'http_https') {
                        var httpServer = http.createServer(nuxt.render);
                        httpServer.listen(httpPort);
                        ports.push(httpPort);
                    }
                    // Creating https services on express
                    if (certMode === 'https' || certMode === 'http_https') {
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
                        ports.push(httpsPort);
                    }
                    cb(null, ports);
                } catch (err) {
                    cb(err);
                }
            });
            psPromiseAll.catch(cb);
        } catch (err) {
            return cb(err);
        }
    }
    if (callback) return result(callback);
    return new Promise(function(resolve, reject) {
        result(function(err, data) {
            if (err) return reject(err);
            resolve(data);
        });
    });
};

module.exports = NuxtServer;
