// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

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
    'Q',
    '_'
));
function ipmiJobFactory(BaseJob, ipmitool, parser, Logger, util, assert, Q, _) {
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
        assert.uuid(this.routingKey) ;

        this.collectIpmiSdr = collectIpmiSdr;
        this.powerStatus = ipmitool.powerStatus.bind(ipmitool);
        this.selList = ipmitool.selList.bind(ipmitool);

        this.concurrent = {};
    }
    util.inherits(IpmiJob, BaseJob);

    // Only allow one request per IPMI command type per node
    IpmiJob.prototype.concurrentRequests = function(host, type) {
        assert.string(host);
        assert.string(type);

        if (!_.has(this.concurrent, host)) {
            this.concurrent[host] = {
                power: 0,
                sdr: 0,
                sel: 0
            };
        }
        if (this.concurrent[host][type] > 0) {
            return true;
        } else {
            return false;
        }
    };

    IpmiJob.prototype.addConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] += 1;
    };

    IpmiJob.prototype.removeConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] -= 1;
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunIpmiCommand(self.routingKey, 'power', function(data) {
            if (self.concurrentRequests(data.host, 'power')) {
                return;
            }
            self.addConcurrentRequest(data.host, 'power');
            logger.silly("Polling IPMI data.", {
                type: 'power',
                data: data
            });
            return self.powerStatus(data.host, data.user, data.password)
            .then(function(result) {
                assert.string(result);
                data.power = result.indexOf('Chassis Power is on') >= 0;
                return self._publishIpmiCommandResult(self.routingKey, 'power', data);
            })
            .catch(function (err) {
                logger.error("Failed to capture IPMI power data.", {
                    data: data,
                    error: err
                });
            })
            .fin(function() {
                self.removeConcurrentRequest(data.host, 'power');
            });
        });

        self._subscribeRunIpmiCommand(self.routingKey, 'sel', function(data) {
            if (self.concurrentRequests(data.host, 'sel')) {
                return;
            }
            self.addConcurrentRequest(data.host, 'sel');
            logger.silly("Polling IPMI data.", {
                type: 'sel',
                data: data
            });
            return self.selList(data.host, data.user, data.password)
            .then(function(result) {
                data.sel = result;
                return self._publishIpmiCommandResult(self.routingKey, 'sel', data);
            })
            .catch(function (err) {
                logger.error("Failed to capture IPMI sel data.", {
                    data: data,
                    error: err
                });
            })
            .fin(function() {
                self.removeConcurrentRequest(data.host, 'sel');
            });
        });

        self._subscribeRunIpmiCommand(self.routingKey, 'sdr', function(data) {
            if (self.concurrentRequests(data.host, 'sdr')) {
                return;
            }
            self.addConcurrentRequest(data.host, 'sdr');
            logger.silly("Polling IPMI data.", {
                type: 'sdr',
                data: data
            });
            return self.collectIpmiSdr(data, ipmitool, assert, parser, _)
            .then(function(result) {
                data.sdr = result;
                return self._publishIpmiCommandResult(self.routingKey, 'sdr', data);
            })
            .catch(function (err) {
                logger.error("Failed to capture IPMI sdr data.", {
                    data: data,
                    error: err
                });
            })
            .fin(function() {
                self.removeConcurrentRequest(data.host, 'sdr');
            });
        });
    };

    return IpmiJob;
}

/**
 * Collect SDR data from IPMI, promise chaining to extract values (parse the SDR)
 * and "store" the samples
 *
 * @param machine
 */
function collectIpmiSdr(machine, ipmitool, assert, parser, _) {
    var host = machine.host,
        user = machine.user,
        password = machine.password;

    return ipmitool.sensorDataRepository(host, user, password)
    .then(function (sdr) {
        return extractSdrData(sdr, parser, _);
    });
}

/**
 * parse/extract text output from IPMI call into key/value data for the SDR
 * information
 *
 * @param sdrData
 * @returns {*}
 */
function extractSdrData(sdrData, parser, _) {
    var parsed = parser.parseSensorsData(sdrData);

    // iterate through analog sensor data and derive values
    var analogData = parsed['Sensor Type (Analog)'];
    var results = _.transform(analogData, function(result, v, k) {
        if (v['Sensor Reading'] === 'No Reading' ||
            v['Sensor Reading'] === 'Disabled') {
            return;
        }
        result[k] = {};
        result[k].value =
            v['Sensor Reading'].match(/^-?\d+(\.\d+)?/)[0];
    });

    // iterate through threshold sensor data and set values from thresholds
    var thresholdData = parsed['Sensor Type (Threshold)'];
    var thresholdResults = _.transform(thresholdData, function(result, v, k) {
        if (v.Status === 'Not Available') {
            return;
        }
        if (v.Status === 'ok') {
            result[k] = { value : 1 };

        } else {
            result[k] = { value : 0 };
        }
    });

    _.assign(results, thresholdResults);
    return results;
}
