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
    'Services.Waterline'
));

function redfishToolFactory(
    Promise, 
    assert, 
    _, 
    Logger, 
    waterline
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
        if (nodeId) {
            return waterline.nodes.needByIdentifier(nodeId)
            .then(function(node) {
                var obmSetting = _.find(node.obmSettings, { service: 'redfish-obm-service' });
                if (obmSetting) {
                    return obmSetting.config;
                } else {
                    throw new Error('Failed to find Redfish settings');
                }
            })
            .then(function(config) {
                self.settings = config;
            });
        }
    };
    
    /**
     * @function requireHttpLib
     * @description Return http library instance
     */     
    RedfishTool.prototype.requireHttpLib = function(protocol) {
        if (protocol !== 'http' && protocol !== 'https') {
            throw new Error('Unsupported HTTP Protocol: ' + protocol);
        }
        var http = require(protocol);
        return http;
    };
    
    /**
     * @function getAuthToken
     * @description Generate basic authentication token
     */    
    RedfishTool.prototype.getAuthToken = function (username, password) {
        var authToken;
        if (username && password) {
            var token = new Buffer(
                username + ':' + password
            ).toString('base64');
            authToken = 'Basic ' + token;
        }
        return authToken;
    };
    
    /**
     * @function request
     * @description promisified http(s) request method
     */     
    RedfishTool.prototype.request = Promise.method (function(options, protocol, data) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var httpLib = self.requireHttpLib(protocol);
            var request = httpLib.request(options, function(response) {
                response.setEncoding('utf8');
                var result = {
                    'httpVersion': response.httpVersion,
                    'httpStatusCode': response.statusCode,
                    'headers': response.headers,
                    'body': [],
                    'trailers': response.trailers
                };
                response.on('data', function(data) {
                    result.body.push(data);
                });
                response.on('end', function() {
                    resolve(result);
                });
            });

            request.on('error', function(error) {
                reject(error);
            });
            
            switch(options.method) {
            case 'POST':
            case 'PATCH':
            case 'PUT':
                request.write(data);
                break;
            default: 
                break;
            }
            request.end();
        });
    }); 
    
    /**
     * @function clientRequest
     * @description make request to HTTP client
     * @param path the URI path to send the request to
     * @param method the HTTP method: GET,POST,PUT,DELETE,PATCH. Default: GET
     * @param data the POST/PUT/PATCH data to write to the HTTP client
     */  
    RedfishTool.prototype.clientRequest = function (path, method, data) {
        var self = this;
        var protocol = self.settings.protocol || 'http';
        var options = {};
        var headers = {
            'Content-Type': 'application/json'
        };
        var authToken = self.getAuthToken(
            self.settings.username, 
            self.settings.password
        );
        if (authToken) {
            headers.Authorization = authToken;
        }
        data = data || '';
        var length = data.length;
        if (0 !== length) {       
            data = JSON.stringify(data);
            headers['Content-Length'] = Buffer.byteLength(data);
        }
        options.headers = headers;
        options.method = method || 'GET';
        options.host = self.settings.host;
        options.port = self.settings.port;
        options.path = path || self.settings.root || '/';
        options.rejectUnauthorized = self.settings.verifySSL;

        return self.request(options, protocol, data)
        .then(function(response) {
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
