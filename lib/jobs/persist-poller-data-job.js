// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = PersistPollerDataJobFactory;
di.annotate(PersistPollerDataJobFactory, new di.Provide('Job.Persist.Poller.Data'));
di.annotate(PersistPollerDataJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Util',
    'Services.Waterline',
    '_',
    'Protocol.Task'
));

function PersistPollerDataJobFactory(BaseJob, Logger, Promise, util, waterline, _, taskProtocol) {
    var logger = Logger.initialize(PersistPollerDataJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function PersistPollerDataJob(options, context, taskId) {
        PersistPollerDataJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.pollerId = options.pollerId;
        this.nodeId = options.nodeId;
        this.interval = options.interval;
        this.duration = options.duration || 300;
        this.catalogName = options.catalogName;
        this.path = options.path;
    }

    util.inherits(PersistPollerDataJob, BaseJob);

    /**
     * @memberOf PersistPollerDataJob
     */
    PersistPollerDataJob.prototype.initJob = function () {
    	var self = this;
    	return waterline.workitems.findByIdentifier(self.pollerId)
    	.then(function(poller){
    	    if(!poller) {
    	        throw new Error('Poller ' + self.pollerId + ' is invalid.');
    	    }
    	    if(poller.node !== self.nodeId) {
    	        throw new Error('Poller ' + poller.id + ' is not associated with node ' + self.nodeId);
    	    }
            if(self.duration > 43200) {
    	        logger.info('Poller duration exceeds maximum... Setting duration to 12 hours.');
                self.duration = 43200;
    	    }
    	    logger.info('Recording Poller ' + self.pollerId + ' (' + self.catalogName + ') for ' + self.duration + ' seconds.');
    	    if(!self.interval){
    	        self.interval = poller.pollInterval/1000; // get poller interval in seconds
    	    }
    	    self.poller = poller;
    	});
    }


    /**
     * @memberOf PersistPollerDataJob
     */
    PersistPollerDataJob.prototype._run = function () {
    	var self = this;
        return Promise.resolve(this.initJob())
    	.then(function(){
    	    return self.collectPollerData();
    	})
    	.then(function(){
    	    self._done();
    	})
        .catch(function(err) {
            self._done(err);
        });
    };


    PersistPollerDataJob.prototype.handleResponse = function(result, name) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
            var dataRequested = result;
            if(self.path && self.path.length > 0){
                dataRequested = eval("result." + self.path);
            }
            var tmp = JSON.stringify(dataRequested);
            dataRequested = JSON.parse(tmp.replace(/@odata\./g, '@odata_'));
        	return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, name)
            .then(function(catalog){
                if (_.isEmpty(catalog)) {
                	logger.debug("handleResponse: Catalog (" + name + ") not found.  Creating...");
                        Promise.resolve(waterline.catalogs.create({
                            node: self.nodeId,
                            source: name,
                            data: [{value: dataRequested,
                                    timestamp: new Date().toISOString()}]
                        }));
                } else {
                	logger.debug("handleResponse: Catalog (" + name + ") found!  Updating...");
                	var newData = _.isArray(catalog.data) ? catalog.data : [catalog.data];
                	newData.push({value: dataRequested,
                                  timestamp: new Date().toISOString()});
                    Promise.resolve(waterline.catalogs.updateByIdentifier(catalog.id, {data: newData}));
                }
            })
        });
    }


    PersistPollerDataJob.prototype.collectPollerData = function(){
        var self = this;
        var intervalObj = null;
        var timeoutObj = null;
        var _duration = self.duration * 1000;
        var _interval = self.interval * 1000;

        return new Promise(function(resolve, reject){
            timeoutObj = setTimeout(function(){
                resolve();
            }, _duration);

            intervalObj = setInterval(function(response){
                return taskProtocol.requestPollerCache(self.pollerId, { latestOnly: true })
                .then(function(data){
                    self.handleResponse(data[0], self.catalogName);
                })
            }, _interval);
        })
        .finally(function(){
            logger.info('Finished persisting poller data for ' + self.pollerId + ' (' + self.catalogName + ')');
            clearInterval(intervalObj);
        });
    }


    return PersistPollerDataJob;
}
