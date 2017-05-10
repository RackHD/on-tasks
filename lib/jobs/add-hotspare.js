'use strict'

var di = require('di');
module.exports = AddHotspareJobFactory;
di.annotate(AddHotspareJobFactory, new di.Provide('Job.Add.Hotspare'));
di.annotate(AddHotspareJobFactory, new di.Inject(
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
    'JobUtils.RacadmTool'
));

function AddHotspareJobFactory(
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
    racadmTool
){
	//add hotspare
    var logger = Logger.initialize(AddHotspareJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function AddHotspareJob(options, context, taskId) {
        AddHotspareJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.username = options.username;
        this.password = options.password;
        this.volumeId = options.volumeId;//this is only needed if type is dhs it's in payload
        this.driveId = options.driveId;//this is in url
        this.ipAddress = options.ipAddress;
        this.type = options.hotspareType;//this is in payload
    }

    util.inherits(AddHotspareJob, BaseJob);

    /**
     * @memberOf GenerateTagJob
     * @returns {Promise}
     */
     AddHotspareJob.prototype._run = function(){
        // racadm raid hotspare:<PD FQDD> -assign yes -type ghs (cmd for global hot spare)
        // racadm raid hotspare:<PD FQDD> -assign yes -type dhs -vdkey:<VD FQDD> (cmd for dedicated hot spare)
     	var self = this;
     	logger.info("Running add hotspare job");
     	if(self.type == 'dhs'){
     		logger.info("username: " + self.username + " password: " + self.password + " volumeId: " + self.volumeId + " driveId: " + self.driveId + " type: " + self.type);
     		var command = 'raid hotspare:' + self.driveId + ' -assign yes -type dhs -vdkey:' + self.volumeId;
     	}
        else{
            logger.info("username: " + self.username + " password: " + self.password + " driveId: " + self.driveId + " type: " + self.type);
            var command = 'raid hotspare:' + self.driveId + ' -assign yes -type ghs'
        }
        assert.func(racadmTool.runCommand);
        return racadmTool.runCommand(self.ipAddress, self.username, self.password, command)
        .then(function(){
            var driveFQDD = self.driveId.split(":");
            var controller = driveFQDD[driveFQDD.length - 1];
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
                logger.info("add dedicated hotspare job is done");
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            }); 
     	
     	
     	self._done();
     }

     return AddHotspareJob;
}
