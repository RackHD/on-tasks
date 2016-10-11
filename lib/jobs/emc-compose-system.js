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
    'JobUtils.RedfishTool',
    'Job.Redfish.Discovery'
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
    RedfishTool,
    RedfishDiscovery
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
            return matches;
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
            return res.body;
        });
    };
    
    /**
     * @function updateSystemResources
     * @description Update/create endpoint relations for composed system (compute node type)
     */
    EmcComposeSystemJob.prototype.updateSystemResources = function() {
        var self = this;
        var systems, rootService;
        var discovery = new RedfishDiscovery(
            self.redfish.settings,
            self.context,
            self.taskId
        );
        
        return discovery.getRoot()
        .then(function(root) {
            rootService = root;
            return discovery.createSystems(rootService);
        })
        .then(function(nodes) {
            systems = nodes;
            assert.ok(Array.isArray(systems), 'System Resources');
            return discovery.createChassis(rootService); 
        })
        .then(function(chassis) {
            self.context.chassis = _.map(chassis, function(it) {
                return _.get(it, 'id');
            });
            self.context.systems = _.map(systems, function(it) {
                return _.get(it, 'id');
            });
            return waterline.nodes.findByIdentifier(self.systemId)
            .then(function(node) {
                if(node) {
                    _.remove(node.relations, function(r) {
                        return r.relationType === 'elementEndpoints';
                    });
                    var relation = { 
                        relationType: 'elementEndpoints',
                        targets: self.endpoints 
                    };
                    node.relations.push(relation);
                    return discovery.upsertRelations({id: node.id}, node.relations);  
                } else {
                    return;
                }           
            })
            .then(function() {
                return waterline.nodes.findOne(self.nodeId);
            });
        })
        .then(function(chassis) {
            assert.object(chassis, 'Chassis Resource for ' + self.systemId);
            return Promise.all([
                discovery.mapPathToIdRelation(chassis, systems, 'encloses'),
                discovery.mapPathToIdRelation(systems, chassis, 'enclosedBy')
            ]);
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
        .then(function(system) {
            var id = _.get(system, 'Id');
            if (self.systemId === id) {
                throw new Error(
                    'System Id Already Allocated: ' + id
                );
            }
            return self.checkEndPointResource(rootPath);
        })
        .then(function(endpoints) {
            if (endpoints && endpoints.length) {
                throw new Error(
                    'EndPoint Resource(s) Already Allocated: ' + endpoints.toString()
                );
            }
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
                return self.redfish.clientRequest(id + '/' + self.systemId, 'DELETE')
                .then(function() {
                    return waterline.nodes.destroyByIdentifier(self.systemId);
                });
            }
            
            // Build up the System composition data
            var data = { 
                Id: self.systemId,
                Oem: { Emc: { EndPoints: [] } }
            };
            
            assert.object(self.endpoints, 'Missing Required Endpoints');
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
            return self.redfish.clientRequest(id, method, data);
        })
        .then(function() {
            return self.updateSystemResources(rootPath);
        });
    };
    
    return EmcComposeSystemJob;
}
