// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = racadmToolJobFactory;
di.annotate(racadmToolJobFactory, new di.Provide('Job.Dell.RacadmTool'));
di.annotate(racadmToolJobFactory, new di.Inject(
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

function racadmToolJobFactory(
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
    var logger = Logger.initialize(racadmToolJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function racadmToolJob(options, context, taskId) {
        racadmToolJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.action = options.action;
        this.cifsInfo = {user: options.server_username, password: options.server_password ,
            filePath: options.server_filePath};
    }
    util.inherits(racadmToolJob, BaseJob);

    /**
     * @memberOf racadmToolJob
     */
    racadmToolJob.prototype._run = function() {
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
                if (self.action === 'SetBIOS'){
                    return racadmTool.setBiosConfig(obmSetting.host, obmSetting.user,
                        obmSetting.password,
                        self.cifsInfo);
                } else if (self.action === 'UpdateFirmware'){
                    return racadmTool.updateFirmware(obmSetting.host, obmSetting.user,
                        obmSetting.password,
                        self.cifsInfo);
                }else if (self.action === 'GetBIOS'){
                    return racadmTool.getBiosConfig(obmSetting.host, obmSetting.user,
                        obmSetting.password,
                        self.cifsInfo);}else{
                    throw new Error('The action specified is not supported!.');
                }
            })
            .then(function(results){
                logger.debug(results.status);
                self._done();
            })
            .catch(function(err) {
                if (self.action === 'SetBIOS') {
                    logger.error('Setting BIOS with racadm tool failed!', {error: err});
                }else if(self.action === 'UpdateFirmware') {
                    logger.error('Updating Idrac image with racadm tool failed!', {error: err});
                }else if(self.action === 'GetBIOS') {
                    logger.error('Getting BIOS with racadm tool failed!', {error: err});
                }
                else{
                    err = new Error('The action specified is not supported!.');
                }
                self._done(err);
            });

    };

    racadmToolJob.prototype.revealSecrets = function revealSecrets (options) {
        if (options.password) {
            options.password = encryption.decrypt(options.password);
        }

        if (options.community) {
            options.host = encryption.decrypt(options.community);
        }
        return options;
    };

    racadmToolJob.prototype.lookupHost = function lookupHost (options) {
        if (options.host && Constants.Regex.MacAddress.test(options.host)) {
            return lookup.macAddressToIp(options.host).then(function (ipAddress) {
                options.host = ipAddress;
                return options;
            });
        }

        return options;
    };
    return racadmToolJob;
}
