// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = racadmFactory;
di.annotate(racadmFactory, new di.Provide('JobUtils.RacadmTool'));
di.annotate(racadmFactory,
    new di.Inject(
        'Promise',
        'JobUtils.RacadmCommandParser',
        'ChildProcess',
        'Assert'
    )
);

function racadmFactory(
    Promise,
    parser,
    ChildProcess,
    assert
) {

    function RacadmTool() {
        this.retries = 10;
    }

    /*
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} command
     * Wrapper utility for shelling out and using racadm tool to interact
     * with a network attached Dell iDRAC
     * usage: racadm [options...] <command>
     * -r hostname    Remote host name for LAN interface
     * -u username    Remote session username
     * -p password    Remote session password
     * Some commands like "racadm get -f" might take dozens of seconds,
     * timeout is required in this case.
     */
    RacadmTool.prototype.runCommand = function(host, user, password, command) {
        var formatedCmd;
        if(!host){
            formatedCmd = command.split(' ');
        } else {
            formatedCmd = ['-r', host, '-u', user, '-p', password].concat(command.split(' '));
        }

        assert.arrayOfString(formatedCmd);

        var childProcess = new ChildProcess(
            '/opt/dell/srvadmin/sbin/racadm',
            formatedCmd,
            {});

        return childProcess.run({ retries: 0, delay: 0 })
            .then(function(ret) {
                return ret.stdout;
            });
    };

    /**
     * Returns a promise with the results or errors of enabling IPMI over lan
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     */
    RacadmTool.prototype.enableIpmi = function(host, user, password) {
        return this.runCommand(host, user, password, "set iDRAC.IPMILan.Enable 1");
    };

    /**
     * Returns a promise with the results or errors of disabling IPMI over lan
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     */
    RacadmTool.prototype.disableIpmi = function(host, user, password) {
        return this.runCommand(host, user, password, "set iDRAC.IPMILan.Enable 0");
    };

    /**
     * Returns a promise with the software inventory
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} jobId -  job id created by iDRAC
     */
    RacadmTool.prototype.getJobStatus = function(host, user, password, jobId) {
        return this.runCommand(host, user, password, "jobqueue view -i " + jobId)
            .then(function(consoleOutput){
                return parser.getJobStatus(consoleOutput);
            });
    };

    /**
     * Returns a promise with the software inventory
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} jobId
     * @param {number} retryCount - retry count
     * @param {number} delay - delay time for retry
     */
    RacadmTool.prototype.waitJobDone = function(host, user, password, jobId, retryCount, delay) {
        var self = this;
        return self.getJobStatus(host, user, password, jobId)
            .then(function(jobStatus){
                if (jobStatus.status === 'Completed'){
                    return jobStatus;
                } else if (jobStatus.status === 'Failed'){
                    throw {error: 'Job Failed during process',
                        jobStatus: jobStatus};
                } else if (jobStatus.status === 'Running'){
                    if (retryCount < self.retries) {
                        return Promise.delay(delay)
                            .then(function () {
                                retryCount += 1;
                                delay = 2 * delay;
                                return self.waitJobDone(host, user, password,
                                    jobId, retryCount, delay);
                            });
                    } else {
                        throw {error: 'Job Timeout',
                            jobStatus: jobStatus};
                    }
                } else{
                    throw {error: 'Job status is incorrect',
                        jobStatus: jobStatus};
                }
            });
    };

    /**
     * Returns a promise with the results or errors of enabling IPMI over lan
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} command
     * @param {number} count
     * @param {number} delay
     */
    RacadmTool.prototype.runAsynCommands = function(host, user, password, command, count, delay) {
        var self = this;
        return self.runCommand(host, user, password, command)
            .then(function(consoleOutput){
                return parser.getJobId(consoleOutput);
            })
            .then(function(jobId){
                return self.waitJobDone(host, user, password, jobId, count, delay);
            });
    };

    /**
     * Returns a promise with the results or errors of setting BIOS configure
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {Object} cifsConfig - includes samba password, username and bios.xml file path
     */
    RacadmTool.prototype.setBiosConfig = function(host, user, password, cifsConfig) {
        var command ='';
        var cifsUser = cifsConfig.user,
            cifsPassword = cifsConfig.password;
        assert.string(cifsUser);
        assert.string(cifsPassword);
        var fileInfo = parser.getPathFilename(cifsConfig.filePath);

        if (fileInfo.style === 'remote') {
            command = "set -f " + fileInfo.name + " -t xml -u " +
                cifsUser + " -p " + cifsPassword + " -l " + fileInfo.path;
        } else if (fileInfo.style === 'local') {
            command = "set -f " + fileInfo.path + "/" + fileInfo.name + " -t xml";
        } else {
            return Promise.reject({ error: 'XML file path is invalid'});
        }

        return this.runAsynCommands(host, user, password, command, 0, 1000);
    };

    /**
     * Returns a promise with the software inventory
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {Object} cifsConfig -  includes samba password, username and bios.xml file path
     */
    RacadmTool.prototype.updateIdracImage = function(host, user, password, cifsConfig) {
        var command = '';
        var cifsUser = cifsConfig.user,
            cifsPassword = cifsConfig.password;
        assert.string(cifsUser);
        assert.string(cifsPassword);

        var fileInfo = parser.getPathFilename(cifsConfig.filePath);
        if (!_.endsWith(fileInfo.name, '.d7')){
            throw new Error('iDRAC image format is not correct');
        }
        if (fileInfo.style === 'remote') {
            command = "update -f " + fileInfo.name + " -u " +
                cifsUser + " -p " + cifsPassword + " -l " + fileInfo.path;
        } else if (fileInfo.style === 'local') {
            command = "update -f " + fileInfo.path + "/" + fileInfo.name;
        } else {
            return Promise.reject({error: 'iDRAC image file path is invalid'});
        }

        return this.runAsynCommands(host, user, password, command, 0, 1000);
    };

    return new RacadmTool();
}
