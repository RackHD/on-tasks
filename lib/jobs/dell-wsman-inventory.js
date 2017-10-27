// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanInventoryJobFactory;
di.annotate(DellWsmanInventoryJobFactory, new di.Provide('Job.Dell.Wsman.Inventory'));
di.annotate(DellWsmanInventoryJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'Logger',
    'Promise',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    'Services.Configuration',
    '_',
    'JobUtils.WsmanTool',
    'Errors',
    'uuid'
));

function DellWsmanInventoryJobFactory(
    BaseJob,
    Logger,
    Promise,
    util,
    waterline,
    encryption,
    configuration,
    _,
    WsmanTool,
    errors,
    uuid
) {
    var logger = Logger.initialize(DellWsmanInventoryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanInventoryJob(options, context, taskId) {
        DellWsmanInventoryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.target = {};
        this.nodeId = this.context.target;
        this.inventories = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
    }

    util.inherits(DellWsmanInventoryJob, BaseJob);

    /**
     * @memberOf DellWsmanInventoryJob
     */
    DellWsmanInventoryJob.prototype._initJob = function () {
        var self = this;
        return self.checkOBM('Inventory')
        .then(function(obm) {
            self.dellConfigs = configuration.get('dell');
            // obm 'host' contains ip address of node.  We need ip:port of inventory web service
            if (!self.dellConfigs || !self.dellConfigs.services.inventory) {
                throw new errors.NotFoundError('Dell Inventory web service is not defined in wsmanConfig.json.');
            }

            self.wsman = new WsmanTool(self.dellConfigs.gateway, {
                verifySSL: self.options.verifySSL || false,
                recvTimeoutMs: 300000
            });
            return self.getIpAddress(obm)
            .then(function(ipAddr){
                if(!ipAddr) { throw new errors.NotFoundError('No target IP address.'); }
                //logger.debug("OBM-initJob Target IP Address for inventory job: " + ipAddr);
                self.target = {
                    address: ipAddr,
                    userName: obm.config.user,
                    password: encryption.decrypt(obm.config.password)
                };
                if(self.nodeType === 'enclosure'){
                    self.inventories = ['details'];
                } else if(self.nodeType === 'compute'){
                    self.inventories = ['hardware', 'software', 'nics', 'manager'];
                } else {
                    throw new Error('Inventory collection for node type (' + self.nodeType + ') is not implemented.');
                }
                self.retrys = self.inventories.slice();
            });
        });
    };

    DellWsmanInventoryJob.prototype.inventoryCallback = function inventoryCallback(data){
        var self = this;
        logger.debug('Got callback for NODE: ' + self.nodeId + ' TYPE: ' + data.type);
        var body = data.data.body || data.data;
        return self.handleAsyncResponse(body, data.type)
        .then(function(){
            self._handleAsyncRequest();
        });
     };

     DellWsmanInventoryJob.prototype._handleAsyncRequest = function() {
          var self = this;
          var type = '';
          if(self.inventories.length === 0){
              logger.info('Completed INVENTORY collection for (' + self.nodeType + ') node: ' + self.nodeId);
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
          if(self.nodeType === 'compute'){
              requestUri = self.dellConfigs.services.inventory.serverCallback;
            if(type === 'manager'){  // special case for manager endpoint - use 2.0 api
                requestUri = requestUri.replace(/1.0/, '2.0');
            }
          } else if(self.nodeType === 'enclosure'){
              requestUri = self.dellConfigs.services.inventory.chassisCallback;
          }
        self._subscribeHttpResponseUuid(self.inventoryCallback, callbackIdentifier);
        return self.wsman.clientRequest(requestUri, 'POST', request)
        .then(function(response) {
          if(response.body.response.indexOf('Submitted') === -1){
                logger.error(type.toUpperCase() + ' inventory request failed for node: ' + self.nodeId);
            }
        })
        .catch(function(){
               logger.error('Inventory request error for node: ' + self.nodeId);
        });
    };

    DellWsmanInventoryJob.prototype.handleAsyncResponse = function(result, name) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
            if(!result || _.isEmpty(result)){
                var index = self.retrys.indexOf(name);
                if( index !== -1){
                    self.inventories.push(self.retrys.splice(index, 1)[0]);
                    throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' inventory is invalid.  Scheduling ONE retry...');
                } else {
                    throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' inventory is invalid.  No catalog created.');
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

    return DellWsmanInventoryJob;
}
