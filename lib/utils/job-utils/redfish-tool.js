// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
    
module.exports = redfishToolFactory;
di.annotate(redfishToolFactory, new di.Provide('JobUtils.RedfishTool'));
di.annotate(redfishToolFactory, new di.Inject(
    'Promise', 
    'Assert', 
    '_', 
    'Logger', 
    'Services.Waterline',
    'JobUtils.HttpTool',
    'Errors'
));

function redfishToolFactory(
    Promise, 
    assert, 
    _, 
    Logger, 
    waterline,
    HttpTool,
    Errors
) {
    function RedfishTool() {
        this.settings = {};
    }
    
    var logger = Logger.initialize(redfishToolFactory);
    
    /**
     * @function setup
     * @description return new redfish tool for provided node Id.
     */
    RedfishTool.prototype.setup = function(nodeId) {
        var self = this;
        if (!nodeId) {
            return Promise.resolve();
        }

        return waterline.obms.findByNode(nodeId, 'redfish-obm-service')
        .then(function(obm) {
            if (!obm) { throw new Errors.NotFoundError('Failed to find Redfish settings'); }
            self.settings = obm.config;
        });
    };

    /**
     * @function clientRequest
     * @description make request to HTTP client
     * @param path the URI path to send the request to
     * @param method the HTTP method: GET,POST,PUT,DELETE,PATCH. Default: GET
     * @param data the POST/PUT/PATCH data to write to the HTTP client
     */  

    RedfishTool.prototype.clientRequest = function(path, method, data) {
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

    return RedfishTool;
}
