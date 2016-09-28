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
    'JobUtils.PollerHelper'
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
    pollerHelper
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
     * gets the SEL information using the "sel get" ipmi command
     * @memberOf IpmiJob
     *
     * @param data
     * @param stringifiedEntries
     */
    IpmiJob.prototype.getSelEntries = function(data, stringifiedEntries) {
        return ipmitool.selEntry(data.host, data.user, data.password,  stringifiedEntries);
    };

    /**
     * gets the raw information of a single sel entry
     * @memberOf IpmiJob
     *
     * @param data
     * @param recordId
     */
    IpmiJob.prototype.getRawSelEntry = function(data, recordId) {
        return ipmitool.readRawSel(data.host, data.user, data.password, recordId);
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
     * Recursive function to traverse the sel log
     * @memberOf IpmiJob
     *
     * @param selArray
     * @param selRecordID
     * @param data
     * @param counter
     * @param totalEntries
     */
    IpmiJob.prototype.loop = function(selArray, selRecordID, data, counter, totalEntries) {
        var self = this;
        var dataCloned = JSON.parse(JSON.stringify(data));//cloning the data object
        var parsedEntry;
        //recordID of the current SEL entry that is being processed.
        //When it is "0", it indicates what is the first record ID in the sel (not always zero)
        var recordID = selRecordID;

        //The upper limits for the number of times the recursive loop is called is totalEntries
        if( counter <= totalEntries){
            return self.getSelEntries(data, selRecordID)
            .then(function(unparsedSelEntry) {
                parsedEntry = parser.parseSelDataEntries(unparsedSelEntry);
                recordID = parsedEntry[0]["SEL Record ID"];
                var recordType = parsedEntry[0]["Record Type"];
                if (recordType === "02") {//If recordType != "02" means that is not a valid SEL entry
                    return self.getRawSelEntry(dataCloned, recordID)
                        .then(function(rawRead){
                            // we add two properties ("Sensor Type Code" and "Event Type Code") to each sel entry.
                            var decodedSel = {
                                "Event Type Code" : "",
                                "Sensor Type Code" : ""
                            };
                            var regex = new RegExp('\r?\n','g');
                            var rawRead = rawRead.replace(regex, '');
                            var values = rawRead.split(" ");
                            var mask = 1 << 7; // a mask to clear the 7th bit /*jslint bitwise: true */
                            values = values.slice(1,19);// remove empty entry
                            var rawSelRecord = values.slice(2,18);
                            var nextRecordID = values.slice(0,2);//This is the next SEL entry
                            //This is from table 32 of the IPMI spec v4
                            var pad = "00";
                            var eventType = (parseInt(rawSelRecord[12],16) & ~mask).toString(16).slice(-2);/*jslint bitwise: true */
                            eventType = pad.substring(0, pad.length - eventType.length) + eventType;
                            decodedSel["Event Type Code"] = eventType;
                            decodedSel["Sensor Type Code"] = rawSelRecord[10];
                            parsedEntry[0] = _.merge(parsedEntry[0], decodedSel);
                            selArray.push(parsedEntry[0]);

                            //if  the next record id is "ff ff"
                            //it mean we reached the end of the sel log
                            if( nextRecordID[0] !== "ff" && nextRecordID[1] !== "ff" ){
                                return Promise.try(function() {
                                    var nextID = "0x" + nextRecordID[1] + nextRecordID[0];
                                    counter = counter +1;
                                    return self.loop(selArray, nextID, dataCloned, counter, totalEntries);

                                }).then(function(recursiveResults) {
                                    return recursiveResults;
                                });
                            }else {
                                // Done looping
                                return [selArray,recordID];
                            }
                        });
                }else {
                    //no valid SEL entries exist
                    return
                }
            });
        }else{
            //Reached the upper limit for the number of times the recursive loop can be called

            recordID = (parseInt(recordID,16)-1).toString(16); // Exiting the loop before processing the curent entry
            return [selArray,recordID];
        }
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
        var totalEntries;
        var selArray = [];

        return Promise.all([
            self.collectIpmiSelInformation(data),
            waterline.workitems.findOne({ id: data.workItemId })
        ]).spread (function(selInfo, workObj){
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

            lastPreviouslyReadSelEntry = _.get(workObj,'config.lastPreviouslyReadSelEntry', "-1");

            //counter will keep track of the number of recursions and it should be < totalEntries
            var counter = 0;
            var id="0x"+(parseInt(lastPreviouslyReadSelEntry,16)+1).toString(16);
            return self.loop(selArray, id , data, counter, totalEntries)
            .then(function(results) {
                if(results !== undefined){
                    workObj.config.lastPreviouslyReadSelEntry = results[1];
                    workObj.save();
                    return results[0];
                }else{
                    return;
                }
            });
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
        if(self.cachedPowerState[data.workItemId] !== status.power) {
            self._publishPollerAlert(self.routingKey, 'chassis.power', {
                states: {
                    last: self.cachedPowerState[data.workItemId] ? 'ON' : 'OFF',
                    current: status.power ? 'ON' : 'OFF'
                },
                nodeRef: '/nodes/' + data.node,
                dataRef: '/pollers/' + data.workItemId + '/data/current'
            });
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
