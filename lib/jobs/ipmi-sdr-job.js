// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = ipmiSdrJobFactory;
di.annotate(ipmiSdrJobFactory, new di.Provide('Job.Ipmi.Sdr'));
di.annotate(ipmiSdrJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Ipmitool',
    'JobUtils.IpmiCommandParser',
    'Logger',
    'Util',
    'Assert',
    '_'
));
function ipmiSdrJobFactory(BaseJob, ipmitool, parser, Logger, util, assert, _) {
    var logger = Logger.initialize(ipmiSdrJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiSdrJob(options, context, taskId) {
        IpmiSdrJob.super_.call(this, logger, options, context, taskId);

        this.collectIpmiSdr = collectIpmiSdr;
    }
    util.inherits(IpmiSdrJob, BaseJob);

    /**
     * @memberOf IpmiSdrJob
     */
    IpmiSdrJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunIpmiSdrCommand(function(machine) {
            logger.silly("Polling IPMI SDR data.", {
                machine: machine
            });
            return self.collectIpmiSdr(machine, ipmitool, assert, parser, _)
            .then(function(data) {
                return self._publishIpmiSdrResult(data);
            })
            .catch(function (err) {
                logger.error("Failed to capture IPMI sdr data.", {
                    machineData: machine,
                    error: err
                });
            });
        });
    };

    return IpmiSdrJob;
}

/**
 * Collect SDR data from IPMI, promise chaining to extract values (parse the SDR)
 * and "store" the samples
 *
 * @param machine
 */
function collectIpmiSdr(machine, ipmitool, assert, parser, _) {
    assert.object(machine);
    assert.isIp(machine.ip);
    assert.string(machine.user);
    assert.string(machine.password);

    var hostIp = machine.ip,
        user = machine.user,
        password = machine.password;

    return ipmitool.sensorDataRepository(hostIp, user, password)
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
