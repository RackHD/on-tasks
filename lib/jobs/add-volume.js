'use strict'

var di = require('di');
module.exports = AddVolumeJobFactory;
di.annotate(AddVolumeJobFactory, new di.Provide('Job.Add.Volume'));
di.annotate(AddVolumeJobFactory, new di.Inject(
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

function AddVolumeJobFactory(
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
	//add the volume
    var logger = Logger.initialize(AddVolumeJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function AddVolumeJob(options, context, taskId) {
        AddVolumeJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.username = options.username;
        this.password = options.password;
        this.raidLevel = options.raidLevel;
        this.name = options.name;
        this.sizeInBytes = options.sizeInBytes;
        this.drives = options.drives; //list of physical drive fqdds
        this.ipAddress = options.ipAddress;
    }

    util.inherits(AddVolumeJob, BaseJob);

    /**
     * @memberOf GenerateTagJob
     * @returns {Promise}
     */
     AddVolumeJob.prototype._run = function(){
        /*
        the mandatory parameters are controller FQDD, RAID 
        level, and FQDDs of physical disk drives
        racadm raid createvd:RAID.Integrated.1-1 -rl {r0|r1|r5|r6|r10|r50|r60} [-wp
        {wt|wb}] [-rp {nra|ra|ara}][-ss
        {1k|2k|4k|8k|16k|32k|64k|128k|256k|512k|1M|2M|4M|8M|16M}] -pdkey:<comma
        separated PD FQDD>[-dcp {enabled|disabled|default}] [-name <VD name>] [-size <VD
        size>{b|k|m|g|t}] 
        */
     	var self = this;
     	logger.info("Running add volume job");
        var driveFQDD = self.drives.split(',')[0].split(":");
        var controller = driveFQDD[driveFQDD.length - 1];
        var command = 'raid createvd:' + controller + ' -rl ' + self.raidLevel + ' -pdkey:' + self.drives;
        if (self.name != null){
            command += ' -name ' + self.name;
        }
        if (self.sizeInBytes != null){
            command += ' -size ' + self.sizeInBytes + 'b';
        }
     	assert.func(racadmTool.runCommand);
        return racadmTool.runCommand(self.ipAddress, self.username, self.password, command)
        .then(function(){
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
                logger.info("create vd job is done");
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            }); 

     	self._done();
     }

     return AddVolumeJob;
}
