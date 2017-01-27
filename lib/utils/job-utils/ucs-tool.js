// Copyright 2017, EMC, Inc.

'use strict';

var di = require('di');
    
module.exports = ucsToolFactory;
di.annotate(ucsToolFactory, new di.Provide('JobUtils.UcsTool'));
di.annotate(ucsToolFactory, new di.Inject(
    'Promise', 
    'Assert', 
    '_', 
    'Logger', 
    'Services.Waterline',
    'JobUtils.HttpTool',
    'Errors',
    'Util'
));

function ucsToolFactory(
    Promise, 
    assert, 
    _, 
    Logger, 
    waterline,
    HttpTool,
    Errors,
    util
) {
    function UcsTool() {
        this.settings = {};
    }
    
    var logger = Logger.initialize(ucsToolFactory);

    function UcsError(message) {
        Errors.BaseError.call(this, message);
        Error.captureStackTrace(this, UcsError);
    }
    util.inherits(UcsError, Error);
    /**
     * @function clientRequest
     * @description make request to HTTP client
     * @param path the URI path to send the request to
     * @param method the HTTP method: GET,POST,PUT,DELETE,PATCH. Default: GET
     * @param data the POST/PUT/PATCH data to write to the HTTP client
     */

    /**
     * @function setup
     * @description return new ucs tool for provided node Id.
     */
    UcsTool.prototype.setup = function(nodeId) {
        var self = this;
        if (!nodeId) {
            return Promise.resolve();
        }

        return waterline.obms.findByNode(nodeId, 'ucs-obm-service', true)
            .then(function(obm) {
                if (!obm) { throw new Errors.NotFoundError('Failed to find UCS settings'); }
                self.settings = obm.config;
            });
    };

    UcsTool.prototype.clientRequest = function(path, method, data) {
        var self = this;
        var setups = {};

        setups.url = {};
        setups.url.protocol = self.settings.protocol || 'http';
        setups.url.host = self.settings.host;
        setups.url.port = self.settings.port;
        setups.url.path = path || self.settings.root || '/';

        setups.method = method || 'GET';
        setups.credential = {username: self.settings.username, 
            password: self.settings.password};
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
            if (response.httpStatusCode > 299) {
                logger.error('HTTP Error', response);
                throw new UcsError(response.body);
            }
            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response;
        });
    };

    return UcsTool;
}
