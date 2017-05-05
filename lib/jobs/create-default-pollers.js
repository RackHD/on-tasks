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
     */
    CreateDefaultPollersJob.prototype.createWsmanPoller = function(nodes, poller) {
        return Promise.map(nodes, function(nodeId) {
            assert.isMongoId(nodeId, 'nodeId');
            return waterline.obms.findByNode(nodeId, 'dell-wsman-obm-service', true)
            .then(function(obmSetting) {
                if (obmSetting) {
                    return obmSetting.config;
                } else {
                    throw new Error(
                        'Required dell-wsman-obm-service settings are missing.'
                    );
                }
            })
            .then(function() {
                poller.node = nodeId;
                return waterline.workitems.findOrCreate({
                    node: nodeId,
                    config: {
                        command: poller.config.command
                    }}, poller)
                .then(function(workitem) {
                    logger.debug(
                        'Wsman WorkItem Created.',
                        workitem
                    );
                });
            });
        });
    };

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype.createRedfishPoller = function(nodes, poller) {
        return Promise.map(nodes, function(nodeId) {
            assert.isMongoId(nodeId, 'nodeId');
            return waterline.obms.findByNode(nodeId, 'redfish-obm-service', true)
            .then(function(obmSetting) {
                if (obmSetting) {
                    return obmSetting.config;
                } else {
                    throw new Error(
                        'Required redfish-obm-service settings are missing.'
                    );
                }
            })
            .then(function() {
                poller.node = nodeId;
                return waterline.workitems.findOrCreate({
                    node: nodeId,
                    config: { 
                        command: poller.config.command 
                    }}, poller)
                .then(function(workitem) {
                    logger.debug(
                        'Redfish WorkItem Created.',
                        workitem
                    );
                });
            });
        });
    }; 

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype._run = function _run() {
        var self = this;

        Promise.map(self.options.pollers, function (poller) {
            assert.object(poller.config);
            if (poller.type === 'redfish') {
                var nodes;
                if(poller.config.command.match(/systems/g)) {
                    nodes = self.context.systems || [ self.nodeId ];
                } else {
                    nodes = self.context.chassis || [ self.nodeId ];
                }
                poller.name = Constants.WorkItems.Pollers.REDFISH;
                delete poller.type;
                return self.createRedfishPoller(nodes, poller);
            } else if (poller.type === 'wsman') {
                poller.name = Constants.WorkItems.Pollers.WSMAN;
                delete poller.type;
                return self.createWsmanPoller(self.nodeId, poller);
            } else {
                var sourceQuery;
                if (poller.type === 'ipmi') {
                    poller.name = Constants.WorkItems.Pollers.IPMI;
                    delete poller.type;
                    sourceQuery = {or: [
                        {source: {startsWith: 'bmc'}},
                        {source: 'rmm'}
                    ]};
                } else if (poller.type === 'snmp') {
                    poller.name = Constants.WorkItems.Pollers.SNMP;
                    delete poller.type;
                    // Source value used by SNMP discovery
                    sourceQuery = {source: 'snmp-1'};
                }

                assert.isMongoId(self.nodeId, 'nodeId');
                var nodeQuery = {node: self.nodeId};
                return waterline.catalogs.findMostRecent(_.merge(nodeQuery, sourceQuery))
                    .then(function (catalog) {
                        if (catalog) {
                            poller.node = self.nodeId;
                            return waterline.workitems.findOrCreate({
                                node: self.nodeId,
                                config: {
                                    command: poller.config.command
                                }
                            }, poller);
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
