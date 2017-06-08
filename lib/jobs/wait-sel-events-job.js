// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = waitSelEventJobFactory;
di.annotate(waitSelEventJobFactory, new di.Provide('Job.Wait.Sel.Events'));
di.annotate(waitSelEventJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline'
));

function waitSelEventJobFactory(
    BaseJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline
) {
    var logger = Logger.initialize(waitSelEventJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function waitSelEventJob(options, context, taskId) {
        waitSelEventJob.super_.call(this, logger, options, context, taskId);
        assert.arrayOfObject(options.alertFilters, 'alertFilters should an array of object');
        this.options = options;
        this.nodeId = context.target;
        this.pollerId = undefined;
        this.alertFilters = options.alertFilters;
        this.pollInterval = options.pollInterval || 60000;
        this.legacyInterval = undefined;
        this.freshAlerts = [];
    }
    util.inherits(waitSelEventJob, BaseJob);

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype._run = function run() {
        var self = this;
        return waterline.workitems.findPollers({
            node: self.nodeId,
            'config.command': 'selEntries'
        })
        .tap(function(pollers){
            self._retrievePollerInfo(pollers);
        })
        .then(function(pollers){
            return self.setSelAlertConfig(pollers[0]);
        })
        .then(function(){
            return self._subscribeSelEvent(self.pollerId, self.nodeId, self._callback.bind(self));
        })
        .catch(function(err){
            logger.error('Fail to run wait sel events', {
                node: self.nodeId,
                error: err,
                options: self.options
            });
            //self._done(err);
            self._done();
        });
    };

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype._retrievePollerInfo = function(pollers) {
        var poller;
        var existingAlerts;
        var self = this;
        if (_.isEmpty(pollers)) {
            return Promise.reject("Can't find SEL poller");
        }
        if (pollers.length !== 1) {
            return Promise.reject("Find more than one SEL poller for a node");
        }
        return Promise.try(function(){
            poller = pollers[0];
            self.pollerId = poller.id;
            self.legacyInterval = poller.pollInterval;
            existingAlerts = poller.config.alerts || [];
            _.forEach(self.alertFilters, function(alertFilter){
                var filter = _.omit(alertFilter, 'count');
                if (!filter.action || filter.action !== 'critical'){
                    filter.action = 'critical';
                }
                if (_.findIndex(existingAlerts, filter) === -1) {
                    self.freshAlerts.push(filter); //filter.action should always be critical
                }
            });
            self.pureFilters = _.map(self.alertFilters, function(alertFilter){
                return _.omit(alertFilter, ['action', 'count']);
            });
            self.eventCounts = _.map(self.alertFilters, function(alertFilter){
                return alertFilter.count || 1;
            });
        });
    };

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype.updateSelPollerConfig = function(update) {
        if (_.isEmpty(this.freshAlerts)){
            update = _.omit(update, ['$addToSet', '$pullAll']) ;
        }
        if (this.legacyInterval === this.pollInterval) {
            update = _.omit(update, '$set') ;
        }
        if (_.isEmpty(update)) {
            return Promise.resolve();
        } else if (!_.has(update, '$set')){
            //To bypass waterline validation
            update.$set = {};
        }
        var query = {_id: waterline.workitems.mongo.objectId(this.pollerId)};
        return waterline.workitems.updateMongo(query, update, {});
    };

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype.unsetSelAlertConfig = function() {
        var self = this;
        var update = {
            $pullAll: {'config.alerts': self.freshAlerts}, //May leave an empty array
            $set: {'pollInterval': self.legacyInterval}
        };
        return this.updateSelPollerConfig(update);
    };

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype.setSelAlertConfig = function() {
        var self = this;
        var update = {
            $addToSet: {'config.alerts': {$each: self.freshAlerts}},
            $set: {'pollInterval': self.pollInterval}
        };
        return self.updateSelPollerConfig(update);
    };

    /**
     * @memberOf waitSelEventJob
     */
    waitSelEventJob.prototype._callback = function(data) {
        var self = this;
        var filteringValid = _verifyFiltering(self.pureFilters, self.eventCounts, data);
        if (!filteringValid) {
            return Promise.resolve();
        }
        return self.unsetSelAlertConfig()
        .then(function(){
            self._done();
        });
    };

    /**
     * Validate events data against filtering conditions.
     * Alert filters will be validated by indexing sequence.
     * Each alert filter can includes an attribute "count" to indicate how many times this event
     * should happen continuously
     * @param {Array} filters: an array of alert filters in sequence
     * @param {Array} counts: an array of alert filters counting in sequence
     * @param {Object} data: AMQP data received
     * @return {Boolean}: true if all filtering conditions are met, false otherwise.
     */
    function _verifyFiltering(filters, counts, data) {
        var reading = data.data.alert.reading;
        if (_.isEmpty(reading)) {
            return false;
        }
        var filter = filters[0];
        var count = counts[0];
        var matched = true;
        _.map(filter, function(value, key){
            if (data.data.alert.reading[key] !== value) {
                matched = false;
            }
        });
        if (matched) {
            count = count - 1;
            if (count === 0){
                filters.shift();
                counts.shift();
            } else {
                counts[0] = count;
            }
        }
        if (_.isEmpty(filters)){
            return true;
        }
        return false;
    }

    return waitSelEventJob;
}
