// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = {
    before: function (description, servicePath, callback) {
        before(description, function () {
            var overrides = [
                helper.require('/lib/services/obm-service'),
                helper.require('/lib/services/base-obm-service'),
                helper.require(servicePath)
            ];
            helper.setupInjector(overrides);

            this.BaseObmService = helper.injector.get('OBM.base');
            this.Logger = helper.injector.get('Logger');

            sinon.stub(this.BaseObmService.prototype, 'run').resolves();
            sinon.spy(this.BaseObmService, 'create');
            sinon.stub(this.Logger.prototype, 'log');

            if (callback) {
                callback(this);
            }
        });
    },
    beforeEach: function(description, callback) {
        beforeEach(description, function() {
            this.BaseObmService.prototype.run.reset();
            this.BaseObmService.create.reset();
            if (callback) {
                callback(this);
            }
        });
    },
    after: function(description, callback) {
        after(description, function() {
            this.BaseObmService.prototype.run.restore();
            this.Logger.prototype.log.restore();
            if (callback) {
                callback(this);
            }
        });
    },
    runInterfaceTestCases: function (methods) {
        var publicInterface = [
            'reboot',
            'powerOn',
            'powerOff',
            'powerStatus'
        ];
        var serviceMethods = publicInterface.concat(methods || []);

        before("ObmService interface before", function () {
            expect(this.Service).to.be.a('function');
            expect(this.serviceOptions).to.have.property('config').that.is.an('object');
        });

        describe('ObmService interface', function() {
            it('should conform to the ObmService interface', function() {
                var self = this;
                expect(self.Service).to.have.property('create');
                expect(self.Service.prototype).to.have.property('_runInternal');
                _.forEach(serviceMethods, function(funcName) {
                    expect(self.Service.prototype).to.have.property(funcName);
                });
            });

            it('should use BaseObmService.create() on create()', function() {
                this.Service.create(this.serviceOptions);
                expect(this.BaseObmService.create).to.have.been.calledWith(this.Service);
            });

            it('should have requiredKeys attribute', function() {
                var service = this.Service.create(this.serviceOptions);
                expect(service).to.have.property('requiredKeys').that.is.an('array');
            });

            _.forEach(serviceMethods, function(funcName) {
                 it(funcName + '() should call BaseObmService.run() ' +
                                        'with the correct options', function() {
                    var service = this.Service.create(this.serviceOptions);
                    return service[funcName]()
                    // ignore failures, since they are probably related to
                    // powerStatus() trying to compare against a return value
                    // we didn't give and don't care about for this test.
                    .catch(function () {})
                    .finally(function() {
                        // exclude noop and redfish services that don't use run()
                        if (service.constructor.name !== 'NoopObmService' &&
                            service.constructor.name !== 'redfishObmService') {
                            expect(service.run.callCount).to.be.above(0);
                        }
                        _.forEach(_.range(service.run.callCount), function(call) {
                            var args = service.run.getCall(call).args[0];
                            expect(args).to.be.an('object');
                            expect(args).to.have.property('command').that.is.a('string');
                            expect(args).to.have.property('args').that.is.an('array');
                            if (args.retries) {
                                expect(args.retries).to.be.a('number');
                            }
                            if (args.delay) {
                                expect(args.delay).to.be.a('number');
                            }
                        });
                    });
                });
            });
        });
    }
};

module.exports = base;
