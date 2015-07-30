// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    var collectMetricDataStub;
    var metricStub;

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        collectMetricDataStub = sinon.stub();
        metricStub = function() {};
        metricStub.prototype.collectMetricData = collectMetricDataStub;

        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js'),
            helper.requireGlob('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/snmp-job.js'),
            helper.di.simpleWrapper(metricStub,
                'JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.InterfaceStateMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.ProcessorLoadMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.MemoryUsageMetric'),
        ]);

        context.Jobclass = helper.injector.get('Job.Snmp');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("snmp-job", function() {
        var Snmptool;
        var Constants;
        var testEmitter = new events.EventEmitter();

        before(function() {
            Constants = helper.injector.get('Constants');
        });

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            var graphId = uuid.v4();
            this.snmp = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            Snmptool = helper.injector.get('JobUtils.Snmptool');
            expect(this.snmp.routingKey).to.equal(graphId);
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it("should have a _run() method", function() {
            expect(this.snmp).to.have.property('_run').with.length(0);
        });

        it("should have a snmp command subscribe method", function() {
            expect(this.snmp).to.have.property('_subscribeRunSnmpCommand').with.length(2);
        });

        it("should listen for snmp command requests but limit concurrent requests", function(done) {
            var self = this;
            this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp');
            this.sandbox.spy(this.snmp, 'concurrentRequests');
            Snmptool.prototype.collectHostSnmp.resolves();
            self.snmp._publishSnmpCommandResult = sinon.stub();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            self.snmp._run();

            _.forEach(_.range(100), function() {
                testEmitter.emit('test-subscribe-snmp-command', {
                    host: 'test',
                    community: 'test',
                    node: 'test',
                    pollInterval: 60000,
                    config: {
                        oids: ['testoid']
                    }
                });
            });

            process.nextTick(function() {
                try {
                    expect(self.snmp.concurrentRequests.callCount).to.equal(100);
                    expect(Snmptool.prototype.collectHostSnmp.callCount).to
                    .equal(self.snmp.maxConcurrent);
                    expect(self.snmp._publishSnmpCommandResult.callCount).to
                    .equal(self.snmp.maxConcurrent);
                    expect(self.snmp._publishSnmpCommandResult)
                        .to.have.been.calledWith(self.snmp.routingKey);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it("should listen for snmp metric command requests " +
        "but limit concurrent requests", function(done) {
            var self = this;
            this.sandbox.stub(self.snmp, '_collectMetricData');
            this.sandbox.spy(self.snmp, 'concurrentRequests');
            self.snmp._collectMetricData.resolves();
            self.snmp._publishMetricResult = sinon.stub();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            self.snmp._run();

            _.forEach(_.range(100), function() {
                testEmitter.emit('test-subscribe-snmp-command', {
                    host: 'test',
                    community: 'test',
                    node: 'test',
                    pollInterval: 60000,
                    config: {
                        metric: "snmp-interface-state"
                    }
                });
            });

            process.nextTick(function() {
                try {
                    expect(self.snmp.concurrentRequests.callCount).to.equal(100);
                    expect(self.snmp._collectMetricData.callCount).to
                    .equal(self.snmp.maxConcurrent);
                    expect(self.snmp._publishMetricResult.callCount).to
                    .equal(self.snmp.maxConcurrent);
                    expect(self.snmp._publishMetricResult)
                        .to.have.been.calledWith(self.snmp.routingKey);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        describe('metric polling', function() {
            before(function() {
                collectMetricDataStub.reset();
            });

            it('should collect metric data', function() {
                var self = this;

                _.forEach([
                    Constants.WorkItems.Pollers.Metrics.SnmpInterfaceBandwidthUtilization,
                    Constants.WorkItems.Pollers.Metrics.SnmpInterfaceState,
                    Constants.WorkItems.Pollers.Metrics.SnmpProcessorLoad,
                    Constants.WorkItems.Pollers.Metrics.SnmpMemoryUsage
                ], function(metricType) {
                    var data = {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        pollInterval: 60000,
                        config: {
                            metric: metricType
                        }
                    };
                    self.snmp._collectMetricData(data);
                    expect(collectMetricDataStub).to.have.been.calledOnce;
                    expect(collectMetricDataStub).to.have.been.calledWith(data);
                    collectMetricDataStub.reset();
                });
            });

            it('should fail to collect unknown metric data', function() {
                var self = this;
                var data = {
                    host: 'test',
                    community: 'test',
                    node: 'test',
                    pollInterval: 60000,
                    config: {
                        metric: 'unknown'
                    }
                };

                expect(function() {
                    self.snmp._collectMetricData(data);
                }).to.throw(/Unknown poller metric name: unknown/);
            });
        });
    });
});
