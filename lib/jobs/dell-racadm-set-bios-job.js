// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = racadmSetBIOSJobFactory;
di.annotate(racadmSetBIOSJobFactory, new di.Provide('Job.DellRacadm.SetBIOS'));
di.annotate(racadmSetBIOSJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.RacadmTool',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Encryption',
    'Services.Lookup',
    'Constants',
    'Services.Waterline'
));

function racadmSetBIOSJobFactory(
    BaseJob,
    racadmTool,
    Logger,
    util,
    assert,
    Promise,
    _,
    encryption,
    lookup,
    Constants,
    waterline
) {
    var logger = Logger.initialize(racadmSetBIOSJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RacadmSetBiosJob(options, context, taskId) {
        RacadmSetBiosJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.cifsInfo = {user: options.username, password: options.password ,
            filePath: options.filePath};

    }
    util.inherits(RacadmSetBiosJob, BaseJob);

    /**
     * @memberOf RacadmSetBiosJob
     */
    RacadmSetBiosJob.prototype._run = function() {
        var self = this;
        waterline.nodes.findByIdentifier(self.nodeId)
            .then(function (node) {
                assert.ok(node, 'No node for dell racadm set bios');
                var obmSetting = _.find(node.obmSettings, { service: 'ipmi-obm-service' });
                assert.ok(obmSetting, 'No ipmi obmSetting for dell racadm set bios');
                return obmSetting.config;
            })
            .then(self.revealSecrets)
            .then(self.lookupHost)
            .then(function(obmSetting) {
                return racadmTool.setBiosConfig(obmSetting.host, obmSetting.user,
                    obmSetting.password,
                    self.cifsInfo);
            })
            .then(function(results){
                logger.log(results.status);
                self._done();
            })
            .catch(function(err) {
                logger.error('Setting BIOS with Dell racadm tool failed!', {error: err});
                self._done(err);
            });

    };

    RacadmSetBiosJob.prototype.revealSecrets = function revealSecrets (options) {
        if (options.password) {
            options.password = encryption.decrypt(options.password);
        }

        if (options.community) {
            options.host = encryption.decrypt(options.community);
        }
        return options;
    };

    RacadmSetBiosJob.prototype.lookupHost = function lookupHost (options) {
        if (options.host && Constants.Regex.MacAddress.test(options.host)) {
            return lookup.macAddressToIp(options.host).then(function (ipAddress) {
                options.host = ipAddress;
                return options;
            });
        }

        return options;
    };


    return RacadmSetBiosJob;
}

