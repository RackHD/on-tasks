// Copyright 2016, Dell, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = wsmanToolFactory;
di.annotate(wsmanToolFactory, new di.Provide('JobUtils.WsmanTool'));
di.annotate(wsmanToolFactory, new di.Inject(
    'Promise',
    '_',
    'Assert',
    'Logger',
    'HttpTool'
));

function wsmanToolFactory(
    Promise,
    _,
    assert,
    Logger,
    HttpTool
) {
    var logger = Logger.initialize(wsmanToolFactory);

    function WsmanTool(url, options) {
        assert.string(url);
        options = options || {};

        var parsed = urlParse(url);
        this.settings = {
            host: parsed.host.split(':')[0],
            path: parsed.pathname,
            port: parsed.port,
            protocol: parsed.protocol.replace(':','').trim(),
            verifySSL: options.verifySSL,
            recvTimeoutMs: options.recvTimeoutMs
        };
    }

    /**
     * @function clientRequest
     * @description make request to HTTP client
     * @param path the URI path to send the request to
     * @param method the HTTP method: GET,POST,PUT,DELETE,PATCH. Default: GET
     * @param data the POST/PUT/PATCH data to write to the HTTP client
     * @param defaultErrMsg the default Error message
     */

    WsmanTool.prototype.clientRequest = function(path, method, data, defaultErrMsg) {
        var self = this;
        var httpSettings = {
            url: {
                protocol: self.settings.protocol || 'http',
                host:  self.settings.host,
                port:  self.settings.port,
                path: path || self.settings.path || '/'
            },
            method: method || 'GET',
            credential: {},
            verifySSL: self.settings.verifySSL || false,
            headers: {'Content-Type': 'application/json'},
            recvTimeoutMs: self.settings.recvTimeoutMs || 30000,
            data: data || ''
        };

        defaultErrMsg = defaultErrMsg || 'Unknown Error';

        var http = new HttpTool();

        return http.setupRequest(httpSettings)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                logger.error('HTTP Error', response);
                var errorMsg = _.get(response, 'body.error.message', defaultErrMsg);
                throw new Error(errorMsg);
            }

            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response;
        });
    };

    return WsmanTool;
}
