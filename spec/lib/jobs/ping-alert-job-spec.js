// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var _;
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/common-network-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ping-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js'),
        ]);

        _ = helper.injector.get('_');
        context.parser = helper.injector.get('JobUtils.CommonNetworkCommandParser');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ping');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ping-alert-job", function() {
        var dataDisconnected,
            dataConnected,
            dataUnstable,
            alertJob;

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            dataConnected = {
                host: 'host',
                user: 'user',
                password: 'pass',
                workItemId: '54d6cdff8db79442ddf33333',
                node: '560022c2c5ac58132c5d3cc5',
                ping: { 'packet loss': '0%' }
            };

            dataDisconnected = {
                host: 'host',
                user: 'user',
                password: 'pass',
                workItemId: '54d6cdff8db79442ddf33333',
                node: '560022c2c5ac58132c5d3cc5',
                ping: { 'packet loss': '100%' }
            };

            dataUnstable = {
                host: 'host',
                user: 'user',
                password: 'pass',
                workItemId: '54d6cdff8db79442ddf33333',
                node: '560022c2c5ac58132c5d3cc5',
                ping: { 'packet loss': '50%' }
            };

            alertJob = new this.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());

        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it("should alert when bmc is connected from disconnected", function() {
            //default state is 'disconnected'
            return alertJob._determineAlert(dataConnected)
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataConnected.node);
                expect(out).to.have.property('connection').that.equals('connected');
            });
        });

        it("should alert when bmc is connected from unstable", function() {
            return alertJob._determineAlert(dataUnstable)
            .then(function() {
                return alertJob._determineAlert(dataConnected);
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataConnected.node);
                expect(out).to.have.property('connection').that.equals('connected');
            });
        });

        it("should alert when bmc is disconnected from connected", function() {
            return alertJob._determineAlert(dataConnected)
            .then(function() {
                return alertJob._determineAlert(dataDisconnected);
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataDisconnected.node);
                expect(out).to.have.property('connection').that.equals('disconnected');
            });
        });

        it("should alert when bmc is disconnected from unstable", function() {
            return alertJob._determineAlert(dataUnstable)
            .then(function() {
                return alertJob._determineAlert(dataDisconnected);
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataDisconnected.node);
                expect(out).to.have.property('connection').that.equals('disconnected');
            });
        });

        it("should alert when bmc is unstable from connected", function() {
            return alertJob._determineAlert(dataConnected)
            .then(function() {
                return alertJob._determineAlert(dataUnstable);
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataUnstable.node);
                expect(out).to.have.property('connection').that.equals('unstable');
            });
        });

        it("should alert when bmc is unstable from disconnected", function() {
            return alertJob._determineAlert(dataDisconnected)
            .then(function() {
                return alertJob._determineAlert(dataUnstable);
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataUnstable.node);
                expect(out).to.have.property('connection').that.equals('unstable');
            });
        });

        it("should alert when bmc is always unstable", function() {
            return alertJob._determineAlert(dataUnstable)
            .then(function() {
                return alertJob._determineAlert(dataUnstable)
            })
            .then(function(out) {
                expect(out).to.have.property('node').that.equals(dataUnstable.node);
                expect(out).to.have.property('connection').that.equals('unstable');
            });
        });

        it("should not alert when bmc is always connected", function() {
            return alertJob._determineAlert(dataConnected)
            .then(function() {
                return alertJob._determineAlert(dataConnected).should.become(null);
            });
        });

        it("should not alert when bmc is always disconnected for short time", function() {
            return alertJob._determineAlert(dataDisconnected)
            .then(function() {
                return alertJob._determineAlert(dataDisconnected).should.become(null);
            });
        });

        it("should alert when bmc is disconnected for longer time", function() {
            return alertJob._determineAlert(dataConnected)
            .then(function() {
                return alertJob._determineAlert(dataDisconnected);
            })
            .then(function() {
                alertJob.becomeDisConnTime = (new Date()) - alertJob.maxAlertReportTime - 60000;
                return alertJob._determineAlert(dataDisconnected);
            })
            .then(function(out) {
                var alertString = 'disconnected exceeds ' +
                alertJob.maxAlertReportTime/60000 + ' minutes,this node may has been removed';

                expect(out).to.have.property('node').that.equals(dataUnstable.node);
                expect(out).to.have.property('connection').that.equals(alertString);
            });
        });
    });
});
