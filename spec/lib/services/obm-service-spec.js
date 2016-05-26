// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe('OBM Service', function() {
    var ObmService;
    var obmService;
    var Logger;
    var encryption;

    before('OBM Service before', function() {
        helper.setupInjector([
            helper.require('/lib/services/obm-service'),
            helper.require('/lib/services/ipmi-obm-service'),
            helper.require('/lib/services/base-obm-service'),
            helper.di.simpleWrapper({ skus: {}, nodes: {}, obms: {}}, 'Services.Waterline')
        ]);
        ObmService = helper.injector.get('Task.Services.OBM');
        Logger = helper.injector.get('Logger');
        encryption = helper.injector.get('Services.Encryption');
        sinon.stub(Logger.prototype, 'log');
        return encryption.start();
    });

    after('OBM Service after', function() {
        Logger.prototype.log.restore();
    });

    describe('retryObmCommand', function() {
        before('retryObmCommand before', function() {
            var obmSettings = {
                "service": "ipmi-obm-service",
                "config": {
                    "user": "admin",
                    "password": "admin",
                    "host": "10.0.0.254"
                }
            };
            var options = { delay: 0, retries: 3 };
            var ipmiObmServiceFactory = helper.injector.get('ipmi-obm-service');
            obmService = ObmService.create('54da9d7bf33e0405c75f7000',
                ipmiObmServiceFactory, obmSettings, options);

            sinon.stub(obmService, 'runObmCommand');
            sinon.spy(obmService, '_retryObmCommand');
        });

        beforeEach('retryObmCommand before each', function() {
            obmService.runObmCommand.reset();
            obmService._retryObmCommand.reset();
        });

        after('retryObmCommand after', function() {
            obmService.runObmCommand.restore();
            obmService._retryObmCommand.restore();
        });

        it('should not retry an OBM command on an actual failure', function() {
            obmService.runObmCommand.rejects(new Error('test error'));
            return expect(obmService.retryObmCommand('testcommand'))
                .to.be.rejectedWith(/test error/);
        });

        it('should not fail on a config error when the command is setBootPxe', function() {
            var error = new Error('test config error');
            error.name = 'ObmConfigurationError';
            obmService.runObmCommand.rejects(error);
            return obmService.retryObmCommand('setBootPxe').should.become(undefined);
        });

        it('should retry an OBM command if expected output does not match', function(done) {
            obmService.runObmCommand.resolves('testoutput');

            obmService.retryObmCommand('testcommand', 'badoutput')
            .then(function() {
                done(new Error("Expected retryObmCommand to fail"));
            })
            .catch(function() {
                expect(obmService.runObmCommand.callCount).to.equal(4);
                expect(obmService._retryObmCommand.callCount).to.equal(4);
                done();
            });
        });

        it('should succeed an OBM command if expected output matches after ' +
                'not matching on previous runs', function() {
            obmService.runObmCommand.resolves('testoutput').onCall(3).resolves('somevalue');

            return obmService.retryObmCommand('testcommand', 'somevalue')
            .then(function() {
                expect(obmService.runObmCommand.callCount).to.equal(4);
                expect(obmService._retryObmCommand.callCount).to.equal(4);
            });
        });
    });

    describe('Check invalid obm service', function() {
        var waterline;

        before('check invalid obm service before', function() {
            waterline = helper.injector.get('Services.Waterline');
            waterline.skus.findOne = sinon.stub();
        });

        beforeEach('check invalid service before each', function() {
            waterline.skus.findOne.reset();
        });

        it('should resolve when node matches a single-item rule', function(done) {
            var obmSettings = [
                {
                    config: {},
                    service: 'panduit-obm-service'
                },
                {
                    config: {},
                    service: 'test-obm-service'
                }
            ];
            var node = {
                id: '123',
                type: 'enclosure'
            };

            return ObmService.checkValidService(node, obmSettings)
            .then(function() {
                done();
            })
            .catch(function(e) {
                done(e);
            });
        });

        it('should resolve when node matches a multi-items rule', function(done) {
            var obmSettings = [
                {
                    config: {},
                    service: 'panduit-obm-service'
                }
            ];
            var node = {
                id: '123',
                type: 'compute',
                sku: '456'
            };

            waterline.skus.findOne.resolves({ name: 'noop' });
            return ObmService.checkValidService(node, obmSettings)
            .then(function() {
                done();
            })
            .catch(function(e) {
                done(e);
            });
        });

        it('should resolve when no specified node type', function(done) {
            var obmSettings = [
                {
                    config: {},
                    service: 'noop-obm-service'
                }
            ];
            var node = {
                id: '123',
            };

            return ObmService.checkValidService(node, obmSettings)
            .then(function() {
                done();
            })
            .catch(function(e) {
                done(e);
            });
        });

        it('should return invalid service when no sku in node', function(done) {
            var obmSettings = [
                {
                    config: {},
                    service: 'panduit-obm-service'
                }
            ];
            var node = {
                id: '123',
                type: 'compute',
                sku: null
            };

            waterline.skus.findOne.rejects('No sku found');
            return ObmService.checkValidService(node, obmSettings)
            .then(function() {
                done(new Error('Expected invalid service'));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('BadRequestError');
                    expect(e).to.have.property('message').that.equals(
                        'Service panduit-obm-service is not supported in current node'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should return invalid service when no obm settings are matched', function(done) {
            var obmSettings = [
                {
                    config: {},
                    service: 'panduit-obm-service'
                }
            ];
            var node = {
                id: '123',
                type: 'compute',
                sku: '456'
            };

            waterline.skus.findOne.resolves({ name: 'Test' });
            return ObmService.checkValidService(node, obmSettings)
            .then(function() {
                done(new Error('Expected invalid service'));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('BadRequestError');
                    expect(e).to.have.property('message').that.equals(
                        'Service panduit-obm-service is not supported in current node'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
