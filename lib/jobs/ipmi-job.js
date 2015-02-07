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
    }
    util.inherits(IpmiJob, BaseJob);

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunIpmiCommand(self.routingKey, 'power', function(data) {
            logger.silly("Polling IPMI data.", {
                type: 'power',
                data: data
            });
            return self.powerStatus(data.host, data.user, data.password)
            .then(function(_data) {
                return self._publishIpmiCommandresult(self.routingKey, 'power', _data);
            });
        });

        self._subscribeRunIpmiCommand(self.routingKey, 'sel', function(data) {
            logger.silly("Polling IPMI data.", {
                type: 'sel',
                data: data
            });
            return self.selList(data.host, data.user, data.password)
            .then(function(_data) {
                return self._publishIpmiCommandresult(self.routingKey, 'sel', _data);
            });
        });

        self._subscribeRunIpmiCommand(self.routingKey, 'sdr', function(data) {
            logger.silly("Polling IPMI data.", {
                type: 'sdr',
                data: data
            });
            return self.collectIpmiSdr(data, ipmitool, assert, parser, _)
            .then(function(_data) {
                return self._publishIpmiCommandResult(self.routingKey, 'sdr', _data);
            })
            .catch(function (err) {
                logger.error("Failed to capture IPMI sdr data.", {
                    data: data,
                    error: err
                });
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
