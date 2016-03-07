// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    redfish = require('redfish-node');

module.exports = redfishToolFactory;
di.annotate(redfishToolFactory, new di.Provide('JobUtils.RedfishTool'));
di.annotate(redfishToolFactory, new di.Inject('Promise', 'Assert', '_'));

function redfishToolFactory(Promise, assert, _) {
    function RedfishTool() {
        this.savedTLSEnv = this.getTLSEnv();
    }
    
    /**
     * @function setTLSEnv
     * @param value the env value to set
     * @description Workaround to set global TLS verify, since there is no way 
     *              to pass this through to the client
     */
    RedfishTool.prototype.setTLSEnv = function (value) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = value;
    };
    
     /**
     * @function getTLSEnv
     * @description Read the current TLS reject env value
     */   
    RedfishTool.prototype.getTLSEnv = function () {
        return process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    };
    
    /**
     * @function clientInit
     * @param settings takes OBM settings from node and initializes a new
     *                 Redfish API client
     * @description initiate redfish chassis discovery
     * @return apiClient object
     */
    RedfishTool.prototype.clientInit = function (settings) {
        var self = this;
        assert.object(settings, 'Client OBM Settings');
        
        return Promise.resolve(new redfish.ApiClient())
        .then(function(apiClient) {
            apiClient.basePath = settings.uri.replace(/\/+$/, '');
            if (settings.username && settings.password) {
                var token = new Buffer(
                    settings.username + ':' + settings.password
                ).toString('base64');
                apiClient.defaultHeaders.Authorization = 'Basic ' + token;
            }
            
            if (settings.verifySSL === true) {
                apiClient.verifySSL = "1";
            } else {
                apiClient.verifySSL = "0"; // default disabled
            }
            
            self.setTLSEnv(apiClient.verifySSL);
            return Promise.promisifyAll(
                new redfish.RedfishvApi(apiClient)
            );
        });
    };
    
    /**
     * @function clientDone
     * @description cleanup client
     */
    RedfishTool.prototype.clientDone = function () {
        if (_.isUndefined(this.savedTLSEnv)) {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
            this.setTLSEnv(this.savedTLSEnv);
        }
    };
    
    return new RedfishTool();

}
