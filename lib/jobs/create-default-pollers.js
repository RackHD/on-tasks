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
    "Q",
    '_'
));

function createDefaultPollersJobFactory(BaseJob, waterline, Logger, util, assert, Constants, Q, _) {

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
        assert.arrayOfObject(this.options);
    }

    util.inherits(CreateDefaultPollersJob, BaseJob);

    /**
     * @memberOf CreateDefaultPollersJob
     */

    CreateDefaultPollersJob.prototype._run = function _run() {
        var self = this;

        Q.all(_.forEach(options, function (option) {
            if(Constants.WorkItems.Pollers.IPMI === option.type) {
                source_value = 'bmc';
            }
            else if(Constants.WorkItems.Pollers.SNMP === option.type) {
                source_value = 'snmp';
            }

            return waterline.catalogs.findMostRecent({
                node:   self.nodeId,
                source: source_value 
            }).then(function (catalog) {
                if (catalog) {
                    option.node = nodeId;
                    return waterline.workitems.create(option);
                }
            });
        })).then(function () {
            self._done();
        }).catch(function (err) {
            self._done(err);
        });
    };

    return CreateDefaultPollersJob;
}


