// Copyright 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

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
        'Assert'));

function ucsBaseJobFactory(
    BaseJob,
    Logger,
    util,
    Promise,
    UcsTool,
    _,
    assert
) {
    function UcsBaseJob(logger, options, context, taskId) {
        UcsBaseJob.super_.call(this, logger, options, context, taskId);

        var _ucstoolInstance = null;
        this._getUcsToolInstance = function() {
            if (!_ucstoolInstance) {
                _ucstoolInstance = new UcsTool();
            }
            return _ucstoolInstance;
        };
    }
    util.inherits(UcsBaseJob, BaseJob);

    UcsBaseJob.prototype._run = function() {};

    UcsBaseJob.prototype._ucsRequest = function(url, settings) {
        var self = this;
        var ucsTool = self._getUcsToolInstance();
        ucsTool.settings = settings;
        return ucsTool.clientRequest(url);
    };

    UcsBaseJob.prototype._ucsRequestAsync = function(url, settings, taskId) {
        var self = this;
        assert.ok(taskId);
        return self._ucsRequest(url, settings)
            .then(function(res) {
                if (res && res.body && res.body.toUpperCase() !== "ACCEPTED") {
                    throw new Error(
                        "Request was not ACCEPTED. Please check input parameters.");
                }
                return self._subscribeHttpResponseUuidByPromisify(taskId);
            });
    };

    UcsBaseJob.prototype._subscribeHttpResponseUuidByPromisify = function(id) {
        var self = this;
        var nodeCallback = function(id, callback) {
            self._subscribeHttpResponseUuid(function(data) {
                return callback.call(self, null, data);
            }, id);
        };

        var promisify = Promise.promisify(nodeCallback);
        return promisify(id);
    };

    return UcsBaseJob;
}
