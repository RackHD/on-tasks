// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = ipmiJobFactory;
di.annotate(ipmiJobFactory, new di.Provide('Job.Ipmi'));
di.annotate(ipmiJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Ipmitool',
    'JobUtils.IpmiCommandParser',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline',
    'JobUtils.PollerHelper',
    'fs',
    'temp'

));

function ipmiJobFactory(
    BaseJob,
    ipmitool,
    parser,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    pollerHelper,
    fs,
    temp

) {
    var logger = Logger.initialize(ipmiJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiJob(options, context, taskId) {
        IpmiJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = this.context.graphId;
        assert.uuid(this.routingKey, 'routing key uuid') ;

        this.concurrent = {};
        this.cachedPowerState = {};
    }
    util.inherits(IpmiJob, BaseJob);

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;
           return waterline.workitems.update({name: "Pollers.IPMI"}, {failureCount: 0})
        .then(function() {
            self._subscribeRunIpmiCommand(self.routingKey, 'selInformation',
                self.createCallback('selInformation', self.collectIpmiSelInformation.bind(self)));
            self._subscribeRunIpmiCommand(self.routingKey, 'sel',
                self.createCallback('sel', self.collectIpmiSel.bind(self)));
            self._subscribeRunIpmiCommand(self.routingKey, 'selEntries',
                self.createCallback('selEntries', self.collectIpmiSelEntries.bind(self)));
            self._subscribeRunIpmiCommand(self.routingKey, 'sdr',
                self.createCallback('sdr', self.collectIpmiSdr.bind(self)));
            self._subscribeRunIpmiCommand(self.routingKey, 'chassis',
                self.createCallback('chassis', self.collectIpmiChassis.bind(self)));
            self._subscribeRunIpmiCommand(self.routingKey, 'driveHealth',
                self.createCallback('driveHealth', self.collectIpmiDriveHealth.bind(self)));
        })
        .catch(function(err) {
            logger.error("Failed to initialize job", { error:err });
            self._done(err);
        });
        // BaseJob._subscribeRunIpmiCommand will bind these callbacks to this
    };

    // Only allow one request per IPMI command type per node
    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.concurrentRequests = function(host, type) {
        assert.string(host);
        assert.string(type);

        if (!_.has(this.concurrent, host)) {
            this.concurrent[host] = {
                sdr: 0,
                selInformation: 0,
                sel: 0,
                chassis: 0,
                driveHealth: 0,
                selEntries: 0
            };
        }
        if (this.concurrent[host][type] > 0) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.addConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] += 1;
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.removeConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] -= 1;
    };

    IpmiJob.prototype.createCallback = function(cmd, ipmiCallBack) {
        var self = this;
        function genericCallback(data) {
            if (!data.host || !data.user || !data.password) {
                return;
            }
            if (self.concurrentRequests(data.host, cmd)) {
                return;
            }
            self.addConcurrentRequest(data.host, cmd);
            return ipmiCallBack(data)
            .then(function(result) {
                data[cmd] = result;
                if(data.password) {
                    delete data.password;
                }
                return self._publishIpmiCommandResult(self.routingKey, cmd, data);
            }).then(function() {
                return waterline.workitems.findOne({ id: data.workItemId });
            })
            .then(function(workitem) {
                return pollerHelper.getNodeAlertMsg(workitem.node, workitem.state,
                    "accessible")
                .tap(function(message){
                    return waterline.workitems.setSucceeded(null, message, workitem);
                });
            })
            .catch(function (err) {
                if(data.password) {
                    delete data.password;
                }
                logger.error("Failed to capture IPMI " + cmd +" status data.", {
                    data: data,
                    error: err
                });
                return waterline.workitems.findOne({ id: data.workItemId })
                .then(function(workitem) {
                    return pollerHelper.getNodeAlertMsg(workitem.node, workitem.state,
                        "inaccessible")
                    .tap(function(message){
                        return waterline.workitems.setFailed(null, message, workitem);
                    });
                });
            })
            .finally(function() {
                self.removeConcurrentRequest(data.host, cmd);
            });
        }
        return genericCallback;
    };

    /**
     * Collect SEL information from IPMI
     * @memberOf IpmiJob
     *
     * @param data
     */
    IpmiJob.prototype.collectIpmiSelInformation = function(data) {
        return ipmitool.selInformation(data.host, data.user, data.password)
        .then(function (sel) {
            return parser.parseSelInformationData(sel);
        });
    };

    /**
     * Collect SEL entries list from IPMI
     * @memberOf IpmiJob
     *
     * @param data
     * @param count
     */
    IpmiJob.prototype.collectIpmiSel = function(data, count) {
        count = count || 25;
        return ipmitool.sel(data.host, data.user, data.password, count)
        .then(function (sel) {
            return parser.parseSelData(sel);
        });
    };

    /**
     * Sends a user command
     * @memberOf IpmiJob
     *
     * @param data
     */
    IpmiJob.prototype.genericCommand = function(data, command) {
        return ipmitool.genericCommand(data.host, data.user, data.password, command);
    };


    /**
     * Collect SEL entries list from IPMI and add two properties
     * ("Sensor Type Code" and "Event Type Code") to each sel entry
     * @memberOf IpmiJob
     *
     * @param data
     */
    IpmiJob.prototype.collectIpmiSelEntries = function(data) {
        var self = this;
        var lastPreviouslyReadSelEntry;
        var lastSelDeleteTimeCurrent, lastSelDeleteTimeLastRun;
        var totalEntries;
        var workObject;
        var newEntries;
        var indexOflastReportedSel;
        var allEntries = []; //The sel entries that have been parsed and added
        var selCleared; //determines if the SEL has been recently deleted by the user

        return Promise.all([
            self.collectIpmiSelInformation(data),
            waterline.workitems.findOne({id: data.workItemId})
        ]).spread(function (selInfo, workObj) {
                workObject = workObj;
                totalEntries = parseInt(selInfo.Entries);
                /*  Parses SEL info output:
                 "SEL Information
                 Version          : 1.5 (v1.5, v2 compliant)
                 Entries          : 187
                 Free Space       : 13008 bytes
                 Percent Used     : 18%
                 Last Add Time    : 01/01/1970 01:56:22
                 Last Del Time    : Not Available
                 Overflow         : false
                 Supported Cmds   : 'Delete' 'Reserve'"
                 */
                lastPreviouslyReadSelEntry = _.get(workObj, 'config.lastPreviouslyReadSelEntry', "0000");// jshint ignore:line

                var tmpDate = selInfo["Last Del Time"].split(/\/|:| /);
                var tmpDate2 = tmpDate[0] + " " + tmpDate[1] + ", " + tmpDate[2] +
                    " " + tmpDate[3] + ":" + tmpDate[4] + ":" + tmpDate[5];
                lastSelDeleteTimeCurrent = new Date(tmpDate2);
                lastSelDeleteTimeLastRun = _.get(workObj, 'config.lastSelDeleteTimeLastRun');

                lastSelDeleteTimeLastRun = new Date(lastSelDeleteTimeLastRun);

                if (selInfo["Last Del Time"] === "Not Available" ||
                    (lastSelDeleteTimeLastRun === undefined && lastSelDeleteTimeCurrent !== undefined) ||
                    lastSelDeleteTimeCurrent.getTime() <= lastSelDeleteTimeLastRun.getTime()) {
                    
                    selCleared = false;

                } else {
                    selCleared = true;
                    //Sel log was cleared and  we reset the first record to be be read at 0
                    logger.info('****SEL was cleared. lastSelDeleteTimeCurrent is :' +
                        lastSelDeleteTimeCurrent + "and lastSelDeleteTimeLastRun is " +
                        lastSelDeleteTimeLastRun +". Poller: "+data.workItemId+ " nodeID: " + workObject.node);

                    workObject.config.lastPreviouslyReadSelEntry = "0000";
                    workObject.config.lastSelDeleteTimeLastRun = lastSelDeleteTimeCurrent;
                    return workObject.save();
                }
            })
            .then(function(){
                if (totalEntries !== 0 && selCleared === false ) {
                    //It skips one poll when the SEL is being cleared
                    var readFile = Promise.promisify(fs.readFile);
                    var unlink = Promise.promisify(fs.unlink);
                    temp = Promise.promisifyAll(temp);
                    var filePath;
                    return temp.openAsync('tmp-ipmi-data')
                        .then(function (info) {
                            fs.close(info.fd);
                            return info.path;
                        })
                        .then(function (path) {
                            filePath = path;
                            return self.genericCommand(data, "sel writeraw -vv " + path);
                        })
                        .then(function (verboseData) {
                            //verbodeData is the stdout of the writeraw. Once parsed it looks like the
                            // output of the "sel get" command
                            allEntries = parser.parseSelDataEntries(verboseData);
                            var pad="0000";
                            lastPreviouslyReadSelEntry=pad.substring(0, pad.length-lastPreviouslyReadSelEntry.length) + // jshint ignore:line
                                lastPreviouslyReadSelEntry;

                            indexOflastReportedSel = _.findIndex(allEntries,function(selEntry){
                                return selEntry["SEL Record ID"]==lastPreviouslyReadSelEntry; // jshint ignore: line
                            });
                            newEntries = allEntries.slice(indexOflastReportedSel+1,allEntries.length); // jshint ignore:line
                            return newEntries;
                        })
                        .then(function () {
                            //Reading the raw content of the SEL that was generated by the writeraw command
                            return readFile(filePath);
                        })
                        .then(function (hexBuffer) {
                            // we add two properties ("Sensor Type Code" and "Event Type Code")
                            // to each sel entry.The properties are decoded from the raw file
                            // that was created by the writeraw command
                            //hexbuffer looks like the below:
                            /*
                            00000000  01 00 02 c7 02 00 00 00  00 04 10 07 6f 02 ff ff  |............o...| // jshint ignore:line
                            00000010  02 00 02 c7 02 00 00 00  00 04 12 83 6f 05 00 ff  |............o...| // jshint ignore:line
                            */

                            var decodedSel = {
                                "Event Type Code": "",
                                "Sensor Type Code": ""
                            };
                            var pad = "00";
                            var index1;//This index will track the "Event Type Code" information
                            var index2;//This index will track the "Sensor Type Code" information
                            var counter = newEntries.length;
                            var mask = 1 << 7; //jshint ignore: line
                            for (var i = hexBuffer.length-1; i >= 0 ; i = i-16) {
                                //Reading the buffer from end to start. The loop exits when all
                                ///the needed info is processed, it avoids processing information
                                // that is not needed
                                index1 = i-3;
                                index2 = i-5;
                                if (index1 < hexBuffer.length && counter !== 0) {
                                    //This is from table 32 of the IPMI spec v4
                                    var eventType = (hexBuffer[index1] & ~mask).toString(16).slice(-2);// jshint ignore:line
                                    eventType = pad.substring(0, pad.length - eventType.length) + eventType;// jshint ignore:line
                                    var sensorType = hexBuffer[index2].toString(16);
                                    sensorType = pad.substring(0, pad.length - sensorType.length) + sensorType;// jshint ignore:line
                                    decodedSel["Event Type Code"] = eventType;
                                    decodedSel["Sensor Type Code"] = sensorType;

                                    newEntries[counter-1]= _.merge(newEntries[counter-1], decodedSel);// jshint ignore:line
                                }
                                else{
                                    //Done getting the information needed for the new sel entries
                                    //No need to process the rest of the buffer
                                    break;//jshint ignore: line
                                }
                                counter = counter -1;
                            }

                            workObject.config.lastPreviouslyReadSelEntry = allEntries[allEntries.length - 1]["SEL Record ID"];// jshint ignore:line
                            workObject.config.lastSelDeleteTimeLastRun = lastSelDeleteTimeCurrent;
                            workObject.save();
                            return workObject.save();
                        })
                        .then(function(){
                            logger.debug("***number of new SEL entries :" + newEntries.length +
                                ". Poller: "+data.workItemId+ " nodeID: " + workObject.node );//jshint ignore: line
                            return newEntries; //returning the new  SEL entries
                        }).
                        catch(function(err){
                            logger.error("Failed to process SEL. Poller: " +data.workItemId +
                                " nodeID: " + workObject.node + ". Error message: " + err.message);
                        })
                        .finally(function () {
                            if(filePath){
                                return unlink(filePath);
                            }
                            return;
                        });
                }
                else {//empty sel or being cleared
                    selCleared = false;
                    return;
                }
    });

    };


    /**
     * Collect SDR data from IPMI, promise chaining to extract values (parse the SDR)
     * and "store" the samples
     * @memberOf IpmiJob
     *
     * @param machine
     */
    IpmiJob.prototype.collectIpmiSdr = function(machine) {
        var host = machine.host,
            user = machine.user,
            password = machine.password;

        return ipmitool.sensorDataRepository(host, user, password)
        .then(function (sdr) {
            return parser.parseSdrData(sdr);
        });
    };

    /**
     * Compare current and last power states and publish alert on a state change
     * @memberOf IpmiJob
     * @param status
     * @param data
     */
     IpmiJob.prototype.powerStateAlerter = Promise.method(function(status, data) {
        var self = this;
        var tmp = {};
        tmp.type = 'polleralert';
        tmp.action = 'chassispower.updated';
        tmp.typeId = data.workItemId;
        tmp.nodeId = data.node;
        tmp.severity = "information";
        tmp.data = {
            states: {
                last: self.cachedPowerState[data.workItemId] ? 'ON' : 'OFF',
                current: status.power ? 'ON' : 'OFF'
            }
        };
        if(self.cachedPowerState[data.workItemId] !== status.power) {
            self._publishPollerAlert(tmp);
            self.cachedPowerState[data.workItemId] = status.power;
        }
        return status;
    });

    /**
     * Collect chassis status data from IPMI
     * @memberOf IpmiJob
     *
     * @param data
     */
    IpmiJob.prototype.collectIpmiChassis = function(data) {
        var self = this;
        return ipmitool.chassisStatus(data.host, data.user, data.password)
        .then(function(status) {
            return [ parser.parseChassisData(status), data ];
        })
        .spread(self.powerStateAlerter.bind(self))
        .then(function(status) {
            return status;
        });
    };

    /**
     * Collect drive health status data from IPMI
     * @memberOf IpmiJob
     *
     * @param data
     */
    IpmiJob.prototype.collectIpmiDriveHealth = function(data) {
        return ipmitool.driveHealthStatus(data.host, data.user, data.password)
        .then(function (status) {
            return parser.parseDriveHealthData(status);
        });
    };

    return IpmiJob;
}
