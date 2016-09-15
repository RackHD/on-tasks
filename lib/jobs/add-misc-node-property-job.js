// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

module.exports = AddMiscNodePropertyFactroy;

var di = require('di');

di.annotate(AddMiscNodePropertyFactroy, new di.Provide('Job.Add.Misc.Node.Properties'));
di.annotate(AddMiscNodePropertyFactroy, new di.Inject(
    'Job.Base',
    'Util',
    'Services.Waterline',
    'Logger'
    )
);

function AddMiscNodePropertyFactroy(BaseJob, util, waterline, Logger) {
    var logger = Logger.initialize(AddMiscNodePropertyFactroy);

    function AddMiscNodeProperty(options, context, taskId) {
        AddMiscNodeProperty.super_.call(this, logger, options, context, taskId);
        this.nodeId = this.options.target || context.target;
        this.data = {
            miscProperties:{}
        };
        this.data.miscProperties = this.options.data;
    }
    util.inherits(AddMiscNodeProperty, BaseJob);
    
    AddMiscNodeProperty.prototype._run = function run() {
        var self = this;
        return waterline.nodes.updateByIdentifier(self.nodeId, self.data) 
        .then(function(){
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };

    return AddMiscNodeProperty;
}
