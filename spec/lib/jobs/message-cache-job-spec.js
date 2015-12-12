// Copyright 2015, EMC, Inc.
/* jshint node:true */

"use strict";

var uuid = require("node-uuid");

describe("Message Cache Job", function () {
    var base = require('./base-spec');
    var Errors;
    var job;

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/message-cache-job.js')
        ]);

        var configuration = helper.injector.get('Services.Configuration');
        sinon.stub(configuration, 'get').withArgs('pollerCacheSize').returns(10);

        Errors = helper.injector.get('Errors');
        context.Jobclass = helper.injector.get('Job.Message.Cache');
    });

    beforeEach("Message Cache Job beforeEach", function() {
        this.sandbox = sinon.sandbox.create();
        job = new this.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
    });

    afterEach("Message Cache Job afterEach", function() {
        this.sandbox.restore();
    });

    describe("Base", function () {
        base.examples();
    });

    describe("cache", function() {
        it("should return false if an id is not in the cache", function() {
            job.cache = {};
            expect(job.cacheHas('testid')).to.equal(false);
        });

        it("should return true if an id is in the cache", function() {
            job.cache = { testid: [] };
            expect(job.cacheHas('testid')).to.equal(true);
        });

        it("should get cache entries by id", function() {
            var cache = { 'testid': [{}, {}] };
            job.cache = cache;
            expect(job.cacheGet('testid')).to.equal(cache.testid);
        });

        it("should set a cache entry", function() {
            job.cacheSet('testid', { testkey: 'testvalue' });
            expect(job.cacheGet('testid')[0]).to.have.property('testkey').equals('testvalue');
        });

        it("should not set a cache entry for empty data", function() {
            job.cacheSet('testid', null);
            expect(job.cacheGet('testid')).to.be.empty;
        });

        it("should limit the cache size", function() {
            job.maxCacheSize = 1;
            job.cacheSet('testid', { k: 1 });
            expect(job.cacheGet('testid')).to.have.length(1);
            expect(job.cacheGet('testid')[0]).to.have.property('k').that.equals(1);
            job.cacheSet('testid', { k: 2 });
            expect(job.cacheGet('testid')).to.have.length(1);
            expect(job.cacheGet('testid')[0]).to.have.property('k').that.equals(2);
        });

        it("should add timestamps to cache entries", function() {
            job.cacheSet('testid', { testkey: 'testvalue' });
            expect(job.cacheGet('testid')[0]).to.have.property('timestamp');
            expect(new Date(job.cacheGet('testid')[0].timestamp)).to.be.a('date');
        });
    });

    describe("subscription callbacks", function() {
        var baseJob;

        before("Message Cache subscription callbacks before", function() {
            baseJob = helper.injector.get('Job.Base');
            sinon.stub(baseJob.prototype, '_subscribeIpmiCommandResult');
            sinon.stub(baseJob.prototype, '_subscribeSnmpCommandResult');
            sinon.stub(baseJob.prototype, '_subscribeRequestPollerCache');
        });

        beforeEach("Message Cache subscription callbacks beforeEach", function() {
            baseJob.prototype._subscribeIpmiCommandResult.reset();
            baseJob.prototype._subscribeSnmpCommandResult.reset();
            baseJob.prototype._subscribeRequestPollerCache.reset();
        });

        after("Message Cache subscription callbacks after", function() {
            baseJob.prototype._subscribeIpmiCommandResult.restore();
            baseJob.prototype._subscribeSnmpCommandResult.restore();
            baseJob.prototype._subscribeRequestPollerCache.restore();
        });

        it("should set subscription callbacks for ipmi results", function() {
            this.sandbox.stub(job, 'createSetIpmiCommandResultCallback').returns('fn return stub');
            job._run();
            expect(job._subscribeIpmiCommandResult.callCount).to.equal(5);
            _.forEach(['sdr', 'selInformation', 'sel', 'chassis', 'driveHealth'],
            function(command) {
                expect(job._subscribeIpmiCommandResult).to.have.been.calledWith(
                    job.routingKey,
                    command,
                    'fn return stub'
                );
            });
        });

        it("should set subscription callbacks for snmp results", function() {
            job._run();
            expect(job._subscribeSnmpCommandResult).to.have.been.calledOnce;
            expect(job._subscribeSnmpCommandResult)
                .to.have.been.calledWith(job.routingKey, job.setSnmpCommandResultCallback);
        });

        it("should set subscription callbacks for poller cache requests", function() {
            job._run();
            expect(job._subscribeRequestPollerCache).to.have.been.calledOnce;
            expect(job._subscribeRequestPollerCache)
                .to.have.been.calledWith(job.requestPollerCacheCallback);
        });

        it("should work for setting cache data on ipmi results", function() {
            _.forEach(['sdr', 'selInformation', 'sel', 'chassis'], function(command) {
                var testdata = { test: 'data' };
                var cb = job.createSetIpmiCommandResultCallback(command);
                cb.call(job, testdata);
                expect(job.cacheGet('unknown.ipmi.' + command)).to.have.length(1);
                expect(job.cacheGet('unknown.ipmi.' + command)[0])
                    .to.have.property('test').that.equals('data');
                testdata.workItemId = 'testid.' + command;
                cb.call(job, testdata);
                expect(job.cacheGet('testid.' + command)).to.have.length(1);
                expect(job.cacheGet('testid.' + command)[0])
                    .to.have.property('test').that.equals('data');
            });
        });

        it("should work for setting cache data on snmp results", function() {
            var testdata = { test: 'data' };
            job.setSnmpCommandResultCallback(testdata);
            expect(job.cacheGet('unknown.snmp')).to.have.length(1);
            expect(job.cacheGet('unknown.snmp')[0])
                .to.have.property('test').that.equals('data');

            testdata.workItemId = 'testid';
            job.setSnmpCommandResultCallback(testdata);
            expect(job.cacheGet(testdata.workItemId)).to.have.length(1);
            expect(job.cacheGet(testdata.workItemId)[0])
                .to.have.property('test').that.equals('data');
        });

        it("should work for setting cache data on metric results", function() {
            _.forEach(['test-metric-1', 'test-metric-2', 'test-metric-3'], function(metric) {
                var testdata = { test: 'data' };
                job.setMetricResultCallback(testdata, metric);
                expect(job.cacheGet('unknown.metric.' + metric)).to.have.length(1);
                expect(job.cacheGet('unknown.metric.' + metric)[0])
                    .to.have.property('test').that.equals('data');

                testdata.workItemId = 'testid.' + metric;
                job.setMetricResultCallback(testdata, metric);
                expect(job.cacheGet(testdata.workItemId)).to.have.length(1);
                expect(job.cacheGet(testdata.workItemId)[0])
                    .to.have.property('test').that.equals('data');
            });
        });

        it("should work for poller cache requests", function() {
            job.cacheSet('testid', { test: 'data' });
            return job.requestPollerCacheCallback('testid')
            .then(function(data) {
                expect(data).to.have.length(1);
                expect(data[0]).to.have.property('test').that.equals('data');
            });
        });

        it("should work for poller cache requests for the latest entry", function() {
            job.cacheSet('testid', { test: 'data' });
            job.cacheSet('testid', { test: 'data latest' });
            return job.requestPollerCacheCallback('testid', { latestOnly: true })
            .then(function(data) {
                expect(data).to.have.length(1);
                expect(data[0]).to.have.property('test').that.equals('data latest');
            });
        });

        it("should reject for poller cache requests on non-existant workItems", function() {
            return expect(job.requestPollerCacheCallback('badid'))
                .to.be.rejectedWith(Errors.NotFoundError, /There is no cache record/);
        });
    });
});
