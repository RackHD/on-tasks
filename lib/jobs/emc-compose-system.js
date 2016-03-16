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
     * @function setAllocatedState
     * @description Mark allocated state for provisioned endpoints
     */
    EmcComposeSystemJob.prototype.setAllocatedState = function(endpoints, id, state) {
        var self = this;
        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: 'Elements' 
        })
        .then(function(catalog) {
            if (catalog) {
                _.forEach(catalog.data, function(element) {
                    var elementName = element.Type + element.Id;
                    var match = _.first(_.filter(endpoints, function(endpoint) {
                        return endpoint === elementName;
                    }));
                    if (match) {
                        element.Allocated = { 
                            value: state, 
                            systemId: id
                        };
                    }
                });
                return waterline.catalogs.updateOne(
                    { id: catalog.id },
                    { data: catalog.data }
                );
            }
        });    
    };
    
    /**
     * @function getAllocatedState
     * @description Return current endpoints for systemId that match 
     *              the specified state
     */
    EmcComposeSystemJob.prototype.getAllocatedState = function(id, state) {
        var self = this;
        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: 'Elements' 
        })
        .then(function(catalog) {
            if (catalog) {
                var elements = _.filter(catalog.data, function(element) {
                    if (element.Allocated.systemId === id) {
                        return element.Allocated.value === state;
                    }
                });
                var endpoints = []; // construct endpoint by name
                _.forEach(elements, function(element) {
                    endpoints.push(element.Type + element.Id);
                });
                return endpoints;
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
        
        if (0 > _.indexOf(['compose','recompose','destroy'], self.action)) {
            throw new Error('Unknown Action Type: ' + self.action);
        }
        
        // Running in Chassis context so start at the root and get the Systems odata.id.
        return self.redfish.clientRequest(parse.pathname + '/')
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
        })
        .then(function() {
            return self.getAllocatedState(self.systemId, true);
        })
        .then(function(endpoints) {
            // Mark previously allocated endpoints as deallocated
            if (endpoints && endpoints.length > 0) {
                return self.setAllocatedState(endpoints, null, false);
            }
        })
        .then(function() {
            // Mark new endpoints as allocated
            return self.setAllocatedState(self.endpoints, self.systemId, true);
        });
    };
    
    return EmcComposeSystemJob;
}
