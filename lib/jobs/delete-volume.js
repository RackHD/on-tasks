'use strict'

var di = require('di');
module.exports = DeleteVolumeJobFactory;
di.annotate(DeleteVolumeJobFactory, new di.Provide('Job.Delete.Volume'));
di.annotate(DeleteVolumeJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Lookup',
    'Services.Configuration',
    '_',
    'HttpTool',
    'Errors',
    'JobUtils.WorkflowTool',
    'Protocol.Events',
    'validator',
    'JobUtils.RedfishTool',
    'JobUtils.RacadmTool',
    'JobUtils.RacadmCommandParser',
    'JobUtils.JobHelpers'
));

function DeleteVolumeJobFactory(
	BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    lookup,
    configuration,
    _,
    HttpTool,
    errors,
    workflowTool,
    eventsProtocol,
    validator,
    RedfishTool,
    racadmTool,
    parser,
    jobHelper
){
	//delete the volume ;)
    var logger = Logger.initialize(DeleteVolumeJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function DeleteVolumeJob(options, context, taskId) {
        DeleteVolumeJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.username = options.username;
        this.password = options.password;
        this.volumeId = options.volumeId;
        this.ipAddress = options.ipAddress;
        this.nodeId = this.context.target;
    }

    util.inherits(DeleteVolumeJob, BaseJob);

    /**
     * @memberOf GenerateTagJob
     * @returns {Promise}
     */
     DeleteVolumeJob.prototype._run = function(){
     	var self = this;
     	logger.info("Running delete volume job");
        logger.info("username: " + self.username + " password: " + self.password + " volumeId: " + self.volumeId + " ip address: " + self.ipAddress);
        logger.info(self.nodeId);
        var command = 'raid deletevd:' + self.volumeId;
        assert.func(racadmTool.runCommand);
        return racadmTool.runCommand(self.ipAddress, self.username, self.password, command)
        .then(function(){
            var controller = self.volumeId.split(":")[1];
            logger.info('scheduling the job for controller: ' + controller);
            command = 'jobqueue create ' + controller;
            return racadmTool.runCommand(self.ipAddress, self.username, self.password, command);
        })
        .delay(5000)
        .then(function(){
             logger.info("rebooting to start job");
             return racadmTool.runCommand(self.ipAddress, self.username, self.password, "serveraction powercycle");
        })
        .then(function(){
            logger.info("getting job id");
            return racadmTool.getLatestJobId(self.ipAddress, self.username, self.password);
        })
        .then(function(jobId){
            logger.info(jobId);
            return racadmTool.waitJobDone(self.ipAddress, self.username, self.password, jobId, 0, 1000); 
        })
        .then(function(results){
                //logger.info(results);
                logger.info("delete vd job is done");
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            }); 
     }
     
          return DeleteVolumeJob;
}
