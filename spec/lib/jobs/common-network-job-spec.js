// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events'),
    waterline = {};

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/common-network-tool.js'),
            helper.require('/lib/utils/job-utils/common-network-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/common-network-job.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);

        context.Jobclass = helper.injector.get('Job.Common.Network.Command');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("common-network-job", function() {
        var testEmitter = new events.EventEmitter();

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                update: this.sandbox.stub().resolves()
            };
            var graphId = uuid.v4();
            this.commonCommand = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            expect(this.commonCommand.routingKey).to.equal(graphId);
        });

        it("should have a _run() method", function() {
            expect(this.commonCommand).to.have.property('_run').with.length(0);
        });

        it("should have a common network command subscribe method", function() {
            expect(this.commonCommand).to.have.property('_subscribeRunCommonCommand').with.length(3);
        });

        it("should listen for common network command requests", function(done) {
            var self = this;
            var config = {
                host: '10.1.1.',
                user: 'admin',
                password: 'admin',
                workItemId: 'testworkitemid'
            };
            self.commonCommand.collectCommonCommandPing = sinon.stub().resolves();
            self.commonCommand._publishCommonCommandResult = sinon.stub();
            self.commonCommand._subscribeRunCommonCommand = function(routingKey, type, callback) {
                if (type === 'ping') {
                    testEmitter.on('test-subscribe-common-network-command', function(config) {
                        // BaseJob normally binds this callback to its subclass instance,
                        // so do the equivalent
                        callback.call(self.commonCommand, config);
                    });
                }
            };

            self.commonCommand._run()
            .then(function() {
                _.forEach(_.range(100), function(i) {
                    var _config = _.cloneDeep(config);
                    _config.host += i;
                    testEmitter.emit('test-subscribe-common-network-command', _config);
                });

                setImmediate(function() {
                    try {
                        expect(self.commonCommand.collectCommonCommandPing.callCount).to.equal(100);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        it("should add a concurrent request", function() {
            expect(this.commonCommand.concurrentRequests('test', 'ping')).to.equal(false);
            this.commonCommand.addConcurrentRequest('test', 'ping');
            expect(this.commonCommand.concurrent).to.have.property('test')
                .with.property('ping').that.equals(1);
        });

        it("should return true if there are requests outstanding", function() {
            expect(this.commonCommand.concurrentRequests('test', 'ping')).to.equal(false);
            this.commonCommand.addConcurrentRequest('test', 'ping');
            expect(this.commonCommand.concurrentRequests('test', 'ping')).to.equal(true);
        });
    });
});
