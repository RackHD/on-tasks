// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid');
describe('subscribe SEL events job', function(){
    var waterline = {};
    var SelEventJob;
    var eventsProtocol;
    var pollers= [{
        "config": {
            "command": "selEntries",
            "lastPreviouslyReadSelEntry": "0079",
            "lastSelDeleteTimeLastRun": null
        },
        "createdAt": "2017-05-12T10:23:16.806Z",
        "failureCount": 0,
        "id": "59158d14cfed9e8d1538ccb9",
        "lastFinished": "2017-05-15T01:19:20.822Z",
        "lastStarted": "2017-05-15T01:19:20.381Z",
        "leaseExpires": null,
        "leaseToken": null,
        "name": "Pollers.IPMI",
        "nextScheduled": "2017-05-15T01:20:20.822Z",
        "node": "59158cc523061786159d0509",
        "paused": false,
        "pollInterval": 60000,
        "state": "accessible",
        "updatedAt": "2017-05-15T01:19:20.822Z"
    }];
    var options = {
        "alertFilters": [{
            sensorNumber: '#0x4a',
            value: 'Asserted',
            sensorType: 'OEM',
            action: 'information',
            count: 1
        }]
    };
    var taskId = uuid.v4();
    var nodeId = uuid.v4();
    var context = {
        target: nodeId
    };
    var amqpMessage = {
        data: {
            alert: {
                reading: {
                    sensorNumber: '#0x4a',
                    value: 'Asserted',
                    sensorType: 'OEM'
                }
            }
        }
    };
    var job;
    var alerts;

    before(function(){
    //before('subscribe SEL events job before', function(){
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/wait-sel-events-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        SelEventJob = helper.injector.get('Job.Wait.Sel.Events');
        eventsProtocol = helper.injector.get('Protocol.Events');
        waterline.workitems = {
            findPollers: function() {},
            updatePollerAlertConfig: function(){}
        };
        waterline.nodes = {
            needByIdentifier: function(){}
        };
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach('subscribe SEL events job after each', function(){
        job = new SelEventJob(options, context, taskId);
        alerts = [_.omit(options.alertFilters[0], 'count')];
        this.sandbox.stub(waterline.workitems, 'updatePollerAlertConfig').resolves();
        this.sandbox.stub(waterline.nodes, 'needByIdentifier').resolves({id: nodeId});
    });

    afterEach('subscribe SEL events job after each', function(){
        this.sandbox.restore();
    });

    it('should set sel poller config', function() {
        var _options = _.cloneDeep(options);
        _options.pollInterval = 5000;
        job = new SelEventJob(_options, context, taskId);
        this.sandbox.stub(waterline.workitems, 'findPollers').resolves(pollers);
        return job._retrievePollerInfo(pollers)
        .then(function(){
            return job.setSelAlertConfig();
        })
        .then(function(){
            expect(waterline.workitems.updatePollerAlertConfig).to.be.calledOnce;
            expect(waterline.workitems.updatePollerAlertConfig).to.be.calledWith(
                "59158d14cfed9e8d1538ccb9",
                {alerts: alerts, isRemove: false, pollInterval: 5000}
            );
        });
    });

    it('should unset sel poller config', function() {
        job._retrievePollerInfo(pollers);
        return job.unsetSelAlertConfig()
        .then(function(){
            expect(waterline.workitems.updatePollerAlertConfig).to.be.calledOnce;
            expect(waterline.workitems.updatePollerAlertConfig).to.be.calledWith(
                "59158d14cfed9e8d1538ccb9",
                {alerts: alerts, isRemove: true}
            );
        });

    });

    it('should run the job', function() {
        this.sandbox.spy(job, '_done');
        var eventStub = this.sandbox.stub(job, '_subscribeSelEvent');
        this.sandbox.stub(waterline.workitems, 'findPollers').resolves(pollers);
        eventStub.onCall(0).resolves(amqpMessage).callsArgWith(1, amqpMessage);
        return job._run()
        .then(function(){
            expect(waterline.workitems.findPollers).to.be.calledOnce;
            expect(waterline.workitems.updatePollerAlertConfig).to.be.calledTwice;
            expect(job._subscribeSelEvent).to.be.calledOnce;
            expect(job._done).to.be.calledOnce;
        });
    });

    it('should throw more than one pollers found error', function() {
        expect(job._retrievePollerInfo([1,2])).to.be.rejected;
        expect(job._retrievePollerInfo([])).to.be.rejected;
    });

    it('should set sel alert action to information', function() {
        var _options = _.cloneDeep(options);
        _options.alertFilters[0].action = undefined;
        job = new SelEventJob(_options, context, taskId);
        return job._retrievePollerInfo(pollers)
        .then(function(){
            expect(job.freshAlerts).to.deep.equal([{
                sensorNumber: '#0x4a',
                value: 'Asserted',
                sensorType: 'OEM',
                action: 'information'
            }]);
        });
    });

    it('should not set sel poller config', function() {
        var _pollers = _.cloneDeep(pollers);
        _pollers[0].config.alerts = options.alertFilters;
        this.sandbox.stub(waterline.workitems, 'findPollers').resolves(_pollers);
        this.sandbox.stub(job, '_subscribeSelEvent').resolves();
        this.sandbox.spy(job, 'updateSelPollerConfig');
        return job._run()
        .then(function(){
            expect(job.updateSelPollerConfig).to.be.calledOnce;
            expect(job.updateSelPollerConfig).to.be.calledWith(
                {alerts: [], pollInterval: 60000, isRemove: false}
            );
            expect(waterline.workitems.updatePollerAlertConfig).not.to.be.called;
        });
    });

    describe('Validate filtering', function(){
        var _options;
        var amqpMessages;
        var job;

        beforeEach('Validate filtering beforeEach', function(){
            this.sandbox.restore();
            amqpMessages = _.fill(Array(4), amqpMessage);
            amqpMessages[2] = _.cloneDeep(amqpMessage);
            amqpMessages[2].data.alert.reading.sensorNumber = '#0x4b';
            _options = {
                "alertFilters": [
                    {
                        sensorNumber: '#0x4a',
                        action: 'information',
                        count: 2
                    },
                    {
                        sensorNumber: '#0x4b',
                        action: 'information',
                    },
                    {
                        sensorNumber: '#0x4a',
                        action: 'information',
                        count: 1
                    }
                ]
            };
        });

        it('should get validate filtering', function(){
            var invalidAmqpMsg = {data: {alert: {reading: {}}}};
            job = new SelEventJob(_options, context, taskId);
            job._retrievePollerInfo(pollers);
            this.sandbox.stub(job, 'unsetSelAlertConfig').resolves();
            this.sandbox.spy(job, '_done');
            amqpMessages.splice(1, 0, invalidAmqpMsg);
            return Promise.try(function(){
                _.forEach(amqpMessages, function(msg){
                    job._callback(msg);
                });
            })
            .then(function(){
                expect(job._done).to.be.calledOnce;
                expect(job.unsetSelAlertConfig).to.be.calledOnce;
            });
        });
        
        it('should get invalidate filtering', function(){
            var invalidAmqpMsg = {data: {alert: {reading: {sensorNumber: '#0x4a'}}}};
            _options.alertFilters[0].count = 1;
            _options.alertFilters[2].count = 2;
            job = new SelEventJob(_options, context, taskId);
            job._retrievePollerInfo(pollers);
            this.sandbox.stub(job, 'unsetSelAlertConfig').resolves();
            this.sandbox.spy(job, '_done');
            amqpMessages.splice(1, 0, invalidAmqpMsg);
            return Promise.try(function(){
                _.forEach(amqpMessages, function(msg){
                    job._callback(msg);
                });
            })
            .then(function(){
                expect(job.pureFilters).to.deep.equal([ { sensorNumber: '#0x4a' } ]);
                expect(job.eventCounts).to.deep.equal([1]);
                expect(job._done).not.to.be.called;
                expect(job.unsetSelAlertConfig).not.to.be.called;
            });
        });
    
    });

});
