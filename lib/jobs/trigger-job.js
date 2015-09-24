// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = triggerJobFactory;
di.annotate(triggerJobFactory, new di.Provide('Job.Trigger'));
di.annotate(triggerJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util'
    )
);
function triggerJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(triggerJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function TriggerJob(options, context, taskId) {
        TriggerJob.super_.call(this, logger, options, context, taskId);

        assert.string(options.triggerMode);
        assert.string(options.triggerGroup);
        assert.string(options.triggerType);
        assert.uuid(context.graphId);

        this.triggerMode = options.triggerMode;
        this.triggerGroup = options.triggerGroup;
        this.triggerType = options.triggerType;
        this.routingKey = context.graphId;
    }
    util.inherits(TriggerJob, BaseJob);

    /**
     * @memberOf TriggerJob
     */
    TriggerJob.prototype._run = function() {
        if (this.triggerMode === 'send') {
            this._publishTrigger(this.routingKey, this.triggerType, this.triggerGroup)
            .then(this._done.bind(this))
            .catch(this._done.bind(this));
        } else if (this.triggerMode === 'receive') {
            this._subscribeTrigger(
                this.routingKey,
                this.triggerType,
                this.triggerGroup,
                function() {
                    this._done();
                }
            );
        }
    };

    return TriggerJob;
}
