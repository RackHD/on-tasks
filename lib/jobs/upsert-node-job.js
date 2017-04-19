// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

module.exports = UpsertNodeAttributeFactory;

var di = require('di');

di.annotate(UpsertNodeAttributeFactory, new di.Provide('Job.Upsert.Node.Attribute'));
di.annotate(UpsertNodeAttributeFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Services.Waterline',
    'Logger'
    )
);

function UpsertNodeAttributeFactory(BaseJob, util, waterline, Logger) {
    var logger = Logger.initialize(UpsertNodeAttributeFactory);

    function UpsertNodeAttribute(options, context, taskId) {
        UpsertNodeAttribute.super_.call(this, logger, options, context, taskId);
        this.nodeId = this.options.target || context.target;
        this.data = this.options.data;
    }
    util.inherits(UpsertNodeAttribute, BaseJob);
    
    UpsertNodeAttribute.prototype._run = function run() {
        var self = this;
        return waterline.nodes.updateByIdentifier(self.nodeId, self.data) 
        .then(function(){
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };

    return UpsertNodeAttribute;
}
