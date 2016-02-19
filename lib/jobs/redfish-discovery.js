// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
var redfish = require('redfish-node');

module.exports = RedfishDiscoveryJobFactory;
di.annotate(RedfishDiscoveryJobFactory, new di.Provide('Job.Redfish.Discovery'));
di.annotate(RedfishDiscoveryJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        'Services.Waterline',
        'Services.Encryption',
        '_'
    )
);
function RedfishDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _
) {
    var logger = Logger.initialize(RedfishDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function RedfishDiscoveryJob(options, context, taskId) {
        RedfishDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.object(this.options);
        assert.string(this.options.uri);
        this.settings = {
            uri: this.options.uri,
            username: this.options.username,
            password: this.options.password
        };
        
        var apiClient = new redfish.ApiClient();
        apiClient.basePath = this.settings.uri.replace(/\/+$/, '');
        
        // setup basic authorization
        if (!_.isUndefined(this.settings.username) && 
            !_.isUndefined(this.settings.password)) {
            var token = new Buffer(
                this.settings.username + ':' + this.settings.password
            ).toString('base64');
            apiClient.defaultHeaders.Authorization = 'Basic ' + token;
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // (jl) need a ssl_verify option here.
        }
        this.redfishApi = Promise.promisifyAll(new redfish.RedfishvApi(apiClient));
    }
    util.inherits(RedfishDiscoveryJob, BaseJob);

    /**
     * @memberOf RedfishDiscoveryJob
     */
    RedfishDiscoveryJob.prototype._run = function() {
        var self = this;
        return Promise.resolve()
        .then(function() {
            return self.createChassis();
        })
        .then(function() {
            return self.createSystems();
        })
        .catch(function(err) {
            throw err;
        });
    };
    
    /**
     * @function createChassis
     * @description initiate redfish chassis discovery
     */
    RedfishDiscoveryJob.prototype.createChassis = function () {
        var self = this;
        return self.redfishApi.listChassisAsync()
        .then(function(res) {
            assert.object(res);
            return res[1].body.Members;
        })
        .map(function(member) {
            var id = member['@odata.id']
                .split('Chassis/')[1].split(/\/+$/)[0]; // trim slash
                
            assert.string(id);
            return self.redfishApi.getChassisAsync(id)
            .catch(function(err) {
                throw new Error(err.response.text);
            });
        })
        .map(function(chassis) {
            chassis = chassis[1].body;
            var systems = _.get(chassis, 'Links.ComputerSystems') ||
                          _.get(chassis, 'links.ComputerSystems');
            
            if (_.isUndefined(systems)) {
                return Promise.reject(
                    new Error('failed to find System members for Chassis')
                );
            }
                          
            return Promise.resolve({
                chassis: chassis, 
                systems: systems
            });
        })
        .map(function(data) {
            assert.object(data);
            var targetList = [];
            
            _.forEach(data.systems, function(sys) {
                var target = _.get(sys, '@odata.id') ||
                             _.get(sys, 'href');
                targetList.push(target);
            });
            
            return waterline.nodes.findOrCreate({
                type: 'enclosure',
                name: data.chassis.Name,
                obmSettings: [{
                    config: self.settings,
                    service: 'redfish-obm-service'
                }],
                relations: [{
                    relationType: 'encloses',
                    targets: targetList
                }]
            });
        });
    };
    
    /**
     * @function createSystems
     * @description initiate redfish system discovery
     */
    RedfishDiscoveryJob.prototype.createSystems = function () {
        var self = this;   
        return self.redfishApi.listSystemsAsync()
        .then(function(res) {
            assert.object(res);
            return res[1].body.Members;
        })
        .map(function(member) {
            var id = member['@odata.id']
                .split('Systems/')[1].split(/\/+$/)[0]; // trim slash
            assert.string(id);
            return self.redfishApi.getSystemAsync(id)
            .catch(function(err) {
                throw new Error(err.response.text);
            });
        })
        .map(function(system) {
            system = system[1].body;
            var chassis = _.get(system, 'Links.Chassis') || 
                          _.get(system, 'links.Chassis');
            
            if (_.isUndefined(chassis)) {
                return Promise.reject(
                    new Error('failed to find Chassis members for Systems')
                );
            }
            
            return Promise.resolve({
                system: system, 
                chassis: chassis
            });
        })
        .map(function(data) {
            assert.object(data);
            var targetList = [];
            
            _.forEach(data.chassis, function(chassis) { 
                var target = _.get(chassis, '@odata.id') ||
                             _.get(chassis, 'href');
                targetList.push(target);
            });
                        
            return waterline.nodes.findOrCreate({
                type: 'compute',
                name: data.system.Name,
                obmSettings: [{
                    config: self.settings,
                    service: 'redfish-obm-service'
                }],
                relations: [{
                    relationType: 'enclosedBy',
                    targets: targetList
                }]
            });
        });
    };
    
    return RedfishDiscoveryJob;
}
