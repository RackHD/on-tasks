// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');
module.exports = WsmanConfigureIdracFactory;
di.annotate(WsmanConfigureIdracFactory, new di.Provide('Job.Dell.Wsman.Configure.Idrac'));
di.annotate(WsmanConfigureIdracFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Assert',
    'Util',
    '_',
    'Services.Waterline',
    'Errors'
));

function WsmanConfigureIdracFactory(
    BaseJob,
    Logger,
    assert,
    util,
    _,
    waterline,
    errors
) {
    var logger = Logger.initialize(WsmanConfigureIdracFactory);

    function WsmanConfigureIdracJob(options, context, taskId, taskName) {
        WsmanConfigureIdracJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
        this.context = context;
        this.taskName = taskName;
        this.netmask = this.options.netmask;
        this.address = this.options.address;
        this.gateway = this.options.gateway;
    }

    util.inherits(WsmanConfigureIdracJob, BaseJob);

    WsmanConfigureIdracJob.prototype._run = function() {
        var self = this;
        return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'manager')
        .then(function(catalogs) {
            var fqdd = _.get(catalogs, 'data.DCIM_iDRACCardString[0].FQDD');
            if (!fqdd) {
                throw new errors.NotFoundError("Can't find IRAC FQDD");
            }
            return fqdd;
        })
        .then(function(fqdd) {
           if(!self.context.outputs){
               self.context.outputs ={};
           }

           self.context.outputs[self.taskName] = {
               "fqdd": fqdd,
               "netmask": self.netmask,
               "gateway": self.gateway,
               "address": self.address
           };
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    return WsmanConfigureIdracJob;
}
