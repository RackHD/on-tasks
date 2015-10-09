// Copyright 2015, EMC, Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = pingPollerAlertJobFactory;
di.annotate(pingPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Ping'));
di.annotate(pingPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    'Constants',
    '_'
));
function pingPollerAlertJobFactory(
    PollerAlertJob,
    Logger,
    util,
    assert,
    Promise,
    Constants,
    _
) {
    var logger = Logger.initialize(pingPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function PingPollerAlertJob(options, context, taskId) {
        assert.object(context);
        assert.uuid(context.graphId);

        this.lastState = Constants.NetworkStates.Disconnected;
        this.becomeDisConn = false;
        this.becomeDisConnTime = new Date();
        this.currentState = '';
        this.maxAlertReportTime = 60000 * 10;   //alert if disconnected exceeds 10min

        var subscriptionArgs = [context.graphId, 'ping'];

        PingPollerAlertJob.super_.call(this, logger, options, context, taskId,
                '_subscribeCommonCommandResult', subscriptionArgs);

    }
    util.inherits(PingPollerAlertJob, PollerAlertJob);

    PingPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        var self = this;
        var alerts = {};

        return Promise.resolve()
        .then(function() {
            if (!data) {
                return;
            }

            if (data.ping['packet loss'] === '0%') {
                self.currentState = Constants.NetworkStates.Connected;
            } else if (data.ping['packet loss'] === '100%') {
                self.currentState = Constants.NetworkStates.Disconnected;
            } else {
                self.currentState = Constants.NetworkStates.Unstable;
            }

            /*  Having 3 states every time, and 9 cases need to handle,
             *  only take care of disconnection here
             *
             *  lastState:connected, currentState:connected
             *  -> clear "becomeDisConn"
             *
             *  lastState:disconnected/unstable, currentState:connected
             *  -> clear "becomeDisConn", alert it's connected
             *
             *  lastState:connected/disconnected/unstable, currentState:unstable
             *  -> clear "becomeDisConn", alert it's unstable
             *
             *  lastState:connected/unstable, currentState:disconnected
             *  -> mark "becomeDisConn" to true, and record the time
             *     alert it's disconnected
             *
             *  lastState:disconnected, currentState:disconnected
             *  -> calculate disconnection duration, if it exceeds maxAlertReportTime,
             *     the node is mostly removed. propose remove the node manually.
             */

            switch (self.currentState) {
                case Constants.NetworkStates.Connected:
                    switch (self.lastState) {
                        case Constants.NetworkStates.Connected:
                            self.becomeDisConn = false;
                            break;

                        case Constants.NetworkStates.Disconnected:
                            //fall through
                        case Constants.NetworkStates.Unstable:
                            self.becomeDisConn = false;
                            alerts = {
                                'node':         data.node,
                                'connection':   Constants.NetworkStates.Connected
                            };
                            break;

                        default:
                            throw new Error("unsupported state:" + self.lastState);
                    }
                    break;

                case Constants.NetworkStates.Disconnected:
                    switch (self.lastState) {
                        case Constants.NetworkStates.Unstable:
                            //fall through
                        case Constants.NetworkStates.Connected:
                            self.becomeDisConn = true;
                            self.becomeDisConnTime = new Date();
                            alerts = {
                                'node':         data.node,
                                'connection':   Constants.NetworkStates.Disconnected
                            };
                            break;

                        case Constants.NetworkStates.Disconnected:
                            if (self.becomeDisConn) {
                                var expiry = (new Date()) - self.becomeDisConnTime;
                                if (expiry >= (self.maxAlertReportTime)) {
                                    self.becomeDisConn = false;
                                    var alertString = "disconnected exceeds " +
                                        self.maxAlertReportTime/60000 + " minutes," +
                                        "this node may has been removed";
                                    alerts = {
                                        'node':         data.node,
                                        'connection':   alertString
                                    };
                                }
                            }
                            break;

                        default:
                            throw new Error("unsupported state:" + self.lastState);
                    }
                    break;

                case Constants.NetworkStates.Unstable:
                    switch (self.lastState) {
                        case Constants.NetworkStates.Connected:
                            //fall through
                        case Constants.NetworkStates.Disconnected:
                            //fall through
                        case Constants.NetworkStates.Unstable:
                            self.becomeDisConn = false;
                            alerts = {
                                'node':         data.node,
                                'connection':   Constants.NetworkStates.Unstable
                            };
                            break;

                        default:
                            throw new Error("unsupported state:" + self.lastState);
                    }
                    break;

                default:
                    throw new Error("unsupported state:" + self.currentState);
            }

            self.lastState = self.currentState;

            return _.isEmpty(alerts) ? null : alerts;
        });
    };

    return PingPollerAlertJob;
}
