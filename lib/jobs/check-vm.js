// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = checkVMFactory;
di.annotate(checkVMFactory, new di.Provide('Job.VM.Check'));
    di.annotate(checkVMFactory,
    new di.Inject(
        'Job.Base',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        'JobUtils.Commands',
        '_'
    )
);
function checkVMFactory(BaseJob, parser, waterline, Logger, Promise, assert, util, CommandUtil) {
    var logger = Logger.initialize(checkVMFactory);
    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CheckVMJob(options, context, taskId) {
        CheckVMJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);

        this.nodeId = this.context.target;
        //TODO: May not be neeeded
        if (this.context.rebootAfterCatalog === undefined) {
            this.context.rebootAfterCatalog = true;
        }
        assert.bool(this.context.rebootAfterCatalog);
        assert.bool(this.options.rebootifNotVM);

    }
    util.inherits(CheckVMJob, BaseJob);

    /**
     * @memberOf CheckVMJob
     * @function
     */
    CheckVMJob.prototype._run = function() {
        var self = this;

        return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, "ohai")
        .then(function(ohaiCatalog) {
            var manufacturer = JSON.stringify(ohaiCatalog.data.dmi.system.manufacturer);
            logger.info("The manufacturer is " + manufacturer, {
                node: self.nodeId
            });
            if(manufacturer.indexOf('VMware') == -1 && !self.options.rebootifNotVM){
                self.context.rebootAfterCatalog = false;
            }
            logger.info("rebootAfterCatalog was set to " + self.context.rebootAfterCatalog, {
                node: self.nodeId
            });
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });

        

    };

    return CheckVMJob;
}
