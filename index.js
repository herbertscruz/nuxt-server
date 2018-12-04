const fs = require('fs');
const http = require('http');
const https = require('https');
const consola = require('consola')
const _ = require('lodash');

const logger = consola.withScope('nuxt-server')

module.exports = class NuxtServer {
    constructor(Nuxt, Builder, nuxtConfig) {
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

        this._nuxt = new Nuxt(this._config);
    }

    addServerMiddleware(m) {
        // Resolve
        const $m = m
        if (typeof m === 'string') {
            m = require(m)
        }

        if (typeof m.handler === 'string') {
            m.handler = require(m.handler)
        }

        const handler = m.handler || m
        const path = (
            (m.prefix ? m.prefix : '') +
            (typeof m.path === 'string' ? m.path : '')
        ).replace(/\/\//g, '/')

        handler.$m = $m

        // Use middleware
        if (_.isArray(handler)) {
            handler.forEach((h) => {
                this._nuxt.render.use(path, h)
                logger.info('Added middleware to ' + path);
            });
        } else {
            this._nuxt.render.use(path, handler)
            logger.info('Added middleware to ' + path);
        }
    }

    async _runnable() {
        try {
            const certMode = (process.env.CERT_MODE || this._config.cert.mode).toLowerCase();
            const httpPort = process.env.HTTP_PORT || this._config.cert.setup.http.port;
            const httpsPort = process.env.HTTPS_PORT || this._config.cert.setup.https.port;
            const pathKey = process.env.PATH_KEY || this._config.cert.setup.https.path.key;
            const pathCert = process.env.PATH_CERT || this._config.cert.setup.https.path.cert;
            const pathCa = _.compact(_.uniq(_.concat([process.env.PATH_CA] || this._config.cert.setup.https.path.ca)));
            const nuxt = this._nuxt;

            let handshakeTimeout = this._config.cert.setup.https.handshakeTimeout;
            if (!_.isUndefined(process.env.HANDSHAKE_TIMEOUT)) {
                handshakeTimeout = parseInt(process.env.HANDSHAKE_TIMEOUT);
            }

            let requestCert = this._config.cert.setup.https.requestCert;
            if (!_.isUndefined(process.env.REQUEST_CERT)) {
                requestCert = (process.env.REQUEST_CERT === 'true');
            }

            let rejectUnauthorized = this._config.cert.setup.https.rejectUnauthorized;
            if (!_.isUndefined(process.env.REJECT_UNAUTHORIZED)) {
                rejectUnauthorized = (process.env.REJECT_UNAUTHORIZED === 'true');
            }

            logger.info('CERT_MODE: ' + certMode);
            logger.info('HTTP_PORT: ' + httpPort);
            logger.info('HTTPS_PORT: ' + httpsPort);
            logger.info('PATH_KEY: ' + pathKey);
            logger.info('PATH_CERT: ' + pathCert);
            logger.info('PATH_CA: ' + pathCa);
            logger.info('HANDSHAKE_TIMEOUT: ' + handshakeTimeout);
            logger.info('REQUEST_CERT: ' + requestCert);
            logger.info('REJECT_UNAUTHORIZED: ' + rejectUnauthorized);

            if (!['http', 'https', 'http_https'].includes(certMode)) {
                this.error('Cert mode only supports HTTP, HTTPS and HTTP_HTTPS.')
            }

            if (certMode === 'http_https') {
                if (httpPort === httpsPort) {
                    this.error('HTTP and HTTPS ports must be different.');
                }
            }
            if (certMode === 'https' || certMode === 'http_https') {
                if (!pathKey || !pathCert) {
                    this.error('ERROR: Set key and cert file paths.');
                }
            }

            // Enable live build & reloading on dev
            if (nuxt.options.dev) {
                const server = new this._builder(nuxt);
                await server.build();
            }

            let ports = [];
            // Creating http services on express
            if (certMode === 'http' || certMode === 'http_https') {
                http.createServer(nuxt.render).listen(httpPort);
                ports.push(httpPort);
            }

            // Creating https services on express
            if (certMode === 'https' || certMode === 'http_https') {
                // HTTPS Server settings
                const privateKey  = fs.readFileSync(pathKey, 'utf8');
                const certificate = fs.readFileSync(pathCert, 'utf8');
                const ca = _.compact(_.map(pathCa, item => {
                    if (item) {
                        return fs.readFileSync(item, 'utf8');
                    }
                }));
                const options = {
                    key: privateKey,
                    cert: certificate,
                    ca: ca,
                    handshakeTimeout: handshakeTimeout,
                    requestCert: requestCert,
                    rejectUnauthorized: rejectUnauthorized,
                };
                https.createServer(options, nuxt.render).listen(httpsPort);
                ports.push(httpsPort);
            }

            logger.success('Server listening on ' + ports.join('|'));
        } catch (err) {
            this.error(err);
        }
    }

    run(callback) {
        if (!callback) return this._runnable();
        
        const result = this._runnable();
        result.then(data => callback(null, data));
        result.catch(callback);
    }

    error(e) {
        logger.error(e)
        throw new Error(e);
    }
}
