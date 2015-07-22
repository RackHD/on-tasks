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

        this.concurrent = {};
    }
    util.inherits(IpmiJob, BaseJob);

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention

        // BaseJob._subscribeRunIpmiCommand will bind these callbacks to this
        this._subscribeRunIpmiCommand(this.routingKey, 'power', this.ipmiPowerCallback);
        this._subscribeRunIpmiCommand(this.routingKey, 'sel', this.ipmiSelCallback);
        this._subscribeRunIpmiCommand(this.routingKey, 'sdr', this.ipmiSdrCallback);
        this._subscribeRunIpmiCommand(this.routingKey, 'uid', this.ipmiUidCallback);
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
                power: 0,
                sdr: 0,
                sel: 0,
                uid: 0
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

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.ipmiPowerCallback = function(data) {
        var self = this;
        if (!data.host || !data.user || !data.password) {
            return;
        }
        if (self.concurrentRequests(data.host, 'power')) {
            return;
        }
        self.addConcurrentRequest(data.host, 'power');
        return ipmitool.powerStatus(data.host, data.user, data.password)
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
        .finally(function() {
            self.removeConcurrentRequest(data.host, 'power');
        });
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.ipmiUidCallback = function(data) {
        var self = this;
        if (!data.host || !data.user || !data.password) {
            return;
        }
        if (self.concurrentRequests(data.host, 'uid')) {
            return;
        }
        self.addConcurrentRequest(data.host, 'uid');
        return self.collectIpmiUid(data)
        .then(function(result) {
            data.uid = result
            return self._publishIpmiCommandResult(self.routingKey, 'uid', data);
        })
        .catch(function (err) {
            logger.error("Failed to capture IPMI uid LED data.", {
                data: data,
                error: err
            });
        })
        .finally(function() {
            self.removeConcurrentRequest(data.host, 'uid');
        });
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.ipmiSelCallback = function(data) {
        var self = this;
        if (!data.host || !data.user || !data.password) {
            return;
        }
        if (self.concurrentRequests(data.host, 'sel')) {
            return;
        }
        self.addConcurrentRequest(data.host, 'sel');
        var defaultSelCount = 25;
        return self.collectIpmiSel(data, defaultSelCount)
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
        .finally(function() {
            self.removeConcurrentRequest(data.host, 'sel');
        });
    };

    /**
     * @memberOf IpmiJob
     */
    IpmiJob.prototype.ipmiSdrCallback = function(data) {
        var self = this;
        if (!data.host || !data.user || !data.password) {
            return;
        }
        if (self.concurrentRequests(data.host, 'sdr')) {
            return;
        }
        self.addConcurrentRequest(data.host, 'sdr');
        return self.collectIpmiSdr(data)
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
        .finally(function() {
            self.removeConcurrentRequest(data.host, 'sdr');
        });
    };

    /**
     * Collect SEL data from IPMI
     * @memberOf IpmiJob
     *
     * @param machine
     * @param ipmitool
     * @param parser
     */
    IpmiJob.prototype.collectIpmiSel = function(data, count) {
        return ipmitool.selList(data.host, data.user, data.password, count)
        .then(function (sel) {
            return parser.parseSelData(sel);
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
     * Collect uid LED data from IPMI
     * @memberOf IpmiJob
     *
     * @param machine
     */
    IpmiJob.prototype.collectIpmiUid = function(data) {
        return ipmitool.chassisStatus(data.host, data.user, data.password)
        .then(function (status) {
            return parser.parseUidData(status);
        });
    };

    return IpmiJob;
}
