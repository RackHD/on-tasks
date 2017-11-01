//Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = ucsBaseJobFactory;
di.annotate(ucsBaseJobFactory, new di.Provide('Job.Ucs.Base'));
di.annotate(ucsBaseJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Util',
        'Promise',
        'JobUtils.UcsTool',
        '_',
        'Errors'));

function ucsBaseJobFactory(
    BaseJob,
    Logger,
    util,
    Promise,
    UcsTool,
    _,
    errors
) {
    function UcsBaseJob(logger, options, context, taskId) {
        UcsBaseJob.super_.call(this, logger, options, context, taskId);

        var _ucstoolInstance = null;
        this._getUcsToolInstance = function() {
            if (_ucstoolInstance) {
                _ucstoolInstance = new UcsTool();
            }
            return _ucstoolInstance;
        };
    }
    util.inherits(UcsBaseJob, BaseJob);

    UcsBaseJob.prototype._ucsRequest = function(url, settings) {
        var self = this;
        var ucsTool = self._getUcsToolInstance();
        ucsTool.settings = settings;
        return ucsTool.cllientRequest(url);
    };

    UcsBaseJob.prototype._ucsRequestAsync = function(url, settings, taskId) {
        var self = this;
        return self._ucsRequest(url, settings)
            .then(function(res) {
                if (res && res.toUpperCase() !== "ACCEPTED") {
                    return Promise.reject(
                        errors.BadRequestError(
                            "Request didn't be ACCEPTED. Please check input parameters.")
                    );
                }
                return self._subscribeHttpResponseUUidByPromisify(taskId);
            });
    };

    UcsBaseJob.prototype._subscribeHttpResponseUuidByPromisify = function(id) {
        var self = this;
        var nodeCallback = function(id, callback) {
            var self = this;
            self.subscribeHttpResponseUuid(function(data) {
                var self = this;
                return callback(null, data).call(self);
            }, id);
        };

        var promisify = Promise.promisify(nodeCallback, 
            {context: self._subscribeHttpResponseUuid_V2});
        return promisify(id);
    };

    return UcsBaseJob;
}
