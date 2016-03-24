// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');
    
module.exports = EmcComposeSystemJobFactory;
di.annotate(EmcComposeSystemJobFactory, new di.Provide('Job.Emc.Compose.System'));
di.annotate(EmcComposeSystemJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.RedfishTool'
));

function EmcComposeSystemJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    RedfishTool
) {
    var logger = Logger.initialize(EmcComposeSystemJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function EmcComposeSystemJob(options, context, taskId) {
        EmcComposeSystemJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        assert.string(this.context.target);
        assert.string(options.name);
        assert.object(options.endpoints);
        assert.string(options.action);
        
        this.nodeId = this.context.target;
        this.redfish = new RedfishTool();
        this.redfish.setup(this.nodeId);
        this.endpoints = options.endpoints || [];
        this.systemId = options.name;
        this.action = options.action;
    }
    
    util.inherits(EmcComposeSystemJob, BaseJob);

    /**
     * @memberOf EmcComposeSystemJob
     */
    EmcComposeSystemJob.prototype._run = function() {
        var self = this;
        return self.composeSystem()
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };
        
    /**
     * @function checkEndPoints
     * @description Return currently allocated endpoint resources
     */
    EmcComposeSystemJob.prototype.checkEndPointResource = function(rootPath) {
        var self = this;
        
        if (self.action !== 'compose') {
            return;
        }
        return self.redfish.clientRequest(rootPath)
        .then(function(res) {
            assert.object(res.body);
            return _.get(res.body, 'Systems');
        })
        .then(function(system) {
            return self.redfish.clientRequest(system['@odata.id']);
        })
        .then(function(res) {
            assert.object(res.body);
            return _.get(res.body, 'Members'); 
        })
        .map(function(member) {
            assert.object(member);
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body);
            var elements = _.get(res.body, 'Oem.Emc.EndPoints');
            var matches = [];
            _.forEach(elements, function(element) {
                var match = _.filter(self.endpoints, function(endpoint) {
                    return element.EndPointName === endpoint;
                });
                if (match) {
                    matches.push(match);
                }
            });
            return matches;
        })
        .then(function(matches) {
            matches = _.flattenDeep(matches);
            if (matches && matches.length) {
                throw new Error(
                    'EndPoint Resource(s) Already Allocated: ' + matches.toString()
                );
            }
        });
    };
    
        /**
     * @function checkSystemResource
     * @description Return currently existing system resources
     */
    EmcComposeSystemJob.prototype.checkSystemResource = function(rootPath) {
        var self = this;
        
        if (self.action !== 'compose') {
            return;
        }
        return self.redfish.clientRequest(rootPath)
        .then(function(res) {
            assert.object(res.body);
            return _.get(res.body, 'Systems');
        })
        .then(function(system) {
            return self.redfish.clientRequest(system['@odata.id']);
        })
        .then(function(res) {
            assert.object(res.body);
            return _.get(res.body, 'Members'); 
        })
        .map(function(member) {
            assert.object(member);
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            var id = _.get(res.body, 'Id');
            if (self.systemId === id) {
                throw new Error(
                    'System Id Already Allocated: ' + id
                );
            }
        });
    };
      
    /**
     * @function composeSystem
     * @description Compose a logical server using specified Elements
     */
    EmcComposeSystemJob.prototype.composeSystem = function() {
        var self = this;
        var parse = urlParse(self.redfish.settings.uri);
        var rootPath = parse.pathname + '/';
        
        if (0 > _.indexOf(['compose','recompose','destroy'], self.action)) {
            return Promise.reject(
                new Error('Unknown Action Type: ' + self.action)
            );
        }
        
        // Running in Chassis context so start at the root and get the Systems odata.id.
        return Promise.resolve()
        .then(function() {
            return self.checkSystemResource(rootPath);
        })
        .then(function() {
            return self.checkEndPointResource(rootPath);
        })
        .then(function() {
            return self.redfish.clientRequest(rootPath);
        })
        .then(function(res) {
            assert.object(res, 'Root Resource');
            if (!_.has(res.body, 'Oem.Emc.FabricService')) {
                throw new Error('Missing Emc FabricService');
            }
            return _.get(res.body, 'Systems');
        })
        .then(function(systems) {
            assert.object(systems, 'Systems Resource');
            var id = systems['@odata.id'];
            
            if (self.action === 'destroy') {
                return self.redfish.clientRequest(id + '/' + self.systemId, 'DELETE');
            }
            
            // Build up the System composition data
            var data = { 
                Id: self.systemId,
                Oem: { Emc: { EndPoints: [] } }
            };
            _.forEach(self.endpoints, function(endpoint) {
                data.Oem.Emc.EndPoints.push({ 
                    EndPointName: endpoint 
                }); 
            });
            logger.debug('Composed System Data', {
                data: data
            });
            
            var method = 'POST';
            if (self.action === 'recompose') {
                id = id + '/' + self.systemId;
                method = 'PATCH';
                delete data.Id;                
            }
            return self.redfish.clientRequest(
                id, 
                method, 
                data
            );
        });
    };
    
    return EmcComposeSystemJob;
}
