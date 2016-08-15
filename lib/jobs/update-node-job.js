// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

module.exports = UpdateNodeFactory;

var di = require('di');

di.annotate(UpdateNodeFactory, new di.Provide('Job.Update.Node'));
di.annotate(UpdateNodeFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Services.Waterline',
    'Logger'
    )
);

function UpdateNodeFactory(BaseJob, util, waterline, Logger) {
    var logger = Logger.initialize(UpdateNodeFactory);

    function UpdateNode(options, context, taskId) {
        UpdateNode.super_.call(this, logger, options, context, taskId);
        this.nodeId = this.options.target || context.target;
        this.data = this.options.data;
    }
    util.inherits(UpdateNode, BaseJob);
    
    UpdateNode.prototype._run = function run() {
        var self = this;
        return waterline.nodes.updateByIdentifier(self.nodeId, self.data) 
        .then(function(){
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };

    return UpdateNode;
}
