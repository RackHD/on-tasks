// Copyright 2016, EMC, Inc.

'use strict';

module.exports = conditionJobFactory;
var di = require('di');

di.annotate(conditionJobFactory, new di.Provide('Job.Evaluate.Condition'));
di.annotate(conditionJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert'
    )
);

function conditionJobFactory(
        BaseJob,
        util,
        Logger,
        assert
) {
    var logger = Logger.initialize(conditionJobFactory);

     function ConditionJob(options, context, taskId) {
        ConditionJob.super_.call(this, logger, options, context, taskId);
        assert.string(options.when);
    }
    util.inherits(ConditionJob, BaseJob);

    /**
     * @memberOf ConditionJob
     */
    ConditionJob.prototype._run = function run() {
        var when = this.options.when.toLowerCase();
        if( when === 'true' ) {
            return this._done();
        }
        this._done(new Error('condition evaluated to false'));
    };

    return ConditionJob;
}
