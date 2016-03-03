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
        assert.isMongoId(this.nodeId, 'context.target || options.nodeId');
        assert.arrayOfObject(this.options.pollers);
    }

    util.inherits(CreateDefaultPollersJob, BaseJob);

    /**
     * @memberOf CreateDefaultPollersJob
     */
    CreateDefaultPollersJob.prototype._run = function _run() {
        var self = this;

        Promise.map(self.options.pollers, function (poller) {
            assert.object(poller.config);

            if (poller.type === 'redfish') {
                poller.name = Constants.WorkItems.Pollers.REDFISH;
                delete poller.type;
                return waterline.nodes.needByIdentifier(self.nodeId)
                .then(function (node) {
                    var obmSetting = _.find(node.obmSettings, { service: 'redfish-obm-service' });
                    if (obmSetting) {
                        return obmSetting.config;
                    } else {
                        throw new Error(
                            'Required redfish-obm-service settings are missing.'
                        );
                    }
                })
                .then(function(config) {
                    poller.node = self.nodeId;
                    return waterline.workitems.findOrCreate({
                        node: self.nodeId, 
                        config: { 
                            command:
                            poller.config.command 
                        }}, poller)
                    .then(function(workitem) {
                        logger.debug(
                            'Redfish WorkItem Created.',
                            workitem
                        );
                    });
                });
            } else {
                var sourceValue;
                if (poller.type === 'ipmi') {
                    poller.name = Constants.WorkItems.Pollers.IPMI;
                    delete poller.type;
                    sourceValue = 'bmc';
                } else if (poller.type === 'snmp') {
                    poller.name = Constants.WorkItems.Pollers.SNMP;
                    delete poller.type;
                    // Source value used by SNMP discovery
                    sourceValue = 'snmp-1';
                }
                
                return waterline.catalogs.findMostRecent({
                    node:   self.nodeId,
                    source: sourceValue
                }).then(function (catalog) {
                    if (catalog) {
                        poller.node = self.nodeId;
                        return waterline.workitems.findOrCreate( { node: self.nodeId, config: { command:
                            poller.config.command } }, poller);
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
