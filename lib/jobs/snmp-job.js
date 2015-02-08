// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpJobFactory;
di.annotate(snmpJobFactory, new di.Provide('Job.Snmp'));
di.annotate(snmpJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Snmptool',
    'JobUtils.SnmpParser',
    'Logger',
    'Util',
    'Assert',
    'Q',
    '_'
));
function snmpJobFactory(BaseJob, Snmptool, parser, Logger, util, assert, Q, _) {
    var logger = Logger.initialize(snmpJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpJob(options, context, taskId) {
        SnmpJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);

        // Currently a noop data structure, but a placeholder for future work
        // when we gather data from certain IF-MIB mibs to correlate numeric OID values
        // to human readable interface names
        this.mibNameMap = {};
        this.collectHostSnmp = collectHostSnmp;
    }
    util.inherits(SnmpJob, BaseJob);

    /**
     * @memberOf SnmpJob
     */
    SnmpJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunSnmpCommand(self.routingKey, function(data) {
            logger.silly("Polling SNMP data.", {
                data: data
            });
            return self.collectHostSnmp(data, Snmptool, parser, logger, Q, _, self.mibNameMap)
            .then(function(result) {
                data.mibs = result;
                return self._publishSnmpCommandResult(self.routingKey, data);
            })
            .catch(function (err) {
                logger.warning("Failed to capture data through SNMP.", {
                    data: data,
                    error: err
                });
            });
        });
    };

    return SnmpJob;
}

function createMetricLabel(mibBaseType, oidSubTreeValue) {
    return mibBaseType + '-' + oidSubTreeValue;
}

function collectHostSnmp(machine, Snmptool, parser, logger, Q, _, mibNameMap) {
    var mibsToQuery = [
        //'IF-MIB::ifXTable',
        //'IF-MIB::ifTable',
        //'LLDP-MIB::lldpStatsRxPortTable',
        //'LLDP-MIB::lldpStatsTxPortTable',
        //'ENTITY-SENSOR-MIB::entPhySensorValue',

        // Raritan
        //'PDU-MIB::outletVoltage',
        //'PDU-MIB::outletCurrent',
        //'PDU-MIB::outletOperationalState'

        // APC
        //'PowerNet-MIB::rPDULoadDevMaxPhaseLoad', // max load for this PDU
        //'PowerNet-MIB::sPDUOutletCtl', // state of each outlet (1 on, 2 off)
        //'PowerNet-MIB::rPDULoadStatusLoad', // current in 10ths of amps
        //'PowerNet-MIB::rPDUIdentDeviceLinetoLineVoltage' // voltage
    ];
    var allMibs = mibsToQuery;

    var hostIp = machine.ip;
    var communityString = machine.communityString;

    var snmpTool = new Snmptool(hostIp, communityString);

    if (!_.isEmpty(machine.extensionMibs) &&
        _.isArray(machine.extensionMibs)) {
        allMibs = _.union(allMibs, _.compact(machine.extensionMibs));
    } else if (machine.extensionMibs !== undefined) {
        logger.warning("User specified MIBs are not in valid format, " +
        "expected an array of strings");
    }

    return Q.allSettled(_.map(allMibs, function (mibTableOrEntry) {
        var parsed;

        return snmpTool.walk(mibTableOrEntry)
        .then(function (mibs) {
            // First we parse all of our mibs that we got from the table.
            // If we did a walk for a mib value and not a table, it
            // shouldn't make a difference in the code...
            var allParsed = _.map(mibs[0].trim().split('\n'), function (mib) {
                // No threshold rule for now
                mib = mib.trim();
                try {
                    parsed = parser.parseSnmpData(mib);
                } catch (e) {
                    return e;
                }
                return parsed;
            });

            // Then we need to update the label names for each sample
            return _.map(allParsed, function (p) {
                var rawLabel = createMetricLabel(p.mibBaseType, p.oidSubTreeValue);
                p.metricLabel = mibNameMap[rawLabel] || rawLabel;
                return {
                    value: p.value,
                    name: p.metricLabel
                };
            });
        });
    }))
    .then(function (results) {
        _.forEach(results, function (result) {
            if (result.state !== 'fulfilled') {
                throw new Error(result.reason);
            }
        });
        return _.map(results, function(result) {
            return result.value;
        });
    });
}
