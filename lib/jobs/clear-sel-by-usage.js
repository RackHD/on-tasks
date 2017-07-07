// Copyright 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di');

module.exports = ClearSelByUsageJobFactory;
di.annotate(ClearSelByUsageJobFactory, new di.Provide('Job.Clear.Sel.By.Usage'));
di.annotate(ClearSelByUsageJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Ipmitool',
    'JobUtils.IpmiCommandParser',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline'
));

function ClearSelByUsageJobFactory(
    BaseJob,
    ipmitool,
    parser,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline
) {
    var logger = Logger.initialize(ClearSelByUsageJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ClearSelByUsageJob(options, context, taskId) {
        ClearSelByUsageJob.super_.call(this, logger, options, context, taskId);
        this.nodeId = context.target;
        this.selForceClear = options.selForceClear || false;
        this.maxSelUsage = options.maxSelUsage || 60;
    }
    util.inherits(ClearSelByUsageJob, BaseJob);

    /**
     * @memberOf ClearSelByUsageJob
     */
    ClearSelByUsageJob.prototype._run = function run() {
        var self = this;
        var obmConfig;
        return waterline.obms.findByNode(self.nodeId, 'ipmi-obm-service', true)
        .then(function(obm){
            obmConfig = obm.config;
            return ipmitool.selInformation(obmConfig.host, obmConfig.user, obmConfig.password);
        })
        .then(function(selRawData){
            return parser.parseSelInformationData(selRawData);
        })
        .then(function(selData){
            var percent =  _.trimRight(selData["Percent Used"], '%');
            var usePercent = parseInt(percent);
            if (_.isNaN(usePercent)){
                throw new Error("Can not get node SEL usage status");
            }
            if (usePercent > self.maxSelUsage){
                if (self.selForceClear) {
                    return ipmitool.clearSel(obmConfig.host, obmConfig.user, obmConfig.password);
                } else {
                    var errMsg = "Sel usage is %s\%, exceeds max sel usage %s\%".format(
                        usePercent, 
                        self.maxSelUsage
                    );
                    throw new Error(errMsg);
                }
            }
        })
        .then(function(){
            self._done();
        })
        .catch(function(err) {
            logger.error("Failed to clear sel by usage", {
                            error:err,
                            nodeId: self.nodeId
                        });
            self._done(err);
        });
    };

    return ClearSelByUsageJob;
}
