// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe('SnmpTool', function() {
    var SnmpTool;

    before('snmp tool before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/net-snmp-tool'),
            helper.require('/lib/utils/job-utils/net-snmp-parser')
        ]);

        SnmpTool = helper.injector.get('JobUtils.Snmptool');
    });

    describe('Base', function() {
        it('should exist', function() {
            should.exist(SnmpTool);
        });

        it('should be a function', function() {
            SnmpTool.should.be.a('function');
        });
    });

    describe('instance', function() {
        var instance;

        before(function() {
            instance = new SnmpTool('127.0.0.1:5588', 'any');
        });

        describe('get', function() {
            it('exists', function() {
                should.exist(instance.get);
            });
            it('is a function', function() {
                expect(instance.get).is.a('function');
            });
        });

        describe('ping', function() {
            beforeEach(function() {
                this.sandbox = sinon.sandbox.create();
            });

            afterEach(function() {
                this.sandbox.restore();
            });

            it('exists', function() {
                should.exist(instance.ping);
            });
            it('is a function', function() {
                expect(instance.ping).is.a('function');
            });
            it('should ping the host', function() {
                var getStub = this.sandbox.stub(instance, 'get');
                getStub.resolves();
                return instance.ping()
                .then(function() {
                    expect(instance.get).to.have.been.calledOnce;
                });
            });
            it('should fail if host cannot be reached', function() {
                var getStub = this.sandbox.stub(instance, 'get');
                getStub.rejects();
                return instance.ping().should.be.rejected;
            });
        });

        describe('collectHostSnmp', function() {
            var results;
            before(function() {
                results = {
                    stdout: 'LLDP-MIB::lldpMessageTxInterval.0 30 seconds\n' +
                            'LLDP-MIB::lldpMessageTxHoldMultiplier.0 4\n' +
                            'LLDP-MIB::lldpReinitDelay.0 2 seconds\n' +
                            'LLDP-MIB::lldpTxDelay.0 2 seconds\n' +
                            'LLDP-MIB::lldpNotificationInterval.0 5 seconds\n'
                };
            });

            beforeEach(function() {
                this.sandbox = sinon.sandbox.create();
            });

            afterEach(function() {
                this.sandbox.restore();
            });

            it('should run an snmpwalk', function() {
                this.sandbox.stub(instance, 'walk').resolves(results);

                return instance.collectHostSnmp(['test'], {})
                .then(function(out) {
                    expect(out).to.have.length(1);
                    expect(out[0]).to.have.property('source').that.equals('test');
                    expect(out[0]).to.have.property('values').that.deep.equals({
                        'LLDP-MIB::lldpMessageTxInterval.0': '30 seconds',
                        'LLDP-MIB::lldpTxDelay.0': '2 seconds',
                        'LLDP-MIB::lldpMessageTxHoldMultiplier.0': '4',
                        'LLDP-MIB::lldpReinitDelay.0': '2 seconds',
                        'LLDP-MIB::lldpNotificationInterval.0': '5 seconds'
                    });
                });
            });

            it('should run an snmpwalk for multiple oids', function() {
                this.sandbox.stub(instance, 'walk').resolves(results);

                return instance.collectHostSnmp(['test0', 'test1', 'test2'], {})
                .then(function(out) {
                    expect(out).to.have.length(3);
                    expect(out[0]).to.have.property('source').that.equals('test0');
                    expect(out[1]).to.have.property('source').that.equals('test1');
                    expect(out[2]).to.have.property('source').that.equals('test2');
                    _.forEach(out, function(el) {
                        expect(el).to.have.property('values').that.deep.equals({
                            'LLDP-MIB::lldpMessageTxInterval.0': '30 seconds',
                            'LLDP-MIB::lldpTxDelay.0': '2 seconds',
                            'LLDP-MIB::lldpMessageTxHoldMultiplier.0': '4',
                            'LLDP-MIB::lldpReinitDelay.0': '2 seconds',
                            'LLDP-MIB::lldpNotificationInterval.0': '5 seconds'
                        });
                    });
                });
            });

            it('should run an snmpwalk for multiple oids with isSequential true', function() {
                this.sandbox.stub(instance, 'walk').resolves(results);

                return instance.collectHostSnmp(['test0', 'test1', 'test2'], {})
                .then(function(out) {
                    expect(out).to.have.length(3);
                    expect(out[0]).to.have.property('source').that.equals('test0');
                    expect(out[1]).to.have.property('source').that.equals('test1');
                    expect(out[2]).to.have.property('source').that.equals('test2');
                    _.forEach(out, function(el) {
                        expect(el).to.have.property('values').that.deep.equals({
                            'LLDP-MIB::lldpMessageTxInterval.0': '30 seconds',
                            'LLDP-MIB::lldpTxDelay.0': '2 seconds',
                            'LLDP-MIB::lldpMessageTxHoldMultiplier.0': '4',
                            'LLDP-MIB::lldpReinitDelay.0': '2 seconds',
                            'LLDP-MIB::lldpNotificationInterval.0': '5 seconds'
                        });
                    });
                });
            });

            it('should run a custom supported snmp query method', function() {
                this.sandbox.stub(instance, 'get').resolves(results);

                return instance.collectHostSnmp(['test'], { snmpQueryType: 'get' })
                .then(function() {
                    expect(instance.get).to.have.been.calledOnce;
                });
            });

            it('should run bulkget queries with combined oids and maxRepetitions set', function() {
                this.sandbox.stub(instance, 'bulkget').resolves(results);

                return instance.collectHostSnmp(
                    ['test0', 'test1', 'test2'],
                    { snmpQueryType: 'bulkget', maxRepetitions: 25 }
                )
                .then(function() {
                    expect(instance.bulkget).to.have.been.calledOnce;
                    expect(instance.bulkget.firstCall.args[0]).to.equal('test0 test1 test2');
                    expect(instance.bulkget.firstCall.args[1]).to.equal(25);
                });
            });

            it('should run get queries with combined oids', function() {
                this.sandbox.stub(instance, 'get').resolves(results);

                return instance.collectHostSnmp(
                    ['test0', 'test1', 'test2'],
                    { snmpQueryType: 'get'}
                )
                .then(function() {
                    expect(instance.get).to.have.been.calledOnce;
                    expect(instance.get.firstCall.args[0]).to.equal('test0 test1 test2');
                });
            });

            it('should run bulkwalk queries with maxRepetitions set', function() {
                this.sandbox.stub(instance, 'bulkwalk').resolves(results);

                return instance.collectHostSnmp(
                    ['test0', 'test1', 'test2'],
                    { snmpQueryType: 'bulkwalk', maxRepetitions: 25 }
                )
                .then(function() {
                    expect(instance.bulkwalk).to.have.been.Thrice;
                    expect(instance.bulkwalk.firstCall.args[0]).to.equal('test0');
                    expect(instance.bulkwalk.firstCall.args[1]).to.equal(25);
                    expect(instance.bulkwalk.secondCall.args[0]).to.equal('test1');
                    expect(instance.bulkwalk.secondCall.args[1]).to.equal(25);
                    expect(instance.bulkwalk.thirdCall.args[0]).to.equal('test2');
                    expect(instance.bulkwalk.thirdCall.args[1]).to.equal(25);
                });
            });

            it('should run bulkwalk queries with isSequential true and multiple oids', function() {
                this.sandbox.stub(instance, 'bulkwalk').resolves(results);

                return instance.collectHostSnmp(
                    ['test0', 'test1', 'test2'],
                    { snmpQueryType: 'bulkwalk', isSequential: true }
                )
                .then(function() {
                    expect(instance.bulkwalk).to.have.been.Thrice;
                    expect(instance.bulkwalk.firstCall.args[0]).to.equal('test0');
                    expect(instance.bulkwalk.secondCall.args[0]).to.equal('test1');
                    expect(instance.bulkwalk.thirdCall.args[0]).to.equal('test2');
                });
            });
        });
    });
});
