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
        'Assert',
        '_',
        'fs'
    )
);

function racadmFactory(
    Promise,
    parser,
    ChildProcess,
    assert,
    _,
    fs
) {

    function RacadmTool() {
        this.retries = 10;
    }

    /*
     * Wrapper utility for shelling out and using racadm tool to interact
     * with a network attached Dell iDRAC
     * usage: racadm [options...] <command>
     * -r hostname    Remote host name for LAN interface
     * -u username    Remote session username
     * -p password    Remote session password
     * Some commands like "racadm get -f" might take dozens of seconds,
     * timeout is required in this case.
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} command
     * @return {promise}
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
            {},
            [0, 48] //exit code 48 for firmware image update
        );

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
     * @return {promise}
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
     * @return {promise}
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
     * @return {promise}
     */
    RacadmTool.prototype.getLatestJobId = function(host, user, password) {
        return this.runCommand(host, user, password, "jobqueue view")
            .then(function(out){
                return out.slice(out.lastIndexOf("[Job ID"));
            })
            .then(function(lastJob){
                var jobStatus = parser.getJobStatus(lastJob);
                var jobId = jobStatus.jobId || '';
                if (jobId.indexOf("JID")!==0 ){
                    throw new Error("Job ID is not correct");
                }
                return jobId;
            });
    };

    /**
     * Returns a promise with the software inventory
     *
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {string} jobId -  job id created by iDRAC
     * @return {promise}
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
     * @return {promise}
     */
    RacadmTool.prototype.waitJobDone = function(host, user, password, jobId, retryCount, delay) {
        var self = this;
        return self.getJobStatus(host, user, password, jobId)
            .then(function(jobStatus){
                if (jobStatus.status === 'Completed'){
                    return jobStatus;
                } else if (jobStatus.status === 'Failed'){
                    throw new Error('Job Failed during process, jobStatus: ' +
                        JSON.stringify(jobStatus));
                } else {// else status: Running, Scheduled, Downloaded, Downloading, etc.
                    if (retryCount < self.retries) {
                        return Promise.delay(delay)
                            .then(function () {
                                retryCount += 1;
                                delay = 2 * delay;
                                return self.waitJobDone(host, user, password,
                                    jobId, retryCount, delay);
                            });
                    } else {
                        throw new Error('Job Timeout, jobStatus: ' +
                            JSON.stringify(jobStatus));
                    }
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
     * @return {promise}
     */
    RacadmTool.prototype.runAsyncCommands = function(host, user, password, command, count, delay) {
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
     * @param {Object} cifsConfig - includes password, username and bios.xml file path.
     * Password and username are only required when fiel path is a cifs share folder.
     * @return {promise}
     */
    RacadmTool.prototype.setBiosConfig = function(host, user, password, cifsConfig) {
        var command ='', cifsUser, cifsPassword;
        cifsConfig = cifsConfig || {};
        if (!cifsConfig.filePath){
            return Promise.reject(
                new Error ('Can not find file path required for set BIOS configuration')
            );
        }
        cifsUser = cifsConfig.user || '';
        cifsPassword = cifsConfig.password || '';

        var fileInfo = parser.getPathFilename(cifsConfig.filePath);

        if (fileInfo.style === 'remote') {
            command = "set -f " + fileInfo.name + " -t xml -u " +
                cifsUser + " -p " + cifsPassword + " -l " + fileInfo.path;
        } else { // 'local'
            command = "set -f " + fileInfo.path + "/" + fileInfo.name + " -t xml";
        }
        return this.runAsyncCommands(host, user, password, command, 0, 1000);
    };

    /**
     * Returns a promise with the software inventory
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {Object} cifsConfig -  includes samba password, username and image file path
     * Password and username are only required when fiel path is a cifs share folder.
     * @return {promise}
     */
    RacadmTool.prototype.updateFirmware = function(host, user, password, cifsConfig) {
        var command = '', cifsUser, cifsPassword, self = this;
        cifsConfig = cifsConfig || {};
        if (!cifsConfig.filePath){
            return Promise.reject(
                new Error('Can not find file path required for iDRAC image update')
            );
        }
        cifsUser = cifsConfig.user || '';
        cifsPassword = cifsConfig.password || '';

        var fileInfo = parser.getPathFilename(cifsConfig.filePath);
        if (!(_.endsWith(fileInfo.name, '.d7') || _.endsWith(fileInfo.name, '.exe') ||
            _.endsWith(fileInfo.name, '.EXE'))){
            return Promise.reject(new Error('Image format is not supported'));
        }
        if (fileInfo.style === 'remote') {
            command = "update -f " + fileInfo.name + " -u " +
                cifsUser + " -p " + cifsPassword + " -l " + fileInfo.path;
        } else { // 'local'
            command = "update -f " + fileInfo.path + "/" + fileInfo.name;
        }
        return self.runCommand(host, user, password, command, 0, 1000)
            .then(function(){
                return self.runCommand(host, user, password, "serveraction powercycle", 0, 1000);
            })
            .then(function(){
                return self.getLatestJobId(host, user, password);
            })
            .then(function(jobId){
                return self.waitJobDone(host, user, password, jobId, 0, 1000);
            });
    };

    /**
     * Get idrac software inventory
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @return {object} - software inventory
     */
    RacadmTool.prototype.getSoftwareList = function(host, user, password) {
        var command = "swinventory";
        return this.runCommand(host, user, password, command)
            .then(function(stdout){
                return parser.getSoftwareList(stdout);
            });
    };

    /**
     * Get BIOS xml file and store it to desired file path and file name
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @param {Object} cifsConfig -  includes samba password, username and bios.xml file path
     * Password and username are only required when fiel path is a cifs share folder.
     * @param {string} device - Dell device Full-Qualified-Device-Descriptor (FQDD)
     * @return {promise}
     */
    RacadmTool.prototype.getBiosConfig = function(host, user, password, cifsConfig, device) {
        var self =  this;
        var FILEPATH = '/tmp/configure.xml'; //root authority required
        var command = '', fqdd, cifsUser, cifsPassword, fileStoredPath;
        cifsConfig = cifsConfig || {};
        cifsUser = cifsConfig.user || '';
        cifsPassword = cifsConfig.password || '';
        fileStoredPath = cifsConfig.filePath || FILEPATH;

        return Promise.resolve()
            .then(function(){
                return self.getSoftwareList(host, user, password);
            })
            .then(function(softwareList){
                if (typeof softwareList.BIOS.FQDD === "undefined"){
                    throw new Error ('Can not get BIOS FQDD');
                }
                fqdd = device || softwareList.BIOS.FQDD;
            })
            .then(function(){
                return parser.getPathFilename(fileStoredPath);
            })
            .then(function(fileInfo){
                //wrap commands
                if (fileInfo.style === 'remote') {
                    command = "get -f " + fileInfo.name + " -t xml -u " + cifsUser +
                        " -p " + cifsPassword + " -l " + fileInfo.path + " -c " + fqdd;
                } else{ // 'local'
                    command = "get -f " + fileStoredPath + " -t xml -c " + fqdd;
                }

                return command;
            }).then(function(command){
                return self.runAsyncCommands(host, user, password, command, 0, 1000);
            });
    };

    /**
     * Get all configure info from iDRAC
     *
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @return {promise}
     */
    RacadmTool.prototype.getConfigCatalog = function(host, user, password) {
        var filePath = '/tmp/idrac_configure.xml', self = this,
            command =  'get -f ' + filePath + ' -t xml';
        return Promise.resolve()
            .then(function(){
                return self.runCommand(host, user, password, command, 0, 1000);
            })
            .then(function(){
                return new Promise(function(resolve, reject){
                    fs.exists(filePath, function(exist){
                        if(!exist) {
                            return reject(new Error('File /tmp/idra_configure.xml does not exist'));
                        }
                        return resolve();
                    });
                });
            })
            .then(function(){
                return parser.xmlToJson(filePath);
            })
            .then(function(parsedData){
                return {data: parsedData, source: 'idrac-racadm-configure', store: true};
            })
            .catch(function(e){
                return {source: 'idrac-racadm-configure', error: e};
            });
    };

    return new RacadmTool();
}
