// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanTrapConfigJobFactory;
di.annotate(DellWsmanTrapConfigJobFactory, new di.Provide('Job.Dell.Wsman.GetTrapConfig'));
di.annotate(DellWsmanTrapConfigJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    'Services.Configuration',
    '_',
    'JobUtils.WsmanTool',
    'Errors'
));

function DellWsmanTrapConfigJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    configuration,
    _,
    WsmanTool,
    errors
) {
    var logger = Logger.initialize(DellWsmanTrapConfigJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanTrapConfigJob(options, context, taskId) {
        DellWsmanTrapConfigJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.target = {};

        assert.object(this.options);
        this.nodeId = this.context.target;
        this.wsman = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
    }

    util.inherits(DellWsmanTrapConfigJob, BaseJob);

    /**
     * @memberOf DellWsmanTrapConfigJob
     */
    DellWsmanTrapConfigJob.prototype._initJob = function () {
        var self = this;
        return self.checkOBM('Trap configuration')
        .then(function(obm) {
            // obm 'host' contains ip address of node.  We need ip:port of bios web service
            //var parse = urlParse(obm.config.host);
            self.dellConfigs = configuration.get('dell');
            if (!self.dellConfigs || !self.dellConfigs.services.configuration) {
                throw new errors.NotFoundError('Dell Trap Configuration web service is not defined in smiConfig.json.');
            }

            self.wsman = new WsmanTool(self.dellConfigs.gateway, {
                verifySSL: self.options.verifySSL || false,
                recvTimeoutMs: 300000
            });

               return self.getIpAddress(obm)
               .then(function(ipAddr){
                   if(!ipAddr) { throw new errors.NotFoundError('No target IP address.'); }
                   logger.debug("OBM-initJob Target IP Address for Trap config job: " + ipAddr);
                   self.target = {
                       address: ipAddr,
                    userName: obm.config.user,
                       password: encryption.decrypt(obm.config.password)
                   };
            });
        });
    };

    /**
     * @memberOf DellWsmanTrapConfigJob
     */
    DellWsmanTrapConfigJob.prototype._handleSyncRequest = function() {
        var self = this;
        var dell = configuration.get('dell');

        return self.wsman.clientRequest(dell.services.configuration.configureTraps, 'POST', self.target)
        .then(function(response) {
            logger.debug('CONFIG TRAP RESPONSE : ' + JSON.stringify(response,null,4));
            if(response.body.response.indexOf('Successfully') === -1){
                  logger.error(' config trap request failed for node: ' + self.nodeId);
              }
        })
        .then(function() {
            return self.wsman.clientRequest(dell.services.configuration.updateTrapFormat, 'POST', self.target)
            .then(function(response) {
                logger.debug('CONFIG FORMAT RESPONSE : ' + JSON.stringify(response,null,4));
                if(response.body.response.indexOf('Successfully') === -1){
                  logger.error(' update trap format request failed for node: ' + self.nodeId);
              }
            });
        });
      };

    return DellWsmanTrapConfigJob;
}
