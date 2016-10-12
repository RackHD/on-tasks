// Copyright 2016, Dell, Inc.

'use strict';

var di = require('di');
    
module.exports = wsmanToolFactory;
di.annotate(wsmanToolFactory, new di.Provide('JobUtils.WsmanTool'));
di.annotate(wsmanToolFactory, new di.Inject('Promise', '_', 'Logger', 'JobUtils.HttpTool'));

function wsmanToolFactory(Promise, _, Logger, HttpTool) {
    function WsmanTool() {
        this.settings = {};
    }
    
    var logger = Logger.initialize(wsmanToolFactory);
    
    /**
     * @function clientRequest
     * @description make request to HTTP client
     * @param path the URI path to send the request to
     * @param method the HTTP method: GET,POST,PUT,DELETE,PATCH. Default: GET
     * @param data the POST/PUT/PATCH data to write to the HTTP client
     */  

    WsmanTool.prototype.clientRequest = function(path, method, data) {
        var self = this;
        var setups = {};

        setups.url = {};
        setups.url.protocol = self.settings.protocol || 'http';
        setups.url.host = self.settings.host;
        setups.url.port = self.settings.port;
        setups.url.path = path || self.settings.root || '/';

        setups.method = method || 'GET';
        setups.credential = {};
        setups.verifySSl = self.settings.verifySSl || false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = self.settings.recvTimeoutMs;
        setups.data = data || '';
        
        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                logger.error('HTTP Error', response);
                var errorMsg = _.get(response, 'body.error.message', 'Unknown Error');
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
