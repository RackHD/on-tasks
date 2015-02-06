// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');
var _ = require('lodash');

describe(require('path').basename(__filename), function () {
    var injector;
    var base = require('./base-spec');

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmitool.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sdr-job.js')
        ]));

        context.Jobclass = injector.get('Job.Ipmi.Sdr');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-sdr-job", function() {
        beforeEach(function() {
            this.sdr = new this.Jobclass({ ipmiSdrRoutingKey: uuid.v4() }, {}, uuid.v4());
        });

        it("should have a _run() method", function() {
            expect(this.sdr).to.have.property('_run').with.length(0);
        });

        it("should have a sdr command subscribe method", function() {
            expect(this.sdr).to.have.property('_subscribeRunIpmiSdrCommand').with.length(1);
        });

        it("should listen for ipmi sdr command requests", function(done) {
            var self = this;
            self.sdr.collectIpmiSdr = sinon.promise();
            self.sdr._publishIpmiSdrResult = sinon.stub();
            self.sdr._subscribeRunIpmiSdrCommand = function(callback) {
                self.sdr.on('test-subscribe-ipmi-sdr-command', function(machine) {
                    callback(machine);
                });
            };

            self.sdr._run();

            _.forEach(_.range(100), function() {
                self.sdr.emit('test-subscribe-ipmi-sdr-command');
            });

            process.nextTick(function() {
                try {
                    expect(self.sdr.collectIpmiSdr.callCount).to.equal(100);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
