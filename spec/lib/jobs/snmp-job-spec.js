// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    var collectMetricDataStub;
    var metricStub;
    var waterline = {};
    var pollerHelper;
    var loopCount = 10;
    var taskProtocol;

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
            helper.require('/lib/utils/job-utils/poller-helper.js'),
            helper.di.simpleWrapper(metricStub,
                'JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.InterfaceStateMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.ProcessorLoadMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.MemoryUsageMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.TxRxCountersMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.PduPowerMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.PduSensorMetric'),
            helper.di.simpleWrapper(metricStub, 'JobUtils.Metrics.Snmp.SwitchSensorMetric'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        context.Jobclass = helper.injector.get('Job.Snmp');
        pollerHelper = helper.injector.get('JobUtils.PollerHelper');
        taskProtocol = helper.injector.get('Protocol.Task');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("snmp-job", function() {
        var Snmptool;
        var Constants;
        var testEmitter;
        var graphId = uuid.v4();
        before(function() {
            Constants = helper.injector.get('Constants');
        });

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                findOne: this.sandbox.stub(),
                setFailed: this.sandbox.stub().resolves(),
                setSucceeded: this.sandbox.stub().resolves(),
                update: this.sandbox.stub().resolves()
            };
            waterline.nodes = {
                needByIdentifier: this.sandbox.stub()
            };
            this.snmp = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            Snmptool = helper.injector.get('JobUtils.Snmptool');
            expect(this.snmp.routingKey).to.equal(graphId);
            testEmitter = new events.EventEmitter();
            pollerHelper.getNodeAlertMsg = this.sandbox.stub().resolves({});
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

        it("should listen for snmp command requests", function(done) {
            var self = this;
            var workItem = {
                id: 'bc7dab7e8fb7d6abf8e7d6ad',
                name: 'Pollers.SNMP',
                config: {
                    ip: '1.2.3.4',
                    communityString: 'community'
                }
            };
            this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp');
            this.sandbox.stub(this.snmp, 'concurrentRequests').returns(false);
            this.sandbox.stub(this.snmp, 'addConcurrentRequest');
            this.sandbox.stub(this.snmp, 'removeConcurrentRequest');
            Snmptool.prototype.collectHostSnmp.resolves();
            waterline.workitems.findOne.resolves(workItem);
            waterline.nodes.needByIdentifier.resolves({});
            self.snmp._publishSnmpCommandResult = sinon.stub().resolves();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            return self.snmp._run()
            .then(function() {
                _.forEach(_.range(loopCount), function() {
                    testEmitter.emit('test-subscribe-snmp-command', {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        workItemId: 'testWorkItemId',
                        pollInterval: 60000,
                        config: {
                            oids: ['testoid']
                        }
                    });
                });

                setImmediate(function() {
                    try {
                        expect(self.snmp.concurrentRequests.callCount).to.equal(loopCount);
                        expect(Snmptool.prototype.collectHostSnmp.callCount).to.equal(loopCount);
                        expect(pollerHelper.getNodeAlertMsg.callCount).to.equal(loopCount);
                        expect(Snmptool.prototype.collectHostSnmp
                                .alwaysCalledWith(['testoid'], { numericOutput: true }))
                                .to.equal(true);
                        expect(self.snmp._publishSnmpCommandResult.callCount).to.equal(loopCount);
                        expect(self.snmp._publishSnmpCommandResult)
                            .to.have.been.calledWith(self.snmp.routingKey);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        it("should fail on unrecognized pollers", function(done) {
            var self = this;
            var workItem = {
                id: 'bc7dab7e8fb7d6abf8e7d6ad',
                name: 'Pollers.SNMP',
                config: {
                    ip: '1.2.3.4',
                    communityString: 'community'
                }
            };
            this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp');
            this.sandbox.stub(this.snmp, 'concurrentRequests').returns(false);
            this.sandbox.stub(this.snmp, 'addConcurrentRequest');
            this.sandbox.stub(this.snmp, 'removeConcurrentRequest');
            Snmptool.prototype.collectHostSnmp.resolves();
            waterline.workitems.findOne.resolves(workItem);
            waterline.nodes.needByIdentifier.resolves({});
            self.snmp._publishSnmpCommandResult = sinon.stub().resolves();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            return self.snmp._run()
            .then(function() {
                    testEmitter.emit('test-subscribe-snmp-command', {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        workItemId: 'testWorkItemId',
                        pollInterval: 60000,
                        config: {
                            unknownField: ['testoid']
                        }
                });

                setImmediate(function() {
                    try {
                        expect(Snmptool.prototype.collectHostSnmp)
                            .to.not.have.been.called;
                        expect(self.snmp._publishSnmpCommandResult)
                            .to.not.have.been.called;
                        expect(waterline.workitems.setFailed).to.have.been.calledOnce;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        it("should listen for snmp metric command requests", function(done) {
            var self = this;
            var workItem = {
                id: 'bc7dab7e8fb7d6abf8e7d6ad',
                name: 'Pollers.SNMP',
                config: {
                    ip: '1.2.3.4',
                    communityString: 'community'
                }
            };
            this.sandbox.stub(self.snmp, '_collectMetricData');
            this.sandbox.stub(this.snmp, 'concurrentRequests').returns(false);
            this.sandbox.stub(this.snmp, 'addConcurrentRequest');
            this.sandbox.stub(this.snmp, 'removeConcurrentRequest');
            waterline.workitems.findOne.resolves(workItem);
            waterline.nodes.needByIdentifier.resolves({});
            self.snmp._collectMetricData.resolves();
            self.snmp._publishMetricResult = sinon.stub();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            self.snmp._run()
            .then(function() {
                _.forEach(_.range(loopCount), function() {
                    testEmitter.emit('test-subscribe-snmp-command', {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        workItemId: 'testWorkItemId',
                        pollInterval: 60000,
                        config: {
                            metric: "snmp-interface-state"
                        }
                    });
                });

                setImmediate(function() {
                    try {
                        expect(self.snmp.concurrentRequests.callCount).to.equal(loopCount);
                        expect(self.snmp._collectMetricData.callCount).to.equal(loopCount);
                        expect(self.snmp._publishMetricResult.callCount).to.equal(loopCount);
                        expect(self.snmp._publishMetricResult)
                            .to.have.been.calledWith(self.snmp.routingKey);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });


        it("should limit concurrent snmp requests against a single host", function(done) {
            var self = this;
            var workItem = {
                id: 'bc7dab7e8fb7d6abf8e7d6ad',
                name: 'Pollers.SNMP',
                config: {
                    ip: '1.2.3.4',
                    communityString: 'community'
                }
            };
            this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp');
            this.sandbox.spy(this.snmp, 'concurrentRequests');
            this.sandbox.spy(this.snmp, 'addConcurrentRequest');
            this.sandbox.spy(this.snmp, 'removeConcurrentRequest');
            Snmptool.prototype.collectHostSnmp.resolves();
            waterline.workitems.findOne.resolves(workItem);
            waterline.nodes.needByIdentifier.resolves({});
            self.snmp._publishSnmpCommandResult = sinon.stub().resolves();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            self.snmp._run()
            .then(function() {
                _.forEach(_.range(loopCount), function() {
                    testEmitter.emit('test-subscribe-snmp-command', {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        workItemId: 'testWorkItemId',
                        pollInterval: 60000,
                        config: {
                            oids: ['testoid']
                        }
                    });
                });

                setImmediate(function() {
                    try {
                        expect(self.snmp.concurrentRequests.callCount).to.equal(loopCount);
                        expect(Snmptool.prototype.collectHostSnmp.callCount).to
                            .equal(self.snmp.addConcurrentRequest.callCount);
                        expect(self.snmp._publishSnmpCommandResult.callCount).to
                            .equal(self.snmp.addConcurrentRequest.callCount);
                        expect(self.snmp._publishSnmpCommandResult)
                            .to.have.been.calledWith(self.snmp.routingKey);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        describe('metric polling', function() {
            before(function() {
                collectMetricDataStub.reset();
            });

            it('should collect metric data', function() {
                var self = this;
                var workItemId = uuid.v4();
                
                _.forEach([
                    Constants.WorkItems.Pollers.Metrics.SnmpInterfaceBandwidthUtilization,
                    Constants.WorkItems.Pollers.Metrics.SnmpInterfaceState,
                    Constants.WorkItems.Pollers.Metrics.SnmpProcessorLoad,
                    Constants.WorkItems.Pollers.Metrics.SnmpMemoryUsage,
                    Constants.WorkItems.Pollers.Metrics.SnmpTxRxCounters,
                    Constants.WorkItems.Pollers.Metrics.SnmpPduPowerStatus,
                    Constants.WorkItems.Pollers.Metrics.SnmpPduSensorStatus,
                    Constants.WorkItems.Pollers.Metrics.SnmpSwitchSensorStatus
                ], function(metricType) {
                    var data = {
                        host: 'test',
                        community: 'test',
                        node: 'test',
                        pollInterval: 60000,
                        config: {
                            metric: metricType
                        },
                        workItemId: workItemId
                    };
                    var dataCopy = _.cloneDeep(data);
                    dataCopy.cache = {};
                    dataCopy.cache[data.workItemId] = {};
                    dataCopy.cache[data.workItemId][metricType] = {};
                    dataCopy.routingKey = graphId;
                    collectMetricDataStub.resolves({});
                    self.snmp.resultCache = {};
                    self.snmp._collectMetricData(data);
                    expect(collectMetricDataStub).to.have.been.calledOnce;
                    expect(collectMetricDataStub).to.have.been.calledWith(dataCopy);
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

        describe('alerting', function() {
            var snmpData = {
                config: {
                    oids:[],
                    alerts:[]
                },
                host: '1.2.3.4',
                community: 'test',
                workItemId: 'aWorkItemId',
                node: 'aNodeId',
                result: []
            };

            beforeEach(function() {
                this.sandbox.stub(taskProtocol, 'publishPollerAlert').resolves();
                snmpData.config.alerts = [];
            });

            it('should not alert if there are no alerts', function() {
                return this.snmp._determineAlert(snmpData).should.become([])
                .then(function() {
                    expect(taskProtocol.publishPollerAlert).to.not.have.been.called;
                });
            });

            it('should alert on matching alert string', function() {
                snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': 'test value'});
                snmpData.result.push({
                    source: '.1.3.6.1.2.1.1.5',
                    values: {'.1.3.6.1.2.1.1.5': 'test value'}
                });

                return this.snmp._determineAlert(snmpData)
                .then(function(out) {
                    expect(out).to.be.an('Array').with.length(1)
                    expect(out[0]).to.have.property('oid');
                    expect(out[0]).to.have.property('value');
                    expect(out[0]).to.have.property('matched');
                    expect(out[0]).to.deep.equal({
                        oid: '.1.3.6.1.2.1.1.5',
                        value: 'test value',
                        matched: 'test value'
                    });
                    expect(taskProtocol.publishPollerAlert).to.have.been.calledWith(graphId, 'snmp', {
                        host: '1.2.3.4',
                        oid: '.1.3.6.1.2.1.1.5',
                        value: 'test value',
                        nodeRef: '/nodes/aNodeId',
                        dataRef: '/pollers/aWorkItemId/data/current',
                        matched: 'test value'
                    });
                });
            });

            it('should alert on matching alert regex', function() {
                snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': '/test/'});
                snmpData.result.push({
                    source: '.1.3.6.1.2.1.1.5',
                    values: {'.1.3.6.1.2.1.1.5': 'test value'}
                });

                return this.snmp._determineAlert(snmpData)
                .then(function(out) {
                    expect(out).to.be.an('Array').with.length(1)
                    expect(out[0]).to.have.property('oid');
                    expect(out[0]).to.have.property('value');
                    expect(out[0]).to.have.property('matched');
                    expect(out[0]).to.deep.equal({
                        oid: '.1.3.6.1.2.1.1.5',
                        value: 'test value',
                        matched: '/test/'
                    });
                    expect(taskProtocol.publishPollerAlert).to.have.been.calledWith(graphId, 'snmp', {
                        host: '1.2.3.4',
                        oid: '.1.3.6.1.2.1.1.5',
                        value: 'test value',
                        nodeRef: '/nodes/aNodeId',
                        dataRef: '/pollers/aWorkItemId/data/current',
                        matched: '/test/'
                    });
                });
            });

            it('should alert on matching alert with compound logic', function() {
                snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': {
                    "greaterThan": 42,
                    "integer": true
                }});
                snmpData.result.push({
                    source: '.1.3.6.1.2.1.1.5',
                    values: {'.1.3.6.1.2.1.1.5': '45'}
                });
                return this.snmp._determineAlert(snmpData)
                .then(function(out) {
                    expect(out).to.be.an('Array').with.length(1)
                    expect(out[0]).to.have.property('oid');
                    expect(out[0]).to.have.property('value');
                    expect(out[0]).to.have.property('matched');
                    expect(out[0]).to.deep.equal({
                        oid: '.1.3.6.1.2.1.1.5',
                        value: '45',
                        matched: snmpData.config.alerts[0]['.1.3.6.1.2.1.1.5']
                    });
                    expect(taskProtocol.publishPollerAlert).to.have.been.calledWith(graphId, 'snmp', {
                        host: '1.2.3.4',
                        oid: '.1.3.6.1.2.1.1.5',
                        value: '45',
                        nodeRef: '/nodes/aNodeId',
                        dataRef: '/pollers/aWorkItemId/data/current',
                        matched: snmpData.config.alerts[0]['.1.3.6.1.2.1.1.5']
                    });
                });
            });

            it('should not alert on non-matching alert with compound logic', function() {
                snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': {
                    "greaterThan": 42,
                    "integer": true
                }});
                snmpData.result.push({
                    source: '.1.3.6.1.2.1.1.5',
                    values: {'.1.3.6.1.2.1.1.5': '41'}
                });

                return this.snmp._determineAlert(snmpData, snmpData.result[0].values).should.become([])
                .then(function() {
                    expect(taskProtocol.publishPollerAlert).to.not.have.been.called;
                });
            });

            it('should not alert if there is no change in status', function() {
                snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': '/test/'});
                snmpData.result.push({
                    source: '.1.3.6.1.2.1.1.5',
                    values: {'.1.3.6.1.2.1.1.5': 'test value'}
                });

                return this.snmp._determineAlert(snmpData, snmpData.result[0].values).should.become([])
                .then(function() {
                    expect(taskProtocol.publishPollerAlert).to.not.have.been.called;
                });
            });
        });
    });
});
