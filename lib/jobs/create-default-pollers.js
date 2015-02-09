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
    'Assert'
));

function createDefaultPollersJobFactory(BaseJob, waterline, Logger, util, assert) {

    var logger = Logger.initialize(createDefaultPollersJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function CreateDefaultPollersJob(options, context, taskId) {
        CreateDefaultPollersJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
        assert.isMongoId(this.nodeId, 'context.target || options.nodeId');
    }

    util.inherits(CreateDefaultPollersJob, BaseJob);

    /**
     * @memberOf CreateDefaultPollersJob
     */

    CreateDefaultPollersJob.prototype._run = function _run() {
        var self = this;

        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: 'bmc'
        }).then(function (catalog) {
            if (catalog) {
                return waterline.workitems.createIpmiPollers(self.nodeId);
            }
        }).then(function () {
            self._done();
        }).catch(function (err) {
            self._done(err);
        });
    };



    return CreateDefaultPollersJob;
}


