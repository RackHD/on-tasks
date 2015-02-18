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
            helper.require('/lib/jobs/ipmi-job.js')
        ]));

        context.Jobclass = injector.get('Job.Ipmi');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-job", function() {
        beforeEach(function() {
            var graphId = uuid.v4();
            this.ipmi = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            expect(this.ipmi.routingKey).to.equal(graphId);
        });

        it("should have a _run() method", function() {
            expect(this.ipmi).to.have.property('_run').with.length(0);
        });

        it("should have a sdr command subscribe method", function() {
            expect(this.ipmi).to.have.property('_subscribeRunIpmiCommand').with.length(3);
        });

        it("should listen for ipmi sdr command requests", function(done) {
            var self = this;
            var config = {
                host: '10.1.1.',
                user: 'admin',
                password: 'admin',
                workItemId: 'testworkitemid'
            };
            self.ipmi.collectIpmiSdr = sinon.stub().resolves();
            self.ipmi._publishIpmiCommandResult = sinon.stub();
            self.ipmi._subscribeRunIpmiCommand = function(routingKey, type, callback) {
                if (type === 'sdr') {
                    self.ipmi.on('test-subscribe-ipmi-sdr-command', function(config) {
                        // BaseJob normally binds this callback to its subclass instance,
                        // so do the equivalent
                        callback.call(self.ipmi, config);
                    });
                }
            };

            self.ipmi._run();

            _.forEach(_.range(100), function(i) {
                var _config = _.cloneDeep(config);
                _config.host += i;
                self.ipmi.emit('test-subscribe-ipmi-sdr-command', _config);
            });

            process.nextTick(function() {
                try {
                    expect(self.ipmi.collectIpmiSdr.callCount).to.equal(100);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
