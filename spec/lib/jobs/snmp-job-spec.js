// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var injector;
    var base = require('./base-spec');

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/snmp-job.js')
        ]));

        context.Jobclass = injector.get('Job.Snmp');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("snmp-job", function() {
        beforeEach(function() {
            var graphId = uuid.v4();
            this.snmp = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            expect(this.snmp.routingKey).to.equal(graphId);
        });

        it("should have a _run() method", function() {
            expect(this.snmp).to.have.property('_run').with.length(0);
        });

        it("should have a snmp command subscribe method", function() {
            expect(this.snmp).to.have.property('_subscribeRunSnmpCommand').with.length(2);
        });

        it("should listen for snmp command requests", function(done) {
            var self = this;
            self.snmp.collectHostSnmp = sinon.stub().resolves();
            self.snmp._publishSnmpResult = sinon.stub();
            self.snmp._subscribeRunSnmpCommand = function(routingKey, callback) {
                self.snmp.on('test-subscribe-snmp-command', function(config) {
                    callback(config);
                });
            };

            self.snmp._run();

            _.forEach(_.range(100), function() {
                self.snmp.emit('test-subscribe-snmp-command');
            });

            process.nextTick(function() {
                try {
                    expect(self.snmp.collectHostSnmp.callCount).to.equal(100);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
