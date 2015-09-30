// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var di = require('di');

module.exports = commonNetworkJobFactory;
di.annotate(commonNetworkJobFactory, new di.Provide('Job.Common.Network.Command'));
di.annotate(commonNetworkJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.CommonNetworkTool',
    'JobUtils.CommonNetworkCommandParser',
    'Logger',
    'Util',
    'Assert',
    '_',
    'Services.Waterline'
));

function commonNetworkJobFactory(
    BaseJob,
    CommonNetworkTool,
    parser,
    Logger,
    util,
    assert,
    _,
    waterline
) {
    var logger = Logger.initialize(commonNetworkJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CommonNetworkJob(options, context, taskId) {
        CommonNetworkJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = this.context.graphId;
        assert.uuid(this.routingKey) ;

        this.concurrent = {};
    }
    util.inherits(CommonNetworkJob, BaseJob);

    CommonNetworkJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;
        return waterline.workitems.update({name: "Pollers.COMMON"}, {failureCount: 0})
            .then(function () {
                self._subscribeRunCommonCommand(self.routingKey, 'ping', self.pingCallback);
            })
            .catch(function(err) {
                logger.error("Failed to initialize job", { error:err });
                self._done(err);
            });
    };

    CommonNetworkJob.prototype.concurrentRequests = function(host, type) {
        assert.string(host);
        assert.string(type);

        if (!_.has(this.concurrent, host)) {
            this.concurrent[host] = {
                ping: 0
            };
        }
        if (this.concurrent[host][type] > 0) {
            return true;
        } else {
            return false;
        }
    };

    CommonNetworkJob.prototype.addConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] += 1;
    };

    CommonNetworkJob.prototype.removeConcurrentRequest = function(host, type) {
        assert.object(this.concurrent[host]);
        assert.number(this.concurrent[host][type]);
        this.concurrent[host][type] -= 1;
    };

    CommonNetworkJob.prototype.pingCallback = function(data) {
        var self = this;

        if (self.concurrentRequests(data.host, 'ping')) {
            return;
        }

        self.addConcurrentRequest(data.host, 'ping');
        return self.collectCommonCommandPing(data)
        .then(function(result) {
            data.ping = result;
            return self._publishCommonCommandResult(self.routingKey, 'ping', data);
        })
        .catch(function (err) {
            logger.error("Failed to capture ping data.", {
                data: data,
                error: err
            });
        })
        .finally(function() {
            self.removeConcurrentRequest(data.host, 'ping');
        });
    };

    CommonNetworkJob.prototype.collectCommonCommandPing = function(machine) {
        var commonNetworkTool = new CommonNetworkTool();

        return commonNetworkTool.ping(machine.host)
        .then(function (data) {
            return parser.parsePingData(data.stdout);
        });
    };

    return CommonNetworkJob;
}
