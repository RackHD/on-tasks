// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = RedfishDiscoveryListJobFactory;
di.annotate(RedfishDiscoveryListJobFactory, new di.Provide('Job.Redfish.Discovery.List'));
di.annotate(RedfishDiscoveryListJobFactory, new di.Inject(
    'Protocol.Events',
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

function RedfishDiscoveryListJobFactory(
    eventsProtocol,
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
    var logger = Logger.initialize(RedfishDiscoveryListJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function RedfishDiscoveryListJob(options, context, taskId) {
        RedfishDiscoveryListJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.endpointList = this.context.discoverList;
        this.redfish = new RedfishTool();
    }

    util.inherits(RedfishDiscoveryListJob, BaseJob);

    /**
     * @memberOf RedfishDiscoveryListJob
     */
    RedfishDiscoveryListJob.prototype._run = function() {
        var self = this;

        return Promise.each(self.endpointList, function(endpoint) {
            logger.debug("attempting to discover: " + endpoint.uri);
            return self.discoverList(endpoint);
        })
        .then(function() {
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };


    RedfishDiscoveryListJob.prototype.discoverList = function (endpoint) {
        var self = this;

        assert.object(endpoint);
        assert.string(endpoint.uri);
        var parse = urlParse(endpoint.uri);
        var protocol = parse.protocol.replace(':', '').trim();
        self.settings = {
            uri: parse.href,
            host: parse.host.split(':')[0],
            root: parse.pathname + '/',
            port: parse.port,
            protocol: protocol,
            username: endpoint.username,
            password: endpoint.password,
            verifySSL: false
        };
        self.redfish.settings = self.settings;

        return self.getRoot()
            .then(function (root) {
                return [root, self.createSystems(root)];

            })
            .spread(function (root, systems) {

                return [root, systems, self.createChassis(root)];

            })
            .spread(function (root, systems, chassis) {

                return [root, systems, chassis, self.createManagers(root)];

            })
            .spread(function (root, systems, chassis, managers) {
                chassis = chassis.filter(function(data) {return !(_.isNull(data) || _.isUndefined(data));});

                var cooling = self.createRedfishNode(root, 'DCIMCooling',
                    ['CRAH', 'CRAC', 'AirHandlingUnit', 'Chiller', 'CoolingTower'], 'cooling');
                var power = self.createRedfishNode(root, 'DCIMPower',
                    ['Generator', 'TransferSwitch', 'PDU', 'Rectifier',
                        'UPS', 'RackPDU', 'Transformer', 'Switchgear', 'VFD'],
                    'power');
                var network;
                if (_.has(root, 'NetworkDevices')) {
                    network = self.createNetwork(root);
                } else {
                    network = [];
                }
                return [root, chassis, systems, managers, cooling, power, network];
            })
            .spread(function (root, chassis, systems, managers, cooling, power, networks) {
                self.context.chassis = (self.context.chassis || []).concat(_.map(chassis, function (it) {
                    return _.get(it, 'id');
                }));
                self.context.systems = (self.context.systems || []).concat(_.map(systems, function (it) {
                    return _.get(it, 'id');
                }));
                self.context.managers = (self.context.managers || []).concat(_.map(managers, function (it) {
                    return _.get(it, 'id');
                }));

                if (cooling) {
                    _.forEach(cooling[0], function (coolingType) {
                        self.context.cooling = (self.context.cooling || []).concat(_.map(coolingType,
                            function (it) {
                            return _.get(it, 'id');
                        }));
                    });
                }
                if (power) {
                    _.forEach(power[0], function (powerType) {
                        self.context.power = (self.context.power || []).concat(_.map(powerType, function (it) {
                            return _.get(it, 'id');
                        }));
                    });
                }
                self.context.networks = (self.context.networks || []).concat(_.map(networks, function (it) {
                    return _.get(it, 'id');
                }));

                systems = Array.isArray(systems) ? systems : [systems];
                return [root, Promise.all([
                    self.mapPathToIdRelation(chassis, systems.concat(networks), 'encloses'),
                    self.mapPathToIdRelation(systems, chassis, 'enclosedBy'),
                    self.mapPathToIdRelation(networks, chassis, 'enclosedBy'),
                    self.mapPathToIdRelation(managers, chassis.concat(systems), 'manages'),
                    self.mapPathToIdRelation(systems, managers, 'managedBy'),
                    self.mapPathToIdRelation(chassis, managers, 'managedBy')
                ])];
            });
    };

    RedfishDiscoveryListJob.prototype.upsertRelations = function(node, relations) {
        //todo fix this hack to allow mulitple nodes to be created
        var lookup;
        if ( 'identifiers' in node )
        {
            lookup = { identifiers: node.identifiers[1] };
        }
        else
        {
            lookup = node;
        }
        // Update existing node with new relations or create one
        return waterline.nodes.needOne(lookup)
        .then(function(curNode) {
            relations = _.uniq(relations.concat(curNode.relations), 'relationType');
            return waterline.nodes.updateOne(
                { id: curNode.id },
                { relations: relations }
            )
            .then(function(node){
                eventsProtocol.publishNodeEvent(node, 'updated');
                return node;
            });
        })
        .catch(function(error) {
            if (error.name === 'NotFoundError') {
                node.relations = relations;
                return waterline.nodes.create(node)
                .then(function(node){
                    eventsProtocol.publishNodeEvent(node, 'discovered');
                    return node;
                });
            }
            throw error;
        });
    };

    /**
     * @function getRoot
     */
    RedfishDiscoveryListJob.prototype.getRoot = function () {
        return this.redfish.clientRequest()
        .then(function(response) {
            return response.body;
        });
    };

    /**
     * @function createRedfishNode
     * @description initiate redfish discovery
     */
    RedfishDiscoveryListJob.prototype.createRedfishNode = function (
        root,
        resourceName,
        resourceTypes,
        nodeType) {
        var self = this;
        if (!_.has(root, resourceName)) {
            return Promise.resolve([]);
        }
        return self.redfish.clientRequest(root[resourceName]['@odata.id'])
            .then(function(res) {
                assert.object(res);
                return res.body.Members;
            })
            .map(function(member) {
                return self.redfish.clientRequest(member['@odata.id']);
            })
            .map(function(resource) {
                resource = resource.body;


                return Promise.map(resourceTypes, function (resourceType) {
                    if (resource[resourceType])
                    {
                        return self.redfish.clientRequest(resource[resourceType]['@odata.id']);
                    }
                })
                    .map(function (data, idx) {
                        if (data) {
                            return Promise.map(data.body.Members, function (elem) {
                                return self.redfish.clientRequest(elem['@odata.id']);
                            })
                                .map(function (data) {
                                    var node = {
                                        type: nodeType,
                                        name: data.body.Name,
                                        identifiers: [data.body.ID, self.settings.uri, resource.Id, resourceTypes[idx]]
                                    };
                                    var relations = [];
                                    return self.upsertRelations(node, relations)
                                        .then(function (n) {
                                            logger.debug("New node created");
                                            var config = Object.assign({}, self.settings);
                                            config.root = data.body['@odata.id'];
                                            var obm = {
                                                config: config,
                                                service: 'redfish-obm-service'
                                            };
                                            return waterline.obms.upsertByNode(n.id, obm)
                                                .then(function () {
                                                    return n;
                                                });
                                        });
                                });
                        }
                    })
                    .catch(function (err){
                        logger.debug('ERROR: ' + err.message);
                        return [];
                    });
            })
            .catch(function (err) {
                logger.debug('ERROR: ' + err.message);
                return [];
            });
    };

    /**
     * @function createChassis
     * @description initiate redfish chassis discovery
     */
    RedfishDiscoveryListJob.prototype.createChassis = function (root) {
        var self = this;
        var createEnclosure = true;

        if (!_.has(root, 'Chassis')) {
            throw new Error('No Chassis Members Found');
        }
        return self.redfish.clientRequest(root.Chassis['@odata.id'])
        .then(function(res) {
            assert.object(res);
            return res.body.Members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(chassis) {
            chassis = chassis.body;

            var systems = _.get(chassis, 'Links.ComputerSystems') ||
                          _.get(chassis, 'links.ComputerSystems', []);

            var chassisCollection = _.get(chassis, 'Links.Contains') ||
                                    _.get(chassis, 'links.Contains', []);

            if (_.isUndefined(systems) && _.isUndefined(chassisCollection)) {
                // Log a warning and skip System to Chassis relation if no links are provided.
                logger.warning('No System or NetworkDevice members for Chassis were available');

            }
            return {
                chassis: chassis || {},
                systems: systems || [],
                chassisCollection: chassisCollection || []
            };
        })
        .map(function(data) {
            return Promise.each(data.systems, function(system) {
                var systemUrl = _.get(system, '@odata.id') ||
                                _.get(system, 'href');
                return self.redfish.clientRequest(systemUrl)
                .then(function(res) {

                    if (res.body.Id === data.chassis.Id && res.body.SerialNumber === data.chassis.SerialNumber) {
                        createEnclosure = false;
                    }
                })
                .then(function() {
                    return data;
                });
            })
            .then(function() {
                return data;
            });
        })
        .map(function(data) {

                if (!createEnclosure) {
                    return;
                }

                assert.object(data);
                var targetList = [];

                _.forEach(data.systems, function(sys) {
                    var target = _.get(sys, '@odata.id') ||
                                 _.get(sys, 'href');
                    if (!_.isUndefined(target)) {
                        targetList.push(target);
                    }
                });

                _.forEach(data.chassisCollection, function(chassisUrl) {
                    var target = _.get(chassisUrl, '@odata.id') ||
                                 _.get(chassisUrl, 'href');
                    if (!_.isUndefined(target)) {
                        targetList.push(target);
                    }
                });

                var nodeRoot = self.settings.protocol + "://" +
                    self.settings.host + ":" + self.settings.port + data.chassis['@odata.id'];

                var node = {
                    type: 'enclosure',
                    name: data.chassis.Name,
                    // todo find a better unique identifier
                    identifiers: [ data.chassis.Id, nodeRoot, data.chassis.SKU + '-' + data.chassis.SerialNumber ]
                };

                var relations = [{
                    relationType: 'encloses',
                    targets: targetList
                }];

                return self.upsertRelations(node, relations)
                .then(function(n) {
                    var config = Object.assign({}, self.settings);
                    config.root = data.chassis['@odata.id'];

                    var obm = {
                        config: config,
                        service: 'redfish-obm-service'
                    };
                    return waterline.obms.upsertByNode(n.id, obm)
                    .then(function() {
                        return n;
                    });
                });
        })
        .catch(function (err) {
            logger.debug("Error creating Chassis!");
            logger.debug("Error: " + JSON.stringify(err, null, 4));

            return ;
        });
    };

    /**
     * @function createSystems
     * @description initiate redfish system discovery
     */
    RedfishDiscoveryListJob.prototype.createSystems = function (root) {
        var self = this;

        if (!_.has(root, 'Systems')) {
            logger.warning('No System Members Found');
            return Promise.resolve();
        }

        return self.redfish.clientRequest(root.Systems['@odata.id'])
        .then(function(res) {
            assert.object(res);
            return res.body.Members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(system) {
            system = system.body;
            var chassis = _.get(system, 'Links.Chassis') ||
                          _.get(system, 'links.Chassis');

            var managers = _.get(system, 'Links.ManagedBy') ||
                           _.get(system, 'links.ManagedBy');

            return {
                system: system || {},
                chassis: chassis || [],
                managers: managers || []
            };
        })
        .map(function(data) {
            var createEnclosure = false;
            assert.object(data);
            var targetList = [];
            var managedByList = [];
            _.forEach(data.chassis, function(chassis) {
                var target = _.get(chassis, '@odata.id') ||
                             _.get(chassis, 'href');
                targetList.push(target);
            });
            _.forEach(data.managers, function(manager) {
                var target = _.get(manager, '@odata.id') ||
                             _.get(manager, 'href');
                managedByList.push(target);
            });

            return Promise.each(data.chassis, function(chassis) {
                return self.redfish.clientRequest(chassis['@odata.id'])
                .then(function(res) {
                    if (res.body.id !== data.system.id || res.body.SerialNumber !== data.system.SerialNumber) {
                        createEnclosure = true;
                    }
                 })
                 .catch(function (err) {
                     logger.debug("Error enclosure determination!: " + JSON.stringify(err, null, 4));
                 });
            })
            .then(function() {
                var nodeRoot = self.settings.protocol + "://" +
                    self.settings.host + ":" + self.settings.port + data.system['@odata.id'];
                var identifiers = [data.system.Id, nodeRoot, data.system.SKU + '-' + data.system.SerialNumber];
                var config = Object.assign({}, self.settings);
                var relations;
                var nodeType;

                config.root = data.system['@odata.id'];

                if (createEnclosure) {
                    relations = [{
                        relationType: 'enclosedBy',
                        targets: targetList
                    },
                    {
                        relationType: 'managedBy',
                        targets: managedByList
                    }];
                    nodeType = 'compute';
                } else {
                    relations = [{
                        relationType: 'managedBy',
                        targets: managedByList
                    }];
                    nodeType = 'redfish';
                }
                var node = {
                    type: nodeType,
                    name: data.system.Name,
                    identifiers: identifiers
                };

                var obm = {
                    config: config,
                    service: 'redfish-obm-service'
                };
                return self.upsertRelations(node, relations)
                .then(function(nodeRecord) {
                    return Promise.all([
                        waterline.obms.upsertByNode(nodeRecord.id, obm),
                        nodeRecord
                    ]);
                })
                .spread(function(obm, node) {
                    return node;
                });
            });
        });
    };

    /**
     * @function createManager
     * @description initiate redfish manager discovery
     */
    RedfishDiscoveryListJob.prototype.createManagers = function (root) {
        var self = this;

        if (!_.has(root, 'Managers')) {
            throw new Error('No Manager Members Found');
        }
        return self.redfish.clientRequest(root.Managers['@odata.id'])
        .then(function(res) {
            assert.object(res);
            return res.body.Members;
        })
        .map(function(members) {
            return self.redfish.clientRequest(members['@odata.id']);
        })
        .map(function(manager) {
            manager = manager.body;

            var systems = _.get(manager, 'Links.ManagerForServers') ||
                          _.get(manager, 'links.ManagerForServers', []);

            var chassis = _.get(manager, 'Links.ManagerForChassis') ||
                          _.get(manager, 'links.ManagerForChassis', []);

            return {
                manager: manager || {},
                chassis: chassis || [],
                systems: systems || []
            };
        })
        .map(function(data) {
                assert.object(data);
                var targetList = [];

                _.forEach(data.systems, function(systemUrl) {
                    var target = _.get(systemUrl, '@odata.id') ||
                                 _.get(systemUrl, 'href');
                    if (!_.isUndefined(target)) {
                        targetList.push(target);
                    }
                });

                _.forEach(data.chassis, function(chassisUrl) {
                    var target = _.get(chassisUrl, '@odata.id') ||
                                 _.get(chassisUrl, 'href');
                    if (!_.isUndefined(target)) {
                        targetList.push(target);
                    }
                });

                var nodeRoot = self.settings.protocol + "://" +
                    self.settings.host + ":" + self.settings.port + data.manager['@odata.id'];

                var node = {
                    type: 'redfishManager',
                    name: data.manager.Name,
                    identifiers: [ data.manager.Id, nodeRoot]
                };

                var relations = [{
                    relationType: 'manages',
                    targets: targetList
                }];

                return self.upsertRelations(node, relations)
                .then(function(n) {
                    var config = Object.assign({}, self.settings);
                    config.root = data.manager['@odata.id'];

                    var obm = {
                        config: config,
                        service: 'redfish-obm-service'
                    };
                    return waterline.obms.upsertByNode(n.id, obm)
                    .then(function() {
                        return n;
                    });
                });
        })
        .catch(function (err) {
            logger.debug("Error creating Manager!");
            logger.debug("Error: " + JSON.stringify(err, null, 4));

            throw err;
        });
    };



    /**
     * @function createNetwork
     * @description initiate redfish network discovery
     */
    RedfishDiscoveryListJob.prototype.createNetwork = function (root) {
        var self = this;

        if (!_.has(root, 'NetworkDevices')) {
            logger.warning('No NetworkDevices Members Found');
            return Promise.resolve();
        }

        return self.redfish.clientRequest(root.NetworkDevices['@odata.id'])
            .then(function(res) {
                assert.object(res);
                return res.body.Members;
            })
            .map(function(member) {
                return self.redfish.clientRequest(member['@odata.id']);
            })
            .map(function(network) {
                network = network.body;
                var chassis = _.get(network, 'Links.Chassis') ||
                    _.get(network, 'links.Chassis');

                if (_.isUndefined(chassis)) {
                    // Log a warning and skip Chassis to Network relation if no links are provided.
                    logger.warning('No Chassis members for NetworkDevices were available');
                }

                return {
                    network: network || [],
                    chassis: chassis || []
                };
            })
            .map(function(data) {
                assert.object(data);
                var targetList = [];

                _.forEach(data.chassis, function(chassis) {
                    var target = _.get(chassis, '@odata.id') ||
                        _.get(chassis, 'href');
                    targetList.push(target);
                });

                var config = Object.assign({}, self.settings);
                config.root = data.network['@odata.id'];
                var nodeRoot = self.settings.protocol + "://" +
                    self.settings.host + ":" + self.settings.port + data.network['@odata.id'];
                var identifiers = [ data.network.Id, nodeRoot ];
                var node = {
                    type: 'switch',
                    name: data.network.Name,
                    identifiers: identifiers
                };
                var relations = [{
                    relationType: 'enclosedBy',
                    targets: targetList
                }];
                var obm = {
                    config: config,
                    service: 'redfish-obm-service'
                };
                return self.upsertRelations(node, relations)
                    .then(function(nodeRecord) {
                        return Promise.all([
                            waterline.obms.upsertByNode(nodeRecord.id, obm),
                            nodeRecord
                        ]);
                    })
                    .spread(function(obm, node) {
                        return node;
                    });
            });
    };

    /**
     * @function mapPathToIdRelation
     * @description map source node relation types to a target
     */
    RedfishDiscoveryListJob.prototype.mapPathToIdRelation = function (src, target, type) {
        var self = this;
        if(src === undefined || src === [] || target === undefined || target === [])
        {
            return;
        }
        src = Array.isArray(src) ? src : [ src ];
        target = Array.isArray(target) ? target : [ target ];

        return Promise.resolve(src)
        .map(function(node) {
            if (_.isUndefined(node) || _.isNull(node)) {
                return ;
            }

            var ids = [];
            var deferredObms = [];
            var relations = _(node.relations).find({
                relationType: type
            });

            if (_.isUndefined(relations) || _.isNull(relations)) {
                return ;
            }

            _.forEach(target, function(t) {
                deferredObms.push(waterline.obms.findByNode(t.id, 'redfish-obm-service'));
            });

            Promise.all(deferredObms)
            .then(function(obms) {
                _.forEach(target, function(t, i) {
                    _.forEach(_.get(relations, 'targets', []), function(relation) {
                        if (relation === obms[i].config.root) {
                            ids.push(t.id);
                        }
                    });
                });

                if (_.has(relations, 'targets')) {
                    relations.targets = ids;
                }
                relations = [ relations ];
                return self.upsertRelations({id: node.id}, relations);
            });
        });
    };

    return RedfishDiscoveryListJob;
}
