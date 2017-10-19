// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = createDefaultPollersJobFactory;
di.annotate(createDefaultPollersJobFactory, new di.Provide('Job.Pollers.CreateDefault'));
di.annotate(createDefaultPollersJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Logger',
    'Util',
    'Assert',
    'Constants',
    'Promise',
    '_'
));

function createDefaultPollersJobFactory(
    BaseJob,
    waterline,
    Logger,
    util,
    assert,
    Constants,
    Promise,
    _
) {

    var logger = Logger.initialize(createDefaultPollersJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function CreateDefaultPollersJob(options, context, taskId) {
        CreateDefaultPollersJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
        this.options = options;
        assert.arrayOfObject(this.options.pollers);
    }

    util.inherits(CreateDefaultPollersJob, BaseJob);

    /**
     * @memberOf CreateDefaultPollersJob
     * @param {String} nodeId: node id string
     * @param {Object} pollerTemplate: poller template to be created
     * @param {String} obmName: OBM service name required to create pollers
     */
    CreateDefaultPollersJob.prototype._createWorkitem = function(nodeId, pollerTemplate, obmName) {
        var poller = _.cloneDeep(pollerTemplate);
        return waterline.obms.findByNode(nodeId, obmName, true)
        .then(function(obmSetting){
            if(_.isEmpty(obmSetting)){
                var errorMessage = 'Required %s settings are missing.'.format(obmName);
                throw new Error(errorMessage);
            }
        })
        .then(function(){
            poller.node = nodeId;
            return waterline.workitems.findOrCreate(
                {
                    node: nodeId,
                    "config.command": poller.config.command
                },
                poller
            )
            .then(function(workitem){
                var message = _.dropRight(obmName.split('-'), 2).join(" ");
                logger.debug(
                    '%s WorkItem Created.'.format(message),
                    _.pick(workitem, ['name', 'node', 'createdAt', 'config'])
                );
            });
        });
    };

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype.createUcsPoller = function(nodeIds, pollerTemplate){
        var self = this;
        return Promise.map(nodeIds, function(nodeId) {
            return self._createWorkitem(nodeId, pollerTemplate, "ucs-obm-service");
        });
    };

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype.createWsmanPoller = function(nodes, pollerTemplate) {
        var self = this;
        return Promise.map(nodes, function(nodeId) {
            return waterline.nodes.getNodeById(nodeId)
            .then(function(node){
                if(node.type !== 'compute') {
                    return;
                }
                return self._createWorkitem(nodeId, pollerTemplate, "dell-wsman-obm-service");
            });
        });
    };

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype.createRedfishPoller = function(nodes, pollerTemplate) {
        var self = this;
        return Promise.map(nodes, function(nodeId) {
            return self._createWorkitem(nodeId, pollerTemplate, "redfish-obm-service");
        });
    }; 

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype._run = function _run() {
        var self = this;

        Promise.map(self.options.pollers, function (pollerTemplate) {
            assert.object(pollerTemplate.config);
            var nodes;
            if (pollerTemplate.type === 'redfish') {
                if(pollerTemplate.config.command.match(/systems/g)) {
                    nodes = self.context.systems || [ self.nodeId ];
                } else {
                    nodes = self.context.chassis || [ self.nodeId ];
                }
                pollerTemplate.name = Constants.WorkItems.Pollers.REDFISH;
                delete pollerTemplate.type;
                return self.createRedfishPoller(nodes, pollerTemplate);
            } else if (pollerTemplate.type === 'wsman') {
                pollerTemplate.name = Constants.WorkItems.Pollers.WSMAN;
                delete pollerTemplate.type;
                return self.createWsmanPoller([self.nodeId], pollerTemplate);
            } else if (pollerTemplate.type === 'ucs') {
                //TODO: include chassis 
                nodes = self.context.physicalNodeList || [self.nodeId];
                pollerTemplate.name = Constants.WorkItems.Pollers.UCS;
                delete pollerTemplate.type;
                return self.createUcsPoller(nodes, pollerTemplate);
            } else {
                var sourceQuery;
                if (pollerTemplate.type === 'ipmi') {
                    pollerTemplate.name = Constants.WorkItems.Pollers.IPMI;
                    delete pollerTemplate.type;
                    sourceQuery = {or: [
                        {source: {startsWith: 'bmc'}},
                        {source: 'rmm'}
                    ]};
                } else if (pollerTemplate.type === 'snmp') {
                    pollerTemplate.name = Constants.WorkItems.Pollers.SNMP;
                    delete pollerTemplate.type;
                    // Source value used by SNMP discovery
                    sourceQuery = {source: 'snmp-1'};
                }

                assert.isMongoId(self.nodeId, 'nodeId');
                var nodeQuery = {node: self.nodeId};
                return waterline.catalogs.findMostRecent(_.merge(nodeQuery, sourceQuery))
                .then(function (catalog) {
                    if (catalog) {
                        pollerTemplate.node = self.nodeId;
                        return waterline.workitems.findOrCreate({
                            node: self.nodeId,
                            'config.command': pollerTemplate.config.command
                            }, pollerTemplate);
                    }
                    else {
                        logger.debug(
                            'No BMC/RMM source found for creating default poller.' +
                            'nodeId: ' + self.nodeId
                        );
                    }
                });
            }
        }).then(function () {
            self._done();
        }).catch(function (err) {
            self._done(err);
        });
    };

    return CreateDefaultPollersJob;
}
