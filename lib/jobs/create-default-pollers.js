// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
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
    'Promise'
));

function createDefaultPollersJobFactory(
    BaseJob,
    waterline,
    Logger,
    util,
    assert,
    Constants,
    Promise
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
                    return waterline.workitems.create(poller);
                }
            });
        }).then(function () {
            self._done();
        }).catch(function (err) {
            self._done(err);
        });
    };

    return CreateDefaultPollersJob;
}
