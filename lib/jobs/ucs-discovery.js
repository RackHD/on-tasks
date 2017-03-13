//Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = UcsDiscoveryJobFactory;
di.annotate(UcsDiscoveryJobFactory, new di.Provide('Job.Ucs.Discovery'));
di.annotate(UcsDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.UcsTool',
    'Constants'
));

function UcsDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    UcsTool,
    Constants
) {
    var logger = Logger.initialize(UcsDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function UcsDiscoveryJob(options, context, taskId) {
        UcsDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.object(this.options);
        assert.string(this.options.uri);
        assert.string(this.options.username);
        assert.string(this.options.password);
        assert.string(this.options.ucs);
        var parse = urlParse(this.options.uri);
        var protocol = parse.protocol.replace(':','').trim();
        this.settings = {
            uri: parse.href,
            host: parse.host.split(':')[0],
            root: parse.pathname,
            port: parse.port,
            protocol: protocol,
            ucsUser: this.options.username,
            ucsPassword: this.options.password,
            ucsHost: this.options.ucs,
            verifySSL: this.options.verifySSL || false
        };
        this.ucs = new UcsTool();
        this.ucs.settings = this.settings;
    }
    
    util.inherits(UcsDiscoveryJob, BaseJob);

    /**
     * @memberOf UcsDiscoveryJob
     */
    UcsDiscoveryJob.prototype._run = function() {
        var self = this;
        
        return self.getRoot()
            .then(function(root) {
                return [ root, self.createRackmounts(root), self.createServers(root) ];
            })
            .spread(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    /**
     * @function logIn
     * @description Log into the UCS microservice
     */
    UcsDiscoveryJob.prototype.logIn = function () {
        var url = "/login";
        return this.ucs.clientRequest(url)
            .then(function(response) {
                return response.body;
            });
    };


    /**
     * @function getRoot
     * @description return all the elments in the Cisco UCS that RackHD cares about
     */
    UcsDiscoveryJob.prototype.getRoot = function () {
        var url= "/sys";
        return this.ucs.clientRequest(url)
            .then(function(response) {
                return response.body;
            });
    };

    /**
     * @function createRackmounts
     * @description discovers all the rackmount servers in the Cisco UCS
     */
    UcsDiscoveryJob.prototype.createRackmounts = function (root) {
        var self = this;
        var url = '/rackmount';
        return Promise.try(function () {
            if (_.has(root, 'Servers')) {
                return self.ucs.clientRequest(url)
                    .then(function(res) {
                        assert.object(res);
                        return res.body;
                    })
                    .map(function(data) {
                        self.createNode(data, Constants.NodeTypes.Compute);
                    });
            }else{
                logger.warning('No rackmount servers found');
                return;
            }
        });
    };

    /**
     * @function createServers
     * @description discovers all the chassis servers in the Cisco UCS
     */
    UcsDiscoveryJob.prototype.createServers = function (root) {
        var self = this;
        var url = "/chassis";
        return Promise.try(function () {
            if (!_.has(root, 'Chassis')) {
                logger.warning('No Chassis found');
                return;
            }
            return self.ucs.clientRequest(url)
                .then(function(res) {
                    assert.object(res);
                    return res.body;
                })
                .map(function(chassisData) {
                    return self.createNode(chassisData, Constants.NodeTypes.Enclosure)
                        .spread(function (chassisNode) {
                            var chassisId = chassisNode.id;
                            var nodeList = [];
                            return Promise.map(chassisData.members, function (data) {
                                return self.createNode(data, Constants.NodeTypes.Compute)
                                .spread(function(newNode) {
                                    var relations = [{
                                                     relationType: 'enclosedBy',
                                                     targets: [chassisId]
                                                 }];
                                    nodeList.push(newNode.id);
                                    return self.updateRelations(newNode.id, relations);
                                });
                            })
                            .then(function() {
                                var chassisRelations = [{
                                    relationType: 'encloses',
                                    targets: nodeList
                                }];
                                return self.updateRelations(chassisId, chassisRelations);
                            });
                        });
                });
        });
    };

    UcsDiscoveryJob.prototype.updateRelations = function(nodeId, relations) {
        // Update existing node with new relations or create one
        return waterline.nodes.needOneById(nodeId)
            .then(function(curNode) {
                relations = _.uniq(relations.concat(curNode.relations), 'relationType');
                return waterline.nodes.updateOne(
                    { id: curNode.id },
                    { relations: relations }
                );
            });
    };


    UcsDiscoveryJob.prototype.createNode = function(data, type) {

        var self = this;
        var config = Object.assign({}, self.settings);
        assert.string(data.name);
        assert.string(data.path);
        var id;
        if (type === Constants.NodeTypes.Compute) {
            assert.array(data.macs);
            id = data.macs;
        } else {
            id = [config.ucs, data.path];
        }

        config.dn = data.path;
        var obm = {
            config: config,
            service: 'ucs-obm-service'
        };

        var node = {
            type: type,
            name: data.path,
            identifiers: id,
            relations : []
        };

        // Update existing node  or create a new one
        return waterline.nodes.needOne({identifiers:id})
            .then(function(curNode) {
                return waterline.nodes.updateOne(
                    { id: curNode.id },
                    node
                );
            })
            .catch(function(error) {
                if (error.name === 'NotFoundError') {
                    return waterline.nodes.create(node);
                }
                throw error;
            })
            .then(function(data){
                return [data, waterline.obms.upsertByNode(data.id,obm)];
            });
    };

    return UcsDiscoveryJob;
}
