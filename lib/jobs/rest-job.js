// Copyright 2016, EMC, Inc

'use strict';

var di = require('di');

module.exports = RestJobFactory;
di.annotate(RestJobFactory, new di.Provide('Job.Rest'));
di.annotate(RestJobFactory, new di.Inject(
    'Job.Base', 
    'Logger', 
    '_', 
    'Assert', 
    'Promise', 
    'Util', 
    'HttpTool'));

function RestJobFactory(BaseJob, Logger, _, assert, Promise, util, HttpTool){
    var logger = Logger.initialize(RestJobFactory);
    
    /**
    * The interface that runs Rest Job from tasks
    * @constructor
    */
    function RestJob(options, context, taskId, taskName){
        var self = this;
        self.options = options;
        self.context = context;
        self.taskName = taskName;
        RestJob.super_.call(self, logger, options, context, taskId);
        self.restClient = new HttpTool();
    }
    
    util.inherits(RestJob, BaseJob);
    
    RestJob.prototype._run = function run(){
        var self = this;

        logger.debug("Running A Rest Call");

        self.restClient.setupRequest(self.options)
        .then(function(){
            return self.restClient.runRequest();
        })
        .then(function(data){
            if(!self.context.outputs){
                self.context.outputs ={};
            }

            self.context.outputs[self.taskName] = {"restData":""};
            self.context.outputs[self.taskName].restData = data;

            self._done();
        })
        .catch(function(err){
            logger.error("Found error during HTTP request.", {error: err});
            self._done(err);
        });
    };

    return RestJob;
}
