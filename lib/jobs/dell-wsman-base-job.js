// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanBaseJobFactory;
di.annotate(DellWsmanBaseJobFactory, new di.Provide('Job.Dell.Wsman.Base'));
di.annotate(DellWsmanBaseJobFactory, new di.Inject(
    'Job.Base',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'Errors'
));

function DellWsmanBaseJobFactory(
    BaseJob,
    Promise,
    assert,
    util,
    waterline,
    configuration,
    _,
    errors
) {
    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanBaseJob(logger, options, context, taskId) {
        var self = this;
        assert.func(self._initJob);

        DellWsmanBaseJob.super_.call(self,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        self.logger = logger;

        assert.object(self.options);
        self.nodeId = self.context.target;
    }

    util.inherits(DellWsmanBaseJob, BaseJob);

    /**
     * @memberOf DellWsmanBaseJob
     */
    DellWsmanBaseJob.prototype._run = function () {
        var self = this;
        return Promise.try(function() {
            return self._initJob();
        })
        .then(function() {
            if(_.isFunction(self._handleSyncRequest)) {
                return self._handleSyncRequest()
                .then(function(response) {
                    if(_.isFunction(self._handleSyncResponse)) {
                        return self._handleSyncResponse(response);
                    }
                })
                .then(function() {
                    return self._done();
                });
            } else if(_.isFunction(self._handleAsyncRequest)) {
                return self._handleAsyncRequest();
            } else {
                return self._done();
            }
        })
        .catch(function(err) {
            return self._done(err);
        });
    };

    DellWsmanBaseJob.prototype.getIpAddress = function(obm){
        var self = this;
        if(obm.config.host) {
            return Promise.resolve(obm.config.host);
        } else {
            return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'DeviceSummary')
            .then(function(catalog){
                if (!_.isEmpty(catalog)) {
                    return catalog.data.id;
                } else {
                    return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'bmc')
                    .then(function(catalog){
                        if (!_.isEmpty(catalog)) {
                            return catalog.data['Ip Address'];
                        } else {
                            return undefined;
                        }
                    });
                }
            });
        }
    };

    DellWsmanBaseJob.prototype.checkOBM = function(jobDesc) {
        var self = this;
        self.logger.info('checkOBM: Self.nodeID: ' + self.nodeId);
        return waterline.nodes.findByIdentifier(self.nodeId)
        .then(function(result) {
            self.nodeType = result.type;
            if (self.nodeType !== 'compute') {
                self.logger.info(jobDesc + ' is not applicable to node type ' + self.nodeType);
                return self.cancel();
            }
            return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true);
        }).then(function(obm) {
            if (!obm) {
                throw new errors.NotFoundError('Failed to find Wsman obm settings');
            }
            return obm;
        });
    };

    /*
    *   Print the result for RestAPI Response
    */
    DellWsmanBaseJob.prototype.printResult = function (result) {
        this.logger.debug(JSON.stringify(result, null, 4));
    };

    return DellWsmanBaseJob;
}
