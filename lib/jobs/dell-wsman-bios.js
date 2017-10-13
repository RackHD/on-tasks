// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanBiosJobFactory;
di.annotate(DellWsmanBiosJobFactory, new di.Provide('Job.Dell.Wsman.Bios'));
di.annotate(DellWsmanBiosJobFactory, new di.Inject(
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
    'Errors',
    'uuid'
));

function DellWsmanBiosJobFactory(
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
    errors,
    uuid
) {
    var logger = Logger.initialize(DellWsmanBiosJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanBiosJob(options, context, taskId) {
        DellWsmanBiosJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.target = {};

        assert.object(this.options);
        this.nodeId = this.context.target;
        this.inventories = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
    }

    util.inherits(DellWsmanBiosJob, BaseJob);

    /**
     * @memberOf DellWsmanBiosJob
     */
    DellWsmanBiosJob.prototype._initJob = function () {
        var self = this;
        return self.checkOBM('BIOS inventory')
        .then(function(obm) {
            // obm 'host' contains ip address of node.  We need ip:port of bios web service
            //var parse = urlParse(obm.config.host);
            self.dellConfigs = configuration.get('dell');
            if (!self.dellConfigs || !self.dellConfigs.services.inventory.bios) {
                throw new errors.NotFoundError('Dell Configuration (BIOS) web service is not defined in wsmanConfig.json.');
            }

            self.wsman = new WsmanTool(self.dellConfigs.gateway, {
                verifySSL: self.options.verifySSL || false,
                recvTimeoutMs: 300000
            });

            return self.getIpAddress(obm)
            .then(function(ipAddr){
                if(!ipAddr) { throw new errors.NotFoundError('No target IP address.'); }
                logger.debug("OBM-initJob Target IP Address for BIOS job: " + ipAddr);
                self.target = {
                    address: ipAddr,
                    userName: obm.config.user,
                    password: encryption.decrypt(obm.config.password)
                };
                self.inventories = ['bios', 'boot'];
                self.retrys = self.inventories.slice();
            });
        });
    };

    DellWsmanBiosJob.prototype.biosCallback = function(data){
       var self = this;
       logger.debug('Got biosCallback for NODE: ' + self.nodeId + ' TYPE: ' + data.type);
       return self.handleAsyncResponse(data.data, data.type)
       .then(function(){
           self._handleAsyncRequest();
       });
    };

    DellWsmanBiosJob.prototype._handleAsyncRequest = function() {
        var self = this;
        var type = '';
        if(self.inventories.length === 0){
            return self._done();
        } else {
            type = self.inventories.shift();
        }

        var rackHdCallback = self.dellConfigs.wsmanCallbackUri;
        var callbackIdentifier = uuid.v4();
        var callback = rackHdCallback.replace(/_IDENTIFIER_/, callbackIdentifier);
        var request = {
            credential: self.target,
            callbackUri: callback,
            type: type
        };

        var requestUri = '';
        requestUri = self.dellConfigs.services.inventory.serverCallback;
        self._subscribeHttpResponseUuid(self.biosCallback, callbackIdentifier);

        return self.wsman.clientRequest(requestUri, 'POST', request)
        .then(function(response) {
            if(response.body.response.indexOf('Submitted') === -1){
                logger.error(type.toUpperCase() + ' bios/boot request failed for node: ' + self.nodeId);
            }
        })
        .catch(function(){
            logger.error('Bios/Boot request error for node: ' + self.nodeId);
        });
    };

    DellWsmanBiosJob.prototype.handleAsyncResponse = function(result, name) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
            if(!result || _.isEmpty(result)){
                var index = self.retrys.indexOf(name);
                if( index !== -1){
                    self.inventories.push(self.retrys.splice(index, 1));
                    throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' data is invalid.  Scheduling ONE retry...');
                } else {
                    throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' data is invalid.  No catalog created.');
                }
            }

            return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, name)
            .then(function(catalog){
                if (_.isEmpty(catalog)) {
                    logger.debug("handleAsyncResponse: Catalog (" + name + ") not found.  Creating...");
                    return waterline.catalogs.create({
                        node: self.nodeId,
                        source: name,
                        data: result
                    });
                } else {
                    logger.debug("handleAsyncResponse: Catalog (" + name + ") found!  Updating...");
                    return waterline.catalogs.updateByIdentifier(catalog.id, {data: result});
                }
            });
        }).catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: self.nodeId,
                taskContext: self.context
            });
        });
    };

    return DellWsmanBiosJob;
}
