// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var snmp = require('snmpjs');

describe('SnmpTool', function() {
    var SnmpTool;
    var agent;

    before('snmp tool before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/net-snmp-tool')
        ]);

        // setting up a snmp agent to respond on this one oid (faking system up time
        // with a hard coded 345) on 0.0.0.0.
        //
        // cool: now we could access this integer here:
        //  > snmpget -v 2c -c any localhost .1.3.6.1.2.1.1.3.0
        // and the result would be:
        //  > DISMAN-EVENT-MIB::sysUpTimeInstance = INTEGER: 345
        agent = snmp.createAgent();

        agent.request({ oid: '.1.3.6.1.2.1.1.3.0', handler: function (prq) {
            var val = snmp.data.createData({ type: 'OctetString', value: '345' });
            snmp.provider.readOnlyScalar(prq, val);
        } });

        agent.bind({ family: 'udp4', port: 5588 });

        SnmpTool = helper.injector.get('JobUtils.Snmptool');
    });

    describe('Base', function() {
        it('should exist', function () {
            should.exist(SnmpTool);
        });

        it('should be a function', function () {
            SnmpTool.should.be.a('function');
        });
    });

    describe('instance', function () {
        var instance;

        before(function() {
            instance = new SnmpTool('127.0.0.1:5588', 'any');
        });

        describe('walk', function () {
            it('is a function', function () {
                expect(instance).to.be.a('object');
            });

            it('exists', function () {
                should.exist(instance);
                should.exist(instance.walk);
            });

            it('is a function', function () {
                expect(instance.walk).is.a('function');
            });

            it('returns promise of array', function () {
                return instance.walk('.1.3.6.1.2.1.1.3')
                .then(function(out) {
                    expect(out).to.be.an('Array');
                });
            });
        });

        describe('get', function () {
            it('exists', function () {
                should.exist(instance.get);
            });
            it('is a function', function () {
                expect(instance.get).is.a('function');
            });
        });

        describe('ping', function () {
            it('exists', function () {
                should.exist(instance.ping);
            });
            it('is a function', function () {
                expect(instance.ping).is.a('function');
            });
            it('should ping the host', function () {
                return instance.ping()
                .then(function(out) {
                    expect(out).to.be.an('Array');
                });
            });
            it('should fail if host cannot be reached', function () {
                var getStub = sinon.stub(instance, 'get');
                getStub.rejects();
                return instance.ping().should.be.rejected;
            });
        });
    });
});
