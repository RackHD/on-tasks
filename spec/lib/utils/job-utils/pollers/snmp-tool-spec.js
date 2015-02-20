// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';
var _ = require('lodash');

var injector = helper.baseInjector.createChild(_.flatten([
    helper.require('/lib/utils/job-utils/net-snmp-tool')
]));

// setting up a snmp agent to respond on this one oid (faking system up time
// with a hard coded 345) on 0.0.0.0.
//
// cool: now we could access this integer here:
//  > snmpget -v 2c -c any localhost .1.3.6.1.2.1.1.3.0
// and the result would be:
//  > DISMAN-EVENT-MIB::sysUpTimeInstance = INTEGER: 345
var snmp = require('snmpjs');
var agent = snmp.createAgent({
        log:
        {
            child:function(){
                return {
                    //info:console.log,
                    trace:function(){}
                };
            }
        }
    });
agent.request({ oid: '.1.3.6.1.2.1.1.3.0', handler: function (prq) {
    var val = snmp.data.createData({ type: 'OctetString', value: '345' });
    snmp.provider.readOnlyScalar(prq, val);
} });
agent.bind({ family: 'udp4', port: 7777 });


describe('SnmpTool', function() {
    var SnmpTool = injector.get('JobUtils.Snmptool');
    it('should exist', function () {
        should.exist(SnmpTool);
    });
    it('should be a function', function () {
        SnmpTool.should.be.a('function');
    });
    describe('instance', function () {
        var instance = new SnmpTool('0.0.0.0:7777', 'any');

        it('exists', function () {
            should.exist(instance);
        });
        it('is a function', function () {
            expect(instance).to.be.a('object');
        });
        describe('walk', function () {
            it('exists', function () {
                should.exist(instance.walk);
            });
            it('is a function', function () {
                expect(instance.walk).is.a('function');
            });
            it('returns promise', function (done) {
                var result = instance.walk('.1.3.6.1.2.1.1');
                result.constructor.name.should.equal('Promise');
                result.done(function(){done();});
            });
            it('returns promise of array', function (done) {
                var result = instance.walk('.1.3.6.1.2.1.1');
                result
                    .should.eventually.be.a('Array')
                    .should.notify(done);
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

    });
});
